import type {
  ParsedGameSystem,
  ParsedCatalogue,
  SelectionEntry,
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

  const costs: { name: string; value: number }[] = []
  for (const c of el.querySelectorAll(':scope > costs > cost')) {
    const value = parseFloat(attr(c, 'value'))
    if (!isNaN(value) && value > 0) {
      costs.push({ name: attr(c, 'name').trim(), value })
    }
  }

  const children: SelectionEntry[] = []
  // Direct child entries
  for (const child of el.querySelectorAll(':scope > selectionEntries > selectionEntry')) {
    children.push(parseSelectionEntry(child))
  }
  // Entries inside selection entry groups
  for (const group of el.querySelectorAll(':scope > selectionEntryGroups > selectionEntryGroup')) {
    for (const child of group.querySelectorAll(':scope > selectionEntries > selectionEntry')) {
      children.push(parseSelectionEntry(child))
    }
  }

  return {
    id: attr(el, 'id'),
    name: attr(el, 'name'),
    type: attr(el, 'type'),
    profiles,
    rules,
    costs,
    children,
  }
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

  return { meta, rules, entries: uniqueEntries }
}
