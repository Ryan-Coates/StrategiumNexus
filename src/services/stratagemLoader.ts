// Loads stratagem JSON files from src/data/stratagems/ at build time.
// Add a JSON file per faction following the _schema.json structure.
// Files are loaded via Vite's import.meta.glob — they are bundled locally
// but the actual stratagem data files should not be committed (add to .gitignore
// if the repo is public) since the content comes from GW-owned sources.

export interface StratagemEntry {
  name: string
  cp: number
  detachment: string   // detachment name or "Any"
  phase: string
  when: string
  target: string
  effect: string
  restrictions: string
}

export interface FactionStratagems {
  faction: string
  catalogueSlug: string
  stratagems: StratagemEntry[]
}

// Eagerly import all JSON files in src/data/stratagems/ except _schema.json
const modules = import.meta.glob('../data/stratagems/[^_]*.json', { eager: true }) as Record<
  string,
  FactionStratagems
>

// Build a lookup: catalogueSlug → stratagems (normalised to lowercase for matching)
const bySlug = new Map<string, StratagemEntry[]>()

for (const mod of Object.values(modules)) {
  if (mod.catalogueSlug && Array.isArray(mod.stratagems)) {
    bySlug.set(mod.catalogueSlug.toLowerCase(), mod.stratagems)
  }
}

/**
 * Returns stratagems for a catalogue by its name (partial match, case-insensitive).
 * e.g. getStratagemsForCatalogue("Chaos - Death Guard") returns Death Guard stratagems.
 */
export function getStratagemsForCatalogue(catalogueName: string): StratagemEntry[] {
  const lower = catalogueName.toLowerCase()
  for (const [slug, strats] of bySlug) {
    if (lower.includes(slug) || slug.includes(lower)) return strats
  }
  return []
}

/**
 * Returns all loaded faction data (for debug / future use).
 */
export function getAllFactionStratagems(): FactionStratagems[] {
  return Object.values(modules).filter(
    (m) => m.catalogueSlug && Array.isArray(m.stratagems),
  )
}
