// Firestore-backed CRUD mirroring campaignDb.ts's IndexedDB API 1:1, so campaignBackend.ts
// can swap between the two without the stores knowing which one is active.
import type { CampaignRoster, NarrativeMission } from '../types/campaign'
import { getFirebaseDb } from './firebase'

const ROSTERS_COLLECTION = 'rosters'
const MISSIONS_COLLECTION = 'narrativeMissions'

// Firestore's setDoc() throws on any `undefined` field value. Optional fields (e.g.
// waaaghPoints, description, activeMission) are often explicitly set to undefined rather
// than omitted, which IndexedDB tolerates but Firestore does not — strip them recursively.
function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

// ── Campaign roster operations ─────────────────────────────────────────────

export async function saveCampaignRoster(roster: CampaignRoster): Promise<void> {
  const db = await getFirebaseDb()
  const { doc, setDoc } = await import('firebase/firestore')
  await setDoc(doc(db, ROSTERS_COLLECTION, roster.id), stripUndefined(roster))
}

export async function getCampaignRoster(id: string): Promise<CampaignRoster | undefined> {
  const db = await getFirebaseDb()
  const { doc, getDoc } = await import('firebase/firestore')
  const snap = await getDoc(doc(db, ROSTERS_COLLECTION, id))
  return snap.exists() ? (snap.data() as CampaignRoster) : undefined
}

export async function listCampaignRosters(): Promise<CampaignRoster[]> {
  const db = await getFirebaseDb()
  const { collection, getDocs } = await import('firebase/firestore')
  const snap = await getDocs(collection(db, ROSTERS_COLLECTION))
  return snap.docs.map((d) => d.data() as CampaignRoster).sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function deleteCampaignRoster(id: string): Promise<void> {
  const db = await getFirebaseDb()
  const { doc, deleteDoc } = await import('firebase/firestore')
  await deleteDoc(doc(db, ROSTERS_COLLECTION, id))
}

// ── Narrative mission operations ───────────────────────────────────────────

export async function saveNarrativeMission(mission: NarrativeMission): Promise<void> {
  const db = await getFirebaseDb()
  const { doc, setDoc } = await import('firebase/firestore')
  await setDoc(doc(db, MISSIONS_COLLECTION, mission.id), stripUndefined(mission))
}

export async function getNarrativeMission(id: string): Promise<NarrativeMission | undefined> {
  const db = await getFirebaseDb()
  const { doc, getDoc } = await import('firebase/firestore')
  const snap = await getDoc(doc(db, MISSIONS_COLLECTION, id))
  return snap.exists() ? (snap.data() as NarrativeMission) : undefined
}

export async function listNarrativeMissions(): Promise<NarrativeMission[]> {
  const db = await getFirebaseDb()
  const { collection, getDocs } = await import('firebase/firestore')
  const snap = await getDocs(collection(db, MISSIONS_COLLECTION))
  return snap.docs.map((d) => d.data() as NarrativeMission).sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function deleteNarrativeMission(id: string): Promise<void> {
  const db = await getFirebaseDb()
  const { doc, deleteDoc } = await import('firebase/firestore')
  await deleteDoc(doc(db, MISSIONS_COLLECTION, id))
}
