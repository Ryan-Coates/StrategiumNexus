import { useEffect, useState } from 'react'
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
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
    setDeleting(true)
    try {
      await deleteGameSystem(record.id)
      const all = await loadAllSystems()
      setSystems(all)
    } catch (err) {
      setError(key, err instanceof Error ? err.message : String(err))
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className={`card flex flex-col overflow-hidden ${isDownloading ? 'opacity-75' : ''}`}>
      {/* Image / Emblem Banner */}
      <div className="relative h-44 sm:h-48 bg-void-950 flex items-center justify-center overflow-hidden -mx-0 -mt-0">
        {/* Subtle radial glow behind emblem */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(201,170,113,0.08)_0%,_transparent_70%)]" />
        {manifest.image ? (
          <img
            src={manifest.image}
            alt={manifest.name}
            className="relative z-10 h-32 w-32 sm:h-36 sm:w-36 object-contain opacity-80"
            draggable={false}
          />
        ) : (
          <span className="relative z-10 font-display text-5xl text-gold/20 select-none">
            {manifest.name.slice(0, 1)}
          </span>
        )}
        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-void-900 to-transparent" />
        {/* Status badge in top-right */}
        <div className="absolute top-3 right-3 flex gap-1.5 z-20">
          {record && (
            <span className="badge badge-gold text-[10px]">Rev {record.revision}</span>
          )}
          {manifest.inProgress && (
            <span className="badge badge-blood text-[10px]">In Progress</span>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="flex flex-col gap-3 p-4 flex-1">
        {/* Title + tags */}
        <div>
          <h2 className="font-heading text-gold text-lg tracking-wide leading-tight">
            {manifest.name}
          </h2>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {manifest.tags.map((t) => (
              <span key={t} className="badge badge-gold text-[10px]">
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="divider-gold" />

        <p className="text-parchment-muted text-sm font-body leading-relaxed flex-1">
          {manifest.description}
        </p>

        {/* WIP notice */}
        {manifest.inProgress && (
          <div className="flex items-start gap-2 bg-gold/5 border border-gold-muted/30 px-3 py-2">
            <span className="text-gold text-xs mt-0.5">⚒</span>
            <p className="text-gold-muted text-xs font-body leading-snug">{manifest.wipNote}</p>
          </div>
        )}

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
              <Link to={`/games/${manifest.slug}`} className="btn-primary text-sm flex-1 text-center">
                Browse Codex
              </Link>
              <button onClick={handleDownload} className="btn-ghost text-sm">
                Update
              </button>
              {confirmDelete ? (
                <>
                  <span className="font-heading text-[10px] text-blood-light tracking-wide self-center w-full">
                    Remove all data?
                  </span>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="btn-ghost text-[10px] py-1 px-3 text-blood-light hover:text-blood border-blood-light/30"
                  >
                    {deleting ? 'Removing…' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="btn-ghost text-[10px] py-1 px-3"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="btn-ghost text-sm text-blood-light hover:text-blood hover:border-blood/40"
                >
                  Remove
                </button>
              )}
            </>
          ) : (
            <button onClick={handleDownload} className="btn-primary text-sm w-full">
              Download
            </button>
          )}
        </div>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {BSDATA_SYSTEMS.map((manifest) => (
          <SystemCard key={manifest.slug} manifest={manifest} record={recordBySlug[manifest.slug]} />
        ))}
      </div>
    </div>
  )
}
