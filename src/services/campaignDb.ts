import { openDB, type IDBPDatabase } from 'idb'
import type { CampaignRoster, NarrativeMission } from '../types/campaign'

interface CampaignSchema {
  campaignRosters: {
    key: string
    value: CampaignRoster
  }
  narrativeMissions: {
    key: string
    value: NarrativeMission
  }
}

// Own database — independent of `strategium-nexus` and `strategium-nexus-horde`,
// so Campaign Mode has zero storage coupling with Warband Forge or Horde Mode.
const DB_NAME = 'strategium-nexus-campaign'
const DB_VERSION = 1

let _db: IDBPDatabase<CampaignSchema> | null = null

async function getDb(): Promise<IDBPDatabase<CampaignSchema>> {
  if (_db) return _db
  _db = await openDB<CampaignSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('campaignRosters')) {
        db.createObjectStore('campaignRosters', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('narrativeMissions')) {
        db.createObjectStore('narrativeMissions', { keyPath: 'id' })
      }
    },
  })
  return _db
}

// ── Campaign roster operations ─────────────────────────────────────────────

export async function saveCampaignRoster(roster: CampaignRoster): Promise<void> {
  const db = await getDb()
  await db.put('campaignRosters', roster)
}

export async function getCampaignRoster(id: string): Promise<CampaignRoster | undefined> {
  const db = await getDb()
  return db.get('campaignRosters', id)
}

export async function listCampaignRosters(): Promise<CampaignRoster[]> {
  const db = await getDb()
  const all = await db.getAll('campaignRosters')
  return all.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function deleteCampaignRoster(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('campaignRosters', id)
}

// ── Narrative mission operations ───────────────────────────────────────────

export async function saveNarrativeMission(mission: NarrativeMission): Promise<void> {
  const db = await getDb()
  await db.put('narrativeMissions', mission)
}

export async function getNarrativeMission(id: string): Promise<NarrativeMission | undefined> {
  const db = await getDb()
  return db.get('narrativeMissions', id)
}

export async function listNarrativeMissions(): Promise<NarrativeMission[]> {
  const db = await getDb()
  const all = await db.getAll('narrativeMissions')
  return all.sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function deleteNarrativeMission(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('narrativeMissions', id)
}
