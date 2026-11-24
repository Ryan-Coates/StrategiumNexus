import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Wh40k11eRuleset } from '../types/wh40k11e'

interface RulesCache extends DBSchema {
  snapshots: {
    key: string
    value: { revision: string; rules: Wh40k11eRuleset }
  }
}

let pending: Promise<Wh40k11eRuleset> | undefined

function validRules(value: unknown): value is Wh40k11eRuleset {
  return typeof value === 'object' && value !== null && 'edition' in value && value.edition === 11
    && ['datasheets', 'factions', 'detachments', 'enhancements', 'abilities', 'detachmentAbilities', 'stratagems', 'sources']
      .every((key) => key in value && Array.isArray(Reflect.get(value, key)))
}

async function loadRules(): Promise<Wh40k11eRuleset> {
  const url = new URL(`${import.meta.env.BASE_URL}data/wh40k11e.json`, document.baseURI).href
  let database: IDBPDatabase<RulesCache> | undefined
  let cached: RulesCache['snapshots']['value'] | undefined
  try {
    try {
      database = await openDB<RulesCache>('strategium-nexus-11e-rules', 1, {
        upgrade(db) { db.createObjectStore('snapshots') },
      })
      cached = await database.get('snapshots', url)
      if (cached && !validRules(cached.rules)) {
        console.warn('Discarding invalid cached 11th edition rules.')
        cached = undefined
      }
    } catch (error) {
      console.warn('11th edition rules cache is unavailable; using the network.', error)
    }

    try {
      const versionResponse = await fetch(new URL('wh40k11e-version.json', url), {
        cache: 'no-cache', signal: AbortSignal.timeout(5000),
      })
      if (!versionResponse.ok) throw new Error(`Could not check the rules version (${versionResponse.status}).`)
      const version: unknown = await versionResponse.json()
      if (typeof version !== 'object' || version === null || !('revision' in version)
        || typeof version.revision !== 'string' || !/^[a-f0-9]{64}$/.test(version.revision)) {
        throw new Error('Invalid 11th edition rules version manifest.')
      }
      if (cached?.revision === version.revision) return cached.rules

      const response = await fetch(`${url}?v=${version.revision}`, {
        cache: 'no-cache', signal: AbortSignal.timeout(120000),
      })
      if (!response.ok) throw new Error(`Could not load 11th edition data (${response.status}).`)
      const text = await response.text()
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
      const revision = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
      if (revision !== version.revision) throw new Error('Rules download does not match the published version. Please reload to retry.')
      const rules: unknown = JSON.parse(text)
      if (!validRules(rules)) throw new Error('Invalid 11th edition rules data.')
      if (database) {
        try {
          await database.put('snapshots', { revision, rules }, url)
        } catch (error) {
          console.warn('Could not cache 11th edition rules; this load will not persist.', error)
        }
      }
      return rules
    } catch (error) {
      if (!cached) throw error
      console.warn('Could not refresh 11th edition rules; using the previously cached snapshot.', error)
      return cached.rules
    }
  } finally {
    database?.close()
  }
}

export function loadWh40k11eRules(): Promise<Wh40k11eRuleset> {
  if (!pending) {
    pending = loadRules()
      .catch((error: unknown) => {
        pending = undefined
        throw error
      })
  }
  return pending
}

export function rulesText(value: string): string {
  const parsed = new DOMParser().parseFromString(
    value.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(?:p|li|div)>/gi, '\n'), 'text/html',
  )
  return parsed.body.textContent?.replace(/[ \t]+\n/g, '\n').trim() ?? ''
}
