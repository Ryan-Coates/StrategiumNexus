import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { delete11eRoster, list11eRosters } from '../../services/wh40k11eRosterDb'
import { ALL_FACTIONS } from '../../services/wh40k11eRosterRules'
import type { Wh40k11eRoster } from '../../types/wh40k11eRoster'

export default function Wh40k11eArmyList() {
  const [rosters, setRosters] = useState<Wh40k11eRoster[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    list11eRosters().then(setRosters).catch((cause: unknown) =>
      setError(cause instanceof Error ? cause.message : 'Could not load 11th edition armies.'))
  }, [])

  async function remove(roster: Wh40k11eRoster) {
    if (!confirm(`Delete "${roster.name}" and its unit images? This cannot be undone.`)) return
    setBusy(true)
    setError('')
    try {
      await delete11eRoster(roster.id)
      setRosters((current) => current.filter((entry) => entry.id !== roster.id))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete the army.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mb-8">
      <div className="flex flex-wrap justify-between gap-3 items-center mb-4">
        <h2 className="font-heading text-gold text-xl">11th edition armies</h2>
        <Link to="/rosters/11e/new" className="btn-primary text-xs">+ New 11th edition army</Link>
      </div>
      {error && <p role="alert" className="text-blood-light mb-3">{error}</p>}
      {!rosters.length && !error && (
        <p className="text-parchment-muted text-sm">Create an army using the supplied faction rules and official MFM points.</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rosters.map((roster) => (
          <article key={roster.id} className="card flex flex-col gap-3">
            {roster.image && <img src={roster.image} alt={roster.name} className="h-36 w-full object-cover" />}
            <h3 className="font-heading text-gold">{roster.name}</h3>
            {roster.description && <p className="text-sm text-parchment-muted whitespace-pre-line">{roster.description}</p>}
            <p className="text-xs text-parchment-faint">{roster.units.length} units · {roster.factionId === ALL_FACTIONS ? `All factions (unrestricted) · ${roster.pointsLimit} pts target` : `${roster.detachmentIds.length} detachments · ${roster.pointsLimit} pts limit`}</p>
            <div className="flex flex-wrap gap-2 mt-auto">
              <Link to={`/rosters/11e/${roster.id}`} className="btn-primary text-xs">Edit</Link>
              <Link to={`/rosters/11e/${roster.id}/view`} className="btn-ghost text-xs">View rules</Link>
              <button type="button" disabled={busy} onClick={() => void remove(roster)}
                className="btn-ghost text-xs text-blood-light">Delete</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
