'use client'

// Print Button - Triggers window.print() for report pages

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center rounded-lg border border-stone-600 px-3 py-1.5 text-sm font-medium text-stone-300 hover:bg-stone-800 print:hidden"
    >
      Print Report
    </button>
  )
}
