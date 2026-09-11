import { create } from 'zustand'
import { nanoid } from '../services/nanoid'
import type { ActiveMissionState, CampaignFaction, CampaignMissionLog, CampaignRoster, CampaignUnit } from '../types/campaign'
import { deleteCampaignRoster, getCampaignRoster, listCampaignRosters, saveCampaignRoster } from '../services/campaignBackend'

interface CampaignStore {
  rosters: CampaignRoster[]
  rostersLoaded: boolean
  current: CampaignRoster | null

  loadRosters: () => Promise<void>
  createRoster: (playerName: string, faction: CampaignFaction) => Promise<CampaignRoster>
  loadRoster: (id: string) => Promise<void>
  deleteRoster: (id: string) => Promise<void>

  setDescription: (text: string) => Promise<void>
  addUnit: (unit: Omit<CampaignUnit, 'id'>) => Promise<void>
  updateUnit: (id: string, patch: Partial<CampaignUnit>) => Promise<void>
  removeUnit: (id: string) => Promise<void>
  addEnhancement: (unitId: string, text: string) => Promise<void>
  removeEnhancement: (unitId: string, index: number) => Promise<void>
  setWaaaghPoints: (points: number) => Promise<void>

  startMission: (label: string, committedUnitIds: string[]) => Promise<void>
  addUnitsToMission: (unitIds: string[]) => Promise<void>
  setCasualtyDraft: (unitId: string, modelsLost: number) => Promise<void>
  cancelMission: () => Promise<void>
  endMission: () => Promise<void>
}

function pointsLimitFor(faction: CampaignFaction): number {
  return faction === 'ork' ? 3000 : 2000
}

export const useCampaignStore = create<CampaignStore>((set, get) => {
  async function persist(roster: CampaignRoster): Promise<void> {
    const updated: CampaignRoster = { ...roster, updatedAt: Date.now() }
    set({ current: updated, rosters: get().rosters.map((r) => (r.id === updated.id ? updated : r)) })
    await saveCampaignRoster(updated)
  }

  return {
    rosters: [],
    rostersLoaded: false,
    current: null,

    async loadRosters() {
      const rosters = await listCampaignRosters()
      set({ rosters, rostersLoaded: true })
    },

    async createRoster(playerName, faction) {
      const roster: CampaignRoster = {
        id: nanoid(),
        playerName,
        faction,
        pointsLimit: pointsLimitFor(faction),
        waaaghPoints: faction === 'ork' ? 0 : undefined,
        units: [],
        missionHistory: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      await saveCampaignRoster(roster)
      set({ rosters: [roster, ...get().rosters] })
      return roster
    },

    async loadRoster(id) {
      const roster = await getCampaignRoster(id)
      set({ current: roster ?? null })
    },

    async deleteRoster(id) {
      await deleteCampaignRoster(id)
      set({ rosters: get().rosters.filter((r) => r.id !== id) })
    },

    async setDescription(text) {
      const current = get().current
      if (!current) return
      await persist({ ...current, description: text })
    },

    async addUnit(unit) {
      const current = get().current
      if (!current) return
      const newUnit: CampaignUnit = { ...unit, id: nanoid() }
      await persist({ ...current, units: [...current.units, newUnit] })
    },

    async updateUnit(id, patch) {
      const current = get().current
      if (!current) return
      await persist({ ...current, units: current.units.map((u) => (u.id === id ? { ...u, ...patch } : u)) })
    },

    async removeUnit(id) {
      const current = get().current
      if (!current) return
      await persist({ ...current, units: current.units.filter((u) => u.id !== id) })
    },

    async addEnhancement(unitId, text) {
      const current = get().current
      if (!current || !text.trim()) return
      await persist({
        ...current,
        units: current.units.map((u) => (u.id === unitId ? { ...u, enhancements: [...u.enhancements, text.trim()] } : u)),
      })
    },

    async removeEnhancement(unitId, index) {
      const current = get().current
      if (!current) return
      await persist({
        ...current,
        units: current.units.map((u) =>
          u.id === unitId ? { ...u, enhancements: u.enhancements.filter((_, i) => i !== index) } : u
        ),
      })
    },

    async setWaaaghPoints(points) {
      const current = get().current
      if (!current) return
      await persist({ ...current, waaaghPoints: Math.max(0, points) })
    },

    async startMission(label, committedUnitIds) {
      const current = get().current
      if (!current) return
      const activeMission: ActiveMissionState = { label, startedAt: Date.now(), committedUnitIds, casualtyDraft: {} }
      await persist({ ...current, activeMission })
    },

    async addUnitsToMission(unitIds) {
      const current = get().current
      if (!current?.activeMission) return
      const merged = Array.from(new Set([...current.activeMission.committedUnitIds, ...unitIds]))
      await persist({ ...current, activeMission: { ...current.activeMission, committedUnitIds: merged } })
    },

    async setCasualtyDraft(unitId, modelsLost) {
      const current = get().current
      if (!current?.activeMission) return
      await persist({
        ...current,
        activeMission: {
          ...current.activeMission,
          casualtyDraft: { ...current.activeMission.casualtyDraft, [unitId]: Math.max(0, modelsLost) },
        },
      })
    },

    async cancelMission() {
      const current = get().current
      if (!current) return
      await persist({ ...current, activeMission: undefined })
    },

    async endMission() {
      const current = get().current
      if (!current?.activeMission) return
      const { activeMission } = current
      const committedPoints = current.units
        .filter((u) => activeMission.committedUnitIds.includes(u.id))
        .reduce((sum, u) => sum + u.pointsCost, 0)

      const casualties: CampaignMissionLog['casualties'] = []
      const survivingUnits: CampaignUnit[] = []
      for (const unit of current.units) {
        const lost = activeMission.casualtyDraft[unit.id] ?? 0
        if (lost <= 0) {
          survivingUnits.push(unit)
          continue
        }
        const wiped = lost >= unit.modelCount
        casualties.push({ unitId: unit.id, unitName: unit.name, modelsLost: lost, wiped })
        // wiped units (and any enhancement they carried) are dropped from the roster entirely
        if (!wiped) survivingUnits.push({ ...unit, modelCount: unit.modelCount - lost })
      }

      const log: CampaignMissionLog = {
        id: nanoid(),
        label: activeMission.label,
        playedAt: Date.now(),
        committedPoints,
        casualties,
        enhancementsGranted: [],
      }

      await persist({
        ...current,
        units: survivingUnits,
        missionHistory: [log, ...current.missionHistory],
        activeMission: undefined,
      })
    },
  }
})
