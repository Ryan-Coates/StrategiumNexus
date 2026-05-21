/**
 * Horus Heresy 3rd Edition — force-organisation category definitions.
 *
 * Category IDs are from the HH GST and catalogue entryLink/categoryLink analysis.
 * Confirmed from: Death Guard.cat, Knights-Errant.cat, Mechanicum.cat.
 *
 * Army-building rules source:
 *   https://www.warhammer-community.com/en-gb/articles/itpl4ywx/rules-in-the-age-of-darkness-how-to-build-an-army-in-the-new-edition/
 */

export const HH_SYSTEM_ID = 'sys-9fe4-1dc3-b7c2-73cf'

// Kept for backward compatibility with wh40kCategories.ts
export interface UnitCategoryGroup {
  label: string
  icon: string
  order: number
}

export const OTHER_GROUP: UnitCategoryGroup = { label: 'Other', icon: '•', order: 99 }

// ── Force Organisation Slot ──────────────────────────────────────────────────

export interface HHForceOrgSlot {
  /** BSData category targetId */
  categoryId: string
  label: string
  icon: string
  order: number
  /** 0 = optional */
  min: number
  /** -1 = unlimited */
  max: number
}

/**
 * All confirmed HH 3rd Edition force-org category IDs, keyed by categoryId.
 * Used for display names/icons and unit-browser filtering.
 */
export const HH_FORCE_ORG_SLOTS: Record<string, HHForceOrgSlot> = {
  // ── Command ──────────────────────────────────────────────────────────────
  '22ee-7208-4089-b005': { categoryId: '22ee-7208-4089-b005', label: 'Warlord',              icon: '★', order: 0,  min: 0, max: -1 },
  'd9a6-9b5f-b18a-4d63': { categoryId: 'd9a6-9b5f-b18a-4d63', label: 'High Command',         icon: '⚜', order: 1,  min: 0, max: -1 },
  '6dbf-654a-f06f-2d69': { categoryId: '6dbf-654a-f06f-2d69', label: 'Command',              icon: '⚜', order: 2,  min: 0, max: -1 },
  'e3cd-7a38-34d7-9cbf': { categoryId: 'e3cd-7a38-34d7-9cbf', label: 'Master of the Legion', icon: '⚜', order: 3,  min: 0, max: -1 },

  // ── Core Slots ────────────────────────────────────────────────────────────
  '88e6-d373-4152-0dd8': { categoryId: '88e6-d373-4152-0dd8', label: 'Troops',               icon: '⚔', order: 4,  min: 0, max: -1 },
  'a38e-50ff-310f-f19e': { categoryId: 'a38e-50ff-310f-f19e', label: 'Retinue',              icon: '⚔', order: 5,  min: 0, max: -1 },

  // ── Elite / Heavy ─────────────────────────────────────────────────────────
  '5d5e-958f-e388-50b5': { categoryId: '5d5e-958f-e388-50b5', label: 'Elites',               icon: '⚔', order: 6,  min: 0, max: -1 },
  '3235-bd79-e9b1-60fa': { categoryId: '3235-bd79-e9b1-60fa', label: 'Heavy Assault',        icon: '⚙', order: 7,  min: 0, max: -1 },

  // ── Support / Mobile ─────────────────────────────────────────────────────
  '345f-9ba6-9b02-ed5c': { categoryId: '345f-9ba6-9b02-ed5c', label: 'Support',              icon: '⚙', order: 8,  min: 0, max: -1 },
  'cf96-8891-3f9a-8921': { categoryId: 'cf96-8891-3f9a-8921', label: 'Fast Attack',          icon: '⚡', order: 9,  min: 0, max: -1 },
  '2b65-a3f2-620a-dc58': { categoryId: '2b65-a3f2-620a-dc58', label: 'Recon',                icon: '⚡', order: 10, min: 0, max: -1 },

  // ── Armour / Engines ─────────────────────────────────────────────────────
  '643a-1012-bd51-6537': { categoryId: '643a-1012-bd51-6537', label: 'Armour',               icon: '⚙', order: 11, min: 0, max: -1 },
  '2499-7239-685f-8465': { categoryId: '2499-7239-685f-8465', label: 'War-engine',           icon: '⚙', order: 12, min: 0, max: -1 },

  // ── Transports ───────────────────────────────────────────────────────────
  'd162-4711-5d60-0a48': { categoryId: 'd162-4711-5d60-0a48', label: 'Transport',            icon: '⚙', order: 13, min: 0, max: -1 },
  '52d0-8b78-439e-18e5': { categoryId: '52d0-8b78-439e-18e5', label: 'Heavy Transport',      icon: '⚙', order: 14, min: 0, max: -1 },

  // ── Lord of War ───────────────────────────────────────────────────────────
  'a46f-a465-0ead-d6b8': { categoryId: 'a46f-a465-0ead-d6b8', label: 'Lord of War',          icon: '★', order: 15, min: 0, max: -1 },
}

export const OTHER_SLOT: HHForceOrgSlot = {
  categoryId: '__other__',
  label: 'Other',
  icon: '•',
  order: 99,
  min: 0,
  max: -1,
}

// ── Crusade Primary Detachment — static FOC ──────────────────────────────────
// Source: official HH 3rd Edition army-building rules (see file header URL).
// All mins are 0 (no compulsory slots). Maxes are per the published FOC.

export const CRUSADE_PRIMARY_SLOTS: HHForceOrgSlot[] = [
  { categoryId: 'd9a6-9b5f-b18a-4d63', label: 'High Command', icon: '⚜', order: 0, min: 0, max: 1 },
  { categoryId: '6dbf-654a-f06f-2d69', label: 'Command',      icon: '⚜', order: 1, min: 0, max: 3 },
  { categoryId: '88e6-d373-4152-0dd8', label: 'Troops',       icon: '⚔', order: 2, min: 0, max: 4 },
  { categoryId: 'd162-4711-5d60-0a48', label: 'Transport',    icon: '⚙', order: 3, min: 0, max: 4 },
]

// ── Auxiliary Detachment Types ────────────────────────────────────────────────

export interface HHAuxiliaryType {
  id: string
  name: string
  slots: Array<{ categoryId: string; label: string; icon: string; max: number }>
}

export const HH_AUXILIARY_TYPES: HHAuxiliaryType[] = [
  {
    id: 'armoured-fist',
    name: 'Armoured Fist',
    slots: [
      { categoryId: '52d0-8b78-439e-18e5', label: 'Heavy Transport', icon: '⚙', max: -1 },
      { categoryId: 'd162-4711-5d60-0a48', label: 'Transport',       icon: '⚙', max: -1 },
    ],
  },
  {
    id: 'tactical-support',
    name: 'Tactical Support',
    slots: [
      { categoryId: '88e6-d373-4152-0dd8', label: 'Troops',   icon: '⚔', max: -1 },
      { categoryId: '345f-9ba6-9b02-ed5c', label: 'Support',  icon: '⚙', max: -1 },
    ],
  },
  {
    id: 'armoured-support',
    name: 'Armoured Support',
    slots: [{ categoryId: '643a-1012-bd51-6537', label: 'Armour',       icon: '⚙', max: -1 }],
  },
  {
    id: 'heavy-support',
    name: 'Heavy Support',
    slots: [{ categoryId: '2499-7239-685f-8465', label: 'War-engine',   icon: '⚙', max: -1 }],
  },
  {
    id: 'combat-pioneer',
    name: 'Combat Pioneer',
    slots: [{ categoryId: '2b65-a3f2-620a-dc58', label: 'Recon',        icon: '⚡', max: -1 }],
  },
  {
    id: 'shock-assault',
    name: 'Shock Assault',
    slots: [{ categoryId: '3235-bd79-e9b1-60fa', label: 'Heavy Assault', icon: '⚙', max: -1 }],
  },
  {
    id: 'first-strike',
    name: 'First Strike',
    slots: [{ categoryId: 'cf96-8891-3f9a-8921', label: 'Fast Attack',  icon: '⚡', max: -1 }],
  },
]

// ── Apex Detachment Types ─────────────────────────────────────────────────────

export interface HHApexType {
  id: string
  name: string
  slots: Array<{ categoryId: string; label: string; icon: string; max: number }>
}

export const HH_APEX_TYPES: HHApexType[] = [
  {
    id: 'combat-retinue',
    name: 'Combat Retinue',
    slots: [{ categoryId: 'a38e-50ff-310f-f19e', label: 'Retinue',  icon: '⚔', max: -1 }],
  },
  {
    id: 'officer-cadre',
    name: 'Officer Cadre',
    slots: [{ categoryId: '6dbf-654a-f06f-2d69', label: 'Command',  icon: '⚜', max: -1 }],
  },
  {
    id: 'army-vanguard',
    name: 'Army Vanguard',
    slots: [{ categoryId: '5d5e-958f-e388-50b5', label: 'Elites',   icon: '⚔', max: -1 }],
  },
]

/**
 * Category IDs that are NOT force-org roles — model types, traits, army config.
 * Units whose primaryCategoryId is in this set are excluded from the force-org builder.
 */
export const HH_NON_FORCE_ORG_IDS = new Set([
  'abfa-86ab-1726-077a',  // Army Configuration (Rite of War)
  '594d-fa82-13cb-a345',  // Infantry Model Type
  '8045-89a4-76d4-fcef',  // Sergeant Model Sub-Type
  'b980-187b-2b17-d635',  // Unique Model Sub-Type
  '1e7d-9066-28d2-97a0',  // Heavy Model Sub-Type
  '9871-cb62-5283-2216',  // Command Model Sub-type
  '5833-5e86-26bc-0916',  // Automata Model Type
  'aa5a-c9fd-1eb1-7a45',  // Vehicle Model Type
  '38d4-d720-8009-acd3',  // Walker Model Type
  '5a95-e564-96b2-8dc9',  // Champion Model Sub-Type
  '7799-e1d6-762b-700b',  // Paragon Model Type
  'c504-9dfa-35d3-c98f',  // Antigrav Model Sub-Type
  '2e6d-36f6-eeca-8e0c',  // Transport Model Sub-Type
  'a5c6-b359-cecb-e0b1',  // Rapid Sub-Type
  'af7d-af64-6b7d-da9d',  // Specialist Model Sub-Type
  '5555-f37e-8ad0-20c0',  // Unstoppable Sub-Type
  'f7f7-cdd5-a9fd-aa7a',  // Ordinatus Sub-Type
  '3420-1652-ccd9-aa8e',  // Warlord or Lord of War (sub-tag)
  '3252-003d-1181-0f99',  // Archimandrite (Mech trait)
  'df10-4634-c1aa-f6e0',  // Cybernetica (Mech trait)
  '1ec3-1433-658a-f04e',  // Macrotek (Mech trait)
  '8268-aa48-f4dc-0506',  // Lacrymaerta (Mech trait)
  'eba5-3e47-aa06-65fe',  // Malagra (Mech trait)
  '9e7d-913d-86f0-e05e',  // Myrmidax (Mech trait)
  'e76a-e22d-9fc4-dc1f',  // Reductor (Mech trait)
  '9892-3b91-8a3b-51e8',  // Archmagos is Archimandrite
  'a660-a2a5-eef3-2fbc',  // Heterodox (Mech trait)
  '2de1-ddd6-ebb4-10df',  // Malefic Sub-type
  '901a-6b71-7a29-4597',  // Officer of the Line
])

/**
 * Return the force-org slot definition for a given category ID.
 * Returns OTHER_SLOT for unknown/non-force-org categories.
 */
export function getHHSlot(categoryId: string): HHForceOrgSlot {
  return HH_FORCE_ORG_SLOTS[categoryId] ?? OTHER_SLOT
}

/**
 * Return the display group for an HH unit given its category IDs.
 * Used by the generic viewer / wh40kCategories.getCategoryForSystem().
 */
export function getHHCategory(categoryIds: string[]): UnitCategoryGroup {
  for (const id of categoryIds) {
    const slot = HH_FORCE_ORG_SLOTS[id]
    if (slot) return { label: slot.label, icon: slot.icon, order: slot.order }
  }
  return OTHER_GROUP
}

