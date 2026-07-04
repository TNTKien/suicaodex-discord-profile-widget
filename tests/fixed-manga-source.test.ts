import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "bun:test";
import type { AppConfig } from "../src/config";
import { createFixedMangaSource } from "../src/fixed-manga-source";
import type { Manga } from "../src/suicaodex";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("createFixedMangaSource", () => {
  test("fetches missing fixed manga once and writes them to cache", async () => {
    const cacheDir = await createTempDir();
    const config = configWithCache(cacheDir, ["manga-1", "manga-2"]);
    const seenUrls: string[] = [];
    const fakeFetch = async (input: string | URL | Request) => {
      seenUrls.push(String(input));
      const id = String(input).split("/").at(-1) ?? "";
      return mangaResponse({ id, title: `Title ${id}` });
    };

    const source = await createFixedMangaSource(config, fakeFetch);

    expect(seenUrls).toEqual([
      "https://wd.suicaodex.com/manga/manga-1",
      "https://wd.suicaodex.com/manga/manga-2",
    ]);
    expect(JSON.parse(await readFile(join(cacheDir, "manga-1.json"), "utf8"))).toMatchObject({
      id: "manga-1",
      title: "Title manga-1",
    });
    expect(JSON.parse(await readFile(join(cacheDir, "manga-2.json"), "utf8"))).toMatchObject({
      id: "manga-2",
      title: "Title manga-2",
    });
    expect((await source.nextManga()).id).toBe("manga-1");
  });

  test("uses cached manga without fetching again", async () => {
    const cacheDir = await createTempDir();
    await Bun.write(
      join(cacheDir, "manga-1.json"),
      JSON.stringify({ id: "manga-1", title: "Cached Manga" }),
    );
    const config = configWithCache(cacheDir, ["manga-1"]);
    const fakeFetch = async () => {
      throw new Error("fetch should not be called");
    };

    const source = await createFixedMangaSource(config, fakeFetch);

    expect(await source.nextManga()).toMatchObject({
      id: "manga-1",
      title: "Cached Manga",
    });
  });

  test("fails startup when a cache file contains a different manga id", async () => {
    const cacheDir = await createTempDir();
    await Bun.write(
      join(cacheDir, "manga-1.json"),
      JSON.stringify({ id: "other-manga", title: "Wrong Manga" }),
    );
    const config = configWithCache(cacheDir, ["manga-1"]);
    const fakeFetch = async () => {
      throw new Error("fetch should not be called");
    };

    await expect(createFixedMangaSource(config, fakeFetch)).rejects.toThrow(
      "Failed to load fixed manga manga-1: cached manga id other-manga does not match manga-1.",
    );
  });

  test("rotates through cached manga in configured order", async () => {
    const cacheDir = await createTempDir();
    const config = configWithCache(cacheDir, ["manga-1", "manga-2"]);
    const fakeFetch = async (input: string | URL | Request) => {
      const id = String(input).split("/").at(-1) ?? "";
      return mangaResponse({ id, title: `Title ${id}` });
    };
    const source = await createFixedMangaSource(config, fakeFetch);

    await expect(source.nextManga()).resolves.toMatchObject({ id: "manga-1" });
    await expect(source.nextManga()).resolves.toMatchObject({ id: "manga-2" });
    await expect(source.nextManga()).resolves.toMatchObject({ id: "manga-1" });
  });

  test("fails startup with the id that could not be loaded", async () => {
    const cacheDir = await createTempDir();
    const config = configWithCache(cacheDir, ["good-id", "bad-id"]);
    const fakeFetch = async (input: string | URL | Request) => {
      const id = String(input).split("/").at(-1) ?? "";
      if (id === "bad-id") {
        return new Response(JSON.stringify({ error: { message: "Manga not found" } }), {
          status: 404,
          headers: { "content-type": "application/json" },
        });
      }
      return mangaResponse({ id, title: "Good Manga" });
    };

    await expect(createFixedMangaSource(config, fakeFetch)).rejects.toThrow(
      "Failed to load fixed manga bad-id: SuicaoDex manga request for bad-id failed with 404: Manga not found",
    );
  });
});

async function createTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "suicaodex-fixed-test-"));
  tempDirs.push(dir);
  return dir;
}

function configWithCache(cacheDir: string, mangaIds: string[]): AppConfig {
  return {
    mode: "fixed",
    fixed: {
      mangaIds,
      cacheDir,
    },
    discord: {
      apiBaseUrl: "https://discord.com/api/v9",
      applicationId: "app",
      userId: "user",
      botToken: "token",
      imageWebhookUrl: "",
    },
    suicaodex: {
      apiBaseUrl: "https://wd.suicaodex.com",
      coverBaseUrl: "https://i.suicaodex.com/covers",
      contentRatings: ["safe"],
      hasChapters: true,
    },
    widget: {
      usernameFormat: "Reading {title}",
      descriptionMaxLength: 180,
    },
    updateIntervalSeconds: 300,
  };
}

function mangaResponse(manga: Pick<Manga, "id" | "title">): Response {
  return new Response(JSON.stringify(manga), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
