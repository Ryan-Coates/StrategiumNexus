interface Step {
  label: string
  icon: string
}

const STEPS: Step[] = [
  { label: 'Army Setup', icon: '⚑' },
  { label: 'Detachment', icon: '⚔' },
  { label: 'Build', icon: '+' },
  { label: 'Configure', icon: '✎' },
  { label: 'Review', icon: '✓' },
  { label: 'Export', icon: '↓' },
]

interface Props {
  current: number
  furthest: number
  onChange: (step: number) => void
}

export default function StepBar({ current, furthest, onChange }: Props) {
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex min-w-max border-b border-gold-muted/20">
        {STEPS.map((step, i) => {
          const accessible = i <= furthest
          const isActive = i === current
          const isDone = i < current

          return (
            <button
              key={i}
              onClick={() => accessible && onChange(i)}
              disabled={!accessible}
              className={[
                'flex flex-col items-center gap-1 px-4 py-3 text-xs font-heading tracking-wide uppercase transition-colors relative',
                isActive
                  ? 'text-gold border-b-2 border-gold -mb-px'
                  : isDone && accessible
                  ? 'text-gold-muted hover:text-gold cursor-pointer'
                  : accessible
                  ? 'text-parchment-muted hover:text-gold cursor-pointer'
                  : 'text-parchment-faint/40 cursor-not-allowed',
              ].join(' ')}
            >
              <span className={`text-base ${isDone ? 'text-gold-muted' : ''}`}>
                {isDone ? '✓' : step.icon}
              </span>
              <span className="hidden sm:block">{step.label}</span>
              <span className="block sm:hidden">{i + 1}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export { STEPS }
