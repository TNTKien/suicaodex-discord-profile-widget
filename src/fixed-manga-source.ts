import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AppConfig } from "./config";
import { fetchMangaById, type FetchLike, type Manga } from "./suicaodex";

export interface FixedMangaSource {
  shouldStopAfterUpdate?: boolean;
  nextManga(): Promise<Manga>;
}

export async function createFixedMangaSource(
  config: AppConfig,
  fetchImpl: FetchLike = fetch,
): Promise<FixedMangaSource> {
  await mkdir(config.fixed.cacheDir, { recursive: true });

  const mangaList: Manga[] = [];
  for (const id of config.fixed.mangaIds) {
    try {
      mangaList.push(await loadCachedManga(config, id, fetchImpl));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load fixed manga ${id}: ${message}`);
    }
  }

  if (mangaList.length === 0) {
    throw new Error("No fixed manga could be loaded.");
  }

  let index = 0;
  return {
    async nextManga() {
      const manga = mangaList[index];
      if (!manga) {
        throw new Error("Fixed manga source has no manga to display.");
      }
      index = (index + 1) % mangaList.length;
      return manga;
    },
  };
}

async function loadCachedManga(
  config: AppConfig,
  id: string,
  fetchImpl: FetchLike,
): Promise<Manga> {
  const cachePath = mangaCachePath(config, id);
  const cached = await readMangaCache(cachePath, id);
  if (cached) {
    return cached;
  }

  const manga = await fetchMangaById(config, id, fetchImpl);
  await writeFile(cachePath, `${JSON.stringify(manga, null, 2)}\n`, "utf8");
  return manga;
}

async function readMangaCache(cachePath: string, id: string): Promise<Manga | null> {
  try {
    const manga = JSON.parse(await readFile(cachePath, "utf8")) as Manga;
    if (!manga.id || !manga.title) {
      throw new Error("cached manga data is missing id or title.");
    }
    if (manga.id !== id) {
      throw new Error(`cached manga id ${manga.id} does not match ${id}.`);
    }
    return manga;
  } catch (error) {
    if (isMissingFileError(error)) {
      return null;
    }
    throw error;
  }
}

function mangaCachePath(config: AppConfig, id: string): string {
  return join(config.fixed.cacheDir, `${encodeURIComponent(id)}.json`);
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}
