# Horus Heresy 3rd Edition — Army Builder Plan

*Source: [Warhammer Community — Rules in the Age of Darkness: How to build an army in the new edition](https://www.warhammer-community.com/en-gb/articles/itpl4ywx/rules-in-the-age-of-darkness-how-to-build-an-army-in-the-new-edition/)*

---

## How HH Army Building Works

An HH army is built from **Detachments**. Each detachment is an independent formation with its own fixed Force Organisation Chart (FOC). Detachments do not share slots.

There are **no compulsory units** — all slot minimums are 0. You build the army you want within the available slots.

---

## Crusade Primary Detachment

Every army has exactly **one** Primary Detachment. The Rite of War attaches here. The Crusade FOC (used by almost every faction) has four slot types:

| Slot | Max | Category ID | Notes |
|---|---|---|---|
| High Command | 1 | `d9a6-9b5f-b18a-4d63` | Unlocks 1 Apex **or** 1 extra Auxiliary Detachment |
| Command | 3 | `6dbf-654a-f06f-2d69` | Each filled slot unlocks 1 Auxiliary Detachment (or 2 if unit is a Centurion) |
| Troops | 4 | `88e6-d373-4152-0dd8` | Core infantry |
| Transport | 4 | `d162-4711-5d60-0a48` | Light transports only. No dedicated transports — every transport needs its own slot. |

All slots have **min 0**. Some slots are marked as **Prime Slots** (special border in the FOC). Filling a Prime Slot earns a **Prime Advantage** for that unit.

> **Warlord tag** (`22ee-7208-4089-b005`) and **Master of the Legion** (`e3cd-7a38-34d7-9cbf`) are upgrade tags applied to High Command / Command units — they are **not** separate FOC slots.

---

## Auxiliary Detachments

Each filled Command slot unlocks **1 Auxiliary Detachment** (or 2 if the unit is a non-Consul Centurion). The filled High Command slot can also unlock 1 extra Auxiliary or instead unlock 1 Apex Detachment.

An Auxiliary Detachment is a **typed** formation — you choose which type when you add it. Each type provides specific slots:

| Auxiliary Type | Slots provided | Category IDs |
|---|---|---|
| **Armoured Fist** | Heavy Transport + Transport | `52d0-8b78-439e-18e5`, `d162-4711-5d60-0a48` |
| **Tactical Support** | Troops + Support | `88e6-d373-4152-0dd8`, `345f-9ba6-9b02-ed5c` |
| **Armoured Support** | Armour | `643a-1012-bd51-6537` |
| **Heavy Support** | War-engine (Dreadnoughts etc.) | `2499-7239-685f-8465` |
| **Combat Pioneer** | Recon | `2b65-a3f2-620a-dc58` |
| **Shock Assault** | Heavy Assault (Terminators etc.) | `3235-bd79-e9b1-60fa` |
| **First Strike** | Fast Attack (aircraft, jetbikes, speeders) | `cf96-8891-3f9a-8921` |

You may take any Auxiliary type multiple times.

> Exact slot counts per Auxiliary type are in the GST. Initial implementation can show a single slot per Auxiliary (user adds units to it) with no hard maximum.

---

## Apex Detachments

The High Command slot (when filled) can unlock one **Apex Detachment** instead of an Auxiliary. Apex Detachments hold specialist formations:

| Apex Type | Slots provided | Category IDs |
|---|---|---|
| **Combat Retinue** | Retinue (command squads) | `a38e-50ff-310f-f19e` |
| **Officer Cadre** | Command slots (which themselves unlock more Auxiliary Detachments) | `6dbf-654a-f06f-2d69` |
| **Army Vanguard** | Elites (Veterans, Legion specialists) | `5d5e-958f-e388-50b5` |

Each faction/legion may also have its own unique Apex Detachments.

---

## Warlord Detachment (special)

At 3,000 pts, if your army includes a **Primarch**, you may add a Warlord Detachment. This provides:
- 1 Retinue slot
- 1 Heavy Transport slot

This does not consume any Command slots.

---

## Prime Slots & Prime Advantages

Certain slots in every detachment are marked as **Prime Slots**. When a unit fills a Prime Slot:
- You choose one **Prime Advantage** for that unit (e.g. enhance the Sergeant, improve characteristics)
- One available Prime Advantage is **Logistical Benefit**: add any one Battlefield Role slot to this detachment (with some exceptions — no Titans in bodyguard slots)

---

## Lord of War

Lord of War units (`a46f-a465-0ead-d6b8`) are not in the standard Crusade Primary Detachment. They likely belong in a specific Apex or a special detachment type. To be confirmed from the GST data.

---

## What the Army Builder Needs to Do

### Step 1 — Army Setup (existing: `ArmySetupStep`) ✅
### Step 2 — Legion & Rite of War (existing: `HHDetachmentStep`) ✅

### Step 3 — Build Detachments (`HHBuildStep` — NEEDS REWRITE)

**Current (wrong):** One flat panel with slots derived from the catalogue. No multiple detachments.

**Target:**

#### 3a. Primary Detachment panel
- Static FOC: High Command (0–1), Command (0–3), Troops (0–4), Transport (0–4)
- Rite of War displayed at top (read-only, set in Step 2)
- Each slot: unit count, "+ Add" button, inline unit browser filtered by category ID
- "Unlocked Auxiliary Detachments" counter shown (1 per filled Command slot)

#### 3b. Auxiliary Detachment panels (0 to N)
- "Add Auxiliary Detachment" button — opens a picker showing the 7 types
- Each panel shows its type name, its slots, and units added
- Panels can be removed (trashcan button)
- Total count of available slots checked against filled Command slots

#### 3c. Apex Detachment panel (0–1)
- "Add Apex Detachment" button (only enabled if High Command is filled)
- Shows 3 standard Apex types to choose from
- Single panel

#### 3d. Points tracking
- Running total across all detachments
- Per-detachment subtotals
- Over-limit highlight in red

### Step 4 — Configure Units ✅
### Step 5 — Review ✅
### Step 6 — Export ✅

---

## Data Model Changes Required

### Tag each `RosterUnit` with a `detachmentId`

Simplest backward-compatible change (40k rosters use flat `units[]` with no `detachmentId`):

```typescript
// src/types/index.ts
interface RosterUnit {
  // existing fields...
  detachmentId?: string    // HH only; undefined = primary detachment
}
```

### Add detachment list to `ActiveRoster`

```typescript
// src/types/index.ts
interface HHDetachment {
  id: string
  type: 'primary' | 'auxiliary' | 'apex' | 'warlord'
  subtype?: string        // e.g. 'armoured-fist', 'shock-assault', 'army-vanguard'
  name: string
}

interface ActiveRoster {
  // existing fields...
  hhDetachments?: HHDetachment[]   // HH only
}
```

Primary detachment is always `hhDetachments[0]` with `type: 'primary'`.

---

## Key Files to Change

| File | Change |
|---|---|
| `src/types/index.ts` | Add `HHDetachment`, add `hhDetachments?` to `ActiveRoster`, add `detachmentId?` to `RosterUnit` |
| `src/store/rosterStore.ts` | Add `addDetachment`, `removeDetachment` actions |
| `src/data/hhCategories.ts` | Replace current slot map with static `CRUSADE_PRIMARY_SLOTS` array (4 slots); add `HH_AUXILIARY_TYPES` and `HH_APEX_TYPES` maps |
| `src/components/Roster/steps/HH/HHBuildStep.tsx` | Full rewrite: primary panel (static FOC) + add-auxiliary UI + apex panel |

---

## Open Questions

1. **Exact Auxiliary slot counts** — How many slots per Auxiliary type? (e.g. does Shock Assault give 1 or 2 Heavy Assault slots?) Needs GST or rulebook confirmation.
   - Recommended for now: 1 slot per Auxiliary, no hard maximum.

2. **Rite of War FOC modifications** — Some Rites change which Primary slots are available or add restrictions.
   - Recommended: show the Rite name as a note, no mechanical enforcement yet.

3. **Lord of War placement** — Which detachment type takes Lord of War units?
   - Likely a specific Apex or its own detachment. Needs verification.
