import { openDB, type IDBPDatabase } from 'idb'
import type { HordeSession, AttritionRoster } from '../types/horde'

// Separate IndexedDB database for the Horde Mode utility tools — isolated from
// the game-data/roster db. Each tool keeps exactly one continuous working state
// (no profiles), stored as a single record under a fixed key.

const SESSION_KEY = 'default'
const ROSTER_KEY = 'default'

interface HordeSchema {
  session: {
    key: string
    value: HordeSession & { id: string }
  }
  roster: {
    key: string
    value: AttritionRoster & { id: string }
  }
}

const DB_NAME = 'strategium-nexus-horde'
const DB_VERSION = 4

let _db: IDBPDatabase<HordeSchema> | null = null

async function getDb(): Promise<IDBPDatabase<HordeSchema>> {
  if (_db) return _db
  _db = await openDB<HordeSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // v1 used per-profile stores (spawnProfiles/attritionProfiles); v2/v3 replaced the record
      // shape entirely (bracket-based spawn table -> WP-based, campaign pool, despair deck), so
      // drop any stores from an older schema version rather than trying to migrate test data.
      if (db.objectStoreNames.contains('spawnProfiles')) db.deleteObjectStore('spawnProfiles')
      if (db.objectStoreNames.contains('attritionProfiles')) db.deleteObjectStore('attritionProfiles')
      if (oldVersion < 4) {
        if (db.objectStoreNames.contains('session')) db.deleteObjectStore('session')
        if (db.objectStoreNames.contains('roster')) db.deleteObjectStore('roster')
      }
      if (!db.objectStoreNames.contains('session')) {
        db.createObjectStore('session', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('roster')) {
        db.createObjectStore('roster', { keyPath: 'id' })
      }
    },
  })
  return _db
}

export async function loadHordeSession(): Promise<HordeSession | null> {
  const db = await getDb()
  const record = await db.get('session', SESSION_KEY)
  if (!record) return null
  const { id: _id, ...session } = record
  return session
}

export async function saveHordeSession(session: HordeSession): Promise<void> {
  const db = await getDb()
  await db.put('session', { ...session, id: SESSION_KEY })
}

export async function loadAttritionRoster(): Promise<AttritionRoster | null> {
  const db = await getDb()
  const record = await db.get('roster', ROSTER_KEY)
  if (!record) return null
  const { id: _id, ...roster } = record
  return roster
}

export async function saveAttritionRoster(roster: AttritionRoster): Promise<void> {
  const db = await getDb()
  await db.put('roster', { ...roster, id: ROSTER_KEY })
}
