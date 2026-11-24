import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

// Exercise the actual pure TypeScript helpers using the existing compiler,
// without introducing another test runner or compiling browser components.
const source = readFileSync(new URL('../../src/services/wh40k11eRosterRules.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } })
const { eligibleEnhancements, rosterUnitCost, unitPrice, rosterProblems, weaponChoices,
  ALL_FACTIONS, rosterEnhancements, normalize11eRoster, detachmentBudget, detachmentCost, groupRosterUnits, sameDetachment, withRosterDetachments } =
  await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)

const sheet = {
  id: 'guard', name: 'Guard', faction_id: 'AC', enhancementIds: ['enh'],
  points: { prices: [
    { label: '2 models', models: 2, points: 180, minCopies: 1, maxCopies: 2 },
    { label: '2 models', models: 2, points: 210, minCopies: 3, maxCopies: null },
  ] },
}
const enhancement = { id: 'enh', detachment_id: 'host', officialPoints: 20 }
const rules = { datasheets: [sheet], enhancements: [enhancement], factions: [{ id: 'AC' }], detachments: [
  { id: 'host', name: 'Host', faction_id: 'AC', points: { detachmentPoints: 1, uniqueTags: [] }, rulesAvailable: true },
  { id: 'champions', name: 'Champions', faction_id: 'AC', points: { detachmentPoints: 2, uniqueTags: [] }, rulesAvailable: true },
  { id: 'throne', name: 'Throne', faction_id: 'AC', points: { detachmentPoints: 3, uniqueTags: [] }, rulesAvailable: true },
] }
const unit = { id: 'u1', datasheetId: 'guard', modelCount: 2, pointsLabel: '2 models', manualPoints: null, enhancementId: '', enhancementPointsOverride: null, paidUpgrades: {}, upgradesReviewed: true, useDefaultLoadout: true, weapons: {} }
const army = { name: 'Army', factionId: 'AC', detachmentIds: ['host'], detachmentPointsOverrides: {},
  battleSize: 'strike-force', pointsLimit: 2000, units: [unit] }

test('one equipped weapon retains ranged, melee and alternate profiles', () => {
  const groups = weaponChoices({ wargear: [
    { line: '1', name: 'Spear', type: 'Ranged' },
    { line: '2', name: 'Spear', type: 'Melee' },
    { line: '3', name: 'Sword - strike', type: 'Melee' },
    { line: '3', name: 'Sword - sweep', type: 'Melee' },
  ] })
  assert.equal(groups.length, 2)
  assert.deepEqual(groups[0].profiles.map((profile) => profile.type), ['Ranged', 'Melee'])
  assert.equal(groups[1].profiles.length, 2)
})
test('copy tiers update after adding or removing copies of a unit', () => {
  const copies = [unit, { ...unit, id: 'u2' }, { ...unit, id: 'u3' }]
  assert.deepEqual(copies.map((entry) => rosterUnitCost({ ...army, units: copies }, entry, rules)), [180, 180, 210])
  assert.equal(rosterUnitCost({ ...army, units: copies.slice(1) }, copies[2], rules), 180)
})

test('unknown size and unmatched points remain unknown, not zero', () => {
  assert.equal(unitPrice(sheet, 3, 1), undefined)
  assert.equal(rosterUnitCost(army, { ...unit, modelCount: 3 }, rules), null)
  assert.equal(rosterUnitCost(army, unit, { ...rules, datasheets: [{ ...sheet, points: null }] }), null)
  assert.equal(rosterUnitCost(army, { ...unit, manualPoints: 0 }, rules), 0)
})

test('adds enhancements and only offers those linked to unit and detachment', () => {
  assert.equal(rosterUnitCost(army, { ...unit, enhancementId: 'enh' }, rules), 200)
  assert.equal(eligibleEnhancements(rules, sheet, ['other']).length, 0)
  assert.equal(eligibleEnhancements(rules, { ...sheet, enhancementIds: [] }, ['host']).length, 0)
  assert.equal(eligibleEnhancements(rules, sheet, ['host']).length, 1)
})

test('unmatched enhancements need an explicit manual price', () => {
  const changedRules = { ...rules, enhancements: [{ ...enhancement, officialPoints: null }] }
  assert.equal(rosterUnitCost(army, { ...unit, enhancementId: 'enh' }, changedRules), null)
  assert.equal(rosterUnitCost(army, { ...unit, enhancementId: 'enh', enhancementPointsOverride: 15 }, changedRules), 195)
})

test('paid upgrades are charged and require a loadout review', () => {
  const paidRules = { ...rules, datasheets: [{ ...sheet, points: { prices: [...sheet.points.prices,
    { label: 'per Shield', models: null, points: 5, minCopies: 1, maxCopies: null }] } }] }
  assert.equal(rosterUnitCost(army, { ...unit, upgradesReviewed: false }, paidRules), null)
  assert.equal(rosterUnitCost(army, { ...unit, paidUpgrades: { 'per Shield': 3 } }, paidRules), 195)
})

test('same model count with different squad compositions requires a label', () => {
  const composed = { ...sheet, points: { prices: [
    ...sheet.points.prices,
    { label: '1 leader, 1 warrior', models: 2, points: 150, minCopies: 1, maxCopies: 2 },
  ] } }
  assert.equal(unitPrice(composed, 2, 1), undefined)
  assert.equal(unitPrice(composed, 2, 1, '1 leader, 1 warrior').points, 150)
})

test('roster checks identify duplicate enhancements and points over limit', () => {
  const units = [unit, { ...unit, id: 'u2' }].map((entry) => ({ ...entry, enhancementId: 'enh' }))
  const issues = rosterProblems({ ...army, units, pointsLimit: 100 }, rules)
  assert.ok(issues.some((issue) => issue.includes('already assigned')))
  assert.ok(issues.some((issue) => issue.includes('exceed')))
})

test('multiple detachments spend DP, never unit points, at the exact budget boundary', () => {
  const multi = { ...army, detachmentIds: ['host', 'champions'] }
  assert.deepEqual(detachmentBudget(multi, rules), { spent: 3, limit: 3, incomplete: false, incursionException: false })
  assert.equal(rosterUnitCost(multi, unit, rules), 180)
  assert.ok(!rosterProblems(multi, rules).some((issue) => issue.includes('DP budget')))
  assert.ok(rosterProblems({ ...multi, detachmentIds: [...multi.detachmentIds, 'throne'] }, rules)
    .some((issue) => issue.includes('exceed the 3 DP budget')))
})

test('Incursion permits a single 3 DP detachment but not 3 DP across several', () => {
  const incursion = { ...army, battleSize: 'incursion', pointsLimit: 1000 }
  assert.equal(detachmentBudget({ ...incursion, detachmentIds: ['throne'] }, rules).incursionException, true)
  assert.ok(!rosterProblems({ ...incursion, detachmentIds: ['throne'] }, rules).some((issue) => issue.includes('DP budget')))
  assert.ok(rosterProblems({ ...incursion, detachmentIds: ['host', 'champions'] }, rules).some((issue) => issue.includes('DP budget')))
  assert.ok(rosterProblems({ ...incursion, detachmentIds: ['throne', 'host'] }, rules).some((issue) => issue.includes('DP budget')))
})

test('unknown DP is incomplete, manual DP is explicit and invalid overrides stay unknown', () => {
  const unknown = { ...rules.detachments[0], points: null }
  const changedRules = { ...rules, detachments: [unknown] }
  assert.deepEqual(detachmentBudget(army, changedRules), { spent: 0, limit: 3, incomplete: true, incursionException: false })
  assert.equal(detachmentCost({ ...army, detachmentPointsOverrides: { host: 2 } }, unknown), 2)
  for (const invalid of [-1, 0, 1.5, NaN, Infinity]) {
    assert.equal(detachmentCost({ ...army, detachmentPointsOverrides: { host: invalid } }, unknown), null)
  }
  assert.ok(rosterProblems(army, changedRules).some((issue) => issue.includes('Unique tags')))
})

test('repeated detachments, shared Unique tags and wrong-faction selections are flagged', () => {
  const taggedRules = { ...rules, detachments: rules.detachments.map((entry) =>
    ({ ...entry, points: { ...entry.points, uniqueTags: ['Shield Host'] } })) }
  assert.ok(rosterProblems({ ...army, detachmentIds: ['host', 'host'] }, rules).some((issue) => issue.includes('more than once')))
  assert.ok(rosterProblems({ ...army, detachmentIds: ['host', 'champions'] }, taggedRules).some((issue) => issue.includes('Unique tag')))
  assert.ok(rosterProblems(army, { ...rules, detachments: [{ ...rules.detachments[0], faction_id: 'other' }] })
    .some((issue) => issue.includes('does not belong')))
})

test('alternate-format CSV records cannot bypass same-detachment uniqueness', () => {
  const first = rules.detachments[0]
  const alternate = { ...first, id: 'alternate', type: 'Boarding Actions', points: null }
  assert.equal(sameDetachment(first, alternate), true)
  assert.equal(sameDetachment(first, { ...alternate, faction_id: 'other' }), false)
  const issues = rosterProblems({ ...army, detachmentIds: ['host', 'alternate'] },
    { ...rules, detachments: [...rules.detachments, alternate] })
  assert.ok(issues.some((issue) => issue.includes('alternate-format records')))
})

test('enhancements from all selected detachments qualify and removal only clears invalid ones', () => {
  const changedRules = { ...rules,
    enhancements: [enhancement, { id: 'second', detachment_id: 'champions' }],
    datasheets: [{ ...sheet, enhancementIds: ['enh', 'second'] }],
  }
  const multi = { ...army, detachmentIds: ['host', 'champions'],
    detachmentPointsOverrides: { host: 1, champions: 2 },
    units: [{ ...unit, enhancementId: 'enh', enhancementPointsOverride: 10 },
      { ...unit, id: 'u2', enhancementId: 'second', enhancementPointsOverride: 15 }],
  }
  assert.equal(eligibleEnhancements(changedRules, changedRules.datasheets[0], multi.detachmentIds).length, 2)
  const changed = withRosterDetachments(multi, changedRules, ['champions'])
  assert.equal(changed.units[0].enhancementId, '')
  assert.equal(changed.units[0].enhancementPointsOverride, null)
  assert.equal(changed.units[1].enhancementId, 'second')
  assert.equal(changed.units[1].enhancementPointsOverride, 15)
  assert.deepEqual(changed.detachmentPointsOverrides, { champions: 2 })
  assert.deepEqual(multi.detachmentIds, ['host', 'champions'])
})

test('battle-size enhancement limits and missing official-only rules are surfaced', () => {
  const units = Array.from({ length: 5 }, (_, i) => ({ ...unit, id: `u${i}`, enhancementId: 'enh' }))
  assert.ok(!rosterProblems({ ...army, units: units.slice(0, 4) }, rules).some((issue) => issue.includes('enhancement limit')))
  assert.ok(rosterProblems({ ...army, units }, rules).some((issue) => issue.includes('4 enhancement limit')))
  assert.ok(rosterProblems({ ...army, battleSize: 'incursion', units: units.slice(0, 3) }, rules)
    .some((issue) => issue.includes('2 enhancement limit')))
  assert.ok(rosterProblems(army, { ...rules, detachments: [{ ...rules.detachments[0], rulesAvailable: false }] })
    .some((issue) => issue.includes('missing from the supplied CSVs')))
})

test('legacy single-detachment migration preserves saved content without guessing custom battle sizes', () => {
  const legacy = { id: 'saved', name: 'Veterans', description: 'army notes', image: 'army-image',
    factionId: 'AC', detachmentId: 'host', pointsLimit: 1000, createdAt: 123, updatedAt: 456,
    units: [{ ...unit, name: 'Guardians', description: 'unit notes', image: 'unit-image' }] }
  const migrated = normalize11eRoster(legacy)
  assert.deepEqual(migrated.detachmentIds, ['host'])
  assert.equal(migrated.battleSize, 'incursion')
  assert.deepEqual(migrated.units, legacy.units)
  assert.equal(migrated.image, legacy.image)
  assert.equal(migrated.description, legacy.description)
  assert.equal(migrated.createdAt, 123)
  assert.equal(migrated.updatedAt, 456)
  assert.equal(normalize11eRoster({ ...legacy, pointsLimit: 2000 }).battleSize, 'strike-force')
  assert.equal(normalize11eRoster({ ...legacy, pointsLimit: 1500 }).battleSize, null)
  assert.equal(normalize11eRoster(migrated), migrated)
})

test('army role grouping preserves every unit and original copy-tier pricing', () => {
  const other = { ...sheet, id: 'leader', role: 'Characters' }
  const copies = [unit, { ...unit, id: 'u2', name: 'Second' }, { ...unit, id: 'u3' }]
  const groupedRules = { ...rules, datasheets: [{ ...sheet, role: 'Battleline' }, other] }
  const multi = { ...army, units: [...copies, { ...unit, id: 'leader1', datasheetId: 'leader' }] }
  const groups = groupRosterUnits(multi, groupedRules)
  assert.deepEqual(groups.map(({ role, units }) => [role, units.length]), [['Characters', 1], ['Battleline', 3]])
  assert.equal(groups.flatMap(({ units }) => units).length, 4)
  assert.equal(rosterUnitCost(multi, groups[1].units[2], groupedRules), 210)
})

test('all-factions lists allow mixed factions, no detachments, duplicate enhancements and unlimited points', () => {
  const mixedRules = { ...rules, datasheets: [sheet, { ...sheet, id: 'alien', faction_id: 'other' }] }
  const mixed = { ...army, factionId: ALL_FACTIONS, pointsLimit: 1, battleSize: null,
    detachmentIds: [], units: [
      { ...unit, enhancementId: 'enh' },
      { ...unit, id: 'alien-unit', datasheetId: 'alien', enhancementId: 'enh' },
      { ...unit, id: 'u2', enhancementId: 'enh' },
      { ...unit, id: 'u3', enhancementId: 'enh' },
      { ...unit, id: 'u4', enhancementId: 'enh' },
    ] }
  assert.deepEqual(rosterProblems(mixed, mixedRules), [])
  assert.equal(rosterUnitCost(mixed, mixed.units[1], mixedRules), 200)
  assert.deepEqual(rosterEnhancements(mixed, mixedRules, { ...sheet, enhancementIds: [] }), mixedRules.enhancements)
  assert.deepEqual(rosterEnhancements(army, mixedRules, { ...sheet, enhancementIds: [] }), [])
  assert.ok(rosterProblems({ ...army, units: mixed.units, pointsLimit: 1 }, mixedRules).length > 0)
})

test('unrestricted lists still surface missing datasheets and unknown pricing without treating them as free', () => {
  const mixed = { ...army, factionId: ALL_FACTIONS, detachmentIds: [],
    units: [{ ...unit, modelCount: 7 }, { ...unit, id: 'missing', datasheetId: 'missing' }] }
  const issues = rosterProblems(mixed, rules)
  assert.equal(issues.length, 2)
  assert.ok(issues.some((issue) => issue.includes('no longer available')))
  assert.ok(issues.some((issue) => issue.includes('points total is incomplete')))
  assert.equal(rosterUnitCost(mixed, mixed.units[0], rules), null)
})

test('view groups have a fixed type order and keep identical datasheets together without repricing copies', () => {
  const sheets = [
    { ...sheet, id: 'z', name: 'Zebras', role: 'Other' },
    { ...sheet, id: 'a', name: 'Alphas', role: 'Other' },
    { ...sheet, id: 'c', name: 'Captain', role: 'Characters' },
    { ...sheet, id: 'b', name: 'Battleline', role: 'Battleline' },
    { ...sheet, id: 't', name: 'Transport', role: 'Dedicated Transports' },
    { ...sheet, id: 'f', name: 'Fort', role: 'Fortifications' },
  ]
  const units = ['z', 'f', 'z', 'a', 't', 'b', 'c', 'z', 'missing'].map((id, i) =>
    ({ ...unit, id: `u${i}`, datasheetId: id, name: i === 0 ? 'ZZZ' : 'AAA' }))
  const roster = { ...army, units }
  const changedRules = { ...rules, datasheets: sheets }
  const groups = groupRosterUnits(roster, changedRules)
  assert.deepEqual(groups.map((group) => group.role),
    ['Characters', 'Battleline', 'Dedicated Transports', 'Other', 'Fortifications', 'Other units'])
  assert.deepEqual(groups[3].units.map((unit) => unit.datasheetId), ['a', 'z', 'z', 'z'])
  assert.deepEqual(groups[3].units.slice(1).map((unit) => unit.id), ['u0', 'u2', 'u7'])
  assert.equal(rosterUnitCost(roster, groups[3].units[3], changedRules), 210)
  assert.deepEqual(roster.units, units)
})
