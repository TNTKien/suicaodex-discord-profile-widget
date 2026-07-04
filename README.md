# SuicaoDex Discord Profile Widget

Standalone Bun + TypeScript service that periodically picks a random manga from SuicaoDex and pushes it to a Discord Social SDK profile widget.

## Requirements

- [Bun 1.3+](https://bun.com/docs/installation)
- A Discord application with a Social SDK profile widget
- Discord application ID, user ID, bot token, and an image webhook URL
- If you don't know how to get these, pls see [TheCreativeGod/Discord-Widgets-Extension](https://github.com/TheCreativeGod/Discord-Widgets-Extension) for detailed instructions.

## Setup

Install dependencies:

```bash
bun install
```

Create `.env` from the example:

```bash
cp .env.example .env
```

Fill in:

```bash
DISCORD_APPLICATION_ID=...
DISCORD_USER_ID=...
DISCORD_BOT_TOKEN=...
DISCORD_IMAGE_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

Run the service:

```bash
bun run dev
```

## Environment Variables

Required:

| Name | Description |
| --- | --- |
| `DISCORD_APPLICATION_ID` | Discord application ID for the widget app. |
| `DISCORD_USER_ID` | Discord user ID whose profile identity should be updated. |
| `DISCORD_BOT_TOKEN` | Bot token for the Discord application. |
| `DISCORD_IMAGE_WEBHOOK_URL` | Discord webhook URL used to re-host covers on Discord's CDN. |

Optional:

| Name | Default | Description |
| --- | --- | --- |
| `MODE` | `random` | Update mode. Use `random` to fetch a random manga each interval, or `fixed` to rotate through `FIXED_MANGA_IDS`. |
| `FIXED_MANGA_IDS` | empty | Comma-separated SuicaoDex manga IDs used when `MODE=fixed`. |
| `UPDATE_INTERVAL_SECONDS` | `300` | Delay between widget updates. Minimum is `300` in random mode and `60` in fixed mode. |
| `CONTENT_RATING` | `safe` | Comma-separated SuicaoDex content ratings. Keep `safe` for public widgets. |
| `HAS_CHAPTERS` | `true` | Filter random picks to manga with chapters. |
| `USERNAME_FORMAT` | `Reading {title}` | Discord profile identity username format. Supports `{title}` and `{id}`. |
| `MANGA_DESCRIPTION_MAX_LENGTH` | `100` | Description truncation length. Maximum is `100`. |
| `SUICAODEX_API_BASE_URL` | `https://wd.suicaodex.com` | SuicaoDex API base URL. |
| `SUICAODEX_COVER_BASE_URL` | `https://i.suicaodex.com/covers` | Cover CDN base URL. |
| `DISCORD_API_BASE_URL` | `https://discord.com/api/v9` | Discord API base URL. |

## Fixed Mode

Use fixed mode to rotate through manga you choose instead of fetching a new random manga each time:

```env
MODE=fixed
FIXED_MANGA_IDS=manga-id-1,manga-id-2,manga-id-3
UPDATE_INTERVAL_SECONDS=60
```

On startup, the service loads each configured manga from `.cache/suicaodex/manga/`.

Missing cache
files are fetched once from SuicaoDex and written to that directory. After startup, the widget rotates
through the cached manga in `FIXED_MANGA_IDS` order and does not refetch SuicaoDex data on each
interval.

Delete `.cache/suicaodex/manga/<id>.json` or
the whole `.cache/` directory to force a fresh fetch.

## Widget Fields

Use [TheCreativeGod/Discord-Widgets-Extension](https://github.com/TheCreativeGod/Discord-Widgets-Extension) to import the widget layout from [manga_widget_config.json](https://github.com/TNTKien/suicaodex-discord-profile-widget/blob/main/manga_widget_config.json) (some fallback assets maybe missing because im too lazy to add them in a proper way, you can change them as needed).

It binds the widget to the fields emitted by this service:

Configure the Discord widget layout to read these dynamic fields:

| Field | Type | Value |
| --- | --- | --- |
| `manga_title` | String | Manga `title` |
| `manga_author` | String | First author name |
| `manga_description` | String | Short description |
| `manga_status` | String | Publication status |
| `manga_chapter` | String | Last chapter label |
| `image` | Media | Cover URL |
| `hero_manga_cover` | Media | Cover URL used by the mini profile hero image |
| `public` / `year` | String | `Publication` / release year |
| `status_label` / `status_text` | String | `Status` / publication status |
| `last_updated` / `last_updated_value` | String | `Updated` / last uploaded chapter date |
| `stats_chapters` / `stats_chapters_count` | String / Number | `Chapters` / chapter count |
| `stats_follows` / `stats_follows_count` | String / Number | `Follows` / follow count |
| `stats_views` / `stats_views_count` | String / Number | `Views` / view count |

The tool also sends these legacy aliases for top/detail fields:

| Field | Type | Value |
| --- | --- | --- |
| `title` | String | Manga `title` |
| `image` | Media | Cover URL |
| `hero_manga_cover` | Media | Cover URL used by mini profile layouts |
| `text_1` | String | Author |
| `text_2` | String | Blank spacer for older imported top configs |

If Discord still shows placeholders like `some title here`, `text 1 here`, or `label 1 here`,
the updater is working but the widget layout is still using static Custom String fields.
Use the helper script. It binds `some title here` to `title`, and the default bottom stat
placeholders to `year`, `status_text`, `last_updated_value`, and the `stats_*` fields.

1. Open [Discord Developer Portal](https://discord.com/developers/applications).
2. Press F12 and open the Console tab.
3. Paste the contents of [scripts/bind-widget-data-console.js](F:/dev/suicaodex-discord-profile-widget/scripts/bind-widget-data-console.js).
4. Enter the Discord application ID when prompted.
5. Wait for `[Manga Widget] Bound and published ...`.

Then refresh Discord and keep the Bun service running.

## Cover Images

Discord may reject direct SuicaoDex cover URLs in its image proxy, so this service requires a Discord
webhook in any private channel/server you control:

```env
DISCORD_IMAGE_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

The tool will download each cover once, upload it to that
webhook with `wait=true`, cache the returned Discord CDN URL for the current process, and use that CDN
URL in the widget.

Cover URLs are built as:

```text
https://i.suicaodex.com/covers/{manga_id}/{cover_id}{cover_ext}
```

## Acknowledgements

Thanks to the projects that made this widget easier to build:

- [KayTwoOne/Lyrically](https://github.com/KayTwoOne/Lyrically), which inspired this project and provided useful code for the original Discord profile widget flow.
- [TheCreativeGod/Discord-Widgets-Extension](https://github.com/TheCreativeGod/Discord-Widgets-Extension), which helps with creating and importing Discord widget configurations.

## Scripts

```bash
bun run dev
bun run start
bun test
bun run typecheck
```
