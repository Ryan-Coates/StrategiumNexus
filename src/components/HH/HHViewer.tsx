import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { parseCatalogueData, parseSystemData } from '../../services/dataManager'
import { useGameStore } from '../../store/gameStore'
import Spinner from '../Spinner'
import type { Profile, RuleEntry } from '../../types'
import {
  buildHHDatasheet,
  buildCatNamesMap,
  extractReactions,
  extractGambits,
  stripBsMarkup,
  unitTypeGroup,
  HH_COMBAT_COLS,
  HH_LEADER_COLS,
  HH_SAVE_COLS,
  HH_RANGED_COLS,
  HH_MELEE_COLS,
  type HHDatasheet,
  type HHReaction,
  type HHGambit,
} from './HHHelpers'

type Tab = 'datasheets' | 'army-rules' | 'core-rules'

// ── HH stat block ─────────────────────────────────────────────────────────────

function HHStatBlock({
  profile,
  showName,
}: {
  profile: Profile
  showName: boolean
}) {
  const c = profile.characteristics
  const allCols = [...HH_COMBAT_COLS, ...HH_LEADER_COLS, ...HH_SAVE_COLS]
  if (!allCols.some((col) => !!c[col])) return null

  return (
    <div className="mb-3">
      {showName && profile.name && (
        <p className="font-heading text-xs text-parchment-muted tracking-wider mb-1.5">
          {profile.name}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="text-xs border border-gold-muted/25 bg-void-900 min-w-max">
          <thead>
            <tr className="bg-void-800 border-b border-gold-muted/25">
              {allCols.map((col) => (
                <th
                  key={col}
                  className="px-2.5 py-1.5 font-heading tracking-wider text-gold text-center whitespace-nowrap border-r border-gold-muted/15 last:border-r-0"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {allCols.map((col) => (
                <td
                  key={col}
                  className="px-2.5 py-1.5 text-center text-parchment font-body whitespace-nowrap border-r border-gold-muted/10 last:border-r-0"
                >
                  {c[col] || '—'}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Weapon table ──────────────────────────────────────────────────────────────

function HHWeaponTable({
  weapons,
  cols,
  title,
}: {
  weapons: Profile[]
  cols: string[]
  title: string
}) {
  if (weapons.length === 0) return null
  return (
    <div className="mb-4">
      <p className="font-heading text-[10px] tracking-[0.2em] uppercase text-gold-muted mb-2">
        {title}
      </p>
      <div className="overflow-x-auto">
        <table className="text-xs border border-gold-muted/20 bg-void-900 min-w-max w-full">
          <thead>
            <tr className="bg-void-800/80 border-b border-gold-muted/20">
              <th className="px-2.5 py-1.5 font-heading tracking-wider text-gold-muted text-left whitespace-nowrap border-r border-gold-muted/15">
                Name
              </th>
              {cols.map((col) => (
                <th
                  key={col}
                  className="px-2.5 py-1.5 font-heading tracking-wider text-gold-muted text-center whitespace-nowrap border-r border-gold-muted/15 last:border-r-0"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weapons.map((w) => (
              <tr
                key={w.id}
                className="border-t border-gold-muted/10 hover:bg-void-800/40 transition-colors"
              >
                <td className="px-2.5 py-1.5 font-body text-parchment whitespace-nowrap border-r border-gold-muted/10">
                  {w.name}
                </td>
                {cols.map((col) => (
                  <td
                    key={col}
                    className="px-2.5 py-1.5 text-center text-parchment-muted font-body whitespace-nowrap border-r border-gold-muted/10 last:border-r-0"
                  >
                    {w.characteristics[col] || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Datasheet detail panel ────────────────────────────────────────────────────

function HHDatasheetDetail({ sheet }: { sheet: HHDatasheet | null }) {
  if (!sheet) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <p className="font-heading text-xs tracking-widest uppercase text-parchment-faint">
          Select a unit from the list
        </p>
      </div>
    )
  }

  const { entry, unitProfiles, rangedWeapons, meleeWeapons, abilities, categories, unitType } =
    sheet
  const costStr = entry.costs.map((c) => `${c.value}${c.name}`).join(', ')

  return (
    <div className="p-5 md:p-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-baseline gap-3 flex-wrap mb-2">
          <h2 className="font-display text-xl md:text-2xl text-gold tracking-wider">
            {entry.name}
          </h2>
          {costStr && (
            <span className="font-heading text-xs text-gold-muted tracking-wide">{costStr}</span>
          )}
        </div>

        {/* Type badge + category keywords */}
        {(unitType || categories.length > 0) && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {unitType && <span className="badge badge-gold text-[10px]">{unitType}</span>}
            {categories.map((cat) => (
              <span
                key={cat}
                className="font-heading text-[10px] tracking-widest uppercase px-1.5 py-0.5 border border-gold-muted/30 text-gold-muted"
              >
                {cat}
              </span>
            ))}
          </div>
        )}

        <div className="divider-gold" />
      </div>

      {/* Unit stat blocks */}
      {unitProfiles.length > 0 && (
        <section className="mb-5">
          <h3 className="font-heading text-xs tracking-[0.2em] uppercase text-gold-muted mb-3">
            Unit Profile
          </h3>
          {unitProfiles.map((p) => (
            <HHStatBlock key={p.id} profile={p} showName={unitProfiles.length > 1} />
          ))}
        </section>
      )}

      {/* Weapons */}
      {(rangedWeapons.length > 0 || meleeWeapons.length > 0) && (
        <section className="mb-5">
          <h3 className="font-heading text-xs tracking-[0.2em] uppercase text-gold-muted mb-3">
            Weapons
          </h3>
          <HHWeaponTable weapons={rangedWeapons} cols={HH_RANGED_COLS} title="Ranged Weapons" />
          <HHWeaponTable weapons={meleeWeapons} cols={HH_MELEE_COLS} title="Melee Weapons" />
        </section>
      )}

      {/* Special rules / abilities */}
      {abilities.length > 0 && (
        <section className="mb-5">
          <h3 className="font-heading text-xs tracking-[0.2em] uppercase text-gold-muted mb-3">
            Special Rules
          </h3>
          <div className="space-y-3">
            {abilities.map((r) => (
              <div key={r.id} className="bg-void-800 border border-gold-muted/15 p-4">
                <p className="font-heading text-gold text-sm tracking-wide mb-1.5">{r.name}</p>
                {r.description && (
                  <p className="font-body text-parchment-muted text-sm leading-relaxed whitespace-pre-wrap">
                    {r.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Wargear options */}
      {entry.groups.length > 0 && (
        <section className="mb-5">
          <h3 className="font-heading text-xs tracking-[0.2em] uppercase text-gold-muted mb-3">
            Wargear Options
          </h3>
          <div className="space-y-3">
            {entry.groups.map((g) => (
              <div key={g.id} className="border-l-2 border-gold-muted/20 pl-4">
                {g.name && (
                  <p className="font-heading text-parchment text-xs tracking-wide mb-1.5">
                    {g.name}
                  </p>
                )}
                <ul className="space-y-1">
                  {g.entries.map((e) => {
                    const pts = e.costs.find((c) => c.name === 'pts')
                    return (
                      <li key={e.id} className="flex items-baseline gap-2">
                        <span className="font-body text-parchment-muted text-sm">• {e.name}</span>
                        {pts && (
                          <span className="font-heading text-[10px] text-gold-muted">
                            {pts.value}pts
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {unitProfiles.length === 0 && abilities.length === 0 && (
        <p className="text-parchment-faint text-sm font-body italic">
          No profile data for this entry.
        </p>
      )}
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function HHSidebar({
  sheets,
  search,
  selectedId,
  onSelect,
}: {
  sheets: HHDatasheet[]
  search: string
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return q ? sheets.filter((s) => s.entry.name.toLowerCase().includes(q)) : sheets
  }, [sheets, search])

  // Group by base type string (strips parenthetical sub-type)
  const groups = useMemo(() => {
    const map = new Map<string, HHDatasheet[]>()
    for (const s of filtered) {
      const label =
        unitTypeGroup(s.unitType) ||
        (s.entry.type === 'unit' ? 'Unit' : s.entry.type === 'model' ? 'Model' : 'Other')
      if (!map.has(label)) map.set(label, [])
      map.get(label)!.push(s)
    }
    return [...map.entries()].sort(([a], [b]) => {
      if (a === 'Other') return 1
      if (b === 'Other') return -1
      return a.localeCompare(b)
    })
  }, [filtered])

  return (
    <div className="overflow-y-auto h-full">
      {groups.length === 0 && (
        <p className="text-parchment-faint text-xs font-body italic px-4 py-6">
          No units match your search.
        </p>
      )}
      {groups.map(([label, items]) => {
        const isOpen = !collapsed[label]
        return (
          <div key={label}>
            <button
              onClick={() => setCollapsed((p) => ({ ...p, [label]: isOpen }))}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-void-800 transition-colors"
            >
              <span className="font-heading text-xs tracking-[0.15em] uppercase text-gold">
                {label}
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

// ── Reaction card ─────────────────────────────────────────────────────────────

function ReactionCard({ reaction }: { reaction: HHReaction }) {
  const fields: { label: string; value: string }[] = [
    { label: 'Trigger', value: reaction.trigger },
    { label: 'Cost', value: reaction.cost },
    { label: 'Target', value: reaction.target },
    { label: 'Process', value: reaction.process },
  ].filter((f) => f.value)

  return (
    <div className="border border-gold-muted/20 bg-void-800 px-4 py-3">
      <p className="font-heading text-gold text-sm tracking-wide mb-1">{reaction.name}</p>
      {reaction.summary && (
        <p className="font-body text-parchment-muted text-xs mb-2 italic">{reaction.summary}</p>
      )}
      {fields.length > 0 && (
        <dl className="space-y-1.5">
          {fields.map((f) => (
            <div key={f.label} className="flex gap-2">
              <dt className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint shrink-0 w-16">
                {f.label}
              </dt>
              <dd className="font-body text-parchment-muted text-xs leading-relaxed">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}

// ── Gambit card ───────────────────────────────────────────────────────────────

function GambitCard({ gambit }: { gambit: HHGambit }) {
  return (
    <div className="border border-gold-muted/20 bg-void-800 px-4 py-3">
      <div className="flex items-baseline gap-2 flex-wrap mb-1">
        <p className="font-heading text-gold text-sm tracking-wide">{gambit.name}</p>
        <span className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint">
          {gambit.typeName}
        </span>
      </div>
      {gambit.summary && (
        <p className="font-body text-parchment text-xs mb-1">{gambit.summary}</p>
      )}
      {gambit.description && (
        <p className="font-body text-parchment-muted text-xs leading-relaxed whitespace-pre-wrap">
          {gambit.description}
        </p>
      )}
    </div>
  )
}

// ── Army rules panel ──────────────────────────────────────────────────────────

function HHArmyRulesPanel({
  rules,
  reactions,
  gambits,
}: {
  rules: RuleEntry[]
  reactions: HHReaction[]
  gambits: HHGambit[]
}) {
  return (
    <div className="flex-1 overflow-y-auto bg-void-900/50 p-5">
      {/* Army rules */}
      {rules.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="font-heading text-xs tracking-[0.2em] uppercase text-gold shrink-0">
              Army Rules
            </h3>
            <div className="flex-1 h-px bg-gold-muted/15" />
            <span className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint shrink-0">
              {rules.length}
            </span>
          </div>
          <div className="space-y-3">
            {rules.map((r) => (
              <div key={r.id} className="bg-void-800 border border-gold-muted/15 p-4">
                <p className="font-heading text-gold text-sm tracking-wide mb-1.5">{r.name}</p>
                <p className="font-body text-parchment-muted text-sm leading-relaxed whitespace-pre-wrap">
                  {stripBsMarkup(r.description)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reactions */}
      {reactions.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="font-heading text-xs tracking-[0.2em] uppercase text-gold shrink-0">
              Reactions
            </h3>
            <div className="flex-1 h-px bg-gold-muted/15" />
            <span className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint shrink-0">
              {reactions.length}
            </span>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
            {reactions.map((r) => (
              <ReactionCard key={r.name} reaction={r} />
            ))}
          </div>
        </section>
      )}

      {/* Gambits */}
      {gambits.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="font-heading text-xs tracking-[0.2em] uppercase text-gold shrink-0">
              Gambits
            </h3>
            <div className="flex-1 h-px bg-gold-muted/15" />
            <span className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint shrink-0">
              {gambits.length}
            </span>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
            {gambits.map((g) => (
              <GambitCard key={g.name} gambit={g} />
            ))}
          </div>
        </section>
      )}

      {rules.length === 0 && reactions.length === 0 && gambits.length === 0 && (
        <p className="text-parchment-faint text-sm font-body italic">
          No army rules found for this faction.
        </p>
      )}
    </div>
  )
}

// ── Main viewer ───────────────────────────────────────────────────────────────

export default function HHViewer() {
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
  const [coreRulesLoading, setCoreRulesLoading] = useState(false)
  const [coreRulesSearch, setCoreRulesSearch] = useState('')

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
      .then((d) => setParsedCatalogue(catalogueId, d))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [catalogueId])

  // Load core rules from game system when that tab is first opened
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

  const catNames = useMemo(
    () => buildCatNamesMap(catalogue?.categoryEntries ?? []),
    [catalogue],
  )

  const sheets = useMemo(
    () =>
      catalogue
        ? catalogue.entries
            .filter((e) => e.type === 'unit' || e.type === 'model')
            .map((e) => buildHHDatasheet(e, catNames))
        : [],
    [catalogue, catNames],
  )

  const reactions = useMemo(
    () => (catalogue ? extractReactions(catalogue.entries) : []),
    [catalogue],
  )

  const gambits = useMemo(
    () => (catalogue ? extractGambits(catalogue.entries) : []),
    [catalogue],
  )

  const selectedSheet = useMemo(
    () => (selectedId ? sheets.find((s) => s.entry.id === selectedId) ?? null : null),
    [sheets, selectedId],
  )

  // Auto-select first unit when data loads
  useEffect(() => {
    if (sheets.length > 0 && selectedId === null) {
      setSelectedId(sheets[0].entry.id)
    }
  }, [sheets, selectedId])

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

  const filteredCoreRules = coreRulesSearch
    ? coreRules.filter(
        (r) =>
          r.name.toLowerCase().includes(coreRulesSearch.toLowerCase()) ||
          r.description.toLowerCase().includes(coreRulesSearch.toLowerCase()),
      )
    : coreRules

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

      {/* Content area */}
      <div className="flex-1 flex overflow-hidden border-x border-b border-gold-muted/15">
        {tab === 'datasheets' ? (
          <>
            {/* Sidebar */}
            <div
              className={`${showSidebar ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-64 lg:w-72 shrink-0 border-r border-gold-muted/15 bg-void-900`}
            >
              <div className="px-4 py-2 border-b border-gold-muted/10">
                <p className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint">
                  {sheets.length} units
                </p>
              </div>
              {sheets.length === 0 && catalogue.catalogueLinks.length > 0 && (
                <div className="mx-3 mt-3 px-3 py-3 border border-gold-muted/25 bg-gold/5">
                  <p className="text-gold-muted text-xs font-body leading-relaxed">
                    This legion's datasheets are stored in a linked Library catalogue. Use{' '}
                    <span className="text-gold font-heading tracking-wide">Download All</span> on
                    the game system page to fetch all required files.
                  </p>
                </div>
              )}
              <HHSidebar
                sheets={sheets}
                search={searchDebounced}
                selectedId={selectedId}
                onSelect={(id) => {
                  setSelectedId(id)
                  setShowSidebar(false)
                }}
              />
            </div>

            {/* Detail panel */}
            <div
              className={`${!showSidebar ? 'flex' : 'hidden'} md:flex flex-1 overflow-hidden bg-void-900/50`}
            >
              <HHDatasheetDetail sheet={selectedSheet} />
            </div>
          </>
        ) : tab === 'army-rules' ? (
          <HHArmyRulesPanel
            rules={catalogue.rules}
            reactions={reactions}
            gambits={gambits}
          />
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
                    placeholder="Search rules…"
                    className="bg-void-800 border border-gold-muted/25 text-parchment placeholder-parchment-faint text-xs font-body px-3 py-1.5 w-56 focus:outline-none focus:border-gold/50 transition-colors"
                  />
                  <span className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint">
                    {coreRules.length} rules
                  </span>
                </div>

                <div className="space-y-3">
                  {filteredCoreRules.map((r) => (
                    <div key={r.id} className="bg-void-800 border border-gold-muted/15 p-4">
                      <p className="font-heading text-gold text-sm tracking-wide mb-1.5">
                        {r.name}
                      </p>
                      <p className="font-body text-parchment-muted text-sm leading-relaxed whitespace-pre-wrap">
                        {stripBsMarkup(r.description)}
                      </p>
                    </div>
                  ))}
                  {filteredCoreRules.length === 0 && (
                    <p className="text-parchment-faint text-sm font-body italic">
                      {coreRules.length === 0
                        ? 'Core rules not loaded. Re-download may be required.'
                        : 'No rules match your search.'}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
