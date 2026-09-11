import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { addAllowlistEntry, listAllowlist, removeAllowlistEntry, type AllowlistEntry } from '../../services/allowlistCloud'

export default function CampaignAdmin() {
  const { status, isAdmin } = useAuthStore()
  const [entries, setEntries] = useState<AllowlistEntry[] | null>(null)
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isAdmin) listAllowlist().then(setEntries)
  }, [isAdmin])

  async function handleAdd() {
    setError('')
    const trimmed = email.trim().toLowerCase()
    if (!trimmed.includes('@')) {
      setError('Enter a valid email address.')
      return
    }
    await addAllowlistEntry(trimmed)
    setEmail('')
    setEntries(await listAllowlist())
  }

  async function handleRemove(entryEmail: string) {
    if (!confirm(`Remove access for "${entryEmail}"?`)) return
    await removeAllowlistEntry(entryEmail)
    setEntries(await listAllowlist())
  }

  if (status !== 'active' || !isAdmin) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center py-12">
          <p className="font-heading text-parchment-muted text-sm tracking-wide uppercase">Not authorized</p>
          <p className="font-body text-parchment-faint text-sm mt-2">This area is restricted to the campaign admin.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl text-gold tracking-wider">Manage Access</h1>
          <p className="font-body text-parchment-muted text-sm mt-1">
            Add or remove club members allowed to use shared Campaign Mode.
          </p>
        </div>
        <Link to="/campaign" className="btn-ghost text-xs">
          &larr; Tides of Meridian Campaign
        </Link>
      </div>

      <div className="card flex flex-wrap items-end gap-3 mb-6">
        <label className="flex flex-col gap-1 text-xs font-heading tracking-widest uppercase text-parchment-faint flex-1 min-w-[14rem]">
          Google Account Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="member@gmail.com"
            className="bg-void-900 border border-gold-muted/30 text-parchment text-sm px-2 py-1.5 font-body w-full"
          />
        </label>
        <button onClick={handleAdd} className="btn-primary text-xs">
          + Grant Access
        </button>
      </div>
      {error && <p className="font-body text-blood-light text-xs -mt-4 mb-4">{error}</p>}

      <div className="card">
        <p className="card-header">Allowed Members</p>
        {entries === null ? (
          <p className="font-body text-parchment-faint text-sm">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="font-body text-parchment-faint text-sm">No members added yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map((entry) => (
              <div key={entry.email} className="flex items-center justify-between gap-3 pb-2 border-b border-gold-muted/10 last:border-0 last:pb-0">
                <span className="font-body text-parchment text-sm">{entry.email}</span>
                <button
                  onClick={() => handleRemove(entry.email)}
                  className="px-3 py-1 text-xs font-heading tracking-wide text-blood-light hover:text-blood border border-blood/30 hover:border-blood transition-colors"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
