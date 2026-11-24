export function normalizeName(value) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function factionSlugs(faction) {
  const slug = faction.link.split('/').filter(Boolean).at(-1)
  if (slug === 'space-marines') {
    return ['space-marines', 'black-templars', 'blood-angels', 'dark-angels', 'deathwatch', 'space-wolves']
  }
  return [{ 't-au-empire': 'tau-empire', 'adeptus-titanicus': 'titan-legions' }[slug] ?? slug]
}

export function matchUnitPoints(sheet, faction, entries, overrideId) {
  if (overrideId) {
    const match = entries.find((entry) => entry.id === overrideId && entry.kind === 'unit')
    if (!match) throw new Error(`Unknown points override ${overrideId} for ${sheet.id}`)
    return match
  }
  const slugs = factionSlugs(faction)
  const candidates = entries.filter((entry) =>
    entry.kind === 'unit' && slugs.includes(entry.factionSlug)
    && normalizeName(entry.name) === normalizeName(sheet.name)
    && entry.section !== 'EVERY MODEL HAS THE IMPERIUM KEYWORD')
  const signatures = new Set(candidates.map((entry) => JSON.stringify(entry.prices)))
  return signatures.size === 1 ? candidates[0] : null
}

export function matchDetachmentPoints(detachment, faction, entries) {
  // Boarding Actions is a different game format, even when a name is shared.
  if (detachment.type) return null
  const candidates = entries.filter((entry) =>
    entry.kind === 'detachment' && factionSlugs(faction).includes(entry.factionSlug)
    && normalizeName(entry.name) === normalizeName(detachment.name))
  const signatures = new Set(candidates.map((entry) =>
    JSON.stringify([entry.detachmentPoints, entry.uniqueTags, entry.prices])))
  return signatures.size === 1 ? candidates[0] : null
}
