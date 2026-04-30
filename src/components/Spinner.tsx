export default function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div
        className="w-8 h-8 rounded-full border-2 border-gold-muted/30 border-t-gold animate-spin"
        role="status"
        aria-label={label ?? 'Loading'}
      />
      {label && (
        <p className="font-heading text-xs tracking-widest uppercase text-parchment-faint animate-pulse">
          {label}
        </p>
      )}
    </div>
  )
}
