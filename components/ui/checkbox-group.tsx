'use client'

interface CheckboxGroupProps {
  label?: string
  options: string[]
  value: string[]
  onValueChange: (value: string[]) => void
  required?: boolean
  helperText?: string
  maxSelections?: number
  error?: string
}

export function CheckboxGroup({
  label,
  options,
  value,
  onValueChange,
  required,
  helperText,
  maxSelections,
  error,
}: CheckboxGroupProps) {
  const toggle = (option: string) => {
    if (value.includes(option)) {
      onValueChange(value.filter((v) => v !== option))
    } else {
      if (maxSelections && value.length >= maxSelections) {
        return
      }
      onValueChange([...value, option])
    }
  }

  const atSelectionLimit = !!maxSelections && value.length >= maxSelections

  return (
    <fieldset className="w-full">
      {label && (
        <legend className="block text-sm font-medium text-stone-300 mb-3">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </legend>
      )}
      <div className="space-y-2">
        {options.map((option) => {
          const isChecked = value.includes(option)
          const isDisabled = atSelectionLimit && !isChecked
          return (
            <label
              key={option}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                isChecked
                  ? 'border-brand-500 bg-brand-500/10'
                  : isDisabled
                    ? 'border-stone-800 bg-stone-900/50 opacity-60 cursor-not-allowed'
                    : 'border-stone-700 bg-stone-800/50 hover:border-stone-600'
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggle(option)}
                disabled={isDisabled}
                className="h-4 w-4 rounded border-stone-600 text-brand-600 focus:ring-brand-500 bg-stone-800"
              />
              <span className="text-sm text-stone-100">{option}</span>
            </label>
          )
        })}
      </div>
      {helperText && !error && <p className="mt-1.5 text-sm text-stone-400">{helperText}</p>}
      {error && (
        <p className="mt-1.5 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  )
}
