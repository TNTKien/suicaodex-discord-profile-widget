# Fixed Manga Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `MODE=fixed` with disk-cached SuicaoDex manga data and sequential widget rotation.

**Architecture:** Extend config parsing with mode and fixed IDs, add a small fixed manga source module that warms/reads JSON cache files, add `fetchMangaById`, and update the main loop to choose random or fixed source once at startup.

**Tech Stack:** Bun, TypeScript, Bun test, SuicaoDex OpenAPI endpoint `GET /manga/{id}`.

---

### Task 1: Config

**Files:**
- Modify: `src/config.ts`
- Modify: `tests/config.test.ts`

- [ ] Add tests for default random mode, fixed IDs parsing, invalid mode, and missing fixed IDs.
- [ ] Implement `mode`, `fixedMangaIds`, and `cacheDir` config fields.
- [ ] Run `bun test tests/config.test.ts`.

### Task 2: SuicaoDex ID Fetch

**Files:**
- Modify: `src/suicaodex.ts`
- Modify: `tests/suicaodex.test.ts`

- [ ] Add tests for `fetchMangaById` URL construction and error reporting.
- [ ] Implement `fetchMangaById(config, id, fetchImpl)`.
- [ ] Run `bun test tests/suicaodex.test.ts`.

### Task 3: Fixed Manga Source

**Files:**
- Create: `src/fixed-manga-source.ts`
- Create: `tests/fixed-manga-source.test.ts`

- [ ] Add tests for first-run cache writes, cache-only reuse, rotation, and bad ID startup failure.
- [ ] Implement cache directory creation, cache read/write, startup warm, and `nextManga()`.
- [ ] Run `bun test tests/fixed-manga-source.test.ts`.

### Task 4: Main Loop and Docs

**Files:**
- Modify: `src/index.ts`
- Modify: `.gitignore`
- Modify: `.env.example`
- Modify: `README.md`

- [ ] Update `index.ts` to initialize the source once and call `nextManga()` in the loop.
- [ ] Ignore `.cache/`.
- [ ] Document `MODE` and `FIXED_MANGA_IDS`.
- [ ] Run `bun test` and `bun run typecheck`.
