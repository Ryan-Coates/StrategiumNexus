# Campaign Mode — Roster Manager & Narrative Driver — Requirements

> **Status: BUILT — implemented and refined past the original 12 questions.** See the
> "Post-build refinements" note at the end of this doc for changes made after the
> initial build based on live feedback.

## 1. Goal

A new **Campaign** area, separate from Horde Mode, for running a persistent narrative
campaign across 7 players (6 Imperial, 1 Ork). Everything lives under a single nav tab
— **"Tides of Meridian Campaign"** — which is a hub linking to two halves, kept
**loosely coupled** on purpose at the data level (see decision 7/12):

1. **Roster Manager** — a new, simple, standalone army list per player, with permanent
   attrition (model losses that persist between games) and a progression mechanic
   (earning Enhancements).
2. **Narrative Driver** — you (GM) publish missions with story text, mission rules, and
   a deployment map; players get a clean, printable/PDF-able view.

---

## 2. Players & Armies

| Player | Faction | Points | Roster cap mechanic |
|---|---|---|---|
| 1–6 | Imperial (any Imperium faction) | 2,000 pts | Fixed 2,000pt cap on the roster's total build |
| 7 | Orks | 3,000 pts | Fixed 3,000pt cap on the roster's total build — same as Imperial |

Both army types share the **same roster lifecycle** (build → commit to mission → take
casualties → permanent update). **The cap applies to the roster's total build, not to
what's committed to any one mission** — how much of the roster is sent into a given
mission is entirely manual/GM discretion, no blocking or enforcement in the app.

Ork rosters also track **Waaagh Points (WP)**, a separate persistent, manually-adjusted
resource used only during missions to justify bringing in extra committed forces mid-game
(see "Post-build refinements" below) — it does not affect the roster's build cap.

---

## 3. Decisions (confirmed)

| # | Question | Decision |
|---|---|---|
| 1 | Build on existing roster system or a new one? | **New, simple, standalone roster system** for Campaign Mode — not built on the existing BSData-driven `Roster`/`RosterUnit`/Warband Forge model. Just unit name, points cost, model count, and simple character/enhancement notes. |
| 2 | What does "remove a model" permanently do? | Confirmed — the unit's model count permanently shrinks (a 10-model squad that loses 3 stays a 7-model squad from then on). |
| 3 | What happens to an Enhancement if its bearer is permanently lost? | **Lost with the character** — burned, not reassignable. |
| 4 | How are Enhancements earned? | Manually granted by you (GM) after a mission. No in-game mechanic modelling needed — it's just a label you add to a character in the roster editor. |
| 5 | Does Waaagh Points persist between missions, or reset? | **Persists** — WP is a running total stored on the Ork roster, not reset per mission. It is **manually adjusted** (no automatic formula/trigger) whenever the player earns more. Originally planned as the roster's build cap (`WP × 100`); refined post-build so Ork rosters instead get a **fixed 3,000pt build cap** (same mechanic as Imperial), and WP is used purely as a **mission-time reinforcement resource** — see "Post-build refinements". |
| 6 | Can Imperial players ever recover permanently-lost points? | No dedicated buy-back mechanic, **but the roster is never locked/read-only** — units/models can always be manually edited back in if you want to house-rule an exception. The door isn't closed, it's just not an automated feature. |
| 7 | Does this reuse Horde Mode's Attrition Tracker / RP / Campaign Pool? | **Fully separate from Horde Mode.** Conceptually this whole feature (Roster Manager + Narrative Driver) is its own "narrative campaign" space in the nav — but keep coupling **between Roster Manager and Narrative Driver themselves** minimal too (see #12). Don't reuse Horde Mode components/state. |
| 8 | How do 7 players' rosters get managed with no backend/server? | **For now:** each player's own browser/IndexedDB, same as today. **Future:** Firebase + Google Auth is planned for real sync/login across devices — but that's a separate follow-up effort. This phase should ship fully local-first, and simply avoid design choices that would make a later Firebase migration painful (e.g. keep data plain-JSON-serializable, keyed by stable ids). |
| 9 | How is the narrative "admin" (mission editor) area gated? | **For now:** left open — no gating, just a route not linked from player nav (`/narrative/admin`, `/narrative/:id/admin`). **Future:** once Firebase Auth lands, gate it with real auth hardcoded to your specific Google account. Build the check as a single, swappable `isAdmin()` guard so plugging in real auth later is a one-line change. |
| 10 | Deployment map format? | Upload a static image per mission. UI: present the upload control inside a simple collapsible **drawer/panel** in the admin editor (not a big permanent form field) — open to revisiting the exact widget later. |
| 11 | PDF export method? | Confirmed — a print-optimised stylesheet on the mission's read view; "Export as PDF" opens the browser print dialog (Save as PDF), no PDF library. |
| 12 | Do missions link to rosters? | **No — keep them independent.** Narrative missions are pure story/rules content. The Roster Manager's mission flow (Start/In Mission/End Mission) does not reference or require a specific Narrative mission; at most a roster's mission log has a freeform text label the player can type in by hand (e.g. "Mission 3 - Siege of X"). |
| 13 | Does the points cap apply to missions or the roster? | **The roster's total build**, not per-mission commitment. Committing units to a mission is unrestricted/manual — no blocking logic in the app. |

---

## 4. Imperial Player Flow

```
Warband Forge (existing)
  → build/edit a 2,000pt roster as normal (no change)

Campaign Roster view (new)
  → "Start Mission"
      → give the mission a freeform label (e.g. "Mission 3 - Siege of X")
      → select which units to commit — no cap enforcement, running total shown for reference only
      → confirm → enters "In Mission" state
  → "In Mission" screen
      → committed unit list, each with a per-model checklist (or "-1 model" stepper)
      → mark models as casualties as the game is played (live, no need to finish in one sitting —
        state is persisted so you can close the tab mid-game)
  → "End Mission"
      → review a casualty summary (unit → models lost)
      → confirm → roster permanently updates:
          - unit model counts shrink by the casualties taken
          - fully-wiped units are removed from the roster
          - mission is logged to the roster's mission history (a freeform text label only —
            not linked to a specific Narrative mission record, see decision 12)
      → optionally: GM grants an Enhancement to a survivor as a reward (manual step) —
        if that character later dies permanently, the Enhancement is lost with them
  → Roster editor remains open/editable at all times — no automated buy-back mechanic,
    but nothing is ever locked down, so a manual correction/house-rule exception is
    always possible by just editing the roster directly.
```

## 5. Ork Player Flow

Same shape as Imperial — the only difference is what the WP field controls:

```
Ork roster has a persistent "Waaagh Points" number stored on it (carries over between
missions — it is never auto-reset). WP × 100 is the roster's build cap (how many
points of units the roster can hold), same role a fixed 2,000pt limit plays for
Imperial rosters. It has no effect on mission commitment.

"Start Mission" / "In Mission" / "End Mission" — identical to the Imperial flow.
Units are selected freely, no cap enforcement at commit time.

Waaagh Points is edited from the Roster editor at any time (raising it unlocks room
to add more units to the roster; lowering it is a manual correction) — it is not part
of the mission flow at all.
```

---

## 6. Narrative Driver

### Player-facing view (`/narrative`, `/narrative/:missionId`)

- `/narrative` — list of **published** missions only (draft missions hidden from players).
- `/narrative/:missionId` — a clean, gothic-styled read view with three sections:
  1. **Narrative** — free text (story/fluff), supports basic paragraph formatting.
  2. **Mission Rules** — free text (objectives, special rules, victory conditions).
  3. **Deployment Map** — the uploaded map image.
  - **Export as PDF** button → triggers a print-styled view of just this content.

### Admin view (`/narrative/:missionId/admin`, `/narrative/new`)

- Create/edit: title, narrative text, mission rules text, status (`draft` / `published`).
- Deployment map image upload lives inside a simple collapsible **drawer/panel** in
  this admin form (not a big permanent field) — exact widget open to revisit later.
- No roster/player tagging — Narrative missions are intentionally **independent** of
  the Roster Manager (decision 12), to keep coupling minimal.
- `/narrative/admin` — a separate index listing all missions including drafts
  (GM-only, unlinked from player nav).
- **Gating today:** none — these routes are simply not linked from player nav.
  **Future:** once Firebase + Google Auth is added, wrap admin routes in a single
  `isAdmin()` guard checked against your hardcoded account, so it's a one-line swap
  later rather than a redesign.

---

## 7. Data Model (proposed)

A **new, standalone** set of types in `src/types/campaign.ts` — deliberately not
extending the existing BSData-driven `Roster` type, and deliberately not cross-linking
to `NarrativeMission`:

```ts
// ── Campaign Roster Manager (new, simple, standalone) ──────────────────────
export type CampaignFaction = 'imperial' | 'ork'

export interface CampaignRoster {
  id: string
  playerName: string
  faction: CampaignFaction
  pointsLimit: number             // 2000 (Imperial) or 3000 (Ork)
  waaaghPoints?: number           // Orks only — persistent, manually adjusted
  units: CampaignUnit[]
  missionHistory: CampaignMissionLog[]
  activeMission?: ActiveMissionState  // present while "In Mission"
  createdAt: number
  updatedAt: number
}

export interface CampaignUnit {
  id: string
  name: string
  pointsCost: number
  modelCount: number               // shrinks permanently on casualties; 0 = wiped
  isCharacter: boolean
  enhancement?: string             // freeform label; removed entirely if the character dies
  notes: string
}

export interface CampaignMissionLog {
  id: string
  label: string                    // freeform text, e.g. "Mission 3 - Siege of X" (no FK)
  playedAt: number
  committedPoints: number
  casualties: { unitId: string; unitName: string; modelsLost: number; wiped: boolean }[]
  enhancementsGranted: { unitId: string; enhancement: string }[]
}

export interface ActiveMissionState {
  label: string
  startedAt: number
  committedUnitIds: string[]
  casualtyDraft: Record<string, number>  // unitId -> models removed so far, pre-confirm
}

// ── Narrative Driver (independent — no links to CampaignRoster) ───────────
export interface NarrativeMission {
  id: string
  title: string
  status: 'draft' | 'published'
  narrativeText: string
  missionRulesText: string
  deploymentMapImage?: string   // stored as a Blob ref in IndexedDB
  createdAt: number
  updatedAt: number
}
```

### Storage

- New, separate IndexedDB database (e.g. `strategium-nexus-campaign`), independent of
  the main `strategium-nexus` DB and the Horde Mode `strategium-nexus-horde` DB, with
  two stores: `campaignRosters` (keyed by `id`) and `narrativeMissions` (keyed by
  `id`). Deployment map images stored as Blobs.
- Kept in its own DB (rather than reusing an existing one) to honor decision 7 — no
  shared coupling with Warband Forge or Horde Mode storage.
- Data is plain, flat, JSON-serializable objects by design, so a future Firebase
  migration (per decision 8) is a storage-layer swap, not a data-model rewrite.

---

## 8. New Routes

| Path | Purpose |
|---|---|
| `/campaign` | Hub — "Tides of Meridian Campaign", links to Rosters and Narrative |
| `/campaign/rosters` | Roster list (players), create a new roster inline |
| `/campaign/rosters/:rosterId` | Roster editor (units, models, about, enhancements, Ork WP) |
| `/campaign/rosters/:rosterId/mission` | Start/continue/end a mission for that roster |
| `/narrative` | Published missions list (player-facing) |
| `/narrative/:missionId` | Read view of a mission (+ Export as PDF) |
| `/narrative/admin` | All missions incl. drafts (GM-only, unlinked from player nav) |
| `/narrative/new` | Create a mission (GM) |
| `/narrative/:missionId/admin` | Edit a mission (GM) |

---

## 9. Open Items / Future Work

1. Naming — is "Campaign" the right nav label, or do you prefer something more
   in-theme (e.g. "Crusade", "War Record")?
2. Firebase + Google Auth migration is explicitly **out of scope for this phase** —
   noted as a future follow-up. When it lands: (a) swap local IndexedDB storage for
   Firestore per-user, (b) implement the real `isAdmin()` check hardcoded to your
   account for `/narrative/*/admin` routes.
3. Exact deployment-map "drawer" widget (simple `<details>`/collapsible panel vs. a
   slide-out drawer component) — either is quick to build, can decide during Phase A.

---

## 10. Phased Implementation Plan

- **Phase A — Data & Narrative CRUD**: new campaign DB/types, admin create/edit
  mission form (with drawer-style map upload), published list, read view with print
  stylesheet.
- **Phase B — Campaign Roster Manager (new, simple)**: Campaign home, create/edit a
  roster (players, faction, units, model counts, enhancements, Ork WP field).
- **Phase C — Mission flow**: Start Mission (commit units + cap logic incl. live Ork WP
  edits), In Mission (live casualty tracking), End Mission (apply permanent losses +
  freeform mission log entry).
- **Phase D — Progression**: GM "grant Enhancement" action on a character, lost
  automatically if that character is later permanently removed.
- **Phase E — Polish**: PDF print stylesheet refinement, mobile layout pass.

The feature has been built (Phases A–C shipped; Phase D covered by the freeform
Enhancements list). See below for changes made after the initial build.

---

## 11. Post-build refinements

Made after the initial implementation, based on live feedback:

1. **Nav consolidated to a single tab** — "Campaign" and "Narrative" are no longer
   separate top-level nav items. One tab, **"Tides of Meridian Campaign"**, links to a
   hub page (`/campaign`) with two cards: Roster Manager (`/campaign/rosters`) and
   Narrative Missions (`/narrative`). Data stays decoupled underneath (decision 7/12
   unchanged) — this is purely a navigation/IA change.
2. **Each unit now has a Name (unchanged) and an About field** — freeform
   background/description text, separate from Enhancements.
3. **Enhancements are now a list, not a single field** — players can add any number of
   freeform enhancement labels to a unit and remove them individually, instead of one
   overwritable text field. Still lost entirely if the unit is wiped (decision 3
   unchanged).
4. **Ork roster build cap is now fixed at 3,000 pts**, same mechanic as Imperial —
   no longer derived from Waaagh Points. This lets an Ork player build a normal
   3,000-point roster regardless of their current WP.
5. **Waaagh Points is now purely a mission-time reinforcement resource** — during an
   active mission, Ork players get an "Add Reinforcements" panel to commit additional,
   previously-uncommitted roster units mid-game. WP × 100 is shown as guidance for how
   much to bring in, but is **not enforced/blocked** (consistent with the "no cap on
   missions" decision) — it's informational only, controlled manually.

Routes affected: roster routes moved from `/campaign/*` to `/campaign/rosters/*`;
`/campaign` is now the hub page described above.

