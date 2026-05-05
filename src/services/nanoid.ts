/** Tiny UUID-style id generator — no dependency needed */
export function nanoid(): string {
  return crypto.randomUUID()
}
