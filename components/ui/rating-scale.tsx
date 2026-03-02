'use client'

interface RatingScaleProps {
  label?: string
  value: number | null
  onValueChange: (value: number) => void
  min?: number
  max?: number
  minLabel?: string
  maxLabel?: string
  required?: boolean
}

export function RatingScale({
  label,
  value,
  onValueChange,
  min = 0,
  max = 10,
  minLabel,
  maxLabel,
  required,
}: RatingScaleProps) {
  const count = max - min + 1

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-stone-300 mb-3">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: count }).map((_, i) => {
          const val = i + min
          const isSelected = value === val

          // NPS-style coloring for 0-10 scales
          let selectedBg = 'border-brand-500 bg-brand-600 text-white'
          if (max === 10 && min === 0) {
            if (val <= 6) selectedBg = 'border-red-500 bg-red-600 text-white'
            else if (val <= 8) selectedBg = 'border-yellow-500 bg-yellow-600 text-white'
            else selectedBg = 'border-green-500 bg-green-600 text-white'
          }

          return (
            <button
              key={val}
              type="button"
              onClick={() => onValueChange(val)}
              className={`min-w-[2.5rem] h-10 rounded-lg border-2 text-sm font-medium transition-all ${
                isSelected
                  ? selectedBg
                  : 'border-stone-600 bg-stone-800 text-stone-300 hover:border-stone-500'
              }`}
            >
              {val}
            </button>
          )
        })}
      </div>
      {(minLabel || maxLabel) && (
        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-stone-500">{minLabel}</span>
          <span className="text-xs text-stone-500">{maxLabel}</span>
        </div>
      )}
    </div>
  )
}
