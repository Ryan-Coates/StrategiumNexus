import { create } from 'zustand'
import type { Roster, RosterUnit, RosterSelection, HHDetachment, HHAuxiliarySubtype, HHApexSubtype } from '../types'
import { saveRoster, listRosters, deleteRoster as dbDeleteRoster } from '../services/db'
import { nanoid } from '../services/nanoid'

export interface ValidationIssue {
  type: 'error' | 'warning'
  message: string
}

interface RosterStore {
  rosters: Roster[]
  activeRoster: Roster | null
  activeStep: number
  validationIssues: ValidationIssue[]
  saving: boolean

  // Roster list
  loadRosters: () => Promise<void>

  // Wizard lifecycle
  newRoster: () => void
  openRoster: (roster: Roster) => void
  setActiveStep: (step: number) => void

  // Field updates (all auto-save)
  setRosterField: <K extends keyof Roster>(key: K, value: Roster[K]) => Promise<void>
  addUnit: (unit: RosterUnit) => Promise<void>
  updateUnit: (uid: string, patch: Partial<RosterUnit>) => Promise<void>
  removeUnit: (uid: string) => Promise<void>
  setUnitSelection: (uid: string, selection: RosterSelection) => Promise<void>
  addAlliedUnit: (unit: RosterUnit) => Promise<void>
  removeAlliedUnit: (uid: string) => Promise<void>
  // HH detachment management
  addHHDetachment: (type: 'auxiliary', subtype: HHAuxiliarySubtype) => Promise<void>
  addHHApexDetachment: (subtype: HHApexSubtype) => Promise<void>
  removeHHDetachment: (id: string) => Promise<void>

  // Persistence
  saveActive: () => Promise<void>
  deleteRoster: (id: string) => Promise<void>

  // Validation
  validate: () => void
}

export function makeEmptyRoster(): Roster {
  return {
    id: nanoid(),
    name: '',
    systemId: '',
    systemName: '',
    catalogueId: '',
    catalogueName: '',
    detachment: '',
    pointsLimit: 2000,
    notes: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    units: [],
    warlordUid: '',
    alliedCatalogueId: '',
    alliedCatalogueName: '',
    alliedUnits: [],
  }
}

export const useRosterStore = create<RosterStore>((set, get) => ({
  rosters: [],
  activeRoster: null,
  activeStep: 0,
  validationIssues: [],
  saving: false,

  loadRosters: async () => {
    const rosters = await listRosters()
    set({ rosters })
  },

  newRoster: () => {
    set({ activeRoster: makeEmptyRoster(), activeStep: 0, validationIssues: [] })
  },

  openRoster: (roster) => {
    set({ activeRoster: { ...roster }, activeStep: 0, validationIssues: [] })
    get().validate()
  },

  setActiveStep: (step) => set({ activeStep: step }),

  setRosterField: async (key, value) => {
    const current = get().activeRoster
    if (!current) return
    const updated = { ...current, [key]: value, updatedAt: Date.now() }
    set({ activeRoster: updated })
    await saveRoster(updated)
    set((s) => ({ rosters: s.rosters.map((r) => (r.id === updated.id ? updated : r)) }))
    get().validate()
  },

  addUnit: async (unit) => {
    const current = get().activeRoster
    if (!current) return
    const updated = { ...current, units: [...current.units, unit], updatedAt: Date.now() }
    set({ activeRoster: updated })
    await saveRoster(updated)
    set((s) => ({ rosters: s.rosters.map((r) => (r.id === updated.id ? updated : r)) }))
    get().validate()
  },

  updateUnit: async (uid, patch) => {
    const current = get().activeRoster
    if (!current) return
    const updated = {
      ...current,
      updatedAt: Date.now(),
      units: current.units.map((u) => (u.uid === uid ? { ...u, ...patch } : u)),
    }
    set({ activeRoster: updated })
    await saveRoster(updated)
    set((s) => ({ rosters: s.rosters.map((r) => (r.id === updated.id ? updated : r)) }))
  },

  removeUnit: async (uid) => {
    const current = get().activeRoster
    if (!current) return
    const updated = {
      ...current,
      updatedAt: Date.now(),
      units: current.units.filter((u) => u.uid !== uid),
    }
    set({ activeRoster: updated })
    await saveRoster(updated)
    set((s) => ({ rosters: s.rosters.map((r) => (r.id === updated.id ? updated : r)) }))
    get().validate()
  },

  addAlliedUnit: async (unit) => {
    const current = get().activeRoster
    if (!current) return
    const updated = { ...current, alliedUnits: [...(current.alliedUnits ?? []), unit], updatedAt: Date.now() }
    set({ activeRoster: updated })
    await saveRoster(updated)
    set((s) => ({ rosters: s.rosters.map((r) => (r.id === updated.id ? updated : r)) }))
  },

  removeAlliedUnit: async (uid) => {
    const current = get().activeRoster
    if (!current) return
    const updated = {
      ...current,
      updatedAt: Date.now(),
      alliedUnits: (current.alliedUnits ?? []).filter((u) => u.uid !== uid),
    }
    set({ activeRoster: updated })
    await saveRoster(updated)
    set((s) => ({ rosters: s.rosters.map((r) => (r.id === updated.id ? updated : r)) }))
  },

  addHHDetachment: async (type, subtype) => {
    const current = get().activeRoster
    if (!current) return
    const SUBTYPE_LABELS: Record<string, string> = {
      'armoured-fist': 'Armoured Fist',
      'tactical-support': 'Tactical Support',
      'armoured-support': 'Armoured Support',
      'heavy-support': 'Heavy Support',
      'combat-pioneer': 'Combat Pioneer',
      'shock-assault': 'Shock Assault',
      'first-strike': 'First Strike',
    }
    const newDet: HHDetachment = {
      id: nanoid(),
      type,
      subtype,
      name: SUBTYPE_LABELS[subtype] ?? subtype,
    }
    const updated = {
      ...current,
      updatedAt: Date.now(),
      hhDetachments: [...(current.hhDetachments ?? []), newDet],
    }
    set({ activeRoster: updated })
    await saveRoster(updated)
    set((s) => ({ rosters: s.rosters.map((r) => (r.id === updated.id ? updated : r)) }))
  },

  addHHApexDetachment: async (subtype) => {
    const current = get().activeRoster
    if (!current) return
    const APEX_LABELS: Record<string, string> = {
      'combat-retinue': 'Combat Retinue',
      'officer-cadre': 'Officer Cadre',
      'army-vanguard': 'Army Vanguard',
    }
    const newDet: HHDetachment = {
      id: nanoid(),
      type: 'apex',
      subtype,
      name: APEX_LABELS[subtype] ?? subtype,
    }
    const updated = {
      ...current,
      updatedAt: Date.now(),
      hhDetachments: [...(current.hhDetachments ?? []), newDet],
    }
    set({ activeRoster: updated })
    await saveRoster(updated)
    set((s) => ({ rosters: s.rosters.map((r) => (r.id === updated.id ? updated : r)) }))
  },

  removeHHDetachment: async (id) => {
    const current = get().activeRoster
    if (!current) return
    const updated = {
      ...current,
      updatedAt: Date.now(),
      hhDetachments: (current.hhDetachments ?? []).filter((d) => d.id !== id),
      units: current.units.filter((u) => u.detachmentId !== id),
    }
    set({ activeRoster: updated })
    await saveRoster(updated)
    set((s) => ({ rosters: s.rosters.map((r) => (r.id === updated.id ? updated : r)) }))
  },

  setUnitSelection: async (uid, selection) => {
    const current = get().activeRoster
    if (!current) return
    const updated = {
      ...current,
      updatedAt: Date.now(),
      units: current.units.map((u) => {
        if (u.uid !== uid) return u
        const others = u.selections.filter((s) => s.entryId !== selection.entryId)
        return { ...u, selections: selection.count > 0 ? [...others, selection] : others }
      }),
    }
    set({ activeRoster: updated })
    await saveRoster(updated)
    set((s) => ({ rosters: s.rosters.map((r) => (r.id === updated.id ? updated : r)) }))
    get().validate()
  },

  saveActive: async () => {
    const current = get().activeRoster
    if (!current) return
    set({ saving: true })
    const updated = { ...current, updatedAt: Date.now() }
    await saveRoster(updated)
    set((s) => ({
      saving: false,
      activeRoster: updated,
      rosters: s.rosters.map((r) => (r.id === updated.id ? updated : r)),
    }))
  },

  deleteRoster: async (id) => {
    await dbDeleteRoster(id)
    set((s) => ({
      rosters: s.rosters.filter((r) => r.id !== id),
      activeRoster: s.activeRoster?.id === id ? null : s.activeRoster,
    }))
  },

  validate: () => {
    const roster = get().activeRoster
    if (!roster) { set({ validationIssues: [] }); return }

    const issues: ValidationIssue[] = []
    const totalPts = roster.units.reduce((sum, _u) => {
      // Points from unit's own entry would be resolved in context; use 0 as fallback
      // Full validation happens in ReviewStep with access to catalogue entries
      return sum
    }, 0)
    void totalPts

    if (!roster.name.trim()) {
      issues.push({ type: 'error', message: 'Army has no name.' })
    }
    if (!roster.catalogueId) {
      issues.push({ type: 'error', message: 'No faction selected.' })
    }
    if (roster.units.length === 0 && roster.catalogueId) {
      issues.push({ type: 'warning', message: 'No units added yet.' })
    }
    set({ validationIssues: issues })
  },
}))
