import { loadConfig } from "./config";
import { patchDiscordProfile } from "./discord";
import { resolveCoverUrl } from "./image-hosting";
import { mangaToWidgetPayload } from "./mapper";
import { fetchRandomManga } from "./suicaodex";

async function main(): Promise<void> {
  const config = loadConfig();
  console.log(
    `Started SuicaoDex Manga Widget. Updating every ${config.updateIntervalSeconds}s.`,
  );

  while (true) {
    const startedAt = Date.now();
    try {
      const manga = await fetchRandomManga(config);
      const coverUrl = await resolveCoverUrl(manga, config);
      const payload = mangaToWidgetPayload(manga, config, { coverUrl });
      const result = await patchDiscordProfile(config, payload);
      const nextDelay = Math.max(config.updateIntervalSeconds, result.cooldownSeconds);
      console.log(
        result.sent
          ? `Updated widget: ${manga.title}. Next update in ${nextDelay}s.`
          : `Discord rate limited update. Retrying in ${nextDelay}s.`,
      );
      await sleep(nextDelay * 1000);
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      const elapsed = Date.now() - startedAt;
      await sleep(Math.max(15_000, config.updateIntervalSeconds * 1000 - elapsed));
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
