// Campaign Mode — standalone Roster Manager + Narrative Driver types.
// Deliberately independent from the BSData-driven Roster type in src/types/index.ts,
// and deliberately not cross-linked to each other (see CAMPAIGN-MODE-PLAN.md decision 12).

export type CampaignFaction = 'imperial' | 'ork'

export interface CampaignUnit {
  id: string
  name: string
  /** The unit's actual datasheet/type from the game rules, e.g. "Warboss". */
  datasheetName: string
  pointsCost: number
  /** Shrinks permanently on casualties; a unit is removed entirely once wiped. */
  modelCount: number
  /** Fixed at creation — used to prorate pointsCost as modelCount shrinks from casualties. */
  startingPointsCost?: number
  startingModelCount?: number
  isCharacter: boolean
  /** Freeform background/fluff for this model. */
  about: string
  /** Freeform labels, added/removed by players; all lost if this character is later wiped. */
  enhancements: string[]
}

export interface CampaignMissionLog {
  id: string
  /** Freeform text, e.g. "Mission 3 - Siege of X" — no link to a NarrativeMission record. */
  label: string
  playedAt: number
  committedPoints: number
  casualties: { unitId: string; unitName: string; modelsLost: number; wiped: boolean }[]
  enhancementsGranted: { unitId: string; enhancement: string }[]
}

/** Present on a roster only while a mission is in progress. */
export interface ActiveMissionState {
  label: string
  startedAt: number
  committedUnitIds: string[]
  /** unitId -> models removed so far, pre-confirm. */
  casualtyDraft: Record<string, number>
}

export interface CampaignRoster {
  id: string
  playerName: string
  /** The army/warband's own name — distinct from the player controlling it. */
  squadName: string
  /** Freeform background/fluff for this roster/warband. */
  description?: string
  faction: CampaignFaction
  /** Total roster build cap — fixed 2000 (Imperial) or 3000 (Ork). Not a mission cap. */
  pointsLimit: number
  /** Orks only — persistent, manually adjusted reinforcement resource for adding forces mid-mission. */
  waaaghPoints?: number
  units: CampaignUnit[]
  missionHistory: CampaignMissionLog[]
  activeMission?: ActiveMissionState
  createdAt: number
  updatedAt: number
}

// ── Narrative Driver (independent — no links to CampaignRoster) ───────────

export type TerrainKind = 'ruins' | 'scatter'
export type MapObjectKind = 'deploymentZone' | 'terrain' | 'objective' | 'label'
export type MapShape = 'rect' | 'circle' | 'polygon'

export interface MapObject {
  id: string
  kind: MapObjectKind
  shape: MapShape
  x: number
  y: number
  width?: number // rect (inches)
  height?: number // rect (inches)
  radius?: number // circle (inches)
  /** polygon (inches, absolute board coords) — deployment zones use 8 freely-draggable points. */
  points?: { x: number; y: number }[]
  color: string
  label?: string
  terrainKind?: TerrainKind // only for kind === 'terrain'
}

/** Editable source data for the in-app deployment map editor (admin-only). */
export interface DeploymentMapData {
  boardWidthIn: number
  boardHeightIn: number
  /** Data URL — either a generated default board or an uploaded background image. */
  backgroundImage: string
  objects: MapObject[]
}

export interface NarrativeMission {
  id: string
  title: string
  status: 'draft' | 'published'
  narrativeText: string
  missionRulesText: string
  /** Data URL of the flattened deployment map (regenerated from deploymentMapData on every editor save). */
  deploymentMapImage?: string
  /** Absent for missions that only ever had a plain uploaded image and never opened the map editor. */
  deploymentMapData?: DeploymentMapData
  createdAt: number
  updatedAt: number
}
