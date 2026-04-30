// Shared TypeScript types across Phase 1–3

// ── BSData index ──────────────────────────────────────────────────────────────

export interface BsDataSystemEntry {
  id: string
  name: string
  description: string
  repoSlug: string      // e.g. "wh40k"
  gstUrl: string        // raw URL to the .gst file
  catalogueIndexUrl: string  // raw URL to a JSON index of .cat files
}

export interface BsDataCatalogueEntry {
  id: string
  gameSystemId: string
  name: string
  catUrl: string        // raw URL to the .cat file
}

// ── Parsed game data ──────────────────────────────────────────────────────────

export interface GameSystemMeta {
  id: string
  name: string
  revision: string
  battleScribeVersion: string
  fetchedAt: number
}

export interface CatalogueMeta {
  id: string
  gameSystemId: string
  name: string
  revision: string
  fetchedAt: number
}

// ── Rules content (parsed from XML) ──────────────────────────────────────────

export interface RuleEntry {
  id: string
  name: string
  description: string
}

export interface Profile {
  id: string
  name: string
  typeName: string
  characteristics: Record<string, string>
}

export interface SelectionEntry {
  id: string
  name: string
  type: string
  profiles: Profile[]
  rules: RuleEntry[]
  children: SelectionEntry[]
}

export interface ParsedCatalogue {
  meta: CatalogueMeta
  rules: RuleEntry[]
  entries: SelectionEntry[]
}
