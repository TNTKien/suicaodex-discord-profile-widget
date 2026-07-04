import { loadConfig } from "./config";
import { patchDiscordProfile } from "./discord";
import { resolveCoverUrl } from "./image-hosting";
import { createMangaSource } from "./manga-source";
import { mangaToWidgetPayload } from "./mapper";
import { shouldStopAfterWidgetUpdate } from "./update-policy";

async function main(): Promise<void> {
  const config = loadConfig();
  const mangaSource = await createMangaSource(config);
  console.log(
    `Started SuicaoDex Manga Widget in ${config.mode} mode. Updating every ${config.updateIntervalSeconds}s.`,
  );

  while (true) {
    const startedAt = Date.now();
    try {
      const manga = await mangaSource.nextManga();
      const coverUrl = await resolveCoverUrl(manga, config);
      const payload = mangaToWidgetPayload(manga, config, { coverUrl });
      const result = await patchDiscordProfile(config, payload);
      const nextDelay = Math.max(config.updateIntervalSeconds, result.cooldownSeconds);
      console.log(
        result.sent
          ? `Updated widget: ${manga.title}. Next update in ${nextDelay}s.`
          : `Discord rate limited update. Retrying in ${nextDelay}s.`,
      );
      if (shouldStopAfterWidgetUpdate(mangaSource.shouldStopAfterUpdate, result.sent)) {
        console.log("Fixed mode has one manga. Widget updated once; no further updates needed.");
        return;
      }
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
