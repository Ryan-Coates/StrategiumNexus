import type {
  ParsedGameSystem,
  ParsedCatalogue,
  SelectionEntry,
  SelectionEntryGroup,
  CostBracket,
  Profile,
  RuleEntry,
  ProfileType,
  CategoryEntry,
  CatalogueMeta,
} from '../types'

// ── DOM helpers ───────────────────────────────────────────────────────────────

function attr(el: Element, name: string): string {
  return el.getAttribute(name) ?? ''
}

function childText(el: Element, tagName: string): string {
  return el.querySelector(tagName)?.textContent?.trim() ?? ''
}

// ── Element parsers ───────────────────────────────────────────────────────────

function parseRule(el: Element): RuleEntry {
  return {
    id: attr(el, 'id'),
    name: attr(el, 'name'),
    description: childText(el, 'description'),
  }
}

function parseProfile(el: Element): Profile {
  const characteristics: Record<string, string> = {}
  for (const charEl of el.querySelectorAll(':scope > characteristics > characteristic')) {
    const key = attr(charEl, 'name')
    if (key) characteristics[key] = charEl.textContent?.trim() ?? ''
  }
  return {
    id: attr(el, 'id'),
    name: attr(el, 'name'),
    typeName: attr(el, 'typeName'),
    characteristics,
  }
}

function parseSelectionEntry(el: Element): SelectionEntry {
  const profiles: Profile[] = []
  for (const p of el.querySelectorAll(':scope > profiles > profile')) {
    profiles.push(parseProfile(p))
  }

  const rules: RuleEntry[] = []
  for (const r of el.querySelectorAll(':scope > rules > rule')) {
    rules.push(parseRule(r))
  }

  // Costs — collect all (including 0-value) to build typeId→name map for bracket matching
  const costTypeIdToName = new Map<string, string>()
  const costs: { name: string; value: number }[] = []
  for (const c of el.querySelectorAll(':scope > costs > cost')) {
    const value = parseFloat(attr(c, 'value'))
    const name = attr(c, 'name').trim()
    const typeId = attr(c, 'typeId')
    if (typeId && name) costTypeIdToName.set(typeId, name)
    if (!isNaN(value) && value > 0) {
      costs.push({ name, value })
    }
  }

  // Category links
  const categoryIds: string[] = []
  let primaryCategoryId = ''
  for (const cl of el.querySelectorAll(':scope > categoryLinks > categoryLink')) {
    const targetId = attr(cl, 'targetId')
    if (targetId) {
      categoryIds.push(targetId)
      if (!primaryCategoryId || attr(cl, 'primary') === 'true') {
        primaryCategoryId = targetId
      }
    }
  }

  // Per-entry min/max constraints (model count per squad)
  const minC = el.querySelector(':scope > constraints > constraint[type="min"]')
  const maxC = el.querySelector(':scope > constraints > constraint[type="max"]')
  const minCount = minC ? parseInt(attr(minC, 'value')) || 0 : 0
  const maxCount = maxC ? parseInt(attr(maxC, 'value')) || -1 : -1

  // Cost brackets: modifier[type="set"] where field matches a pts cost typeId
  // and has an atLeast-model condition (e.g. Plague Marines 6+ models = 130pts)
  const costBrackets: CostBracket[] = []
  for (const mod of el.querySelectorAll(':scope > modifiers > modifier[type="set"]')) {
    const field = attr(mod, 'field')
    const costName = costTypeIdToName.get(field)
    if (costName !== 'pts') continue
    const pts = parseFloat(attr(mod, 'value'))
    if (isNaN(pts)) continue
    const cond = mod.querySelector(':scope > conditions > condition[type="atLeast"][childId="model"]')
    if (cond) {
      const minModels = parseInt(attr(cond, 'value')) || 0
      if (minModels > 0) costBrackets.push({ minModels, pts })
    }
  }
  costBrackets.sort((a, b) => a.minModels - b.minModels)

  // Restriction notes: modifier[type="add"][field="error"] → human-readable rule text
  const entryName = attr(el, 'name')
  const notes: string[] = []
  for (const mod of el.querySelectorAll(':scope > modifiers > modifier[type="add"][field="error"]')) {
    const value = attr(mod, 'value').replace(/\{this\}/g, entryName)
    if (value) notes.push(value)
  }

  // Fixed loadout from top-level entryLinks (display only, not choices)
  const linkedEquipment: string[] = []
  for (const link of el.querySelectorAll(':scope > entryLinks > entryLink[type="selectionEntry"]')) {
    const name = attr(link, 'name')
    if (name) linkedEquipment.push(name)
  }

  // Wargear groups — recursive to handle nested containers (e.g. Plague Champion "Wargear" container)
  const groups = parseGroupsRecursive(el)

  // Flat children (direct selectionEntry children not in a group)
  const children: SelectionEntry[] = []
  for (const child of el.querySelectorAll(':scope > selectionEntries > selectionEntry')) {
    children.push(parseSelectionEntry(child))
  }

  return {
    id: attr(el, 'id'),
    name: entryName,
    type: attr(el, 'type'),
    categoryIds,
    primaryCategoryId,
    profiles,
    rules,
    costs,
    minCount,
    maxCount,
    costBrackets,
    linkedEquipment,
    notes,
    groups,
    children,
  }
}

/** Build a synthetic SelectionEntry from an entryLink element (name only, no costs). */
function syntheticEntryFromLink(link: Element): SelectionEntry {
  return {
    id: attr(link, 'id'),
    name: attr(link, 'name'),
    type: 'upgrade',
    categoryIds: [],
    primaryCategoryId: '',
    profiles: [],
    rules: [],
    costs: [],
    minCount: 0,
    maxCount: -1,
    costBrackets: [],
    linkedEquipment: [],
    notes: [],
    groups: [],
    children: [],
  }
}

/**
 * Parse selectionEntryGroups recursively, flattening pure-container groups
 * (groups with no direct entries of their own but with nested sub-groups).
 * Also treats entryLinks[type="selectionEntry"] inside a group as entries.
 */
function parseGroupsRecursive(el: Element): SelectionEntryGroup[] {
  const result: import('../types').SelectionEntryGroup[] = []

  for (const group of el.querySelectorAll(':scope > selectionEntryGroups > selectionEntryGroup')) {
    // Collect direct entries: inline selectionEntries + selectionEntry entryLinks
    const entries: SelectionEntry[] = []
    for (const child of group.querySelectorAll(':scope > selectionEntries > selectionEntry')) {
      entries.push(parseSelectionEntry(child))
    }
    for (const link of group.querySelectorAll(':scope > entryLinks > entryLink[type="selectionEntry"]')) {
      entries.push(syntheticEntryFromLink(link))
    }

    // Recurse into nested sub-groups
    const subGroups = parseGroupsRecursive(group)

    if (entries.length > 0) {
      const minC = group.querySelector(':scope > constraints > constraint[type="min"]')
      const maxC = group.querySelector(':scope > constraints > constraint[type="max"]')
      result.push({
        id: attr(group, 'id'),
        name: attr(group, 'name'),
        defaultEntryId: attr(group, 'defaultSelectionEntryId'),
        minSelections: minC ? parseInt(attr(minC, 'value')) || 0 : 0,
        maxSelections: maxC ? parseInt(attr(maxC, 'value')) || -1 : -1,
        entries,
      })
    }

    // Always bubble up sub-groups (flattens pure container groups like "Wargear")
    result.push(...subGroups)
  }

  return result
}

// ── Public parsers ────────────────────────────────────────────────────────────

export function parseGameSystemXml(xml: string): ParsedGameSystem {
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  const root = doc.querySelector('gameSystem')
  if (!root) throw new Error('Invalid game system XML: missing <gameSystem> root.')

  const profileTypes: ProfileType[] = []
  for (const ptEl of doc.querySelectorAll('gameSystem > profileTypes > profileType')) {
    const characteristicTypes: { id: string; name: string }[] = []
    for (const ctEl of ptEl.querySelectorAll(':scope > characteristicTypes > characteristicType')) {
      characteristicTypes.push({ id: attr(ctEl, 'id'), name: attr(ctEl, 'name') })
    }
    profileTypes.push({ id: attr(ptEl, 'id'), name: attr(ptEl, 'name'), characteristicTypes })
  }

  const categoryEntries: CategoryEntry[] = []
  for (const catEl of doc.querySelectorAll('gameSystem > categoryEntries > categoryEntry')) {
    categoryEntries.push({ id: attr(catEl, 'id'), name: attr(catEl, 'name') })
  }

  const rules: RuleEntry[] = []
  for (const rEl of [
    ...doc.querySelectorAll('gameSystem > rules > rule'),
    ...doc.querySelectorAll('gameSystem > sharedRules > rule'),
  ]) {
    rules.push(parseRule(rEl))
  }

  return {
    id: attr(root, 'id'),
    name: attr(root, 'name'),
    revision: attr(root, 'revision'),
    battleScribeVersion: attr(root, 'battleScribeVersion'),
    rules,
    profileTypes,
    categoryEntries,
  }
}

export function parseCatalogueXml(xml: string): ParsedCatalogue {
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  const root = doc.querySelector('catalogue')
  if (!root) throw new Error('Invalid catalogue XML: missing <catalogue> root.')

  const meta: CatalogueMeta = {
    id: attr(root, 'id'),
    gameSystemId: attr(root, 'gameSystemId'),
    name: attr(root, 'name'),
    revision: attr(root, 'revision'),
    fetchedAt: Date.now(),
    isLibrary: attr(root, 'library') === 'true',
  }

  const rules: RuleEntry[] = []
  for (const rEl of [
    ...doc.querySelectorAll('catalogue > rules > rule'),
    ...doc.querySelectorAll('catalogue > sharedRules > rule'),
  ]) {
    rules.push(parseRule(rEl))
  }

  const entries: SelectionEntry[] = []

  // Top-level selection entries
  for (const el of doc.querySelectorAll('catalogue > selectionEntries > selectionEntry')) {
    entries.push(parseSelectionEntry(el))
  }
  // Shared selection entries (referenced by entryLinks elsewhere)
  for (const el of doc.querySelectorAll('catalogue > sharedSelectionEntries > selectionEntry')) {
    entries.push(parseSelectionEntry(el))
  }
  // Entries inside shared selection entry groups
  for (const group of doc.querySelectorAll(
    'catalogue > sharedSelectionEntryGroups > selectionEntryGroup',
  )) {
    for (const el of group.querySelectorAll(':scope > selectionEntries > selectionEntry')) {
      entries.push(parseSelectionEntry(el))
    }
  }

  // Deduplicate by id (entryLinks can duplicate shared entries)
  const seen = new Set<string>()
  const uniqueEntries = entries.filter((e) => {
    if (seen.has(e.id)) return false
    seen.add(e.id)
    return true
  })

  // Post-process: resolve entryLink[type="selectionEntryGroup"] references.
  // Some entries (e.g. AM's Detachment) reference a sharedSelectionEntryGroup via an
  // entryLink instead of having inline selectionEntryGroups. Resolve them here so that
  // buildDetachments can find the variant entries inside those groups.
  const sharedGroupEls = new Map<string, Element>()
  for (const grpEl of doc.querySelectorAll(
    'catalogue > sharedSelectionEntryGroups > selectionEntryGroup',
  )) {
    sharedGroupEls.set(attr(grpEl, 'id'), grpEl)
  }
  if (sharedGroupEls.size > 0) {
    for (const entryEl of doc.querySelectorAll(
      'catalogue > sharedSelectionEntries > selectionEntry, catalogue > selectionEntries > selectionEntry',
    )) {
      const links = entryEl.querySelectorAll(
        ':scope > entryLinks > entryLink[type="selectionEntryGroup"]',
      )
      if (links.length === 0) continue
      const parsedEntry = uniqueEntries.find((e) => e.id === attr(entryEl, 'id'))
      if (!parsedEntry) continue
      for (const link of links) {
        const groupEl = sharedGroupEls.get(attr(link, 'targetId'))
        if (!groupEl) continue
        const groupEntries: SelectionEntry[] = []
        for (const se of groupEl.querySelectorAll(':scope > selectionEntries > selectionEntry')) {
          groupEntries.push(parseSelectionEntry(se))
        }
        if (groupEntries.length > 0) {
          const minC = groupEl.querySelector(':scope > constraints > constraint[type="min"]')
          const maxC = groupEl.querySelector(':scope > constraints > constraint[type="max"]')
          parsedEntry.groups.push({
            id: attr(groupEl, 'id'),
            name: attr(groupEl, 'name'),
            defaultEntryId: attr(groupEl, 'defaultSelectionEntryId') || '',
            minSelections: minC ? parseInt(attr(minC, 'value')) || 0 : 0,
            maxSelections: maxC ? parseInt(attr(maxC, 'value')) || -1 : -1,
            entries: groupEntries,
          })
        }
      }
    }
  }

  // Collect linked catalogues with their importRootEntries flag
  const catalogueLinks: { id: string; importRootEntries: boolean }[] = []
  for (const cl of doc.querySelectorAll('catalogue > catalogueLinks > catalogueLink')) {
    const id = attr(cl, 'targetId')
    if (id) catalogueLinks.push({ id, importRootEntries: attr(cl, 'importRootEntries') === 'true' })
  }

  // Post-process: merge categoryLinks from root entryLinks into the target entries.
  // HH legion catalogues assign force-org categories (Warlord, Troops, etc.) to units
  // exclusively via root entryLinks – the shared entries themselves have no categoryLinks.
  const entryById = new Map<string, SelectionEntry>(uniqueEntries.map((e) => [e.id, e]))
  for (const link of doc.querySelectorAll('catalogue > entryLinks > entryLink')) {
    const targetId = attr(link, 'targetId')
    const entry = entryById.get(targetId)
    if (!entry) continue
    for (const cl of link.querySelectorAll(':scope > categoryLinks > categoryLink')) {
      const catId = attr(cl, 'targetId')
      if (!catId) continue
      if (!entry.categoryIds.includes(catId)) {
        entry.categoryIds.push(catId)
      }
      // Only set primaryCategoryId if the entry doesn't already have one
      if (attr(cl, 'primary') === 'true' && !entry.primaryCategoryId) {
        entry.primaryCategoryId = catId
      }
    }
    // Ensure primary is set if still empty but categories exist
    if (!entry.primaryCategoryId && entry.categoryIds.length > 0) {
      entry.primaryCategoryId = entry.categoryIds[0]
    }
  }

  // Collect targetIds from top-level entryLinks (which library entries belong here)
  const entryLinkTargetIds: string[] = []
  for (const el of doc.querySelectorAll('catalogue > entryLinks > entryLink')) {
    const id = attr(el, 'targetId')
    if (id) entryLinkTargetIds.push(id)
  }

  // Extract IDs of entries in "Rite of War" shared selection entry groups.
  // HH catalogues store available Rites of War as selectionEntry children of a
  // sharedSelectionEntryGroup named "Rite of War".
  const riteOfWarIds: string[] = []
  for (const grpEl of doc.querySelectorAll(
    'catalogue > sharedSelectionEntryGroups > selectionEntryGroup',
  )) {
    if (attr(grpEl, 'name').trim() === 'Rite of War') {
      for (const el of grpEl.querySelectorAll(':scope > selectionEntries > selectionEntry')) {
        const id = attr(el, 'id')
        if (id) riteOfWarIds.push(id)
      }
    }
  }

  // Catalogue-level category entries
  const categoryEntries: CategoryEntry[] = []
  for (const ce of doc.querySelectorAll('catalogue > categoryEntries > categoryEntry')) {
    categoryEntries.push({ id: attr(ce, 'id'), name: attr(ce, 'name') })
  }

  return {
    meta,
    rules,
    entries: uniqueEntries,
    categoryEntries,
    catalogueLinks,
    entryLinkTargetIds,
    riteOfWarIds,
  }
}
