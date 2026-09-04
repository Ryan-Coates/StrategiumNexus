// Horde Mode utility types — Spawn Table wave generator + Attrition tracker.
// Missions/campaigns are run outside the app; these are standalone in-game utility tools.
// No profiles — each tool holds one continuous, persisted working state.

// Matches the official rules: 1,000pt games use 2 Spawning Zones, 2,000pt games use 4.
export type GameSize = 'small' | 'large'

/** A "Chaos Wave Table" entry — an example unit and its Wave Points (WP) cost. */
export interface SpawnTableEntry {
  id: string
  unitName: string
  pointsCost: number
}

export interface ZoneWaveResult {
  /** Raw 2D6 roll. */
  roll: number
  /** Roll plus the round/manual modifier. */
  spawnRoll: number
  /** Wave Points budget spent building this zone's wave. */
  wavePoints: number
  units: SpawnTableEntry[]
}

export type DespairCardCategory = 'penalty' | 'boost' | 'environmental' | 'boon'

export interface DespairCard {
  id: string
  category: DespairCardCategory
  title: string
  effect: string
}

export interface WaveRound {
  id: string
  round: number
  modifier: number
  zones: ZoneWaveResult[]
  despairCards: DespairCard[]
  createdAt: number
}

/** Persisted Wave Generator working state — one continuous game, no named profiles. */
export interface HordeSession {
  gameSize: GameSize
  round: number
  manualModifier: number
  table: SpawnTableEntry[]
  history: WaveRound[]
  despairDrawPile: string[]
  despairDiscardPile: string[]
  updatedAt: number
}

/** Persisted Attrition Tracker working state — one continuous campaign, no named profiles. */
export interface AttritionRoster {
  threatLevel: number
  /** Reinforcement Points banked across missions, capped at CAMPAIGN_POOL_CAP. */
  campaignPool: number
  /** Total points value committed to the current mission. */
  committedPoints: number
  /** Points value lost to casualties so far this mission. */
  casualtyPoints: number
  updatedAt: number
}
