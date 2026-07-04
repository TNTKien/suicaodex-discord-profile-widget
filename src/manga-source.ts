import type { AppConfig } from "./config";
import { createFixedMangaSource } from "./fixed-manga-source";
import { fetchRandomManga, type FetchLike, type Manga } from "./suicaodex";

export interface MangaSource {
  shouldStopAfterUpdate: boolean;
  nextManga(): Promise<Manga>;
}

export async function createMangaSource(
  config: AppConfig,
  fetchImpl: FetchLike = fetch,
): Promise<MangaSource> {
  if (config.mode === "fixed") {
    return {
      ...(await createFixedMangaSource(config, fetchImpl)),
      shouldStopAfterUpdate: config.fixed.mangaIds.length === 1,
    };
  }

  return {
    shouldStopAfterUpdate: false,
    nextManga() {
      return fetchRandomManga(config, fetchImpl);
    },
  };
}
