# SuicaoDex Discord Profile Widget

Standalone Bun + TypeScript service that periodically picks a random manga from SuicaoDex and pushes it to a Discord Social SDK profile widget.

This is intentionally simpler than the original music widget: there is no real reading-state tracking. The service calls SuicaoDex's random manga endpoint on a timer and updates the widget as a "currently reading" style status.

## Requirements

- Bun 1.3+
- A Discord application with a Social SDK profile widget
- Discord application ID, user ID, and bot token

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

Optional:

| Name | Default | Description |
| --- | --- | --- |
| `UPDATE_INTERVAL_SECONDS` | `300` | Delay between random manga updates. |
| `CONTENT_RATING` | `safe` | Comma-separated SuicaoDex content ratings. Keep `safe` for public widgets. |
| `HAS_CHAPTERS` | `true` | Filter random picks to manga with chapters. |
| `USERNAME_FORMAT` | `Reading {title}` | Discord profile identity username format. Supports `{title}` and `{id}`. |
| `MANGA_DESCRIPTION_MAX_LENGTH` | `180` | Description truncation length. |
| `DISCORD_IMAGE_WEBHOOK_URL` | empty | Optional Discord webhook URL used to re-host covers on Discord's CDN. Recommended because Discord's image proxy can reject SuicaoDex cover URLs. |
| `SUICAODEX_API_BASE_URL` | `https://wd.suicaodex.com` | SuicaoDex API base URL. |
| `SUICAODEX_COVER_BASE_URL` | `https://i.suicaodex.com/covers` | Cover CDN base URL. |
| `DISCORD_API_BASE_URL` | `https://discord.com/api/v9` | Discord API base URL. |

## Widget Fields

If you use a Discord widget-configurator extension that supports JSON import, import:

[manga_widget_config.json](F:/dev/suicaodex-discord-profile-widget/manga_widget_config.json)

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

Discord may reject direct SuicaoDex cover URLs in its image proxy. If text updates but covers do not
render, create a Discord webhook in any private channel/server you control, copy its webhook URL, and
set:

```env
DISCORD_IMAGE_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

Restart the service after adding it. The tool will download each random cover once, upload it to that
webhook with `wait=true`, cache the returned Discord CDN URL for the current process, and use that CDN
URL in the widget.

Cover URLs are built as:

```text
https://i.suicaodex.com/covers/{manga_id}/{cover_id}{cover_ext}
```

## Scripts

```bash
bun run dev
bun run start
bun test
bun run typecheck
```
