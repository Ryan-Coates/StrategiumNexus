import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useNarrativeStore } from '../../store/narrativeStore'

export default function NarrativeView() {
  const { missionId } = useParams<{ missionId: string }>()
  const { current, loadMission } = useNarrativeStore()

  useEffect(() => {
    if (missionId) loadMission(missionId)
  }, [missionId, loadMission])

  if (!current) return null

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6 no-print">
        <Link to="/narrative" className="btn-ghost text-xs">
          &larr; Narrative
        </Link>
        <button onClick={() => window.print()} className="btn-primary text-xs">
          Export as PDF
        </button>
      </div>

      <div className="printable-area flex flex-col gap-6">
        <h1 className="font-display text-3xl text-gold tracking-wider">{current.title || 'Untitled Mission'}</h1>

        {current.deploymentMapImage && (
          <img src={current.deploymentMapImage} alt="Deployment map" className="border border-gold-muted/30 max-w-full" />
        )}

        <div className="card">
          <p className="card-header">Narrative</p>
          <p className="font-body text-parchment whitespace-pre-wrap text-sm leading-relaxed">{current.narrativeText || '—'}</p>
        </div>

        <div className="card">
          <p className="card-header">Mission Rules</p>
          <p className="font-body text-parchment whitespace-pre-wrap text-sm leading-relaxed">{current.missionRulesText || '—'}</p>
        </div>
      </div>
    </div>
  )
}
