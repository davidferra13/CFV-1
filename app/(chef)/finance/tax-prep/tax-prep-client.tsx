'use client'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="text-sm px-4 py-2 rounded-md bg-stone-700 text-stone-200 hover:bg-stone-600 transition-colors font-medium print:hidden"
    >
      Export for Accountant
    </button>
  )
}
