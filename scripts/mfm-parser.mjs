import { parse } from 'parse5'
import { normalizeName } from './mfm-matching.mjs'

const attr = (node, name) => node.attrs?.find((item) => item.name === name)?.value ?? ''
const children = (node) => node.childNodes ?? []
const text = (node) => node.nodeName === '#text' ? node.value : children(node).map(text).join('')

function findAll(node, predicate) {
  return [
    ...(predicate(node) ? [node] : []),
    ...children(node).flatMap((child) => findAll(child, predicate)),
  ]
}

export function parseMfmPage(html, factionSlug, sourceUrl) {
  const document = parse(html)
  const nodes = findAll(document, () => true)
  const byId = new Map(nodes.map((node) => [attr(node, 'id'), node]))

  // Next.js streams titles and prices into template slots. Resolve only its
  // declarative slot replacements; never execute downloaded JavaScript.
  for (const script of nodes.filter((node) => node.tagName === 'script')) {
    for (const match of text(script).matchAll(/\$RS\("([^"]+)","([^"]+)"\)/g)) {
      const source = byId.get(match[1])
      const target = byId.get(match[2])
      if (!source || !target?.parentNode) throw new Error(`Unresolved MFM slot at ${sourceUrl}`)
      const parent = target.parentNode
      const inserted = [...children(source)]
      const index = children(parent).indexOf(target)
      parent.childNodes.splice(index, 1, ...inserted)
      for (const child of inserted) child.parentNode = parent
      source.childNodes = []
    }
  }

  const version = text(nodes.find((node) => node.tagName === 'h2') ?? {})
  const entries = []
  for (const card of findAll(document, (node) =>
    attr(node, 'class').split(' ').includes('print:break-inside-avoid-page'))) {
    const header = children(card).find((node) =>
      attr(node, 'class').split(' ').includes('text-xl')
      || children(node).some((child) => attr(child, 'class').split(' ').includes('text-xl')),
    )
    if (!header) continue
    const title = children(header).find((node) =>
      attr(node, 'class').split(' ').includes('text-xl'))
    const name = text(title ?? header).trim()
    const detachmentPoints = text(header).match(/(\d+)DP\b/)
    const kind = detachmentPoints ? 'detachment' : 'unit'
    const prices = []

    for (const list of findAll(card, (node) => node.tagName === 'ul')) {
      const context = children(list.parentNode ?? {}).filter((node) => node !== list)
        .map(text).join(' ').trim()
      for (const row of children(list).filter((node) => node.tagName === 'li')) {
        const rowText = text(row).trim()
        const pointMatch = rowText.match(/(\d+)\s*pts\s*$/i)
        if (!pointMatch) {
          if (/\bpts\b/i.test(rowText)) {
            throw new Error(`Unparsed MFM price "${rowText}" at ${sourceUrl}`)
          }
          continue
        }
        const rawLabel = rowText.slice(0, pointMatch.index).trim()
        const label = rawLabel.replace(/[▲▼].*$/, '').trim()
          .replace(/^(\d+\s+models?)\d+[, ]*$/i, '$1')
        const modelParts = /^\d+\s/.test(label) ? [...label.matchAll(/(\d+)\s+[a-z]/gi)] : []
        const copiesMatch = context.match(/YOUR\s+(\d+)(?:ST|ND|RD|TH)\s+TO\s+(\d+)(?:ST|ND|RD|TH)/i)
        const extraCopies = context.match(/YOUR\s+(\d+)(?:ST|ND|RD|TH)\s*\+/i)
        const singleCopy = context.match(/YOUR\s+(\d+)(?:ST|ND|RD|TH)\s+UNIT\s+COSTS/i)
        prices.push({
          label,
          rawLabel,
          points: Number(pointMatch[1]),
          models: modelParts.length ? modelParts.reduce((sum, part) => sum + Number(part[1]), 0) : null,
          minCopies: copiesMatch ? Number(copiesMatch[1]) : extraCopies ? Number(extraCopies[1]) : singleCopy ? Number(singleCopy[1]) : 1,
          maxCopies: copiesMatch ? Number(copiesMatch[2]) : singleCopy ? Number(singleCopy[1]) : null,
          context,
        })
      }
    }

    const ancestors = []
    for (let parent = card.parentNode; parent; parent = parent.parentNode) ancestors.push(parent)
    const section = ancestors.map((parent) =>
      children(parent).find((node) => node.tagName === 'h3'))
      .filter(Boolean).map(text)[0] ?? ''
    const isLegends = /^LEGENDS$/i.test(section)
    if (kind === 'unit' && prices.length === 0) {
      throw new Error(`Unit ${name} has no parsed prices at ${sourceUrl}`)
    }
    entries.push({
      id: `${factionSlug}:${kind}:${normalizeName(name)}:${normalizeName(section)}`,
      factionSlug,
      name,
      kind,
      section,
      isLegends,
      detachmentPoints: detachmentPoints ? Number(detachmentPoints[1]) : null,
      uniqueTags: kind === 'detachment'
        ? [...new Set(findAll(card, (node) => !children(node).some((child) => child.tagName))
          .filter((node) => node.tagName)
          .map((node) => text(node).trim().match(/^UNIQUE:\s*(.+)$/i)?.[1])
          .filter(Boolean))]
        : [],
      prices,
      sourceUrl,
      version,
    })
  }
  if (!entries.some((entry) => entry.kind === 'unit' && entry.prices.length > 0)) {
    throw new Error(`No unit prices parsed at ${sourceUrl}; site markup may have changed`)
  }
  const duplicateIds = entries.filter((entry, index) =>
    entries.findIndex((other) => other.id === entry.id) !== index)
  if (duplicateIds.length) throw new Error(`Duplicate MFM records at ${sourceUrl}: ${duplicateIds.map((e) => e.name)}`)
  return { version, entries }
}
