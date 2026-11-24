# Deployment Map Editor — Plan

> **Status: PROPOSED — not yet built.** This is a planning doc only. Answer the
> questions in section 6 (inline, in this file) whenever you're free, and let me know
> when it's ready — I'll build from whatever's filled in, using my recommendations for
> anything left blank.

## 1. Goal

Right now, the Narrative Mission editor (`src/pages/Narrative/NarrativeEditor.tsx`) only
lets you **upload a static image** as the deployment map (a `deploymentMapImage` data
URL on `NarrativeMission`, shown as-is in the read view and PDF export).

You want to **build** the map in-app instead of (or in addition to) uploading one — a
simple editor to place **terrain pieces, deployment zones, objective markers, and
labels** on a board, then save the result with the mission.

## 2. Proposed Feature Overview

A new **Deployment Map Editor** screen, opened from the Narrative mission editor (replacing
or supplementing the current file-upload control):

- A rectangular **board canvas** (fixed aspect ratio matching a real tabletop, e.g. 44"x30" or
  a size you pick — see Q1).
- Optional **uploaded background image** (keeps today's feature — e.g. a photo of a real
  table, or a scanned grid) that objects are drawn on top of.
- A **toolbar** to add:
  - **Deployment zones** — colored rectangle/polygon regions with a label (e.g. "Attacker",
    "Player 2").
  - **Terrain pieces** — shapes (rectangle / circle / freeform polygon) tagged with a kind
    (forest, ruins, hill, water, building, crater, obstacle — see Q2) that get a default
    color/fill per kind.
  - **Objective markers** — small numbered circles.
  - **Text labels** — freeform captions (e.g. "River", "No man's land").
- **Select tool** to move, resize, rotate, recolor, relabel, delete, and reorder
  (front/back) any placed object.
- **Save** flattens the board to a PNG (reusing the existing `deploymentMapImage` field
  so the read view / PDF export need **no changes**), while also saving the editable
  object list so you can **reopen and keep editing** later.

This is additive, not a rewrite — missions created before this feature keeps working
exactly as they do today (a plain uploaded image, no editable objects).

## 3. Data Model Changes

Extend `src/types/campaign.ts`:

```ts
export type TerrainKind = 'forest' | 'ruins' | 'hill' | 'water' | 'building' | 'crater' | 'obstacle'
export type MapObjectKind = 'deploymentZone' | 'terrain' | 'objective' | 'label'
export type MapShape = 'rect' | 'circle' | 'polygon'

export interface MapObject {
  id: string
  kind: MapObjectKind
  shape: MapShape
  x: number
  y: number
  width?: number    // rect
  height?: number   // rect
  radius?: number   // circle
  points?: { x: number; y: number }[] // polygon (freeform terrain outline)
  rotation: number  // degrees
  color: string
  label?: string
  terrainKind?: TerrainKind // only for kind === 'terrain'
}

export interface DeploymentMapData {
  boardWidthIn: number
  boardHeightIn: number
  backgroundImage?: string // optional uploaded photo/grid, data URL
  objects: MapObject[]
}
```

On `NarrativeMission`, add:

```ts
/** Editable source data for the in-app map editor. Absent for missions that only ever
 *  had a plain uploaded image (pre-editor missions, or ones that never opened the editor). */
deploymentMapData?: DeploymentMapData
```

`deploymentMapImage` stays exactly as it is today — a flattened PNG snapshot, regenerated
from `deploymentMapData` every time you save in the editor. The read view, PDF export, and
Firestore writes (`stripUndefined`) need **zero changes**.

## 4. Technical Approach

**Rendering surface — two options:**

| Option | Pros | Cons |
|---|---|---|
| **A. Plain SVG + React state** (no new dependency) | No bundle size cost; full control; consistent with "avoid unnecessary deps" | More custom code to write for drag/resize/rotate handles |
| **B. `react-konva` (canvas library)** (~40-80kB gzipped new dependency, same category as the `jspdf`/`firebase` additions already in the project) | Drag/resize/rotate/select mostly built-in, faster to build & less custom math | New dependency; canvas (not DOM) makes styling/theming slightly less direct |

**My recommendation: Option A (plain SVG)** — the object count per map is small (a dozen
shapes, not hundreds), so performance isn't a concern, and it avoids adding another
library for what's described as a "simple" editor. Flattening to PNG on save is also
simpler from SVG (serialize → draw into a `<canvas>` → `toDataURL()`) than from a canvas
library. Happy to switch to Option B if you'd rather move faster and don't mind the
dependency — see Q3.

**New files (assuming Option A):**
- `src/types/campaign.ts` — add `MapObject`, `DeploymentMapData`, `deploymentMapData` (see §3).
- `src/components/DeploymentMapEditor/DeploymentMapEditor.tsx` — main editor component
  (toolbar + SVG canvas + selected-object property panel).
- `src/components/DeploymentMapEditor/mapObjectDefaults.ts` — default colors/sizes per
  terrain kind / zone / objective.
- `src/components/DeploymentMapEditor/flattenToImage.ts` — serializes the SVG + background
  image to a PNG data URL for `deploymentMapImage`.
- `src/pages/Narrative/NarrativeEditor.tsx` — replace the current file-only "Deployment
  Map" `<details>` panel with a button that opens the new editor (in a modal or a
  dedicated route, e.g. `/narrative/:missionId/admin/map` — see Q4), keeping the plain
  image upload as a fallback/background option inside the editor too.

## 5. Known Limitations / Risks

- **Firestore 1 MiB document size limit** — a flattened PNG plus the structured object
  list both live on the same `NarrativeMission` document. A very large/high-res uploaded
  background image could approach this limit. Mitigation: downscale uploaded background
  images client-side (e.g. cap at ~1600px wide) before storing — I'll build this in by
  default rather than ask, unless you object.
- This is a **from-scratch mini vector editor** — expect a first version to cover the
  core tools listed in §2 (add/move/resize/rotate/recolor/label/delete/reorder) but not
  extras like grid-snapping, multi-select, undo/redo, or a terrain-piece image library
  unless you want those in scope now (see Q6).
- No server component — everything (including the flattening step) runs in the browser,
  consistent with the rest of the app.

## 6. Open Questions

*(Answer inline below whenever you're free — leave blank to accept my recommendation, marked with 👉)*

**Q1. Board size(s)?**
Fixed single size, a small preset list (e.g. 44"x30" / 60"x44" / 30"x22"), or fully custom
width/height inputs per mission?
👉 *Recommendation: a preset dropdown (covers the common 40k table sizes) plus a "Custom"
option that reveals width/height number inputs.*
Your answer:

**Q2. Terrain kinds & colors?**
Is the list in §3 (`forest, ruins, hill, water, building, crater, obstacle`) right for your
system(s), or do you want different/additional kinds? Any specific colors you want per kind?
👉 *Recommendation: use the list above with sensible defaults (green/grey/brown/blue/dark
grey/black/tan) — easy to tweak later since it's just a lookup table.*
Your answer:

**Q3. SVG (Option A) vs react-konva (Option B)?**
See §4 trade-off table.
👉 *Recommendation: Option A (plain SVG, no new dependency).*
Your answer:

**Q4. Where does the editor open — modal overlay on the mission editor page, or its own
route/page?**
👉 *Recommendation: its own route (`/narrative/:missionId/admin/map`) — simpler to give it
full screen space for a canvas tool, and it's consistent with how other multi-step flows
in this app (e.g. Roster Wizard) already use dedicated routes.*
Your answer:

**Q5. Do deployment zones need to snap/align to board edges, or is freeform
placement/resizing fine for a first version?**
👉 *Recommendation: freeform for v1 — snapping adds meaningful complexity and isn't
essential to get useful maps out quickly.*
Your answer:

**Q6. Anything from the "not in v1" list in §5 (grid-snapping, multi-select, undo/redo, a
terrain icon/image library instead of plain colored shapes) you actually want included
from the start?**
👉 *Recommendation: ship without these first, add based on real usage.*
Your answer:

**Q7. Should players (non-admins) ever see/use this editor, or is it admin-only (like the
rest of the Narrative admin area today)?**
👉 *Recommendation: admin-only, matching the existing (currently ungated —
see `CAMPAIGN-MODE-PLAN.md` decision 9) Narrative admin area.*
Your answer:

## 7. Suggested Implementation Phases

1. **Data model** — add the new types + `deploymentMapData` field (§3); no UI yet.
2. **Read-only canvas renderer** — render a `DeploymentMapData` as static SVG (background +
   objects), reusable by both the editor and (optionally) a richer view than a flat PNG
   later.
3. **Editor interactions** — add tool, select tool, drag-to-move, resize handles, rotate
   handle, delete, property panel (color/label/terrain kind), layer reorder.
4. **Flatten-to-PNG on save** — wire into `NarrativeEditor.tsx`'s save flow, replacing the
   current plain `<input type="file">` panel with "Open Map Editor" (keeping image upload
   available inside the editor as the background layer).
5. **Polish pass** — board size presets, terrain color legend, minor UX cleanup.

Once you've filled in section 6 (or confirmed the recommendations are fine), I'll start
on phase 1.
