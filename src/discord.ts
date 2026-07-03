import type { AppConfig } from "./config";
import type { FetchLike } from "./suicaodex";
import type { WidgetPayload } from "./mapper";

export interface PatchResult {
  sent: boolean;
  cooldownSeconds: number;
}

const USER_AGENT = "suicaodex-discord-profile-widget/1.0";
const MAX_DYNAMIC_FIELDS = 30;
const MAX_DYNAMIC_STRING_VALUE_LENGTH = 100;

export async function patchDiscordProfile(
  config: AppConfig,
  payload: WidgetPayload,
  fetchImpl: FetchLike = fetch,
): Promise<PatchResult> {
  validatePayload(payload);

  const url =
    `${config.discord.apiBaseUrl}/applications/${config.discord.applicationId}` +
    `/users/${config.discord.userId}/identities/0/profile`;

  const response = await fetchImpl(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bot ${config.discord.botToken}`,
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({
      username: payload.username,
      data: { dynamic: payload.dynamic },
    }),
  });

  if (response.status === 429) {
    return { sent: false, cooldownSeconds: await retryAfterSeconds(response) };
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Discord profile PATCH failed with ${response.status}: ${body.slice(0, 300)}`);
  }

  return {
    sent: true,
    cooldownSeconds: rateLimitCooldown(response),
  };
}

function validatePayload(payload: WidgetPayload): void {
  if (payload.dynamic.length > MAX_DYNAMIC_FIELDS) {
    throw new Error(
      `Discord dynamic field count is ${payload.dynamic.length}, but Discord allows at most ${MAX_DYNAMIC_FIELDS}.`,
    );
  }

  payload.dynamic.forEach((field, index) => {
    if (field.type !== 1 || field.value.length <= MAX_DYNAMIC_STRING_VALUE_LENGTH) {
      return;
    }
    throw new Error(
      `Discord dynamic string field at index ${index} (${field.name}) is ${field.value.length} characters, but Discord allows at most ${MAX_DYNAMIC_STRING_VALUE_LENGTH}.`,
    );
  });
}

async function retryAfterSeconds(response: Response): Promise<number> {
  try {
    const body = (await response.json()) as { retry_after?: number };
    if (typeof body.retry_after === "number") {
      return Math.min(body.retry_after, 60);
    }
  } catch {
    // Fall back to the Retry-After header below.
  }
  const retryAfter = Number.parseFloat(response.headers.get("Retry-After") ?? "1");
  return Number.isFinite(retryAfter) ? Math.min(retryAfter, 60) : 1;
}

function rateLimitCooldown(response: Response): number {
  const remaining = Number.parseInt(response.headers.get("X-RateLimit-Remaining") ?? "1", 10);
  const resetAfter = Number.parseFloat(response.headers.get("X-RateLimit-Reset-After") ?? "0");

  if (!Number.isFinite(remaining) || !Number.isFinite(resetAfter) || resetAfter <= 0) {
    return 0;
  }
  if (remaining <= 0) {
    return Math.min(resetAfter + 0.25, 60);
  }
  return Math.min(resetAfter / (remaining + 1), 60);
}
