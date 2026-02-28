'use client'

export function PrintClipboardButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
    >
      Print
    </button>
  )
}
