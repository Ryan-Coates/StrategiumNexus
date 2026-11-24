import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Spinner from '../components/Spinner'
import type {
  Wh40k11eAbility,
  Wh40k11eDatasheet,
  Wh40k11eDetachmentAbility,
  Wh40k11eEnhancement,
  Wh40k11eFaction,
  Wh40k11eRuleset,
  Wh40k11eStratagem,
} from '../types/wh40k11e'

type Tab = 'datasheets' | 'abilities' | 'stratagems' | 'detachments'
const TABS: { id: Tab; label: string }[] = [
  { id: 'datasheets', label: 'Datasheets' },
  { id: 'abilities', label: 'Abilities' },
  { id: 'stratagems', label: 'Stratagems' },
  { id: 'detachments', label: 'Detachments' },
]

const STRATAGEM_PHASES = ['Any', 'Command', 'Movement', 'Shooting', 'Charge', 'Fight']

function plainText(value: string): string {
  const withLineBreaks = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|li|div)>/gi, '\n')
  const parsed = new DOMParser().parseFromString(withLineBreaks, 'text/html')
  return parsed.body.textContent?.replace(/[ \t]+\n/g, '\n').trim() ?? ''
}

function factionMatches(factionId: string, selectedId: string): boolean {
  return !selectedId || !factionId || factionId === selectedId
}

function RuleCard({
  title,
  subtitle,
  legend,
  description,
}: {
  title: string
  subtitle?: string
  legend?: string
  description: string
}) {
  return (
    <article className="card">
      <h3 className="font-heading text-gold text-base tracking-wide">{title}</h3>
      {subtitle && <p className="text-gold-muted text-xs mt-1">{subtitle}</p>}
      {legend && (
        <p className="text-parchment-muted text-sm italic mt-3">{plainText(legend)}</p>
      )}
      {description && (
        <p className="text-parchment text-sm leading-relaxed whitespace-pre-line mt-3">
          {plainText(description)}
        </p>
      )}
    </article>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-6">
      <h3 className="card-header">{title}</h3>
      {children}
    </section>
  )
}

function DatasheetDetail({
  sheet,
  ruleset,
}: {
  sheet: Wh40k11eDatasheet
  ruleset: Wh40k11eRuleset
}) {
  const faction = ruleset.factions.find((item) => item.id === sheet.faction_id)
  const abilities = sheet.abilities.map((entry) => {
    const definition = ruleset.abilities.find((item) => item.id === entry.ability_id)
    return {
      name: entry.name || definition?.name || entry.type || 'Ability',
      description: entry.description || definition?.description || '',
      parameter: entry.parameter,
      type: entry.type,
    }
  })
  const referencedEnhancements = ruleset.enhancements.filter((entry) =>
    sheet.enhancementIds.includes(entry.id),
  )
  const referencedDetachmentAbilities = ruleset.detachmentAbilities.filter((entry) =>
    sheet.detachmentAbilityIds.includes(entry.id),
  )

  return (
    <div className="min-w-0">
      <div className="border-b border-gold-muted/20 pb-4">
        <p className="font-heading text-xs tracking-[0.2em] uppercase text-gold-muted">
          {faction?.name ?? 'Unknown faction'}{sheet.role ? ` · ${sheet.role}` : ''}
        </p>
        <h2 className="font-display text-2xl text-gold mt-2">{sheet.name}</h2>
        {sheet.legend && (
          <p className="text-parchment-muted text-sm leading-relaxed mt-3">
            {plainText(sheet.legend)}
          </p>
        )}
      </div>

      {sheet.models.length > 0 && (
        <Section title="Model profiles">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gold-muted font-heading uppercase tracking-wide">
                <tr>
                  {['Model', 'M', 'T', 'Sv', 'Inv', 'W', 'Ld', 'OC'].map((label) => (
                    <th key={label} className="px-2 py-2 border-b border-gold-muted/20">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sheet.models.map((model, index) => (
                  <tr key={`${model.line}-${index}`} className="text-parchment">
                    <td className="px-2 py-2 border-b border-gold-muted/10">{model.name}</td>
                    <td className="px-2 py-2">{model.M}</td>
                    <td className="px-2 py-2">{model.T}</td>
                    <td className="px-2 py-2">{model.Sv}</td>
                    <td className="px-2 py-2">{model.inv_sv}</td>
                    <td className="px-2 py-2">{model.W}</td>
                    <td className="px-2 py-2">{model.Ld}</td>
                    <td className="px-2 py-2">{model.OC}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {sheet.loadout && (
        <Section title="Default loadout">
          <p className="text-parchment text-sm">{plainText(sheet.loadout)}</p>
        </Section>
      )}

      {sheet.transport && (
        <Section title="Transport">
          <p className="text-parchment text-sm">{plainText(sheet.transport)}</p>
        </Section>
      )}

      {sheet.wargear.length > 0 && (
        <Section title="Wargear">
          <div className="space-y-2">
            {sheet.wargear.map((weapon, index) => (
              <div
                key={`${weapon.line}-${weapon.line_in_wargear}-${index}`}
                className="border-b border-gold-muted/10 pb-2"
              >
                <p className="font-heading text-sm text-parchment">{weapon.name}</p>
                <p className="text-parchment-faint text-xs mt-1">
                  {weapon.type} · {weapon.range || 'Melee'} · A {weapon.A} · BS/WS{' '}
                  {weapon.BS_WS} · S {weapon.S} · AP {weapon.AP} · D {weapon.D}
                </p>
                {weapon.description && (
                  <p className="text-parchment-muted text-xs mt-1">
                    {plainText(weapon.description)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {abilities.length > 0 && (
        <Section title="Abilities">
          <div className="space-y-3">
            {abilities.map((ability, index) => (
              <RuleCard
                key={`${ability.name}-${index}`}
                title={ability.name}
                subtitle={[ability.type, ability.parameter].filter(Boolean).join(' · ')}
                description={ability.description}
              />
            ))}
          </div>
        </Section>
      )}

      {sheet.keywords.length > 0 && (
        <Section title="Keywords">
          <div className="flex flex-wrap gap-2">
            {sheet.keywords.map((item, index) => (
              <span key={`${item.keyword}-${index}`} className="badge badge-gold">
                {item.model ? `${item.model}: ` : ''}{item.keyword}
              </span>
            ))}
          </div>
        </Section>
      )}

      {(sheet.unitComposition.length > 0 || sheet.options.length > 0) && (
        <Section title="Composition and options">
          <div className="space-y-2 text-parchment-muted text-sm">
            {sheet.unitComposition.map((item, index) => (
              <p key={`composition-${index}`}>{plainText(item.description)}</p>
            ))}
            {sheet.options.map((item, index) => (
              <p key={`option-${index}`}>{plainText(item.description)}</p>
            ))}
          </div>
        </Section>
      )}

      {(referencedDetachmentAbilities.length > 0 || referencedEnhancements.length > 0) && (
        <Section title="Linked faction rules">
          <div className="space-y-3">
            {referencedDetachmentAbilities.map((entry) => (
              <RuleCard
                key={entry.id}
                title={entry.name}
                subtitle={entry.detachment}
                legend={entry.legend}
                description={entry.description}
              />
            ))}
            {referencedEnhancements.map((entry) => (
              <RuleCard
                key={entry.id}
                title={entry.name}
                subtitle={`${entry.detachment} · ${entry.cost}`}
                legend={entry.legend}
                description={entry.description}
              />
            ))}
          </div>
        </Section>
      )}

      {(sheet.canLeadIds.length > 0 || sheet.leaderIds.length > 0) && (
        <Section title="Leader links">
          <div className="space-y-2 text-parchment-muted text-sm">
            {sheet.canLeadIds.length > 0 && (
              <p>
                Can lead: {sheet.canLeadIds.map((id) =>
                  ruleset.datasheets.find((entry) => entry.id === id)?.name ?? id,
                ).join(', ')}
              </p>
            )}
            {sheet.leaderIds.length > 0 && (
              <p>
                Can be led by: {sheet.leaderIds.map((id) =>
                  ruleset.datasheets.find((entry) => entry.id === id)?.name ?? id,
                ).join(', ')}
              </p>
            )}
          </div>
        </Section>
      )}
    </div>
  )
}

export default function Wh40k11eViewer() {
  const [ruleset, setRuleset] = useState<Wh40k11eRuleset | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('datasheets')
  const [factionId, setFactionId] = useState('')
  const [stratagemDetachmentId, setStratagemDetachmentId] = useState('')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')

  useEffect(() => {
    let active = true
    fetch(`${import.meta.env.BASE_URL}data/wh40k11e.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`Could not load the 11th edition data (${response.status}).`)
        return response.json() as Promise<Wh40k11eRuleset>
      })
      .then((data) => {
        if (active) setRuleset(data)
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : String(cause))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const visibleDatasheets = useMemo(() => {
    if (!ruleset) return []
    const query = search.trim().toLowerCase()
    return ruleset.datasheets.filter((sheet) =>
      (!factionId || sheet.faction_id === factionId)
      && (!query || sheet.name.toLowerCase().includes(query)),
    )
  }, [factionId, ruleset, search])

  const selectedSheet = visibleDatasheets.find((sheet) => sheet.id === selectedId) ?? null
  const factions = useMemo(
    () => [...(ruleset?.factions ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [ruleset],
  )

  useEffect(() => {
    if (!visibleDatasheets.some((sheet) => sheet.id === selectedId)) {
      setSelectedId(visibleDatasheets[0]?.id ?? '')
    }
  }, [selectedId, visibleDatasheets])

  const filteredAbilities = (ruleset?.abilities ?? []).filter((entry) =>
    factionMatches(entry.faction_id, factionId)
    && (!search || entry.name.toLowerCase().includes(search.toLowerCase())),
  )
  const filteredStratagems = (ruleset?.stratagems ?? []).filter((entry) =>
    factionMatches(entry.faction_id, factionId)
    && (!stratagemDetachmentId || !entry.detachment_id
      || entry.detachment_id === stratagemDetachmentId)
    && (!search || entry.name.toLowerCase().includes(search.toLowerCase())),
  )
  const stratagemDetachments = (ruleset?.detachments ?? [])
    .filter((entry) => !factionId || entry.faction_id === factionId)
    .sort((a, b) => a.name.localeCompare(b.name))
  const stratagemPhaseGroups = STRATAGEM_PHASES.map((phase) => ({
    phase,
    entries: filteredStratagems.filter((entry) =>
      entry.phase.replace(/\s+phase$/i, '').split(/\s+or\s+/i).includes(phase),
    ),
  })).filter((group) => group.entries.length > 0)
  const filteredDetachments = (ruleset?.detachments ?? []).filter((entry) =>
    (!factionId || entry.faction_id === factionId)
    && (!search || entry.name.toLowerCase().includes(search.toLowerCase())),
  )

  if (loading) return <Spinner label="Loading 11th edition rules…" />
  if (error || !ruleset) {
    return (
      <div className="py-12 text-center">
        <p className="text-blood-light font-body mb-4">{error ?? 'Rules data is unavailable.'}</p>
        <Link to="/games" className="btn-primary">Back to War Codex</Link>
      </div>
    )
  }

  return (
    <div>
      <Link to="/games" className="text-gold-muted text-xs font-heading hover:text-gold">
        ← War Codex
      </Link>
      <header className="mt-4 mb-6">
        <p className="font-heading text-xs tracking-[0.3em] uppercase text-gold-muted">
          Warhammer 40,000 · 11th Edition
        </p>
        <h1 className="font-display text-3xl md:text-4xl text-gold tracking-wider uppercase mt-2">
          Faction Rules
        </h1>
        <p className="text-parchment-muted text-sm mt-2">
          {ruleset.datasheets.length.toLocaleString()} datasheets · {factions.length} factions
          {ruleset.lastUpdated ? ` · Data updated ${ruleset.lastUpdated}` : ''}
        </p>
      </header>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <label className="sr-only" htmlFor="wh40k11e-faction">Faction</label>
        <select
          id="wh40k11e-faction"
          value={factionId}
          onChange={(event) => {
            setFactionId(event.target.value)
            setStratagemDetachmentId('')
          }}
          className="bg-void-900 border border-gold-muted/30 text-parchment px-3 py-2 text-sm"
        >
          <option value="">All factions</option>
          {factions.map((faction: Wh40k11eFaction) => (
            <option key={faction.id} value={faction.id}>{faction.name}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="wh40k11e-search">Search rules</label>
        <input
          id="wh40k11e-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={tab === 'datasheets' ? 'Search datasheets…' : 'Search rules…'}
          className="flex-1 bg-void-900 border border-gold-muted/30 text-parchment px-3 py-2 text-sm placeholder:text-parchment-faint"
        />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gold-muted/20 mb-6">
        {TABS.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`px-4 py-2 font-heading text-xs uppercase tracking-widest border-b-2 transition-colors ${
              tab === item.id
                ? 'border-gold text-gold'
                : 'border-transparent text-parchment-muted hover:text-parchment'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'datasheets' && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(220px,0.35fr)_1fr] gap-6">
          <aside className="max-h-[70vh] overflow-y-auto border border-gold-muted/20">
            <p className="sticky top-0 bg-void-900 px-4 py-2 text-xs text-gold-muted border-b border-gold-muted/20">
              {visibleDatasheets.length.toLocaleString()} datasheets
            </p>
            {visibleDatasheets.map((sheet) => (
              <button
                key={sheet.id}
                onClick={() => setSelectedId(sheet.id)}
                className={`block w-full text-left px-4 py-2 text-sm border-l-2 transition-colors ${
                  selectedId === sheet.id
                    ? 'border-gold text-gold bg-gold/5'
                    : 'border-transparent text-parchment-muted hover:text-parchment hover:bg-void-800'
                }`}
              >
                {sheet.name}
              </button>
            ))}
            {visibleDatasheets.length === 0 && (
              <p className="px-4 py-5 text-parchment-faint text-sm">No datasheets match.</p>
            )}
          </aside>
          <div className="min-w-0">
            {selectedSheet && <DatasheetDetail sheet={selectedSheet} ruleset={ruleset} />}
          </div>
        </div>
      )}

      {tab === 'abilities' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filteredAbilities.map((entry: Wh40k11eAbility, index) => (
            <RuleCard
              key={`${entry.id}-${entry.faction_id}-${index}`}
              title={entry.name}
              legend={entry.legend}
              description={entry.description}
            />
          ))}
        </div>
      )}

      {tab === 'stratagems' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="wh40k11e-stratagem-detachment" className="font-heading text-xs text-gold">
              Detachment
            </label>
            <select
              id="wh40k11e-stratagem-detachment"
              value={stratagemDetachmentId}
              onChange={(event) => setStratagemDetachmentId(event.target.value)}
              className="w-full sm:w-auto sm:self-start bg-void-900 border border-gold-muted/30 text-parchment px-3 py-2 text-sm"
              aria-describedby="wh40k11e-stratagem-filter-note"
            >
              <option value="">All detachments</option>
              {stratagemDetachments.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.name}</option>
              ))}
            </select>
            <p id="wh40k11e-stratagem-filter-note" className="text-parchment-muted text-sm">
              General stratagems remain included. Multi-phase stratagems appear in each applicable
              phase; Any phase stratagems are listed separately.
            </p>
            <p className="text-gold-muted text-xs">
              {filteredStratagems.length.toLocaleString()} matching stratagems
            </p>
          </div>
          {stratagemPhaseGroups.map(({ phase, entries }) => (
            <details key={phase} className="border border-gold-muted/20 bg-void-900">
              <summary className="cursor-pointer px-4 py-3 font-heading text-sm text-gold hover:bg-void-800">
                {phase} phase ({entries.length})
              </summary>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 p-4">
                {entries.map((entry: Wh40k11eStratagem, index) => (
                  <RuleCard
                    key={`${entry.id}-${entry.faction_id}-${index}`}
                    title={entry.name}
                    subtitle={`${entry.type} · ${entry.cp_cost} CP · ${entry.turn} · ${entry.phase}`}
                    legend={entry.legend}
                    description={entry.description}
                  />
                ))}
              </div>
            </details>
          ))}
          {filteredStratagems.length === 0 && (
            <p className="text-parchment-faint text-sm">No stratagems match.</p>
          )}
        </div>
      )}

      {tab === 'detachments' && (
        <div className="space-y-8">
          {filteredDetachments.map((entry) => {
            const abilities = ruleset.detachmentAbilities.filter((ability: Wh40k11eDetachmentAbility) =>
              ability.detachment_id === entry.id,
            )
            const enhancements = ruleset.enhancements.filter((enhancement: Wh40k11eEnhancement) =>
              enhancement.detachment_id === entry.id,
            )
            return (
              <section key={entry.id}>
                <h2 className="card-header">{entry.name}</h2>
                {entry.legend && (
                  <p className="text-parchment-muted text-sm mb-4">{plainText(entry.legend)}</p>
                )}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {abilities.map((ability) => (
                    <RuleCard
                      key={ability.id}
                      title={ability.name}
                      subtitle="Detachment ability"
                      legend={ability.legend}
                      description={ability.description}
                    />
                  ))}
                  {enhancements.map((enhancement) => (
                    <RuleCard
                      key={enhancement.id}
                      title={enhancement.name}
                      subtitle={`Enhancement · ${enhancement.cost}`}
                      legend={enhancement.legend}
                      description={enhancement.description}
                    />
                  ))}
                </div>
              </section>
            )
          })}
          {filteredDetachments.length === 0 && (
            <p className="text-parchment-faint text-sm">No detachments match.</p>
          )}
        </div>
      )}
    </div>
  )
}
