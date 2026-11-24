export interface Wh40k11eRosterUnit {
  id: string
  datasheetId: string
  name: string
  description: string
  image: string
  modelCount: number
  pointsLabel: string
  useDefaultLoadout: boolean
  weapons: Record<string, number>
  wargearNotes: string
  paidUpgrades: Record<string, number>
  upgradesReviewed: boolean
  enhancementId: string
  enhancementPointsOverride: number | null
  manualPoints: number | null
}

export interface Wh40k11eRoster {
  id: string
  name: string
  description: string
  image: string
  factionId: string
  detachmentIds: string[]
  detachmentPointsOverrides: Record<string, number>
  battleSize: 'incursion' | 'strike-force' | null
  pointsLimit: number
  units: Wh40k11eRosterUnit[]
  createdAt: number
  updatedAt: number
}

export type LegacyWh40k11eRoster = Omit<Wh40k11eRoster,
  'detachmentIds' | 'detachmentPointsOverrides' | 'battleSize'> & { detachmentId: string }
