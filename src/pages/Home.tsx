import { Link } from 'react-router-dom'

const FEATURES = [
  {
    title: 'War Codex',
    description: 'Browse and search rules, profiles, and abilities for any supported game system.',
    to: '/games',
    phase: 'Phase I',
  },
  {
    title: 'Warband Forge',
    description: 'Build, validate, and export army rosters using official data.',
    to: '#',
    phase: 'Phase II',
    soon: true,
  },
  {
    title: 'Campaign Chronicler',
    description: 'Track your Crusade or Dominion campaign, record battles, and manage your warband.',
    to: '#',
    phase: 'Phase III',
    soon: true,
  },
]

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero */}
      <section className="text-center py-16 md:py-24 max-w-2xl">
        <p className="font-heading text-xs tracking-[0.3em] uppercase text-gold-muted mb-6">
          Wargaming Companion
        </p>
        <h1 className="font-display text-4xl md:text-6xl text-gold mb-4 tracking-wider leading-tight">
          Strategium<br />Nexus
        </h1>
        <div className="divider-gold my-6" />
        <p className="font-body text-lg text-parchment-muted leading-relaxed">
          Browse codices, forge your warband, wage your campaign.
          Built for commanders of Warhammer 40,000, Necromunda, and beyond.
        </p>
        <div className="mt-8">
          <Link to="/games" className="btn-primary">
            Open War Codex
          </Link>
        </div>
      </section>

      {/* Feature cards */}
      <section className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {FEATURES.map(({ title, description, to, phase, soon }) => (
          <div key={title} className={`card relative ${soon ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <h2 className="card-header !mb-0 !pb-0 !border-0 text-base">{title}</h2>
              <span className={`badge ${soon ? 'badge-blood' : 'badge-gold'}`}>
                {soon ? 'Coming Soon' : phase}
              </span>
            </div>
            <div className="divider-gold my-3" />
            <p className="text-parchment-muted text-sm leading-relaxed">{description}</p>
            {!soon && (
              <Link to={to} className="mt-4 inline-block btn-ghost text-xs">
                Enter &rarr;
              </Link>
            )}
          </div>
        ))}
      </section>
    </div>
  )
}
