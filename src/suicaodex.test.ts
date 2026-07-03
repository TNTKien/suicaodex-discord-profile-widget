import { describe, expect, test } from "bun:test";
import { loadConfig } from "./config";
import { fetchRandomManga } from "./suicaodex";

const config = loadConfig({
  DISCORD_APPLICATION_ID: "app-123",
  DISCORD_USER_ID: "user-456",
  DISCORD_BOT_TOKEN: "bot-token",
  CONTENT_RATING: "safe,suggestive",
  HAS_CHAPTERS: "true",
});

describe("fetchRandomManga", () => {
  test("calls the random manga endpoint with safe filters", async () => {
    const seenUrls: string[] = [];
    const fakeFetch = async (input: string | URL | Request) => {
      seenUrls.push(String(input));
      return new Response(JSON.stringify({ id: "manga-1", title: "Random Manga" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const manga = await fetchRandomManga(config, fakeFetch);

    expect(manga.title).toBe("Random Manga");
    expect(seenUrls).toHaveLength(1);
    const url = new URL(seenUrls[0] ?? "");
    expect(url.origin + url.pathname).toBe("https://wd.suicaodex.com/manga/random");
    expect(url.searchParams.getAll("contentRating")).toEqual(["safe", "suggestive"]);
    expect(url.searchParams.get("hasChapters")).toBe("true");
  });

  test("throws a helpful error when SuicaoDex returns an error response", async () => {
    const fakeFetch = async () =>
      new Response(JSON.stringify({ error: { message: "No manga found" } }), { status: 404 });

    await expect(fetchRandomManga(config, fakeFetch)).rejects.toThrow(
      "SuicaoDex random manga request failed with 404: No manga found",
    );
  });
});
