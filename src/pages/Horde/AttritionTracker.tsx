import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useHordeStore } from '../../store/hordeStore'
import { CAMPAIGN_POOL_CAP, calcReinforcementPoints } from '../../services/hordeMechanics'

export default function AttritionTracker() {
  const { roster, rosterLoaded, loadRoster, setThreatLevel, adjustCampaignPool, setCommittedPoints, setCasualtyPoints, resetCasualties, completeMission } =
    useHordeStore()

  const [poolAdjustment, setPoolAdjustment] = useState('')
  const [lastRp, setLastRp] = useState<number | null>(null)

  useEffect(() => {
    loadRoster()
  }, [loadRoster])

  function handleAdjustPool(sign: 1 | -1) {
    const amount = Number(poolAdjustment)
    if (!amount) return
    adjustCampaignPool(sign * amount)
    setPoolAdjustment('')
  }

  async function handleCompleteMission() {
    if (!confirm('Complete this mission? This banks your Reinforcement Points and resets Committed/Casualty Points for next time.')) return
    const rp = await completeMission()
    setLastRp(rp)
  }

  if (!rosterLoaded) return null

  const projectedRp = calcReinforcementPoints(roster.committedPoints, roster.casualtyPoints, roster.threatLevel)

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl text-gold tracking-wider">Attrition Tracker</h1>
          <p className="font-body text-parchment-muted text-sm mt-1">
            Enter your mission's Committed and Casualty Points to work out Reinforcement Points earned.
          </p>
        </div>
        <Link to="/horde" className="btn-ghost text-xs">
          &larr; Horde Mode
        </Link>
      </div>

      <div className="flex flex-col gap-4">
        <div className="card flex flex-wrap items-end gap-4">
          <div>
            <p className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint">Campaign Pool</p>
            <p className="font-body text-gold text-lg mt-1">
              {roster.campaignPool} / {CAMPAIGN_POOL_CAP}
            </p>
          </div>
          <label className="flex flex-col gap-1 text-xs font-heading tracking-widest uppercase text-parchment-faint">
            Adjust Pool
            <input
              type="number"
              value={poolAdjustment}
              onChange={(e) => setPoolAdjustment(e.target.value)}
              className="bg-void-900 border border-gold-muted/30 text-parchment text-sm px-2 py-1.5 font-body w-24"
            />
          </label>
          <button onClick={() => handleAdjustPool(1)} className="btn-ghost text-xs">
            + Add
          </button>
          <button onClick={() => handleAdjustPool(-1)} className="btn-ghost text-xs">
            &minus; Subtract
          </button>
          <label className="flex flex-col gap-1 text-xs font-heading tracking-widest uppercase text-parchment-faint ml-auto">
            Threat Level
            <input
              type="number"
              min={0}
              value={roster.threatLevel}
              onChange={(e) => setThreatLevel(Number(e.target.value) || 0)}
              className="bg-void-900 border border-gold-muted/30 text-parchment text-sm px-2 py-1.5 font-body w-20"
            />
          </label>
        </div>

        <div className="card flex flex-wrap items-end gap-6">
          <label className="flex flex-col gap-1 text-xs font-heading tracking-widest uppercase text-parchment-faint">
            Committed Points
            <input
              type="number"
              min={0}
              value={roster.committedPoints}
              onChange={(e) => setCommittedPoints(Number(e.target.value) || 0)}
              className="bg-void-900 border border-gold-muted/30 text-parchment text-sm px-2 py-1.5 font-body w-28"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-heading tracking-widest uppercase text-parchment-faint">
            Casualty Points
            <input
              type="number"
              min={0}
              value={roster.casualtyPoints}
              onChange={(e) => setCasualtyPoints(Number(e.target.value) || 0)}
              className="bg-void-900 border border-gold-muted/30 text-parchment text-sm px-2 py-1.5 font-body w-28"
            />
          </label>
          <div>
            <p className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint">Reinforcement Points</p>
            <p className="font-body text-gold text-lg mt-1">+{projectedRp}</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button onClick={resetCasualties} className="btn-ghost text-xs">
              Reset Casualties
            </button>
            <button onClick={handleCompleteMission} className="btn-primary text-xs">
              Complete Mission &rarr;
            </button>
          </div>
        </div>
        {lastRp !== null && (
          <p className="font-body text-sm text-gold italic">
            Mission complete — banked +{lastRp} RP. Campaign Pool is now {roster.campaignPool} / {CAMPAIGN_POOL_CAP}.
          </p>
        )}
      </div>
    </div>
  )
}
