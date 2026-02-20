'use client'

import { X } from 'lucide-react'

interface ShortcutSection {
  category: string
  shortcuts: {
    keys: string[]
    description: string
  }[]
}

const SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    category: 'Navigation',
    shortcuts: [
      { keys: ['G', 'D'], description: 'Dashboard' },
      { keys: ['G', 'C'], description: 'Clients' },
      { keys: ['G', 'I'], description: 'Inquiries' },
      { keys: ['G', 'E'], description: 'Events' },
      { keys: ['G', 'F'], description: 'Finance' },
      { keys: ['G', 'S'], description: 'Settings' },
    ],
  },
  {
    category: 'Create New',
    shortcuts: [
      { keys: ['N', 'I'], description: 'New Inquiry' },
      { keys: ['N', 'E'], description: 'New Event' },
      { keys: ['N', 'Q'], description: 'New Quote' },
      { keys: ['N', 'C'], description: 'New Client' },
    ],
  },
  {
    category: 'Search',
    shortcuts: [
      { keys: ['⌘', 'K'], description: 'Open search' },
      { keys: ['/'], description: 'Open search' },
    ],
  },
  {
    category: 'Help',
    shortcuts: [{ keys: ['?'], description: 'Show this panel' }],
  },
]

interface ShortcutsHelpPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function ShortcutsHelpPanel({ isOpen, onClose }: ShortcutsHelpPanelProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-[500px] mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close shortcuts panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Shortcut sections */}
        <div className="px-6 py-4 space-y-5 max-h-[70vh] overflow-y-auto">
          {SHORTCUT_SECTIONS.map((section) => (
            <div key={section.category}>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                {section.category}
              </p>
              <div className="space-y-1">
                {section.shortcuts.map((shortcut, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIdx) => (
                        <span key={keyIdx} className="flex items-center gap-1">
                          <kbd className="inline-flex items-center px-2 py-0.5 rounded border border-gray-300 bg-gray-50 text-xs font-mono text-gray-700 shadow-sm">
                            {key}
                          </kbd>
                          {keyIdx < shortcut.keys.length - 1 && (
                            <span className="text-xs text-gray-400">then</span>
                          )}
                        </span>
                      ))}
                    </div>
                    <span className="text-sm text-gray-600 text-right ml-4">
                      {shortcut.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400 text-center">
            Press <kbd className="inline-flex items-center px-1.5 py-0.5 rounded border border-gray-300 bg-white text-xs font-mono text-gray-600">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  )
}
