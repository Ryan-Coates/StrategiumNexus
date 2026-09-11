import { create } from 'zustand'
import { nanoid } from '../services/nanoid'
import type { NarrativeMission } from '../types/campaign'
import { deleteNarrativeMission, getNarrativeMission, listNarrativeMissions, saveNarrativeMission } from '../services/campaignDb'

// Narrative Driver — kept independent of campaignStore.ts on purpose (no roster linkage).
interface NarrativeStore {
  missions: NarrativeMission[]
  missionsLoaded: boolean
  current: NarrativeMission | null

  loadMissions: () => Promise<void>
  loadMission: (id: string) => Promise<void>
  createMission: () => Promise<NarrativeMission>
  saveMission: (mission: NarrativeMission) => Promise<void>
  deleteMission: (id: string) => Promise<void>
}

export const useNarrativeStore = create<NarrativeStore>((set, get) => ({
  missions: [],
  missionsLoaded: false,
  current: null,

  async loadMissions() {
    const missions = await listNarrativeMissions()
    set({ missions, missionsLoaded: true })
  },

  async loadMission(id) {
    const mission = await getNarrativeMission(id)
    set({ current: mission ?? null })
  },

  async createMission() {
    const mission: NarrativeMission = {
      id: nanoid(),
      title: '',
      status: 'draft',
      narrativeText: '',
      missionRulesText: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await saveNarrativeMission(mission)
    set({ missions: [mission, ...get().missions], current: mission })
    return mission
  },

  async saveMission(mission) {
    const updated: NarrativeMission = { ...mission, updatedAt: Date.now() }
    await saveNarrativeMission(updated)
    const exists = get().missions.some((m) => m.id === updated.id)
    set({
      current: updated,
      missions: exists ? get().missions.map((m) => (m.id === updated.id ? updated : m)) : [updated, ...get().missions],
    })
  },

  async deleteMission(id) {
    await deleteNarrativeMission(id)
    set({ missions: get().missions.filter((m) => m.id !== id) })
  },
}))
