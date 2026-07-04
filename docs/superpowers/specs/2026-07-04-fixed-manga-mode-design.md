# Fixed Manga Mode Design

## Goal

Add a `fixed` mode that rotates through a configured list of SuicaoDex manga IDs without refetching manga data on every widget update.

## Behavior

- `MODE=random` keeps the current behavior and fetches `GET /manga/random` each update interval.
- `MODE=fixed` reads `FIXED_MANGA_IDS` as a comma-separated list.
- In fixed mode, startup warms a local JSON cache under `.cache/suicaodex/manga/`.
- Each configured ID must either load from cache or fetch once from `GET /manga/{id}` and then be written to cache.
- If any configured ID cannot be loaded or fetched, startup fails with an error that includes the failing ID.
- After startup, fixed mode rotates through cached manga in `FIXED_MANGA_IDS` order and wraps back to the first manga.
- `UPDATE_INTERVAL_SECONDS` remains the delay between widget updates in both modes.

## Cache

Cache files are local runtime artifacts and must not be committed. `.cache/` should be ignored by Git.

Cache invalidation is manual for now: delete `.cache/suicaodex/manga/<id>.json` or the whole `.cache/` directory to force a fresh fetch.

## Testing

- Config tests cover valid/invalid `MODE`, default random mode, and fixed mode requiring IDs.
- API tests cover `GET /manga/{id}` URL construction and helpful error messages.
- Fixed source tests cover first-run cache writes, cache reuse without network calls, rotation order, and startup failure naming the bad ID.
