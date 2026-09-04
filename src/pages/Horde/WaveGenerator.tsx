import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useHordeStore } from '../../store/hordeStore'
import { calcDespairCardCount, calcRoundModifier, tierLabelForPoints, zoneCountForGameSize } from '../../services/hordeMechanics'
import type { GameSize, SpawnTableEntry } from '../../types/horde'

const CATEGORY_BADGE: Record<string, string> = {
  penalty: 'badge-blood',
  boost: 'badge-blood',
  environmental: 'badge border-gold-muted/30 text-parchment-muted',
  boon: 'badge-gold',
}

/** Generated waves show just tier + WP, not the full unit examples (those live in the table editor). */
function summarizeUnits(units: SpawnTableEntry[]): string {
  const counts = new Map<number, number>()
  for (const u of units) counts.set(u.pointsCost, (counts.get(u.pointsCost) ?? 0) + 1)
  return [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([pointsCost, count]) => `${tierLabelForPoints(pointsCost)} (${pointsCost}WP)${count > 1 ? ` x${count}` : ''}`)
    .join(', ')
}

export default function WaveGenerator() {
  const {
    session,
    sessionLoaded,
    loadSession,
    setGameSize,
    setRound,
    setManualModifier,
    addSpawnTableEntry,
    removeSpawnTableEntry,
    rollRound,
    rollExtraZone,
    clearHistory,
    resetSession,
  } = useHordeStore()

  const [unitName, setUnitName] = useState('')
  const [unitCost, setUnitCost] = useState('')

  useEffect(() => {
    loadSession()
  }, [loadSession])

  function handleAddEntry() {
    const cost = Number(unitCost)
    if (!unitName.trim() || Number.isNaN(cost) || cost <= 0) return
    addSpawnTableEntry({ unitName: unitName.trim(), pointsCost: cost })
    setUnitName('')
    setUnitCost('')
  }

  function handleResetGame() {
    if (confirm('Start a new game? This resets the round to 1, clears wave history, and reshuffles the Despair deck (your Chaos Wave Table is kept).')) {
      resetSession()
    }
  }

  if (!sessionLoaded) return null

  const zoneCount = zoneCountForGameSize(session.gameSize)
  const roundModifier = calcRoundModifier(session.round)
  const totalModifier = roundModifier + session.manualModifier
  const despairCount = calcDespairCardCount(session.round)

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl text-gold tracking-wider">Wave Generator</h1>
          <p className="font-body text-parchment-muted text-sm mt-1">Roll 2D6 per Spawning Zone, convert to Wave Points, and build the wave.</p>
        </div>
        <Link to="/horde" className="btn-ghost text-xs">
          &larr; Horde Mode
        </Link>
      </div>

      <div className="flex flex-col gap-4">
        <div className="card flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-xs font-heading tracking-widest uppercase text-parchment-faint">
            Game Size
            <select
              value={session.gameSize}
              onChange={(e) => setGameSize(e.target.value as GameSize)}
              className="bg-void-900 border border-gold-muted/30 text-parchment text-sm px-2 py-1.5 font-body normal-case tracking-normal"
            >
              <option value="small">1,000 Points (2 Zones)</option>
              <option value="large">2,000 Points (4 Zones)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-heading tracking-widest uppercase text-parchment-faint">
            Battle Round
            <input
              type="number"
              min={1}
              value={session.round}
              onChange={(e) => setRound(Number(e.target.value) || 1)}
              className="bg-void-900 border border-gold-muted/30 text-parchment text-sm px-2 py-1.5 font-body w-20"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-heading tracking-widest uppercase text-parchment-faint" title="Added on top of the round modifier for every zone rolled this round — use it for one-off table/mission effects.">
            Manual Modifier
            <input
              type="number"
              value={session.manualModifier}
              onChange={(e) => setManualModifier(Number(e.target.value) || 0)}
              className="bg-void-900 border border-gold-muted/30 text-parchment text-sm px-2 py-1.5 font-body w-20"
            />
          </label>
          <button onClick={handleResetGame} className="btn-ghost text-xs ml-auto">
            New Game
          </button>
        </div>

        <div className="card flex flex-wrap gap-6">
          <div>
            <p className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint">This Round</p>
            <p className="font-body text-parchment text-sm mt-1">
              Roll <span className="text-gold">{zoneCount}&times; 2D6</span> at{' '}
              <span className="text-gold">{totalModifier >= 0 ? `+${totalModifier}` : totalModifier}</span>
              {session.manualModifier !== 0 && (
                <span className="text-parchment-faint">
                  {' '}
                  ({roundModifier >= 0 ? `+${roundModifier}` : roundModifier} round, {session.manualModifier >= 0 ? `+${session.manualModifier}` : session.manualModifier}{' '}
                  manual)
                </span>
              )}
            </p>
            <p className="font-body text-parchment-faint text-xs mt-1">
              Manual Modifier is an extra +/- added to every zone's SpawnRoll this round — use it for mission
              rules or one-off effects. To roll an extra zone (e.g. a "Second Wave" Despair Card), use the button
              below the latest wave in Wave History.
            </p>
          </div>
          <div>
            <p className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint">Despair Cards</p>
            <p className="font-body text-sm mt-1">
              {despairCount === 0 ? (
                <span className="text-parchment-faint italic">None this round</span>
              ) : (
                <span className="badge-blood">Draw {despairCount}</span>
              )}
            </p>
          </div>
        </div>

        <div className="card">
          <p className="card-header !mb-3 !pb-3 !text-sm">Chaos Wave Table</p>
          <div className="flex flex-wrap gap-2 items-end mb-3">
            <label className="flex flex-col gap-1 text-xs font-heading tracking-widest uppercase text-parchment-faint flex-1 min-w-[10rem]">
              Unit Name
              <input
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                className="bg-void-900 border border-gold-muted/30 text-parchment text-sm px-2 py-1.5 font-body w-full"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-heading tracking-widest uppercase text-parchment-faint">
              WP Cost
              <input
                type="number"
                min={1}
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="bg-void-900 border border-gold-muted/30 text-parchment text-sm px-2 py-1.5 font-body w-24"
              />
            </label>
            <button onClick={handleAddEntry} className="btn-primary text-xs">
              + Add
            </button>
          </div>
          {session.table.length === 0 ? (
            <p className="font-body text-parchment-faint text-sm italic">No entries yet — add a unit above.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {[...session.table]
                .sort((a, b) => a.pointsCost - b.pointsCost)
                .map((entry) => (
                  <div key={entry.id} className="flex items-start gap-2 text-sm font-body text-parchment-muted">
                    <span className="badge-gold shrink-0">{tierLabelForPoints(entry.pointsCost)}</span>
                    <span className="badge border-gold-muted/30 text-parchment-muted shrink-0">{entry.pointsCost}WP</span>
                    <span className="flex-1">{entry.unitName}</span>
                    <button
                      onClick={() => removeSpawnTableEntry(entry.id)}
                      className="font-heading text-[10px] tracking-widest uppercase text-blood-light hover:text-blood-light/70 shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>

        <button onClick={rollRound} disabled={session.table.length === 0} className="btn-primary self-start disabled:opacity-40">
          Roll Wave (Round {session.round})
        </button>

        <div className="card">
          <div className="flex items-center justify-between !mb-3 !pb-3 border-b border-gold-muted/20">
            <p className="card-header !mb-0 !pb-0 !border-0 !text-sm">Wave History</p>
            {session.history.length > 0 && (
              <button onClick={clearHistory} className="font-heading text-[10px] tracking-widest uppercase text-blood-light hover:text-blood-light/70">
                Clear History
              </button>
            )}
          </div>
          {session.history.length === 0 ? (
            <p className="font-body text-parchment-faint text-sm italic">No waves rolled yet.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {session.history.map((wave, waveIndex) => (
                <div key={wave.id} className="flex flex-col gap-2">
                  <p className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint">
                    {new Date(wave.createdAt).toLocaleString()} &middot; Round {wave.round} &middot; Modifier{' '}
                    {wave.modifier >= 0 ? `+${wave.modifier}` : wave.modifier}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {wave.zones.map((zone, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm font-body text-parchment-muted">
                        <span className="badge border-gold-muted/30 text-parchment-muted shrink-0">
                          Zone {i + 1}: {zone.roll}&rarr;{zone.spawnRoll} ({zone.wavePoints}WP)
                        </span>
                        <span className="flex-1">
                          {zone.units.length === 0 ? (
                            <span className="italic text-parchment-faint">No units afforded</span>
                          ) : (
                            summarizeUnits(zone.units)
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                  {wave.despairCards.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {wave.despairCards.map((card, i) => (
                        <span key={i} className={`${CATEGORY_BADGE[card.category]} flex flex-col items-start !text-left`} title={card.effect}>
                          <span className="font-heading text-[10px] tracking-wide">{card.title}</span>
                          <span className="font-body text-[11px] normal-case tracking-normal opacity-80">{card.effect}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {waveIndex === 0 && (
                    <button onClick={rollExtraZone} className="btn-ghost text-xs self-start mt-1">
                      + Roll Extra Zone (e.g. Second Wave)
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


