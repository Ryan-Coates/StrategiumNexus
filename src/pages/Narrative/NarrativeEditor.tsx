import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useNarrativeStore } from '../../store/narrativeStore'
import { useAuthStore } from '../../store/authStore'
import type { NarrativeMission } from '../../types/campaign'
import DeploymentMapEditor from '../../components/DeploymentMapEditor/DeploymentMapEditor'

export default function NarrativeEditor() {
  const { missionId } = useParams<{ missionId: string }>()
  const navigate = useNavigate()
  const { current, loadMission, createMission, saveMission } = useNarrativeStore()
  const { mode, isAdmin } = useAuthStore()
  const canEditMap = mode === 'local' || isAdmin
  const [draft, setDraft] = useState<NarrativeMission | null>(null)
  const [mapEditorOpen, setMapEditorOpen] = useState(false)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    async function init() {
      if (missionId) {
        await loadMission(missionId)
      } else {
        const mission = await createMission()
        navigate(`/narrative/${mission.id}/admin`, { replace: true })
        if (canEditMap) setMapEditorOpen(true)
      }
    }
    init()
  }, [missionId, loadMission, createMission, navigate, canEditMap])

  useEffect(() => {
    if (current) setDraft(current)
  }, [current])

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !draft) return
    const reader = new FileReader()
    reader.onload = () => setDraft({ ...draft, deploymentMapImage: reader.result as string })
    reader.readAsDataURL(file)
  }

  function handleMapSave({ image, data }: { image: string; data: NonNullable<NarrativeMission['deploymentMapData']> }) {
    if (!draft) return
    setDraft({ ...draft, deploymentMapImage: image, deploymentMapData: data })
    setMapEditorOpen(false)
  }

  async function handleSave() {
    if (!draft) return
    await saveMission(draft)
    navigate('/narrative/admin')
  }

  if (!draft) return null

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-2xl text-gold tracking-wider">Edit Mission</h1>
        <Link to="/narrative/admin" className="btn-ghost text-xs">
          &larr; Manage Missions
        </Link>
      </div>

      <div className="flex flex-col gap-4">
        <div className="card flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-xs font-heading tracking-widest uppercase text-parchment-faint flex-1 min-w-[12rem]">
            Title
            <input
              type="text"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="bg-void-900 border border-gold-muted/30 text-parchment text-sm px-2 py-1.5 font-body"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-heading tracking-widest uppercase text-parchment-faint">
            Status
            <select
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value as 'draft' | 'published' })}
              className="bg-void-900 border border-gold-muted/30 text-parchment text-sm px-2 py-1.5 font-body w-32"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </label>
        </div>

        <div className="card">
          <p className="card-header">Narrative</p>
          <textarea
            value={draft.narrativeText}
            onChange={(e) => setDraft({ ...draft, narrativeText: e.target.value })}
            rows={6}
            placeholder="Story/fluff text..."
            className="bg-void-900 border border-gold-muted/30 text-parchment text-sm px-3 py-2 font-body w-full"
          />
        </div>

        <div className="card">
          <p className="card-header">Mission Rules</p>
          <textarea
            value={draft.missionRulesText}
            onChange={(e) => setDraft({ ...draft, missionRulesText: e.target.value })}
            rows={6}
            placeholder="Objectives, special rules, victory conditions..."
            className="bg-void-900 border border-gold-muted/30 text-parchment text-sm px-3 py-2 font-body w-full"
          />
        </div>

        <details className="card">
          <summary className="card-header cursor-pointer select-none">Deployment Map</summary>
          <div className="pt-2 flex flex-col gap-3">
            {draft.deploymentMapImage && (
              <img src={draft.deploymentMapImage} alt="Deployment map preview" className="max-w-full border border-gold-muted/30" />
            )}
            {canEditMap && (
              <button onClick={() => setMapEditorOpen(true)} className="btn-ghost text-xs w-fit">
                {draft.deploymentMapData ? 'Edit Map' : 'Open Map Editor'}
              </button>
            )}
            <label className="flex flex-col gap-1 text-xs font-heading tracking-widest uppercase text-parchment-faint">
              {canEditMap ? 'Or upload an image instead' : 'Upload Image'}
              <input type="file" accept="image/*" onChange={handleImageUpload} className="font-body text-sm text-parchment-muted" />
            </label>
          </div>
        </details>

        <div className="flex justify-end">
          <button onClick={handleSave} className="btn-primary text-xs">
            Save Mission
          </button>
        </div>
      </div>

      {mapEditorOpen && (
        <DeploymentMapEditor initialData={draft.deploymentMapData} onSave={handleMapSave} onClose={() => setMapEditorOpen(false)} />
      )}
    </div>
  )
}
