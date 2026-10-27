import type { AppConfig } from "./config";
import { format, isValid, parseISO } from "date-fns";
import type { Manga } from "./suicaodex";

export type DiscordDynamicField =
  | { type: 1; name: string; value: string }
  | { type: 2; name: string; value: number }
  | { type: 3; name: string; value: { url: string } };

export interface WidgetPayload {
  username: string;
  dynamic: DiscordDynamicField[];
}

const MAX_DYNAMIC_STRING_VALUE_LENGTH = 100;

export function mangaToWidgetPayload(
  manga: Manga,
  config: AppConfig,
  options: { coverUrl?: string } = {},
): WidgetPayload {
  const title = displayTitle(manga);
  const author = firstName(manga.authors) || "Unknown";
  const coverUrl = options.coverUrl ?? buildCoverUrl(manga);
  const stats = manga.statistics;

  const dynamic: DiscordDynamicField[] = [
    stringField("manga_title", title),
    stringField("manga_author", author),
    stringField(
      "manga_description",
      truncate(
        cleanText(manga.description ?? ""),
        config.widget.descriptionMaxLength,
      ),
    ),
    stringField("manga_status", manga.status ?? "unknown"),
    stringField("manga_chapter", chapterLabel(manga)),
    stringField("title", title),
    stringField("text_1", author),
    stringField("text_2", " "),
    stringField("public", "Publication"),
    stringField(
      "year",
      typeof manga.year === "number" ? String(manga.year) : "Unknown",
    ),
    stringField("status_label", "Status"),
    stringField("status_text", (manga.status ?? "unknown").toUpperCase()),
    stringField("last_updated", "Updated"),
    stringField("last_updated_value", formatLastUpdated(manga)),
    {
      type: 2,
      name: "stats_chapters_count",
      value: normalizeStat(manga.chapterCounts?.slots),
    },
    stringField("stats_chapters", "Chapters"),
    {
      type: 2,
      name: "stats_follows_count",
      value: normalizeStat(stats?.follows),
    },
    stringField("stats_follows", "Follows"),
    { type: 2, name: "stats_views_count", value: normalizeStat(stats?.views) },
    stringField("stats_views", "Views"),
  ];

  if (coverUrl) {
    dynamic.push({ type: 3, name: "image", value: { url: coverUrl } });
    dynamic.push({
      type: 3,
      name: "hero_manga_cover",
      value: { url: coverUrl },
    });
  }

  return {
    username: formatUsername(config.widget.usernameFormat, manga, title),
    dynamic,
  };
}

export function buildCoverUrl(manga: Manga): string {
  if (!manga.cover?.url) return "";
  const url = new URL(manga.cover.url);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Re:Dive cover URL must use HTTP or HTTPS.");
  }
  return url.toString();
}

function stringField(name: string, value: string): DiscordDynamicField {
  return {
    type: 1,
    name,
    value: truncate(value, MAX_DYNAMIC_STRING_VALUE_LENGTH),
  };
}

function firstName(items: Array<{ name: string }> | undefined): string {
  return items?.find((item) => item.name.trim())?.name ?? "";
}

function displayTitle(manga: Manga): string {
  return manga.title;
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function formatLastUpdated(manga: Manga): string {
  if (manga.latestChapterPublishedAt) {
    const date = parseISO(manga.latestChapterPublishedAt);
    if (isValid(date)) {
      return format(date, "dd/MM/yyyy");
    }
  }
  return manga.latestChapter ? chapterLabel(manga) : "No updates";
}

function chapterLabel(manga: Manga): string {
  return manga.latestChapter
    ? manga.latestChapter.number === null
      ? "Oneshot"
      : `Chapter ${manga.latestChapter.number}`
    : "No chapters";
}

function normalizeStat(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  if (maxLength <= 3) {
    return ".".repeat(maxLength);
  }
  return `${value.slice(0, maxLength - 3).trimEnd()}...`;
}

function formatUsername(format: string, manga: Manga, title: string): string {
  return format
    .replaceAll("{title}", title)
    .replaceAll("{id}", manga.id)
    .slice(0, 80);
}
