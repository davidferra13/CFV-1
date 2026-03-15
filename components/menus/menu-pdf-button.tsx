'use client'

import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { generateMenuPdf } from '@/lib/documents/generate-menu-pdf'
import { Button } from '@/components/ui/button'

interface MenuPdfButtonProps {
  menuId: string
  menuName?: string
}

export function MenuPdfButton({ menuId, menuName }: MenuPdfButtonProps) {
  const [loading, setLoading] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [showDescriptions, setShowDescriptions] = useState(true)
  const [showDietary, setShowDietary] = useState(true)
  const [showCourseHeaders, setShowCourseHeaders] = useState(true)
  const panelRef = useRef<HTMLDivElement>(null)

  // Close options panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowOptions(false)
      }
    }
    if (showOptions) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [showOptions])

  async function handleExport() {
    setLoading(true)
    setShowOptions(false)
    try {
      const base64 = await generateMenuPdf(menuId, {
        showDescriptions,
        showDietary,
        showCourseHeaders,
      })

      // Convert base64 to blob and trigger download
      const byteChars = atob(base64)
      const byteArray = new Uint8Array(byteChars.length)
      for (let i = 0; i < byteChars.length; i++) {
        byteArray[i] = byteChars.charCodeAt(i)
      }
      const blob = new Blob([byteArray], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)

      const fileName = menuName
        ? `${menuName.replace(/[^a-zA-Z0-9 ]/g, '').trim()}.pdf`
        : 'menu.pdf'

      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('Menu PDF downloaded')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate menu PDF'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative inline-block" ref={panelRef}>
      <div className="flex items-center gap-1">
        <Button variant="secondary" onClick={handleExport} disabled={loading}>
          {loading ? 'Generating...' : 'Export PDF'}
        </Button>
        <Button
          variant="ghost"
          onClick={() => setShowOptions(!showOptions)}
          disabled={loading}
          className="px-2"
          aria-label="PDF export options"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </Button>
      </div>

      {showOptions && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg p-3 min-w-[200px]">
          <p className="text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wide">
            PDF Options
          </p>
          <label className="flex items-center gap-2 py-1 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={showDescriptions}
              onChange={(e) => setShowDescriptions(e.target.checked)}
              className="rounded border-zinc-300"
            />
            Show descriptions
          </label>
          <label className="flex items-center gap-2 py-1 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={showDietary}
              onChange={(e) => setShowDietary(e.target.checked)}
              className="rounded border-zinc-300"
            />
            Show dietary tags
          </label>
          <label className="flex items-center gap-2 py-1 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={showCourseHeaders}
              onChange={(e) => setShowCourseHeaders(e.target.checked)}
              className="rounded border-zinc-300"
            />
            Show course headers
          </label>
          <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
            <Button
              variant="primary"
              onClick={handleExport}
              disabled={loading}
              className="w-full text-sm"
            >
              {loading ? 'Generating...' : 'Download PDF'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
