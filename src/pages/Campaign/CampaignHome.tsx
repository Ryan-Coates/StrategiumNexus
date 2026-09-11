import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCampaignStore } from '../../store/campaignStore'
import type { CampaignFaction } from '../../types/campaign'

export default function CampaignHome() {
  const { rosters, rostersLoaded, loadRosters, createRoster, deleteRoster } = useCampaignStore()
  const [playerName, setPlayerName] = useState('')
  const [faction, setFaction] = useState<CampaignFaction>('imperial')

  useEffect(() => {
    loadRosters()
  }, [loadRosters])

  async function handleCreate() {
    if (!playerName.trim()) return
    await createRoster(playerName.trim(), faction)
    setPlayerName('')
  }

  function handleDelete(id: string, name: string) {
    if (confirm(`Delete "${name}"'s roster? This cannot be undone.`)) {
      deleteRoster(id)
    }
  }

  if (!rostersLoaded) return null

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl text-gold tracking-wider">Rosters</h1>
          <p className="font-body text-parchment-muted text-sm mt-1">
            Simple standalone rosters for the narrative campaign — permanent casualties, earned Enhancements.
          </p>
        </div>
        <Link to="/campaign" className="btn-ghost text-xs">
          &larr; Tides of Meridian Campaign
        </Link>
      </div>

      <div className="card flex flex-wrap items-end gap-4 mb-6">
        <label className="flex flex-col gap-1 text-xs font-heading tracking-widest uppercase text-parchment-faint">
          Player Name
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="e.g. Marcus"
            className="bg-void-900 border border-gold-muted/30 text-parchment text-sm px-2 py-1.5 font-body w-48"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-heading tracking-widest uppercase text-parchment-faint">
          Faction
          <select
            value={faction}
            onChange={(e) => setFaction(e.target.value as CampaignFaction)}
            className="bg-void-900 border border-gold-muted/30 text-parchment text-sm px-2 py-1.5 font-body w-40"
          >
            <option value="imperial">Imperial (2,000 pts)</option>
            <option value="ork">Ork (3,000 pts)</option>
          </select>
        </label>
        <button onClick={handleCreate} className="btn-primary text-xs">
          + New Roster
        </button>
      </div>

      {rosters.length === 0 ? (
        <div className="card text-center py-16 flex flex-col items-center gap-4">
          <p className="font-display text-4xl text-gold-muted/40">&#9876;</p>
          <p className="font-heading text-parchment-muted text-sm tracking-wide uppercase">No rosters yet</p>
          <p className="font-body text-parchment-faint text-sm">Create a roster above to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rosters.map((roster) => {
            const pointsUsed = roster.units.reduce((sum, u) => sum + u.pointsCost, 0)
            return (
              <div key={roster.id} className="card flex flex-col gap-3">
                <div>
                  <h2 className="font-heading text-gold text-base tracking-wide leading-snug">{roster.playerName}</h2>
                  <p className="font-body text-parchment-muted text-xs mt-0.5 capitalize">{roster.faction}</p>
                </div>
                <div className="divider-gold" />
                <div className="flex items-center gap-3 text-xs font-heading tracking-wide text-parchment-muted">
                  <span>{roster.units.length} units</span>
                  <span className="text-gold-muted/40">|</span>
                  <span>
                    {pointsUsed} / {roster.pointsLimit} pts
                  </span>
                  {roster.faction === 'ork' && (
                    <span className="ml-auto badge-gold">{roster.waaaghPoints ?? 0} WP</span>
                  )}
                </div>
                {roster.activeMission && (
                  <p className="badge-blood self-start">Mission In Progress</p>
                )}
                <div className="flex gap-2 mt-1">
                  <Link to={`/campaign/rosters/${roster.id}`} className="btn-primary flex-1 text-center text-xs">
                    Open
                  </Link>
                  <button
                    onClick={() => handleDelete(roster.id, roster.playerName)}
                    className="px-3 py-1.5 text-xs font-heading tracking-wide text-blood-light hover:text-blood border border-blood/30 hover:border-blood transition-colors"
                  >
                    &#10005;
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
