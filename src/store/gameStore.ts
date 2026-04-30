import { create } from 'zustand'
import type { GameSystemMeta, CatalogueMeta } from '../types'

interface GameStore {
  // Downloaded game systems (metadata only — XML lives in IndexedDB)
  systems: GameSystemMeta[]
  catalogues: Record<string, CatalogueMeta[]>  // keyed by systemId

  setSystems: (systems: GameSystemMeta[]) => void
  setCatalogues: (systemId: string, catalogues: CatalogueMeta[]) => void
  removeSystem: (id: string) => void
}

export const useGameStore = create<GameStore>((set) => ({
  systems: [],
  catalogues: {},

  setSystems: (systems) => set({ systems }),

  setCatalogues: (systemId, catalogues) =>
    set((state) => ({
      catalogues: { ...state.catalogues, [systemId]: catalogues },
    })),

  removeSystem: (id) =>
    set((state) => {
      const catalogues = { ...state.catalogues }
      delete catalogues[id]
      return {
        systems: state.systems.filter((s) => s.id !== id),
        catalogues,
      }
    }),
}))
