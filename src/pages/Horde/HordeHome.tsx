import { Link } from 'react-router-dom'
import { tierLabelForPoints, WAVE_POINTS_TIERS } from '../../services/hordeMechanics'

export default function HordeHome() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl text-gold tracking-wider">Horde Mode</h1>
        <p className="font-body text-parchment-muted text-sm mt-1">
          Utility tools for running Horde Mode games — missions and campaign tracking happen at the table.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/horde/waves" className="card flex flex-col gap-2 hover:border-gold-muted/50 transition-colors">
          <h2 className="font-heading text-gold text-base tracking-wide">Wave Generator</h2>
          <p className="font-body text-parchment-muted text-sm">
            Build a Chaos Wave Table, pick a game size, and roll 2D6 waves with escalating rounds and Despair Cards.
          </p>
        </Link>
        <Link to="/horde/attrition" className="card flex flex-col gap-2 hover:border-gold-muted/50 transition-colors">
          <h2 className="font-heading text-gold text-base tracking-wide">Attrition Tracker</h2>
          <p className="font-body text-parchment-muted text-sm">
            Track casualties during a mission and bank Reinforcement Points into your Campaign Pool afterward.
          </p>
        </Link>
      </div>

      <div className="card mt-4">
        <p className="card-header !mb-3 !pb-3 !text-sm">Wave Points Reference</p>
        <p className="font-body text-parchment-faint text-xs mb-3">
          The default Chaos Wave Table shipped with the Wave Generator — six tiers with example units and squad
          sizes for Chaos Space Marines, Chaos Daemons, and Chaos Knights, so you don't need to refer back to the
          spreadsheet. Customise or replace entries at any time in the tool.
        </p>
        <div className="flex flex-col gap-3">
          {WAVE_POINTS_TIERS.map((tier) => (
            <div key={tier.pointsCost} className="flex flex-col gap-1 pb-3 border-b border-gold-muted/10 last:border-0 last:pb-0">
              <div className="flex items-center gap-2 text-sm font-body text-parchment-muted">
                <span className="badge-gold shrink-0">{tierLabelForPoints(tier.pointsCost)}</span>
                <span className="badge border-gold-muted/30 text-parchment-muted shrink-0">{tier.pointsCost}WP</span>
                <span className="flex-1 font-heading tracking-wide text-parchment text-xs uppercase">{tier.label}</span>
              </div>
              <ul className="flex flex-col gap-0.5 pl-1">
                {tier.factions.map((f) => (
                  <li key={f.faction} className="font-body text-parchment-faint text-xs">
                    <span className="text-gold-muted">{f.faction}:</span> {f.units}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
