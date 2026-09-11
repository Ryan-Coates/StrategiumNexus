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

  async function handleExport() {
    if (!current) return
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 48
    const maxWidth = pageWidth - margin * 2
    let y = margin

    function ensureSpace(needed: number) {
      if (y + needed > pageHeight - margin) {
        doc.addPage()
        y = margin
      }
    }

    function writeHeading(text: string) {
      ensureSpace(24)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.text(text, margin, y)
      y += 20
    }

    function writeBody(text: string) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(11)
      const lines = doc.splitTextToSize(text || '—', maxWidth)
      for (const line of lines) {
        ensureSpace(16)
        doc.text(line, margin, y)
        y += 16
      }
      y += 12
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.text(current.title || 'Untitled Mission', margin, y)
    y += 32

    writeHeading('Narrative')
    writeBody(current.narrativeText)

    writeHeading('Mission Rules')
    writeBody(current.missionRulesText)

    if (current.deploymentMapImage) {
      writeHeading('Deployment Map')
      const imgProps = doc.getImageProperties(current.deploymentMapImage)
      const imgWidth = Math.min(maxWidth, imgProps.width)
      const imgHeight = (imgProps.height / imgProps.width) * imgWidth
      ensureSpace(imgHeight)
      doc.addImage(current.deploymentMapImage, margin, y, imgWidth, imgHeight)
      y += imgHeight + 12
    }

    doc.save(`${(current.title || 'mission').replace(/[^a-z0-9-_]+/gi, '_')}.pdf`)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6 no-print">
        <Link to="/narrative" className="btn-ghost text-xs">
          &larr; Narrative
        </Link>
        <button onClick={handleExport} className="btn-primary text-xs">
          Export as PDF
        </button>
      </div>

      <div className="printable-area flex flex-col gap-6">
        <h1 className="font-display text-3xl text-gold tracking-wider">{current.title || 'Untitled Mission'}</h1>

        <div className="card">
          <p className="card-header">Narrative</p>
          <p className="font-body text-parchment whitespace-pre-wrap text-sm leading-relaxed">{current.narrativeText || '—'}</p>
        </div>

        <div className="card">
          <p className="card-header">Mission Rules</p>
          <p className="font-body text-parchment whitespace-pre-wrap text-sm leading-relaxed">{current.missionRulesText || '—'}</p>
        </div>

        {current.deploymentMapImage && (
          <img src={current.deploymentMapImage} alt="Deployment map" className="border border-gold-muted/30 max-w-full" />
        )}
      </div>
    </div>
  )
}
