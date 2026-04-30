# Strategium Nexus — Copilot Instructions

## Project Overview
Wargaming companion web app (BattleScribe data viewer, roster builder, campaign runner).
No backend server. All data stored in browser IndexedDB. Deployed to GitHub Pages.

## Tech Stack
- **React 18 + TypeScript** (strict mode)
- **Vite 5** — bundler; `base` URL injected via `VITE_BASE_URL` env var for GitHub Pages
- **Tailwind CSS 3** — utility-first; custom gothic theme in `tailwind.config.js`
- **React Router v6** — hash-based routing (`HashRouter`) for GitHub Pages compatibility
- **Zustand** — global state; see `src/store/gameStore.ts`
- **idb** — IndexedDB wrapper; schema in `src/services/db.ts`
- **Node 20-alpine** Docker image for all dev/build operations

## Key Conventions

### No Server — Ever
All data comes from public GitHub raw URLs (BSData repos). All storage is IndexedDB.
Never add a backend, API proxy, or server-side component.

### TypeScript
- Strict mode. Fix all `noUnusedLocals` and `noUnusedParameters` errors before committing.
- `@types/node` is required for `process.env` in `vite.config.ts` (tsconfig.node.json `"types": ["node"]`).
- Shared types live in `src/types/index.ts`.

### Styling
- Gothic theme: void-black backgrounds, aged-gold accents, parchment text, blood-red danger states.
- Fonts: Cinzel Decorative (display), Cinzel (headings), Crimson Pro (body) — loaded from Google Fonts.
- Use component classes from `src/index.css`: `btn-primary`, `btn-ghost`, `card`, `card-header`, `badge`, `badge-gold`, `badge-blood`, `divider-gold`.
- Do NOT add arbitrary hex colours — use theme tokens from `tailwind.config.js`.

### Data Flow
```
BSData GitHub (raw XML)  →  bsdataApi.ts (fetch)  →  xmlParser.ts (DOMParser)
  →  dataManager.ts (orchestrate)  →  db.ts (IndexedDB)  →  Zustand store  →  React UI
```

### File Structure
```
src/
  data/          — static manifests (bsdataIndex.ts — list of supported game systems)
  services/      — bsdataApi.ts, xmlParser.ts, dataManager.ts, db.ts
  store/         — gameStore.ts (Zustand)
  types/         — index.ts (all shared TS interfaces)
  components/    — Layout, Spinner, ProfileCard, ...
  pages/         — Home, GameLibrary, GameSystem, RulesViewer
```

### Routes (hash-based)
| Path | Component |
|------|-----------|
| `/#/` | Home |
| `/#/games` | GameLibrary |
| `/#/games/:slug` | GameSystem |
| `/#/games/:slug/:catalogueId` | RulesViewer |

Note: route param is `:slug` (matches `BsDataSystemManifest.slug`), not `:systemId`.

## MANDATORY: Validate Before Every Deploy

Run these two checks inside Docker before committing or recommending a deploy:

```powershell
# 1. TypeScript — must exit clean (no output)
docker compose -f c:\www\StrategiumNexus\docker-compose.yml run --rm dev npm run lint

# 2. Production build — must complete with "built in Xs"
docker compose -f c:\www\StrategiumNexus\docker-compose.yml run --rm dev npm run build
```

If either fails, fix all errors before proceeding. Do not deploy with TypeScript errors.

## Dependency Changes
When adding or removing npm packages:
1. Update `package.json`
2. Run `docker run --rm -v "c:\www\StrategiumNexus:/app" -w /app node:20-alpine npm install` to regenerate `package-lock.json` on the host
3. Run lint + build validation (above) before committing

The lockfile MUST be committed — CI uses `npm ci` which requires it.

## GitHub Actions (deploy.yml)
- Triggers on push to `main`
- Steps: checkout → setup-node (20) → `npm ci` → lint → build → deploy to `gh-pages`
- `VITE_BASE_URL` is injected as `/${{ github.event.repository.name }}/`
- `enable_jekyll: false` ensures `.nojekyll` is created (prevents GitHub stripping `_` folders)

## Common Mistakes to Avoid
- Do NOT use `localStorage` for game data — files are too large (50–100MB). Use IndexedDB.
- Do NOT use absolute asset paths (`/assets/...`) — always use `'./'` base or let Vite inject it.
- Do NOT call React hooks inside non-component functions.
- Do NOT commit without running lint + build in Docker first.
- Do NOT use `npm ci` if `package-lock.json` does not exist — run `npm install` first to generate it.
- Do NOT bump `DB_VERSION` in `db.ts` without considering that the upgrade handler drops and recreates stores (data is re-downloadable, so this is intentional).
