import { useEffect, useState, useMemo, useCallback } from 'react'
import { useGameStore } from '../../../store/gameStore'
import { useRosterStore } from '../../../store/rosterStore'
import { parseCatalogueData, loadCataloguesForSystem } from '../../../services/dataManager'
import { nanoid } from '../../../services/nanoid'
import {
  getCategoryForSystem,
  buildCatNamesMap,
  OTHER_GROUP,
} from '../../../data/wh40kCategories'
import type { UnitCategoryGroup } from '../../../data/wh40kCategories'
import type { SelectionEntry, ParsedCatalogue, CatalogueMeta, RosterUnit } from '../../../types'
import Spinner from '../../Spinner'

function entryPts(entry: SelectionEntry): number {
  return entry.costs.find((c) => c.name === 'pts')?.value ?? 0
}

function sumPts(units: { catalogueEntryId: string; models?: { length?: number } }[], allEntries: SelectionEntry[]): number {
  const map = new Map(allEntries.map((e) => [e.id, e]))
  return units.reduce((s, u) => {
    const entry = map.get(u.catalogueEntryId)
    if (!entry) return s
    const mc = (u.models as { length?: number } | undefined)?.length || 1
    let pts = entry.costs.find((c) => c.name === 'pts')?.value ?? 0
    for (const b of (entry.costBrackets ?? [])) { if (mc >= b.minModels) pts = b.pts }
    return s + pts
  }, 0)
}

// ── Category browser (left panel) ────────────────────────────────────────────

function CategoryBrowser({
  entries,
  search,
  categorize,
  onAdd,
}: {
  entries: SelectionEntry[]
  search: string
  categorize: (entry: SelectionEntry) => UnitCategoryGroup
  onAdd: (entry: SelectionEntry) => void
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, { group: UnitCategoryGroup; entries: SelectionEntry[] }>()
    for (const e of entries) {
      const g = categorize(e)
      if (!map.has(g.label)) map.set(g.label, { group: g, entries: [] })
      map.get(g.label)!.entries.push(e)
    }
    return [...map.values()].sort((a, b) => a.group.order - b.group.order)
  }, [entries, categorize])

  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(grouped.map((g) => g.group.label)),
  )

  useEffect(() => {
    setOpenGroups(new Set(grouped.map((g) => g.group.label)))
  }, [grouped.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const q = search.toLowerCase()
  const filtered = search.trim() ? entries.filter((e) => e.name.toLowerCase().includes(q)) : null

  if (entries.length === 0) {
    return <p className="font-body text-parchment-faint text-sm italic py-4 text-center">No units found.</p>
  }

  if (filtered !== null) {
    if (filtered.length === 0) {
      return <p className="font-body text-parchment-faint text-sm italic py-4 text-center">No matches.</p>
    }
    return (
      <div className="flex flex-col gap-1">
        {filtered.map((e) => <UnitButton key={e.id} entry={e} onAdd={onAdd} />)}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {grouped.map(({ group, entries: gEntries }) => {
        const isOpen = openGroups.has(group.label)
        return (
          <div key={group.label} className="border border-gold-muted/15">
            <button
              onClick={() =>
                setOpenGroups((prev) => {
                  const next = new Set(prev)
                  isOpen ? next.delete(group.label) : next.add(group.label)
                  return next
                })
              }
              className="w-full flex items-center justify-between px-3 py-2 bg-void-800 hover:bg-gold/5 transition-colors"
            >
              <span className="font-heading text-[11px] tracking-widest uppercase text-gold-muted">
                {group.label}
              </span>
              <span className="text-parchment-faint text-xs">
                {gEntries.length} {isOpen ? '▲' : '▼'}
              </span>
            </button>
            {isOpen && (
              <div className="flex flex-col gap-0.5 p-1.5">
                {gEntries.map((e) => <UnitButton key={e.id} entry={e} onAdd={onAdd} />)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function UnitButton({ entry, onAdd }: { entry: SelectionEntry; onAdd: (e: SelectionEntry) => void }) {
  return (
    <button
      onClick={() => onAdd(entry)}
      className="w-full text-left px-3 py-2 border border-gold-muted/10 hover:border-gold bg-void-900 hover:bg-gold/5 transition-colors group"
    >
      <div className="flex items-center justify-between">
        <span className="font-heading text-xs tracking-wide text-parchment group-hover:text-gold transition-colors">
          {entry.name}
        </span>
        <span className="font-heading text-xs text-gold-muted ml-2 shrink-0">
          {entryPts(entry) > 0 ? `${entryPts(entry)} pts` : '—'}
        </span>
      </div>
      {entry.profiles.length > 0 && (
        <p className="font-body text-[10px] text-parchment-faint mt-0.5">{entry.profiles[0].typeName}</p>
      )}
    </button>
  )
}

// ── Categorized roster panel (right panel) ───────────────────────────────────

function CategorizedRoster({
  units,
  catalogue,
  categorize,
  onRemove,
  sectionLabel,
}: {
  units: RosterUnit[]
  catalogue: ParsedCatalogue | null
  categorize: (entry: SelectionEntry) => UnitCategoryGroup
  onRemove: (uid: string) => void
  sectionLabel?: string
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, { group: UnitCategoryGroup; items: RosterUnit[] }>()
    for (const unit of units) {
      const entry = catalogue?.entries.find((e) => e.id === unit.catalogueEntryId)
      const g = entry ? categorize(entry) : OTHER_GROUP
      if (!map.has(g.label)) map.set(g.label, { group: g, items: [] })
      map.get(g.label)!.items.push(unit)
    }
    return [...map.values()].sort((a, b) => a.group.order - b.group.order)
  }, [units, catalogue, categorize])

  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(grouped.map((g) => g.group.label)),
  )

  useEffect(() => {
    setOpenGroups(new Set(grouped.map((g) => g.group.label)))
  }, [grouped.length]) // eslint-disable-line react-hooks/exhaustive-deps

  if (units.length === 0) return null

  return (
    <div className="flex flex-col gap-1.5">
      {sectionLabel && (
        <p className="font-heading text-[10px] tracking-widest uppercase text-gold-muted px-1 pt-1">
          {sectionLabel}
        </p>
      )}
      {grouped.map(({ group, items }) => {
        const isOpen = openGroups.has(group.label)
        const groupPts = items.reduce((sum, unit) => {
          const entry = catalogue?.entries.find((e) => e.id === unit.catalogueEntryId)
          return sum + (entry ? entryPts(entry) : 0)
        }, 0)
        return (
          <div key={group.label} className="border border-gold-muted/15">
            <button
              onClick={() =>
                setOpenGroups((prev) => {
                  const next = new Set(prev)
                  isOpen ? next.delete(group.label) : next.add(group.label)
                  return next
                })
              }
              className="w-full flex items-center justify-between px-3 py-1.5 bg-void-800 hover:bg-gold/5 transition-colors"
            >
              <span className="font-heading text-[10px] tracking-widest uppercase text-gold-muted">
                {group.label}{' '}
                <span className="text-parchment-faint font-normal">({items.length})</span>
              </span>
              <span className="font-heading text-[10px] text-gold-muted flex items-center gap-2">
                {groupPts > 0 && <span>{groupPts} pts</span>}
                <span>{isOpen ? '▲' : '▼'}</span>
              </span>
            </button>
            {isOpen && (
              <div className="flex flex-col gap-0.5 p-1">
                {items.map((unit) => {
                  const entry = catalogue?.entries.find((e) => e.id === unit.catalogueEntryId)
                  const pts = entry ? entryPts(entry) : 0
                  return (
                    <div key={unit.uid} className="flex items-center gap-2 px-2 py-1.5 bg-void-900">
                      <div className="flex-1 min-w-0">
                        <p className="font-heading text-xs tracking-wide text-parchment truncate">
                          {unit.customName || unit.catalogueName}
                        </p>
                        {unit.customName && (
                          <p className="font-body text-[10px] text-parchment-faint truncate">
                            {unit.catalogueName}
                          </p>
                        )}
                      </div>
                      <span className="font-heading text-xs text-gold-muted shrink-0">
                        {pts > 0 ? `${pts}` : '—'}
                      </span>
                      <button
                        onClick={() => onRemove(unit.uid)}
                        className="text-parchment-faint hover:text-blood-light transition-colors ml-1 shrink-0"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BuildRosterStep() {
  const { activeRoster, addUnit, removeUnit, addAlliedUnit, removeAlliedUnit, setRosterField } =
    useRosterStore()
  const { parsedCatalogues, setParsedCatalogue, catalogues: cataloguesBySystem } = useGameStore()
  const [tab, setTab] = useState<'main' | 'allied'>('main')
  const [mainSearch, setMainSearch] = useState('')
  const [alliedLoading, setAlliedLoading] = useState(false)
  const [alliedError, setAlliedError] = useState('')
  const [alliedSearch, setAlliedSearch] = useState('')
  const [alliedCatalogueList, setAlliedCatalogueList] = useState<CatalogueMeta[]>([])
  const [alliedListLoading, setAlliedListLoading] = useState(false)

  const mainCatalogue: ParsedCatalogue | null = activeRoster?.catalogueId
    ? (parsedCatalogues[activeRoster.catalogueId] ?? null)
    : null
  const alliedCatalogue: ParsedCatalogue | null = activeRoster?.alliedCatalogueId
    ? (parsedCatalogues[activeRoster.alliedCatalogueId] ?? null)
    : null

  // Main catalogue loading is handled by RosterWizard; derive loading state from store
  const mainLoading = !!activeRoster?.catalogueId && !mainCatalogue
  const mainError = ''

  // Load allied catalogue list when tab opens
  useEffect(() => {
    if (tab !== 'allied' || !activeRoster?.systemId) return
    if (alliedCatalogueList.length > 0) return
    // Use cached list from gameStore if available, else load
    const cached = cataloguesBySystem[activeRoster.systemId]
    if (cached) { setAlliedCatalogueList(cached.filter((c) => !c.isLibrary && !c.name.toLowerCase().includes('library'))); return }
    setAlliedListLoading(true)
    loadCataloguesForSystem(activeRoster.systemId)
      .then((cats) => setAlliedCatalogueList(cats.filter((c) => !c.isLibrary && !c.name.toLowerCase().includes('library'))))
      .finally(() => setAlliedListLoading(false))
  }, [tab, activeRoster?.systemId, alliedCatalogueList.length, cataloguesBySystem])

  // Load allied catalogue data when one is selected (still needed here for immediate feedback)
  useEffect(() => {
    if (!activeRoster?.alliedCatalogueId || parsedCatalogues[activeRoster.alliedCatalogueId]) return
    setAlliedLoading(true); setAlliedError('')
    parseCatalogueData(activeRoster.alliedCatalogueId)
      .then((p) => setParsedCatalogue(activeRoster.alliedCatalogueId, p))
      .catch((e: Error) => setAlliedError(e.message))
      .finally(() => setAlliedLoading(false))
  }, [activeRoster?.alliedCatalogueId, parsedCatalogues, setParsedCatalogue])

  const systemId = activeRoster?.systemId ?? ''
  const mainCatNames = useMemo(
    () => buildCatNamesMap(mainCatalogue?.categoryEntries ?? []),
    [mainCatalogue],
  )
  const alliedCatNames = useMemo(
    () => buildCatNamesMap(alliedCatalogue?.categoryEntries ?? []),
    [alliedCatalogue],
  )
  const categorizeMain = useCallback(
    (entry: SelectionEntry) =>
      getCategoryForSystem(entry.categoryIds, entry.primaryCategoryId, systemId, mainCatNames),
    [systemId, mainCatNames],
  )
  const categorizeAllied = useCallback(
    (entry: SelectionEntry) =>
      getCategoryForSystem(entry.categoryIds, entry.primaryCategoryId, systemId, alliedCatNames),
    [systemId, alliedCatNames],
  )

  const mainUnits = useMemo(
    () => mainCatalogue?.entries.filter((e) => e.type === 'unit' || e.type === 'model') ?? [],
    [mainCatalogue],
  )
  const alliedUnits = useMemo(
    () => alliedCatalogue?.entries.filter((e) => e.type === 'unit' || e.type === 'model') ?? [],
    [alliedCatalogue],
  )

  if (!activeRoster) return null
  if (!activeRoster.catalogueId) {
    return (
      <div className="py-12 text-center font-body text-parchment-muted">
        Select a faction in Step 2 first.
      </div>
    )
  }

  const mainPts = mainCatalogue ? sumPts(activeRoster.units, mainCatalogue.entries) : 0
  const alliedPts = alliedCatalogue ? sumPts(activeRoster.alliedUnits ?? [], alliedCatalogue.entries) : 0
  const totalPts = mainPts + alliedPts
  const overLimit = totalPts > activeRoster.pointsLimit

  function makeUnit(entry: SelectionEntry): RosterUnit {
    return {
      uid: nanoid(),
      catalogueEntryId: entry.id,
      catalogueName: entry.name,
      customName: '',
      notes: '',
      selections: [],
      enhancementId: '',
      models: [],
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-xl text-gold tracking-wider">Build Your Roster</h2>
          <p className="font-body text-parchment-muted text-sm">{activeRoster.catalogueName}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`font-heading text-lg tracking-wide ${overLimit ? 'text-blood-light' : 'text-gold'}`}>
            {totalPts}
          </span>
          <span className="font-heading text-parchment-faint text-sm">/ {activeRoster.pointsLimit} pts</span>
          {overLimit && <span className="badge badge-blood text-[10px]">OVER</span>}
        </div>
      </div>

      <div className="divider-gold" />

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gold-muted/20">
        {(['main', 'allied'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 font-heading text-xs tracking-widest uppercase transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-gold text-gold'
                : 'border-transparent text-parchment-muted hover:text-parchment'
            }`}
          >
            {t === 'main' ? 'Main Force' : 'Allied Detachment'}
            {t === 'allied' && (activeRoster.alliedUnits ?? []).length > 0 && (
              <span className="ml-1.5 badge badge-gold text-[9px]">
                {(activeRoster.alliedUnits ?? []).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── LEFT: Unit browser ── */}
        <div className="flex flex-col gap-3">
          {tab === 'main' ? (
            <>
              <div className="flex items-center gap-2">
                <span className="font-heading text-xs tracking-widest uppercase text-gold-muted">
                  Available Units
                </span>
                {mainLoading && <Spinner />}
              </div>
              {mainError && (
                <p className="text-blood-light text-xs font-body px-3 py-2 border border-blood/30">
                  {mainError}
                </p>
              )}
              {!mainLoading && !mainError && (
                <>
                  <input
                    type="text"
                    placeholder="Search units…"
                    value={mainSearch}
                    onChange={(e) => setMainSearch(e.target.value)}
                    className="bg-void-800 border border-gold-muted/30 px-3 py-2 font-body text-parchment text-sm placeholder:text-parchment-faint focus:outline-none focus:border-gold transition-colors"
                  />
                  <div className="flex flex-col gap-1 max-h-[55vh] overflow-y-auto pr-1">
                    <CategoryBrowser
                      entries={mainUnits}
                      search={mainSearch}
                      categorize={categorizeMain}
                      onAdd={(entry) => addUnit(makeUnit(entry))}
                    />
                  </div>
                </>
              )}
            </>
          ) : (
            /* Allied catalogue browser */
            <>
              <span className="font-heading text-xs tracking-widest uppercase text-gold-muted">
                Allied Faction
              </span>
              {alliedListLoading ? (
                <Spinner />
              ) : (
                <select
                  value={activeRoster.alliedCatalogueId ?? ''}
                  onChange={(e) => {
                    const cat = alliedCatalogueList.find((c) => c.id === e.target.value)
                    setRosterField('alliedCatalogueId', e.target.value)
                    setRosterField('alliedCatalogueName', cat?.name ?? '')
                  }}
                  className="bg-void-800 border border-gold-muted/30 px-3 py-2 font-body text-parchment text-sm focus:outline-none focus:border-gold transition-colors"
                >
                  <option value="">— Select allied faction —</option>
                  {alliedCatalogueList
                    .filter((c) => c.id !== activeRoster.catalogueId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              )}
              {activeRoster.alliedCatalogueId && (
                <>
                  {alliedLoading && <Spinner />}
                  {alliedError && (
                    <p className="text-blood-light text-xs font-body px-3 py-2 border border-blood/30">
                      {alliedError}
                    </p>
                  )}
                  {!alliedLoading && !alliedError && (
                    <>
                      <input
                        type="text"
                        placeholder="Search units…"
                        value={alliedSearch}
                        onChange={(e) => setAlliedSearch(e.target.value)}
                        className="bg-void-800 border border-gold-muted/30 px-3 py-2 font-body text-parchment text-sm placeholder:text-parchment-faint focus:outline-none focus:border-gold transition-colors"
                      />
                      <div className="flex flex-col gap-1 max-h-[45vh] overflow-y-auto pr-1">
                        <CategoryBrowser
                          entries={alliedUnits}
                          search={alliedSearch}
                          categorize={categorizeAllied}
                          onAdd={(entry) => addAlliedUnit(makeUnit(entry))}
                        />
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* ── RIGHT: Roster panel with categories ── */}
        <div className="flex flex-col gap-3">
          <span className="font-heading text-xs tracking-widest uppercase text-gold-muted">
            Your Roster (
            {activeRoster.units.length + (activeRoster.alliedUnits ?? []).length} units)
          </span>

          {activeRoster.units.length === 0 && (activeRoster.alliedUnits ?? []).length === 0 ? (
            <div className="border border-gold-muted/15 p-6 text-center">
              <p className="font-body text-parchment-faint text-sm italic">
                Click a unit on the left to add it.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
              <CategorizedRoster
                units={activeRoster.units}
                catalogue={mainCatalogue}
                categorize={categorizeMain}
                onRemove={removeUnit}
                sectionLabel={
                  (activeRoster.alliedUnits ?? []).length > 0 ? 'Main Force' : undefined
                }
              />
              {(activeRoster.alliedUnits ?? []).length > 0 && (
                <CategorizedRoster
                  units={activeRoster.alliedUnits ?? []}
                  catalogue={alliedCatalogue}
                  categorize={categorizeAllied}
                  onRemove={removeAlliedUnit}
                  sectionLabel={`Allied · ${activeRoster.alliedCatalogueName}`}
                />
              )}
            </div>
          )}

          {activeRoster.units.length + (activeRoster.alliedUnits ?? []).length > 0 && (
            <div className="mt-1">
              <div className="h-1.5 bg-void-800 w-full">
                <div
                  className={`h-full transition-all ${overLimit ? 'bg-blood' : 'bg-gold'}`}
                  style={{ width: `${Math.min(100, (totalPts / activeRoster.pointsLimit) * 100)}%` }}
                />
              </div>
              <p
                className={`font-heading text-[10px] tracking-wide mt-1 ${overLimit ? 'text-blood-light' : 'text-parchment-faint'}`}
              >
                {totalPts} / {activeRoster.pointsLimit} pts{overLimit && ' — OVER LIMIT'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
