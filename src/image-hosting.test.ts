import { describe, expect, test } from "bun:test";
import { loadConfig } from "./config";
import { resolveCoverUrl } from "./image-hosting";
import type { Manga } from "./suicaodex";

const manga: Manga = {
  id: "manga-1",
  title: "Random Manga",
  relationships: {
    cover: {
      id: "cover-1",
      ext: ".webp",
    },
  },
};

describe("resolveCoverUrl", () => {
  test("uses the origin cover URL when no image webhook is configured", async () => {
    const config = loadConfig({
      DISCORD_APPLICATION_ID: "app",
      DISCORD_USER_ID: "user",
      DISCORD_BOT_TOKEN: "token",
    });

    const url = await resolveCoverUrl(manga, config);

    expect(url).toBe("https://i.suicaodex.com/covers/manga-1/cover-1.webp");
  });

  test("uploads the cover to a Discord webhook and returns the attachment URL", async () => {
    const config = loadConfig({
      DISCORD_APPLICATION_ID: "app",
      DISCORD_USER_ID: "user",
      DISCORD_BOT_TOKEN: "token",
      DISCORD_IMAGE_WEBHOOK_URL: "https://discord.com/api/webhooks/123/token",
    });
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    const fakeFetch = async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      if (String(input).startsWith("https://i.suicaodex.com")) {
        return new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { "content-type": "image/webp" },
        });
      }
      return new Response(
        JSON.stringify({
          attachments: [{ url: "https://cdn.discordapp.com/attachments/cover.webp" }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };

    const url = await resolveCoverUrl(manga, config, fakeFetch);

    expect(url).toBe("https://cdn.discordapp.com/attachments/cover.webp");
    expect(calls.map((call) => call.url)).toEqual([
      "https://i.suicaodex.com/covers/manga-1/cover-1.webp",
      "https://discord.com/api/webhooks/123/token?wait=true",
    ]);
    expect(calls[1]?.init?.method).toBe("POST");
    expect(calls[1]?.init?.body).toBeInstanceOf(FormData);
  });
});
