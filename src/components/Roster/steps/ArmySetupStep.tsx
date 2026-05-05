import { useEffect } from 'react'
import { useGameStore } from '../../../store/gameStore'
import { useRosterStore } from '../../../store/rosterStore'
import { loadAllSystems } from '../../../services/dataManager'

const POINTS_PRESETS = [500, 1000, 1500, 2000, 3000]

export default function ArmySetupStep() {
  const { systems, setSystems } = useGameStore()
  const { activeRoster, setRosterField } = useRosterStore()

  useEffect(() => {
    loadAllSystems().then(setSystems)
  }, [setSystems])

  if (!activeRoster) return null

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-6 py-6">
      <div>
        <h2 className="font-display text-xl text-gold tracking-wider mb-1">Army Setup</h2>
        <p className="font-body text-parchment-muted text-sm">
          Name your force and choose the battle size.
        </p>
      </div>

      {/* Army name */}
      <div className="flex flex-col gap-2">
        <label className="font-heading text-xs tracking-widest uppercase text-gold-muted">
          Army Name *
        </label>
        <input
          type="text"
          placeholder="e.g. The Rotting Vanguard"
          value={activeRoster.name}
          onChange={(e) => setRosterField('name', e.target.value)}
          className="bg-void-800 border border-gold-muted/30 px-3 py-2.5 font-body text-parchment text-sm placeholder:text-parchment-faint focus:outline-none focus:border-gold transition-colors"
        />
      </div>

      {/* Game system */}
      <div className="flex flex-col gap-2">
        <label className="font-heading text-xs tracking-widest uppercase text-gold-muted">
          Game System *
        </label>
        {systems.length === 0 ? (
          <p className="font-body text-parchment-faint text-sm italic">
            No game systems downloaded yet.{' '}
            <a href="#/games" className="text-gold underline">Download a system first →</a>
          </p>
        ) : (
          <select
            value={activeRoster.systemId}
            onChange={(e) => {
              const sys = systems.find((s) => s.id === e.target.value)
              if (!sys) return
              setRosterField('systemId', sys.id)
              setRosterField('systemName', sys.name)
              // Reset catalogue when system changes
              setRosterField('catalogueId', '')
              setRosterField('catalogueName', '')
              setRosterField('detachment', '')
            }}
            className="bg-void-800 border border-gold-muted/30 px-3 py-2.5 font-body text-parchment text-sm focus:outline-none focus:border-gold transition-colors"
          >
            <option value="">— Select a game system —</option>
            {systems.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Points limit */}
      <div className="flex flex-col gap-2">
        <label className="font-heading text-xs tracking-widest uppercase text-gold-muted">
          Points Limit
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {POINTS_PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setRosterField('pointsLimit', p)}
              className={[
                'px-3 py-1.5 font-heading text-xs tracking-wide border transition-colors',
                activeRoster.pointsLimit === p
                  ? 'border-gold text-gold bg-gold/10'
                  : 'border-gold-muted/30 text-parchment-muted hover:border-gold hover:text-gold',
              ].join(' ')}
            >
              {p}
            </button>
          ))}
        </div>
        <input
          type="number"
          min={1}
          value={activeRoster.pointsLimit}
          onChange={(e) => setRosterField('pointsLimit', Math.max(1, parseInt(e.target.value) || 2000))}
          className="bg-void-800 border border-gold-muted/30 px-3 py-2.5 font-body text-parchment text-sm focus:outline-none focus:border-gold transition-colors w-32"
        />
      </div>

      {/* Army notes */}
      <div className="flex flex-col gap-2">
        <label className="font-heading text-xs tracking-widest uppercase text-gold-muted">
          Notes <span className="text-parchment-faint">(optional)</span>
        </label>
        <textarea
          rows={3}
          placeholder="Narrative background, list goals, paint scheme notes…"
          value={activeRoster.notes}
          onChange={(e) => setRosterField('notes', e.target.value)}
          className="bg-void-800 border border-gold-muted/30 px-3 py-2.5 font-body text-parchment text-sm placeholder:text-parchment-faint focus:outline-none focus:border-gold transition-colors resize-none"
        />
      </div>
    </div>
  )
}
