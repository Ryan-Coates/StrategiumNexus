# Narrative Crusade — Requirements & Design Plan

## Overview

Add a **Narrative** tab that runs and administers club narrative campaigns (crusades), backed by a new **Firebase** service (Auth + Firestore) so club members can log in with Google and view/participate in shared campaign data. This is the first feature in StrategiumNexus that requires a backend and accounts — everything else (rules viewer, roster builder) remains local-only, unauthenticated, and IndexedDB-backed.

**First real campaign (drives the design):** *The Black Meridian Incident* — a 4-mission narrative campaign with a points-based attrition system, horde-mode enemy waves, and simple post-mission progression. See [Use Case](#use-case-the-black-meridian-incident) below.

**Club size:** ~7 members. Must run entirely on Firebase's free **Spark** plan (no billing).

---

## Architecture Change

### Current state
- Fully static SPA, no accounts, no server, all persistence in IndexedDB, deployed to GitHub Pages.

### New state
- **Hosting stays on GitHub Pages.** Firebase is used purely as a Backend-as-a-Service (Auth + Firestore) — we are **not** moving to Firebase Hosting.
- Firebase project must add the GitHub Pages domain (`<user>.github.io`) as an [authorized domain](https://firebase.google.com) for Auth.
- New env vars (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, etc.) — Firebase web config is not secret by design (protected by Firestore security rules, not by hiding the config), but still injected via GitHub Actions secrets → build-time env vars, same pattern as `VITE_BASE_URL`.
- This is a deliberate, scoped exception to the "no server, ever" rule in `copilot-instructions.md` — that rule will be updated to say "no *custom* server; Firebase BaaS is permitted for the narrative/auth feature only" once this plan is approved.

### Why Firestore over IndexedDB for this feature
Campaign data must be shared and admin-writable across multiple people's browsers/devices — IndexedDB is per-device and can't do that. Firestore also gives us security rules to enforce the admin/member permission split without writing our own backend.

---

## Roles & Access

| Role | Granted by | Can do |
|---|---|---|
| **Admin** | Manually promoted by an existing admin (starts with you) | Everything a member can, plus: create/edit campaigns, manage the allowlist & roles, enter battle reports, advance missions, award/adjust points & battle honours, run the horde wave tool, post announcements/events |
| **Member** | Signs in with Google using an email already on the allowlist | View campaigns, view own crusade pool & other members' (read-only), view standings/events/battle reports, build/edit their own crusade pool *only while the campaign is in `draft` status* |

- **Invite-only login:** an `allowlist` collection of pre-approved emails gates access. A Google sign-in from a non-allowlisted email succeeds in Firebase Auth but the app shows "not yet approved — ask an admin to add you" and blocks all Firestore reads (enforced by security rules checking the allowlist, not just client-side UI).
- No per-campaign roles for V1 — a flat admin/member split across the whole app is sufficient for a 7-person club.

---

## Use Case: The Black Meridian Incident

Condensed campaign summary used to validate the data model (full narrative flavour text lives in the app content, not this doc):

- **Premise:** Imperial factions cooperate to secure a Chaos artifact (the Black Meridian) on the moon Vespera-9; the moon is dragged into the Warp, forcing a 4-mission survival campaign.
- **4 missions**, each with a distinct objective (Planetfall → The Ritual → Warp Descent → Last Stand), escalating difficulty via **Threat Level**.
- **Campaign Pool:** each player starts with a fixed point pool (e.g. 3000pts) representing all forces available across the whole campaign.
- **Mission commitment:** before each mission, a player commits a subset of their pool (minimum threshold); only committed models are at risk.
- **Permanent attrition, per model:** destroyed models are permanently removed from the pool. Vehicles cost double to replace and have a mission of downtime. HQ models use a d6 leader-loss table (lost / missing next mission / returns), with Supplies spendable to re-roll, and an optional "Dreadnought interment" gamble.
- **Reinforcement Points (RP):** earned after each mission from a formula based on committed vs. casualties, minus Threat Level penalty; added back into the pool up to a cap.
- **Supplies:** a spendable resource for re-rolls, emergency reinforcements, and fast vehicle repair.
- **Progression:** simple — surviving models may gain one enhancement after each mission (no XP/talent trees).
- **Horde mode:** each mission has a Wave Points budget that scales with Threat Level; waves are built by rolling on a Chaos Wave Table until the budget is spent, with a chance of special events and boss waves at set intervals/thresholds.

This tells us the system needs, **per campaign**: configurable mission list, configurable formulas (RP, Wave Points scaling), a Threat Level counter, and **per member**: a crusade pool of individually-tracked models, Supplies, and RP — all editable only by the admin once the campaign is live.

---

## Feature Breakdown

### 1. Authentication & Onboarding
- "Sign in with Google" button in `Layout` header (Firebase Auth, Google provider).
- On first sign-in: create a `users/{uid}` doc. If email is on the allowlist, mark active; otherwise show a pending/blocked screen.
- Admins manage the allowlist and promote members to admin from the admin area.

### 2. Narrative Tab (member-facing)
New route `/#/narrative`, plus per-campaign sub-routes:
- **Campaign list/dashboard** — active campaign(s), current mission, Threat Level, countdown/status.
- **My Crusade Pool** — list of units/models, points remaining, Supplies, status per model (active/destroyed/missing/interred/dead), enhancements gained. Editable by the owning member only while campaign status is `draft`.
- **Mission tracker** — current + past missions, objectives, narrative text, per-mission results.
- **Standings** — all members' remaining pool points, Supplies, kills/losses — simple leaderboard.
- **Narrative feed** — admin-posted events/announcements shown in campaign order, for storytelling/flavour.
- **Battle report history** — read-only log of entered results per mission.

### 3. Admin Area
New route `/#/narrative/admin` (only rendered/reachable for admin role; also enforced server-side via security rules):
- **Campaign management** — create/edit campaign, configure mission list, formulas, starting pool size, starting Supplies, Threat Level rules; set status `draft → active → completed`; advance `currentMissionIndex` (manual, admin-driven).
- **Member management** — allowlist emails, promote/demote admin, view all members' pools.
- **Battle report entry** — admin manually enters results after each game night (no player submission/confirmation flow for V1): per participant — committed points, per-model casualty outcomes, RP awarded (formula-assisted, admin can override), notes.
- **Manual adjustments** — award/revoke Supplies, RP, or points; add a free-text enhancement to a surviving model; set HQ leader-loss outcome.
- **Horde Wave Tool** — admin-side utility (see below).
- **Announcements** — post narrative events to the feed.

### 4. Horde Wave Tool
- Admin maintains a **Chaos Wave Table** (reusable list: unit name, WP cost, min Threat Level to appear, boss flag) — data-entered once, reused across missions/campaigns.
- For a given mission + current Threat Level, computes the Wave Points budget from the campaign's configured formula.
- "Generate wave" button: randomly rolls units from the table until the budget is spent (respecting min-Threat gating), with a configurable chance of a special/boss event.
- Admin can regenerate, manually swap entries, or lock in a wave; generated waves are saved against the mission for reference during/after the game.
- This is a planning/reference aid for the tabletop game itself, not an automated opponent — no live game-state simulation.

---

## Data Model (Firestore)

```
users/{uid}
  email, displayName, photoUrl, role: 'admin' | 'member', status: 'active' | 'pending', createdAt

allowlist/{emailLowercase}
  addedBy, addedAt

campaigns/{campaignId}
  name, description, status: 'draft' | 'active' | 'completed'
  currentMissionIndex, threatLevel
  config:
    startingPoolPoints, maxPoolPoints, startingSupplies, minCommitPoints
    rpFormula: { casualtyDivisor, threatPenaltyPerLevel }
    waveFormula: { baseWavePointsPerMission: number[], threatScalingPct }
  createdBy, createdAt

campaigns/{campaignId}/missions/{missionId}
  index, name, objective, narrativeText, waveCadence, status

campaigns/{campaignId}/waveTable/{entryId}
  name, wavePointCost, minThreatLevel, isBoss

campaigns/{campaignId}/participants/{uid}
  displayName, supplies, poolPointsRemaining
  units: [
    { id, name, pointsCost, isVehicle, isHQ, downtimeUntilMissionIndex,
      models: [ { id, status: 'active'|'destroyed'|'missing'|'interred'|'dead', enhancements: string[] } ] }
  ]

campaigns/{campaignId}/battleReports/{reportId}
  missionId, enteredByUid, createdAt
  results: [ { uid, committedPoints, rpAwarded, casualties: [{unitId, modelId, outcome}], notes } ]

campaigns/{campaignId}/generatedWaves/{missionId}
  threatLevelAtGeneration, wavePointBudget, entries: [{ waveTableEntryId, name, cost }]

campaigns/{campaignId}/events/{eventId}
  postedByUid, createdAt, title, body
```

### Security rules (summary)
- All reads/writes require `request.auth != null` and `users/{uid}.status == 'active'`.
- Writes to `campaigns/**` (except a participant's own `participants/{uid}` doc while `campaign.status == 'draft'`) require `users/{uid}.role == 'admin'`.
- `allowlist` and `users.role` are admin-write only.

---

## Tech Additions

| Concern | Choice |
|---|---|
| Auth + DB | `firebase` npm package (modular v9+ SDK) — `firebase/auth`, `firebase/firestore` |
| State | New `narrativeStore.ts` (Zustand) mirroring `rosterStore.ts` pattern, backed by Firestore reads/writes instead of `db.ts`/IndexedDB |
| Types | New `src/types/narrative.ts` — kept separate from existing roster/rules types |
| Routes | `/narrative`, `/narrative/:campaignId`, `/narrative/:campaignId/admin` (guarded) |
| Config | `src/services/firebase.ts` — initializes app from `import.meta.env.VITE_FIREBASE_*` |

No real-time listeners required for V1 (manual refresh/reload is acceptable) — simplifies rules and avoids extra Firestore reads on the free tier.

---

## Implementation Phases

1. **Phase A — Auth & Admin Skeleton**
   Firebase project setup, env/secrets wiring, Google sign-in, `users`/`allowlist` collections + security rules, basic admin member-management screen, route guarding.
2. **Phase B — Campaign & Crusade Pool**
   Campaign CRUD (admin), campaign config form, member "build my pool" screen (draft status), Narrative tab dashboard + My Crusade Pool + Standings (read views).
3. **Phase C — Missions, Battle Reports & Progression**
   Mission list/tracker, admin battle report entry form, casualty/HQ-loss/RP calculation helpers, enhancement assignment, manual adjustments.
4. **Phase D — Horde Wave Tool & Narrative Feed**
   Chaos Wave Table management, wave generation tool, announcements/events feed, campaign status transitions (`draft → active → completed`).

---

## Open Questions / Risks

- **Spark plan limits:** 50k reads/20k writes per day, 1GB stored — trivially fine for 7 users, no concern.
- **Firebase config exposure:** the web config (`apiKey` etc.) is safe to ship client-side by design; real protection comes from Firestore security rules + the allowlist. Will double check rules cover every collection before launch.
- **Allowlist bootstrapping:** first admin (you) needs to be seeded manually (directly in Firestore console) since no admin exists yet to promote you.
- **No offline support planned** — narrative tab requires network connectivity; existing rules viewer/roster builder are unaffected and remain fully offline-capable.
