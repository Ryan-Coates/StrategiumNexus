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

## Phase 2: Warband Forge (Roster Builder)

**Goal:** A friendly, wizard-driven army builder that lets players construct, validate, and personalise army rosters using live BSData rules — then export or share them.

**Inspiration:** New Recruit (wizard flow, live validation, mobile-first)

---

### Design Principles

- **Wizard with free navigation** — progress through steps in order, but any visited step is accessible at any time via a persistent step-bar at the top. No step is locked as long as you have a valid army name.
- **Live feedback** — validation errors and points totals update on every change without needing a "Check" button.
- **Data-first** — all rules (costs, limits, options) are read from the parsed BSData catalogues already in IndexedDB. No hardcoded data.
- **Personalisation first-class** — custom names and portrait images are core features, not afterthoughts.
- **Storage in IndexedDB** — rosters can contain base64 portrait images (potentially large); IndexedDB is the right tier, not localStorage.

---

### Wizard Steps

The builder is a single `/roster/:id` route that renders a step-bar and swappable step panels. Step state persists to IndexedDB on every change (auto-save).

```
┌──────────────────────────────────────────────────────────────────┐
│  ① Army Setup → ② Detachment → ③ Build Roster → ④ Configure     │
│  Units → ⑤ Review & Validate → ⑥ Export                         │
│  [step bar — click any completed step to jump back]              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [ Active step panel ]                                           │
│                                                                  │
│  [ ← Back ]                               [ Next Step → ]       │
└──────────────────────────────────────────────────────────────────┘
```

#### Step 1 — Army Setup
- **Army name** (text input, required)
- **Game system** (dropdown of downloaded systems)
- **Points limit** (free input, or common presets: 500 / 1000 / 1500 / 2000)
- **Optional: army notes** (free text, displayed in View mode)
- Choosing a game system loads its available catalogues for Step 2.

#### Step 2 — Detachment
- **Faction / Catalogue** (list of available catalogues for the chosen system — same cards as Browse Codex, filtered to non-library)
- **Detachment** (if the catalogue defines detachments via BSData — e.g. Plague Company, Ironstorm Spearhead)
- Shows the detachment rule text once selected.
- Sets the stratagem pool for Step 5 and the View panel.

#### Step 3 — Build Roster
The main building step. Split into two panels (collapsible on mobile):

**Left panel — Unit Browser:**
- All available selection entries from the chosen catalogue, grouped by category (HQ / BATTLELINE / FAST ATTACK / etc.)
- Each entry shows name, base points cost, and key keywords.
- Search / filter bar at top.
- Tap/click to add a unit to the roster. Units with min > 1 add the minimum count immediately.

**Right panel — Current Roster:**
- Live list of all added units, each showing:
  - Name (custom name if set, else catalogue name)
  - Portrait thumbnail (if uploaded)
  - Wargear summary
  - Points cost
  - ✏️ button → jumps to Step 4 focused on that unit
  - 🗑️ button → removes unit
- Running totals bar: `1,240 / 2,000 pts` + category breakdown
- Inline validation badges (🔴 Over limit / ⚠️ Missing BATTLELINE / etc.)

#### Step 4 — Configure Units
One panel per unit (tabbed list on left, config panel on right). Per unit:

- **Custom name** — text input; displayed everywhere in place of catalogue name
- **Portrait image** — drag-and-drop or file picker; stored as base64 in IndexedDB; displayed as a card header in View mode
- **Wargear options** — rendered from BSData `selectionEntries` / `entryGroups`:
  - Radio groups for "pick one of" options
  - Checkboxes for "pick any" options
  - Numeric spinners for "how many" options
  - Each option shows its points delta
- **Enhancement** — if the unit is a CHARACTER and the detachment has enhancements, show an enhancement picker
- **Unit notes** — free text for personal reminders ("fleet of foot", "usually goes with X")

#### Step 5 — Review & Validate
Read-only summary + validation. Split layout:

**Left — Roster summary:**
- All units listed with final points, wargear, custom name, and portrait
- Total points, total models, power level (if applicable)

**Right — Validation panel:**
- 🔴 **Errors** (army cannot legally be used): over points limit, required category minimums not met, detachment-specific restrictions violated
- ⚠️ **Warnings** (questionable but legal): units with no wargear configured, characters with no bodyguard nearby
- ✅ **OK** items listed below errors

**Bottom — Stratagem reference:**
- Collapsed accordion of all stratagems for the chosen detachment (from the stratagem JSON files)
- Useful last-minute reminder before a game

#### Step 6 — Export
Four options, presented as large buttons:

1. **📋 Copy as Text** — plain-text army list to clipboard (Army Forge / BattleScribe compatible format)
2. **⬇️ Download Roster JSON** — single roster as a `.json` file; can be re-imported later
3. **🖨️ Print / Save as PDF** — opens a print-optimised view (no nav, no wizard chrome; clean layout with portraits if uploaded)
4. **💾 Full Backup** — downloads ALL rosters as a single `strategium-nexus-backup.json`

---

### Roster List Screen (`/rosters`)

Accessible from the main nav. Shows all saved rosters as cards:

- Portrait collage (up to 4 unit thumbnails)
- Army name, game system, faction, points
- Last modified date
- Action buttons: **Open in Builder**, **View**, **Export**, **Duplicate**, **Delete**

"New Army" button leads to Step 1 of the wizard.

---

### View Mode (`/rosters/:id/view`)

A read-only, game-table-friendly view. No builder chrome — just the army.

- Header: army name, detachment, points total
- Unit cards in a grid: portrait, stats table, wargear list, abilities
- Collapsible stratagems panel at the bottom
- Army rules and detachment rule panel
- Print button

---

### Data Model

```typescript
// IndexedDB store: "rosters"
interface Roster {
  id: string                    // uuid
  name: string                  // custom army name
  systemId: string              // BSData system id
  catalogueId: string           // BSData catalogue id (XML UUID)
  detachment: string            // detachment name
  pointsLimit: number
  notes: string
  createdAt: number             // unix ms
  updatedAt: number
  units: RosterUnit[]
}

interface RosterUnit {
  uid: string                   // local uuid (stable across renames)
  catalogueEntryId: string      // BSData selectionEntry id
  catalogueName: string         // original catalogue name (fallback)
  customName: string            // player's custom name (empty = use catalogueName)
  portraitBase64: string        // empty string if no portrait
  notes: string
  selections: RosterSelection[] // chosen wargear / options
  enhancementId: string         // empty if none
}

interface RosterSelection {
  entryId: string               // BSData selectionEntry id of the option
  count: number                 // for numeric options
}
```

---

### Validation Engine

Reads BSData `categoryLinks`, `constraints`, and `costs` from the parsed catalogue to enforce:

| Rule | Source in BSData |
|---|---|
| Points total ≤ limit | `cost` elements on each selectionEntry |
| Category minimums (e.g. min 2 BATTLELINE) | `constraint type="min"` on category |
| Category maximums (e.g. max 1 LORD) | `constraint type="max"` on category |
| Selection min/max within a unit | `constraint` on selectionEntryGroup |
| Detachment restrictions | Currently: manual overrides in a `detachmentRules.ts` file per game system (BSData does not encode all detachment rules in machine-readable form) |

Validation runs on every roster mutation and returns `ValidationResult[]` (errors + warnings) stored in Zustand.

---

### Import / Export

- **Single roster export:** `{ version: 2, type: "roster", roster: Roster }` JSON file
- **Full backup export:** `{ version: 2, type: "backup", rosters: Roster[] }` JSON file
- **Import:** File picker → parse JSON → validate schema version → write to IndexedDB → redirect to roster list
- **Conflict on import:** if a roster with the same `id` already exists, prompt: Overwrite / Keep Both (new uuid) / Cancel

---

### New Routes

| Path | Component |
|---|---|
| `/#/rosters` | RosterList |
| `/#/rosters/new` | RosterWizard (Step 1) |
| `/#/rosters/:id` | RosterWizard (last active step) |
| `/#/rosters/:id/view` | RosterView |

---

### Key Components / Files

```
src/
  pages/
    RosterList.tsx
    RosterWizard.tsx         — step-bar + step switcher
    RosterView.tsx
  components/
    Roster/
      StepBar.tsx            — step indicator / navigation
      steps/
        ArmySetupStep.tsx
        DetachmentStep.tsx
        BuildRosterStep.tsx
        ConfigureUnitsStep.tsx
        ReviewStep.tsx
        ExportStep.tsx
      UnitBrowserPanel.tsx
      RosterPanel.tsx
      UnitConfigCard.tsx
      PortraitUploader.tsx
      ValidationPanel.tsx
      PrintView.tsx
  services/
    rosterDb.ts              — IndexedDB CRUD for Roster objects
    rosterValidator.ts       — ValidationEngine
    rosterExport.ts          — text/json/backup export helpers
  store/
    rosterStore.ts           — Zustand: active roster, validation results, step
```

---

### Deliverables (Phase 2)

- [ ] IndexedDB schema bump (add "rosters" store) in `db.ts`
- [ ] `rosterDb.ts` — CRUD helpers
- [ ] `Roster` / `RosterUnit` TypeScript interfaces in `types/index.ts`
- [ ] `rosterStore.ts` Zustand store
- [ ] `RosterList` page
- [ ] `StepBar` component
- [ ] Step 1 — ArmySetupStep
- [ ] Step 2 — DetachmentStep (reads catalogues from IndexedDB)
- [ ] Step 3 — BuildRosterStep with UnitBrowserPanel + RosterPanel
- [ ] Step 4 — ConfigureUnitsStep with PortraitUploader
- [ ] Step 5 — ReviewStep + ValidationPanel + stratagem accordion
- [ ] Step 6 — ExportStep (text, JSON, print, backup)
- [ ] `rosterValidator.ts` — ValidationEngine (points, categories, constraints)
- [ ] `rosterExport.ts` — export/import helpers
- [ ] `RosterView` page (print-friendly view mode)
- [ ] Import flow (file picker → parse → IndexedDB)
- [ ] Nav update (add Warband Forge link)
- [ ] Unit tests for ValidationEngine
- [ ] Unit tests for export/import round-trip


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
