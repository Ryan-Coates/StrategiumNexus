import { openDB, type DBSchema } from 'idb'
import type { LegacyWh40k11eRoster, Wh40k11eRoster } from '../types/wh40k11eRoster'
import { normalize11eRoster } from './wh40k11eRosterRules'

interface RosterSchema extends DBSchema {
  armies: { key: string; value: Wh40k11eRoster | LegacyWh40k11eRoster }
}

const database = openDB<RosterSchema>('strategium-nexus-11e-rosters', 1, {
  upgrade(db) {
    db.createObjectStore('armies', { keyPath: 'id' })
  },
})

export async function list11eRosters(): Promise<Wh40k11eRoster[]> {
  const rows = await (await database).getAll('armies')
  return rows.map(normalize11eRoster).sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function get11eRoster(id: string): Promise<Wh40k11eRoster | undefined> {
  const row = await (await database).get('armies', id)
  return row ? normalize11eRoster(row) : undefined
}

export async function save11eRoster(roster: Wh40k11eRoster): Promise<void> {
  await (await database).put('armies', roster)
}

export async function delete11eRoster(id: string): Promise<void> {
  await (await database).delete('armies', id)
}
