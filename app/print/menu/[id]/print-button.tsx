'use client'

export function PrintButton({ backHref }: { backHref: string }) {
  return (
    <div className="no-print flex items-center justify-between gap-4 mb-8 pb-4 border-b border-gray-200 font-sans">
      <p className="text-sm text-gray-500">
        Print or save as PDF using your browser (Ctrl+P / Cmd+P)
      </p>
      <div className="flex gap-3 shrink-0">
        <button
          type="button"
          onClick={() => window.print()}
          className="text-sm font-semibold px-4 py-2 bg-stone-900 text-white rounded-md hover:bg-stone-800 transition-colors"
        >
          Print / Save PDF
        </button>
        <a
          href={backHref}
          className="text-sm font-medium px-4 py-2 text-gray-500 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Back to Editor
        </a>
      </div>
    </div>
  )
}
