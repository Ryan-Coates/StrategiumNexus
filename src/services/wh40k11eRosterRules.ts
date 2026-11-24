import type { MfmPrice, Wh40k11eDatasheet, Wh40k11eDetachment, Wh40k11eEnhancement, Wh40k11eRuleset } from '../types/wh40k11e'
import type { LegacyWh40k11eRoster, Wh40k11eRoster, Wh40k11eRosterUnit } from '../types/wh40k11eRoster'

export const ALL_FACTIONS = 'all-factions'

export function rosterEnhancements(roster: Wh40k11eRoster, rules: Wh40k11eRuleset, sheet: Wh40k11eDatasheet) {
  return roster.factionId === ALL_FACTIONS ? rules.enhancements : eligibleEnhancements(rules, sheet, roster.detachmentIds)
}

export const battleSizes = {
  incursion: { name: 'Incursion', points: 1000, dp: 2, enhancements: 2 },
  'strike-force': { name: 'Strike Force', points: 2000, dp: 3, enhancements: 4 },
}

export function normalize11eRoster(roster: Wh40k11eRoster | LegacyWh40k11eRoster): Wh40k11eRoster {
  if ('detachmentIds' in roster) return roster
  const { detachmentId, ...rest } = roster
  return {
    ...rest, detachmentIds: detachmentId ? [detachmentId] : [], detachmentPointsOverrides: {},
    battleSize: roster.pointsLimit === 1000 ? 'incursion' : roster.pointsLimit === 2000 ? 'strike-force' : null,
  }
}

export function detachmentCost(roster: Wh40k11eRoster, detachment: Wh40k11eDetachment): number | null {
  const cost = roster.detachmentPointsOverrides[detachment.id] ?? detachment.points?.detachmentPoints
  return cost !== undefined && cost !== null && Number.isInteger(cost) && cost > 0 ? cost : null
}

export function sameDetachment(first: Wh40k11eDetachment, second: Wh40k11eDetachment): boolean {
  return first.faction_id === second.faction_id
    && (first.id === second.id || first.name.trim().toLowerCase() === second.name.trim().toLowerCase())
}

export function detachmentBudget(roster: Wh40k11eRoster, rules: Wh40k11eRuleset) {
  const costs = roster.detachmentIds.map((id) => {
    const entry = rules.detachments.find((item) => item.id === id)
    return entry ? detachmentCost(roster, entry) : null
  })
  return {
    spent: costs.reduce<number>((total, cost) => total + (cost ?? 0), 0),
    incomplete: costs.some((cost) => cost === null),
    limit: roster.battleSize ? battleSizes[roster.battleSize].dp : null,
    incursionException: roster.battleSize === 'incursion' && costs.length === 1 && costs[0] === 3,
  }
}

export function groupRosterUnits(roster: Wh40k11eRoster, rules: Wh40k11eRuleset) {
  const sheets = new Map(rules.datasheets.map((sheet) => [sheet.id, sheet]))
  const roles = ['Characters', 'Battleline', 'Dedicated Transports', 'Other', 'Fortifications', 'Other units']
  const groups = new Map<string, Wh40k11eRosterUnit[]>()
  for (const unit of roster.units) {
    const sheet = sheets.get(unit.datasheetId)
    const role = sheet?.role || 'Other units'
    const group = groups.get(role) ?? []
    group.push(unit)
    groups.set(role, group)
  }
  const rank = (role: string) => roles.includes(role) ? roles.indexOf(role) : roles.length
  return [...groups].sort(([first], [second]) =>
    rank(first) - rank(second) || first.localeCompare(second))
    .map(([role, units]) => ({
      role,
      units: units.sort((first, second) =>
        (sheets.get(first.datasheetId)?.name ?? first.datasheetId)
          .localeCompare(sheets.get(second.datasheetId)?.name ?? second.datasheetId)
        || first.datasheetId.localeCompare(second.datasheetId)),
    }))
}

export function weaponChoices(sheet: Wh40k11eDatasheet) {
  const groups: { id: string; name: string; profiles: Wh40k11eDatasheet['wargear'] }[] = []
  for (const weapon of sheet.wargear) {
    const linked = groups.filter((group) => group.profiles.some((profile) =>
      profile.line === weapon.line || profile.name === weapon.name))
    if (!linked.length) {
      groups.push({ id: weapon.line, name: weapon.name, profiles: [weapon] })
    } else {
      const first = linked[0]
      first.profiles = [...linked.flatMap((group) => group.profiles), weapon]
      first.name = [...new Set(first.profiles.map((profile) => profile.name))].join(' / ')
      for (const extra of linked.slice(1)) groups.splice(groups.indexOf(extra), 1)
    }
  }
  return groups
}

export function eligibleEnhancements(
  ruleset: Wh40k11eRuleset,
  sheet: Wh40k11eDatasheet,
  detachmentIds: string[],
): Wh40k11eEnhancement[] {
  return ruleset.enhancements.filter((entry) =>
    detachmentIds.includes(entry.detachment_id)
    && sheet.enhancementIds.includes(entry.id),
  )
}

export function withRosterDetachments(
  roster: Wh40k11eRoster,
  rules: Wh40k11eRuleset,
  detachmentIds: string[],
): Wh40k11eRoster {
  return {
    ...roster, detachmentIds,
    detachmentPointsOverrides: Object.fromEntries(Object.entries(roster.detachmentPointsOverrides)
      .filter(([id]) => detachmentIds.includes(id))),
    units: roster.units.map((unit) => {
      const sheet = rules.datasheets.find((entry) => entry.id === unit.datasheetId)
      return !unit.enhancementId || (sheet && eligibleEnhancements(rules, sheet, detachmentIds)
        .some((entry) => entry.id === unit.enhancementId))
        ? unit : { ...unit, enhancementId: '', enhancementPointsOverride: null }
    }),
  }
}

export function unitPrice(
  sheet: Wh40k11eDatasheet,
  modelCount: number,
  copy: number,
  pointsLabel?: string,
): MfmPrice | undefined {
  const matches = sheet.points?.prices.filter((price) =>
    price.models === modelCount && copy >= price.minCopies
    && (price.maxCopies === null || copy <= price.maxCopies)
    && (!pointsLabel || price.label === pointsLabel),
  ) ?? []
  return matches.length === 1 ? matches[0] : undefined
}

export function paidUpgradePrices(sheet: Wh40k11eDatasheet): MfmPrice[] {
  return (sheet.points?.prices ?? []).filter((price) => price.models === null)
}

export function rosterUnitCost(
  roster: Wh40k11eRoster,
  unit: Wh40k11eRosterUnit,
  ruleset: Wh40k11eRuleset,
): number | null {
  const sheet = ruleset.datasheets.find((entry) => entry.id === unit.datasheetId)
  if (!sheet) return null
  const index = roster.units.findIndex((entry) => entry.id === unit.id)
  const copy = roster.units.slice(0, index + 1).filter((entry) =>
    entry.datasheetId === unit.datasheetId).length
  const basePoints = unit.manualPoints ?? unitPrice(sheet, unit.modelCount, copy, unit.pointsLabel)?.points
  if (basePoints === undefined || basePoints === null) return null
  const upgrades = paidUpgradePrices(sheet)
  if (upgrades.length > 0 && !unit.upgradesReviewed) return null
  const upgradeCost = upgrades.reduce((total, price) =>
    total + price.points * (unit.paidUpgrades[price.label] ?? 0), 0)
  const enhancement = ruleset.enhancements.find((entry) => entry.id === unit.enhancementId)
  // An unmatched enhancement price is unknown, not a free enhancement.
  const enhancementPoints = unit.enhancementPointsOverride ?? enhancement?.officialPoints
  if (unit.enhancementId && (!enhancement || enhancementPoints === null || enhancementPoints === undefined)) return null
  return basePoints + upgradeCost + (unit.enhancementId ? enhancementPoints ?? 0 : 0)
}

export function rosterProblems(roster: Wh40k11eRoster, ruleset: Wh40k11eRuleset): string[] {
  const issues: string[] = []
  if (!roster.name.trim()) issues.push('Give the army a name.')
  if (roster.factionId === ALL_FACTIONS) {
    if (!roster.units.length) issues.push('Add at least one unit.')
    for (const unit of roster.units) {
      const sheet = ruleset.datasheets.find((entry) => entry.id === unit.datasheetId)
      const label = unit.name || sheet?.name || unit.datasheetId
      if (!sheet) issues.push(`${label}: datasheet is no longer available.`)
      else if (rosterUnitCost(roster, unit, ruleset) === null) {
        issues.push(`${label}: points total is incomplete; check size, paid upgrades and enhancement pricing.`)
      }
    }
    return issues
  }
  if (!ruleset.factions.some((entry) => entry.id === roster.factionId)) issues.push('Choose an army faction.')
  if (!roster.detachmentIds.length) issues.push('Choose at least one detachment belonging to the army faction.')
  if (new Set(roster.detachmentIds).size !== roster.detachmentIds.length) {
    issues.push('The same detachment cannot be selected more than once.')
  }
  const usedTags = new Set<string>()
  const selected: Wh40k11eDetachment[] = []
  for (const id of roster.detachmentIds) {
    const entry = ruleset.detachments.find((item) => item.id === id)
    if (!entry || entry.faction_id !== roster.factionId) {
      issues.push('A selected detachment is missing or does not belong to this faction.')
      continue
    }
    if (selected.some((other) => other.id !== id && sameDetachment(other, entry))) {
      issues.push(`${entry.name}: the same named detachment cannot be selected more than once, including alternate-format records.`)
    }
    selected.push(entry)
    if (detachmentCost(roster, entry) === null) issues.push(`${entry.name}: DP cost is unknown; select a current detachment or enter a reviewed override.`)
    if (!entry.points) issues.push(`${entry.name}: no matching official detachment; Unique tags and current restrictions cannot be checked.`)
    if (!entry.rulesAvailable) issues.push(`${entry.name}: official cost is available, but rules and unit enhancement eligibility are missing from the supplied CSVs. Review the official rules.`)
    for (const tag of entry.points?.uniqueTags ?? []) {
      const key = tag.trim().toLowerCase()
      if (usedTags.has(key)) issues.push(`Unique tag "${tag}" is shared by more than one selected detachment.`)
      usedTags.add(key)
    }
  }
  const budget = detachmentBudget(roster, ruleset)
  if (budget.limit === null) issues.push('Choose a battle size to check DP and enhancement limits.')
  else if (budget.spent > budget.limit && !budget.incursionException) {
    issues.push(`Detachments exceed the ${budget.limit} DP budget (${budget.spent} DP selected).`)
  }
  const enhancementLimit = roster.battleSize ? battleSizes[roster.battleSize].enhancements : null
  if (enhancementLimit !== null && roster.units.filter((unit) => unit.enhancementId).length > enhancementLimit) {
    issues.push(`The army exceeds the ${enhancementLimit} enhancement limit; review any Upgrade exceptions in the official rules.`)
  }
  if (!roster.units.length) issues.push('Add at least one unit.')
  const usedEnhancements = new Set<string>()
  for (const unit of roster.units) {
    const sheet = ruleset.datasheets.find((entry) => entry.id === unit.datasheetId)
    const label = unit.name || sheet?.name || unit.datasheetId
    if (!sheet) {
      issues.push(`${label}: datasheet is no longer available.`)
      continue
    }
    if (sheet.faction_id !== roster.factionId) issues.push(`${label}: does not belong to this faction.`)
    if (unit.enhancementId) {
      if (!eligibleEnhancements(ruleset, sheet, roster.detachmentIds).some((entry) =>
        entry.id === unit.enhancementId)) issues.push(`${label}: enhancement is not eligible for this unit and detachment.`)
      if (usedEnhancements.has(unit.enhancementId)) issues.push(`${label}: enhancement is already assigned to another unit.`)
      usedEnhancements.add(unit.enhancementId)
    }
    if (!unit.useDefaultLoadout && !Object.values(unit.weapons).some((quantity) => quantity > 0)) {
      issues.push(`${label}: custom loadout has no weapons; check its written options.`)
    }
    if (rosterUnitCost(roster, unit, ruleset) === null) issues.push(`${label}: points total is incomplete; check size, paid upgrades and enhancement pricing.`)
  }
  const costs = roster.units.map((unit) => rosterUnitCost(roster, unit, ruleset))
  const subtotal = costs.reduce<number>((total, cost) => total + (cost ?? 0), 0)
  if (subtotal > roster.pointsLimit) issues.push(`Known points exceed the ${roster.pointsLimit} pts army limit.`)
  return issues
}
