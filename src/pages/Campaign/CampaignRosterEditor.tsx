import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCampaignStore } from '../../store/campaignStore'

export default function CampaignRosterEditor() {
  const { rosterId } = useParams<{ rosterId: string }>()
  const navigate = useNavigate()
  const {
    current,
    loadRoster,
    addUnit,
    updateUnit,
    removeUnit,
    addEnhancement,
    removeEnhancement,
    setWaaaghPoints,
    setDescription,
  } = useCampaignStore()

  const [name, setName] = useState('')
  const [datasheetName, setDatasheetName] = useState('')
  const [pointsCost, setPointsCost] = useState('')
  const [modelCount, setModelCount] = useState('1')
  const [isCharacter, setIsCharacter] = useState(false)
  const [enhancementDrafts, setEnhancementDrafts] = useState<Record<string, string>>({})

  useEffect(() => {
    if (rosterId) loadRoster(rosterId)
  }, [rosterId, loadRoster])

  if (!current) return null

  const pointsUsed = current.units.reduce((sum, u) => sum + u.pointsCost, 0)
  const overCap = pointsUsed > current.pointsLimit

  function handleAddUnit() {
    if (!name.trim() || !pointsCost) return
    addUnit({
      name: name.trim(),
      datasheetName: datasheetName.trim(),
      pointsCost: Number(pointsCost) || 0,
      modelCount: Math.max(1, Number(modelCount) || 1),
      isCharacter,
      about: '',
      enhancements: [],
    })
    setName('')
    setDatasheetName('')
    setPointsCost('')
    setModelCount('1')
    setIsCharacter(false)
  }

  function handleRemoveUnit(id: string, unitName: string) {
    if (confirm(`Remove "${unitName}" from the roster?`)) removeUnit(id)
  }

  function handleAddEnhancement(unitId: string) {
    const text = enhancementDrafts[unitId]
    if (!text?.trim()) return
    addEnhancement(unitId, text.trim())
    setEnhancementDrafts((prev) => ({ ...prev, [unitId]: '' }))
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl text-gold tracking-wider">{current.playerName}</h1>
          <p className="font-body text-parchment-muted text-sm mt-1 capitalize">
            {current.faction} — {pointsUsed} / {current.pointsLimit} pts
            {overCap && <span className="text-blood-light"> (over cap)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/campaign/rosters" className="btn-ghost text-xs">
            &larr; Rosters
          </Link>
          {current.activeMission ? (
            <button onClick={() => navigate(`/campaign/rosters/${current.id}/mission`)} className="btn-primary text-xs">
              Continue Mission &rarr;
            </button>
          ) : (
            <button onClick={() => navigate(`/campaign/rosters/${current.id}/mission`)} className="btn-primary text-xs">
              Start Mission &rarr;
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="card">
          <p className="card-header">Description</p>
          <textarea
            value={current.description ?? ''}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Warband background, theme, campaign notes..."
            rows={3}
            className="bg-void-900 border border-gold-muted/30 text-parchment text-sm px-2 py-1.5 font-body w-full resize-y leading-snug"
          />
        </div>

        {current.faction === 'ork' && (
          <div className="card flex items-end gap-4">
            <label className="flex flex-col gap-1 text-xs font-heading tracking-widest uppercase text-parchment-faint">
              Waaagh Points
              <input
                type="number"
                min={0}
                value={current.waaaghPoints ?? 0}
                onChange={(e) => setWaaaghPoints(Number(e.target.value) || 0)}
                className="bg-void-900 border border-gold-muted/30 text-parchment text-sm px-2 py-1.5 font-body w-24"
              />
            </label>
            <p className="font-body text-parchment-faint text-xs pb-2">
              Persists across missions — this is a reinforcement resource, not the roster's build cap.
              Add more forces to an active mission to match it (see Mission screen).
            </p>
          </div>
        )}

        <div className="card">
          <p className="card-header">Add Unit</p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs font-heading tracking-widest uppercase text-parchment-faint">
              Unit Name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-void-900 border border-gold-muted/30 text-parchment text-sm px-2 py-1.5 font-body w-48"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-heading tracking-widest uppercase text-parchment-faint">
              Datasheet
              <input
                type="text"
                value={datasheetName}
                onChange={(e) => setDatasheetName(e.target.value)}
                placeholder="e.g. Warboss"
                className="bg-void-900 border border-gold-muted/30 text-parchment text-sm px-2 py-1.5 font-body w-48"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-heading tracking-widest uppercase text-parchment-faint">
              Points
              <input
                type="number"
                min={0}
                value={pointsCost}
                onChange={(e) => setPointsCost(e.target.value)}
                className="bg-void-900 border border-gold-muted/30 text-parchment text-sm px-2 py-1.5 font-body w-24"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-heading tracking-widest uppercase text-parchment-faint">
              Models
              <input
                type="number"
                min={1}
                value={modelCount}
                onChange={(e) => setModelCount(e.target.value)}
                className="bg-void-900 border border-gold-muted/30 text-parchment text-sm px-2 py-1.5 font-body w-20"
              />
            </label>
            <label className="flex items-center gap-2 text-xs font-heading tracking-widest uppercase text-parchment-faint pb-1.5">
              <input type="checkbox" checked={isCharacter} onChange={(e) => setIsCharacter(e.target.checked)} />
              Character
            </label>
            <button onClick={handleAddUnit} className="btn-primary text-xs">
              + Add
            </button>
          </div>
        </div>

        <div className="card">
          <p className="card-header">Units</p>
          {current.units.length === 0 ? (
            <p className="font-body text-parchment-faint text-sm">No units yet — add some above.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {current.units.map((unit) => (
                <div key={unit.id} className="flex flex-col gap-2 pb-4 border-b border-gold-muted/10 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1 text-xs font-heading tracking-widest uppercase text-parchment-faint flex-1 min-w-[12rem]">
                      Name
                      <input
                        type="text"
                        value={unit.name}
                        onChange={(e) => updateUnit(unit.id, { name: e.target.value })}
                        className="bg-void-900 border border-gold-muted/30 text-parchment text-sm px-2 py-1.5 font-body w-full"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-heading tracking-widest uppercase text-parchment-faint flex-1 min-w-[12rem]">
                      Datasheet
                      <input
                        type="text"
                        value={unit.datasheetName}
                        onChange={(e) => updateUnit(unit.id, { datasheetName: e.target.value })}
                        placeholder="e.g. Warboss"
                        className="bg-void-900 border border-gold-muted/30 text-parchment text-sm px-2 py-1.5 font-body w-full"
                      />
                    </label>
                    <p className="font-body text-parchment-faint text-xs whitespace-nowrap pb-1.5">
                      {unit.pointsCost} pts &middot; {unit.modelCount} model{unit.modelCount === 1 ? '' : 's'}
                      {unit.isCharacter && <span className="badge-gold ml-2">Character</span>}
                    </p>
                    <button
                      onClick={() => handleRemoveUnit(unit.id, unit.name)}
                      className="px-3 py-1.5 text-xs font-heading tracking-wide text-blood-light hover:text-blood border border-blood/30 hover:border-blood transition-colors"
                    >
                      &#10005;
                    </button>
                  </div>

                  <label className="flex flex-col gap-1 text-xs font-heading tracking-widest uppercase text-parchment-faint">
                    About
                    <textarea
                      value={unit.about}
                      onChange={(e) => updateUnit(unit.id, { about: e.target.value })}
                      placeholder="Background / description..."
                      rows={2}
                      className="bg-void-900 border border-gold-muted/30 text-parchment text-sm px-2 py-1.5 font-body w-full resize-y leading-snug"
                    />
                  </label>

                  <div className="flex flex-wrap items-center gap-2">
                    {unit.enhancements.map((enh, i) => (
                      <span key={i} className="badge-gold flex items-center gap-1.5">
                        {enh}
                        <button onClick={() => removeEnhancement(unit.id, i)} className="hover:text-blood-light">
                          &#10005;
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={enhancementDrafts[unit.id] ?? ''}
                      onChange={(e) => setEnhancementDrafts((prev) => ({ ...prev, [unit.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddEnhancement(unit.id)}
                      placeholder="Add Enhancement"
                      className="bg-void-900 border border-gold-muted/30 text-parchment text-xs px-2 py-1 font-body w-40"
                    />
                    <button onClick={() => handleAddEnhancement(unit.id)} className="btn-ghost text-xs px-2 py-1">
                      + Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {current.missionHistory.length > 0 && (
          <div className="card">
            <p className="card-header">Mission History</p>
            <div className="flex flex-col gap-3">
              {current.missionHistory.map((log) => (
                <div key={log.id} className="pb-3 border-b border-gold-muted/10 last:border-0 last:pb-0">
                  <p className="font-heading text-parchment text-sm">
                    {log.label} <span className="text-parchment-faint font-body text-xs">— {new Date(log.playedAt).toLocaleDateString()}</span>
                  </p>
                  <p className="font-body text-parchment-muted text-xs mt-0.5">
                    Committed {log.committedPoints} pts
                    {log.casualties.length > 0 && (
                      <>
                        {' '}
                        &middot; Casualties:{' '}
                        {log.casualties.map((c) => `${c.unitName} (-${c.modelsLost}${c.wiped ? ', wiped' : ''})`).join(', ')}
                      </>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
