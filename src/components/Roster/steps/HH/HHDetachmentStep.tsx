import { useEffect, useState } from 'react'
import { useGameStore } from '../../../../store/gameStore'
import { useRosterStore } from '../../../../store/rosterStore'
import { loadCataloguesForSystem } from '../../../../services/dataManager'
import type { CatalogueMeta, SelectionEntry } from '../../../../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extract a short summary of what a Rite of War grants.
 * Each rite entry has children: "Legion Tactica" (rules), "Gambit" (profiles),
 * "Advanced Reaction" (profiles).  We collect the key names + summaries.
 */
function riteAbilities(rite: SelectionEntry): { label: string; summary: string }[] {
  const abilities: { label: string; summary: string }[] = []

  for (const child of rite.children) {
    // Rules-bearing children (e.g. "Legion Tactica")
    for (const rule of child.rules) {
      const summary = rule.description.replace(/\s+/g, ' ').slice(0, 180)
      abilities.push({ label: rule.name, summary: summary + (rule.description.length > 180 ? '…' : '') })
    }
    // Profile-bearing children (Gambit, Reaction)
    for (const profile of child.profiles) {
      const summaryChar = profile.characteristics['Summary'] ?? ''
      const summary = summaryChar.replace(/\s+/g, ' ').slice(0, 180)
      abilities.push({
        label: profile.name,
        summary: summary + (summaryChar.length > 180 ? '…' : ''),
      })
    }
  }

  // Also include direct rules on the rite entry itself
  for (const rule of rite.rules) {
    const summary = rule.description.replace(/\s+/g, ' ').slice(0, 180)
    abilities.push({ label: rule.name, summary: summary + (rule.description.length > 180 ? '…' : '') })
  }

  return abilities
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function HHDetachmentStep() {
  const { activeRoster, setRosterField } = useRosterStore()
  const { setCatalogues, catalogues: cataloguesBySystem, parsedCatalogues } = useGameStore()
  const [loading, setLoading] = useState(false)
  const [expandedRiteId, setExpandedRiteId] = useState<string | null>(null)

  const systemCatalogues: CatalogueMeta[] = activeRoster?.systemId
    ? (cataloguesBySystem[activeRoster.systemId] ?? [])
    : []

  // Filter out library catalogues (same logic as other steps)
  const visibleCatalogues = systemCatalogues.filter(
    (c) => !c.isLibrary && !c.name.toLowerCase().includes('library'),
  )

  useEffect(() => {
    if (!activeRoster?.systemId) return
    setLoading(true)
    loadCataloguesForSystem(activeRoster.systemId)
      .then((cats) => setCatalogues(activeRoster.systemId, cats))
      .finally(() => setLoading(false))
  }, [activeRoster?.systemId, setCatalogues])

  if (!activeRoster) return null

  const catalogue = activeRoster.catalogueId
    ? (parsedCatalogues[activeRoster.catalogueId] ?? null)
    : null
  const catalogueLoading = !!activeRoster.catalogueId && !catalogue

  // Rites of War: entries whose IDs are in riteOfWarIds
  const riteEntries: SelectionEntry[] = catalogue
    ? (catalogue.riteOfWarIds ?? [])
        .map((id) => catalogue.entries.find((e) => e.id === id))
        .filter((e): e is SelectionEntry => !!e)
    : []

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 py-6">
      <div>
        <h2 className="font-display text-xl text-gold tracking-wider mb-1">Legion & Rite of War</h2>
        <p className="font-body text-parchment-muted text-sm">
          Choose your Legion and select a Rite of War that defines your army's character.
        </p>
      </div>

      {/* Legion picker */}
      <div className="flex flex-col gap-3">
        <label className="font-heading text-xs tracking-widest uppercase text-gold-muted">
          Legion *
        </label>
        {loading ? (
          <p className="font-body text-parchment-faint text-sm italic">Loading legions…</p>
        ) : visibleCatalogues.length === 0 ? (
          <p className="font-body text-parchment-faint text-sm italic">
            {activeRoster.systemId
              ? 'No legion data downloaded yet. Download Horus Heresy catalogues from the War Codex first.'
              : 'Select Horus Heresy in Step 1 first.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {visibleCatalogues.map((cat) => {
              const isSelected = cat.id === activeRoster.catalogueId
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setRosterField('catalogueId', cat.id)
                    setRosterField('catalogueName', cat.name)
                    setRosterField('detachment', '')
                    setExpandedRiteId(null)
                  }}
                  className={[
                    'text-left px-4 py-3 border font-heading text-xs tracking-wide transition-colors',
                    isSelected
                      ? 'border-gold text-gold bg-gold/10'
                      : 'border-gold-muted/25 text-parchment-muted hover:border-gold hover:text-gold',
                  ].join(' ')}
                >
                  <span className={`mr-2 ${isSelected ? 'text-gold' : 'text-gold-muted/40'}`}>
                    {isSelected ? '●' : '○'}
                  </span>
                  {cat.name}
                  <span className="ml-2 text-[10px] text-parchment-faint">rev {cat.revision}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Rite of War picker — shown once a catalogue is selected and parsed */}
      {activeRoster.catalogueId && (
        <div className="flex flex-col gap-3">
          <label className="font-heading text-xs tracking-widest uppercase text-gold-muted">
            Rite of War
          </label>

          {catalogueLoading && (
            <p className="font-body text-parchment-faint text-sm italic">
              Loading legion data…
            </p>
          )}

          {!catalogueLoading && riteEntries.length === 0 && (
            <p className="font-body text-parchment-faint text-sm italic">
              No Rites of War found for this legion. You can still build your army.
            </p>
          )}

          {!catalogueLoading && riteEntries.length > 0 && (
            <div className="flex flex-col gap-2">
              {/* None option — army with no special Rite */}
              <button
                onClick={() => setRosterField('detachment', '')}
                className={[
                  'text-left px-4 py-3 border transition-colors',
                  activeRoster.detachment === ''
                    ? 'border-gold bg-gold/5'
                    : 'border-gold-muted/25 hover:border-gold',
                ].join(' ')}
              >
                <div className="flex items-center gap-2">
                  <span className={activeRoster.detachment === '' ? 'text-gold' : 'text-gold-muted/40'}>
                    {activeRoster.detachment === '' ? '●' : '○'}
                  </span>
                  <span
                    className={`font-heading text-sm tracking-wide ${
                      activeRoster.detachment === '' ? 'text-gold' : 'text-parchment-muted'
                    }`}
                  >
                    No Rite of War
                  </span>
                  <span className="ml-auto font-body text-[10px] text-parchment-faint italic">
                    Standard force organisation
                  </span>
                </div>
              </button>

              {/* Each available rite */}
              {riteEntries.map((rite) => {
                const isSelected = activeRoster.detachment === rite.name
                const isExpanded = expandedRiteId === rite.id
                const abilities = riteAbilities(rite)

                return (
                  <div
                    key={rite.id}
                    className={[
                      'border transition-colors',
                      isSelected ? 'border-gold' : 'border-gold-muted/25',
                    ].join(' ')}
                  >
                    {/* Header row: click to select */}
                    <button
                      onClick={() => setRosterField('detachment', rite.name)}
                      className={`w-full text-left px-4 py-3 hover:bg-gold/5 transition-colors ${
                        isSelected ? 'bg-gold/5' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={isSelected ? 'text-gold' : 'text-gold-muted/40'}>
                          {isSelected ? '●' : '○'}
                        </span>
                        <span
                          className={`font-heading text-sm tracking-wide ${
                            isSelected ? 'text-gold' : 'text-parchment-muted'
                          }`}
                        >
                          {rite.name}
                        </span>
                        {abilities.length > 0 && (
                          <span className="ml-auto font-heading text-[10px] text-parchment-faint tracking-wide">
                            {abilities.length} {abilities.length === 1 ? 'ability' : 'abilities'}
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Expand toggle */}
                    {abilities.length > 0 && (
                      <>
                        <button
                          onClick={() => setExpandedRiteId(isExpanded ? null : rite.id)}
                          className="w-full flex items-center gap-1.5 px-4 py-1.5 border-t border-gold-muted/15 text-left hover:bg-gold/5 transition-colors"
                        >
                          <span className="font-heading text-[10px] tracking-widest uppercase text-gold-muted">
                            {isExpanded ? 'Hide details ▲' : 'Show details ▼'}
                          </span>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 pt-2 flex flex-col gap-3 border-t border-gold-muted/10">
                            {abilities.map((ab, i) => (
                              <div key={i}>
                                <p className="font-heading text-[11px] tracking-wider text-gold mb-0.5">
                                  {ab.label}
                                </p>
                                <p className="font-body text-xs text-parchment-muted leading-relaxed">
                                  {ab.summary}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Selected summary */}
      {activeRoster.catalogueName && (
        <div className="border border-gold-muted/20 bg-gold/5 px-4 py-3 text-sm font-body text-parchment-muted">
          <span className="text-gold">{activeRoster.catalogueName}</span>
          {activeRoster.detachment && (
            <span>
              {' '}·{' '}
              <span className="text-parchment">{activeRoster.detachment}</span>
            </span>
          )}
          {!activeRoster.detachment && activeRoster.catalogueId && (
            <span className="text-parchment-faint"> · No Rite of War selected</span>
          )}
        </div>
      )}
    </div>
  )
}
