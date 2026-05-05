import { useState, useMemo } from 'react'
import { useGameStore } from '../../../store/gameStore'
import { useRosterStore } from '../../../store/rosterStore'
import { getStratagemsForCatalogue } from '../../../services/stratagemLoader'
import {
  getCategoryForSystem,
  buildCatNamesMap,
  OTHER_GROUP,
} from '../../../data/wh40kCategories'
import type { UnitCategoryGroup } from '../../../data/wh40kCategories'
import type { SelectionEntry, RosterUnit } from '../../../types'

// Resolve which SelectionEntry a model uses (child or group entry)
function resolveEntry(childEntryId: string, parent: SelectionEntry): SelectionEntry {
  if (!childEntryId) return parent
  for (const c of parent.children) if (c.id === childEntryId) return c
  for (const g of parent.groups) {
    const found = g.entries.find((e) => e.id === childEntryId)
    if (found) return found
  }
  return parent
}

function entryPts(entry: SelectionEntry): number {
  return entry.costs.find((c) => c.name === 'pts')?.value ?? 0
}

function bracketPts(entry: SelectionEntry, modelCount: number): number {
  const base = entryPts(entry)
  let pts = base
  for (const bracket of entry.costBrackets) {
    if (modelCount >= bracket.minModels) pts = bracket.pts
  }
  return pts
}

function unitTotalPts(unit: RosterUnit, entry: SelectionEntry | undefined): number {
  if (!entry) return 0
  const models = unit.models ?? []
  const modelCount = models.length || 1
  const base = bracketPts(entry, modelCount)
  // Per-model selection upgrade costs
  const modelUpgradePts = models.reduce((sum, model) => {
    const me = resolveEntry(model.childEntryId, entry)
    return sum + model.selections.reduce((s, sel) => {
      const opt =
        me.groups.flatMap((g) => g.entries).find((e) => e.id === sel.entryId) ??
        me.children.find((e) => e.id === sel.entryId)
      return s + (opt ? entryPts(opt) * sel.count : 0)
    }, 0)
  }, 0)
  // Legacy unit-level selections
  const legacyUpgrades = unit.selections.reduce((sum, sel) => {
    const opt =
      entry.groups.flatMap((g) => g.entries).find((e) => e.id === sel.entryId) ??
      entry.children.find((e) => e.id === sel.entryId)
    return sum + (opt ? entryPts(opt) * sel.count : 0)
  }, 0)
  return base + modelUpgradePts + legacyUpgrades
}

/** Compact loadout lines for the review: "N× Model Type — weapon1, weapon2" */
function loadoutLines(unit: RosterUnit, entry: SelectionEntry): string[] {
  const models = unit.models ?? []
  if (models.length === 0) return []
  const groups = new Map<string, { name: string; count: number; gear: string[] }>()
  for (const model of models) {
    const me = resolveEntry(model.childEntryId, entry)
    const selNames = model.selections
      .map((sel) => {
        return (
          me.groups.flatMap((g) => g.entries).find((e) => e.id === sel.entryId)?.name ??
          me.children.find((e) => e.id === sel.entryId)?.name
        )
      })
      .filter(Boolean) as string[]
    const gear = [
      ...me.linkedEquipment.filter((eq) => !selNames.includes(eq)),
      ...selNames,
    ]
    const key = `${model.childEntryId}|${selNames.sort().join('|')}`
    if (!groups.has(key)) {
      groups.set(key, { name: me !== entry ? me.name : entry.name, count: 0, gear })
    }
    groups.get(key)!.count++
  }
  return [...groups.values()].map(({ name, count, gear }) => {
    const prefix = `${count > 1 ? `${count}× ` : ''}${name}`
    return gear.length > 0 ? `${prefix} — ${gear.join(', ')}` : prefix
  })
}

// ── Categorized unit section ──────────────────────────────────────────────────

function CategorySection({
  units,
  entryMap,
  systemId,
  catNames,
  sectionLabel,
  warlordUid,
}: {
  units: RosterUnit[]
  entryMap: Map<string, SelectionEntry>
  systemId: string
  catNames: Map<string, string>
  sectionLabel?: string
  warlordUid: string
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, { group: UnitCategoryGroup; items: { unit: RosterUnit; entry: SelectionEntry | undefined; pts: number }[] }>()
    for (const unit of units) {
      const entry = entryMap.get(unit.catalogueEntryId)
      const g: UnitCategoryGroup = entry
        ? getCategoryForSystem(entry.categoryIds, entry.primaryCategoryId, systemId, catNames)
        : OTHER_GROUP
      if (!map.has(g.label)) map.set(g.label, { group: g, items: [] })
      map.get(g.label)!.items.push({ unit, entry, pts: unitTotalPts(unit, entry) })
    }
    return [...map.values()].sort((a, b) => a.group.order - b.group.order)
  }, [units, entryMap, systemId, catNames])

  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(grouped.map((g) => g.group.label)),
  )

  const sectionPts = units.reduce((sum, u) => sum + unitTotalPts(u, entryMap.get(u.catalogueEntryId)), 0)

  return (
    <div className="flex flex-col gap-2">
      {sectionLabel && (
        <div className="flex items-center justify-between">
          <span className="font-heading text-xs tracking-widest uppercase text-gold-muted">{sectionLabel}</span>
          <span className="font-heading text-xs text-gold-muted">{sectionPts} pts</span>
        </div>
      )}
      {grouped.map(({ group, items }) => {
        const isOpen = openGroups.has(group.label)
        const groupPts = items.reduce((s, i) => s + i.pts, 0)
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
              <div className="flex flex-col divide-y divide-gold-muted/10 px-3">
                {items.map(({ unit, entry, pts }) => (
                  <div key={unit.uid} className="py-2 flex items-start gap-3">
                    <div className="flex-1">
                      <p className="font-heading text-sm tracking-wide text-parchment flex items-center gap-2 flex-wrap">
                        {unit.customName || unit.catalogueName}
                        {warlordUid === unit.uid && warlordUid !== '' && (
                          <span className="badge badge-gold text-[9px]">WARLORD</span>
                        )}
                      </p>
                      {unit.customName && (
                        <p className="font-body text-xs text-parchment-faint">{unit.catalogueName}</p>
                      )}
                      {/* Model loadout from configure step */}
                      {entry && loadoutLines(unit, entry).map((line, i) => (
                        <p key={i} className="font-body text-xs text-parchment-muted mt-0.5">{line}</p>
                      ))}
                      {unit.notes && (
                        <p className="font-body text-xs text-parchment-faint italic mt-0.5">{unit.notes}</p>
                      )}
                    </div>
                    <span className="font-heading text-sm text-gold-muted shrink-0">
                      {pts > 0 ? `${pts} pts` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main review component ─────────────────────────────────────────────────────

export default function ReviewStep() {
  const { activeRoster, validationIssues } = useRosterStore()
  const { parsedCatalogues } = useGameStore()
  const [stratsOpen, setStratsOpen] = useState(false)

  if (!activeRoster) return null

  const catalogue = activeRoster.catalogueId ? parsedCatalogues[activeRoster.catalogueId] : null
  const alliedCatalogue = activeRoster.alliedCatalogueId
    ? parsedCatalogues[activeRoster.alliedCatalogueId]
    : null

  const entryMap = new Map(catalogue?.entries.map((e) => [e.id, e]) ?? [])
  const alliedEntryMap = new Map(alliedCatalogue?.entries.map((e) => [e.id, e]) ?? [])

  const catNames = buildCatNamesMap(catalogue?.categoryEntries ?? [])
  const alliedCatNames = buildCatNamesMap(alliedCatalogue?.categoryEntries ?? [])
  const systemId = activeRoster.systemId

  const mainPts = activeRoster.units.reduce(
    (sum, u) => sum + unitTotalPts(u, entryMap.get(u.catalogueEntryId)),
    0,
  )
  const alliedPts = (activeRoster.alliedUnits ?? []).reduce(
    (sum, u) => sum + unitTotalPts(u, alliedEntryMap.get(u.catalogueEntryId)),
    0,
  )
  const totalPts = mainPts + alliedPts

  const overLimit = totalPts > activeRoster.pointsLimit
  const errors = validationIssues.filter((i) => i.type === 'error')
  const warnings = validationIssues.filter((i) => i.type === 'warning')

  const stratagems = activeRoster.catalogueName
    ? getStratagemsForCatalogue(activeRoster.catalogueName)
    : []
  const detachmentStrats = activeRoster.detachment
    ? stratagems.filter((s) => s.detachment === activeRoster.detachment || s.detachment === 'Any')
    : stratagems

  const hasAllied = (activeRoster.alliedUnits ?? []).length > 0

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-xl text-gold tracking-wider mb-1">Review &amp; Validate</h2>
        <p className="font-body text-parchment-muted text-sm">
          Check your army is legal before you take to the field.
        </p>
      </div>

      {/* Points summary */}
      <div className="card">
        <div className="flex items-center justify-between">
          <span className="font-heading text-xs tracking-widest uppercase text-gold-muted">
            Points Total
          </span>
          <span className={`font-heading text-2xl tracking-wide ${overLimit ? 'text-blood-light' : 'text-gold'}`}>
            {totalPts} <span className="text-sm text-parchment-faint">/ {activeRoster.pointsLimit}</span>
          </span>
        </div>
        <div className="mt-2 h-2 bg-void-800">
          <div
            className={`h-full transition-all ${overLimit ? 'bg-blood' : 'bg-gold'}`}
            style={{ width: `${Math.min(100, (totalPts / activeRoster.pointsLimit) * 100)}%` }}
          />
        </div>
      </div>

      {/* Validation */}
      {(errors.length > 0 || overLimit || warnings.length > 0) && (
        <div className="flex flex-col gap-2">
          {overLimit && (
            <div className="px-4 py-3 border border-blood/40 bg-blood/5 text-blood-light font-heading text-xs tracking-wide">
              ⚠ Army is {totalPts - activeRoster.pointsLimit} pts over the limit.
            </div>
          )}
          {errors.map((e, i) => (
            <div key={i} className="px-4 py-3 border border-blood/40 bg-blood/5 text-blood-light font-body text-sm">
              🔴 {e.message}
            </div>
          ))}
          {warnings.map((w, i) => (
            <div key={i} className="px-4 py-3 border border-gold-muted/30 bg-gold/5 text-parchment-muted font-body text-sm">
              ⚠ {w.message}
            </div>
          ))}
        </div>
      )}

      {errors.length === 0 && !overLimit && (
        <div className="px-4 py-3 border border-gold-muted/30 bg-gold/5 text-gold font-heading text-xs tracking-wide">
          ✓ Army is valid and ready for battle.
        </div>
      )}

      {/* Unit list — grouped by category */}
      <div className="card">
        <div className="card-header">{activeRoster.name || 'Unnamed Army'}</div>
        <p className="font-body text-xs text-parchment-faint mb-3">
          {activeRoster.catalogueName}
          {activeRoster.detachment ? ` · ${activeRoster.detachment}` : ''}
        </p>

        <CategorySection
          units={activeRoster.units}
          entryMap={entryMap}
          systemId={systemId}
          catNames={catNames}
          sectionLabel={hasAllied ? 'Main Force' : undefined}
          warlordUid={activeRoster.warlordUid ?? ''}
        />

        {hasAllied && (
          <div className="mt-4">
            <CategorySection
              units={activeRoster.alliedUnits ?? []}
              entryMap={alliedEntryMap}
              systemId={systemId}
              catNames={alliedCatNames}
              sectionLabel={`Allied · ${activeRoster.alliedCatalogueName}`}
              warlordUid={activeRoster.warlordUid ?? ''}
            />
          </div>
        )}

        <div className="divider-gold mt-3" />
        <div className="flex justify-between items-center pt-2">
          <span className="font-heading text-xs tracking-wide uppercase text-parchment-muted">Total</span>
          <span className={`font-heading text-base tracking-wide ${overLimit ? 'text-blood-light' : 'text-gold'}`}>
            {totalPts} pts
          </span>
        </div>
      </div>

      {/* Stratagem accordion */}
      {detachmentStrats.length > 0 && (
        <div className="card">
          <button
            onClick={() => setStratsOpen((o) => !o)}
            className="w-full flex items-center justify-between card-header !mb-0 !pb-0 !border-0 cursor-pointer"
          >
            <span>Stratagems ({detachmentStrats.length})</span>
            <span className="text-gold-muted text-base">{stratsOpen ? '▲' : '▼'}</span>
          </button>
          {stratsOpen && (
            <div className="mt-3 flex flex-col gap-3">
              {detachmentStrats.map((s, i) => (
                <div key={i} className="border-l-2 border-gold-muted/30 pl-3">
                  <div className="flex items-baseline gap-2">
                    <span className="font-heading text-xs text-gold tracking-wide">{s.name}</span>
                    <span className="badge badge-gold text-[9px]">{s.cp}CP</span>
                    <span className="font-heading text-[10px] text-parchment-faint ml-auto">{s.phase}</span>
                  </div>
                  <p className="font-body text-xs text-parchment-muted mt-1 leading-relaxed">{s.effect}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
