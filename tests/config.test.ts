import { describe, expect, test } from "bun:test";
import { loadConfig } from "../src/config";

const requiredEnv = {
  DISCORD_APPLICATION_ID: "app-123",
  DISCORD_USER_ID: "user-456",
  DISCORD_BOT_TOKEN: "bot-token",
};

describe("loadConfig", () => {
  test("requires Discord application id, user id, and bot token", () => {
    expect(() => loadConfig({})).toThrow(
      "Missing required environment variables: DISCORD_APPLICATION_ID, DISCORD_USER_ID, DISCORD_BOT_TOKEN",
    );
  });

  test("uses safe SuicaoDex defaults", () => {
    const config = loadConfig(requiredEnv);

    expect(config.suicaodex.apiBaseUrl).toBe("https://wd.suicaodex.com");
    expect(config.suicaodex.coverBaseUrl).toBe("https://i.suicaodex.com/covers");
    expect(config.suicaodex.contentRatings).toEqual(["safe"]);
    expect(config.suicaodex.hasChapters).toBe(true);
    expect(config.updateIntervalSeconds).toBe(300);
  });

  test("parses comma-separated filters and numeric options", () => {
    const config = loadConfig({
      ...requiredEnv,
      CONTENT_RATING: "safe,suggestive",
      HAS_CHAPTERS: "false",
      UPDATE_INTERVAL_SECONDS: "120",
      MANGA_DESCRIPTION_MAX_LENGTH: "80",
    });

    expect(config.suicaodex.contentRatings).toEqual(["safe", "suggestive"]);
    expect(config.suicaodex.hasChapters).toBe(false);
    expect(config.updateIntervalSeconds).toBe(120);
    expect(config.widget.descriptionMaxLength).toBe(80);
  });

  test("reads optional Discord image webhook URL", () => {
    const config = loadConfig({
      ...requiredEnv,
      DISCORD_IMAGE_WEBHOOK_URL: "https://discord.com/api/webhooks/123/token",
    });

    expect(config.discord.imageWebhookUrl).toBe("https://discord.com/api/webhooks/123/token");
  });
});
