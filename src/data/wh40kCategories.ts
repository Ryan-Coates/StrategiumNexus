/**
 * Warhammer 40,000 10th Edition — hardcoded category groupings.
 * Source: Warhammer 40000.gst revision 110 (BSData/wh40k-10e)
 *
 * These category IDs come from the game system file (not catalogue files),
 * so they are stable across all faction catalogues.
 */

export const WH40K_SYSTEM_ID = 'sys-352e-adc2-7639-d6a9'

export interface UnitCategoryGroup {
  label: string
  icon: string  // simple Unicode char; '•' = no icon
  order: number
}

export const OTHER_GROUP: UnitCategoryGroup = { label: 'Other', icon: '•', order: 99 }

// BSData category ID → display group
const ID_TO_GROUP: Record<string, UnitCategoryGroup> = {
  // ── Characters ────────────────────────────────────────────────────────────
  '9cfd-1c32-585f-7d5c': { label: 'Characters',    icon: '⚜', order: 0 }, // Character
  '4f3a-f0f7-6647-348d': { label: 'Characters',    icon: '⚜', order: 0 }, // Epic Hero
  '2d7f-1892-2fd0-e29c': { label: 'Characters',    icon: '⚜', order: 0 }, // Captain (always paired with Character)

  // ── Battleline ────────────────────────────────────────────────────────────
  'e338-111e-d0c6-b687': { label: 'Battleline',    icon: '⚔', order: 1 }, // Battleline

  // ── Infantry ──────────────────────────────────────────────────────────────
  'cf47-a0d7-7207-29dc': { label: 'Infantry',      icon: '⚔', order: 2 }, // Infantry

  // ── Mounted ───────────────────────────────────────────────────────────────
  '14a0-40c9-2748-ae6e': { label: 'Mounted',       icon: '⚔', order: 3 }, // Mounted

  // ── Monsters ──────────────────────────────────────────────────────────────
  '9693-cf84-fe69-37a9': { label: 'Monsters',      icon: '☠', order: 4 }, // Monster

  // ── Beasts ────────────────────────────────────────────────────────────────
  '4c3e-9310-a516-3590': { label: 'Beasts',        icon: '☠', order: 5 }, // Beast

  // ── Walkers ───────────────────────────────────────────────────────────────
  '6dda-e157-334d-e93a': { label: 'Walkers',       icon: '⚙', order: 6 }, // Walker

  // ── Vehicles ──────────────────────────────────────────────────────────────
  'dbd4-63-af05-998':    { label: 'Vehicles',      icon: '⚙', order: 7 }, // Vehicle

  // ── Transports ────────────────────────────────────────────────────────────
  'ba07-411c-2832-1f79': { label: 'Transports',    icon: '⚙', order: 8 }, // Dedicated Transport
  '75e8-57c4-40e3-1817': { label: 'Transports',    icon: '⚙', order: 8 }, // Transport

  // ── Aircraft ──────────────────────────────────────────────────────────────
  '63f1-e6e8-f6f6-a4f0': { label: 'Aircraft',     icon: '⚙', order: 9 }, // Aircraft

  // ── Titanic ───────────────────────────────────────────────────────────────
  '5929-ad51-d006-e008': { label: 'Titanic',       icon: '☠', order: 10 }, // Titanic

  // ── Fortifications ────────────────────────────────────────────────────────
  '19d7-9c74-2140-5851': { label: 'Fortifications',icon: '⬡', order: 11 }, // Fortification
}

/**
 * Priority order for when a unit matches multiple groups (most specific wins).
 * e.g. a Character+Infantry goes into Characters, not Infantry.
 */
const PRIORITY: string[] = [
  'Characters',
  'Battleline',
  'Transports',   // Dedicated Transport is more specific than Vehicle
  'Walkers',      // Walker is more specific than Vehicle
  'Aircraft',
  'Titanic',
  'Vehicles',
  'Monsters',
  'Mounted',
  'Beasts',
  'Infantry',
  'Fortifications',
]

/** Get the display group for a unit in any 40k catalogue. */
export function getWh40kCategory(categoryIds: string[]): UnitCategoryGroup {
  const matched = new Set<string>()
  for (const id of categoryIds) {
    const g = ID_TO_GROUP[id]
    if (g) matched.add(g.label)
  }
  for (const label of PRIORITY) {
    if (matched.has(label)) {
      return Object.values(ID_TO_GROUP).find((g) => g.label === label)!
    }
  }
  return OTHER_GROUP
}

import type { CategoryEntry } from '../types'

/**
 * System-aware categorize function. Use in roster builder / review components.
 * Falls back to catalogue-name lookup for non-40k systems.
 */
export function getCategoryForSystem(
  categoryIds: string[],
  primaryCategoryId: string,
  systemId: string,
  catNames: Map<string, string>,
): UnitCategoryGroup {
  if (systemId === WH40K_SYSTEM_ID) {
    return getWh40kCategory(categoryIds)
  }
  const name = catNames.get(primaryCategoryId) ?? 'Other'
  return { label: name, icon: '•', order: 0 }
}

/** Build the catNames map from a catalogue's categoryEntries array. */
export function buildCatNamesMap(categoryEntries: CategoryEntry[]): Map<string, string> {
  return new Map(categoryEntries.map((c) => [c.id, c.name]))
}
