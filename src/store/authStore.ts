import { create } from 'zustand'
import { isFirebaseConfigured, getFirebaseAuth, getFirebaseDb } from '../services/firebase'
import { isAdminEmail } from '../services/adminConfig'

// 'unconfigured' — no Firebase env vars set, app is local-only, no sign-in offered.
// 'loading'      — Firebase configured, waiting on the initial auth state.
// 'signed-out'   — Firebase configured, no user signed in (local mode).
// 'pending'      — signed in with Google, but the email isn't on the allowlist yet.
// 'active'       — signed in and allowlisted — shared (Firestore) mode is live.
export type AuthStatus = 'unconfigured' | 'loading' | 'signed-out' | 'pending' | 'active'

interface AuthUser {
  uid: string
  email: string
  displayName: string
  photoUrl: string | null
}

interface AuthStore {
  status: AuthStatus
  user: AuthUser | null
  /** Which persistence backend campaignBackend.ts should use. */
  mode: 'local' | 'shared'
  /** Hardcoded admin(s) — can manage the allowlist from /campaign/admin. */
  isAdmin: boolean
  init: () => void
  signIn: () => Promise<void>
  signOutUser: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
  status: isFirebaseConfigured() ? 'loading' : 'unconfigured',
  user: null,
  mode: 'local',
  isAdmin: false,

  init() {
    if (!isFirebaseConfigured()) {
      set({ status: 'unconfigured', mode: 'local' })
      return
    }

    let handledFirstEvent = false

    getFirebaseAuth().then(async (auth) => {
      const { onAuthStateChanged } = await import('firebase/auth')
      onAuthStateChanged(auth, async (firebaseUser) => {
        // After the app has already settled once, any further auth change (sign in/out,
        // switching accounts) reloads the page so every store re-fetches from the right backend.
        const isFirstEvent = !handledFirstEvent
        handledFirstEvent = true

        if (!firebaseUser || !firebaseUser.email) {
          set({ status: 'signed-out', user: null, mode: 'local', isAdmin: false })
          if (!isFirstEvent) window.location.reload()
          return
        }

        const user: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName ?? firebaseUser.email,
          photoUrl: firebaseUser.photoURL,
        }

        if (isAdminEmail(firebaseUser.email)) {
          set({ status: 'active', user, mode: 'shared', isAdmin: true })
          if (!isFirstEvent) window.location.reload()
          return
        }

        const db = await getFirebaseDb()
        const { doc, getDoc } = await import('firebase/firestore')
        const allowSnap = await getDoc(doc(db, 'allowlist', firebaseUser.email))

        if (allowSnap.exists()) {
          set({ status: 'active', user, mode: 'shared', isAdmin: false })
        } else {
          set({ status: 'pending', user, mode: 'local', isAdmin: false })
        }
        if (!isFirstEvent) window.location.reload()
      })
    })
  },

  async signIn() {
    const auth = await getFirebaseAuth()
    const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth')
    await signInWithPopup(auth, new GoogleAuthProvider())
  },

  async signOutUser() {
    const auth = await getFirebaseAuth()
    const { signOut } = await import('firebase/auth')
    await signOut(auth)
  },
}))
