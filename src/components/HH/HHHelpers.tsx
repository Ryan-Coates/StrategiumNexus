import type { SelectionEntry, Profile, RuleEntry, CategoryEntry } from '../../types'

// ── Profile type identifiers in HH 3rd edition ────────────────────────────────

const HH_UNIT_PROFILE_TYPE = 'Profile'
const HH_RANGED_TYPE = 'Ranged Weapon'
const HH_MELEE_TYPE = 'Melee Weapon'
const HH_REACTION_TYPE = 'Reaction'
const HH_GAMBIT_PREFIX = 'Gambit'

// ── Stat column groups ─────────────────────────────────────────────────────────

/** Combat stats displayed in the first row of the stat block */
export const HH_COMBAT_COLS = ['M', 'WS', 'BS', 'S', 'T', 'W', 'I', 'A']
/** Leadership/will stats in the second row */
export const HH_LEADER_COLS = ['LD', 'CL', 'WP', 'IN']
/** Save stats in the third row */
export const HH_SAVE_COLS = ['SAV', 'INV']
/** Ranged weapon profile columns */
export const HH_RANGED_COLS = ['R', 'FP', 'RS', 'AP', 'D', 'Special Rules', 'Traits']
/** Melee weapon profile columns */
export const HH_MELEE_COLS = ['IM', 'AM', 'SM', 'AP', 'D', 'Special Rules', 'Traits']

// ── Public interfaces ──────────────────────────────────────────────────────────

export interface HHDatasheet {
  entry: SelectionEntry
  unitProfiles: Profile[]    // typeName="Profile"
  rangedWeapons: Profile[]   // typeName="Ranged Weapon"
  meleeWeapons: Profile[]    // typeName="Melee Weapon"
  abilities: RuleEntry[]     // rules + unrecognised profile types
  categories: string[]       // resolved category names (keywords)
  unitType: string           // extracted from Profile's "Type" characteristic
}

export interface HHReaction {
  name: string
  summary: string
  trigger: string
  cost: string
  target: string
  process: string
}

export interface HHGambit {
  name: string
  typeName: string
  summary: string
  description: string
}

// ── Text helpers ───────────────────────────────────────────────────────────────

export function stripBsMarkup(text: string): string {
  return text.replace(/\^\^/g, '').replace(/\*\*/g, '')
}

// ── Profile tree traversal ────────────────────────────────────────────────────

function collectAllProfiles(entry: SelectionEntry): Profile[] {
  const out: Profile[] = [...entry.profiles]
  for (const child of entry.children) out.push(...collectAllProfiles(child))
  for (const group of entry.groups)
    for (const ge of group.entries) out.push(...collectAllProfiles(ge))
  return out
}

function collectAllRules(entry: SelectionEntry): RuleEntry[] {
  const out: RuleEntry[] = [...entry.rules]
  for (const child of entry.children) out.push(...collectAllRules(child))
  return out
}

// ── Category name map ─────────────────────────────────────────────────────────

/**
 * Build a categoryId → name map. System-level categories (from the .gst) can be
 * provided as a second argument; catalogue-level entries override them.
 */
export function buildCatNamesMap(
  catalogueCats: CategoryEntry[],
  systemCats: CategoryEntry[] = [],
): Map<string, string> {
  const map = new Map<string, string>()
  for (const c of systemCats) map.set(c.id, c.name)
  for (const c of catalogueCats) map.set(c.id, c.name)
  return map
}

/** Extract the base group label from a Type characteristic string.
 *  "Infantry (Character)" → "Infantry", "Vehicle (Walker)" → "Vehicle"
 */
export function unitTypeGroup(unitType: string): string {
  if (!unitType) return ''
  const match = unitType.match(/^([^(]+)/)
  return match ? match[1].trim() : unitType
}

// ── Datasheet builder ─────────────────────────────────────────────────────────

export function buildHHDatasheet(
  entry: SelectionEntry,
  catNames: Map<string, string>,
): HHDatasheet {
  // Collect and deduplicate all profiles from the entry tree
  const allProfilesRaw = collectAllProfiles(entry)
  const seenProfiles = new Set<string>()
  const allProfiles = allProfilesRaw.filter((p) => {
    const key = `${p.typeName}\0${p.name}`
    if (seenProfiles.has(key)) return false
    seenProfiles.add(key)
    return true
  })

  // Collect and deduplicate all rules
  const allRulesRaw = collectAllRules(entry)
  const seenRules = new Set<string>()
  const allRules = allRulesRaw.filter((r) => {
    if (seenRules.has(r.name)) return false
    seenRules.add(r.name)
    return true
  })

  const unitProfiles = allProfiles.filter((p) => p.typeName === HH_UNIT_PROFILE_TYPE)
  const rangedWeapons = allProfiles.filter((p) => p.typeName === HH_RANGED_TYPE)
  const meleeWeapons = allProfiles.filter((p) => p.typeName === HH_MELEE_TYPE)

  const isKnownType = (p: Profile) =>
    p.typeName === HH_UNIT_PROFILE_TYPE ||
    p.typeName === HH_RANGED_TYPE ||
    p.typeName === HH_MELEE_TYPE ||
    p.typeName.startsWith(HH_GAMBIT_PREFIX) ||
    p.typeName === HH_REACTION_TYPE

  // Unknown profile types → render as ability rule cards
  const abilityProfileRules: RuleEntry[] = allProfiles
    .filter((p) => !isKnownType(p))
    .map((p) => ({
      id: p.id,
      name: p.name || p.typeName,
      description: stripBsMarkup(
        p.characteristics['Description'] ??
          p.characteristics['Effect'] ??
          Object.values(p.characteristics)[0] ??
          '',
      ),
    }))

  const categories: string[] = []
  for (const catId of entry.categoryIds) {
    const name = catNames.get(catId)
    if (name) categories.push(name)
  }

  // Extract Type from first unit profile (e.g. "Infantry", "Infantry (Character)")
  const unitType = unitProfiles[0]?.characteristics['Type'] ?? ''

  return {
    entry,
    unitProfiles,
    rangedWeapons,
    meleeWeapons,
    abilities: [
      ...allRules.map((r) => ({ ...r, description: stripBsMarkup(r.description) })),
      ...abilityProfileRules,
    ],
    categories,
    unitType,
  }
}

// ── Army-level extractors ─────────────────────────────────────────────────────

/** Scan all entries for Reaction profiles and return them deduplicated. */
export function extractReactions(entries: SelectionEntry[]): HHReaction[] {
  const out: HHReaction[] = []
  const seen = new Set<string>()
  for (const entry of entries) {
    for (const p of collectAllProfiles(entry)) {
      if (p.typeName !== HH_REACTION_TYPE) continue
      const key = p.name || entry.name
      if (seen.has(key)) continue
      seen.add(key)
      out.push({
        name: p.name || entry.name,
        summary: p.characteristics['Summary'] ?? '',
        trigger: p.characteristics['Trigger'] ?? '',
        cost: p.characteristics['Cost'] ?? '',
        target: p.characteristics['Target'] ?? '',
        process: p.characteristics['Process'] ?? '',
      })
    }
  }
  return out
}

/** Scan all entries for Gambit profiles and return them deduplicated. */
export function extractGambits(entries: SelectionEntry[]): HHGambit[] {
  const out: HHGambit[] = []
  const seen = new Set<string>()
  for (const entry of entries) {
    for (const p of collectAllProfiles(entry)) {
      if (!p.typeName.startsWith(HH_GAMBIT_PREFIX)) continue
      const key = p.name || entry.name
      if (seen.has(key)) continue
      seen.add(key)
      out.push({
        name: p.name || entry.name,
        typeName: p.typeName,
        summary: p.characteristics['Summary'] ?? '',
        description: stripBsMarkup(p.characteristics['Description'] ?? ''),
      })
    }
  }
  return out
}
