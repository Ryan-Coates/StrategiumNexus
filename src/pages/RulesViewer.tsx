import { useParams, Link } from 'react-router-dom'

export default function RulesViewer() {
  const { systemId, catalogueId } = useParams()

  return (
    <div>
      <Link
        to={`/games/${systemId}`}
        className="font-heading text-xs tracking-widest uppercase text-parchment-faint hover:text-gold transition-colors"
      >
        &larr; Back to System
      </Link>
      <div className="mt-6 mb-8">
        <h1 className="font-display text-3xl text-gold tracking-wider uppercase">
          Rules Viewer
        </h1>
        <p className="font-heading text-xs tracking-widest uppercase text-gold-muted mt-1">
          {systemId} / {catalogueId}
        </p>
        <div className="divider-gold mt-4" />
      </div>
      <p className="text-parchment-muted font-body italic">
        Rules tree, profile cards, and full-text search — coming in Milestone 2–3.
      </p>
    </div>
  )
}
