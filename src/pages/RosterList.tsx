import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useRosterStore } from '../store/rosterStore'

export default function RosterList() {
  const { rosters, loadRosters, deleteRoster, newRoster } = useRosterStore()
  const navigate = useNavigate()

  useEffect(() => {
    loadRosters()
  }, [loadRosters])

  function handleNew() {
    newRoster()
    navigate('/rosters/new')
  }

  function handleDelete(id: string, name: string) {
    if (confirm(`Delete "${name}"? This cannot be undone.`)) {
      deleteRoster(id)
    }
  }

  function handleImport() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        const { saveRoster } = await import('../services/db')
        if (data.type === 'backup' && Array.isArray(data.rosters)) {
          for (const r of data.rosters) await saveRoster(r)
        } else if (data.type === 'roster' && data.roster) {
          await saveRoster(data.roster)
        } else {
          alert('Unrecognised file format.')
          return
        }
        await loadRosters()
      } catch {
        alert('Failed to import file — is it a valid Strategium Nexus backup?')
      }
    }
    input.click()
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl text-gold tracking-wider">Warband Forge</h1>
          <p className="font-body text-parchment-muted text-sm mt-1">
            Build and manage your army rosters.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleImport} className="btn-ghost text-xs">
            ↑ Import
          </button>
          <button onClick={handleNew} className="btn-primary">
            + New Army
          </button>
        </div>
      </div>

      {rosters.length === 0 ? (
        <div className="card text-center py-16 flex flex-col items-center gap-4">
          <p className="font-display text-4xl text-gold-muted/40">⚔</p>
          <p className="font-heading text-parchment-muted text-sm tracking-wide uppercase">
            No armies yet
          </p>
          <p className="font-body text-parchment-faint text-sm">
            Create your first roster to get started.
          </p>
          <button onClick={handleNew} className="btn-primary mt-2">
            + New Army
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rosters.map((roster) => {
            const pts = 0 // live pts resolved in wizard; show limit here
            void pts
            return (
              <div key={roster.id} className="card flex flex-col gap-3">
                {/* Name + system */}
                <div>
                  <h2 className="font-heading text-gold text-base tracking-wide leading-snug">
                    {roster.name || <span className="text-parchment-faint italic">Unnamed Army</span>}
                  </h2>
                  <p className="font-body text-parchment-muted text-xs mt-0.5">
                    {roster.systemName || '—'} · {roster.catalogueName || '—'}
                  </p>
                  {roster.detachment && (
                    <p className="font-body text-parchment-faint text-xs">{roster.detachment}</p>
                  )}
                </div>
                <div className="divider-gold" />
                {/* Stats row */}
                <div className="flex items-center gap-3 text-xs font-heading tracking-wide text-parchment-muted">
                  <span>{roster.units.length} units</span>
                  <span className="text-gold-muted/40">|</span>
                  <span>{roster.pointsLimit} pts limit</span>
                  <span className="ml-auto text-parchment-faint">
                    {new Date(roster.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                {/* Actions */}
                <div className="flex gap-2 mt-1">
                  <Link
                    to={`/rosters/${roster.id}`}
                    className="btn-primary flex-1 text-center text-xs"
                    onClick={() => useRosterStore.getState().openRoster(roster)}
                  >
                    Open
                  </Link>
                  <Link
                    to={`/rosters/${roster.id}/view`}
                    className="btn-ghost text-xs px-3"
                    onClick={() => useRosterStore.getState().openRoster(roster)}
                  >
                    View
                  </Link>
                  <button
                    onClick={() => handleDelete(roster.id, roster.name)}
                    className="px-3 py-1.5 text-xs font-heading tracking-wide text-blood-light hover:text-blood border border-blood/30 hover:border-blood transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
