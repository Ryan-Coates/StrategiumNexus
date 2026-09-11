import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCampaignStore } from '../../store/campaignStore'

export default function CampaignMission() {
  const { rosterId } = useParams<{ rosterId: string }>()
  const navigate = useNavigate()
  const { current, loadRoster, startMission, addUnitsToMission, setCasualtyDraft, cancelMission, endMission } = useCampaignStore()

  const [label, setLabel] = useState('')
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([])
  const [reinforceUnitIds, setReinforceUnitIds] = useState<string[]>([])

  useEffect(() => {
    if (rosterId) loadRoster(rosterId)
  }, [rosterId, loadRoster])

  if (!current) return null

  const rosterIdForNav = current.id
  const activeMission = current.activeMission

  function toggleUnit(id: string) {
    setSelectedUnitIds((prev) => (prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]))
  }

  async function handleBegin() {
    if (!label.trim() || selectedUnitIds.length === 0) return
    await startMission(label.trim(), selectedUnitIds)
  }

  async function handleEnd() {
    if (!confirm('End mission? This permanently applies casualties to the roster.')) return
    await endMission()
    navigate(`/campaign/rosters/${rosterIdForNav}`)
  }

  async function handleCancel() {
    if (!confirm('Cancel this mission? No casualties will be applied.')) return
    await cancelMission()
  }

  function toggleReinforceUnit(id: string) {
    setReinforceUnitIds((prev) => (prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]))
  }

  async function handleAddReinforcements() {
    if (reinforceUnitIds.length === 0) return
    await addUnitsToMission(reinforceUnitIds)
    setReinforceUnitIds([])
  }

  if (!activeMission) {
    const committedPoints = current.units
      .filter((u) => selectedUnitIds.includes(u.id))
      .reduce((sum, u) => sum + u.pointsCost, 0)

    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-2xl text-gold tracking-wider">Start Mission</h1>
            <p className="font-body text-parchment-muted text-sm mt-1">
              {current.playerName} — select units to commit. No cap enforced; commit whatever fits the game you're playing.
            </p>
          </div>
          <Link to={`/campaign/rosters/${current.id}`} className="btn-ghost text-xs">
            &larr; Roster
          </Link>
        </div>

        <div className="card flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-xs font-heading tracking-widest uppercase text-parchment-faint">
            Mission Label
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder='e.g. "Mission 3 - Siege of X"'
              className="bg-void-900 border border-gold-muted/30 text-parchment text-sm px-2 py-1.5 font-body"
            />
          </label>

          {current.units.length === 0 ? (
            <p className="font-body text-parchment-faint text-sm">No units in this roster yet — add some first.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {current.units.map((unit) => (
                <label key={unit.id} className="flex items-center gap-3 text-sm font-body text-parchment cursor-pointer">
                  <input type="checkbox" checked={selectedUnitIds.includes(unit.id)} onChange={() => toggleUnit(unit.id)} />
                  {unit.name}
                  {unit.datasheetName && <span className="text-parchment-faint text-xs"> ({unit.datasheetName})</span>} <span className="text-parchment-faint text-xs">({unit.pointsCost} pts, {unit.modelCount} models)</span>
                </label>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="font-body text-parchment-muted text-xs">Committed: {committedPoints} pts</p>
            <button onClick={handleBegin} disabled={!label.trim() || selectedUnitIds.length === 0} className="btn-primary text-xs disabled:opacity-40 disabled:cursor-not-allowed">
              Begin Mission &rarr;
            </button>
          </div>
        </div>
      </div>
    )
  }

  const committedUnits = current.units.filter((u) => activeMission.committedUnitIds.includes(u.id))

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl text-gold tracking-wider">{activeMission.label}</h1>
          <p className="font-body text-parchment-muted text-sm mt-1">In Mission — track casualties as the game is played.</p>
        </div>
        <Link to={`/campaign/rosters/${current.id}`} className="btn-ghost text-xs">
          &larr; Roster
        </Link>
      </div>

      {current.faction === 'ork' && (
        <div className="card flex items-end gap-4 mb-4">
          <label className="flex flex-col gap-1 text-xs font-heading tracking-widest uppercase text-parchment-faint">
            Waaagh Points
            <input
              type="number"
              min={0}
              value={current.waaaghPoints ?? 0}
              onChange={(e) => useCampaignStore.getState().setWaaaghPoints(Number(e.target.value) || 0)}
              className="bg-void-900 border border-gold-muted/30 text-parchment text-sm px-2 py-1.5 font-body w-24"
            />
          </label>
          <p className="font-body text-parchment-faint text-xs pb-2">Raise WP to bring in more forces below — it carries over after this mission too.</p>
        </div>
      )}

      {current.faction === 'ork' && current.units.some((u) => !activeMission.committedUnitIds.includes(u.id)) && (
        <div className="card flex flex-col gap-3 mb-4">
          <p className="card-header">Add Reinforcements</p>
          <p className="font-body text-parchment-faint text-xs -mt-2">
            Waaagh allowance: {current.waaaghPoints ?? 0} WP &times; 100 = {(current.waaaghPoints ?? 0) * 100} pts (guidance only, not enforced).
          </p>
          <div className="flex flex-col gap-2">
            {current.units
              .filter((u) => !activeMission.committedUnitIds.includes(u.id))
              .map((unit) => (
                <label key={unit.id} className="flex items-center gap-3 text-sm font-body text-parchment cursor-pointer">
                  <input type="checkbox" checked={reinforceUnitIds.includes(unit.id)} onChange={() => toggleReinforceUnit(unit.id)} />
                  {unit.name}
                  {unit.datasheetName && <span className="text-parchment-faint text-xs"> ({unit.datasheetName})</span>} <span className="text-parchment-faint text-xs">({unit.pointsCost} pts)</span>
                </label>
              ))}
          </div>
          <button onClick={handleAddReinforcements} disabled={reinforceUnitIds.length === 0} className="btn-ghost text-xs self-start disabled:opacity-40 disabled:cursor-not-allowed">
            + Bring In Reinforcements
          </button>
        </div>
      )}

      <div className="card flex flex-col gap-3 mb-4">
        <p className="card-header">Casualties</p>
        {committedUnits.map((unit) => (
          <div key={unit.id} className="flex items-center gap-3 pb-3 border-b border-gold-muted/10 last:border-0 last:pb-0">
            <div className="min-w-[10rem]">
              <p className="font-heading text-parchment text-sm">
                {unit.name}
                {unit.datasheetName && <span className="text-parchment-faint text-xs"> ({unit.datasheetName})</span>}
              </p>
              <p className="font-body text-parchment-faint text-xs">{unit.modelCount} models</p>
            </div>
            <label className="flex flex-col gap-1 text-xs font-heading tracking-widest uppercase text-parchment-faint">
              Models Lost
              <input
                type="number"
                min={0}
                max={unit.modelCount}
                value={activeMission.casualtyDraft[unit.id] ?? 0}
                onChange={(e) => setCasualtyDraft(unit.id, Math.min(unit.modelCount, Number(e.target.value) || 0))}
                className="bg-void-900 border border-gold-muted/30 text-parchment text-sm px-2 py-1.5 font-body w-20"
              />
            </label>
            {(activeMission.casualtyDraft[unit.id] ?? 0) >= unit.modelCount && (
              <span className="badge-blood">Wiped</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={handleCancel} className="btn-ghost text-xs">
          Cancel Mission
        </button>
        <button onClick={handleEnd} className="btn-primary text-xs">
          End Mission &rarr;
        </button>
      </div>
    </div>
  )
}
