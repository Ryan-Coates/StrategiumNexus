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

export interface NarrativeMission {
  id: string
  title: string
  status: 'draft' | 'published'
  narrativeText: string
  missionRulesText: string
  /** Data URL of the uploaded deployment map image. */
  deploymentMapImage?: string
  createdAt: number
  updatedAt: number
}
