import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BSDATA_SYSTEMS, type BsDataSystemManifest } from '../data/bsdataIndex'
import {
  downloadSystem,
  deleteGameSystem,
  loadAllSystems,
  type GameSystemRecord,
} from '../services/dataManager'
import { useGameStore } from '../store/gameStore'
import Spinner from '../components/Spinner'

// ── System card ───────────────────────────────────────────────────────────────

function SystemCard({
  manifest,
  record,
}: {
  manifest: BsDataSystemManifest
  record: GameSystemRecord | undefined
}) {
  const { downloading, progress, errors, setDownloading, setProgress, setError, setSystems } =
    useGameStore()

  const key = manifest.slug
  const isDownloading = downloading[key]
  const progressMsg = progress[key]
  const error = errors[key]

  async function handleDownload() {
    setDownloading(key, true)
    setError(key, null)
    try {
      await downloadSystem(manifest, ({ stage }) => setProgress(key, stage))
      const all = await loadAllSystems()
      setSystems(all)
    } catch (err) {
      setError(key, err instanceof Error ? err.message : String(err))
    } finally {
      setDownloading(key, false)
      setProgress(key, '')
    }
  }

  async function handleDelete() {
    if (!record) return
    if (!window.confirm(`Remove "${record.name}" and all its downloaded catalogues?`)) return
    await deleteGameSystem(record.id)
    const all = await loadAllSystems()
    setSystems(all)
  }

  return (
    <div className={`card flex flex-col gap-3 ${isDownloading ? 'opacity-75' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-gold text-base tracking-wide">{manifest.name}</h2>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {manifest.tags.map((t) => (
              <span key={t} className="badge badge-gold text-[10px]">
                {t}
              </span>
            ))}
          </div>
        </div>
        {record && (
          <span className="badge badge-gold shrink-0 text-[10px]">
            Rev {record.revision}
          </span>
        )}
      </div>

      <div className="divider-gold" />

      <p className="text-parchment-muted text-sm font-body leading-relaxed flex-1">
        {manifest.description}
      </p>

      {record && (
        <p className="text-parchment-faint text-xs font-heading tracking-wide">
          {record.catFiles.length} catalogues available &middot; downloaded{' '}
          {new Date(record.fetchedAt).toLocaleDateString()}
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="text-blood-light text-xs font-body bg-blood/10 border border-blood/30 px-3 py-2">
          {error}
        </p>
      )}

      {/* Progress */}
      {isDownloading && progressMsg && (
        <p className="text-gold-muted text-xs font-heading tracking-wide animate-pulse">
          {progressMsg}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mt-auto pt-1">
        {isDownloading ? (
          <Spinner label="Downloading…" />
        ) : record ? (
          <>
            <Link to={`/games/${manifest.slug}`} className="btn-primary text-xs">
              Browse Codex
            </Link>
            <button onClick={handleDownload} className="btn-ghost text-xs">
              Update
            </button>
            <button
              onClick={handleDelete}
              className="btn-ghost text-xs text-blood-light hover:text-blood hover:border-blood/40"
            >
              Remove
            </button>
          </>
        ) : (
          <button onClick={handleDownload} className="btn-primary text-xs">
            Download
          </button>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GameLibrary() {
  const { systems, setSystems } = useGameStore()

  useEffect(() => {
    loadAllSystems().then(setSystems)
  }, [setSystems])

  const recordBySlug = Object.fromEntries(systems.map((s) => [s.slug, s]))

  return (
    <div>
      <div className="mb-8">
        <p className="font-heading text-xs tracking-[0.3em] uppercase text-gold-muted mb-2">
          Phase I
        </p>
        <h1 className="font-display text-3xl md:text-4xl text-gold tracking-wider uppercase mb-2">
          War Codex
        </h1>
        <div className="divider-gold mb-4" />
        <p className="text-parchment-muted font-body text-sm leading-relaxed max-w-xl">
          Download community game data from{' '}
          <a
            href="https://github.com/BSData"
            target="_blank"
            rel="noreferrer"
            className="text-gold hover:text-gold-light underline underline-offset-2"
          >
            BSData
          </a>
          . Once downloaded, all rules are available offline in your browser.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {BSDATA_SYSTEMS.map((manifest) => (
          <SystemCard key={manifest.slug} manifest={manifest} record={recordBySlug[manifest.slug]} />
        ))}
      </div>
    </div>
  )
}
