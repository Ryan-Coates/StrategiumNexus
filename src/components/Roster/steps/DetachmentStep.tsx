import { useEffect, useState } from 'react'
import { useGameStore } from '../../../store/gameStore'
import { useRosterStore } from '../../../store/rosterStore'
import { loadCataloguesForSystem } from '../../../services/dataManager'
import { getAllFactionStratagems, type StratagemEntry } from '../../../services/stratagemLoader'
import type { CatalogueMeta } from '../../../types'

export default function DetachmentStep() {
  const { activeRoster, setRosterField } = useRosterStore()
  const { setCatalogues, catalogues } = useGameStore()
  const [loading, setLoading] = useState(false)

  const systemCatalogues: CatalogueMeta[] = activeRoster?.systemId
    ? (catalogues[activeRoster.systemId] ?? [])
    : []

  // Filter library catalogues out (same logic as GameSystem.tsx)
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

  // Get detachments from stratagems JSON for the selected catalogue
  const allFactions = getAllFactionStratagems()
  const selectedCatName = activeRoster.catalogueName.toLowerCase()
  const factionData = allFactions.find(
    (f) =>
      selectedCatName.includes(f.catalogueSlug.toLowerCase()) ||
      f.catalogueSlug.toLowerCase().includes(selectedCatName),
  )

  const detachmentNames = factionData
    ? [...new Set(factionData.stratagems.map((s: StratagemEntry) => s.detachment).filter(Boolean))]
    : []

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 py-6">
      <div>
        <h2 className="font-display text-xl text-gold tracking-wider mb-1">Choose Your Faction</h2>
        <p className="font-body text-parchment-muted text-sm">
          Select your army faction (catalogue) and detachment.
        </p>
      </div>

      {/* Catalogue picker */}
      <div className="flex flex-col gap-3">
        <label className="font-heading text-xs tracking-widest uppercase text-gold-muted">
          Faction *
        </label>
        {loading ? (
          <p className="font-body text-parchment-faint text-sm italic">Loading catalogues…</p>
        ) : visibleCatalogues.length === 0 ? (
          <p className="font-body text-parchment-faint text-sm italic">
            {activeRoster.systemId
              ? 'No catalogues downloaded for this system. Download them from the War Codex first.'
              : 'Select a game system in Step 1 first.'}
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

      {/* Detachment picker — shown only once a catalogue is chosen */}
      {activeRoster.catalogueId && (
        <div className="flex flex-col gap-3">
          <label className="font-heading text-xs tracking-widest uppercase text-gold-muted">
            Detachment
          </label>
          {detachmentNames.length === 0 ? (
            <p className="font-body text-parchment-faint text-sm italic">
              No detachment data available for this faction yet. You can still build your army.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {detachmentNames.map((d) => {
                const isSelected = d === activeRoster.detachment
                const detachmentStrats = factionData?.stratagems.filter(
                  (s: StratagemEntry) => s.detachment === d,
                ) ?? []
                return (
                  <button
                    key={d}
                    onClick={() => setRosterField('detachment', d)}
                    className={[
                      'text-left px-4 py-3 border transition-colors',
                      isSelected
                        ? 'border-gold bg-gold/5'
                        : 'border-gold-muted/25 hover:border-gold',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-2">
                      <span className={isSelected ? 'text-gold' : 'text-gold-muted/40'}>
                        {isSelected ? '●' : '○'}
                      </span>
                      <span className={`font-heading text-sm tracking-wide ${isSelected ? 'text-gold' : 'text-parchment-muted'}`}>
                        {d}
                      </span>
                      <span className="ml-auto font-heading text-[10px] text-parchment-faint tracking-wide">
                        {detachmentStrats.length} stratagems
                      </span>
                    </div>
                  </button>
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
            <span> · <span className="text-parchment">{activeRoster.detachment}</span></span>
          )}
        </div>
      )}
    </div>
  )
}
