export interface AppConfig {
  discord: {
    apiBaseUrl: string;
    applicationId: string;
    userId: string;
    botToken: string;
    imageWebhookUrl: string;
  };
  suicaodex: {
    apiBaseUrl: string;
    coverBaseUrl: string;
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
] as const;

export function loadConfig(env: Env = process.env): AppConfig {
  const missing = REQUIRED_ENV.filter((key) => !env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  return {
    discord: {
      apiBaseUrl: stripTrailingSlash(env.DISCORD_API_BASE_URL ?? "https://discord.com/api/v9"),
      applicationId: requireEnv(env, "DISCORD_APPLICATION_ID"),
      userId: requireEnv(env, "DISCORD_USER_ID"),
      botToken: requireEnv(env, "DISCORD_BOT_TOKEN"),
      imageWebhookUrl: env.DISCORD_IMAGE_WEBHOOK_URL?.trim() ?? "",
    },
    suicaodex: {
      apiBaseUrl: stripTrailingSlash(env.SUICAODEX_API_BASE_URL ?? "https://wd.suicaodex.com"),
      coverBaseUrl: stripTrailingSlash(
        env.SUICAODEX_COVER_BASE_URL ?? "https://i.suicaodex.com/covers",
      ),
      contentRatings: parseCsv(env.CONTENT_RATING ?? "safe"),
      hasChapters: parseBoolean(env.HAS_CHAPTERS, true),
    },
    widget: {
      usernameFormat: env.USERNAME_FORMAT?.trim() || "Reading {title}",
      descriptionMaxLength: parsePositiveInteger(env.MANGA_DESCRIPTION_MAX_LENGTH, 180),
    },
    updateIntervalSeconds: parsePositiveInteger(env.UPDATE_INTERVAL_SECONDS, 300),
  };
}

function requireEnv(env: Env, key: (typeof REQUIRED_ENV)[number]): string {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function parseCsv(value: string): string[] {
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : ["safe"];
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

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
