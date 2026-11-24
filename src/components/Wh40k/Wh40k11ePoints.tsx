import type { Wh40k11eDatasheet } from '../../types/wh40k11e'

export default function Wh40k11ePoints({ sheet }: { sheet: Wh40k11eDatasheet }) {
  if (!sheet.points) {
    return <p className="text-gold-muted text-sm">No exact official MFM points match. Points are unknown, not zero.</p>
  }
  return (
    <div className="space-y-2 text-sm">
      <a href={sheet.points.sourceUrl} target="_blank" rel="noreferrer" className="text-gold underline">
        Official MFM · {sheet.points.version}
      </a>
      {sheet.points.prices.map((price, index) => (
        <p key={index} className="text-parchment-muted">
          {price.label} — {price.points} pts
          {price.context ? ` · ${price.context}` : ''}
        </p>
      ))}
    </div>
  )
}
