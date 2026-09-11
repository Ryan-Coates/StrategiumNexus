import type { CampaignUnit } from '../types/campaign'

// Prorates a unit's points cost as it takes casualties, e.g. a 1000pt unit of 10 models
// loses 3 -> 700pts for the remaining 7. Uses the unit's starting cost/model count (fixed
// at creation) rather than its current values, so repeated losses don't compound rounding
// error. Falls back to current values for units saved before this field existed.
export function unitPointsFor(unit: Pick<CampaignUnit, 'pointsCost' | 'modelCount' | 'startingPointsCost' | 'startingModelCount'>, remainingModelCount: number): number {
  const baseCost = unit.startingPointsCost ?? unit.pointsCost
  const baseModels = unit.startingModelCount ?? unit.modelCount
  if (baseModels <= 0) return 0
  return Math.round((baseCost / baseModels) * Math.max(0, remainingModelCount))
}
