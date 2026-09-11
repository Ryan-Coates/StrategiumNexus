// Optional Firebase (Auth + Firestore) backend for shared Campaign Mode data.
// Entirely opt-in: if the VITE_FIREBASE_* env vars are not set, isFirebaseConfigured()
// returns false and the app runs fully local/IndexedDB — no Firebase project required.
import type { FirebaseApp } from 'firebase/app'
import type { Auth } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId
  )
}

let initPromise: Promise<{ app: FirebaseApp; auth: Auth; db: Firestore }> | null = null

// Firebase SDK is dynamically imported so it never enters the bundle for local-only users.
function init() {
  if (!initPromise) {
    initPromise = (async () => {
      const { initializeApp } = await import('firebase/app')
      const { getAuth } = await import('firebase/auth')
      const { getFirestore } = await import('firebase/firestore')
      const app = initializeApp(firebaseConfig)
      return { app, auth: getAuth(app), db: getFirestore(app) }
    })()
  }
  return initPromise
}

export async function getFirebaseAuth(): Promise<Auth> {
  const { auth } = await init()
  return auth
}

export async function getFirebaseDb(): Promise<Firestore> {
  const { db } = await init()
  return db
}
