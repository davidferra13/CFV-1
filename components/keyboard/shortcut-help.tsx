'use client'

import { useEffect, useState, useCallback } from 'react'
import { X } from '@/components/ui/icons'
import { groupShortcutsByCategory } from '@/lib/keyboard/shortcuts'

const grouped = groupShortcutsByCategory()
const CATEGORY_ORDER = ['Create', 'Go to', 'Help']

export function ShortcutHelp() {
  const [isOpen, setIsOpen] = useState(false)

  const close = useCallback(() => setIsOpen(false), [])

  // Listen for the show-help custom event from ShortcutProvider
  useEffect(() => {
    function onShowHelp() {
      setIsOpen((prev) => !prev)
    }
    window.addEventListener('show-help', onShowHelp)
    return () => window.removeEventListener('show-help', onShowHelp)
  }, [])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={close}
    >
      <div
        className="relative bg-stone-900 rounded-xl shadow-2xl w-full max-w-[500px] mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-700">
          <h2 className="text-base font-semibold text-stone-100">Keyboard Shortcuts</h2>
          <button
            type="button"
            onClick={close}
            className="p-1 rounded-md text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
            aria-label="Close shortcuts panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Shortcut sections */}
        <div className="px-6 py-4 space-y-5 max-h-[70vh] overflow-y-auto">
          {CATEGORY_ORDER.map((category) => {
            const shortcuts = grouped[category]
            if (!shortcuts || shortcuts.length === 0) return null
            return (
              <div key={category}>
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
                  {category}
                </p>
                <div className="space-y-1">
                  {shortcuts.map((shortcut, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIdx) => (
                          <span key={keyIdx} className="flex items-center gap-1">
                            <kbd className="inline-flex items-center px-2 py-0.5 rounded border border-stone-600 bg-stone-800 text-xs font-mono text-stone-300 shadow-sm">
                              {key.toUpperCase()}
                            </kbd>
                            {keyIdx < shortcut.keys.length - 1 && (
                              <span className="text-xs text-stone-500">then</span>
                            )}
                          </span>
                        ))}
                      </div>
                      <span className="text-sm text-stone-400 text-right ml-4">
                        {shortcut.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer hint */}
        <div className="px-6 py-3 border-t border-stone-700 bg-stone-800">
          <p className="text-xs text-stone-500 text-center">
            Press{' '}
            <kbd className="inline-flex items-center px-1.5 py-0.5 rounded border border-stone-600 bg-stone-900 text-xs font-mono text-stone-400">
              Esc
            </kbd>{' '}
            to close
          </p>
        </div>
      </div>
    </div>
  )
}
