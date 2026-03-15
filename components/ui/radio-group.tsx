'use client'

interface RadioOption {
  value: string
  label: string
  description?: string
}

interface RadioGroupProps {
  label?: string
  options: RadioOption[]
  value: string
  onValueChange: (value: string) => void
  required?: boolean
  error?: string
}

export function RadioGroup({
  label,
  options,
  value,
  onValueChange,
  required,
  error,
}: RadioGroupProps) {
  return (
    <fieldset className="w-full">
      {label && (
        <legend className="block text-sm font-medium text-stone-300 mb-3">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </legend>
      )}
      <div className="space-y-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              value === option.value
                ? 'border-brand-500 bg-brand-500/10'
                : 'border-stone-700 bg-stone-800/50 hover:border-stone-600'
            }`}
          >
            <input
              type="radio"
              name={label || 'radio-group'}
              value={option.value}
              checked={value === option.value}
              onChange={() => onValueChange(option.value)}
              className="mt-0.5 h-4 w-4 border-stone-600 text-brand-600 focus:ring-brand-500 bg-stone-800"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-stone-100">{option.label}</div>
              {option.description && (
                <div className="text-xs text-stone-400 mt-0.5">{option.description}</div>
              )}
            </div>
          </label>
        ))}
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  )
}
