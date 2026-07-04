import type { AppConfig } from "./config";

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface MangaRelationshipItem {
  id: string;
  name: string;
  group?: string;
}

export interface Manga {
  id: string;
  title: string;
  alt_titles?: Record<string, string[]> | null;
  year?: number | null;
  status?: string | null;
  demographic?: string | null;
  description?: string | null;
  last_chapter?: string | null;
  last_uploaded_chapter_at?: string | null;
  content_rating?: string | null;
  relationships?: {
    cover?: {
      id: string;
      ext?: string | null;
    } | null;
    tags?: MangaRelationshipItem[];
    authors?: MangaRelationshipItem[];
    artists?: MangaRelationshipItem[];
    stats?: {
      chapters?: number | null;
      follows?: number | null;
      views?: number | null;
    } | null;
  } | null;
}

export async function fetchRandomManga(
  config: AppConfig,
  fetchImpl: FetchLike = fetch,
): Promise<Manga> {
  const url = new URL(`${config.suicaodex.apiBaseUrl}/manga/random`);
  for (const rating of config.suicaodex.contentRatings) {
    url.searchParams.append("contentRating", rating);
  }
  url.searchParams.set("hasChapters", String(config.suicaodex.hasChapters));

  const response = await fetchImpl(url.toString());
  if (!response.ok) {
    throw new Error(
      `SuicaoDex random manga request failed with ${response.status}: ${await readErrorMessage(response)}`,
    );
  }

  const data = (await response.json()) as Manga;
  if (!data.id || !data.title) {
    throw new Error("SuicaoDex random manga response is missing id or title.");
  }
  return data;
}

export async function fetchMangaById(
  config: AppConfig,
  id: string,
  fetchImpl: FetchLike = fetch,
): Promise<Manga> {
  const response = await fetchImpl(
    `${config.suicaodex.apiBaseUrl}/manga/${encodeURIComponent(id)}`,
  );
  if (!response.ok) {
    throw new Error(
      `SuicaoDex manga request for ${id} failed with ${response.status}: ${await readErrorMessage(response)}`,
    );
  }

  const data = (await response.json()) as Manga;
  if (!data.id || !data.title) {
    throw new Error(`SuicaoDex manga response for ${id} is missing id or title.`);
  }
  return data;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string }; message?: string };
    return body.error?.message ?? body.message ?? response.statusText;
  } catch {
    return response.statusText;
  }
}
