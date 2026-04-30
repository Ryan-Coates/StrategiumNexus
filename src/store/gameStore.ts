import { create } from 'zustand'
import type { CatalogueMeta, ParsedCatalogue } from '../types'
import type { GameSystemRecord } from '../services/dataManager'

interface GameStore {
  // Downloaded game systems (metadata + catFiles — raw XML lives in IndexedDB)
  systems: GameSystemRecord[]
  catalogues: Record<string, CatalogueMeta[]>          // keyed by systemId
  parsedCatalogues: Record<string, ParsedCatalogue>    // in-memory parse cache

  // Loading / error state — key is either manifest slug or catalogue id
  downloading: Record<string, boolean>
  progress: Record<string, string>
  errors: Record<string, string>

  setSystems: (systems: GameSystemRecord[]) => void
  setCatalogues: (systemId: string, catalogues: CatalogueMeta[]) => void
  setParsedCatalogue: (id: string, data: ParsedCatalogue) => void
  setDownloading: (key: string, value: boolean) => void
  setProgress: (key: string, msg: string) => void
  setError: (key: string, msg: string | null) => void
  removeSystem: (id: string) => void
}

export const useGameStore = create<GameStore>((set) => ({
  systems: [],
  catalogues: {},
  parsedCatalogues: {},
  downloading: {},
  progress: {},
  errors: {},

  setSystems: (systems) => set({ systems }),

  setCatalogues: (systemId, catalogues) =>
    set((state) => ({ catalogues: { ...state.catalogues, [systemId]: catalogues } })),

  setParsedCatalogue: (id, data) =>
    set((state) => ({ parsedCatalogues: { ...state.parsedCatalogues, [id]: data } })),

  setDownloading: (key, value) =>
    set((state) => ({ downloading: { ...state.downloading, [key]: value } })),

  setProgress: (key, msg) =>
    set((state) => ({ progress: { ...state.progress, [key]: msg } })),

  setError: (key, msg) =>
    set((state) => {
      const errors = { ...state.errors }
      if (msg === null) delete errors[key]
      else errors[key] = msg
      return { errors }
    }),

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
