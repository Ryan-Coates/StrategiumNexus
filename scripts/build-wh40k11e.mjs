import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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

const datasheets = tables.datasheets.map((datasheet) => ({
  ...datasheet,
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

const ruleset = {
  edition: 11,
  lastUpdated: tables.lastUpdate[0]?.last_update ?? '',
  factions: tables.factions,
  sources: tables.sources,
  abilities: tables.abilities,
  datasheets,
  detachments: tables.detachments,
  detachmentAbilities: tables.detachmentAbilities,
  enhancements: tables.enhancements,
  stratagems: tables.stratagems,
}

mkdirSync(path.dirname(outputPath), { recursive: true })
writeFileSync(outputPath, `${JSON.stringify(ruleset)}\n`, 'utf8')
console.log(
  `Built ${outputPath} (${datasheets.length} datasheets, ${tables.factions.length} factions)`,
)
