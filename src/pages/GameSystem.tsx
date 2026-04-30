import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  getSystemBySlug,
  downloadCatalogue,
  downloadAllCatalogues,
  loadCataloguesForSystem,
  type GameSystemRecord,
} from '../services/dataManager'
import type { CatFile } from '../services/bsdataApi'
import type { CatalogueMeta } from '../types'
import { useGameStore } from '../store/gameStore'
import Spinner from '../components/Spinner'

// ── Catalogue row ─────────────────────────────────────────────────────────────

function CatalogueRow({
  catFile,
  systemId,
  slug,
  downloaded,
  onDone,
}: {
  catFile: CatFile
  systemId: string
  slug: string
  downloaded: CatalogueMeta | undefined
  onDone: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDownload() {
    setLoading(true)
    setError(null)
    try {
      await downloadCatalogue(systemId, catFile, () => {})
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-gold-muted/10 last:border-b-0">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            downloaded ? 'bg-gold' : 'bg-parchment-faint/30'
          }`}
        />
        <span className="font-body text-sm text-parchment truncate">{catFile.name}</span>
        {downloaded && (
          <span className="text-parchment-faint text-xs shrink-0">
            Rev {downloaded.revision}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {error && <span className="text-blood-light text-xs max-w-[160px] truncate">{error}</span>}
        {loading ? (
          <div className="w-4 h-4 rounded-full border border-gold-muted/30 border-t-gold animate-spin" />
        ) : downloaded ? (
          <div className="flex gap-2">
            <Link
              to={`/games/${slug}/${downloaded.id}`}
              className="btn-primary text-[10px] py-1 px-3"
            >
              View
            </Link>
            <button onClick={handleDownload} className="btn-ghost text-[10px] py-1 px-3">
              Update
            </button>
          </div>
        ) : (
          <button onClick={handleDownload} className="btn-ghost text-[10px] py-1 px-3">
            Download
          </button>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GameSystem() {
  const { slug } = useParams<{ slug: string }>()
  const { downloading, progress, errors, setDownloading, setProgress, setError } = useGameStore()

  const [system, setSystem] = useState<GameSystemRecord | null>(null)
  const [catalogues, setCatalogues] = useState<CatalogueMeta[]>([])
  const [loading, setLoading] = useState(true)

  const key = slug ?? ''

  async function refresh() {
    if (!slug) return
    const sys = await getSystemBySlug(slug)
    setSystem(sys)
    if (sys) {
      const cats = await loadCataloguesForSystem(sys.id)
      setCatalogues(cats)
    }
  }

  useEffect(() => {
    setLoading(true)
    refresh().finally(() => setLoading(false))
  }, [slug])

  async function handleDownloadAll() {
    if (!system) return
    setDownloading(key, true)
    setError(key, null)
    try {
      await downloadAllCatalogues(system, ({ stage }) => setProgress(key, stage))
      await refresh()
    } catch (err) {
      setError(key, err instanceof Error ? err.message : String(err))
    } finally {
      setDownloading(key, false)
      setProgress(key, '')
    }
  }

  if (loading) return <Spinner label="Loading…" />
  if (!system) {
    return (
      <div className="py-12 text-center">
        <p className="text-parchment-muted font-body mb-4">
          This game system has not been downloaded yet.
        </p>
        <Link to="/games" className="btn-primary">
          Back to War Codex
        </Link>
      </div>
    )
  }

  const downloadedById = Object.fromEntries(catalogues.map((c) => [c.name, c]))
  const downloadedByPath = Object.fromEntries(
    catalogues.map((c) => [c.name.toLowerCase(), c]),
  )

  const isDownloadingAll = downloading[key]
  const progressMsg = progress[key]
  const error = errors[key]

  return (
    <div>
      {/* Breadcrumb */}
      <Link
        to="/games"
        className="font-heading text-xs tracking-widest uppercase text-parchment-faint hover:text-gold transition-colors"
      >
        &larr; War Codex
      </Link>

      {/* Header */}
      <div className="mt-6 mb-8">
        <h1 className="font-display text-3xl md:text-4xl text-gold tracking-wider uppercase">
          {system.name}
        </h1>
        <p className="font-heading text-xs tracking-widest uppercase text-gold-muted mt-1">
          Revision {system.revision} &middot; BattleScribe {system.battleScribeVersion}
        </p>
        <div className="divider-gold mt-4" />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className="font-heading text-xs tracking-wide text-parchment-faint">
          {catalogues.length} / {system.catFiles.length} catalogues downloaded
        </span>
        {!isDownloadingAll && (
          <button onClick={handleDownloadAll} className="btn-primary text-xs">
            Download All Catalogues
          </button>
        )}
      </div>

      {error && (
        <p className="text-blood-light text-sm font-body bg-blood/10 border border-blood/30 px-4 py-3 mb-4">
          {error}
        </p>
      )}

      {isDownloadingAll && (
        <div className="mb-4">
          <Spinner label={progressMsg || 'Downloading…'} />
        </div>
      )}

      {/* Catalogue list */}
      <div className="card">
        <div className="card-header">Available Catalogues</div>
        {system.catFiles.length === 0 ? (
          <p className="text-parchment-faint text-sm font-body italic">No catalogue files found.</p>
        ) : (
          <div>
            {system.catFiles.map((catFile) => {
              const downloaded = downloadedByPath[catFile.name.toLowerCase()] ??
                Object.values(downloadedById).find((c) =>
                  c.name.toLowerCase().includes(catFile.name.toLowerCase()),
                )
              return (
                <CatalogueRow
                  key={catFile.path}
                  catFile={catFile}
                  systemId={system.id}
                  slug={slug ?? ''}
                  downloaded={downloaded}
                  onDone={refresh}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
