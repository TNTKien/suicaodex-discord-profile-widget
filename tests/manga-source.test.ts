import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "bun:test";
import type { AppConfig } from "../src/config";
import { createMangaSource } from "../src/manga-source";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("createMangaSource", () => {
  test("uses the random endpoint on each nextManga call in random mode", async () => {
    const config = baseConfig("random", []);
    const seenUrls: string[] = [];
    const fakeFetch = async (input: string | URL | Request) => {
      seenUrls.push(String(input));
      return new Response(JSON.stringify({ id: `manga-${seenUrls.length}`, title: "Random" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };
    const source = await createMangaSource(config, fakeFetch);

    await expect(source.nextManga()).resolves.toMatchObject({ id: "manga-1" });
    await expect(source.nextManga()).resolves.toMatchObject({ id: "manga-2" });
    expect(seenUrls).toHaveLength(2);
    expect(seenUrls.every((url) => url.startsWith("https://wd.suicaodex.com/manga/random"))).toBe(
      true,
    );
  });

  test("warms fixed manga once and rotates cached results in fixed mode", async () => {
    const cacheDir = await createTempDir();
    const config = baseConfig("fixed", ["manga-1", "manga-2"], cacheDir);
    const seenUrls: string[] = [];
    const fakeFetch = async (input: string | URL | Request) => {
      seenUrls.push(String(input));
      const id = String(input).split("/").at(-1) ?? "";
      return new Response(JSON.stringify({ id, title: `Title ${id}` }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };
    const source = await createMangaSource(config, fakeFetch);

    expect(seenUrls).toEqual([
      "https://wd.suicaodex.com/manga/manga-1",
      "https://wd.suicaodex.com/manga/manga-2",
    ]);
    await expect(source.nextManga()).resolves.toMatchObject({ id: "manga-1" });
    await expect(source.nextManga()).resolves.toMatchObject({ id: "manga-2" });
    await expect(source.nextManga()).resolves.toMatchObject({ id: "manga-1" });
    expect(seenUrls).toHaveLength(2);
  });

  test("marks a single fixed manga source as one-shot", async () => {
    const cacheDir = await createTempDir();
    const config = baseConfig("fixed", ["manga-1"], cacheDir);
    const fakeFetch = async () =>
      new Response(JSON.stringify({ id: "manga-1", title: "Only Manga" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });

    const source = await createMangaSource(config, fakeFetch);

    expect(source.shouldStopAfterUpdate).toBe(true);
  });

  test("keeps random and multi-id fixed sources running after updates", async () => {
    const fixedCacheDir = await createTempDir();
    const randomSource = await createMangaSource(baseConfig("random", []), async () =>
      new Response(JSON.stringify({ id: "manga-1", title: "Random" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const fixedSource = await createMangaSource(
      baseConfig("fixed", ["manga-1", "manga-2"], fixedCacheDir),
      async (input: string | URL | Request) => {
        const id = String(input).split("/").at(-1) ?? "";
        return new Response(JSON.stringify({ id, title: `Title ${id}` }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    );

    expect(randomSource.shouldStopAfterUpdate).toBe(false);
    expect(fixedSource.shouldStopAfterUpdate).toBe(false);
  });
});

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "suicaodex-source-test-"));
  tempDirs.push(dir);
  return dir;
}

function baseConfig(
  mode: AppConfig["mode"],
  mangaIds: string[],
  cacheDir = ".cache/suicaodex/manga",
): AppConfig {
  return {
    mode,
    fixed: {
      mangaIds,
      cacheDir,
    },
    discord: {
      apiBaseUrl: "https://discord.com/api/v9",
      applicationId: "app",
      userId: "user",
      botToken: "token",
      imageWebhookUrl: "https://discord.com/api/webhooks/123/token",
    },
    suicaodex: {
      apiBaseUrl: "https://wd.suicaodex.com",
      coverBaseUrl: "https://i.suicaodex.com/covers",
      contentRatings: ["safe"],
      hasChapters: true,
    },
    widget: {
      usernameFormat: "Reading {title}",
      descriptionMaxLength: 100,
    },
    updateIntervalSeconds: 300,
  };
}
