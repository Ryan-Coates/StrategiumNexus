// Hardcoded admin allowlist-managers — must be kept in sync with firestore.rules'
// isAdmin() function (Firestore rules can't import app code).
const ADMIN_EMAILS = ['ryancoates366@gmail.com']

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase())
}
