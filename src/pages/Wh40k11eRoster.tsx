import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Spinner from '../components/Spinner'
import Wh40k11eImage from '../components/Roster/Wh40k11eImage'
import Wh40k11ePoints from '../components/Wh40k/Wh40k11ePoints'
import { DatasheetDetail } from './Wh40k11eViewer'
import { loadWh40k11eRules, rulesText } from '../services/wh40k11eRules'
import { get11eRoster, save11eRoster } from '../services/wh40k11eRosterDb'
import { ALL_FACTIONS, battleSizes, detachmentBudget, detachmentCost, groupRosterUnits, paidUpgradePrices, rosterEnhancements, rosterProblems, rosterUnitCost, sameDetachment, weaponChoices, withRosterDetachments } from '../services/wh40k11eRosterRules'
import { nanoid } from '../services/nanoid'
import type { Wh40k11eDatasheet, Wh40k11eDetachment, Wh40k11eRuleset } from '../types/wh40k11e'
import type { Wh40k11eRoster as Army, Wh40k11eRosterUnit } from '../types/wh40k11eRoster'

const fieldClass = 'w-full bg-void-900 border border-gold-muted/30 text-parchment px-3 py-2 text-sm'

function emptyArmy(): Army {
  return {
    id: nanoid(), name: '', description: '', image: '', factionId: '', detachmentIds: [],
    detachmentPointsOverrides: {}, battleSize: 'strike-force',
    pointsLimit: 2000, units: [], createdAt: Date.now(), updatedAt: Date.now(),
  }
}

function newUnit(sheet: Wh40k11eDatasheet): Wh40k11eRosterUnit {
  const sizes = sheet.points?.prices.flatMap((price) => price.models === null ? [] : [price.models]) ?? []
  return {
    id: nanoid(), datasheetId: sheet.id, name: '', description: '', image: '',
    modelCount: sizes.length ? Math.min(...sizes) : 1,
    pointsLabel: sheet.points?.prices.find((price) => price.models === Math.min(...sizes))?.label ?? '',
    useDefaultLoadout: true, weapons: {}, wargearNotes: '', paidUpgrades: {},
    upgradesReviewed: paidUpgradePrices(sheet).length === 0,
    enhancementId: '', enhancementPointsOverride: null, manualPoints: null,
  }
}

function UnitEditor({ unit, sheet, army, rules, onChange, onRemove, onImageProcessing }: {
  unit: Wh40k11eRosterUnit
  sheet: Wh40k11eDatasheet
  army: Army
  rules: Wh40k11eRuleset
  onChange: (patch: Partial<Wh40k11eRosterUnit>) => void
  onRemove: () => void
  onImageProcessing: (busy: boolean) => void
}) {
  const sizes = [...new Map((sheet.points?.prices ?? [])
    .filter((price) => price.models !== null).map((price) => [price.label, price])).values()]
  const unrestricted = army.factionId === ALL_FACTIONS
  const enhancements = rosterEnhancements(army, rules, sheet)
  const selectedEnhancement = rules.enhancements.find((entry) => entry.id === unit.enhancementId)
  const upgrades = paidUpgradePrices(sheet)
  const points = rosterUnitCost(army, unit, rules)
  const id = unit.id
  return (
    <details open className="card" data-unit-id={id}>
      <summary className="cursor-pointer font-heading text-gold">
        {unit.name || sheet.name} · {points === null ? 'Points incomplete' : `${points} pts`}
        {sheet.isLegends && <span className="badge badge-blood ml-2">Legends</span>}
      </summary>
      <div className="space-y-4 mt-4">
        <p className="text-parchment-faint text-xs">{sheet.name}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-sm text-gold">Unit name (optional)
            <input aria-label={`Unit name ${id}`} value={unit.name} className={fieldClass}
              onChange={(event) => onChange({ name: event.target.value })} />
          </label>
          <label className="text-sm text-gold">Models
            {sizes.length ? (
              <select aria-label={`Models ${id}`} value={unit.pointsLabel} className={fieldClass}
                onChange={(event) => {
                  const size = sizes.find((price) => price.label === event.target.value)
                  if (size?.models !== null && size?.models !== undefined) {
                    onChange({ modelCount: size.models, pointsLabel: size.label, upgradesReviewed: upgrades.length === 0 })
                  }
                }}>
                {!sizes.some((size) => size.label === unit.pointsLabel) && <option value={unit.pointsLabel}>Saved size unavailable — choose again</option>}
                {sizes.map((size) => <option key={size.label} value={size.label}>{size.label}</option>)}
              </select>
            ) : (
              <input aria-label={`Models ${id}`} type="number" min={1} max={200} value={unit.modelCount}
                className={fieldClass} onChange={(event) => onChange({ modelCount: Math.max(1, Math.min(200, Math.trunc(Number(event.target.value)))) })} />
            )}
          </label>
        </div>
        <label className="block text-sm text-gold">Unit description (optional)
          <textarea aria-label={`Unit description ${id}`} value={unit.description} className={fieldClass} rows={2}
            onChange={(event) => onChange({ description: event.target.value })} />
        </label>
        <Wh40k11eImage value={unit.image} label={`Image for ${unit.name || sheet.name}`}
          onChange={(image) => onChange({ image })} onProcessing={onImageProcessing} />
        <details>
          <summary className="cursor-pointer text-gold text-sm">Official points and unit composition</summary>
          <div className="mt-2 space-y-2">
            <Wh40k11ePoints sheet={sheet} />
            {sheet.unitComposition.map((entry, index) => (
              <p key={index} className="text-parchment-muted text-sm whitespace-pre-line">{rulesText(entry.description)}</p>
            ))}
          </div>
        </details>
        <label className="block text-sm text-gold">Manual base points override (optional; excludes upgrades and enhancement)
          <input aria-label={`Manual base points ${id}`} type="number" min={0} step={1} className={fieldClass}
            value={unit.manualPoints ?? ''} placeholder="Use official points when available"
            onChange={(event) => onChange({ manualPoints: event.target.value === '' ? null : Math.max(0, Math.trunc(Number(event.target.value))) })} />
        </label>
        <fieldset className="space-y-3 border border-gold-muted/20 p-3">
          <legend className="text-gold font-heading text-sm px-1">Wargear</legend>
          <p className="text-parchment-muted text-sm whitespace-pre-line">{rulesText(sheet.loadout)}</p>
          <label className="flex gap-2 text-sm text-parchment">
            <input type="checkbox" checked={unit.useDefaultLoadout} onChange={(event) =>
              onChange({ useDefaultLoadout: event.target.checked, upgradesReviewed: upgrades.length === 0 })} />
            Use the datasheet default loadout
          </label>
          {!unit.useDefaultLoadout && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {weaponChoices(sheet).map((weapon) => (
                <label key={weapon.id} className="flex items-center justify-between gap-2 text-sm text-parchment-muted">
                  {weapon.name}
                  <input aria-label={`${weapon.name} quantity ${id}`} className={`${fieldClass} max-w-20`} type="number"
                    min={0} max={1000} value={unit.weapons[weapon.id] ?? 0}
                    onChange={(event) => onChange({ weapons: {
                      ...unit.weapons, [weapon.id]: Math.max(0, Math.min(1000, Math.trunc(Number(event.target.value)))),
                    }, upgradesReviewed: upgrades.length === 0 })} />
                </label>
              ))}
            </div>
          )}
          <p className="text-parchment-faint text-xs">
            Quantities are weapons across the whole unit, not attacks or model counts. Alternate profiles share one weapon selection.
            Written model-specific limits and replacements must be checked below.
          </p>
          {sheet.options.map((option, index) => (
            <p key={index} className="text-parchment-muted text-sm whitespace-pre-line">{rulesText(option.description)}</p>
          ))}
          <label className="block text-sm text-gold">Wargear allocation and non-weapon options
            <textarea aria-label={`Wargear notes ${id}`} className={fieldClass} rows={2} value={unit.wargearNotes}
              placeholder="Record which models carry each weapon, banners, shields, and other options."
              onChange={(event) => onChange({ wargearNotes: event.target.value })} />
          </label>
          {upgrades.length > 0 && (
            <div className="space-y-2 border-t border-gold-muted/20 pt-3">
              <h4 className="text-sm text-gold">Official paid wargear / upgrades</h4>
              <p className="text-xs text-parchment-muted">
                Enter charged quantities separately, including paid equipment in the default loadout.
                These costs are added to the base unit cost.
              </p>
              {upgrades.map((price) => (
                <label key={price.label} className="flex items-center justify-between gap-3 text-sm text-parchment-muted">
                  {price.label} · {price.points} pts
                  <input aria-label={`Paid upgrade ${price.label} ${id}`} type="number" min={0} max={1000}
                    className={`${fieldClass} max-w-20`} value={unit.paidUpgrades[price.label] ?? 0}
                    onChange={(event) => onChange({ paidUpgrades: {
                      ...unit.paidUpgrades, [price.label]: Math.max(0, Math.min(1000, Math.trunc(Number(event.target.value)))),
                    } })} />
                </label>
              ))}
              <label className="flex gap-2 text-sm text-parchment">
                <input type="checkbox" checked={unit.upgradesReviewed}
                  onChange={(event) => onChange({ upgradesReviewed: event.target.checked })} />
                I have checked the paid upgrade quantities for this loadout.
              </label>
            </div>
          )}
        </fieldset>
        <label className="block text-sm text-gold">Enhancement
          <select aria-label={`Enhancement ${id}`} className={fieldClass} value={unit.enhancementId}
            onChange={(event) => onChange({ enhancementId: event.target.value, enhancementPointsOverride: null })}>
            <option value="">No enhancement</option>
            {enhancements.map((entry) => (
              <option key={entry.id} value={entry.id} disabled={!unrestricted && army.units.some((other) =>
                other.id !== id && other.enhancementId === entry.id)}>
                {entry.name} · {entry.detachment} · {entry.officialPoints === null ? 'official points unmatched' : `${entry.officialPoints} pts`}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-parchment-faint">
          {unrestricted ? 'All enhancements are available without faction, detachment or duplicate restrictions.' : "Options use the export's unit eligibility links and all selected detachments. Review each enhancement's written restrictions."}
        </p>
        {selectedEnhancement && (
          <div className="space-y-2">
            <p className="text-sm text-parchment whitespace-pre-line">{rulesText(selectedEnhancement.description)}</p>
            {selectedEnhancement.officialPoints === null && (
              <p className="text-gold-muted text-sm">No matching official price. The supplied rules export lists {selectedEnhancement.cost || 'no cost'}; this is not treated as a verified MFM price.</p>
            )}
            <label className="block text-sm text-gold">Manual enhancement points override (optional)
              <input aria-label={`Manual enhancement points ${id}`} type="number" min={0} step={1} className={fieldClass}
                value={unit.enhancementPointsOverride ?? ''}
                onChange={(event) => onChange({ enhancementPointsOverride: event.target.value === '' ? null : Math.max(0, Math.trunc(Number(event.target.value))) })} />
            </label>
          </div>
        )}
        <button type="button" onClick={onRemove} className="btn-ghost text-xs text-blood-light">Remove unit</button>
      </div>
    </details>
  )
}

function DetachmentRules({ entry, rules }: { entry: Wh40k11eDetachment; rules: Wh40k11eRuleset }) {
  const abilities = rules.detachmentAbilities.filter((ability) => ability.detachment_id === entry.id)
  return (
    <div className="space-y-3">
      {entry.points && <a className="text-xs text-gold underline" href={entry.points.sourceUrl} target="_blank" rel="noreferrer">Official points and mustering rules</a>}
      {!!entry.points?.uniqueTags.length && <p className="text-sm text-gold">Unique: {entry.points.uniqueTags.join(', ')}</p>}
      {!entry.points && <p className="text-sm text-gold-muted">No exact official match. DP cost and current Unique tags are unverified.</p>}
      {!entry.rulesAvailable && (
        <div className="text-sm text-gold-muted space-y-2">
          <p>Official points only: rules and unit enhancement eligibility for this detachment are not in the supplied CSVs. Consult the official rules before using it.</p>
          {entry.points?.prices.map((price) => <p key={price.label}>{price.label} · {price.points} pts (eligibility unavailable)</p>)}
        </div>
      )}
      {abilities.map((ability) => (
        <div key={ability.id}>
          <h3 className="text-sm">{ability.name}</h3>
          <p className="text-parchment-muted text-sm whitespace-pre-line">{rulesText(ability.description)}</p>
        </div>
      ))}
    </div>
  )
}

function ArmyRules({ army, rules }: { army: Army; rules: Wh40k11eRuleset }) {
  const unrestricted = army.factionId === ALL_FACTIONS
  const stratagems = rules.stratagems.filter((entry) =>
    (!entry.faction_id || (!unrestricted && entry.faction_id === army.factionId))
    && (!entry.detachment_id || (!unrestricted && army.detachmentIds.includes(entry.detachment_id))))
  return (
    <div className="space-y-4">
      {!unrestricted && <section className="card space-y-3">
        <h2 className="card-header">Army detachments</h2>
        <p className="text-xs text-parchment-faint">Detachments unlock rules army-wide; units below are grouped by battlefield role, not assigned to a detachment.</p>
        {army.detachmentIds.map((id) => {
          const entry = rules.detachments.find((item) => item.id === id)
          if (!entry) return <p key={id} className="text-blood-light">Missing detachment: {id}</p>
          const dp = detachmentCost(army, entry)
          return (
            <details key={id} open className="border border-gold-muted/30 p-3">
              <summary className="cursor-pointer font-heading text-gold">{entry.name} · {dp === null ? 'DP unknown' : `${dp} DP`}{army.detachmentPointsOverrides[id] !== undefined ? ' (manual)' : ''}</summary>
              <div className="mt-3"><DetachmentRules entry={entry} rules={rules} /></div>
            </details>
          )
        })}
      </section>}
      {groupRosterUnits(army, rules).map(({ role, units }) => {
        const costs = units.map((unit) => rosterUnitCost(army, unit, rules))
        const subtotal = costs.reduce<number>((total, cost) => total + (cost ?? 0), 0)
        return (
          <details key={role} open className="border border-gold-muted/30 p-3" data-army-group={role}>
            <summary className="cursor-pointer font-heading text-gold">{role} · {units.length} units · {subtotal} pts{costs.includes(null) ? ' (incomplete subtotal)' : ''}</summary>
            <div className="space-y-4 mt-4">
              {units.map((unit) => {
                const sheet = rules.datasheets.find((entry) => entry.id === unit.datasheetId)
                if (!sheet) return <p key={unit.id} className="text-blood-light">Missing datasheet: {unit.datasheetId}</p>
                const enhancement = rules.enhancements.find((entry) => entry.id === unit.enhancementId)
                const cost = rosterUnitCost(army, unit, rules)
                const chosenWeapons = weaponChoices(sheet).filter((weapon) => (unit.weapons[weapon.id] ?? 0) > 0)
                const configuredSheet = unit.useDefaultLoadout ? sheet : {
                  ...sheet,
                  loadout: chosenWeapons.map((weapon) => `${unit.weapons[weapon.id]} × ${weapon.name}`).join('; '),
                  wargear: chosenWeapons.flatMap((weapon) => weapon.profiles),
                }
                return (
                  <article key={unit.id} className="card space-y-3">
                    <h2 className="font-heading text-gold text-xl">{unit.name || sheet.name}</h2>
                    <p className="text-parchment-muted text-sm">
                      {sheet.name}{unrestricted ? ` · ${rules.factions.find((faction) => faction.id === sheet.faction_id)?.name ?? sheet.faction_id}` : ''} · {unit.modelCount} models · {cost === null ? 'Points incomplete' : `${cost} pts`}
                      {unit.manualPoints !== null ? ' · Manual base points' : ''}
                      {unit.enhancementPointsOverride !== null ? ' · Manual enhancement points' : ''}
                    </p>
                    {sheet.isLegends && <span className="badge badge-blood">Legends</span>}
                    {unit.image && <img src={unit.image} alt={unit.name || sheet.name} className="max-h-72 max-w-full object-contain" />}
                    {unit.description && <p className="text-parchment whitespace-pre-line">{unit.description}</p>}
                    <h3 className="text-sm">Selected loadout</h3>
                    <p className="text-parchment-muted text-sm whitespace-pre-line">
                      {unit.useDefaultLoadout ? rulesText(sheet.loadout) : configuredSheet.loadout || 'No weapons selected'}
                    </p>
                    {unit.wargearNotes && <p className="text-sm text-parchment-muted whitespace-pre-line">{unit.wargearNotes}</p>}
                    {Object.entries(unit.paidUpgrades).filter(([, quantity]) => quantity > 0).map(([label, quantity]) => (
                      <p key={label} className="text-sm text-parchment-muted">{quantity} × {label}</p>
                    ))}
                    {enhancement && (
                      <div className="border border-gold-muted/30 p-3">
                        <h3>{enhancement.name}</h3>
                        <p className="text-parchment-muted text-sm whitespace-pre-line">{rulesText(enhancement.description)}</p>
                      </div>
                    )}
                    <details>
                      <summary className="cursor-pointer text-gold font-heading text-sm">Unit rules and profiles</summary>
                      <div className="mt-4">
                        <DatasheetDetail sheet={configuredSheet} ruleset={rules} includeLinkedRules={false} loadoutTitle="Selected loadout" />
                      </div>
                    </details>
                  </article>
                )
              })}
            </div>
          </details>
        )
      })}
      <details className="card">
        <summary className="cursor-pointer text-gold font-heading">{unrestricted ? 'General stratagems' : 'General and detachment stratagems'} ({stratagems.length})</summary>
        <div className="space-y-3 mt-4">
          {stratagems.map((entry, index) => (
            <div key={`${entry.id}-${index}`} className="border-b border-gold-muted/20 pb-3">
              <h3>{entry.name} · {entry.cp_cost} CP</h3>
              <p className="text-gold-muted text-xs">{entry.detachment || 'General'} · {entry.type} · {entry.phase} · {entry.turn}</p>
              <p className="text-parchment-muted text-sm whitespace-pre-line">{rulesText(entry.description)}</p>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}

export default function Wh40k11eRoster({ readOnly = false }: { readOnly?: boolean }) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [rules, setRules] = useState<Wh40k11eRuleset | null>(null)
  const [army, setArmy] = useState<Army | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [imagesProcessing, setImagesProcessing] = useState(0)
  const [dirty, setDirty] = useState(false)
  const [showLegends, setShowLegends] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedSheetId, setSelectedSheetId] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    Promise.all([loadWh40k11eRules(), id ? get11eRoster(id) : Promise.resolve(emptyArmy())])
      .then(([data, roster]) => {
        if (!roster) throw new Error('Army not found in this browser.')
        if (active) { setRules(data); setArmy(roster); setDirty(false) }
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load the army.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  function update(patch: Partial<Army>) {
    setArmy((current) => current ? { ...current, ...patch } : current)
    setDirty(true)
    setNotice('')
  }
  function updateUnit(unitId: string, patch: Partial<Wh40k11eRosterUnit>) {
    setArmy((current) => current ? {
      ...current, units: current.units.map((unit) => unit.id === unitId ? { ...unit, ...patch } : unit),
    } : current)
    setDirty(true)
    setNotice('')
  }
  function imageProcessing(busy: boolean) {
    setImagesProcessing((count) => count + (busy ? 1 : -1))
  }

  function changeDetachments(detachmentIds: string[]) {
    if (!army || !rules) return
    const changed = withRosterDetachments(army, rules, detachmentIds)
    if (changed.units.some((unit, index) => unit.enhancementId !== army.units[index].enhancementId)
      && !confirm('Removing this detachment clears enhancements that no longer qualify. Continue?')) return
    update(changed)
  }

  async function save(view: boolean) {
    if (!army || !rules) return
    if (!army.name.trim() || !army.factionId || (army.factionId !== ALL_FACTIONS
      && (!army.detachmentIds.length || army.detachmentIds.some((id) => !rules.detachments.some((entry) =>
        entry.id === id && entry.faction_id === army.factionId))))) {
      setError('Enter an army name, choose a faction and choose at least one of its detachments before saving.')
      return
    }
    if (!Number.isInteger(army.pointsLimit) || army.pointsLimit < 1) {
      setError('Points limit must be a positive whole number.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const saved = { ...army, name: army.name.trim(), updatedAt: Date.now(),
        ...(army.factionId === ALL_FACTIONS ? { detachmentIds: [], detachmentPointsOverrides: {} } : {}),
      }
      await save11eRoster(saved)
      setArmy(saved)
      setDirty(false)
      setNotice('Army saved to this browser, including images.')
      if (view) navigate(`/rosters/11e/${saved.id}/view`)
      else if (!id) navigate(`/rosters/11e/${saved.id}`, { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the army. Browser storage may be full.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner label="Loading army and faction rules…" />
  if (!rules || !army) return (
    <div><p role="alert" className="text-blood-light">{error || 'Army data unavailable.'}</p>
      <Link to="/rosters" className="btn-ghost mt-3">Back to armies</Link></div>
  )

  const faction = rules.factions.find((entry) => entry.id === army.factionId)
  const unrestricted = army.factionId === ALL_FACTIONS
  const detachments = rules.detachments.filter((entry) => entry.faction_id === army.factionId)
  const availableSheets = rules.datasheets.filter((sheet) =>
    (unrestricted || sheet.faction_id === army.factionId) && sheet.virtual !== 'true'
    && (showLegends || !sheet.isLegends)
    && sheet.name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))
  const selectedSheet = availableSheets.find((sheet) => sheet.id === selectedSheetId) ?? availableSheets[0]
  const problems = rosterProblems(army, rules)
  const costs = army.units.map((unit) => rosterUnitCost(army, unit, rules))
  const knownPoints = costs.reduce<number>((total, cost) => total + (cost ?? 0), 0)
  const incomplete = costs.some((cost) => cost === null)
  const dp = detachmentBudget(army, rules)

  return (
    <div className="max-w-5xl mx-auto">
      <Link to="/rosters" className="text-gold-muted text-xs font-heading"
        onClick={(event) => { if (dirty && !confirm('Leave without saving army changes?')) event.preventDefault() }}>
        ← Warband Forge
      </Link>
      <header className="my-5 flex flex-wrap justify-between gap-4">
        <div>
          <p className="text-gold-muted text-xs font-heading">11TH EDITION · {unrestricted ? 'All factions (unrestricted)' : faction?.name || 'New army'}</p>
          <h1 className="font-display text-2xl text-gold mt-1">{army.name || 'Create an army'}</h1>
          <p className="text-parchment-muted text-sm mt-2">
            {army.units.length} units · {knownPoints} / {army.pointsLimit} pts{incomplete ? ' · INCOMPLETE (known subtotal only)' : ''}
          </p>
          {unrestricted ? <p className="text-gold-muted text-sm mt-1">Unrestricted list · no army legality restrictions or detachment rules · points shown for reference</p> : <p className="text-gold-muted text-sm mt-1">
            {army.battleSize ? battleSizes[army.battleSize].name : 'Battle size not selected'} · {army.detachmentIds.length} detachments · {dp.spent} / {dp.limit ?? '?'} DP
            {dp.incomplete ? ' · INCOMPLETE (known DP only)' : ''}
            {dp.incursionException ? ' · single 3 DP detachment exception' : ''}
          </p>}
        </div>
        <div className="flex flex-wrap gap-2 items-start">
          {readOnly ? <Link to={`/rosters/11e/${army.id}`} className="btn-primary">Edit army</Link> : (
            <>
              <button type="button" disabled={saving || imagesProcessing > 0} onClick={() => void save(false)} className="btn-primary">{saving ? 'Saving…' : 'Save army'}</button>
              <button type="button" disabled={saving || imagesProcessing > 0} onClick={() => void save(true)} className="btn-ghost">Save and view rules</button>
              <span className="text-xs text-gold-muted w-full">{dirty ? 'Unsaved changes' : 'Saved changes only'}</span>
            </>
          )}
        </div>
      </header>
      {error && <p role="alert" className="text-blood-light mb-4">{error}</p>}
      {notice && <p role="status" className="text-gold mb-4">{notice}</p>}
      <p className="text-parchment-faint text-xs mb-4">
        MFM points snapshot: {rules.pointsUpdatedAt.slice(0, 10)}. Exact name matches only.
        {unrestricted ? ' Unrestricted mode does not enforce army legality.' : ' This builder checks data-linked eligibility, not every written army or wargear restriction. Review the rules before play.'}
        {' '}Unknown costs are never counted as free.
      </p>
      {problems.length > 0 && (
        <details className="border border-gold-muted/30 p-3 mb-5">
          <summary className="cursor-pointer text-gold text-sm">Roster checks ({problems.length}) — draft armies can still be saved</summary>
          <ul className="list-disc pl-5 text-parchment-muted text-sm mt-2 space-y-1">
            {problems.map((problem, index) => <li key={index}>{problem}</li>)}
          </ul>
        </details>
      )}
      {readOnly ? (
        <>
          {army.image && <img src={army.image} alt={army.name} className="max-h-72 max-w-full mb-4" />}
          {army.description && <p className="text-parchment whitespace-pre-line mb-6">{army.description}</p>}
          <ArmyRules army={army} rules={rules} />
        </>
      ) : (
        <fieldset disabled={saving} className="space-y-6">
          <section className="card space-y-4">
            <h2 className="card-header">Army setup</h2>
            <label className="block text-gold text-sm">Army name
              <input className={fieldClass} value={army.name} onChange={(event) => update({ name: event.target.value })} />
            </label>
            <label className="block text-gold text-sm">Army description (optional)
              <textarea className={fieldClass} rows={3} value={army.description} onChange={(event) => update({ description: event.target.value })} />
            </label>
            <Wh40k11eImage value={army.image} label="Army image" onChange={(image) => update({ image })} onProcessing={imageProcessing} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="text-gold text-sm">Army faction
                <select className={fieldClass} value={army.factionId} onChange={(event) => {
                  const factionId = event.target.value
                  if (factionId === ALL_FACTIONS) {
                    if (army.detachmentIds.length && !confirm('Switch to All factions? Units and enhancements are kept, but detachments and their rules will be removed.')) return
                    update({ factionId, detachmentIds: [], detachmentPointsOverrides: {} })
                  } else {
                    if (army.units.length && !confirm('Changing faction removes all units and their images from this draft. Continue?')) return
                    update({ factionId, detachmentIds: [], detachmentPointsOverrides: {}, units: [] })
                  }
                  setSelectedSheetId('')
                }}>
                  <option value="">Choose faction</option>
                  <option value={ALL_FACTIONS}>All factions (unrestricted)</option>
                  {[...rules.factions].sort((a, b) => a.name.localeCompare(b.name)).map((entry) => (
                    <option key={entry.id} value={entry.id}>{entry.name}</option>
                  ))}
                </select>
              </label>
              {!unrestricted && <label className="text-gold text-sm">Battle size
                <select className={fieldClass} value={army.battleSize ?? ''} onChange={(event) => {
                  const size = event.target.value
                  if (size === 'incursion' || size === 'strike-force') update({ battleSize: size, pointsLimit: battleSizes[size].points })
                }}>
                  <option value="" disabled>Choose battle size</option>
                  {Object.entries(battleSizes).map(([id, size]) => (
                    <option key={id} value={id}>{size.name} · {size.points} pts · {size.dp} DP · {size.enhancements} enhancements</option>
                  ))}
                </select>
              </label>}
              <label className="text-gold text-sm">{unrestricted ? 'Reference points target (not enforced)' : 'Points limit'}
                <input type="number" min={1} step={1} className={fieldClass} value={army.pointsLimit}
                  onChange={(event) => update({ pointsLimit: Number(event.target.value) })} />
              </label>
            </div>
            {unrestricted ? (
              <p className="text-parchment-muted text-sm">Choose units and enhancements from any faction, with no detachment rules or army legality limits. Points are calculated for reference; missing pricing is still flagged. The Legends toggle only filters the unit picker.</p>
            ) : <>
            <h3 className="text-gold font-heading">Army detachments</h3>
            <p className="text-xs text-parchment-muted">DP are separate from unit points. Select multiple different detachments within the battle-size budget; detachments sharing a Unique tag cannot be combined. Incursion permits one 3 DP detachment as your only detachment. A custom points limit does not change the selected battle size's DP budget.</p>
            <label className="block text-gold text-sm">Add detachment
              <select className={fieldClass} value="" onChange={(event) => {
                if (event.target.value) changeDetachments([...army.detachmentIds, event.target.value])
              }}>
                <option value="">Choose detachment to add</option>
                {[...detachments].sort((a, b) => a.name.localeCompare(b.name)).map((entry) => (
                  <option key={entry.id} value={entry.id} disabled={detachments.some((selected) =>
                    army.detachmentIds.includes(selected.id) && sameDetachment(selected, entry))}>
                    {entry.name} · {entry.points?.detachmentPoints === null || !entry.points ? 'DP unknown' : `${entry.points.detachmentPoints} DP`}{entry.type ? ` (${entry.type})` : ''}{!entry.rulesAvailable ? ' [rules not supplied]' : ''}
                  </option>
                ))}
              </select>
            </label>
            {army.detachmentIds.map((id) => {
              const entry = detachments.find((item) => item.id === id)
              const cost = entry ? detachmentCost(army, entry) : null
              return (
                <div key={id} className="border border-gold-muted/30 p-3 space-y-3">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <h3 className="text-gold">{entry?.name || `Missing detachment: ${id}`} · {cost === null ? 'DP unknown' : `${cost} DP`}{army.detachmentPointsOverrides[id] !== undefined ? ' (manual)' : ''}</h3>
                    <button type="button" className="btn-ghost text-xs text-blood-light" aria-label={`Remove detachment ${entry?.name || id}`}
                      onClick={() => changeDetachments(army.detachmentIds.filter((item) => item !== id))}>Remove detachment</button>
                  </div>
                  <label className="block text-sm text-gold">Manual DP override (optional; verify against the rules)
                    <input aria-label={`Manual DP ${id}`} type="number" min={1} step={1} className={fieldClass}
                      value={army.detachmentPointsOverrides[id] ?? ''}
                      onChange={(event) => {
                        const overrides = { ...army.detachmentPointsOverrides }
                        if (event.target.value === '') delete overrides[id]
                        else overrides[id] = Math.max(1, Math.trunc(Number(event.target.value)))
                        update({ detachmentPointsOverrides: overrides })
                      }} />
                  </label>
                  {entry && <details>
                    <summary className="text-gold text-sm cursor-pointer">Detachment rules and restrictions</summary>
                    <div className="mt-3"><DetachmentRules entry={entry} rules={rules} /></div>
                  </details>}
                </div>
              )
            })}
            </>}
          </section>
          <section className="card space-y-3">
            <h2 className="card-header">Add units</h2>
            <label className="flex gap-2 text-sm text-parchment-muted">
              <input type="checkbox" checked={showLegends} onChange={(event) => setShowLegends(event.target.checked)} />
              Show Legends units
            </label>
            <label className="block text-gold text-sm">Search units
              <input type="search" className={fieldClass} value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            <label className="block text-gold text-sm">Datasheet to add
              <select className={fieldClass} value={selectedSheet?.id ?? ''} onChange={(event) => setSelectedSheetId(event.target.value)}>
                {!availableSheets.length && <option value="">No units match — choose a faction or change filters</option>}
                {availableSheets.map((sheet) => <option key={sheet.id} value={sheet.id}>{sheet.name}{unrestricted ? ` · ${rules.factions.find((faction) => faction.id === sheet.faction_id)?.name ?? sheet.faction_id}` : ''}{sheet.isLegends ? ' [Legends]' : ''}{!sheet.points ? ' [Points unmatched]' : ''}</option>)}
              </select>
            </label>
            <button type="button" className="btn-primary" disabled={!selectedSheet || (!unrestricted && !army.detachmentIds.length)}
              onClick={() => { if (selectedSheet) update({ units: [...army.units, newUnit(selectedSheet)] }) }}>
              + Add unit
            </button>
            <p className="text-parchment-faint text-xs">Hiding Legends only filters available units; it never removes units from your army.</p>
          </section>
          {army.units.map((unit) => {
            const sheet = rules.datasheets.find((entry) => entry.id === unit.datasheetId)
            return sheet ? (
              <UnitEditor key={unit.id} unit={unit} sheet={sheet} army={army} rules={rules}
                onImageProcessing={imageProcessing}
                onChange={(patch) => updateUnit(unit.id, patch)}
                onRemove={() => { if (confirm(`Remove ${unit.name || sheet.name}?`)) update({ units: army.units.filter((entry) => entry.id !== unit.id) }) }} />
            ) : (
              <div key={unit.id} className="card text-blood-light">
                Datasheet {unit.datasheetId} is missing.
                <button type="button" className="btn-ghost ml-3" onClick={() => update({ units: army.units.filter((entry) => entry.id !== unit.id) })}>Remove missing unit</button>
              </div>
            )
          })}
        </fieldset>
      )}
    </div>
  )
}
