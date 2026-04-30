export default function GameLibrary() {
  return (
    <div>
      <div className="mb-8">
        <p className="font-heading text-xs tracking-[0.3em] uppercase text-gold-muted mb-2">
          Phase I
        </p>
        <h1 className="font-display text-3xl md:text-4xl text-gold tracking-wider uppercase mb-4">
          War Codex
        </h1>
        <div className="divider-gold" />
      </div>

      <p className="text-parchment-muted font-body text-base leading-relaxed max-w-xl">
        Download game system data from the BattleScribe community repositories.
        Once downloaded, browse rules and unit profiles without an internet connection.
      </p>

      <div className="mt-12 card max-w-lg opacity-60">
        <div className="card-header">Available Systems</div>
        <p className="text-parchment-faint text-sm font-body italic">
          Data download and system browser — coming in Milestone 1.
        </p>
      </div>
    </div>
  )
}
