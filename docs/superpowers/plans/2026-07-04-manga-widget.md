# Manga Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Bun + TypeScript service that periodically picks a random SuicaoDex manga and updates a Discord profile widget.

**Architecture:** Keep the tool small and split by responsibility: env parsing, SuicaoDex API client, Discord API client, manga-to-widget mapping, and the update loop. Runtime configuration comes only from environment variables, with `.env.example` documenting required values.

**Tech Stack:** Bun package manager/runtime, TypeScript, Bun test runner, native `fetch`.

---

### Task 1: Project Scaffold And Tests

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/config.ts`
- Create: `src/suicaodex.ts`
- Create: `src/mapper.ts`
- Create: `src/discord.ts`
- Create: `src/index.ts`
- Create: `src/*.test.ts`

- [ ] Write failing Bun tests for env config, cover URL mapping, SuicaoDex query construction, and Discord PATCH payload.
- [ ] Run `bun test` and verify the tests fail because modules are missing.

### Task 2: Minimal Implementation

**Files:**
- Modify: `src/config.ts`
- Modify: `src/suicaodex.ts`
- Modify: `src/mapper.ts`
- Modify: `src/discord.ts`
- Modify: `src/index.ts`

- [ ] Implement typed env loading with required Discord values and safe defaults.
- [ ] Implement `fetchRandomManga` using `/manga/random` and URL query params.
- [ ] Implement `mangaToWidgetPayload`, including cover URL `https://i.suicaodex.com/covers/{manga_id}/{cover_id}{ext}`.
- [ ] Implement Discord profile PATCH with basic 429 retry-after cooldown.
- [ ] Implement the periodic loop.
- [ ] Run `bun test` and verify all tests pass.

### Task 3: Documentation And Verification

**Files:**
- Create: `.env.example`
- Modify: `README.md`
- Modify: `package.json`

- [ ] Document setup, env vars, default filters, and run commands.
- [ ] Add scripts: `dev`, `start`, `test`, `typecheck`.
- [ ] Run `bun test`.
- [ ] Run `bun run typecheck`.
