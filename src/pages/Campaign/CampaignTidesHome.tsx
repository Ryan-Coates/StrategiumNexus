import { Link } from 'react-router-dom'

export default function CampaignTidesHome() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl text-gold tracking-wider">Tides of Meridian Campaign</h1>
        <p className="font-body text-parchment-muted text-sm mt-1">
          Roster Manager and Narrative Driver for the ongoing campaign.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/campaign/rosters" className="card flex flex-col gap-2">
          <h2 className="font-heading text-gold text-lg tracking-wide">Roster Manager</h2>
          <p className="font-body text-parchment-faint text-sm">
            Build and manage player rosters, track permanent casualties, and run missions.
          </p>
        </Link>
        <Link to="/narrative" className="card flex flex-col gap-2">
          <h2 className="font-heading text-gold text-lg tracking-wide">Narrative Missions</h2>
          <p className="font-body text-parchment-faint text-sm">
            Read published mission briefings, story text, and deployment maps.
          </p>
        </Link>
      </div>
    </div>
  )
}
