import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { parseCatalogueData } from '../../services/dataManager'
import { useGameStore } from '../../store/gameStore'
import Spinner from '../Spinner'
import {
  buildDatasheet,
  buildDetachments,
  buildEnhancements,
  DatasheetDetail,
  DetachmentPanel,
  type Datasheet,
} from './Wh40kHelpers'
import type { SelectionEntry } from '../../types'

type Tab = 'datasheets' | 'army-rules'

// ── Datasheet sidebar ─────────────────────────────────────────────────────────

function unitTypeLabel(entry: SelectionEntry): string {
  // BSData 40k groups units via category links; fall back to entry type
  return entry.type === 'unit' ? 'Unit'
    : entry.type === 'model' ? 'Model'
    : entry.type === 'upgrade' ? 'Upgrade'
    : 'Other'
}

function DatasheetSidebar({
  sheets,
  search,
  selectedId,
  onSelect,
}: {
  sheets: Datasheet[]
  search: string
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return q ? sheets.filter((s) => s.entry.name.toLowerCase().includes(q)) : sheets
  }, [sheets, search])

  // Group by entry type
  const groups = useMemo(() => {
    const map = new Map<string, Datasheet[]>()
    for (const s of filtered) {
      const t = unitTypeLabel(s.entry)
      if (!map.has(t)) map.set(t, [])
      map.get(t)!.push(s)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  return (
    <div className="overflow-y-auto h-full">
      {groups.length === 0 && (
        <p className="text-parchment-faint text-xs font-body italic px-4 py-6">
          No datasheets match.
        </p>
      )}
      {groups.map(([type, items]) => {
        const isOpen = !collapsed[type]
        return (
          <div key={type}>
            <button
              onClick={() => setCollapsed((p) => ({ ...p, [type]: isOpen }))}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-void-800 transition-colors"
            >
              <span className="font-heading text-xs tracking-[0.15em] uppercase text-gold">
                {type}s
              </span>
              <span className="text-parchment-faint text-xs">
                {isOpen ? '▾' : '▸'} {items.length}
              </span>
            </button>
            {isOpen && (
              <div className="border-b border-gold-muted/10">
                {items.map((s) => (
                  <button
                    key={s.entry.id}
                    onClick={() => onSelect(s.entry.id)}
                    className={`w-full text-left px-5 py-2 text-sm font-body transition-colors border-l-2 ${
                      selectedId === s.entry.id
                        ? 'border-gold text-gold bg-gold/5'
                        : 'border-transparent text-parchment-muted hover:text-parchment hover:bg-void-800'
                    }`}
                  >
                    {s.entry.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main viewer ───────────────────────────────────────────────────────────────

export default function Wh40kViewer() {
  const { slug, catalogueId } = useParams<{ slug: string; catalogueId: string }>()
  const { parsedCatalogues, setParsedCatalogue } = useGameStore()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('datasheets')
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showSidebar, setShowSidebar] = useState(true)

  const catalogue = catalogueId ? parsedCatalogues[catalogueId] ?? null : null

  useEffect(() => {
    if (!catalogueId) return
    if (parsedCatalogues[catalogueId]) { setLoading(false); return }
    setLoading(true)
    setError(null)
    parseCatalogueData(catalogueId)
      .then((d) => setParsedCatalogue(catalogueId, d))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [catalogueId])

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 200)
    return () => clearTimeout(t)
  }, [search])

  const sheets = useMemo(
    () => (catalogue ? catalogue.entries.map(buildDatasheet) : []),
    [catalogue],
  )

  const detachments = useMemo(
    () => (catalogue ? buildDetachments(catalogue.entries) : []),
    [catalogue],
  )

  const enhancements = useMemo(
    () => (catalogue ? buildEnhancements(catalogue.entries) : []),
    [catalogue],
  )

  const selectedSheet = useMemo(
    () => (selectedId ? sheets.find((s) => s.entry.id === selectedId) ?? null : null),
    [sheets, selectedId],
  )

  if (loading) return <Spinner label="Parsing datasheet data…" />

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-blood-light font-body mb-4">{error}</p>
        <Link to={`/games/${slug}`} className="btn-primary">Back to System</Link>
      </div>
    )
  }

  if (!catalogue) {
    return (
      <div className="py-12 text-center">
        <p className="text-parchment-muted font-body mb-4">Catalogue not found.</p>
        <Link to={`/games/${slug}`} className="btn-primary">Back to System</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 10rem)' }}>
      {/* Top bar */}
      <div className="flex items-center gap-4 mb-3 flex-wrap">
        <Link
          to={`/games/${slug}`}
          className="font-heading text-xs tracking-widest uppercase text-parchment-faint hover:text-gold transition-colors shrink-0"
        >
          &larr; Back
        </Link>
        <h1 className="font-display text-lg md:text-xl text-gold tracking-wider flex-1 truncate">
          {catalogue.meta.name}
        </h1>
      </div>

      {/* Tab bar */}
      <div className="flex items-end gap-0 border-b border-gold-muted/20 mb-0">
        {(['datasheets', 'army-rules'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`font-heading text-[11px] tracking-widest uppercase px-5 py-2.5 border-b-2 transition-colors ${
              tab === t
                ? 'border-gold text-gold'
                : 'border-transparent text-parchment-faint hover:text-parchment'
            }`}
          >
            {t === 'datasheets' ? 'Datasheets' : 'Army Rules'}
          </button>
        ))}

        {tab === 'datasheets' && (
          <div className="ml-auto pb-1 pr-1">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search units…"
              className="bg-void-800 border border-gold-muted/25 text-parchment placeholder-parchment-faint text-xs font-body px-3 py-1.5 w-44 focus:outline-none focus:border-gold/50 transition-colors"
            />
          </div>
        )}

        <button
          onClick={() => setShowSidebar((v) => !v)}
          className="ml-2 pb-1 btn-ghost text-[10px] md:hidden"
        >
          {showSidebar ? 'Detail' : 'List'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden border-x border-b border-gold-muted/15">
        {tab === 'datasheets' ? (
          <>
            {/* Sidebar */}
            <div
              className={`${showSidebar ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-64 lg:w-72 shrink-0 border-r border-gold-muted/15 bg-void-900`}
            >
              <div className="px-4 py-2 border-b border-gold-muted/10">
                <p className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint">
                  {sheets.length} datasheets
                </p>
              </div>
              <DatasheetSidebar
                sheets={sheets}
                search={searchDebounced}
                selectedId={selectedId}
                onSelect={(id) => { setSelectedId(id); setShowSidebar(false) }}
              />
            </div>

            {/* Detail */}
            <div
              className={`${!showSidebar ? 'flex' : 'hidden'} md:flex flex-1 overflow-hidden bg-void-900/50`}
            >
              <div className="flex-1 overflow-y-auto">
                <DatasheetDetail sheet={selectedSheet} />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-hidden bg-void-900/50">
            <DetachmentPanel
              catalogueRules={catalogue.rules}
              detachments={detachments}
              enhancements={enhancements}
            />
          </div>
        )}
      </div>
    </div>
  )
}
