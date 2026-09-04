import { create } from 'zustand'
import type { AttritionRoster, HordeSession, GameSize, SpawnTableEntry, WaveRound } from '../types/horde'
import { loadHordeSession, saveHordeSession, loadAttritionRoster, saveAttritionRoster } from '../services/hordeDb'
import {
  calcRoundModifier,
  calcDespairCardCount,
  calcReinforcementPoints,
  rollZone,
  drawDespairCards,
  shuffledDespairDeck,
  zoneCountForGameSize,
  CAMPAIGN_POOL_CAP,
  WAVE_POINTS_TIERS,
} from '../services/hordeMechanics'
import { nanoid } from '../services/nanoid'

interface HordeStore {
  session: HordeSession
  sessionLoaded: boolean
  roster: AttritionRoster
  rosterLoaded: boolean

  loadSession: () => Promise<void>
  setGameSize: (gameSize: GameSize) => Promise<void>
  setRound: (round: number) => Promise<void>
  setManualModifier: (modifier: number) => Promise<void>
  addSpawnTableEntry: (entry: Omit<SpawnTableEntry, 'id'>) => Promise<void>
  removeSpawnTableEntry: (id: string) => Promise<void>
  rollRound: () => Promise<void>
  rollExtraZone: () => Promise<void>
  clearHistory: () => Promise<void>
  resetSession: () => Promise<void>

  loadRoster: () => Promise<void>
  setThreatLevel: (level: number) => Promise<void>
  adjustCampaignPool: (amount: number) => Promise<void>
  setCommittedPoints: (points: number) => Promise<void>
  setCasualtyPoints: (points: number) => Promise<void>
  resetCasualties: () => Promise<void>
  completeMission: () => Promise<number>
}

/**
 * Seeds the Chaos Wave Table so it isn't empty on first use. Mirrors WAVE_POINTS_TIERS,
 * shown as a reference on Horde Home.
 */
function makeDefaultSpawnTable(): SpawnTableEntry[] {
  return WAVE_POINTS_TIERS.map((tier) => ({
    id: nanoid(),
    unitName: `${tier.label} — ${tier.factions.map((f) => `${f.faction}: ${f.units}`).join('; ')}`,
    pointsCost: tier.pointsCost,
  }))
}

function makeDefaultSession(): HordeSession {
  return {
    gameSize: 'small',
    round: 1,
    manualModifier: 0,
    table: makeDefaultSpawnTable(),
    history: [],
    despairDrawPile: shuffledDespairDeck(),
    despairDiscardPile: [],
    updatedAt: Date.now(),
  }
}

function makeDefaultRoster(): AttritionRoster {
  return { threatLevel: 1, campaignPool: 0, committedPoints: 0, casualtyPoints: 0, updatedAt: Date.now() }
}

export const useHordeStore = create<HordeStore>((set, get) => {
  async function persistSession(session: HordeSession): Promise<void> {
    const updated: HordeSession = { ...session, updatedAt: Date.now() }
    // Update in-memory state before awaiting the IndexedDB write so rapid consecutive
    // mutations always read the latest state instead of racing each other.
    set({ session: updated })
    await saveHordeSession(updated)
  }

  async function persistRoster(roster: AttritionRoster): Promise<void> {
    const updated: AttritionRoster = { ...roster, updatedAt: Date.now() }
    set({ roster: updated })
    await saveAttritionRoster(updated)
  }

  return {
    session: makeDefaultSession(),
    sessionLoaded: false,
    roster: makeDefaultRoster(),
    rosterLoaded: false,

    async loadSession() {
      const stored = await loadHordeSession()
      set({ session: stored ?? makeDefaultSession(), sessionLoaded: true })
    },

    async setGameSize(gameSize) {
      await persistSession({ ...get().session, gameSize })
    },

    async setRound(round) {
      await persistSession({ ...get().session, round: Math.max(1, round) })
    },

    async setManualModifier(modifier) {
      await persistSession({ ...get().session, manualModifier: modifier })
    },

    async addSpawnTableEntry(entry) {
      const session = get().session
      const newEntry: SpawnTableEntry = { ...entry, id: nanoid() }
      await persistSession({ ...session, table: [...session.table, newEntry] })
    },

    async removeSpawnTableEntry(id) {
      const session = get().session
      await persistSession({ ...session, table: session.table.filter((e) => e.id !== id) })
    },

    async rollRound() {
      const session = get().session
      const zoneCount = zoneCountForGameSize(session.gameSize)
      const modifier = calcRoundModifier(session.round) + session.manualModifier
      const zones = Array.from({ length: zoneCount }, () => rollZone(session.table, modifier))
      const despairCount = calcDespairCardCount(session.round)
      const { drawn, drawPile, discardPile } = drawDespairCards(session.despairDrawPile, session.despairDiscardPile, despairCount)
      const wave: WaveRound = { id: nanoid(), round: session.round, modifier, zones, despairCards: drawn, createdAt: Date.now() }
      await persistSession({
        ...session,
        round: session.round + 1,
        history: [wave, ...session.history],
        despairDrawPile: drawPile,
        despairDiscardPile: discardPile,
      })
    },

    async rollExtraZone() {
      const session = get().session
      const [latest, ...rest] = session.history
      if (!latest) return
      const zone = rollZone(session.table, latest.modifier)
      const updatedLatest: WaveRound = { ...latest, zones: [...latest.zones, zone] }
      await persistSession({ ...session, history: [updatedLatest, ...rest] })
    },

    async clearHistory() {
      await persistSession({ ...get().session, history: [] })
    },

    async resetSession() {
      const session = get().session
      await persistSession({ ...makeDefaultSession(), gameSize: session.gameSize, table: session.table })
    },

    async loadRoster() {
      const stored = await loadAttritionRoster()
      set({ roster: stored ?? makeDefaultRoster(), rosterLoaded: true })
    },

    async setThreatLevel(level) {
      await persistRoster({ ...get().roster, threatLevel: Math.max(0, level) })
    },

    async adjustCampaignPool(amount) {
      const roster = get().roster
      const campaignPool = Math.max(0, Math.min(CAMPAIGN_POOL_CAP, roster.campaignPool + amount))
      await persistRoster({ ...roster, campaignPool })
    },

    async setCommittedPoints(points) {
      await persistRoster({ ...get().roster, committedPoints: Math.max(0, points) })
    },

    async setCasualtyPoints(points) {
      await persistRoster({ ...get().roster, casualtyPoints: Math.max(0, points) })
    },

    async resetCasualties() {
      await persistRoster({ ...get().roster, casualtyPoints: 0 })
    },

    async completeMission() {
      const roster = get().roster
      const rp = calcReinforcementPoints(roster.committedPoints, roster.casualtyPoints, roster.threatLevel)
      const campaignPool = Math.min(CAMPAIGN_POOL_CAP, roster.campaignPool + rp)
      await persistRoster({ ...roster, campaignPool, committedPoints: 0, casualtyPoints: 0 })
      return rp
    },
  }
})


