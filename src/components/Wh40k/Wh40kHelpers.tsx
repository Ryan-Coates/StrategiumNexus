import { useState, useMemo } from 'react'
import type { SelectionEntry, Profile, RuleEntry } from '../../types'
import type { StratagemEntry } from '../../services/stratagemLoader'

// ── 40k data shape helpers ────────────────────────────────────────────────────

// In BSData 40k, the game system file (.gst) holds detachment rules.
// Catalogues hold unit datasheets. We detect context by entry content.

export interface Datasheet {
  entry: SelectionEntry
  unitProfiles: Profile[]
  rangedWeapons: Profile[]
  meleeWeapons: Profile[]
  abilities: RuleEntry[]
  keywords: string[]
}

export interface Stratagem {
  name: string
  cost: string
  when: string
  target: string
  effect: string
  restrictions: string
  fluff?: string
}

export interface Enhancement {
  name: string
  points: string
  description: string
}

export interface Detachment {
  name: string
  rules: RuleEntry[]
  stratagems: Stratagem[]
  enhancements: Enhancement[]
}

// Profile type name constants as they appear in BSData wh40k-10e
// 10e: Unit (M/T/SV/W/LD/OC), Ranged Weapons, Melee Weapons, Abilities
const UNIT_PROFILE_TYPES = ['Unit']
const RANGED_TYPES = ['Ranged Weapons', 'Ranged Weapon']
const MELEE_TYPES = ['Melee Weapons', 'Melee Weapon']
const ABILITY_TYPES = ['Abilities', 'Ability']
// 10e unit stat columns (M/T/SV/W/LD/OC). 9e was M/WS/BS/S/T/W/A/Ld/Save.
export const WH40K_10E_UNIT_COLS = ['M', 'T', 'SV', 'W', 'LD', 'OC']
export const WH40K_10E_RANGED_COLS = ['Range', 'A', 'BS', 'S', 'AP', 'D', 'Keywords']
export const WH40K_10E_MELEE_COLS = ['Range', 'A', 'WS', 'S', 'AP', 'D', 'Keywords']

function isRanged(p: Profile) {
  return RANGED_TYPES.some((t) => p.typeName.toLowerCase().includes(t.toLowerCase()))
}
function isMelee(p: Profile) {
  return MELEE_TYPES.some((t) => p.typeName.toLowerCase().includes(t.toLowerCase()))
}
function isUnit(p: Profile) {
  return UNIT_PROFILE_TYPES.some((t) => p.typeName.toLowerCase() === t.toLowerCase())
}
function isAbility(p: Profile) {
  return ABILITY_TYPES.some((t) => p.typeName.toLowerCase().includes(t.toLowerCase()))
}

function collectAllProfiles(entry: SelectionEntry): Profile[] {
  const out: Profile[] = [...entry.profiles]
  for (const child of entry.children) {
    out.push(...collectAllProfiles(child))
  }
  return out
}

function collectAllRules(entry: SelectionEntry): RuleEntry[] {
  const out: RuleEntry[] = [...entry.rules]
  for (const child of entry.children) {
    out.push(...collectAllRules(child))
  }
  return out
}

function extractStratagem(entry: SelectionEntry): Stratagem {
  const rule = entry.rules[0] ?? collectAllRules(entry)[0]
  const desc = rule?.description ?? ''

  // BSData 40k stratagems often encode fields separated by newlines or key: value
  const parse = (key: string) => {
    const match = desc.match(new RegExp(`${key}[:\\s]+([^\\n]+)`, 'i'))
    return match ? match[1].trim() : ''
  }

  const costEntry = entry.costs.find((c) => c.name === 'CP')
  const cpCost = costEntry ? `${costEntry.value} CP` : ''

  return {
    name: entry.name,
    cost: cpCost || parse('CP') || '?',
    when: parse('When'),
    target: parse('Target'),
    effect: parse('Effect') || desc,
    restrictions: parse('Restrictions'),
  }
}

function extractEnhancement(entry: SelectionEntry): Enhancement {
  // In 10e, enhancements store their text as an Abilities profile, not a rule
  const allProfiles = collectAllProfiles(entry)
  const abilityProfile = allProfiles.find(isAbility)
  const description =
    abilityProfile?.characteristics['Description'] ??
    abilityProfile?.characteristics['Effect'] ??
    (entry.rules[0] ?? collectAllRules(entry)[0])?.description ??
    ''
  const pts = entry.costs.find((c) => c.name === 'pts')
  return {
    name: entry.name,
    points: pts ? `${pts.value}pts` : '',
    description,
  }
}

export function buildDatasheet(entry: SelectionEntry): Datasheet {
  const allProfiles = collectAllProfiles(entry)
  const allRules = collectAllRules(entry)

  const unitProfiles = allProfiles.filter(isUnit)
  const rangedWeapons = allProfiles.filter(isRanged)
  const meleeWeapons = allProfiles.filter(isMelee)
  // Ability profiles + any unknown single-column types (e.g. "Lord of the Death Guard" -> Effect)
  const knownStatTypes = (p: Profile) => isUnit(p) || isRanged(p) || isMelee(p) || p.typeName === 'Transport'
  const abilityProfiles = allProfiles.filter((p) => isAbility(p) || !knownStatTypes(p))

  // Turn ability profiles into rules for display
  const abilityRules: RuleEntry[] = abilityProfiles.map((p) => ({
    id: p.id,
    name: p.name,
    description:
      p.characteristics['Description'] ??
      p.characteristics['Effect'] ??
      Object.values(p.characteristics)[0] ??
      '',
  }))

  const keywords: string[] = []
  for (const child of entry.children) {
    if (child.type === 'upgrade' && child.name.startsWith('Keyword')) {
      keywords.push(child.name.replace(/^Keyword[:\s]*/i, ''))
    }
  }

  return {
    entry,
    unitProfiles,
    rangedWeapons,
    meleeWeapons,
    abilities: [...allRules, ...abilityRules],
    keywords,
  }
}

export function buildDetachments(entries: SelectionEntry[]): Detachment[] {
  // 10e structure: one "Detachment" upgrade entry whose children are variant detachments
  // (e.g. "Flyblown Host", "Virulent Vectorium"). Each child has exactly one rule.
  const detachmentEntry = entries.find(
    (e) => e.name === 'Detachment' && e.type === 'upgrade' && e.children.length > 0,
  )
  if (detachmentEntry) {
    const variants = detachmentEntry.children.filter((c) => c.rules.length > 0)
    if (variants.length > 0) {
      return variants.map((v) => ({
        name: v.name,
        rules: v.rules,
        stratagems: [],
        enhancements: [],
      }))
    }
  }

  // Fallback for other game systems: look for entries with detachment in name
  return entries
    .filter(
      (e) =>
        e.name.toLowerCase().includes('detachment') ||
        e.children.some(
          (c) =>
            c.name.toLowerCase().includes('stratagem') ||
            c.name.toLowerCase().includes('enhancement'),
        ),
    )
    .map((e) => {
      const stratagems: Stratagem[] = []
      const enhancements: Enhancement[] = []
      for (const child of e.children) {
        const lc = child.name.toLowerCase()
        if (lc.includes('stratagem') || child.type === 'upgrade') {
          const hasCp = child.costs.some((c) => c.name === 'CP')
          if (hasCp || lc.includes('stratagem')) {
            stratagems.push(extractStratagem(child))
          } else if (lc.includes('enhancement') || child.costs.some((c) => c.name === 'pts')) {
            enhancements.push(extractEnhancement(child))
          }
        }
      }
      const rules = collectAllRules(e)
      return { name: e.name, rules, stratagems, enhancements }
    })
    .filter((d) => d.rules.length > 0 || d.stratagems.length > 0 || d.enhancements.length > 0)
}

export function buildEnhancements(entries: SelectionEntry[]): Enhancement[] {
  // Enhancements are upgrade entries with pts cost, ability profiles, and no weapon profiles.
  // They surface from sharedSelectionEntryGroups "Enhancements" after parsing.
  return entries
    .filter((e) => {
      if (e.type !== 'upgrade') return false
      if (!e.costs.some((c) => c.name === 'pts' && c.value > 0)) return false
      const profiles = collectAllProfiles(e)
      const hasAbility = profiles.some(isAbility)
      const hasWeapon = profiles.some((p) => isRanged(p) || isMelee(p))
      return hasAbility && !hasWeapon
    })
    .map(extractEnhancement)
    .sort((a, b) => a.name.localeCompare(b.name))
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Bespoke 10e unit stat block: M / T / SV / W / LD / OC */
function UnitStatBlock({ profile }: { profile: Profile }) {
  const cols = WH40K_10E_UNIT_COLS
  return (
    <div className="mb-4 overflow-x-auto">
      <table className="w-full text-center border-collapse">
        <thead>
          <tr className="bg-void-800 border border-gold-muted/20">
            <th className="font-heading text-[10px] tracking-[0.15em] uppercase text-gold px-1 py-1 border-r border-gold-muted/15 text-left pl-3 min-w-[8rem]">
              {profile.name}
            </th>
            {cols.map((c) => (
              <th key={c} className="font-heading text-[10px] tracking-widest uppercase text-gold-muted px-2 py-1 border-r border-gold-muted/15 last:border-r-0">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="bg-void-900 border border-gold-muted/15 border-t-0">
            <td className="pl-3" />
            {cols.map((c) => (
              <td key={c} className="font-body text-parchment text-sm px-2 py-1.5 border-r border-gold-muted/10 last:border-r-0">
                {profile.characteristics[c] ?? '—'}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function WeaponTable({ profiles, label, cols }: { profiles: Profile[]; label: string; cols: string[] }) {
  if (profiles.length === 0) return null
  return (
    <div className="mb-4">
      <h4 className="font-heading text-[10px] tracking-[0.2em] uppercase text-gold-muted mb-2">
        {label}
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-center border-collapse">
          <thead>
            <tr className="bg-void-800 border border-gold-muted/20">
              <th className="font-heading text-[10px] tracking-widest uppercase text-gold-muted px-2 py-1 border-r border-gold-muted/15 text-left pl-3 min-w-[8rem]">
                Weapon
              </th>
              {cols.map((c) => (
                <th key={c} className="font-heading text-[10px] tracking-widest uppercase text-gold-muted px-2 py-1 border-r border-gold-muted/15 last:border-r-0">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {profiles.map((p, i) => (
              <tr key={p.id} className={`border border-gold-muted/10 border-t-0 ${i % 2 === 1 ? 'bg-void-800/40' : 'bg-void-900'}`}>
                <td className="font-body text-parchment text-sm px-2 py-1.5 border-r border-gold-muted/10 text-left pl-3">
                  {p.name}
                </td>
                {cols.map((c) => (
                  <td key={c} className="font-body text-parchment-muted text-sm px-2 py-1.5 border-r border-gold-muted/10 last:border-r-0">
                    {p.characteristics[c] ?? '—'}
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

function AbilitiesSection({ abilities }: { abilities: RuleEntry[] }) {
  if (abilities.length === 0) return null
  return (
    <div className="mb-4">
      <h4 className="font-heading text-[10px] tracking-[0.2em] uppercase text-gold-muted mb-2">
        Abilities
      </h4>
      <div className="space-y-2">
        {abilities.map((r) => (
          <div key={r.id} className="bg-void-800 border border-gold-muted/15 px-4 py-3">
            <p className="font-heading text-gold text-sm tracking-wide mb-1">{r.name}</p>
            {r.description && (
              <p className="font-body text-parchment-muted text-sm leading-relaxed whitespace-pre-wrap">
                {r.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Datasheet detail panel ────────────────────────────────────────────────────

export function DatasheetDetail({ sheet }: { sheet: Datasheet | null }) {
  if (!sheet) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <p className="font-heading text-xs tracking-widest uppercase text-parchment-faint">
          Select a unit from the list
        </p>
      </div>
    )
  }

  const { entry, unitProfiles, rangedWeapons, meleeWeapons, abilities } = sheet
  const pts = entry.costs.find((c) => c.name === 'pts')
  const costStr = pts ? `${pts.value}pts` : ''

  return (
    <div className="p-5 md:p-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h2 className="font-display text-xl md:text-2xl text-gold tracking-wider">
            {entry.name}
          </h2>
          {costStr && (
            <span className="font-heading text-xs text-gold-muted tracking-wide">{costStr}</span>
          )}
        </div>
        <div className="divider-gold mt-3" />
      </div>

      {/* Unit stat block — 10e M/T/SV/W/LD/OC */}
      {unitProfiles.map((p) => (
        <UnitStatBlock key={p.id} profile={p} />
      ))}

      {/* Weapons */}
      <WeaponTable profiles={rangedWeapons} label="Ranged Weapons" cols={WH40K_10E_RANGED_COLS} />
      <WeaponTable profiles={meleeWeapons} label="Melee Weapons" cols={WH40K_10E_MELEE_COLS} />

      {/* Abilities */}
      <AbilitiesSection abilities={abilities} />

      {unitProfiles.length === 0 && rangedWeapons.length === 0 && meleeWeapons.length === 0 && abilities.length === 0 && (
        <p className="text-parchment-faint text-sm font-body italic">
          No profile data available for this entry.
        </p>
      )}
    </div>
  )
}

// ── Detachment panel ──────────────────────────────────────────────────────────

function EnhancementCard({ e }: { e: Enhancement }) {
  return (
    <div className="border border-gold-muted/15 bg-void-800 px-4 py-3 mb-2">
      <div className="flex items-baseline gap-2 mb-1">
        <p className="font-heading text-gold text-sm tracking-wide">{e.name}</p>
        {e.points && (
          <span className="text-parchment-faint text-xs">{e.points}</span>
        )}
      </div>
      {e.description && (
        <p className="font-body text-parchment-muted text-sm leading-relaxed">{e.description}</p>
      )}
    </div>
  )
}

function StratagemCard({ s, hideDetachment }: { s: StratagemEntry; hideDetachment?: boolean }) {
  return (
    <div className="border border-gold-muted/20 bg-void-800 px-4 py-3 mb-2">
      <div className="flex items-baseline gap-2 mb-2 flex-wrap">
        <p className="font-heading text-gold text-sm tracking-wide">{s.name}</p>
        <span className="font-heading text-[10px] tracking-widest uppercase px-2 py-0.5 border border-gold-muted/30 text-gold-muted">
          {s.cp}CP
        </span>
        {!hideDetachment && s.detachment && s.detachment !== 'Any' && (
          <span className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint">
            {s.detachment}
          </span>
        )}
        {s.detachment === 'Any' && (
          <span className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint/50 italic">
            universal
          </span>
        )}
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
  )
}

export function DetachmentPanel({
  catalogueRules,
  detachments,
  enhancements,
  stratagems,
}: {
  catalogueRules: RuleEntry[]
  detachments: Detachment[]
  enhancements: Enhancement[]
  stratagems: StratagemEntry[]
}) {
  const [activeDetIdx, setActiveDetIdx] = useState(0)
  const [stratagemSearch, setStratagemSearch] = useState('')

  const det = detachments[activeDetIdx] ?? null

  // Stratagems visible for the active detachment: universal ('Any') + detachment-specific
  const detStratagemsFull = useMemo(() => {
    if (!det) return stratagems.filter((s) => !s.detachment || s.detachment === 'Any')
    return stratagems.filter(
      (s) => !s.detachment || s.detachment === 'Any' || s.detachment === det.name,
    )
  }, [stratagems, det])

  const filteredStratagems = useMemo(() => {
    const q = stratagemSearch.toLowerCase()
    if (!q) return detStratagemsFull
    return detStratagemsFull.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.effect.toLowerCase().includes(q) ||
        s.when.toLowerCase().includes(q),
    )
  }, [detStratagemsFull, stratagemSearch])

  const stratagemsByPhase = useMemo(() => {
    const map = new Map<string, StratagemEntry[]>()
    for (const s of filteredStratagems) {
      const phase = s.phase || 'Any Phase'
      if (!map.has(phase)) map.set(phase, [])
      map.get(phase)!.push(s)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [filteredStratagems])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Detachment selector tabs */}
      {detachments.length > 0 && (
        <div className="flex gap-0 px-4 pt-4 pb-0 border-b border-gold-muted/15 overflow-x-auto shrink-0">
          {detachments.map((d, i) => (
            <button
              key={i}
              onClick={() => setActiveDetIdx(i)}
              className={`font-heading text-[10px] tracking-widest uppercase px-4 py-2 border-b-2 whitespace-nowrap transition-colors ${
                i === activeDetIdx
                  ? 'border-gold text-gold'
                  : 'border-transparent text-parchment-faint hover:text-parchment'
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">

        {/* ── 1. Faction Rules ── */}
        {catalogueRules.length > 0 && (
          <section className="px-5 pt-5 pb-3">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="font-heading text-xs tracking-[0.2em] uppercase text-gold shrink-0">Faction Rules</h3>
              <div className="flex-1 h-px bg-gold-muted/15" />
            </div>
            <div className="space-y-2">
              {catalogueRules.map((r) => (
                <div key={r.id} className="bg-void-800 border border-gold-muted/15 px-4 py-3">
                  <p className="font-heading text-gold text-sm tracking-wide mb-1">{r.name}</p>
                  <p className="font-body text-parchment-muted text-sm leading-relaxed whitespace-pre-wrap">{r.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── 2. Detachment Rule ── */}
        {det && det.rules.length > 0 && (
          <section className="px-5 pt-3 pb-3">
            <div className="flex items-center gap-3 mb-3">
              <h3 className="font-heading text-xs tracking-[0.2em] uppercase text-gold shrink-0">Detachment Rule</h3>
              <div className="flex-1 h-px bg-gold-muted/15" />
            </div>
            <div className="space-y-2">
              {det.rules.map((r) => (
                <div key={r.id} className="bg-void-800 border border-gold-muted/15 px-4 py-3">
                  <p className="font-heading text-gold text-sm tracking-wide mb-1">{r.name}</p>
                  <p className="font-body text-parchment-muted text-sm leading-relaxed whitespace-pre-wrap">{r.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── 3. Stratagems ── */}
        <section className="px-5 pt-3 pb-3">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="font-heading text-xs tracking-[0.2em] uppercase text-gold shrink-0">Stratagems</h3>
            <div className="flex-1 h-px bg-gold-muted/15" />
            {detStratagemsFull.length > 0 && (
              <span className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint shrink-0">
                {filteredStratagems.length}{stratagemSearch ? ` / ${detStratagemsFull.length}` : ''}
              </span>
            )}
          </div>
          {stratagems.length === 0 ? (
            <p className="font-body text-parchment-faint text-xs italic">
              No stratagem data — add entries to{' '}
              <code className="font-mono text-gold-muted bg-void-900 px-1 py-0.5">src/data/stratagems/</code>
            </p>
          ) : detStratagemsFull.length === 0 ? (
            <p className="font-body text-parchment-faint text-xs italic">No stratagems for this detachment.</p>
          ) : (
            <>
              <input
                type="text"
                placeholder="Search stratagems…"
                value={stratagemSearch}
                onChange={(e) => setStratagemSearch(e.target.value)}
                className="w-full bg-void-900 border border-gold-muted/20 px-3 py-1.5 font-body text-parchment text-sm placeholder-parchment-faint focus:outline-none focus:border-gold-muted/50 mb-4"
              />
              {filteredStratagems.length === 0 ? (
                <p className="text-parchment-faint font-body italic text-sm">No stratagems match.</p>
              ) : (
                stratagemsByPhase.map(([phase, strats]) => (
                  <div key={phase} className="mb-4">
                    <p className="font-heading text-[10px] tracking-[0.25em] uppercase text-gold-muted mb-2 pl-1">{phase}</p>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                      {strats.map((s, i) => <StratagemCard key={i} s={s} hideDetachment />)}
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </section>

        {/* ── 4. Enhancements ── */}
        <section className="px-5 pt-3 pb-6">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="font-heading text-xs tracking-[0.2em] uppercase text-gold shrink-0">Enhancements</h3>
            <div className="flex-1 h-px bg-gold-muted/15" />
            {enhancements.length > 0 && (
              <span className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint shrink-0">{enhancements.length}</span>
            )}
          </div>
          {enhancements.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {enhancements.map((e, i) => <EnhancementCard key={i} e={e} />)}
            </div>
          ) : (
            <p className="text-parchment-faint font-body italic text-sm">No enhancements found.</p>
          )}
        </section>

        {detachments.length === 0 && catalogueRules.length === 0 && (
          <div className="p-6">
            <p className="text-parchment-faint font-body italic text-sm">No army rules found in this catalogue.</p>
          </div>
        )}
      </div>
    </div>
  )
}
