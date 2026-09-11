// Tracks whether the visitor has picked shared vs local-only mode on the EntryGate
// screen. Stored in localStorage (per-browser, never sent anywhere) — not a cookie.
const CHOICE_KEY = 'snx-entry-choice'

export function hasEntryChoice(): boolean {
  return localStorage.getItem(CHOICE_KEY) === '1'
}

export function setEntryChoice(): void {
  localStorage.setItem(CHOICE_KEY, '1')
}

export function clearEntryChoice(): void {
  localStorage.removeItem(CHOICE_KEY)
}
