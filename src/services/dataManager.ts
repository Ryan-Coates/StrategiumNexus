import type { BsDataSystemManifest } from '../data/bsdataIndex'
import type { CatFile } from './bsdataApi'
import { fetchRepoFileList, fetchRawXml } from './bsdataApi'
import { parseGameSystemXml, parseCatalogueXml } from './xmlParser'
import {
  saveGameSystem,
  saveCatalogue,
  listGameSystems,
  listCataloguesForSystem,
  deleteGameSystem,
  deleteCatalogue,
  getCatalogue,
  getGameSystem,
  type GameSystemRecord,
} from './db'
import type { ParsedCatalogue, ParsedGameSystem } from '../types'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DownloadProgress {
  stage: string
}

export type ProgressCallback = (progress: DownloadProgress) => void

// ── System operations ─────────────────────────────────────────────────────────

export async function downloadSystem(
  manifest: BsDataSystemManifest,
  onProgress: ProgressCallback,
): Promise<void> {
  onProgress({ stage: 'Fetching repository file list…' })

  const { gstFiles, catFiles } = await fetchRepoFileList(manifest.repoOwner, manifest.repoSlug)

  if (gstFiles.length === 0) {
    throw new Error(
      `No .gst game system file found in ${manifest.repoOwner}/${manifest.repoSlug}`,
    )
  }

  const gstFile = gstFiles[0]
  onProgress({ stage: `Downloading ${gstFile.name}…` })

  const xml = await fetchRawXml(gstFile.rawUrl)

  onProgress({ stage: 'Parsing game system data…' })
  const parsed = parseGameSystemXml(xml)

  await saveGameSystem({
    id: parsed.id,
    name: parsed.name,
    revision: parsed.revision,
    battleScribeVersion: parsed.battleScribeVersion,
    slug: manifest.slug,
    rawXml: xml,
    catFiles,
    fetchedAt: Date.now(),
  })
}

export async function downloadCatalogue(
  systemId: string,
  catFile: CatFile,
  onProgress: ProgressCallback,
): Promise<void> {
  onProgress({ stage: `Downloading ${catFile.name}…` })

  const xml = await fetchRawXml(catFile.rawUrl)

  onProgress({ stage: 'Parsing…' })
  const parsed = parseCatalogueXml(xml)

  await saveCatalogue({
    id: parsed.meta.id,
    gameSystemId: systemId,
    name: parsed.meta.name || catFile.name,
    revision: parsed.meta.revision,
    rawXml: xml,
    fetchedAt: Date.now(),
  })
}

export async function downloadAllCatalogues(
  system: GameSystemRecord,
  onProgress: ProgressCallback,
): Promise<void> {
  const total = system.catFiles.length
  for (let i = 0; i < total; i++) {
    const cat = system.catFiles[i]
    onProgress({ stage: `Downloading ${cat.name} (${i + 1}/${total})…` })
    const xml = await fetchRawXml(cat.rawUrl)
    const parsed = parseCatalogueXml(xml)
    await saveCatalogue({
      id: parsed.meta.id,
      gameSystemId: system.id,
      name: parsed.meta.name || cat.name,
      revision: parsed.meta.revision,
      rawXml: xml,
      fetchedAt: Date.now(),
    })
  }
}

// ── Data access ───────────────────────────────────────────────────────────────

export async function loadAllSystems(): Promise<GameSystemRecord[]> {
  return listGameSystems()
}

export async function getSystemBySlug(slug: string): Promise<GameSystemRecord | null> {
  const all = await listGameSystems()
  return all.find((s) => s.slug === slug) ?? null
}

export async function loadCataloguesForSystem(systemId: string) {
  return listCataloguesForSystem(systemId)
}

export async function parseCatalogueData(catalogueId: string): Promise<ParsedCatalogue> {
  const record = await getCatalogue(catalogueId)
  if (!record) throw new Error(`Catalogue ${catalogueId} not found. Re-download required.`)
  return parseCatalogueXml(record.rawXml)
}

export async function parseSystemData(systemId: string): Promise<ParsedGameSystem> {
  const record = await getGameSystem(systemId)
  if (!record) throw new Error(`Game system ${systemId} not found. Re-download required.`)
  return parseGameSystemXml(record.rawXml)
}

export { deleteGameSystem, deleteCatalogue, listCataloguesForSystem }
export type { GameSystemRecord }
