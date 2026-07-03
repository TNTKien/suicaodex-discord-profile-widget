import { describe, expect, test } from "bun:test";
import { loadConfig } from "./config";
import { patchDiscordProfile } from "./discord";

const config = loadConfig({
  DISCORD_APPLICATION_ID: "app-123",
  DISCORD_USER_ID: "user-456",
  DISCORD_BOT_TOKEN: "bot-token",
});

describe("patchDiscordProfile", () => {
  test("patches the Discord profile identity with bot authorization", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch = async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      return new Response("{}", {
        status: 200,
        headers: {
          "X-RateLimit-Remaining": "2",
          "X-RateLimit-Reset-After": "20",
        },
      });
    };

    const result = await patchDiscordProfile(
      config,
      {
        username: "Reading Random Manga",
        dynamic: [{ type: 1, name: "manga_title", value: "Random Manga" }],
      },
      fakeFetch,
    );

    expect(result.sent).toBe(true);
    expect(result.cooldownSeconds).toBeGreaterThan(0);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(
      "https://discord.com/api/v9/applications/app-123/users/user-456/identities/0/profile",
    );
    expect(calls[0]?.init?.method).toBe("PATCH");
    expect(calls[0]?.init?.headers).toEqual({
      Authorization: "Bot bot-token",
      "Content-Type": "application/json",
      "User-Agent": "suicaodex-discord-profile-widget/1.0",
    });
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      username: "Reading Random Manga",
      data: {
        dynamic: [{ type: 1, name: "manga_title", value: "Random Manga" }],
      },
    });
  });

  test("returns retry-after cooldown when Discord rate limits the update", async () => {
    const fakeFetch = async () =>
      new Response(JSON.stringify({ retry_after: 7.5 }), {
        status: 429,
        headers: { "content-type": "application/json" },
      });

    const result = await patchDiscordProfile(
      config,
      { username: "Reading", dynamic: [] },
      fakeFetch,
    );

    expect(result).toEqual({ sent: false, cooldownSeconds: 7.5 });
  });

  test("rejects payloads that exceed Discord dynamic field count before sending", async () => {
    const fakeFetch = async () => {
      throw new Error("fetch should not be called");
    };

    await expect(
      patchDiscordProfile(
        config,
        {
          username: "Reading",
          dynamic: Array.from({ length: 31 }, (_, index) => ({
            type: 1 as const,
            name: `field_${index}`,
            value: "value",
          })),
        },
        fakeFetch,
      ),
    ).rejects.toThrow("Discord dynamic field count is 31, but Discord allows at most 30.");
  });

  test("rejects string dynamic values that exceed Discord's 100 character limit before sending", async () => {
    const fakeFetch = async () => {
      throw new Error("fetch should not be called");
    };

    await expect(
      patchDiscordProfile(
        config,
        {
          username: "Reading",
          dynamic: [
            { type: 1, name: "manga_title", value: "A".repeat(101) },
            { type: 1, name: "title", value: "Short" },
          ],
        },
        fakeFetch,
      ),
    ).rejects.toThrow(
      "Discord dynamic string field at index 0 (manga_title) is 101 characters, but Discord allows at most 100.",
    );
  });
});
