// Shared TypeScript types across Phase 1–3

// ── Stored metadata ───────────────────────────────────────────────────────────

export interface GameSystemMeta {
  id: string
  name: string
  revision: string
  battleScribeVersion: string
  slug: string      // matches BsDataSystemManifest.slug
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

export interface Cost {
  name: string
  value: number
}

export interface SelectionEntry {
  id: string
  name: string
  type: string
  profiles: Profile[]
  rules: RuleEntry[]
  costs: Cost[]
  children: SelectionEntry[]
}

export interface ProfileType {
  id: string
  name: string
  characteristicTypes: { id: string; name: string }[]
}

export interface CategoryEntry {
  id: string
  name: string
}

export interface ParsedGameSystem {
  id: string
  name: string
  revision: string
  battleScribeVersion: string
  rules: RuleEntry[]
  profileTypes: ProfileType[]
  categoryEntries: CategoryEntry[]
}

export interface ParsedCatalogue {
  meta: CatalogueMeta
  rules: RuleEntry[]
  entries: SelectionEntry[]
}
