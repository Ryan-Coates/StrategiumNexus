import { useState, useMemo } from 'react'
import { useGameStore } from '../../../../store/gameStore'
import { useRosterStore } from '../../../../store/rosterStore'
import { nanoid } from '../../../../services/nanoid'
import {
  CRUSADE_PRIMARY_SLOTS,
  HH_AUXILIARY_TYPES,
  HH_APEX_TYPES,
  type HHForceOrgSlot,
  type HHAuxiliaryType,
  type HHApexType,
} from '../../../../data/hhCategories'
import type {
  SelectionEntry,
  RosterUnit,
  ParsedCatalogue,
  HHAuxiliarySubtype,
  HHApexSubtype,
} from '../../../../types'
import Spinner from '../../../Spinner'

// ── Helpers ───────────────────────────────────────────────────────────────────

function entryPts(entry: SelectionEntry): number {
  for (const c of entry.costs) {
    if (c.name === 'Point(s)' || c.name === 'pts' || c.name === 'Points') return c.value
  }
  return 0
}

function makeUnit(entry: SelectionEntry, detachmentId?: string): RosterUnit {
  return {
    uid: nanoid(),
    catalogueEntryId: entry.id,
    catalogueName: entry.name,
    customName: '',
    notes: '',
    selections: [],
    enhancementId: '',
    models: [],
    detachmentId,
  }
}

// ── Slot status ───────────────────────────────────────────────────────────────

type SlotStatus = 'ok' | 'unfilled' | 'over'

function slotStatus(count: number, slot: HHForceOrgSlot): SlotStatus {
  if (slot.max !== -1 && count > slot.max) return 'over'
  if (count >= slot.min) return 'ok'
  return 'unfilled'
}

function SlotStatusBadge({ status, min }: { status: SlotStatus; min: number }) {
  const icon = status === 'ok' ? '✓' : status === 'over' ? '✗' : min > 0 ? '○' : '—'
  const colour =
    status === 'ok'
      ? 'text-gold'
      : status === 'over'
        ? 'text-blood-light'
        : min > 0
          ? 'text-parchment-faint'
          : 'text-gold-muted/30'
  return (
    <span
      className={`font-heading text-base leading-none ${colour}`}
      title={
        status === 'ok'
          ? 'Slot requirements met'
          : status === 'over'
            ? 'Over maximum'
            : min > 0
              ? `Minimum ${min} required`
              : 'Optional slot'
      }
    >
      {icon}
    </span>
  )
}

// ── Unit row ──────────────────────────────────────────────────────────────────

function UnitRow({
  unit,
  entry,
  onRemove,
}: {
  unit: RosterUnit
  entry: SelectionEntry | undefined
  onRemove: () => void
}) {
  const pts = entry ? entryPts(entry) : 0
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-void-900 border-t border-gold-muted/10">
      <div className="flex-1 min-w-0">
        <p className="font-heading text-xs tracking-wide text-parchment truncate">
          {unit.customName || unit.catalogueName}
        </p>
        {entry && (
          <p className="font-body text-[10px] text-parchment-faint">
            {entry.profiles[0]?.characteristics['Type'] ?? ''}
          </p>
        )}
      </div>
      {pts > 0 && (
        <span className="font-heading text-xs text-gold-muted shrink-0">{pts} pts</span>
      )}
      <button
        onClick={onRemove}
        className="text-parchment-faint hover:text-blood-light transition-colors ml-1 shrink-0 text-xs px-1"
        title="Remove unit"
        aria-label={`Remove ${unit.customName || unit.catalogueName}`}
      >
        ✕
      </button>
    </div>
  )
}

// ── Unit browser ──────────────────────────────────────────────────────────────

function UnitBrowser({
  slot,
  allEntries,
  onAdd,
  onClose,
}: {
  slot: HHForceOrgSlot
  allEntries: SelectionEntry[]
  onAdd: (entry: SelectionEntry) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const q = search.trim().toLowerCase()

  const filtered = useMemo(
    () =>
      allEntries.filter(
        (e) =>
          e.primaryCategoryId === slot.categoryId && (!q || e.name.toLowerCase().includes(q)),
      ),
    [allEntries, slot.categoryId, q],
  )

  return (
    <div className="border-t border-gold/20 bg-void-950 p-3">
      <div className="flex items-center gap-2 mb-2">
        <input
          type="text"
          placeholder={`Search ${slot.label.toLowerCase()} units…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          className="flex-1 bg-void-800 border border-gold-muted/30 px-3 py-2 font-body text-sm text-parchment placeholder:text-parchment-faint focus:outline-none focus:border-gold transition-colors"
        />
        <button
          onClick={onClose}
          className="font-heading text-[10px] tracking-widest uppercase px-3 py-2 border border-gold-muted/20 text-parchment-faint hover:border-gold hover:text-gold transition-colors shrink-0"
        >
          ✕ Close
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="font-body text-parchment-faint text-xs italic text-center py-4">
          {q
            ? 'No matches found.'
            : `No ${slot.label.toLowerCase()} units available in this legion's catalogue.`}
        </p>
      ) : (
        <div className="flex flex-col gap-0.5 max-h-52 overflow-y-auto">
          {filtered.map((entry) => {
            const pts = entryPts(entry)
            const type = entry.profiles[0]?.characteristics['Type'] ?? ''
            return (
              <button
                key={entry.id}
                onClick={() => onAdd(entry)}
                className="w-full text-left px-3 py-2 border border-gold-muted/10 hover:border-gold bg-void-900 hover:bg-gold/5 transition-colors group"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-heading text-xs tracking-wide text-parchment group-hover:text-gold transition-colors truncate">
                      {entry.name}
                    </p>
                    {type && (
                      <p className="font-body text-[10px] text-parchment-faint">{type}</p>
                    )}
                  </div>
                  <span className="font-heading text-xs text-gold-muted shrink-0">
                    {pts > 0 ? `${pts} pts` : '—'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Detachment panel ──────────────────────────────────────────────────────────

function DetachmentPanel({
  slots,
  units,
  catalogue,
  onAddUnit,
  onRemoveUnit,
  onRemoveDetachment,
}: {
  slots: HHForceOrgSlot[]
  units: RosterUnit[]
  catalogue: ParsedCatalogue | null
  onAddUnit: (entry: SelectionEntry) => void
  onRemoveUnit: (uid: string) => void
  onRemoveDetachment?: () => void
}) {
  const [addingSlotId, setAddingSlotId] = useState<string | null>(null)

  const allUnits = useMemo(
    () => catalogue?.entries.filter((e) => e.type === 'unit' || e.type === 'model') ?? [],
    [catalogue],
  )

  const unitsBySlot = useMemo(() => {
    const map = new Map<string, RosterUnit[]>()
    for (const s of slots) map.set(s.categoryId, [])
    for (const unit of units) {
      const entry = catalogue?.entries.find((e) => e.id === unit.catalogueEntryId)
      const catId = entry?.primaryCategoryId ?? '__other__'
      if (map.has(catId)) map.get(catId)!.push(unit)
    }
    return map
  }, [units, catalogue, slots])

  const totalPts = units.reduce((sum, u) => {
    const entry = catalogue?.entries.find((e) => e.id === u.catalogueEntryId)
    return sum + (entry ? entryPts(entry) : 0)
  }, 0)

  return (
    <div className="flex flex-col gap-0">
      {slots.map((slot) => {
        const slotUnits = unitsBySlot.get(slot.categoryId) ?? []
        const count = slotUnits.length
        const status = slotStatus(count, slot)
        const canAdd = slot.max === -1 || count < slot.max
        const isAdding = addingSlotId === slot.categoryId

        const borderColour =
          status === 'over'
            ? 'border-blood/40'
            : status === 'ok'
              ? 'border-gold-muted/25'
              : slot.min > 0
                ? 'border-gold-muted/15'
                : 'border-gold-muted/10'

        return (
          <div key={slot.categoryId} className={`border-b border-x ${borderColour}`}>
            <div className="flex items-center gap-3 px-4 py-2.5 bg-void-800/50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-heading text-xs tracking-wide text-parchment">
                    {slot.label}
                  </span>
                  <span className="font-heading text-[10px] text-parchment-faint">
                    {count}
                    {slot.max !== -1 ? `/${slot.max}` : ''}
                    {slot.min > 0 && count < slot.min && ` · min ${slot.min}`}
                  </span>
                </div>
              </div>

              <SlotStatusBadge status={status} min={slot.min} />

              {canAdd && (
                <button
                  onClick={() => setAddingSlotId(isAdding ? null : slot.categoryId)}
                  className={`font-heading text-[10px] tracking-widest uppercase px-3 py-1.5 border transition-colors shrink-0 ${
                    isAdding
                      ? 'border-gold text-gold bg-gold/10'
                      : 'border-gold-muted/25 text-parchment-muted hover:border-gold hover:text-gold'
                  }`}
                >
                  + Add
                </button>
              )}
            </div>

            {slotUnits.map((unit) => (
              <UnitRow
                key={unit.uid}
                unit={unit}
                entry={catalogue?.entries.find((e) => e.id === unit.catalogueEntryId)}
                onRemove={() => onRemoveUnit(unit.uid)}
              />
            ))}

            {isAdding && (
              <UnitBrowser
                slot={slot}
                allEntries={allUnits}
                onAdd={(entry) => {
                  onAddUnit(entry)
                  const newCount = count + 1
                  if (slot.max !== -1 && newCount >= slot.max) setAddingSlotId(null)
                }}
                onClose={() => setAddingSlotId(null)}
              />
            )}
          </div>
        )
      })}

      <div className="flex items-center justify-between px-4 py-2 bg-void-800/30 border border-t-0 border-gold-muted/15">
        <span className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint">
          Detachment
        </span>
        <div className="flex items-center gap-3">
          <span className="font-heading text-sm text-gold">
            {totalPts} <span className="text-[10px] text-gold-muted">pts</span>
          </span>
          {onRemoveDetachment && (
            <button
              onClick={onRemoveDetachment}
              className="font-heading text-[10px] tracking-widest uppercase px-3 py-1.5 border border-blood/30 text-blood-light hover:bg-blood/10 transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Auxiliary type picker ─────────────────────────────────────────────────────

function AuxTypePicker({
  onSelect,
  onClose,
}: {
  onSelect: (type: HHAuxiliaryType) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-void-900 border border-gold/30 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gold/20">
          <h3 className="font-display text-sm text-gold tracking-widest uppercase">
            Choose Auxiliary Detachment
          </h3>
          <button
            onClick={onClose}
            className="text-parchment-faint hover:text-gold transition-colors text-lg leading-none"
          >✕</button>
        </div>
        <div className="p-3 flex flex-col gap-1">
          {HH_AUXILIARY_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => onSelect(type)}
              className="w-full text-left px-4 py-3 border border-gold-muted/15 hover:border-gold bg-void-800 hover:bg-gold/5 transition-colors group"
            >
              <p className="font-heading text-xs tracking-wide text-parchment group-hover:text-gold transition-colors">
                {type.name}
              </p>
              <p className="font-body text-[10px] text-parchment-faint mt-0.5">
                {type.slots.map((s) => s.label).join(' + ')}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Apex type picker ──────────────────────────────────────────────────────────

function ApexTypePicker({
  onSelect,
  onClose,
}: {
  onSelect: (type: HHApexType) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-void-900 border border-gold/30 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gold/20">
          <h3 className="font-display text-sm text-gold tracking-widest uppercase">
            Choose Apex Detachment
          </h3>
          <button
            onClick={onClose}
            className="text-parchment-faint hover:text-gold transition-colors text-lg leading-none"
          >✕</button>
        </div>
        <div className="p-3 flex flex-col gap-1">
          {HH_APEX_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => onSelect(type)}
              className="w-full text-left px-4 py-3 border border-gold-muted/15 hover:border-gold bg-void-800 hover:bg-gold/5 transition-colors group"
            >
              <p className="font-heading text-xs tracking-wide text-parchment group-hover:text-gold transition-colors">
                {type.name}
              </p>
              <p className="font-body text-[10px] text-parchment-faint mt-0.5">
                {type.slots.map((s) => s.label).join(' + ')}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

const CMD_CAT_ID = '6dbf-654a-f06f-2d69'   // Command
const HC_CAT_ID  = 'd9a6-9b5f-b18a-4d63'   // High Command

export default function HHBuildStep() {
  const {
    activeRoster,
    addUnit,
    removeUnit,
    addHHDetachment,
    addHHApexDetachment,
    removeHHDetachment,
  } = useRosterStore()
  const { parsedCatalogues } = useGameStore()

  const [showAuxPicker, setShowAuxPicker] = useState(false)
  const [showApexPicker, setShowApexPicker] = useState(false)

  const catalogue = activeRoster?.catalogueId
    ? (parsedCatalogues[activeRoster.catalogueId] ?? null)
    : null
  const loading = !!activeRoster?.catalogueId && !catalogue

  const primaryUnits = useMemo(
    () => (activeRoster?.units ?? []).filter((u) => !u.detachmentId),
    [activeRoster?.units],
  )

  const commandCount = useMemo(
    () =>
      primaryUnits.filter((u) => {
        const entry = catalogue?.entries.find((e) => e.id === u.catalogueEntryId)
        return entry?.primaryCategoryId === CMD_CAT_ID
      }).length,
    [primaryUnits, catalogue],
  )

  const highCommandFilled = useMemo(
    () =>
      primaryUnits.some((u) => {
        const entry = catalogue?.entries.find((e) => e.id === u.catalogueEntryId)
        return entry?.primaryCategoryId === HC_CAT_ID
      }),
    [primaryUnits, catalogue],
  )

  const detachments = activeRoster?.hhDetachments ?? []
  const auxDetachments = detachments.filter((d) => d.type === 'auxiliary')
  const apexDetachments = detachments.filter((d) => d.type === 'apex')

  const canAddAux  = auxDetachments.length < commandCount
  const canAddApex = highCommandFilled && apexDetachments.length === 0

  const totalPts = (activeRoster?.units ?? []).reduce((sum, u) => {
    const entry = catalogue?.entries.find((e) => e.id === u.catalogueEntryId)
    return sum + (entry ? entryPts(entry) : 0)
  }, 0)

  if (!activeRoster) return null

  if (!activeRoster.catalogueId) {
    return (
      <div className="py-12 text-center font-body text-parchment-muted">
        Select a legion in Step 2 first.
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl text-gold tracking-wider mb-1">Build Your Legion</h2>
          <p className="font-body text-parchment-muted text-sm">
            Fill your Primary Detachment&apos;s Crusade Force Organisation Chart, then unlock
            Auxiliary or Apex Detachments with Command units.
            {activeRoster.detachment && (
              <span className="block mt-0.5 text-gold-muted">
                Rite of War:{' '}
                <span className="text-parchment">{activeRoster.detachment}</span>
              </span>
            )}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p
            className={`font-heading text-2xl ${
              totalPts > activeRoster.pointsLimit ? 'text-blood-light' : 'text-gold'
            }`}
          >
            {totalPts}
          </p>
          <p className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint">
            / {activeRoster.pointsLimit} pts
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}

      {!loading && !catalogue && (
        <p className="font-body text-parchment-faint text-sm italic text-center py-8">
          Legion catalogue not loaded. Go back to Step 2 and re-select your legion.
        </p>
      )}

      {!loading && catalogue && (
        <>
          <section>
            <div className="flex items-center justify-between px-4 py-2 bg-void-800 border border-gold/30">
              <h3 className="font-display text-sm text-gold tracking-widest uppercase">
                Primary Detachment — Crusade
              </h3>
              <span className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint">
                Force Org
              </span>
            </div>
            <DetachmentPanel
              slots={CRUSADE_PRIMARY_SLOTS}
              units={primaryUnits}
              catalogue={catalogue}
              onAddUnit={(entry) => addUnit(makeUnit(entry))}
              onRemoveUnit={(uid) => removeUnit(uid)}
            />
          </section>

          <div className="px-4 py-3 bg-void-800/30 border border-gold-muted/15">
            <p className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint mb-1">
              Unlocked Detachments
            </p>
            <p className="font-body text-xs text-parchment-muted leading-relaxed">
              {commandCount === 0
                ? 'Add Command units to unlock Auxiliary Detachments. '
                : `${commandCount} Command slot${commandCount !== 1 ? 's' : ''} filled → up to ${commandCount} Auxiliary Detachment${commandCount !== 1 ? 's' : ''} available. `}
              {highCommandFilled
                ? 'High Command filled → 1 Apex Detachment available.'
                : 'Fill the High Command slot to unlock an Apex Detachment.'}
            </p>
          </div>

          {auxDetachments.map((det) => {
            const auxType = HH_AUXILIARY_TYPES.find((t) => t.id === det.subtype)
            if (!auxType) return null
            const detSlots: HHForceOrgSlot[] = auxType.slots.map((s, i) => ({
              categoryId: s.categoryId,
              label: s.label,
              icon: s.icon,
              order: i,
              min: 0,
              max: s.max,
            }))
            const detUnits = (activeRoster.units ?? []).filter((u) => u.detachmentId === det.id)
            return (
              <section key={det.id}>
                <div className="flex items-center justify-between px-4 py-2 bg-void-800 border border-gold/20">
                  <h3 className="font-display text-sm text-gold tracking-widest uppercase">
                    Auxiliary: {det.name}
                  </h3>
                  <span className="font-heading text-[10px] tracking-widest uppercase text-gold-muted">
                    Auxiliary
                  </span>
                </div>
                <DetachmentPanel
                  slots={detSlots}
                  units={detUnits}
                  catalogue={catalogue}
                  onAddUnit={(entry) => addUnit(makeUnit(entry, det.id))}
                  onRemoveUnit={(uid) => removeUnit(uid)}
                  onRemoveDetachment={() => removeHHDetachment(det.id)}
                />
              </section>
            )
          })}

          {apexDetachments.map((det) => {
            const apexType = HH_APEX_TYPES.find((t) => t.id === det.subtype)
            if (!apexType) return null
            const detSlots: HHForceOrgSlot[] = apexType.slots.map((s, i) => ({
              categoryId: s.categoryId,
              label: s.label,
              icon: s.icon,
              order: i,
              min: 0,
              max: s.max,
            }))
            const detUnits = (activeRoster.units ?? []).filter((u) => u.detachmentId === det.id)
            return (
              <section key={det.id}>
                <div className="flex items-center justify-between px-4 py-2 bg-void-800 border border-gold/20">
                  <h3 className="font-display text-sm text-gold tracking-widest uppercase">
                    Apex: {det.name}
                  </h3>
                  <span className="font-heading text-[10px] tracking-widest uppercase text-gold-muted">
                    Apex
                  </span>
                </div>
                <DetachmentPanel
                  slots={detSlots}
                  units={detUnits}
                  catalogue={catalogue}
                  onAddUnit={(entry) => addUnit(makeUnit(entry, det.id))}
                  onRemoveUnit={(uid) => removeUnit(uid)}
                  onRemoveDetachment={() => removeHHDetachment(det.id)}
                />
              </section>
            )
          })}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowAuxPicker(true)}
              disabled={!canAddAux}
              className={`font-heading text-[10px] tracking-widest uppercase px-4 py-2.5 border transition-colors ${
                canAddAux
                  ? 'border-gold-muted/30 text-parchment-muted hover:border-gold hover:text-gold'
                  : 'border-gold-muted/10 text-parchment-faint cursor-not-allowed'
              }`}
            >
              + Add Auxiliary Detachment
              {!canAddAux && commandCount === 0 && ' — fill Command first'}
            </button>

            <button
              onClick={() => setShowApexPicker(true)}
              disabled={!canAddApex}
              className={`font-heading text-[10px] tracking-widest uppercase px-4 py-2.5 border transition-colors ${
                canAddApex
                  ? 'border-gold-muted/30 text-parchment-muted hover:border-gold hover:text-gold'
                  : 'border-gold-muted/10 text-parchment-faint cursor-not-allowed'
              }`}
            >
              + Add Apex Detachment
              {!canAddApex && !highCommandFilled && ' — fill High Command first'}
              {!canAddApex && highCommandFilled && apexDetachments.length > 0 && ' — already added'}
            </button>
          </div>
        </>
      )}

      {showAuxPicker && (
        <AuxTypePicker
          onSelect={(type) => {
            void addHHDetachment('auxiliary', type.id as HHAuxiliarySubtype)
            setShowAuxPicker(false)
          }}
          onClose={() => setShowAuxPicker(false)}
        />
      )}

      {showApexPicker && (
        <ApexTypePicker
          onSelect={(type) => {
            void addHHApexDetachment(type.id as HHApexSubtype)
            setShowApexPicker(false)
          }}
          onClose={() => setShowApexPicker(false)}
        />
      )}
    </div>
  )
}
