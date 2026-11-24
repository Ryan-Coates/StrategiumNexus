import test from 'node:test'
import assert from 'node:assert/strict'
import { parseMfmPage } from '../mfm-parser.mjs'
import { matchDetachmentPoints, matchUnitPoints, normalizeName } from '../mfm-matching.mjs'

function fixture(label = '2 models▲ (+60)') {
  return `<h2>v1.6</h2><section><h3>UNITS</h3>
    <div class="print:break-inside-avoid-page">
      <template id="P:title"></template>
      <div><div>YOUR 1ST TO 2ND UNITS COST</div><ul><li><span>${label}</span><template id="P:cost"></template></li></ul></div>
      <div><div>YOUR 3RD + UNIT COSTS</div><ul><li>2 models<span>210 pts</span></li></ul></div>
      <div><div>WARGEAR OPTIONS</div><ul><li>per Shield<span>5 pts</span></li></ul></div>
    </div></section>
    <div id="S:title"><div class="text-xl">GUARD</div></div><script>$RS("S:title","P:title")</script>
    <div id="S:cost"><span>180 pts</span></div><script>$RS("S:cost","P:cost")</script>`
}

test('resolves streamed names and prices without executing scripts', () => {
  const { entries } = parseMfmPage(fixture(), 'custodes', 'https://example.test')
  assert.equal(entries.length, 1)
  assert.equal(entries[0].name, 'GUARD')
  assert.deepEqual(entries[0].prices.map(({ points, models, minCopies, maxCopies }) =>
    ({ points, models, minCopies, maxCopies })), [
    { points: 180, models: 2, minCopies: 1, maxCopies: 2 },
    { points: 210, models: 2, minCopies: 3, maxCopies: null },
    { points: 5, models: null, minCopies: 1, maxCopies: null },
  ])
  assert.equal(entries[0].prices[0].label, '2 models')
  assert.equal(entries[0].prices[0].rawLabel, '2 models▲ (+60)')
})

test('preserves mixed-model squad pricing and ignores footnote numbers', () => {
  assert.equal(parseMfmPage(fixture('1 Sword Brother, 4 Neophytes, 5 Initiates'), 'x', 'x')
    .entries[0].prices[0].models, 10)
  assert.equal(parseMfmPage(fixture('1 model2,'), 'x', 'x').entries[0].prices[0].models, 1)
})

test('first-copy pricing ends before second and subsequent copies', () => {
  const html = fixture().replace('YOUR 1ST TO 2ND UNITS COST', 'YOUR 1ST UNIT COSTS')
  const price = parseMfmPage(html, 'x', 'x').entries[0].prices[0]
  assert.equal(price.minCopies, 1)
  assert.equal(price.maxCopies, 1)
})

test('flags Legends from their section', () => {
  assert.equal(parseMfmPage(fixture().replace('>UNITS<', '>LEGENDS<'), 'x', 'x')
    .entries[0].isLegends, true)
})

test('imports detachment DP and Unique tags, without mistaking enhancements for unit prices', () => {
  const html = fixture() + `<section><h3>DETACHMENTS</h3>
    <div class="print:break-inside-avoid-page">
      <div><div class="text-xl">SHIELD HOST</div><div>3DP</div></div>
      <div><span>UNIQUE: SHIELD HOST</span></div>
      <div><span>UNIQUE: OTHER TAG</span></div>
      <div>ENHANCEMENTS<ul><li>Relic<span>25 pts</span></li></ul></div>
    </div></section>`
  const entry = parseMfmPage(html, 'custodes', 'https://example.test').entries[1]
  assert.equal(entry.kind, 'detachment')
  assert.equal(entry.detachmentPoints, 3)
  assert.deepEqual(entry.uniqueTags, ['SHIELD HOST', 'OTHER TAG'])
  assert.equal(entry.prices[0].label, 'Relic')
  assert.equal(entry.prices[0].models, null)
})

test('fails explicitly when the publisher markup no longer contains prices', () => {
  assert.throws(() => parseMfmPage('<h1>Changed site</h1>', 'x', 'x'), /No unit prices/)
})

test('matches normalized exact names, not renamed or conflicting units', () => {
  const faction = { link: 'https://example.test/space-marines' }
  const sheet = { id: '1', name: 'Guard' }
  const entry = { id: 'a', name: 'GUARD', kind: 'unit', factionSlug: 'space-marines', section: 'UNITS', prices: [{ points: 10 }] }
  assert.equal(matchUnitPoints(sheet, faction, [entry]).id, 'a')
  assert.equal(matchUnitPoints({ ...sheet, name: 'Guard Sodality' }, faction, [entry]), null)
  assert.equal(matchUnitPoints(sheet, faction, [entry, { ...entry, id: 'b', factionSlug: 'blood-angels', prices: [{ points: 20 }] }]), null)
  assert.throws(() => matchUnitPoints(sheet, faction, [entry], 'missing'), /Unknown points override/)
  assert.equal(normalizeName('T’au—Empire'), 'tauempire')
})

test('detachment matching rejects other game formats, similar names and conflicting chapter costs', () => {
  const faction = { link: 'https://example.test/space-marines' }
  const entry = { id: 'mfm', name: 'DAEMONIC INCURSION', factionSlug: 'space-marines',
    kind: 'detachment', detachmentPoints: 3, uniqueTags: [], prices: [] }
  const detachment = { name: 'Daemonic Incursion', type: '' }
  assert.equal(matchDetachmentPoints(detachment, faction, [entry]), entry)
  assert.equal(matchDetachmentPoints({ ...detachment, type: 'Boarding Actions' }, faction, [entry]), null)
  assert.equal(matchDetachmentPoints({ ...detachment, name: 'Daemonic Legion' }, faction, [entry]), null)
  assert.equal(matchDetachmentPoints(detachment, faction, [entry,
    { ...entry, id: 'chapter', factionSlug: 'blood-angels', detachmentPoints: 1 }]), null)
})
