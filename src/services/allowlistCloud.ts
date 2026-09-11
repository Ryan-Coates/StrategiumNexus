// Allowlist CRUD — admin-only writes are enforced by firestore.rules, this is just the client wrapper.
import { getFirebaseDb } from './firebase'

export interface AllowlistEntry {
  email: string
  addedAt: number
}

export async function listAllowlist(): Promise<AllowlistEntry[]> {
  const db = await getFirebaseDb()
  const { collection, getDocs } = await import('firebase/firestore')
  const snap = await getDocs(collection(db, 'allowlist'))
  return snap.docs
    .map((d) => ({ email: d.id, addedAt: (d.data().addedAt as number) ?? 0 }))
    .sort((a, b) => a.email.localeCompare(b.email))
}

export async function addAllowlistEntry(email: string): Promise<void> {
  const db = await getFirebaseDb()
  const { doc, setDoc } = await import('firebase/firestore')
  await setDoc(doc(db, 'allowlist', email.trim().toLowerCase()), { addedAt: Date.now() })
}

export async function removeAllowlistEntry(email: string): Promise<void> {
  const db = await getFirebaseDb()
  const { doc, deleteDoc } = await import('firebase/firestore')
  await deleteDoc(doc(db, 'allowlist', email))
}
