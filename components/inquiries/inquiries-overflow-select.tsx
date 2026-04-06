'use client'

interface OverflowSelectProps {
  isActive: boolean
  currentValue: string
  options: { value: string; label: string }[]
}

export function InquiriesOverflowSelect({ isActive, currentValue, options }: OverflowSelectProps) {
  return (
    <select
      value={isActive ? currentValue : ''}
      onChange={(e) => {
        if (e.target.value) window.location.href = `/inquiries?status=${e.target.value}`
      }}
      aria-label="More status filters"
      className={`h-8 shrink-0 rounded-md border px-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 ${
        isActive
          ? 'border-brand-500 bg-brand-950 text-brand-300'
          : 'border-stone-700 bg-stone-900 text-stone-300'
      }`}
    >
      <option value="">More...</option>
      {options.map((tab) => (
        <option key={tab.value} value={tab.value}>
          {tab.label}
        </option>
      ))}
    </select>
  )
}
