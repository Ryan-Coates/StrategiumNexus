import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { parseCatalogueData, parseSystemData } from '../../services/dataManager'
import { getStratagemsForCatalogue } from '../../services/stratagemLoader'
import { CORE_STRATAGEMS_10E } from '../../data/coreStratagems'
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
import type { SelectionEntry, RuleEntry } from '../../types'

function stripBsMarkup(text: string): string {
  return text.replace(/\^\^/g, '').replace(/\*\*/g, '')
}

type Tab = 'datasheets' | 'army-rules' | 'core-rules'

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
  const [coreRules, setCoreRules] = useState<RuleEntry[]>([])
  const [coreRulesSearch, setCoreRulesSearch] = useState('')
  const [coreRulesLoading, setCoreRulesLoading] = useState(false)

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

  // Load core rules from the game system file when that tab is first opened
  useEffect(() => {
    if (tab !== 'core-rules' || coreRules.length > 0 || coreRulesLoading) return
    if (!catalogue) return
    setCoreRulesLoading(true)
    parseSystemData(catalogue.meta.gameSystemId)
      .then((sys) => setCoreRules(sys.rules))
      .catch(() => setCoreRules([]))
      .finally(() => setCoreRulesLoading(false))
  }, [tab, catalogue])

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 200)
    return () => clearTimeout(t)
  }, [search])

  const sheets = useMemo(
    () => (catalogue
      ? catalogue.entries
          .filter((e) => e.type === 'unit' || e.type === 'model')
          .map(buildDatasheet)
      : []),
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

  const stratagems = useMemo(
    () => (catalogue ? getStratagemsForCatalogue(catalogue.meta.name) : []),
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
        {(['datasheets', 'army-rules', 'core-rules'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`font-heading text-[11px] tracking-widest uppercase px-5 py-2.5 border-b-2 transition-colors ${
              tab === t
                ? 'border-gold text-gold'
                : 'border-transparent text-parchment-faint hover:text-parchment'
            }`}
          >
            {t === 'datasheets' ? 'Datasheets' : t === 'army-rules' ? 'Army Rules' : 'Core Rules'}
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
              {sheets.length === 0 && catalogue.catalogueLinkIds.length > 0 && (
                <div className="mx-3 mt-3 px-3 py-3 border border-gold-muted/25 bg-gold/5">
                  <p className="text-gold-muted text-xs font-body leading-relaxed">
                    This faction's datasheets are stored in a linked Library catalogue.
                    Use <span className="text-gold font-heading tracking-wide">Download All</span> on
                    the game system page to fetch all required files.
                  </p>
                </div>
              )}
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
        ) : tab === 'army-rules' ? (
          <div className="flex-1 overflow-hidden bg-void-900/50">
            <DetachmentPanel
              catalogueRules={catalogue.rules}
              detachments={detachments}
              enhancements={enhancements}
              stratagems={stratagems}
            />
          </div>
        ) : (
          /* Core Rules */
          <div className="flex-1 overflow-y-auto bg-void-900/50 p-5">
            {coreRulesLoading ? (
              <Spinner label="Loading core rules…" />
            ) : (
              <>
                <div className="mb-5 flex items-center gap-3">
                  <input
                    type="search"
                    value={coreRulesSearch}
                    onChange={(e) => setCoreRulesSearch(e.target.value)}
                    placeholder="Search rules &amp; stratagems…"
                    className="bg-void-800 border border-gold-muted/25 text-parchment placeholder-parchment-faint text-xs font-body px-3 py-1.5 w-56 focus:outline-none focus:border-gold/50 transition-colors"
                  />
                  <span className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint">
                    {coreRules.length} rules · {CORE_STRATAGEMS_10E.length} stratagems
                  </span>
                </div>

                {/* ── Core Stratagems ── */}
                {(() => {
                  const q = coreRulesSearch.toLowerCase()
                  const filtered = q
                    ? CORE_STRATAGEMS_10E.filter(
                        (s) =>
                          s.name.toLowerCase().includes(q) ||
                          s.effect.toLowerCase().includes(q) ||
                          s.when.toLowerCase().includes(q),
                      )
                    : CORE_STRATAGEMS_10E
                  if (filtered.length === 0) return null
                  const byPhase = new Map<string, typeof filtered>()
                  for (const s of filtered) {
                    const ph = s.phase || 'Any Phase'
                    if (!byPhase.has(ph)) byPhase.set(ph, [])
                    byPhase.get(ph)!.push(s)
                  }
                  return (
                    <section className="mb-8">
                      <div className="flex items-center gap-3 mb-4">
                        <h3 className="font-heading text-xs tracking-[0.2em] uppercase text-gold shrink-0">
                          Universal Stratagems
                        </h3>
                        <div className="flex-1 h-px bg-gold-muted/15" />
                        <span className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint shrink-0">
                          {filtered.length}
                        </span>
                      </div>
                      {[...byPhase.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([phase, strats]) => (
                        <div key={phase} className="mb-4">
                          <p className="font-heading text-[10px] tracking-[0.25em] uppercase text-gold-muted mb-2 pl-1">{phase}</p>
                          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                            {strats.map((s) => (
                              <div key={s.name} className="border border-gold-muted/20 bg-void-800 px-4 py-3">
                                <div className="flex items-baseline gap-2 mb-2 flex-wrap">
                                  <p className="font-heading text-gold text-sm tracking-wide">{s.name}</p>
                                  <span className="font-heading text-[10px] tracking-widest uppercase px-2 py-0.5 border border-gold-muted/30 text-gold-muted">
                                    {s.cp}CP
                                  </span>
                                </div>
                                <dl className="space-y-1.5">
                                  {s.when && (
                                    <div className="flex gap-2">
                                      <dt className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint shrink-0 w-20">When</dt>
                                      <dd className="font-body text-parchment-muted text-xs leading-relaxed">{s.when}</dd>
                                    </div>
                                  )}
                                  {s.target && (
                                    <div className="flex gap-2">
                                      <dt className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint shrink-0 w-20">Target</dt>
                                      <dd className="font-body text-parchment-muted text-xs leading-relaxed">{s.target}</dd>
                                    </div>
                                  )}
                                  {s.effect && (
                                    <div className="flex gap-2">
                                      <dt className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint shrink-0 w-20">Effect</dt>
                                      <dd className="font-body text-parchment text-xs leading-relaxed">{s.effect}</dd>
                                    </div>
                                  )}
                                  {s.restrictions && (
                                    <div className="flex gap-2">
                                      <dt className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint shrink-0 w-20">Restrict.</dt>
                                      <dd className="font-body text-parchment-muted text-xs leading-relaxed italic">{s.restrictions}</dd>
                                    </div>
                                  )}
                                </dl>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </section>
                  )
                })()}

                {/* ── Game System Rules ── */}
                {coreRules.length > 0 && (() => {
                  const q = coreRulesSearch.toLowerCase()
                  const filtered = coreRules
                    .filter((r) => !q || r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q))
                    .sort((a, b) => a.name.localeCompare(b.name))
                  if (filtered.length === 0) return null
                  return (
                    <section>
                      <div className="flex items-center gap-3 mb-4">
                        <h3 className="font-heading text-xs tracking-[0.2em] uppercase text-gold shrink-0">
                          Game Rules
                        </h3>
                        <div className="flex-1 h-px bg-gold-muted/15" />
                        <span className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint shrink-0">
                          {filtered.length}
                        </span>
                      </div>
                      <div className="columns-1 md:columns-2 gap-3 space-y-3">
                        {filtered.map((r) => (
                          <div
                            key={r.id}
                            className="break-inside-avoid bg-void-800 border border-gold-muted/15 px-4 py-3 mb-3"
                          >
                            <p className="font-heading text-gold text-sm tracking-wide mb-1">{r.name}</p>
                            <p className="font-body text-parchment-muted text-sm leading-relaxed whitespace-pre-wrap">
                              {stripBsMarkup(r.description)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )
                })()}

                {coreRules.length === 0 && !coreRulesSearch && (
                  <p className="text-parchment-faint font-body italic text-sm mt-2">
                    Game system rules will appear here once the .gst file is downloaded.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
