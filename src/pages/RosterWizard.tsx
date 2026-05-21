import { useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRosterStore } from '../store/rosterStore'
import { useGameStore } from '../store/gameStore'
import { getRoster } from '../services/db'
import { parseCatalogueData } from '../services/dataManager'
import StepBar, { STEPS } from '../components/Roster/StepBar'
import ArmySetupStep from '../components/Roster/steps/ArmySetupStep'
import DetachmentStep from '../components/Roster/steps/DetachmentStep'
import HHDetachmentStep from '../components/Roster/steps/HH/HHDetachmentStep'
import HHBuildStep from '../components/Roster/steps/HH/HHBuildStep'
import BuildRosterStep from '../components/Roster/steps/BuildRosterStep'
import ConfigureUnitsStep from '../components/Roster/steps/ConfigureUnitsStep'
import ReviewStep from '../components/Roster/steps/ReviewStep'
import ExportStep from '../components/Roster/steps/ExportStep'
import { HH_SYSTEM_ID } from '../data/hhCategories'

const WH40K_STEPS = [
  ArmySetupStep,
  DetachmentStep,
  BuildRosterStep,
  ConfigureUnitsStep,
  ReviewStep,
  ExportStep,
]

const HH_STEPS = [
  ArmySetupStep,
  HHDetachmentStep,
  HHBuildStep,
  ConfigureUnitsStep,
  ReviewStep,
  ExportStep,
]

export default function RosterWizard() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { activeRoster, activeStep, setActiveStep, newRoster, openRoster, saving } = useRosterStore()
  const { parsedCatalogues, setParsedCatalogue } = useGameStore()
  // Existing rosters: all steps immediately accessible
  const furthestRef = useRef(id && id !== 'new' ? STEPS.length - 1 : activeStep)

  // Load roster from DB if opening by id and it's not already in state
  useEffect(() => {
    if (!id || id === 'new') {
      if (!activeRoster) newRoster()
      return
    }
    if (activeRoster?.id === id) return
    getRoster(id).then((r) => {
      if (r) openRoster(r)
      else navigate('/rosters')
    })
  }, [id, activeRoster, newRoster, openRoster, navigate])

  // After creating a new roster, update URL to its id (replace so back goes to list)
  useEffect(() => {
    if (id === 'new' && activeRoster?.id) {
      navigate(`/rosters/${activeRoster.id}`, { replace: true })
    }
  }, [id, activeRoster?.id, navigate])

  // Load main catalogue whenever the roster has one selected
  useEffect(() => {
    if (!activeRoster?.catalogueId) return
    if (parsedCatalogues[activeRoster.catalogueId]) return
    parseCatalogueData(activeRoster.catalogueId)
      .then((p) => setParsedCatalogue(activeRoster.catalogueId, p))
      .catch(() => {/* DataManager will surface its own error on the Build step */})
  }, [activeRoster?.catalogueId, parsedCatalogues, setParsedCatalogue])

  // Load allied catalogue whenever one is selected
  useEffect(() => {
    if (!activeRoster?.alliedCatalogueId) return
    if (parsedCatalogues[activeRoster.alliedCatalogueId]) return
    parseCatalogueData(activeRoster.alliedCatalogueId)
      .then((p) => setParsedCatalogue(activeRoster.alliedCatalogueId, p))
      .catch(() => {})
  }, [activeRoster?.alliedCatalogueId, parsedCatalogues, setParsedCatalogue])

  if (furthestRef.current < activeStep) furthestRef.current = activeStep

  if (!activeRoster) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="font-heading text-parchment-muted text-sm tracking-wide animate-pulse">
          Loading…
        </div>
      </div>
    )
  }

  // Compute live pts total for the banner (bracket-aware)
  const livePts = (() => {
    if (!activeRoster) return 0
    const mainCat = activeRoster.catalogueId ? parsedCatalogues[activeRoster.catalogueId] : null
    const alliedCat = activeRoster.alliedCatalogueId ? parsedCatalogues[activeRoster.alliedCatalogueId] : null
    const unitPts = (units: typeof activeRoster.units, cat: typeof mainCat) => {
      if (!cat) return 0
      return units.reduce((sum, u) => {
        const entry = cat.entries.find((e) => e.id === u.catalogueEntryId)
        if (!entry) return sum
        const mc = (u.models ?? []).length || 1
        let pts = entry.costs.find((c) => c.name === 'pts' || c.name === 'Point(s)' || c.name === 'Points')?.value ?? 0
        for (const b of (entry.costBrackets ?? [])) { if (mc >= b.minModels) pts = b.pts }
        return sum + pts
      }, 0)
    }
    return unitPts(activeRoster.units, mainCat) + unitPts(activeRoster.alliedUnits ?? [], alliedCat)
  })()

  const STEP_COMPONENTS = activeRoster?.systemId === HH_SYSTEM_ID ? HH_STEPS : WH40K_STEPS
  const StepComponent = STEP_COMPONENTS[activeStep]

  function canGoNext(): boolean {
    if (!activeRoster) return false
    if (activeStep === 0) return !!activeRoster.name.trim() && !!activeRoster.systemId
    if (activeStep === 1) return !!activeRoster.catalogueId
    return true
  }

  function goNext() {
    const next = Math.min(activeStep + 1, STEPS.length - 1)
    if (next > furthestRef.current) furthestRef.current = next
    setActiveStep(next)
  }

  function goBack() {
    setActiveStep(Math.max(activeStep - 1, 0))
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <button
            onClick={() => navigate('/rosters')}
            className="font-heading text-xs tracking-widest uppercase text-parchment-faint hover:text-gold transition-colors"
          >
            ← Warband Forge
          </button>
          <h1 className="font-display text-xl text-gold tracking-wider mt-1">
            {activeRoster.name || <span className="text-gold-muted italic text-base">Unnamed Army</span>}
          </h1>
        </div>
        {saving && (
          <span className="font-heading text-[10px] tracking-widest uppercase text-parchment-faint animate-pulse">
            Saving…
          </span>
        )}
        {/* Pts banner — visible from Build step onwards */}
        {activeStep >= 2 && activeRoster.pointsLimit > 0 && (
          <div className={[
            'font-heading text-sm tracking-wide px-3 py-1 border',
            livePts > activeRoster.pointsLimit
              ? 'text-blood border-blood/40 bg-blood/10'
              : 'text-gold border-gold-muted/30 bg-gold/5',
          ].join(' ')}>
            {livePts} / {activeRoster.pointsLimit} pts
          </div>
        )}
      </div>

      {/* Step bar */}
      <StepBar
        current={activeStep}
        furthest={furthestRef.current}
        onChange={setActiveStep}
      />

      {/* Step content */}
      <div className="py-6 min-h-[400px]">
        <StepComponent />
      </div>

      {/* Nav buttons */}
      <div className="flex items-center justify-between border-t border-gold-muted/20 pt-4">
        <button
          onClick={goBack}
          disabled={activeStep === 0}
          className="btn-ghost text-sm disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← Back
        </button>

        <div className="flex items-center gap-2">
          <span className="font-heading text-xs text-parchment-faint tracking-wide">
            Step {activeStep + 1} of {STEPS.length}
          </span>
        </div>

        {activeStep < STEPS.length - 1 ? (
          <button
            onClick={goNext}
            disabled={!canGoNext()}
            className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={() => navigate('/rosters')}
            className="btn-ghost text-sm"
          >
            Done ✓
          </button>
        )}
      </div>
    </div>
  )
}
