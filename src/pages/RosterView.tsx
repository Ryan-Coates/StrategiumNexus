import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useGameStore } from '../store/gameStore'
import { getRoster } from '../services/db'
import { parseCatalogueData } from '../services/dataManager'
import { getStratagemsForCatalogue } from '../services/stratagemLoader'
import {
  buildRosterDatasheet,
  buildDetachments,
  buildEnhancements,
  DatasheetDetail,
  DetachmentPanel,
  type Datasheet,
  type Enhancement,
} from '../components/Wh40k/Wh40kHelpers'
import { getCategoryForSystem, buildCatNamesMap, OTHER_GROUP } from '../data/wh40kCategories'
import type { UnitCategoryGroup } from '../data/wh40kCategories'
import Spinner from '../components/Spinner'
import type { Roster, SelectionEntry, RosterUnit } from '../types'

// ── Pts helpers (mirrors ReviewStep logic) ────────────────────────────────────

function bracketPts(entry: SelectionEntry, modelCount: number): number {
  const base = entry.costs.find((c) => c.name === 'pts')?.value ?? 0
  let pts = base
  for (const bracket of entry.costBrackets) {
    if (modelCount >= bracket.minModels) pts = bracket.pts
  }
  return pts
}

function unitPts(unit: RosterUnit, entry: SelectionEntry): number {
  const modelCount = (unit.models ?? []).length || 1
  return bracketPts(entry, modelCount)
}

// ── Expandable unit card ──────────────────────────────────────────────────────

function UnitCard({
  unit,
  entry,
  isWarlord,
  enhancement,
}: {
  unit: RosterUnit
  entry: SelectionEntry | undefined
  isWarlord: boolean
  enhancement?: Enhancement
}) {
  const [open, setOpen] = useState(false)
  const sheet: Datasheet | null = useMemo(
    () => (entry ? buildRosterDatasheet(unit, entry) : null),
    [unit, entry],
  )
  const pts = (entry ? unitPts(unit, entry) : 0) + (enhancement?.ptsValue ?? 0)
  const models = unit.models ?? []

  return (
    <div className="border border-gold-muted/15 transition-colors hover:border-gold-muted/30">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left gap-4"
      >
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          <span className="font-heading text-sm tracking-wide text-parchment truncate">
            {unit.customName || unit.catalogueName}
          </span>
          {unit.customName && (
            <span className="font-body text-xs text-parchment-faint">({unit.catalogueName})</span>
          )}
          {isWarlord && <span className="badge badge-gold text-[9px]">WARLORD</span>}
          {enhancement && (
            <span className="font-heading text-[9px] tracking-widest uppercase px-1.5 py-0.5 border border-gold/40 text-gold">
              {enhancement.name}
            </span>
          )}
          {models.length > 0 && (
            <span className="font-body text-[11px] text-parchment-faint">
              {models.length} model{models.length !== 1 ? 's' : ''}
            </span>
          )}
          {unit.notes && (
            <span className="font-body text-xs text-parchment-faint italic">{unit.notes}</span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {pts > 0 && (
            <span className="font-heading text-sm text-gold-muted">{pts} pts</span>
          )}
          <span className="text-parchment-faint text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-gold-muted/15">
          {sheet ? (
            <DatasheetDetail sheet={sheet} />
          ) : (
            <p className="font-body text-xs text-parchment-faint px-4 py-3">
              No datasheet data available — catalogue may not be downloaded yet.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RosterView() {
  const { id } = useParams<{ id: string }>()
  const { parsedCatalogues, setParsedCatalogue } = useGameStore()

  const [roster, setRoster] = useState<Roster | null>(null)
  const [loading, setLoading] = useState(true)
  const [catLoading, setCatLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load roster from DB
  useEffect(() => {
    if (!id) return
    setLoading(true)
    getRoster(id)
      .then((r) => {
        if (r) setRoster(r)
        else setError('Roster not found.')
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [id])

  // Load catalogue
  useEffect(() => {
    if (!roster?.catalogueId) return
    if (parsedCatalogues[roster.catalogueId]) return
    setCatLoading(true)
    parseCatalogueData(roster.catalogueId)
      .then((p) => setParsedCatalogue(roster.catalogueId, p))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setCatLoading(false))
  }, [roster?.catalogueId, parsedCatalogues, setParsedCatalogue])

  const catalogue = roster?.catalogueId ? (parsedCatalogues[roster.catalogueId] ?? null) : null

  const entryMap = useMemo(
    () => new Map(catalogue?.entries.map((e) => [e.id, e]) ?? []),
    [catalogue],
  )

  const catNames = useMemo(
    () => buildCatNamesMap(catalogue?.categoryEntries ?? []),
    [catalogue],
  )

  // Units grouped by category
  const grouped = useMemo(() => {
    if (!roster) return []
    const allUnits = [...roster.units, ...(roster.alliedUnits ?? [])]
    const map = new Map<string, { group: UnitCategoryGroup; items: { unit: RosterUnit; entry: SelectionEntry | undefined }[] }>()
    for (const unit of allUnits) {
      const entry = entryMap.get(unit.catalogueEntryId)
      const g: UnitCategoryGroup = entry
        ? getCategoryForSystem(entry.categoryIds, entry.primaryCategoryId, roster.systemId, catNames)
        : OTHER_GROUP
      if (!map.has(g.label)) map.set(g.label, { group: g, items: [] })
      map.get(g.label)!.items.push({ unit, entry })
    }
    return [...map.values()].sort((a, b) => a.group.order - b.group.order)
  }, [roster, entryMap, catNames])

  const detachments = useMemo(
    () => (catalogue ? buildDetachments(catalogue.entries) : []),
    [catalogue],
  )

  const enhancements = useMemo(
    () => (catalogue ? buildEnhancements(catalogue.entries) : []),
    [catalogue],
  )

  // Only show enhancements that have been assigned to a unit in this roster
  const enhancementsById = useMemo(
    () => new Map(enhancements.map((e) => [e.id, e])),
    [enhancements],
  )

  const totalPts = useMemo(() => {
    if (!roster) return 0
    return [...roster.units, ...(roster.alliedUnits ?? [])].reduce((sum, u) => {
      const entry = entryMap.get(u.catalogueEntryId)
      const enhPts = u.enhancementId ? enhancementsById.get(u.enhancementId)?.ptsValue ?? 0 : 0
      return sum + (entry ? unitPts(u, entry) : 0) + enhPts
    }, 0)
  }, [roster, entryMap, enhancementsById])

  const selectedEnhancements = useMemo(() => {
    if (!roster) return []
    const ids = new Set(
      [...roster.units, ...(roster.alliedUnits ?? [])]
        .map((u) => u.enhancementId)
        .filter(Boolean),
    )
    return enhancements.filter((e) => ids.has(e.id))
  }, [enhancements, roster])

  const stratagems = useMemo(
    () => (roster ? getStratagemsForCatalogue(roster.catalogueName) : []),
    [roster],
  )

  const catalogueRules = useMemo(() => catalogue?.rules ?? [], [catalogue])

  const hasArmyRules = catalogueRules.length > 0 || detachments.length > 0 || stratagems.length > 0 || selectedEnhancements.length > 0

  if (loading) return <Spinner label="Loading roster…" />

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="font-body text-blood-light mb-4">{error}</p>
        <Link to="/rosters" className="btn-primary">Back to Rosters</Link>
      </div>
    )
  }

  if (!roster) return null

  const overLimit = roster.pointsLimit > 0 && totalPts > roster.pointsLimit
  const warlordUid = roster.warlordUid ?? ''

  return (
    <div className="max-w-5xl mx-auto pb-12">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <Link
            to="/rosters"
            className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint hover:text-gold transition-colors block mb-2"
          >
            ← Rosters
          </Link>
          <h1 className="font-display text-2xl md:text-3xl text-gold tracking-wider">
            {roster.name || 'Unnamed Roster'}
          </h1>
          <p className="font-body text-parchment-muted text-sm mt-1">
            {roster.catalogueName}
            {roster.detachment ? ` · ${roster.detachment}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`font-heading text-xl tracking-wide ${overLimit ? 'text-blood-light' : 'text-gold'}`}>
            {totalPts}{roster.pointsLimit > 0 ? ` / ${roster.pointsLimit}` : ''} pts
          </span>
          <Link
            to={`/rosters/${roster.id}`}
            className="btn-ghost text-xs px-4 py-2"
          >
            Edit
          </Link>
        </div>
      </div>

      {catLoading && (
        <div className="mb-4">
          <Spinner label="Loading catalogue data…" />
        </div>
      )}

      {/* ── Units ── */}
      <div className="flex flex-col gap-6 mb-10">
        {grouped.map(({ group, items }) => (
          <div key={group.label}>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="font-heading text-xs tracking-[0.2em] uppercase text-gold shrink-0">
                {group.icon !== '•' ? `${group.icon} ` : ''}{group.label}
              </h2>
              <div className="flex-1 h-px bg-gold-muted/15" />
              <span className="font-heading text-[10px] text-parchment-faint shrink-0">
                {items.length} unit{items.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              {items.map(({ unit, entry }) => (
                <UnitCard
                  key={unit.uid}
                  unit={unit}
                  entry={entry}
                  isWarlord={warlordUid !== '' && warlordUid === unit.uid}
                  enhancement={unit.enhancementId ? enhancementsById.get(unit.enhancementId) : undefined}
                />
              ))}
            </div>
          </div>
        ))}

        {grouped.length === 0 && (
          <p className="font-body text-parchment-muted text-sm py-6 text-center">
            No units in this roster.
          </p>
        )}
      </div>

      {/* ── Army Rules (DetachmentPanel) ── */}
      {hasArmyRules && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-heading text-xs tracking-[0.2em] uppercase text-gold shrink-0">Army Rules</h2>
            <div className="flex-1 h-px bg-gold-muted/15" />
          </div>
          <div className="border border-gold-muted/20" style={{ minHeight: '12rem' }}>
            <DetachmentPanel
              catalogueRules={catalogueRules}
              detachments={detachments}
              enhancements={selectedEnhancements}
              stratagems={stratagems}
            />
          </div>
        </div>
      )}
    </div>
  )
}
