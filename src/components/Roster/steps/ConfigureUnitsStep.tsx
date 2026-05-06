import { useState, useMemo } from 'react'
import { useGameStore } from '../../../store/gameStore'
import { useRosterStore } from '../../../store/rosterStore'
import { getCategoryForSystem, buildCatNamesMap, OTHER_GROUP } from '../../../data/wh40kCategories'
import type { UnitCategoryGroup } from '../../../data/wh40kCategories'
import { buildEnhancements } from '../../Wh40k/Wh40kHelpers'
import { nanoid } from '../../../services/nanoid'
import type { SelectionEntry, RosterUnit, RosterSelection, ModelConfig, ParsedCatalogue } from '../../../types'

function entryPts(entry: SelectionEntry): number {
  return entry.costs.find((c) => c.name === 'pts')?.value ?? 0
}

/** Pts for a unit entry at a given model count, applying BSData cost brackets. */
function bracketPts(entry: SelectionEntry, modelCount: number): number {
  const base = entryPts(entry)
  let pts = base
  for (const bracket of entry.costBrackets) {
    if (modelCount >= bracket.minModels) pts = bracket.pts
  }
  return pts
}

function makeModel(childEntryId = ''): ModelConfig {
  return { id: nanoid(), childEntryId, selections: [] }
}

/** Pre-populate required selections from group defaults (e.g. pre-tick Plague knives + Boltgun) */
function defaultSelectionsFor(entry: SelectionEntry): RosterSelection[] {
  const sels: RosterSelection[] = []
  for (const group of entry.groups) {
    if (group.defaultEntryId && group.minSelections > 0) {
      sels.push({ entryId: group.defaultEntryId, count: 1 })
    }
  }
  return sels
}

// ── Wargear options for a single model ───────────────────────────────────────

function ModelWargear({
  entry,
  modelSelections,
  onChange,
}: {
  entry: SelectionEntry
  modelSelections: RosterSelection[]
  onChange: (sels: RosterSelection[]) => void
}) {
  if (entry.groups.length === 0 && entry.children.length === 0 && entry.linkedEquipment.length === 0) {
    return <p className="font-body text-xs text-parchment-faint italic">No options.</p>
  }

  function toggle(optId: string, isRadio: boolean, groupEntries: SelectionEntry[]) {
    const isOn = modelSelections.some((s) => s.entryId === optId && s.count > 0)
    let next = modelSelections.filter((s) => !groupEntries.some((e) => e.id === s.entryId))
    if (isRadio) {
      if (!isOn) next = [...next, { entryId: optId, count: 1 }]
    } else {
      const others = modelSelections.filter((s) => !groupEntries.some((e) => e.id === s.entryId))
      const same = modelSelections.filter((s) => groupEntries.some((e) => e.id === s.entryId))
      next = [...others, ...same.filter((s) => s.entryId !== optId)]
      if (!isOn) next = [...next, { entryId: optId, count: 1 }]
    }
    onChange(next)
  }

  function toggleChild(optId: string) {
    const isOn = modelSelections.some((s) => s.entryId === optId && s.count > 0)
    const others = modelSelections.filter((s) => s.entryId !== optId)
    onChange(isOn ? others : [...others, { entryId: optId, count: 1 }])
  }

  return (
    <div className="flex flex-col gap-2.5">
      {entry.groups.map((group) => {
        const isRadio = group.maxSelections === 1
        return (
          <div key={group.id}>
            <p className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint mb-1">
              {group.name || 'Options'}
              {isRadio && <span className="ml-1 opacity-50">(pick 1)</span>}
            </p>
            <div className="flex flex-col gap-1">
              {group.entries.map((opt) => {
                const pts = entryPts(opt)
                const checked = modelSelections.some((s) => s.entryId === opt.id && s.count > 0)
                return (
                  <label key={opt.id} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type={isRadio ? 'radio' : 'checkbox'}
                      name={isRadio ? `model-group-${group.id}` : undefined}
                      checked={checked}
                      onChange={() => toggle(opt.id, isRadio, group.entries)}
                      className="accent-gold w-3 h-3 shrink-0"
                    />
                    <span className="font-body text-xs text-parchment-muted group-hover:text-parchment transition-colors flex-1">
                      {opt.name}
                    </span>
                    {pts > 0 && (
                      <span className="font-heading text-[10px] text-gold-muted">+{pts}</span>
                    )}
                  </label>
                )
              })}
            </div>
          </div>
        )
      })}
      {entry.children.length > 0 && (
        <div>
          <p className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint mb-1">
            Upgrades
          </p>
          <div className="flex flex-col gap-1">
            {entry.children
              .filter((opt) => opt.name.toLowerCase() !== 'warlord')
              .map((opt) => {
              const pts = entryPts(opt)
              const checked = modelSelections.some((s) => s.entryId === opt.id && s.count > 0)
              return (
                <label key={opt.id} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleChild(opt.id)}
                    className="accent-gold w-3 h-3 shrink-0"
                  />
                  <span className="font-body text-xs text-parchment-muted group-hover:text-parchment transition-colors flex-1">
                    {opt.name}
                  </span>
                  {pts > 0 && (
                    <span className="font-heading text-[10px] text-gold-muted">+{pts}</span>
                  )}
                </label>
              )
            })}
          </div>
        </div>
      )}
      {/* Fixed loadout (entryLinks — display only, no choices) */}
      {entry.linkedEquipment.length > 0 && (
        <div>
          <p className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint mb-1">
            Equipment
          </p>
          <div className="flex flex-wrap gap-1">
            {entry.linkedEquipment.map((eq) => (
              <span key={eq} className="badge text-[10px] px-1.5 py-0.5">{eq}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function getModelVariants(entry: SelectionEntry): SelectionEntry[] {
  const variants: SelectionEntry[] = [
    ...entry.children.filter((c) => c.type === 'model'),
  ]
  for (const g of entry.groups) {
    variants.push(...g.entries.filter((e) => e.type === 'model'))
  }
  return variants
}

function resolveModelEntry(childEntryId: string, parent: SelectionEntry): SelectionEntry {
  if (!childEntryId) return parent
  // Check direct children
  const direct = parent.children.find((c) => c.id === childEntryId)
  if (direct) return direct
  // Check group entries
  for (const g of parent.groups) {
    const found = g.entries.find((e) => e.id === childEntryId)
    if (found) return found
  }
  return parent
}

/** Build the default squad from BSData min constraints */
function defaultSquad(entry: SelectionEntry): ModelConfig[] {
  const result: ModelConfig[] = []

  // Fixed model children (e.g. Plague Champion min=1 max=1)
  for (const child of entry.children.filter((c) => c.type === 'model')) {
    const count = child.minCount > 0 ? child.minCount : 1
    for (let i = 0; i < count; i++) {
      result.push({ id: nanoid(), childEntryId: child.id, selections: defaultSelectionsFor(child) })
    }
  }

  // Model groups (e.g. "Plague Marines" group min=4)
  for (const group of entry.groups) {
    const modelEntries = group.entries.filter((e) => e.type === 'model')
    if (modelEntries.length === 0) continue
    const count = group.minSelections > 0 ? group.minSelections : 0
    if (count === 0) continue
    const defaultEntry =
      modelEntries.find((e) => e.id === group.defaultEntryId) ?? modelEntries[0]
    for (let i = 0; i < count; i++) {
      result.push({ id: nanoid(), childEntryId: defaultEntry.id, selections: defaultSelectionsFor(defaultEntry) })
    }
  }

  return result.length > 0 ? result : [makeModel('')]
}

// ── Single model box ──────────────────────────────────────────────────────────

function ModelBox({
  index,
  model,
  parentEntry,
  onUpdate,
  onRemove,
  canRemove,
}: {
  index: number
  model: ModelConfig
  parentEntry: SelectionEntry
  onUpdate: (patch: Partial<ModelConfig>) => void
  onRemove: () => void
  canRemove: boolean
}) {
  const variants = getModelVariants(parentEntry)
  const modelEntry = resolveModelEntry(model.childEntryId, parentEntry)

  return (
    <div className="border border-gold-muted/20 bg-void-900 flex flex-col">
      {/* Box header */}
      <div className="flex items-center justify-between px-3 py-2 bg-void-800 border-b border-gold-muted/15">
        <span className="font-heading text-[11px] tracking-widest uppercase text-gold-muted">
          {modelEntry !== parentEntry ? modelEntry.name : `Model ${index + 1}`}
        </span>
        {canRemove && (
          <button
            onClick={onRemove}
            className="text-parchment-faint hover:text-blood-light transition-colors text-xs"
            title="Remove model"
          >
            ✕
          </button>
        )}
      </div>

      <div className="p-3 flex flex-col gap-3">
        {/* Model variant picker */}
        {variants.length > 1 && (
          <div>
            <p className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint mb-1">
              Model Type
            </p>
            <select
              value={model.childEntryId}
              onChange={(e) => onUpdate({ childEntryId: e.target.value, selections: [] })}
              className="w-full bg-void-800 border border-gold-muted/30 px-2 py-1.5 font-body text-parchment text-xs focus:outline-none focus:border-gold transition-colors"
            >
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Restriction notes from BSData error modifiers */}
        {modelEntry.notes.length > 0 && (
          <div className="flex flex-col gap-0.5">
            {modelEntry.notes.map((note, i) => (
              <p key={i} className="font-body text-[10px] text-gold-muted/80 italic">
                ⚠ {note}
              </p>
            ))}
          </div>
        )}

        {/* Wargear */}
        <ModelWargear
          entry={modelEntry}
          modelSelections={model.selections}
          onChange={(sels) => onUpdate({ selections: sels })}
        />
      </div>
    </div>
  )
}

// ── Category-grouped unit list sidebar ───────────────────────────────────────

function UnitListSidebar({
  units,
  catalogue,
  systemId,
  label,
  activeUid,
  onSelect,
}: {
  units: RosterUnit[]
  catalogue: ParsedCatalogue | null
  systemId: string
  label?: string
  activeUid: string | null
  onSelect: (uid: string) => void
}) {
  const catNames = useMemo(
    () => buildCatNamesMap(catalogue?.categoryEntries ?? []),
    [catalogue],
  )

  const grouped = useMemo(() => {
    const map = new Map<string, { group: UnitCategoryGroup; items: RosterUnit[] }>()
    for (const unit of units) {
      const entry = catalogue?.entries.find((e) => e.id === unit.catalogueEntryId)
      const g: UnitCategoryGroup = entry
        ? getCategoryForSystem(entry.categoryIds, entry.primaryCategoryId, systemId, catNames)
        : OTHER_GROUP
      if (!map.has(g.label)) map.set(g.label, { group: g, items: [] })
      map.get(g.label)!.items.push(unit)
    }
    return [...map.values()].sort((a, b) => a.group.order - b.group.order)
  }, [units, catalogue, systemId, catNames])

  if (units.length === 0) return null

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <p className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint px-1 pt-1">
          {label}
        </p>
      )}
      {grouped.map(({ group, items }) => (
        <div key={group.label}>
          <p className="font-heading text-[9px] tracking-widest uppercase text-gold-muted/60 px-2 py-1">
            {group.label}
          </p>
          {items.map((unit) => {
            const isActive = unit.uid === activeUid
            return (
              <button
                key={unit.uid}
                onClick={() => onSelect(unit.uid)}
                className={[
                  'w-full text-left px-3 py-2 border text-xs font-heading tracking-wide transition-colors',
                  isActive
                    ? 'border-gold text-gold bg-gold/10'
                    : 'border-gold-muted/15 text-parchment-muted hover:border-gold hover:text-gold',
                ].join(' ')}
              >
                <span className="truncate block">
                  {unit.customName || unit.catalogueName}
                </span>
                {(unit.models?.length ?? 0) > 0 && (
                  <span className="font-body text-[9px] text-parchment-faint">
                    {unit.models.length} model{unit.models.length !== 1 ? 's' : ''}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ConfigureUnitsStep() {
  const { activeRoster, updateUnit, setRosterField } = useRosterStore()
  const { parsedCatalogues } = useGameStore()
  const [activeUid, setActiveUid] = useState<string | null>(null)

  if (!activeRoster) return null

  const allUnits = [...activeRoster.units, ...(activeRoster.alliedUnits ?? [])]

  if (allUnits.length === 0) {
    return (
      <div className="py-12 text-center font-body text-parchment-muted">
        Add some units in Step 3 first.
      </div>
    )
  }

  const mainCatalogue = activeRoster.catalogueId
    ? (parsedCatalogues[activeRoster.catalogueId] ?? null)
    : null
  const alliedCatalogue = activeRoster.alliedCatalogueId
    ? (parsedCatalogues[activeRoster.alliedCatalogueId] ?? null)
    : null

  const displayedUid = activeUid ?? allUnits[0]?.uid ?? null
  const isAllied = (activeRoster.alliedUnits ?? []).some((u) => u.uid === displayedUid)
  const unitList = isAllied ? (activeRoster.alliedUnits ?? []) : activeRoster.units
  const catalogue = isAllied ? alliedCatalogue : mainCatalogue

  const activeUnit = unitList.find((u) => u.uid === displayedUid) ?? null
  const catalogueEntry = catalogue?.entries.find((e) => e.id === activeUnit?.catalogueEntryId) ?? null

  // Warlord — detect if the active unit is a Character category, then allow toggling
  const catNames = buildCatNamesMap(catalogue?.categoryEntries ?? [])
  const isCharacter = !!(catalogueEntry && getCategoryForSystem(
    catalogueEntry.categoryIds,
    catalogueEntry.primaryCategoryId,
    activeRoster.systemId,
    catNames,
  ).label === 'Characters')
  const isWarlord = (activeRoster.warlordUid ?? '') === (activeUnit?.uid ?? '_')
  function toggleWarlord() {
    if (!activeUnit) return
    setRosterField('warlordUid', isWarlord ? '' : activeUnit.uid)
  }

  const availableEnhancements = catalogue ? buildEnhancements(catalogue.entries) : []
  const selectedEnhancement = activeUnit?.enhancementId
    ? availableEnhancements.find((e) => e.id === activeUnit.enhancementId)
    : undefined

  // Lazily initialise models — guard against legacy records with models===undefined
  function ensureModels(unit: RosterUnit, entry: SelectionEntry): ModelConfig[] {
    const existing: ModelConfig[] = unit.models ?? []
    if (existing.length > 0) return existing
    return defaultSquad(entry)
  }

  function updateModels(newModels: ModelConfig[]) {
    if (!activeUnit) return
    updateUnit(activeUnit.uid, { models: newModels })
  }

  function addModel() {
    if (!activeUnit || !catalogueEntry) return
    // Pick the default variant for the squad (first model-group default, else first variant)
    const variants = getModelVariants(catalogueEntry)
    let defaultVariantId = ''
    let defaultVariantEntry: SelectionEntry | undefined
    for (const g of catalogueEntry.groups) {
      const modelEntries = g.entries.filter((e) => e.type === 'model')
      if (modelEntries.length > 0) {
        const def = modelEntries.find((e) => e.id === g.defaultEntryId) ?? modelEntries[0]
        defaultVariantId = def.id
        defaultVariantEntry = def
        break
      }
    }
    if (!defaultVariantId && variants.length > 0) {
      defaultVariantId = variants[0].id
      defaultVariantEntry = variants[0]
    }
    const models = ensureModels(activeUnit, catalogueEntry)
    const newSels = defaultVariantEntry ? defaultSelectionsFor(defaultVariantEntry) : []
    updateModels([...models, { id: nanoid(), childEntryId: defaultVariantId, selections: newSels }])
  }

  function removeModel(modelId: string) {
    if (!activeUnit || !catalogueEntry) return
    const models = ensureModels(activeUnit, catalogueEntry).filter((m) => m.id !== modelId)
    updateModels(models.length > 0 ? models : [makeModel()])
  }

  function updateModel(modelId: string, patch: Partial<ModelConfig>) {
    if (!activeUnit || !catalogueEntry) return
    updateModels(
      ensureModels(activeUnit, catalogueEntry).map((m) =>
        m.id === modelId ? { ...m, ...patch } : m,
      ),
    )
  }

  const models = activeUnit && catalogueEntry
    ? ensureModels(activeUnit, catalogueEntry)
    : []

  const hasAllied = (activeRoster.alliedUnits ?? []).length > 0

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-xl text-gold tracking-wider mb-1">Configure Units</h2>
        <p className="font-body text-parchment-muted text-sm">
          Set squad size, weapon loadouts, custom names and notes for each unit.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* ── LEFT: Unit list grouped by category ── */}
        <div className="md:col-span-1 flex flex-col gap-0.5 max-h-[75vh] overflow-y-auto pr-1">
          <UnitListSidebar
            units={activeRoster.units}
            catalogue={mainCatalogue}
            systemId={activeRoster.systemId}
            label={hasAllied ? 'Main Force' : undefined}
            activeUid={displayedUid}
            onSelect={setActiveUid}
          />
          {hasAllied && (
            <UnitListSidebar
              units={activeRoster.alliedUnits ?? []}
              catalogue={alliedCatalogue}
              systemId={activeRoster.systemId}
              label={`Allied · ${activeRoster.alliedCatalogueName}`}
              activeUid={displayedUid}
              onSelect={setActiveUid}
            />
          )}
        </div>

        {/* ── RIGHT: Config panel ── */}
        {activeUnit && catalogueEntry ? (
          <div className="md:col-span-3 flex flex-col gap-4">
            {/* Identity */}
            <div className="card">
              <div className="card-header">
                {activeUnit.customName || activeUnit.catalogueName}
              </div>
              <p className="font-body text-xs text-parchment-faint mb-3">{activeUnit.catalogueName}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-heading text-xs tracking-widest uppercase text-gold-muted">
                    Custom Name
                  </label>
                  <input
                    type="text"
                    placeholder={`e.g. "The Rotting Vanguard"`}
                    value={activeUnit.customName}
                    onChange={(e) => updateUnit(activeUnit.uid, { customName: e.target.value })}
                    className="bg-void-800 border border-gold-muted/30 px-3 py-2 font-body text-parchment text-sm placeholder:text-parchment-faint focus:outline-none focus:border-gold transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-heading text-xs tracking-widest uppercase text-gold-muted">
                    Notes
                  </label>
                  <input
                    type="text"
                    placeholder="Tactics, deployment notes…"
                    value={activeUnit.notes}
                    onChange={(e) => updateUnit(activeUnit.uid, { notes: e.target.value })}
                    className="bg-void-800 border border-gold-muted/30 px-3 py-2 font-body text-parchment text-sm placeholder:text-parchment-faint focus:outline-none focus:border-gold transition-colors"
                  />
                </div>
              </div>

              {/* Warlord toggle — only for Character-category units */}
              {isCharacter && (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="warlord-toggle"
                    checked={isWarlord}
                    onChange={toggleWarlord}
                    className="w-4 h-4 accent-gold cursor-pointer"
                  />
                  <label htmlFor="warlord-toggle" className="font-heading text-xs tracking-widest uppercase text-gold cursor-pointer">
                    Warlord
                  </label>
                  <span className="font-body text-xs text-parchment-faint">(only one per army)</span>
                </div>
              )}

              {/* Enhancement picker — only for Character-category units that have enhancements available */}
              {isCharacter && availableEnhancements.length > 0 && (
                <div className="mt-3 flex flex-col gap-1.5">
                  <label className="font-heading text-xs tracking-widest uppercase text-gold-muted">
                    Enhancement
                  </label>
                  <select
                    value={activeUnit.enhancementId ?? ''}
                    onChange={(e) => updateUnit(activeUnit.uid, { enhancementId: e.target.value })}
                    className="bg-void-800 border border-gold-muted/30 px-3 py-2 font-body text-parchment text-sm focus:outline-none focus:border-gold transition-colors"
                  >
                    <option value="">— None —</option>
                    {availableEnhancements.map((enh) => (
                      <option key={enh.id} value={enh.id}>
                        {enh.name}{enh.points ? ` (${enh.points})` : ''}
                      </option>
                    ))}
                  </select>
                  {selectedEnhancement?.description && (
                    <p className="font-body text-xs text-parchment-faint leading-relaxed italic">
                      {selectedEnhancement.description}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Squad composition */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="card-header !mb-0">Squad Composition</div>
                  <p className="font-body text-xs text-parchment-faint mt-0.5">
                    {models.length} model{models.length !== 1 ? 's' : ''}
                    {catalogueEntry && bracketPts(catalogueEntry, models.length) > 0 && (
                      <span className="ml-2 text-gold font-heading text-[11px]">
                        {bracketPts(catalogueEntry, models.length)} pts
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={addModel}
                  className="btn-primary text-xs px-3 py-1.5"
                  title="Add model"
                >
                  + Add Model
                </button>
              </div>

              {/* Model boxes grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {models.map((model, i) => (
                  <ModelBox
                    key={model.id}
                    index={i}
                    model={model}
                    parentEntry={catalogueEntry}
                    onUpdate={(patch) => updateModel(model.id, patch)}
                    onRemove={() => removeModel(model.id)}
                    canRemove={models.length > 1}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="md:col-span-3 flex items-center justify-center py-16 border border-gold-muted/15">
            <p className="font-body text-parchment-faint text-sm italic">
              Select a unit from the list.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

