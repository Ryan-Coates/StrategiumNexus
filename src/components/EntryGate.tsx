import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Spinner from './Spinner'
import { useAuthStore } from '../store/authStore'
import { isFirebaseConfigured } from '../services/firebase'
import { hasEntryChoice, setEntryChoice } from '../services/entryChoice'

// First screen the app shows, before any route renders. Lets a visitor pick shared
// (Google-authenticated, Firestore-backed) mode or local-only (IndexedDB, this device
// only) mode. This is an onboarding affordance, not a security boundary — nothing here
// is enforced server-side beyond the existing Firestore rules for shared-mode data.
export default function EntryGate() {
  const { status, signIn } = useAuthStore()
  const [choiceMade, setChoiceMade] = useState(hasEntryChoice)
  const configured = isFirebaseConfigured()

  if (configured && (status === 'active' || status === 'pending')) return <Outlet />
  if (configured && status === 'loading') return <FullPageSpinner />
  if (choiceMade) return <Outlet />

  function continueLocally() {
    setEntryChoice()
    setChoiceMade(true)
  }

  function handleSignIn() {
    setEntryChoice()
    signIn()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-void-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <p className="font-display text-gold text-lg md:text-xl tracking-[0.2em] uppercase">
            Strategium Nexus
          </p>
        </div>

        <div className="card flex flex-col gap-5 text-center">
          <div>
            <h1 className="font-heading text-sm tracking-widest uppercase text-parchment">
              Choose How to Play
            </h1>
            <p className="font-body text-parchment-muted text-sm mt-2">
              This only needs to be picked once per device.
            </p>
          </div>

          <div className="divider-gold" />

          <div className="flex flex-col gap-2 text-left">
            <button
              onClick={handleSignIn}
              disabled={!configured}
              className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Sign in with Google
            </button>
            <p className="font-body text-parchment-faint text-xs">
              {configured
                ? 'Shares rosters and narrative missions with the rest of the club.'
                : 'Not available on this deployment — no Firebase project is configured yet.'}
            </p>
          </div>

          <div className="flex flex-col gap-2 text-left">
            <button onClick={continueLocally} className="btn-ghost text-sm">
              Continue Without Signing In
            </button>
            <p className="font-body text-parchment-faint text-xs">
              Everything stays on this device only — good for testing or solo play. Nothing is
              shared, and you can sign in later from the header.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-void-950">
      <Spinner label="Checking sign-in status..." />
    </div>
  )
}
