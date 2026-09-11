// Small "cool default avatar" shown when the signed-in user has no Google profile photo.
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function Avatar({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  if (photoUrl) {
    return <img src={photoUrl} alt="" className="w-6 h-6 rounded-full border border-gold-muted/40 object-cover" />
  }

  return (
    <div
      className="w-6 h-6 rounded-full border border-gold-muted/50 bg-gradient-to-br from-void-800 to-void-950 flex items-center justify-center shadow-[0_0_6px_rgba(197,160,80,0.35)]"
      aria-hidden="true"
    >
      <span className="font-heading text-[9px] tracking-wide text-gold">{initials(name)}</span>
    </div>
  )
}
