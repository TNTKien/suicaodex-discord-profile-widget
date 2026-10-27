import type { AppConfig } from "./config";
import { buildCoverUrl } from "./mapper";
import type { FetchLike, Manga } from "./suicaodex";

const hostedCoverCache = new Map<string, string>();

export async function resolveCoverUrl(
  manga: Manga,
  config: AppConfig,
  fetchImpl: FetchLike = fetch,
): Promise<string> {
  const originUrl = buildCoverUrl(manga);
  if (!originUrl || !config.discord.imageWebhookUrl) {
    return originUrl;
  }

  const cached = hostedCoverCache.get(originUrl);
  if (cached) {
    return cached;
  }

  const hostedUrl = await uploadCoverToDiscordWebhook(originUrl, config.discord.imageWebhookUrl, fetchImpl);
  hostedCoverCache.set(originUrl, hostedUrl);
  return hostedUrl;
}

async function uploadCoverToDiscordWebhook(
  originUrl: string,
  webhookUrl: string,
  fetchImpl: FetchLike,
): Promise<string> {
  const coverResponse = await fetchImpl(originUrl);
  if (!coverResponse.ok) {
    throw new Error(`Cover download failed with ${coverResponse.status}: ${originUrl}`);
  }

  const contentType = coverResponse.headers.get("content-type") ?? "image/webp";
  const extension = extensionFromContentType(contentType);
  const data = await coverResponse.arrayBuffer();
  const form = new FormData();
  form.append("file", new Blob([data], { type: contentType }), `cover.${extension}`);

  const separator = webhookUrl.includes("?") ? "&" : "?";
  const uploadResponse = await fetchImpl(`${webhookUrl}${separator}wait=true`, {
    method: "POST",
    body: form,
  });
  if (!uploadResponse.ok) {
    throw new Error(`Discord image webhook upload failed with ${uploadResponse.status}`);
  }

  const body = (await uploadResponse.json()) as { attachments?: Array<{ url?: string }> };
  const attachmentUrl = body.attachments?.[0]?.url;
  if (!attachmentUrl) {
    throw new Error("Discord image webhook response did not include an attachment URL.");
  }
  return attachmentUrl;
}

function extensionFromContentType(contentType: string): string {
  if (contentType.includes("png")) {
    return "png";
  }
  if (contentType.includes("jpeg") || contentType.includes("jpg")) {
    return "jpg";
  }
  if (contentType.includes("gif")) {
    return "gif";
  }
  return "webp";
}
