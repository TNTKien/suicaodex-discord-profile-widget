import { describe, expect, test } from "bun:test";
import { loadConfig } from "../src/config";

const requiredEnv = {
  DISCORD_APPLICATION_ID: "app-123",
  DISCORD_USER_ID: "user-456",
  DISCORD_BOT_TOKEN: "bot-token",
  DISCORD_IMAGE_WEBHOOK_URL: "https://discord.com/api/webhooks/123/token",
};

describe("loadConfig", () => {
  test("requires Discord application id, user id, and bot token", () => {
    expect(() => loadConfig({})).toThrow(
      "Missing required environment variables: DISCORD_APPLICATION_ID, DISCORD_USER_ID, DISCORD_BOT_TOKEN, DISCORD_IMAGE_WEBHOOK_URL",
    );
  });

  test("uses safe SuicaoDex defaults", () => {
    const config = loadConfig(requiredEnv);

    expect(config.mode).toBe("random");
    expect(config.fixed.mangaIds).toEqual([]);
    expect(config.fixed.cacheDir).toBe(".cache/suicaodex/manga");
    expect(config.suicaodex.apiBaseUrl).toBe("https://wd.suicaodex.com");
    expect(config.suicaodex.coverBaseUrl).toBe("https://i.suicaodex.com/covers");
    expect(config.suicaodex.contentRatings).toEqual(["safe"]);
    expect(config.suicaodex.hasChapters).toBe(true);
    expect(config.updateIntervalSeconds).toBe(300);
    expect(config.widget.descriptionMaxLength).toBe(100);
  });

  test("parses comma-separated filters and numeric options", () => {
    const config = loadConfig({
      ...requiredEnv,
      CONTENT_RATING: "safe,suggestive",
      HAS_CHAPTERS: "false",
      UPDATE_INTERVAL_SECONDS: "300",
      MANGA_DESCRIPTION_MAX_LENGTH: "80",
    });

    expect(config.suicaodex.contentRatings).toEqual(["safe", "suggestive"]);
    expect(config.suicaodex.hasChapters).toBe(false);
    expect(config.updateIntervalSeconds).toBe(300);
    expect(config.widget.descriptionMaxLength).toBe(80);
  });

  test("reads required Discord image webhook URL", () => {
    const config = loadConfig({
      ...requiredEnv,
    });

    expect(config.discord.imageWebhookUrl).toBe("https://discord.com/api/webhooks/123/token");
  });

  test("rejects manga description max length above Discord dynamic string limit", () => {
    expect(() =>
      loadConfig({
        ...requiredEnv,
        MANGA_DESCRIPTION_MAX_LENGTH: "101",
      }),
    ).toThrow("MANGA_DESCRIPTION_MAX_LENGTH must be at most 100.");
  });

  test("parses fixed mode manga ids", () => {
    const config = loadConfig({
      ...requiredEnv,
      MODE: "fixed",
      FIXED_MANGA_IDS: " manga-1, manga-2 ,,manga-3 ",
    });

    expect(config.mode).toBe("fixed");
    expect(config.fixed.mangaIds).toEqual(["manga-1", "manga-2", "manga-3"]);
  });

  test("rejects invalid mode", () => {
    expect(() =>
      loadConfig({
        ...requiredEnv,
        MODE: "latest",
      }),
    ).toThrow("Invalid MODE: latest. Expected random or fixed.");
  });

  test("requires manga ids in fixed mode", () => {
    expect(() =>
      loadConfig({
        ...requiredEnv,
        MODE: "fixed",
      }),
    ).toThrow("FIXED_MANGA_IDS is required when MODE=fixed.");
  });

  test("requires at least 300 seconds between random updates", () => {
    expect(() =>
      loadConfig({
        ...requiredEnv,
        MODE: "random",
        UPDATE_INTERVAL_SECONDS: "299",
      }),
    ).toThrow("UPDATE_INTERVAL_SECONDS must be at least 300 when MODE=random.");
  });

  test("allows fixed mode updates every 60 seconds", () => {
    const config = loadConfig({
      ...requiredEnv,
      MODE: "fixed",
      FIXED_MANGA_IDS: "manga-1,manga-2",
      UPDATE_INTERVAL_SECONDS: "60",
    });

    expect(config.updateIntervalSeconds).toBe(60);
  });

  test("requires at least 60 seconds between fixed updates", () => {
    expect(() =>
      loadConfig({
        ...requiredEnv,
        MODE: "fixed",
        FIXED_MANGA_IDS: "manga-1",
        UPDATE_INTERVAL_SECONDS: "59",
      }),
    ).toThrow("UPDATE_INTERVAL_SECONDS must be at least 60 when MODE=fixed.");
  });
});
