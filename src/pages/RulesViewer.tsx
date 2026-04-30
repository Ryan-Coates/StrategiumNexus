import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { parseCatalogueData } from '../services/dataManager'
import type { SelectionEntry, RuleEntry } from '../types'
import { useGameStore } from '../store/gameStore'
import ProfileCard from '../components/ProfileCard'
import Spinner from '../components/Spinner'

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  unit: 'Units',
  model: 'Models',
  upgrade: 'Wargear & Upgrades',
  rule: 'Special Rules',
  mount: 'Mounts',
}

function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type.charAt(0).toUpperCase() + type.slice(1)
}

// ── Entry detail panel ────────────────────────────────────────────────────────

function EntryDetail({ entry }: { entry: SelectionEntry | null; topRules?: RuleEntry[] }) {
  if (!entry) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center">
        <p className="font-heading text-xs tracking-widest uppercase text-parchment-faint">
          Select an entry from the list
        </p>
      </div>
    )
  }

  const costStr = entry.costs.map((c) => `${c.value}${c.name}`).join(', ')

  return (
    <div className="p-5 md:p-6 overflow-y-auto">
      {/* Entry header */}
      <div className="mb-5">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h2 className="font-display text-xl md:text-2xl text-gold tracking-wider">
            {entry.name}
          </h2>
          {entry.type && (
            <span className="badge badge-gold text-[10px]">{typeLabel(entry.type)}</span>
          )}
          {costStr && (
            <span className="font-heading text-xs text-gold-muted tracking-wide">{costStr}</span>
          )}
        </div>
        <div className="divider-gold mt-3" />
      </div>

      {/* Profiles */}
      {entry.profiles.length > 0 && (
        <section className="mb-6">
          <h3 className="font-heading text-xs tracking-[0.2em] uppercase text-gold-muted mb-3">
            Profiles
          </h3>
          {entry.profiles.map((p) => (
            <ProfileCard key={p.id} profile={p} />
          ))}
        </section>
      )}

      {/* Abilities / rules */}
      {entry.rules.length > 0 && (
        <section className="mb-6">
          <h3 className="font-heading text-xs tracking-[0.2em] uppercase text-gold-muted mb-3">
            Abilities
          </h3>
          <div className="space-y-3">
            {entry.rules.map((r) => (
              <div
                key={r.id}
                className="bg-void-800 border border-gold-muted/15 p-4"
              >
                <p className="font-heading text-gold text-sm tracking-wide mb-1.5">{r.name}</p>
                <p className="font-body text-parchment-muted text-sm leading-relaxed whitespace-pre-wrap">
                  {r.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Child entries (wargear, model options) */}
      {entry.children.length > 0 && (
        <section className="mb-6">
          <h3 className="font-heading text-xs tracking-[0.2em] uppercase text-gold-muted mb-3">
            Options
          </h3>
          <div className="space-y-4">
            {entry.children.map((child) => (
              <div key={child.id} className="border-l-2 border-gold-muted/20 pl-4">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-heading text-sm text-parchment tracking-wide">
                    {child.name}
                  </span>
                  {child.costs.length > 0 && (
                    <span className="text-parchment-faint text-xs">
                      {child.costs.map((c) => `${c.value}${c.name}`).join(', ')}
                    </span>
                  )}
                </div>
                {child.profiles.map((p) => (
                  <ProfileCard key={p.id} profile={p} />
                ))}
                {child.rules.map((r) => (
                  <div key={r.id} className="mt-1">
                    <span className="font-heading text-gold text-xs">{r.name}: </span>
                    <span className="font-body text-parchment-muted text-xs">{r.description}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Catalogue-level rules (shown only on empty selection, accessed via topRules) */}
      {entry.profiles.length === 0 && entry.rules.length === 0 && entry.children.length === 0 && (
        <p className="text-parchment-faint text-sm font-body italic">
          No profile or rule data for this entry.
        </p>
      )}
    </div>
  )
}

// ── Sidebar tree ──────────────────────────────────────────────────────────────

function SidebarTree({
  entries,
  search,
  selected,
  onSelect,
}: {
  entries: SelectionEntry[]
  search: string
  selected: string | null
  onSelect: (id: string) => void
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return entries
    return entries.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.rules.some((r) => r.name.toLowerCase().includes(q)),
    )
  }, [entries, search])

  // Group by type
  const groups = useMemo(() => {
    const map = new Map<string, SelectionEntry[]>()
    for (const e of filtered) {
      const t = e.type || 'other'
      if (!map.has(t)) map.set(t, [])
      map.get(t)!.push(e)
    }
    // Sort groups: units first, then alphabetical
    const order = ['unit', 'model', 'upgrade', 'rule', 'mount']
    return [...map.entries()].sort(([a], [b]) => {
      const ai = order.indexOf(a)
      const bi = order.indexOf(b)
      if (ai !== -1 && bi !== -1) return ai - bi
      if (ai !== -1) return -1
      if (bi !== -1) return 1
      return a.localeCompare(b)
    })
  }, [filtered])

  function toggleGroup(type: string) {
    setExpanded((prev) => ({ ...prev, [type]: !prev[type] }))
  }

  return (
    <div className="overflow-y-auto h-full">
      {groups.length === 0 && (
        <p className="text-parchment-faint text-xs font-body italic px-4 py-6">
          No entries match your search.
        </p>
      )}
      {groups.map(([type, items]) => {
        const isOpen = expanded[type] !== false // open by default
        return (
          <div key={type}>
            <button
              onClick={() => toggleGroup(type)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-void-800 transition-colors"
            >
              <span className="font-heading text-xs tracking-[0.15em] uppercase text-gold">
                {typeLabel(type)}
              </span>
              <span className="text-parchment-faint text-xs">
                {isOpen ? '▾' : '▸'} {items.length}
              </span>
            </button>
            {isOpen && (
              <div className="border-b border-gold-muted/10">
                {items.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => onSelect(entry.id)}
                    className={`w-full text-left px-5 py-2 text-sm font-body transition-colors border-l-2 ${
                      selected === entry.id
                        ? 'border-gold text-gold bg-gold/5'
                        : 'border-transparent text-parchment-muted hover:text-parchment hover:bg-void-800'
                    }`}
                  >
                    {entry.name}
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RulesViewer() {
  const { slug, catalogueId } = useParams<{ slug: string; catalogueId: string }>()
  const { parsedCatalogues, setParsedCatalogue } = useGameStore()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchDebounced, setSearchDebounced] = useState('')
  const [showSidebar, setShowSidebar] = useState(true)

  const catalogue = catalogueId ? parsedCatalogues[catalogueId] ?? null : null

  useEffect(() => {
    if (!catalogueId) return
    if (parsedCatalogues[catalogueId]) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    parseCatalogueData(catalogueId)
      .then((data) => {
        setParsedCatalogue(catalogueId, data)
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [catalogueId])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 250)
    return () => clearTimeout(t)
  }, [search])

  const selectedEntry = useMemo(() => {
    if (!catalogue || !selectedId) return null
    return catalogue.entries.find((e) => e.id === selectedId) ?? null
  }, [catalogue, selectedId])

  if (loading) return <Spinner label="Parsing catalogue data…" />

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-blood-light font-body mb-4">{error}</p>
        <Link to={`/games/${slug}`} className="btn-primary">
          Back to System
        </Link>
      </div>
    )
  }

  if (!catalogue) {
    return (
      <div className="py-12 text-center">
        <p className="text-parchment-muted font-body mb-4">Catalogue not found.</p>
        <Link to={`/games/${slug}`} className="btn-primary">
          Back to System
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      {/* Top bar */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <Link
          to={`/games/${slug}`}
          className="font-heading text-xs tracking-widest uppercase text-parchment-faint hover:text-gold transition-colors shrink-0"
        >
          &larr; Back
        </Link>
        <h1 className="font-display text-xl text-gold tracking-wider flex-1 truncate">
          {catalogue.meta.name}
        </h1>
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search entries…"
            className="w-full bg-void-800 border border-gold-muted/25 text-parchment placeholder-parchment-faint text-sm font-body px-3 py-1.5 focus:outline-none focus:border-gold/50 focus:bg-void-700 transition-colors"
          />
        </div>
        <button
          onClick={() => setShowSidebar((v) => !v)}
          className="btn-ghost text-xs md:hidden"
        >
          {showSidebar ? 'Detail' : 'List'}
        </button>
      </div>

      <div className="divider-gold mb-4" />

      {/* Split layout */}
      <div className="flex-1 flex overflow-hidden border border-gold-muted/15">
        {/* Sidebar */}
        <div
          className={`${
            showSidebar ? 'flex' : 'hidden'
          } md:flex flex-col w-full md:w-64 lg:w-72 shrink-0 border-r border-gold-muted/15 bg-void-900`}
        >
          <div className="px-4 py-2.5 border-b border-gold-muted/10">
            <p className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint">
              {catalogue.entries.length} entries
            </p>
          </div>
          <SidebarTree
            entries={catalogue.entries}
            search={searchDebounced}
            selected={selectedId}
            onSelect={(id) => {
              setSelectedId(id)
              setShowSidebar(false)
            }}
          />
        </div>

        {/* Detail */}
        <div
          className={`${
            !showSidebar ? 'flex' : 'hidden'
          } md:flex flex-1 overflow-hidden bg-void-900/50`}
        >
          {selectedEntry ? (
            <div className="flex-1 overflow-y-auto">
              <EntryDetail entry={selectedEntry} />
            </div>
          ) : (
            <EntryDetail entry={null} />
          )}
        </div>
      </div>
    </div>
  )
}
