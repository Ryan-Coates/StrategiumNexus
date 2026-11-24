export interface Wh40k11eFaction {
  id: string
  name: string
  link: string
}

export interface Wh40k11eSource {
  id: string
  name: string
  type: string
  edition: string
  version: string
  errata_date: string
  errata_link: string
}

export interface Wh40k11eAbility {
  id: string
  name: string
  legend: string
  faction_id: string
  description: string
}

export interface Wh40k11eModel {
  datasheet_id: string
  line: string
  name: string
  M: string
  T: string
  Sv: string
  inv_sv: string
  inv_sv_descr: string
  W: string
  Ld: string
  OC: string
  base_size: string
  base_size_descr: string
}

export interface Wh40k11eDatasheetAbility {
  datasheet_id: string
  line: string
  ability_id: string
  model: string
  name: string
  description: string
  type: string
  parameter: string
}

export interface Wh40k11eWargear {
  datasheet_id: string
  line: string
  line_in_wargear: string
  dice: string
  name: string
  description: string
  range: string
  type: string
  A: string
  BS_WS: string
  S: string
  AP: string
  D: string
}

export interface Wh40k11eKeyword {
  datasheet_id: string
  keyword: string
  model: string
  is_faction_keyword: string
}

export interface Wh40k11eDatasheet {
  id: string
  name: string
  faction_id: string
  source_id: string
  legend: string
  role: string
  loadout: string
  transport: string
  virtual: string
  leader_head: string
  leader_footer: string
  damaged_w: string
  damaged_description: string
  link: string
  isLegends: boolean
  points: MfmEntry | null
  models: Wh40k11eModel[]
  abilities: Wh40k11eDatasheetAbility[]
  wargear: Wh40k11eWargear[]
  keywords: Wh40k11eKeyword[]
  unitComposition: { datasheet_id: string; line: string; description: string }[]
  options: { datasheet_id: string; line: string; button: string; description: string }[]
  enhancementIds: string[]
  detachmentAbilityIds: string[]
  canLeadIds: string[]
  leaderIds: string[]
}

export interface Wh40k11eDetachment {
  id: string
  faction_id: string
  name: string
  legend: string
  type: string
  points: MfmEntry | null
  rulesAvailable: boolean
}

export interface Wh40k11eDetachmentAbility {
  id: string
  faction_id: string
  name: string
  legend: string
  description: string
  detachment: string
  detachment_id: string
}

export interface Wh40k11eEnhancement {
  faction_id: string
  id: string
  name: string
  cost: string
  detachment: string
  detachment_id: string
  legend: string
  description: string
  officialPoints: number | null
}

export interface Wh40k11eStratagem {
  faction_id: string
  name: string
  id: string
  type: string
  cp_cost: string
  legend: string
  turn: string
  phase: string
  detachment: string
  detachment_id: string
  description: string
}

export interface Wh40k11eRuleset {
  edition: 11
  pointsUpdatedAt: string
  pointsSourceUrl: string
  lastUpdated: string
  factions: Wh40k11eFaction[]
  sources: Wh40k11eSource[]
  abilities: Wh40k11eAbility[]
  datasheets: Wh40k11eDatasheet[]
  detachments: Wh40k11eDetachment[]
  detachmentAbilities: Wh40k11eDetachmentAbility[]
  enhancements: Wh40k11eEnhancement[]
  stratagems: Wh40k11eStratagem[]
}

export interface MfmPrice {
  label: string
  rawLabel: string
  points: number
  models: number | null
  minCopies: number
  maxCopies: number | null
  context: string
}

export interface MfmEntry {
  id: string
  factionSlug: string
  name: string
  kind: 'unit' | 'detachment'
  section: string
  isLegends: boolean
  detachmentPoints: number | null
  uniqueTags: string[]
  prices: MfmPrice[]
  sourceUrl: string
  version: string
}
