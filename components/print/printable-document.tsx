'use client'

// PrintableDocument — Dual-mode wrapper for print pages.
// Renders a screen preview + print-optimized layout.
// Supports standard (Letter/A4), thermal 80mm, and thermal 58mm.
//
// Usage:
//   <PrintableDocument
//     title="Station Clipboard"
//     subtitle="Monday, March 2, 2026"
//     mode="standard"   // or "thermal-80" or "thermal-58"
//   >
//     <table className="print-table">...</table>
//   </PrintableDocument>

import { type ReactNode } from 'react'

export type PrintMode = 'standard' | 'thermal-80' | 'thermal-58'

type Props = {
  children: ReactNode
  title: string
  subtitle?: string
  footer?: string
  mode?: PrintMode
}

const MODE_CLASSES: Record<PrintMode, { print: string; preview: string }> = {
  standard: { print: 'print-standard', preview: 'print-preview' },
  'thermal-80': { print: 'print-thermal-80', preview: 'print-preview-thermal' },
  'thermal-58': { print: 'print-thermal-58', preview: 'print-preview-thermal' },
}

export function PrintableDocument({ children, title, subtitle, footer, mode = 'standard' }: Props) {
  const classes = MODE_CLASSES[mode]
  const defaultFooter = `ChefFlow — Printed ${new Date().toLocaleString()}`

  return (
    <div className={`${classes.preview} ${classes.print} p-4`}>
      {/* Screen-only controls */}
      <div className="no-print mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PrintButton />
          <PrintModeIndicator mode={mode} />
        </div>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-3 py-1.5 text-sm border border-stone-600 text-stone-300 rounded-lg hover:bg-stone-800"
        >
          Back
        </button>
      </div>

      {/* Document header */}
      <h1 style={{ fontWeight: 'bold' }}>{title}</h1>
      {subtitle && <div className="print-meta">{subtitle}</div>}

      {/* Document body */}
      {children}

      {/* Document footer */}
      <div
        className="print-meta"
        style={{ marginTop: '12px', fontSize: mode === 'standard' ? '10px' : '8px' }}
      >
        {footer ?? defaultFooter}
      </div>
    </div>
  )
}

function PrintButton() {
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

function PrintModeIndicator({ mode }: { mode: PrintMode }) {
  const labels: Record<PrintMode, string> = {
    standard: 'Standard paper',
    'thermal-80': '80mm thermal',
    'thermal-58': '58mm thermal',
  }
  return <span className="text-xs text-stone-500">{labels[mode]}</span>
}
