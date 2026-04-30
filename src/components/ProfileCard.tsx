import type { Profile } from '../types'

interface ProfileCardProps {
  profile: Profile
}

export default function ProfileCard({ profile }: ProfileCardProps) {
  const keys = Object.keys(profile.characteristics)
  if (keys.length === 0) return null

  return (
    <div className="mb-4">
      <div className="flex items-baseline gap-3 mb-1.5">
        <span className="font-heading text-sm text-gold tracking-wide">{profile.name}</span>
        {profile.typeName && (
          <span className="badge badge-gold text-[10px]">{profile.typeName}</span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border border-gold-muted/25 bg-void-900">
          <thead>
            <tr className="bg-void-800 border-b border-gold-muted/25">
              {keys.map((k) => (
                <th
                  key={k}
                  className="px-2.5 py-1.5 font-heading tracking-wider text-gold text-center whitespace-nowrap border-r border-gold-muted/15 last:border-r-0"
                >
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {keys.map((k) => (
                <td
                  key={k}
                  className="px-2.5 py-1.5 text-center text-parchment font-body whitespace-nowrap border-r border-gold-muted/10 last:border-r-0"
                >
                  {profile.characteristics[k] || '—'}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
