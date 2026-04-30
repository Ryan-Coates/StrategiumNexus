# StrategiumNexus — Development Plan

## Overview

**StrategiumNexus** is a web-based wargaming companion app targeting games such as Warhammer 40,000 and Necromunda. It provides players with an integrated experience for browsing rules, building army rosters, and running campaigns — all without requiring an account or a backend server.

**Comparable apps:** New Recruit, BattleScribe

**Tech constraints:**
- Web app only (no server, no database)
- All persistence via browser `localStorage`
- Deployed to GitHub Pages via GitHub Actions
- Data sourced from the BSData community repositories (BattleScribe format)

---

## Tech Stack

| Concern | Choice | Rationale |
|---|---|---|
| Framework | React 18 + TypeScript | Component model suits the complex UI; strong ecosystem |
| Bundler | Vite | Fast dev builds, static output ideal for GitHub Pages |
| Styling | Tailwind CSS | Utility-first, no runtime overhead |
| Routing | React Router v6 | Hash-based routing for GitHub Pages compatibility |
| State | Zustand | Lightweight, pairs well with IndexedDB |
| Storage (game data) | IndexedDB via `idb` | BSData XML + parsed JSON can exceed 50 MB per game system — IndexedDB handles hundreds of MB; localStorage (~5 MB) would overflow |
| Storage (preferences/UI) | localStorage | Roster metadata, settings, last-viewed faction — small values only |
| Data parsing | Custom XML parser (DOMParser) | BattleScribe `.gst`/`.cat` files are XML; no large dependency needed |
| Testing | Vitest + React Testing Library | Aligns with Vite toolchain |
| CI/CD | GitHub Actions | Lint → test → build → deploy to `gh-pages` branch |

---

## Data Source: BSData Format

BattleScribe files use two XML formats:

- **`.gst`** — Game System file. Defines the top-level rules, shared profiles, and categories for a game (e.g. Warhammer 40,000).
- **`.cat`** — Catalogue file. Defines a faction or supplement (e.g. Space Marines). References the parent `.gst`.

Files are hosted publicly at:  
`https://raw.githubusercontent.com/BSData/<repo>/master/<file>.gst`

The app will:
1. Maintain a curated index of known BSData repos.
2. Fetch and cache raw XML into `localStorage` on demand.
3. Parse XML client-side using `DOMParser`.

---

## Feature Phases

### Phase 1 — Rules Viewer *(first delivery)*
### Phase 2 — Army Roster Builder
### Phase 3 — Campaign Runner

---

## Phase 1: Rules Viewer

**Goal:** Allow a player to browse and search the rules content of any supported game system and its factions.

### User Stories

- As a player, I can see a list of available game systems pulled from the BSData index.
- As a player, I can download a game system and its catalogues with one click.
- As a player, I can browse rules, profiles, abilities, and keywords organised by faction.
- As a player, I can search across all rules text within a game system.
- As a player, downloaded data persists across sessions without re-downloading.
- As a player, I can refresh/update a game system to get the latest version.
- As a player, I can remove a game system to free storage space.

### Screens

```
/ (Home)
  └── /games                  — Game system browser (download & manage)
      └── /games/:id          — Game system overview (catalogues list)
          └── /games/:id/:cat — Catalogue / faction rules viewer
```

### Key Components

- `GameLibrary` — Lists available and downloaded game systems.
- `DataManager` — Handles fetch, parse, store, and invalidate of BSData XML.
- `RulesViewer` — Tree-style browser: Categories → Entries → Profiles → Rules.
- `RulesSearch` — Full-text search across all parsed rule text.
- `ProfileCard` — Renders a unit/weapon/ability profile in a formatted card.

### Data Flow

```
BSData GitHub Repo (raw XML)
        │  fetch on demand
        ▼
  DOMParser (client-side)
        │  structured JS objects
        ▼
  Zustand store  ──── localStorage (serialised JSON)
        │
        ▼
  React UI components
```

### Deliverables

- [ ] Project scaffold (Vite + React + TypeScript + Tailwind)
- [ ] GitHub Actions workflow (lint → test → build → deploy)
- [ ] BSData index (JSON manifest of supported repos and their raw file URLs)
- [ ] `DataManager` service — fetch, cache, expire, delete
- [ ] XML parser — `.gst` and `.cat` to typed TypeScript interfaces
- [ ] `GameLibrary` screen
- [ ] `RulesViewer` screen with collapsible tree
- [ ] `ProfileCard` component
- [ ] Full-text `RulesSearch`
- [ ] Responsive layout (mobile-first)
- [ ] Unit tests for XML parser
- [ ] Unit tests for DataManager (localStorage mock)

---

## Phase 2: Army Roster Builder

**Goal:** Allow a player to construct and save valid army lists using the downloaded data.

### User Stories

- As a player, I can create a new roster for any downloaded game system and faction.
- As a player, I can add units/models from the catalogue to my roster.
- As a player, I can select wargear options per unit as defined by the catalogue rules.
- As a player, I can see running points totals and validation errors (over-limit, illegal selections).
- As a player, I can save multiple named rosters to localStorage.
- As a player, I can print or export my roster as a formatted PDF or plain text.

### Key Components

- `RosterManager` — CRUD for saved rosters in localStorage.
- `RosterBuilder` — Interactive builder: faction picker → unit picker → options.
- `PointsTracker` — Live points/PL counter with limit enforcement.
- `ValidationEngine` — Evaluates BSData constraints (min/max selections, category limits).
- `RosterExport` — Renders a printable roster view; triggers browser print dialog.

### Deliverables

- [ ] Roster data model (TypeScript interfaces)
- [ ] `RosterManager` with localStorage persistence
- [ ] `RosterBuilder` screen
- [ ] BSData constraint parser (selection entries, costs, conditions)
- [ ] `ValidationEngine`
- [ ] `PointsTracker` component
- [ ] `RosterExport` (print stylesheet + plain text)
- [ ] Unit tests for ValidationEngine

---

## Phase 3: Campaign Runner

**Goal:** Allow groups of players to run persistent narrative campaigns (Necromunda, Crusade, etc.).

### User Stories

- As a player, I can create a campaign and invite participants (by sharing a local campaign file).
- As a player, I can record battle results and track campaign resources (XP, credits, territory).
- As a player, I can view the campaign log and standings.
- As a player, I can apply post-battle effects to my roster (injuries, advancements).
- As a player, I can export the full campaign to a shareable JSON file.

### Notes

- Campaigns are stored in localStorage and importable/exportable as JSON files.
- No server required; sharing is done by exporting and importing campaign JSON files.
- Initial support: Necromunda Dominion Campaign, Warhammer 40,000 Crusade.

### Deliverables

- [ ] Campaign data model
- [ ] Campaign creation wizard
- [ ] Battle recorder screen
- [ ] Campaign standings / log screen
- [ ] Post-battle effects workflow
- [ ] Import/export campaign JSON
- [ ] Unit tests for campaign state transitions

---

## Repository Structure

```
strategiumnexus/
├── .github/
│   └── workflows/
│       └── deploy.yml          # Lint → Test → Build → Deploy to gh-pages
├── public/
│   └── index.html
├── src/
│   ├── assets/
│   ├── components/             # Shared UI components
│   ├── features/
│   │   ├── rules-viewer/       # Phase 1
│   │   ├── roster-builder/     # Phase 2
│   │   └── campaign-runner/    # Phase 3
│   ├── services/
│   │   ├── dataManager.ts      # Fetch / cache / expire BSData
│   │   └── xmlParser.ts        # .gst / .cat parser
│   ├── store/                  # Zustand stores
│   ├── types/                  # Shared TypeScript interfaces
│   ├── App.tsx
│   └── main.tsx
├── tests/
├── PLAN.md
├── LICENSE
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## GitHub Actions Workflow (deploy.yml)

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test -- --run
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

---

## Delivery Milestones

| Milestone | Scope | Target |
|---|---|---|
| M0 — Scaffold | Project setup, CI/CD pipeline live, blank app on GitHub Pages | Week 1 |
| M1 — Data Layer | BSData index, DataManager, XML parser, localStorage cache | Week 2 |
| M2 — Rules Viewer | GameLibrary + RulesViewer + ProfileCard screens | Week 3 |
| M3 — Rules Search | Full-text search, polish, mobile layout | Week 4 |
| M4 — Roster Builder | RosterBuilder, ValidationEngine, PointsTracker | Week 6 |
| M5 — Roster Export | Print/export, roster CRUD | Week 7 |
| M6 — Campaign Runner | Campaign model, battle recorder, standings | Week 10 |
| M7 — Campaign Export | Import/export JSON, post-battle effects | Week 11 |

---

## Out of Scope (v1)

- User accounts or cloud sync
- Multiplayer / real-time features
- Painting trackers
- Map-based campaign tools
- Mobile app (PWA install is acceptable but not a primary target)
