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
import type { ParsedCatalogue, ParsedGameSystem, CatalogueMeta } from '../types'

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
): Promise<CatalogueMeta> {
  onProgress({ stage: `Downloading ${catFile.name}…` })

  const xml = await fetchRawXml(catFile.rawUrl)

  onProgress({ stage: 'Parsing…' })
  const parsed = parseCatalogueXml(xml)

  const record: CatalogueMeta = {
    id: parsed.meta.id,
    gameSystemId: systemId,
    // Always use the catFile.name (filename without .cat) as the canonical name.
    // The XML root <catalogue name="..."> often differs from the filename
    // (e.g. "Xenos - Aeldari" vs filename "Aeldari - Craftworlds"), so using
    // catFile.name ensures consistent matching and user-friendly display.
    name: catFile.name,
    revision: parsed.meta.revision,
    fetchedAt: Date.now(),
  }

  await saveCatalogue({ ...record, rawXml: xml })
  return record
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

  const parsed = parseCatalogueXml(record.rawXml)

  // Some catalogues (e.g. Aeldari - Craftworlds, Chaos Daemons, Chaos Knights) store
  // their datasheets in a separate Library catalogue and only contain entryLinks that
  // point into that library.  If we parsed zero unit/model entries but have catalogue
  // links, load each linked library from IndexedDB and merge the referenced entries.
  const hasUnits = parsed.entries.some((e) => e.type === 'unit' || e.type === 'model')
  if (!hasUnits && parsed.catalogueLinkIds.length > 0) {
    const targets = new Set(parsed.entryLinkTargetIds)
    for (const linkedId of parsed.catalogueLinkIds) {
      try {
        const linkedRecord = await getCatalogue(linkedId)
        if (!linkedRecord) continue
        const linked = parseCatalogueXml(linkedRecord.rawXml)
        const toAdd = linked.entries.filter(
          (e) =>
            (e.type === 'unit' || e.type === 'model') &&
            (targets.size === 0 || targets.has(e.id)),
        )
        if (toAdd.length > 0) {
          parsed.entries.push(...toAdd)
          parsed.rules.push(...linked.rules)
        }
      } catch {
        // Library not downloaded yet – silently skip; viewer will show empty state
      }
    }
  }

  return parsed
}

export async function parseSystemData(systemId: string): Promise<ParsedGameSystem> {
  const record = await getGameSystem(systemId)
  if (!record) throw new Error(`Game system ${systemId} not found. Re-download required.`)
  return parseGameSystemXml(record.rawXml)
}

export { deleteGameSystem, deleteCatalogue, listCataloguesForSystem }
export type { GameSystemRecord }
