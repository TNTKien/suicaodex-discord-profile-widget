import { describe, expect, test } from "bun:test";
import { loadConfig } from "../src/config";
import { fetchMangaById, fetchRandomManga, type Manga } from "../src/suicaodex";

const config = loadConfig({
  DISCORD_APPLICATION_ID: "app-123",
  DISCORD_USER_ID: "user-456",
  DISCORD_BOT_TOKEN: "bot-token",
  DISCORD_IMAGE_WEBHOOK_URL: "https://discord.com/api/webhooks/123/token",
  CONTENT_RATING: "safe,suggestive",
});
const manga: Manga = {
  id: "manga-1",
  title: "Re:Dive Manga",
  contentRating: "safe",
  latestChapter: { number: "1" },
  chapterCounts: { slots: 1, releases: 2 },
  statistics: { views: 42, follows: 3 },
};
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("fetchRandomManga", () => {
  test("filters the cached random batch and fetches full details for the selected manga", async () => {
    const urls: string[] = [];
    const result = await fetchRandomManga(config, async (input, init) => {
      urls.push(String(input));
      expect(init?.credentials).toBe("omit");
      expect(init?.redirect).toBe("error");
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      return String(input).includes("/random?")
        ? json({
            data: [
              { ...manga, id: "unsafe", contentRating: "erotica" },
              { ...manga, id: "empty", latestChapter: null },
              { ...manga, id: "unrated", contentRating: null },
              manga,
            ],
          })
        : json(manga);
    });
    expect(urls).toEqual([
      "https://redive.suicaodex.com/v1/manga/random?limit=10",
      "https://redive.suicaodex.com/v1/manga/manga-1",
    ]);
    expect(result.statistics?.views).toBe(42);
    expect(result.chapterCounts?.slots).toBe(1);
  });

  test("falls back to the catalog when the cached batch does not match", async () => {
    const urls: string[] = [];
    const result = await fetchRandomManga(config, async (input) => {
      const url = new URL(String(input));
      urls.push(url.href);
      if (url.pathname.endsWith("/random"))
        return json({ data: [{ ...manga, contentRating: "erotica" }] });
      if (url.pathname === "/v1/manga") {
        expect(url.searchParams.get("hasChapter")).toBe("true");
        return json({ data: [manga], meta: { totalPages: 1 } });
      }
      return json(manga);
    });
    expect(result.id).toBe(manga.id);
    expect(urls).toHaveLength(3);
  });

  test("bounds catalog sampling and never retries the same page", async () => {
    const pages: number[] = [];
    await expect(
      fetchRandomManga(config, async (input) => {
        const url = new URL(String(input));
        if (url.pathname.endsWith("/random")) return json({ data: [] });
        pages.push(Number(url.searchParams.get("page")));
        return json({
          data: [{ ...manga, contentRating: "erotica" }],
          meta: { totalPages: 20 },
        });
      }),
    ).rejects.toThrow("No manga matching CONTENT_RATING=safe,suggestive");
    expect(pages).toHaveLength(5);
    expect(new Set(pages).size).toBe(5);
  });

  test("handles an empty catalog without relaxing the configured filters", async () => {
    let calls = 0;
    await expect(
      fetchRandomManga(config, async () => {
        calls++;
        return json({ data: [], meta: { totalPages: 0 } });
      }),
    ).rejects.toThrow("No manga matching");
    expect(calls).toBe(2);
  });

  test("allows manga without chapters when HAS_CHAPTERS is disabled", async () => {
    const empty = { ...manga, latestChapter: null };
    const result = await fetchRandomManga(
      { ...config, suicaodex: { ...config.suicaodex, hasChapters: false } },
      async (input) =>
        json(String(input).includes("/random?") ? { data: [empty] } : empty),
    );
    expect(result.latestChapter).toBeNull();
  });

  test("rechecks filters if manga details changed after selecting a summary", async () => {
    await expect(
      fetchRandomManga(config, async (input) =>
        json(
          String(input).includes("/random?")
            ? { data: [manga] }
            : { ...manga, contentRating: "erotica" },
        ),
      ),
    ).rejects.toThrow("no longer matches the configured filters");
  });

  test("rejects malformed lists and unsafe pagination metadata", async () => {
    await expect(
      fetchRandomManga(config, async () => json(manga)),
    ).rejects.toThrow("missing its data array");
    await expect(
      fetchRandomManga(config, async (input) =>
        json(
          String(input).includes("/random?")
            ? { data: [] }
            : { data: [], meta: { totalPages: 1e12 } },
        ),
      ),
    ).rejects.toThrow("invalid pagination");
  });

  test("reports API errors without silently using unfiltered manga", async () => {
    await expect(
      fetchRandomManga(config, async () =>
        json({ error: { message: "No manga found" } }, 404),
      ),
    ).rejects.toThrow(
      "SuicaoDex random manga request failed with 404: No manga found",
    );
  });
});

describe("fetchMangaById", () => {
  test("reads the unwrapped Re:Dive detail response", async () => {
    const urls: string[] = [];
    const result = await fetchMangaById(config, manga.id, async (input) => {
      urls.push(String(input));
      return json(manga);
    });
    expect(result).toEqual(manga);
    expect(urls).toEqual(["https://redive.suicaodex.com/v1/manga/manga-1"]);
  });

  test("rejects malformed or mismatched identities", async () => {
    await expect(
      fetchMangaById(config, manga.id, async () =>
        json({ id: 1, title: "Bad" }),
      ),
    ).rejects.toThrow("missing id or title");
    await expect(
      fetchMangaById(config, manga.id, async () =>
        json({ ...manga, id: "other" }),
      ),
    ).rejects.toThrow("does not match manga-1");
  });

  test("names the fixed manga that could not be fetched", async () => {
    await expect(
      fetchMangaById(config, "missing-id", async () =>
        json({ error: { message: "Manga not found" } }, 404),
      ),
    ).rejects.toThrow(
      "SuicaoDex manga request for missing-id failed with 404: Manga not found",
    );
  });
});
