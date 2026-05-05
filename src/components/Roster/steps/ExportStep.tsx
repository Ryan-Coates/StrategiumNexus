import { useGameStore } from '../../../store/gameStore'
import { useRosterStore } from '../../../store/rosterStore'
import { listRosters } from '../../../services/db'
import type { SelectionEntry } from '../../../types'

function entryPts(entry: SelectionEntry): number {
  return entry.costs.find((c) => c.name === 'pts')?.value ?? 0
}

function bracketPts(entry: SelectionEntry, modelCount: number): number {
  const base = entryPts(entry)
  let pts = base
  for (const bracket of entry.costBrackets) {
    if (modelCount >= bracket.minModels) pts = bracket.pts
  }
  return pts
}

function resolveEntry(childEntryId: string, parent: SelectionEntry): SelectionEntry {
  if (!childEntryId) return parent
  for (const c of parent.children) if (c.id === childEntryId) return c
  for (const g of parent.groups) {
    const found = g.entries.find((e) => e.id === childEntryId)
    if (found) return found
  }
  return parent
}

function rosterToText(
  roster: ReturnType<typeof useRosterStore.getState>['activeRoster'],
  entryMap: Map<string, SelectionEntry>,
): string {
  if (!roster) return ''
  const lines: string[] = []
  lines.push(`++ ${roster.name || 'Unnamed Army'} ++`)
  lines.push(`Faction: ${roster.catalogueName}`)
  if (roster.detachment) lines.push(`Detachment: ${roster.detachment}`)
  lines.push(`Points Limit: ${roster.pointsLimit}`)
  lines.push('')

  let total = 0
  for (const unit of roster.units) {
    const entry = entryMap.get(unit.catalogueEntryId)
    const models = unit.models ?? []
    const modelCount = models.length || 1
    const basePts = entry ? bracketPts(entry, modelCount) : 0
    const modelUpgradePts = models.reduce((sum, model) => {
      const me = entry ? resolveEntry(model.childEntryId, entry) : null
      if (!me) return sum
      return sum + model.selections.reduce((s, sel) => {
        const opt =
          me.groups.flatMap((g) => g.entries).find((e) => e.id === sel.entryId) ??
          me.children.find((e) => e.id === sel.entryId)
        return s + (opt ? entryPts(opt) * sel.count : 0)
      }, 0)
    }, 0)
    const pts = basePts + modelUpgradePts
    total += pts

    const displayName = unit.customName || unit.catalogueName
    lines.push(`${displayName} [${pts > 0 ? `${pts}pts` : '—'}]`)
    if (unit.customName) lines.push(`  (${unit.catalogueName})`)

    // Group models by type+gear for compact display
    if (entry && models.length > 0) {
      const groups = new Map<string, { name: string; count: number; gear: string[] }>()
      for (const model of models) {
        const me = resolveEntry(model.childEntryId, entry)
        const selNames = model.selections
          .map((sel) => {
            return (
              me.groups.flatMap((g) => g.entries).find((e) => e.id === sel.entryId)?.name ??
              me.children.find((e) => e.id === sel.entryId)?.name
            )
          })
          .filter(Boolean) as string[]
        const gear = [...me.linkedEquipment.filter((eq) => !selNames.includes(eq)), ...selNames]
        const key = `${model.childEntryId}|${selNames.sort().join('|')}`
        if (!groups.has(key)) {
          groups.set(key, { name: me !== entry ? me.name : entry.name, count: 0, gear })
        }
        groups.get(key)!.count++
      }
      for (const { name, count, gear } of groups.values()) {
        const prefix = `${count > 1 ? `${count}× ` : ''}${name}`
        lines.push(`  • ${gear.length > 0 ? `${prefix} — ${gear.join(', ')}` : prefix}`)
      }
    }
    if (unit.notes) lines.push(`  // ${unit.notes}`)
  }

  lines.push('')
  lines.push(`Total: ${total} / ${roster.pointsLimit} pts`)
  lines.push('++ End ++')
  return lines.join('\n')
}

export default function ExportStep() {
  const { activeRoster } = useRosterStore()
  const { parsedCatalogues } = useGameStore()

  if (!activeRoster) return null

  const catalogue = activeRoster.catalogueId
    ? parsedCatalogues[activeRoster.catalogueId]
    : null
  const entryMap = new Map(catalogue?.entries.map((e) => [e.id, e]) ?? [])

  async function copyText() {
    const text = rosterToText(activeRoster, entryMap)
    await navigator.clipboard.writeText(text)
    alert('Roster copied to clipboard!')
  }

  function downloadRoster() {
    if (!activeRoster) return
    const totalPts = activeRoster.units.reduce((sum, u) => {
      const entry = entryMap.get(u.catalogueEntryId)
      if (!entry) return sum
      const models = u.models ?? []
      return sum + bracketPts(entry, models.length || 1)
    }, 0)
    const data = JSON.stringify(
      { version: 2, type: 'roster', summary: { totalPts, pointsLimit: activeRoster.pointsLimit }, roster: activeRoster },
      null,
      2,
    )
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(activeRoster.name || 'roster').replace(/\s+/g, '-').toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function downloadBackup() {
    const all = await listRosters()
    const data = JSON.stringify({ version: 2, type: 'backup', rosters: all }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `strategium-nexus-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function print() {
    window.print()
  }

  const textPreview = rosterToText(activeRoster, entryMap)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-xl text-gold tracking-wider mb-1">Export</h2>
        <p className="font-body text-parchment-muted text-sm">
          Share, save, or print your roster.
        </p>
      </div>

      {/* Export buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={copyText}
          className="card flex flex-col items-start gap-2 hover:border-gold transition-colors cursor-pointer text-left"
        >
          <span className="text-2xl">📋</span>
          <span className="font-heading text-sm tracking-wide text-gold">Copy as Text</span>
          <span className="font-body text-xs text-parchment-muted">
            Plain-text army list to clipboard.
          </span>
        </button>

        <button
          onClick={downloadRoster}
          className="card flex flex-col items-start gap-2 hover:border-gold transition-colors cursor-pointer text-left"
        >
          <span className="text-2xl">⬇</span>
          <span className="font-heading text-sm tracking-wide text-gold">Download Roster</span>
          <span className="font-body text-xs text-parchment-muted">
            Save as a .json file you can re-import later.
          </span>
        </button>

        <button
          onClick={print}
          className="card flex flex-col items-start gap-2 hover:border-gold transition-colors cursor-pointer text-left"
        >
          <span className="text-2xl">🖨</span>
          <span className="font-heading text-sm tracking-wide text-gold">Print / Save as PDF</span>
          <span className="font-body text-xs text-parchment-muted">
            Opens browser print dialog.
          </span>
        </button>

        <button
          onClick={downloadBackup}
          className="card flex flex-col items-start gap-2 hover:border-gold transition-colors cursor-pointer text-left"
        >
          <span className="text-2xl">💾</span>
          <span className="font-heading text-sm tracking-wide text-gold">Full Backup</span>
          <span className="font-body text-xs text-parchment-muted">
            Download ALL your rosters as one backup file.
          </span>
        </button>
      </div>

      {/* Text preview */}
      <div className="flex flex-col gap-2">
        <span className="font-heading text-xs tracking-widest uppercase text-gold-muted">
          Text Preview
        </span>
        <pre className="bg-void-900 border border-gold-muted/20 p-4 font-mono text-[11px] text-parchment-muted overflow-x-auto whitespace-pre leading-relaxed">
          {textPreview}
        </pre>
      </div>
    </div>
  )
}
