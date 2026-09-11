import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useNarrativeStore } from '../../store/narrativeStore'

export default function NarrativeAdminList() {
  const { missions, missionsLoaded, loadMissions, createMission, deleteMission } = useNarrativeStore()
  const navigate = useNavigate()

  useEffect(() => {
    loadMissions()
  }, [loadMissions])

  async function handleNew() {
    const mission = await createMission()
    navigate(`/narrative/${mission.id}/admin`)
  }

  function handleDelete(id: string, title: string) {
    if (confirm(`Delete "${title || 'Untitled Mission'}"? This cannot be undone.`)) deleteMission(id)
  }

  if (!missionsLoaded) return null

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl text-gold tracking-wider">Manage Missions</h1>
          <p className="font-body text-parchment-muted text-sm mt-1">GM-only — includes drafts.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/narrative" className="btn-ghost text-xs">
            &larr; Narrative
          </Link>
          <button onClick={handleNew} className="btn-primary text-xs">
            + New Mission
          </button>
        </div>
      </div>

      {missions.length === 0 ? (
        <div className="card text-center py-16 flex flex-col items-center gap-4">
          <p className="font-heading text-parchment-muted text-sm tracking-wide uppercase">No missions yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {missions.map((mission) => (
            <div key={mission.id} className="card flex items-center gap-4">
              <div className="flex-1">
                <p className="font-heading text-parchment text-sm">{mission.title || 'Untitled Mission'}</p>
                <p className="font-body text-parchment-faint text-xs mt-0.5">
                  Updated {new Date(mission.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <span className={mission.status === 'published' ? 'badge-gold' : 'badge'}>{mission.status}</span>
              <Link to={`/narrative/${mission.id}/admin`} className="btn-ghost text-xs">
                Edit
              </Link>
              <button
                onClick={() => handleDelete(mission.id, mission.title)}
                className="px-3 py-1.5 text-xs font-heading tracking-wide text-blood-light hover:text-blood border border-blood/30 hover:border-blood transition-colors"
              >
                &#10005;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
