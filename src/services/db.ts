import { openDB, type IDBPDatabase } from 'idb'
import type { GameSystemMeta, CatalogueMeta } from '../types'
import type { CatFile } from './bsdataApi'

// ── Schema ────────────────────────────────────────────────────────────────

export interface GameSystemRecord extends GameSystemMeta {
  rawXml: string
  catFiles: CatFile[]   // list of available .cat files from the GitHub repo
}

export interface CatalogueRecord extends CatalogueMeta {
  rawXml: string
}

interface StrategiumSchema {
  gameSystems: {
    key: string
    value: GameSystemRecord
  }
  catalogues: {
    key: string
    value: CatalogueRecord
    indexes: { 'by-system': string }
  }
}

// ── DB singleton ──────────────────────────────────────────────────────────────

const DB_NAME = 'strategium-nexus'
const DB_VERSION = 2  // bump whenever schema changes — data is re-fetchable from GitHub

let _db: IDBPDatabase<StrategiumSchema> | null = null

async function getDb(): Promise<IDBPDatabase<StrategiumSchema>> {
  if (_db) return _db
  _db = await openDB<StrategiumSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Drop and recreate on any schema change — data is always re-downloadable
      if (db.objectStoreNames.contains('gameSystems')) db.deleteObjectStore('gameSystems')
      if (db.objectStoreNames.contains('catalogues')) db.deleteObjectStore('catalogues')
      db.createObjectStore('gameSystems', { keyPath: 'id' })
      const cats = db.createObjectStore('catalogues', { keyPath: 'id' })
      cats.createIndex('by-system', 'gameSystemId')
    },
  })
  return _db
}

// ── Game system operations ────────────────────────────────────────────────────

export async function saveGameSystem(record: GameSystemRecord): Promise<void> {
  const db = await getDb()
  await db.put('gameSystems', record)
}

export async function getGameSystem(id: string): Promise<GameSystemRecord | undefined> {
  const db = await getDb()
  return db.get('gameSystems', id)
}

export async function listGameSystems(): Promise<GameSystemRecord[]> {
  const db = await getDb()
  return db.getAll('gameSystems')
}

export async function deleteGameSystem(id: string): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(['gameSystems', 'catalogues'], 'readwrite')
  await tx.objectStore('gameSystems').delete(id)
  const allCats = await tx.objectStore('catalogues').index('by-system').getAllKeys(id)
  for (const key of allCats) {
    await tx.objectStore('catalogues').delete(key)
  }
  await tx.done
}

// ── Catalogue operations ──────────────────────────────────────────────────────

export async function saveCatalogue(record: CatalogueRecord): Promise<void> {
  const db = await getDb()
  await db.put('catalogues', record)
}

export async function getCatalogue(id: string): Promise<CatalogueRecord | undefined> {
  const db = await getDb()
  return db.get('catalogues', id)
}

export async function listCataloguesForSystem(systemId: string): Promise<CatalogueRecord[]> {
  const db = await getDb()
  return db.getAllFromIndex('catalogues', 'by-system', systemId)
}

export async function deleteCatalogue(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('catalogues', id)
}
