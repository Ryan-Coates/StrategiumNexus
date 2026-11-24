import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync(new URL('../../src/services/wh40k11eRules.ts', import.meta.url), 'utf8')
  .replace(/^import .* from 'idb'$/m, 'const openDB = globalThis.__rulesCacheTest.openDB')
  .replaceAll('import.meta.env.BASE_URL', "'./'")
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
})
const rules = { edition: 11, datasheets: [], factions: [], detachments: [],
  enhancements: [], abilities: [], detachmentAbilities: [], stratagems: [], sources: [] }
const key = 'https://example.test/StrategiumNexus/data/wh40k11e.json'
let nextModule = 0

async function harness(t) {
  const original = { fetch: globalThis.fetch, document: globalThis.document,
    warn: console.warn, test: globalThis.__rulesCacheTest }
  const state = { stored: new Map(), requests: [], warnings: [], openError: null, writeError: null,
    offline: false, body: JSON.stringify(rules), version: '', bodyOverride: null }
  const revision = () => createHash('sha256').update(state.body).digest('hex')
  globalThis.document = { baseURI: 'https://example.test/StrategiumNexus/' }
  console.warn = (...args) => state.warnings.push(args)
  globalThis.__rulesCacheTest = {
    async openDB() {
      if (state.openError) throw state.openError
      return {
        async get(_store, url) { return state.stored.get(url) },
        async put(_store, value, url) {
          if (state.writeError) throw state.writeError
          state.stored.set(url, value)
        },
        close() {},
      }
    },
  }
  globalThis.fetch = async (input, options) => {
    const url = String(input)
    state.requests.push({ url, options })
    if (state.offline) throw new TypeError('Network unavailable')
    return url.endsWith('-version.json')
      ? new Response(JSON.stringify({ revision: state.version || revision() }))
      : new Response(state.bodyOverride ?? state.body)
  }
  const freshLoader = async () => {
    const code = `${outputText}\n// instance ${nextModule++}`
    return (await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)).loadWh40k11eRules
  }
  t.after(() => {
    globalThis.fetch = original.fetch
    globalThis.document = original.document
    globalThis.__rulesCacheTest = original.test
    console.warn = original.warn
  })
  return { state, freshLoader, revision }
}

test('first load persists rules; subsequent page loads fetch only the tiny version manifest', async (t) => {
  const { state, freshLoader, revision } = await harness(t)
  const load = await freshLoader()
  const first = load()
  assert.equal(load(), first)
  assert.deepEqual(await first, rules)
  assert.equal(state.requests.length, 2)
  assert.equal(state.stored.get(key).revision, revision())
  state.requests.length = 0
  assert.deepEqual(await (await freshLoader())(), rules)
  assert.equal(state.requests.length, 1)
  assert.equal(state.requests[0].url, key.replace('.json', '-version.json'))
  assert.equal(state.requests[0].options.cache, 'no-cache')
})

test('a new content revision refreshes the cache, including same-date rules changes', async (t) => {
  const { state, freshLoader } = await harness(t)
  await (await freshLoader())()
  const old = state.stored.get(key).revision
  state.body = JSON.stringify({ ...rules, datasheets: [{ id: 'new' }] })
  state.requests.length = 0
  const loaded = await (await freshLoader())()
  assert.equal(loaded.datasheets[0].id, 'new')
  assert.notEqual(state.stored.get(key).revision, old)
  assert.equal(state.requests.length, 2)
})

test('offline reload uses persistent cached rules and reports why refresh failed', async (t) => {
  const { state, freshLoader } = await harness(t)
  await (await freshLoader())()
  state.offline = true
  assert.deepEqual(await (await freshLoader())(), rules)
  assert.ok(state.warnings.some(([message]) => message.includes('previously cached snapshot')))
})

test('failed initial load can retry instead of retaining a rejected in-memory promise', async (t) => {
  const { state, freshLoader } = await harness(t)
  const load = await freshLoader()
  state.offline = true
  await assert.rejects(load(), /Network unavailable/)
  state.offline = false
  assert.deepEqual(await load(), rules)
})

test('mismatched or malformed downloads never overwrite a good cached snapshot', async (t) => {
  const { state, freshLoader } = await harness(t)
  await (await freshLoader())()
  const cached = state.stored.get(key)
  state.version = 'a'.repeat(64)
  assert.deepEqual(await (await freshLoader())(), rules)
  assert.equal(state.stored.get(key), cached)
  state.stored.clear()
  await assert.rejects((await freshLoader())(), /does not match/)
  state.version = ''
  state.body = JSON.stringify({ edition: 10 })
  await assert.rejects((await freshLoader())(), /Invalid 11th edition rules data/)
  assert.equal(state.stored.size, 0)
})

test('blocked storage or quota failures explicitly warn but allow a valid network load', async (t) => {
  const { state, freshLoader } = await harness(t)
  state.openError = new Error('Storage blocked')
  assert.deepEqual(await (await freshLoader())(), rules)
  assert.ok(state.warnings.some(([message]) => message.includes('cache is unavailable')))
  state.openError = null
  state.writeError = new Error('Quota exceeded')
  assert.deepEqual(await (await freshLoader())(), rules)
  assert.ok(state.warnings.some(([message]) => message.includes('will not persist')))
})

test('invalid cached data is discarded instead of returned offline', async (t) => {
  const { state, freshLoader } = await harness(t)
  state.stored.set(key, { revision: 'a'.repeat(64), rules: { edition: 10 } })
  state.offline = true
  await assert.rejects((await freshLoader())(), /Network unavailable/)
  assert.ok(state.warnings.some(([message]) => message.includes('Discarding invalid cached')))
})
