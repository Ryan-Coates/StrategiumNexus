import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { factionSlugs, matchDetachmentPoints, matchUnitPoints, normalizeName } from './mfm-matching.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const inputDirectory = path.join(root, 'Data', '11th')
const outputPath = path.join(root, 'public', 'data', 'wh40k11e.json')

function parsePipeCsv(contents, fileName) {
  const text = contents.replace(/^\uFEFF/, '')
  const records = []
  let record = []
  let field = ''
  let quoted = false
  let expectedColumns = null

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (character === '"') {
        quoted = false
      } else {
        field += character
      }
      continue
    }

    if (character === '"' && field.length === 0) {
      quoted = true
    } else if (character === '|') {
      record.push(field)
      field = ''
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && text[index + 1] === '\n') index += 1
      if (expectedColumns === null || record.length + 1 >= expectedColumns) {
        record.push(field)
        if (record.some((value) => value !== '')) {
          records.push(record)
          if (expectedColumns === null) expectedColumns = record.length
        }
        record = []
        field = ''
      } else if (record.length === 0 && field === '') {
        continue
      } else {
        field += '\n'
      }
    } else {
      field += character
    }
  }

  if (quoted) throw new Error(`${fileName} contains an unterminated quoted field`)
  if (field.length > 0 || record.length > 0) {
    record.push(field)
    if (record.some((value) => value !== '')) records.push(record)
  }

  const [headers, ...rows] = records
  if (!headers) throw new Error(`${fileName} is empty`)

  return rows.map((values, rowIndex) => {
    if (values.length !== headers.length) {
      throw new Error(
        `${fileName} row ${rowIndex + 2} has ${values.length} fields; expected ${headers.length}`,
      )
    }
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]))
  })
}

function readTable(fileName) {
  const filePath = path.join(inputDirectory, fileName)
  return parsePipeCsv(readFileSync(filePath, 'utf8'), fileName)
}

function groupBy(rows, key) {
  const grouped = new Map()
  for (const row of rows) {
    const values = grouped.get(row[key]) ?? []
    values.push(row)
    grouped.set(row[key], values)
  }
  return grouped
}

const tables = {
  factions: readTable('Factions.csv'),
  sources: readTable('Source.csv'),
  abilities: readTable('Abilities.csv'),
  datasheets: readTable('Datasheets.csv'),
  models: readTable('Datasheets_models.csv'),
  datasheetAbilities: readTable('Datasheets_abilities.csv'),
  wargear: readTable('Datasheets_wargear.csv'),
  keywords: readTable('Datasheets_keywords.csv'),
  unitComposition: readTable('Datasheets_unit_composition.csv'),
  options: readTable('Datasheets_options.csv'),
  leaders: readTable('Datasheets_leader.csv'),
  datasheetEnhancements: readTable('Datasheets_enhancements.csv'),
  datasheetDetachmentAbilities: readTable('Datasheets_detachment_abilities.csv'),
  detachments: readTable('Detachments.csv'),
  detachmentAbilities: readTable('Detachment_abilities.csv'),
  enhancements: readTable('Enhancements.csv'),
  stratagems: readTable('Stratagems.csv'),
  lastUpdate: readTable('Last_update.csv'),
}

const groupedTables = {
  models: groupBy(tables.models, 'datasheet_id'),
  abilities: groupBy(tables.datasheetAbilities, 'datasheet_id'),
  wargear: groupBy(tables.wargear, 'datasheet_id'),
  keywords: groupBy(tables.keywords, 'datasheet_id'),
  unitComposition: groupBy(tables.unitComposition, 'datasheet_id'),
  options: groupBy(tables.options, 'datasheet_id'),
  enhancements: groupBy(tables.datasheetEnhancements, 'datasheet_id'),
  detachmentAbilities: groupBy(tables.datasheetDetachmentAbilities, 'datasheet_id'),
}

const officialPoints = JSON.parse(readFileSync(path.join(inputDirectory, 'mfm-points.json'), 'utf8'))
const overrides = JSON.parse(readFileSync(path.join(inputDirectory, 'points-overrides.json'), 'utf8'))
const pointsBySheet = new Map(tables.datasheets.map((sheet) => {
  const faction = tables.factions.find((entry) => entry.id === sheet.faction_id)
  if (!faction) throw new Error(`No faction found for datasheet ${sheet.id}`)
  return [sheet.id, matchUnitPoints(sheet, faction, officialPoints.entries, overrides.datasheets[sheet.id])]
}))
const datasheets = tables.datasheets.map((datasheet) => ({
  ...datasheet,
  isLegends: /legends/i.test(tables.sources.find((source) => source.id === datasheet.source_id)?.name ?? '')
    || pointsBySheet.get(datasheet.id)?.isLegends === true,
  points: pointsBySheet.get(datasheet.id) ?? null,
  models: groupedTables.models.get(datasheet.id) ?? [],
  abilities: groupedTables.abilities.get(datasheet.id) ?? [],
  wargear: groupedTables.wargear.get(datasheet.id) ?? [],
  keywords: groupedTables.keywords.get(datasheet.id) ?? [],
  unitComposition: groupedTables.unitComposition.get(datasheet.id) ?? [],
  options: groupedTables.options.get(datasheet.id) ?? [],
  enhancementIds: (groupedTables.enhancements.get(datasheet.id) ?? []).map(
    (row) => row.enhancement_id,
  ),
  detachmentAbilityIds: (
    groupedTables.detachmentAbilities.get(datasheet.id) ?? []
  ).map((row) => row.detachment_ability_id),
  canLeadIds: tables.leaders
    .filter((row) => row.leader_id === datasheet.id)
    .map((row) => row.attached_id),
  leaderIds: tables.leaders
    .filter((row) => row.attached_id === datasheet.id)
    .map((row) => row.leader_id),
}))

const detachments = tables.factions.flatMap((faction) => {
  const official = officialPoints.entries.filter((entry) =>
    entry.kind === 'detachment' && factionSlugs(faction).includes(entry.factionSlug))
  const signature = (entry) => JSON.stringify([entry.detachmentPoints, entry.uniqueTags, entry.prices])
  const imported = tables.detachments.filter((entry) => entry.faction_id === faction.id).map((entry) => {
    const points = matchDetachmentPoints(entry, faction, official)
    return { ...entry, points, rulesAvailable: true }
  })
  const missing = official.filter((entry, index) =>
    !imported.some((item) => item.points && normalizeName(item.name) === normalizeName(entry.name))
    && !official.slice(0, index).some((item) =>
      normalizeName(item.name) === normalizeName(entry.name) && signature(item) === signature(entry)))
    .map((entry) => ({
      id: `mfm:${entry.id}`, faction_id: faction.id, name: entry.name, legend: '',
      type: `MFM: ${entry.factionSlug}`, points: entry, rulesAvailable: false,
    }))
  return [...imported, ...missing]
})

const ruleset = {
  edition: 11,
  pointsUpdatedAt: officialPoints.fetchedAt,
  pointsSourceUrl: officialPoints.sourceUrl,
  lastUpdated: tables.lastUpdate[0]?.last_update ?? '',
  factions: tables.factions,
  sources: tables.sources,
  abilities: tables.abilities,
  datasheets,
  detachments,
  detachmentAbilities: tables.detachmentAbilities,
  enhancements: tables.enhancements.map((entry) => {
    const detachment = detachments.find((item) =>
      item.id === entry.detachment_id && item.faction_id === entry.faction_id)?.points
    const price = detachment?.prices.find((item) =>
      normalizeName(item.label) === normalizeName(entry.name))
    return { ...entry, officialPoints: price?.points ?? null }
  }),
  stratagems: tables.stratagems,
}

mkdirSync(path.dirname(outputPath), { recursive: true })
const output = `${JSON.stringify(ruleset)}\n`
writeFileSync(outputPath, output, 'utf8')
writeFileSync(path.join(path.dirname(outputPath), 'wh40k11e-version.json'),
  `${JSON.stringify({ revision: createHash('sha256').update(output).digest('hex') })}\n`, 'utf8')
const report = {
  pointsUpdatedAt: officialPoints.fetchedAt,
  matchedDatasheets: datasheets.filter((sheet) => sheet.points).length,
  totalDatasheets: datasheets.length,
  unmatchedDetachments: detachments.filter((entry) => !entry.points)
    .map(({ id, name, faction_id }) => ({ id, name, faction_id })),
  detachmentsWithoutRules: detachments.filter((entry) => !entry.rulesAvailable)
    .map(({ id, name, faction_id }) => ({ id, name, faction_id })),
  unmatchedDatasheets: datasheets.filter((sheet) => !sheet.points)
    .map(({ id, name, faction_id, isLegends }) => ({ id, name, faction_id, isLegends })),
  unmatchedEnhancements: ruleset.enhancements.filter((entry) => entry.officialPoints === null)
    .map(({ id, name, detachment, faction_id }) => ({ id, name, detachment, faction_id })),
}
writeFileSync(path.join(inputDirectory, 'points-match-report.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log(
  `Built ${outputPath} (${datasheets.length} datasheets, ${tables.factions.length} factions)`,
)
