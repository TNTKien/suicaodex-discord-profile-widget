import { describe, expect, test } from "bun:test";
import { loadConfig } from "../src/config";
import { buildCoverUrl, mangaToWidgetPayload } from "../src/mapper";
import type { Manga } from "../src/suicaodex";

const config = loadConfig({
  DISCORD_APPLICATION_ID: "app-123",
  DISCORD_USER_ID: "user-456",
  DISCORD_BOT_TOKEN: "bot-token",
  DISCORD_IMAGE_WEBHOOK_URL: "https://discord.com/api/webhooks/123/token",
  MANGA_DESCRIPTION_MAX_LENGTH: "45",
});

const manga: Manga = {
  id: "manga-1",
  title: "Futari no Taisei",
  alternativeTitles: {
    vi: ["Hai Mặt Của Taisei"],
    en: ["Two Sides of Taisei"],
  },
  year: 2019,
  status: "completed",
  description:
    "Genius shogi player Taisei Amado has a double secret.\nThis description is intentionally long.",
  latestChapter: { number: "27" },
  latestChapterPublishedAt: "2026-02-26T14:11:47.054Z",
  contentRating: "safe",
  cover: { url: "https://i.suicaodex.com/covers/manga-1/cover-1.512.webp" },
  tags: [
    { id: "tag-1", name: "Drama", group: "genre" },
    { id: "tag-2", name: "Psychological", group: "genre" },
    { id: "tag-3", name: "Traditional Games", group: "theme" },
    { id: "tag-4", name: "Sports", group: "theme" },
  ],
  authors: [{ id: "author-1", name: "Fukuda Kentarou" }],
  chapterCounts: { slots: 27, releases: 29 },
  statistics: {
    follows: 134,
    views: 9876,
  },
};

describe("buildCoverUrl", () => {
  test("uses the cover URL returned by Re:Dive", () => {
    expect(buildCoverUrl(manga)).toBe(
      "https://i.suicaodex.com/covers/manga-1/cover-1.512.webp",
    );
  });

  test("preserves legacy cover paths instead of rebuilding them from the canonical id", () => {
    expect(
      buildCoverUrl({
        ...manga,
        cover: {
          url: "https://i.suicaodex.com/covers/wd-id/wd-cover.512.webp",
        },
      }),
    ).toBe("https://i.suicaodex.com/covers/wd-id/wd-cover.512.webp");
    expect(buildCoverUrl({ ...manga, cover: null })).toBe("");
    expect(() =>
      buildCoverUrl({ ...manga, cover: { url: "file:///secret" } }),
    ).toThrow("HTTP or HTTPS");
  });
});

describe("mangaToWidgetPayload", () => {
  test("maps manga metadata to Discord dynamic fields", () => {
    const payload = mangaToWidgetPayload(manga, config);

    expect(payload.username).toBe("Reading Futari no Taisei");
    expect(payload.dynamic).toContainEqual({
      type: 1,
      name: "manga_title",
      value: "Futari no Taisei",
    });
    expect(payload.dynamic).toContainEqual({
      type: 1,
      name: "manga_author",
      value: "Fukuda Kentarou",
    });
    expect(payload.dynamic.some((field) => field.name === "manga_tags")).toBe(
      false,
    );
    expect(
      String(
        payload.dynamic.find((field) => field.name === "manga_description")
          ?.value,
      ),
    ).toEndWith("...");
  });

  test("also emits default widget aliases used by simple Discord layouts", () => {
    const payload = mangaToWidgetPayload(manga, config);

    expect(payload.dynamic).toContainEqual({
      type: 1,
      name: "title",
      value: "Futari no Taisei",
    });
    expect(payload.dynamic).toContainEqual({
      type: 1,
      name: "text_1",
      value: "Fukuda Kentarou",
    });
    expect(payload.dynamic).toContainEqual({
      type: 1,
      name: "text_2",
      value: " ",
    });
    expect(payload.dynamic).toContainEqual({
      type: 3,
      name: "image",
      value: { url: "https://i.suicaodex.com/covers/manga-1/cover-1.512.webp" },
    });
    expect(payload.dynamic).toContainEqual({
      type: 3,
      name: "hero_manga_cover",
      value: { url: "https://i.suicaodex.com/covers/manga-1/cover-1.512.webp" },
    });
    expect(payload.dynamic.some((field) => field.name === "text_4")).toBe(
      false,
    );
    expect(payload.dynamic.some((field) => field.name === "label_4")).toBe(
      false,
    );
  });

  test("keeps dynamic fields within Discord's limit", () => {
    const payload = mangaToWidgetPayload(manga, config);

    expect(payload.dynamic).toHaveLength(22);
    expect(payload.dynamic.length).toBeLessThanOrEqual(30);
  });

  test("truncates string dynamic values to Discord's 100 character limit", () => {
    const longTitle =
      "Đây là một tên truyện tiếng Việt rất dài vượt quá giới hạn một trăm ký tự của Discord profile widget dynamic field";
    const payload = mangaToWidgetPayload(
      {
        ...manga,
        title: longTitle,
        alternativeTitles: {
          vi: ["Tên tiếng Việt ngắn"],
        },
      },
      config,
    );

    const mangaTitle = payload.dynamic.find(
      (field) => field.name === "manga_title",
    );
    const title = payload.dynamic.find((field) => field.name === "title");

    expect(mangaTitle?.type).toBe(1);
    expect(mangaTitle?.value).toStartWith("Đây là một tên truyện tiếng Việt");
    expect(mangaTitle?.value).toEndWith("...");
    expect(mangaTitle?.value).toHaveLength(100);
    expect(title).toEqual(mangaTitle && { ...mangaTitle, name: "title" });
    for (const field of payload.dynamic) {
      if (field.type === 1) {
        expect(field.value.length).toBeLessThanOrEqual(100);
      }
    }
  });

  test("uses the canonical title even when Vietnamese alt title is available", () => {
    const payload = mangaToWidgetPayload(
      {
        ...manga,
        alternativeTitles: {
          vi: ["Tên tiếng Việt"],
          en: ["Two Sides of Taisei"],
        },
      },
      config,
    );

    expect(payload.username).toBe("Reading Futari no Taisei");
    expect(payload.dynamic).toContainEqual({
      type: 1,
      name: "manga_title",
      value: "Futari no Taisei",
    });
  });

  test("emits stats grid fields used by the bottom widget", () => {
    const payload = mangaToWidgetPayload(manga, config);

    expect(payload.dynamic).toContainEqual({
      type: 1,
      name: "public",
      value: "Publication",
    });
    expect(payload.dynamic).toContainEqual({
      type: 1,
      name: "year",
      value: "2019",
    });
    expect(payload.dynamic).toContainEqual({
      type: 1,
      name: "status_label",
      value: "Status",
    });
    expect(payload.dynamic).toContainEqual({
      type: 1,
      name: "status_text",
      value: "COMPLETED",
    });
    expect(payload.dynamic).toContainEqual({
      type: 1,
      name: "last_updated",
      value: "Updated",
    });
    expect(payload.dynamic).toContainEqual({
      type: 1,
      name: "last_updated_value",
      value: "26/02/2026",
    });
    expect(payload.dynamic).toContainEqual({
      type: 2,
      name: "stats_chapters_count",
      value: 27,
    });
    expect(payload.dynamic).toContainEqual({
      type: 2,
      name: "stats_follows_count",
      value: 134,
    });
    expect(payload.dynamic).toContainEqual({
      type: 2,
      name: "stats_views_count",
      value: 9876,
    });
  });

  test("handles oneshots, chapter zero, missing metadata and invalid update dates", () => {
    const field = (value: Manga, name: string) =>
      mangaToWidgetPayload(value, config).dynamic.find((x) => x.name === name)
        ?.value;
    expect(
      field({ ...manga, latestChapter: { number: null } }, "manga_chapter"),
    ).toBe("Oneshot");
    expect(
      field({ ...manga, latestChapter: { number: "0" } }, "manga_chapter"),
    ).toBe("Chapter 0");
    const empty: Manga = {
      id: "empty",
      title: "Empty",
      cover: null,
      latestChapter: null,
    };
    expect(field(empty, "manga_chapter")).toBe("No chapters");
    expect(field(empty, "manga_author")).toBe("Unknown");
    expect(field(empty, "stats_chapters_count")).toBe(0);
    expect(
      field(
        { ...manga, latestChapterPublishedAt: "invalid" },
        "last_updated_value",
      ),
    ).toBe("Chapter 27");
  });
});
