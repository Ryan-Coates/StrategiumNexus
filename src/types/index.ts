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
  /** True when this is a BSData library file (library="true" in XML) */
  isLibrary?: boolean
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

export interface CostBracket {
  minModels: number   // applies when total model count >= this value
  pts: number
}

export interface SelectionEntryGroup {
  id: string
  name: string
  minSelections: number   // 0 = optional
  maxSelections: number   // -1 = unlimited
  defaultEntryId: string  // defaultSelectionEntryId from BSData
  entries: SelectionEntry[]
}

export interface SelectionEntry {
  id: string
  name: string
  type: string
  categoryIds: string[]         // targetIds from categoryLinks
  primaryCategoryId: string     // first category with primary="true", else first
  profiles: Profile[]
  rules: RuleEntry[]
  costs: Cost[]
  minCount: number              // from constraints min (for model-type children)
  maxCount: number              // from constraints max (-1 = unlimited)
  costBrackets: CostBracket[]   // tiered pts costs based on model count
  linkedEquipment: string[]     // fixed loadout from top-level entryLinks (display only)
  notes: string[]               // restriction notes from modifier[field="error"]
  groups: SelectionEntryGroup[] // wargear option groups (pick-one / pick-any)
  children: SelectionEntry[]    // direct child entries not in a group
}

// ── Roster types (Phase 2) ────────────────────────────────────────────────────

export interface RosterSelection {
  entryId: string   // BSData selectionEntry id of the chosen option
  count: number
}

export interface ModelConfig {
  id: string                   // local stable uuid per model instance
  childEntryId: string         // which model sub-entry (empty = base unit)
  selections: RosterSelection[] // per-model weapon / upgrade choices
}

export interface RosterUnit {
  uid: string                  // local stable uuid
  catalogueEntryId: string     // BSData selectionEntry id
  catalogueName: string        // original catalogue name (fallback display)
  customName: string           // player's custom name (empty = use catalogueName)
  notes: string
  selections: RosterSelection[] // unit-level selections (legacy / shared)
  enhancementId: string
  models: ModelConfig[]        // one entry per model in the squad
  detachmentId?: string        // HH only — which detachment this unit belongs to
}

// ── Horus Heresy detachment types ────────────────────────────────────────────

export type HHDetachmentType = 'primary' | 'auxiliary' | 'apex'

export type HHAuxiliarySubtype =
  | 'armoured-fist'
  | 'tactical-support'
  | 'armoured-support'
  | 'heavy-support'
  | 'combat-pioneer'
  | 'shock-assault'
  | 'first-strike'

export type HHApexSubtype =
  | 'combat-retinue'
  | 'officer-cadre'
  | 'army-vanguard'

export interface HHDetachment {
  id: string
  type: HHDetachmentType
  subtype?: HHAuxiliarySubtype | HHApexSubtype
  name: string
}

export interface Roster {
  id: string
  name: string
  systemId: string
  systemName: string
  catalogueId: string
  catalogueName: string
  detachment: string
  pointsLimit: number
  notes: string
  createdAt: number
  updatedAt: number
  units: RosterUnit[]
  warlordUid: string              // uid of the designated Warlord unit ('' if none)
  // Allied detachment (optional second faction)
  alliedCatalogueId: string
  alliedCatalogueName: string
  alliedUnits: RosterUnit[]
  // HH only — list of detachments (primary is always index 0)
  hhDetachments?: HHDetachment[]
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
  categoryEntries: CategoryEntry[]          // categories defined in this catalogue
  /** Catalogues this one links to (for library delegation) */
  catalogueLinks: { id: string; importRootEntries: boolean }[]
  /** targetIds from entryLinks – which linked entries belong to this sub-faction */
  entryLinkTargetIds: string[]
  /** IDs of entries that are Rites of War (from sharedSelectionEntryGroups named "Rite of War") */
  riteOfWarIds: string[]
}
