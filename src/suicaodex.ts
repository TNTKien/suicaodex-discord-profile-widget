import type { AppConfig } from "./config";

export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface MangaRelationshipItem {
  id: string;
  name: string;
  group?: string;
}

export interface Manga {
  id: string;
  title: string;
  alternativeTitles?: Record<string, string[]> | null;
  year?: number | null;
  status?: string | null;
  description?: string | null;
  latestChapter?: { number: string | null } | null;
  latestChapterPublishedAt?: string | null;
  contentRating?: string | null;
  cover?: { url: string } | null;
  tags?: MangaRelationshipItem[];
  authors?: MangaRelationshipItem[];
  statistics?: {
    follows?: number | null;
    views?: number | null;
  } | null;
  chapterCounts?: { slots: number; releases: number };
}

export async function fetchRandomManga(
  config: AppConfig,
  fetchImpl: FetchLike = fetch,
): Promise<Manga> {
  const matches = (manga: Manga) =>
    config.suicaodex.contentRatings.includes(manga.contentRating ?? "") &&
    (!config.suicaodex.hasChapters || manga.latestChapter != null);
  const batch = await requestJson(
    `${config.suicaodex.apiBaseUrl}/v1/manga/random?limit=10`,
    fetchImpl,
    "SuicaoDex random manga request",
  );
  let candidates = readMangaList(batch).filter(matches);

  // shortcut: sample at most five catalog pages; use server-side filters if rare ratings need exhaustive selection.
  let page = 1;
  let remainingPages: number[] = [];
  for (let attempt = 0; candidates.length === 0 && attempt < 5; attempt++) {
    const url = new URL(`${config.suicaodex.apiBaseUrl}/v1/manga`);
    url.searchParams.set("limit", "100");
    url.searchParams.set(
      "hasChapter",
      config.suicaodex.hasChapters ? "true" : "all",
    );
    url.searchParams.set("page", String(page));
    const body = await requestJson(
      url.toString(),
      fetchImpl,
      "SuicaoDex manga catalog request",
    );
    candidates = readMangaList(body).filter(matches);
    if (candidates.length) break;
    if (page === 1) {
      const totalPages = (body as { meta?: { totalPages?: unknown } }).meta
        ?.totalPages;
      if (
        typeof totalPages !== "number" ||
        !Number.isSafeInteger(totalPages) ||
        totalPages < 0 ||
        totalPages > 10_000
      ) {
        throw new Error(
          "SuicaoDex manga catalog response has invalid pagination.",
        );
      }
      remainingPages = Array.from(
        { length: Math.max(0, totalPages - 1) },
        (_, i) => i + 2,
      );
    }
    if (!remainingPages.length) break;
    page = remainingPages.splice(
      Math.floor(Math.random() * remainingPages.length),
      1,
    )[0]!;
  }
  const selected = candidates[Math.floor(Math.random() * candidates.length)];
  if (!selected) {
    throw new Error(
      `No manga matching CONTENT_RATING=${config.suicaodex.contentRatings.join(",")} and HAS_CHAPTERS=${config.suicaodex.hasChapters} found in the sampled Re:Dive catalog.`,
    );
  }
  const manga = await fetchMangaById(config, selected.id, fetchImpl);
  if (!matches(manga))
    throw new Error(
      "Selected Re:Dive manga no longer matches the configured filters.",
    );
  return manga;
}

export async function fetchMangaById(
  config: AppConfig,
  id: string,
  fetchImpl: FetchLike = fetch,
): Promise<Manga> {
  const data = readManga(
    await requestJson(
      `${config.suicaodex.apiBaseUrl}/v1/manga/${encodeURIComponent(id)}`,
      fetchImpl,
      `SuicaoDex manga request for ${id}`,
    ),
  );
  if (data.id !== id)
    throw new Error(`SuicaoDex manga response id does not match ${id}.`);
  return data;
}

async function requestJson(
  url: string,
  fetchImpl: FetchLike,
  label: string,
): Promise<unknown> {
  const response = await fetchImpl(url, {
    headers: { accept: "application/json" },
    credentials: "omit",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(
      `${label} failed with ${response.status}: ${await readErrorMessage(response)}`,
    );
  }
  return response.json();
}

function readManga(value: unknown): Manga {
  if (
    typeof value !== "object" ||
    value === null ||
    !("id" in value) ||
    typeof value.id !== "string" ||
    !value.id ||
    !("title" in value) ||
    typeof value.title !== "string" ||
    !value.title
  ) {
    throw new Error("SuicaoDex manga response is missing id or title.");
  }
  return value as Manga;
}

function readMangaList(value: unknown): Manga[] {
  if (
    typeof value !== "object" ||
    value === null ||
    !("data" in value) ||
    !Array.isArray(value.data)
  ) {
    throw new Error("SuicaoDex manga list response is missing its data array.");
  }
  return value.data.map(readManga);
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      error?: { message?: string };
      message?: string;
    };
    return body.error?.message ?? body.message ?? response.statusText;
  } catch {
    return response.statusText;
  }
}
