import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useNarrativeStore } from '../../store/narrativeStore'

export default function NarrativeList() {
  const { missions, missionsLoaded, loadMissions } = useNarrativeStore()

  useEffect(() => {
    loadMissions()
  }, [loadMissions])

  if (!missionsLoaded) return null

  const published = missions.filter((m) => m.status === 'published')

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl text-gold tracking-wider">Narrative</h1>
          <p className="font-body text-parchment-muted text-sm mt-1">Published campaign missions.</p>
        </div>
        <Link to="/narrative/admin" className="btn-ghost text-xs">
          Manage Missions (GM) &rarr;
        </Link>
      </div>

      {published.length === 0 ? (
        <div className="card text-center py-16 flex flex-col items-center gap-4">
          <p className="font-display text-4xl text-gold-muted/40">&#9876;</p>
          <p className="font-heading text-parchment-muted text-sm tracking-wide uppercase">No missions published yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {published.map((mission) => (
            <Link key={mission.id} to={`/narrative/${mission.id}`} className="card flex flex-col gap-2">
              <h2 className="font-heading text-gold text-base tracking-wide">{mission.title || 'Untitled Mission'}</h2>
              <p className="font-body text-parchment-faint text-xs line-clamp-2">{mission.narrativeText || 'No narrative text yet.'}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
