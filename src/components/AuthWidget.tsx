import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { clearEntryChoice } from '../services/entryChoice'
import Avatar from './Avatar'

// Returns to the entry gate (splash screen) so the visitor can pick shared/local mode again.
function backToEntryGate() {
  clearEntryChoice()
  window.location.reload()
}

export default function AuthWidget() {
  const { status, user, isAdmin, signIn, signOutUser } = useAuthStore()

  if (status === 'loading') return null

  if (status === 'unconfigured') {
    return (
      <button onClick={backToEntryGate} className="btn-ghost text-xs whitespace-nowrap">
        Sign in
      </button>
    )
  }

  if (status === 'signed-out') {
    return (
      <button onClick={() => signIn()} className="btn-ghost text-xs whitespace-nowrap">
        Sign in with Google
      </button>
    )
  }

  if (status === 'pending') {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="badge-blood">Pending approval</span>
        <button onClick={() => signOutUser()} className="btn-ghost text-xs">
          Sign out
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="badge-gold">Shared</span>
      {isAdmin && (
        <Link to="/campaign/admin" className="btn-ghost text-xs">
          Admin
        </Link>
      )}
      <Avatar name={user?.displayName ?? ''} photoUrl={user?.photoUrl} />
      <span className="font-body text-parchment-muted hidden sm:inline">{user?.displayName}</span>
      <button onClick={() => signOutUser()} className="btn-ghost text-xs">
        Sign out
      </button>
    </div>
  )
}
