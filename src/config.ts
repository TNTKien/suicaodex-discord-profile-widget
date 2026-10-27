export interface AppConfig {
  mode: "random" | "fixed";
  fixed: {
    mangaIds: string[];
    cacheDir: string;
  };
  discord: {
    apiBaseUrl: string;
    applicationId: string;
    userId: string;
    botToken: string;
    imageWebhookUrl: string;
  };
  suicaodex: {
    apiBaseUrl: string;
    contentRatings: string[];
    hasChapters: boolean;
  };
  widget: {
    usernameFormat: string;
    descriptionMaxLength: number;
  };
  updateIntervalSeconds: number;
}

type Env = Record<string, string | undefined>;

const REQUIRED_ENV = [
  "DISCORD_APPLICATION_ID",
  "DISCORD_USER_ID",
  "DISCORD_BOT_TOKEN",
  "DISCORD_IMAGE_WEBHOOK_URL",
] as const;

export function loadConfig(env: Env = process.env): AppConfig {
  const missing = REQUIRED_ENV.filter((key) => !env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
  const mode = parseMode(env.MODE);
  const fixedMangaIds = parseCsv(env.FIXED_MANGA_IDS ?? "", []);
  if (mode === "fixed" && fixedMangaIds.length === 0) {
    throw new Error("FIXED_MANGA_IDS is required when MODE=fixed.");
  }
  const updateIntervalSeconds = parseUpdateIntervalSeconds(
    env.UPDATE_INTERVAL_SECONDS,
    mode,
  );

  return {
    mode,
    fixed: {
      mangaIds: fixedMangaIds,
      cacheDir: ".cache/suicaodex/redive/manga",
    },
    discord: {
      apiBaseUrl: stripTrailingSlash(env.DISCORD_API_BASE_URL ?? "https://discord.com/api/v9"),
      applicationId: requireEnv(env, "DISCORD_APPLICATION_ID"),
      userId: requireEnv(env, "DISCORD_USER_ID"),
      botToken: requireEnv(env, "DISCORD_BOT_TOKEN"),
      imageWebhookUrl: requireEnv(env, "DISCORD_IMAGE_WEBHOOK_URL"),
    },
    suicaodex: {
      apiBaseUrl: stripTrailingSlash(env.SUICAODEX_API_BASE_URL ?? "https://redive.suicaodex.com"),
      contentRatings: parseCsv(env.CONTENT_RATING ?? "safe", ["safe"]),
      hasChapters: parseBoolean(env.HAS_CHAPTERS, true),
    },
    widget: {
      usernameFormat: env.USERNAME_FORMAT?.trim() || "Reading {title}",
      descriptionMaxLength: parseMaxDescriptionLength(env.MANGA_DESCRIPTION_MAX_LENGTH),
    },
    updateIntervalSeconds,
  };
}

function parseMode(value: string | undefined): AppConfig["mode"] {
  const normalized = (value?.trim() || "random").toLowerCase();
  if (normalized === "random" || normalized === "fixed") {
    return normalized;
  }
  throw new Error(`Invalid MODE: ${value}. Expected random or fixed.`);
}

function requireEnv(env: Env, key: (typeof REQUIRED_ENV)[number]): string {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function parseCsv(value: string, fallback: string[]): string[] {
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : fallback;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "n"].includes(normalized)) {
    return false;
  }
  throw new Error(`Invalid boolean value: ${value}`);
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer, got: ${value}`);
  }
  return parsed;
}

function parseMaxDescriptionLength(value: string | undefined): number {
  const parsed = parsePositiveInteger(value, 100);
  if (parsed > 100) {
    throw new Error("MANGA_DESCRIPTION_MAX_LENGTH must be at most 100.");
  }
  return parsed;
}

function parseUpdateIntervalSeconds(
  value: string | undefined,
  mode: AppConfig["mode"],
): number {
  const parsed = parsePositiveInteger(value, 300);
  const minimum = mode === "random" ? 300 : 60;
  if (parsed < minimum) {
    throw new Error(`UPDATE_INTERVAL_SECONDS must be at least ${minimum} when MODE=${mode}.`);
  }
  return parsed;
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
