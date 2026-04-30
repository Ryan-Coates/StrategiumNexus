import { useParams, Link } from 'react-router-dom'

export default function GameSystem() {
  const { systemId } = useParams()

  return (
    <div>
      <Link to="/games" className="font-heading text-xs tracking-widest uppercase text-parchment-faint hover:text-gold transition-colors">
        &larr; War Codex
      </Link>
      <div className="mt-6 mb-8">
        <h1 className="font-display text-3xl text-gold tracking-wider uppercase">
          System: {systemId}
        </h1>
        <div className="divider-gold mt-4" />
      </div>
      <p className="text-parchment-muted font-body italic">
        Faction catalogue browser — coming in Milestone 2.
      </p>
    </div>
  )
}
