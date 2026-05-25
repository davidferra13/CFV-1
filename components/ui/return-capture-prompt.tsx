'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { X } from '@/components/ui/icons'
import type { ReturnContext, SuggestedAction } from '@/components/ui/external-link'

interface StoredContext extends ReturnContext {
  originPath: string
  timestamp: string
  fired: boolean
}

export function ReturnCapturePrompt() {
  const pathname = usePathname()
  const [context, setContext] = useState<StoredContext | null>(null)
  const [visible, setVisible] = useState(false)
  const [activeAction, setActiveAction] = useState<SuggestedAction | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [saved, setSaved] = useState(false)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  const clearContext = useCallback(() => {
    try {
      sessionStorage.removeItem('cf-return-context')
    } catch {}
    setContext(null)
    setVisible(false)
    setActiveAction(null)
    setInputValue('')
    setSaved(false)
  }, [])

  const dismiss = useCallback(() => {
    setVisible(false)
    setTimeout(clearContext, 300)
  }, [clearContext])

  const startAutoDismiss = useCallback(() => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    dismissTimerRef.current = setTimeout(dismiss, 30000)
  }, [dismiss])

  const resetAutoDismiss = useCallback(() => {
    startAutoDismiss()
  }, [startAutoDismiss])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return

      setTimeout(() => {
        try {
          const raw = sessionStorage.getItem('cf-return-context')
          if (!raw) return

          const stored: StoredContext = JSON.parse(raw)
          if (stored.fired) return
          if (stored.originPath !== pathname) return

          stored.fired = true
          sessionStorage.setItem('cf-return-context', JSON.stringify(stored))
          setContext(stored)
          setVisible(true)
          startAutoDismiss()
        } catch {}
      }, 500)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [pathname, startAutoDismiss])

  useEffect(() => {
    if (context && pathname !== context.originPath) {
      clearContext()
    }
  }, [pathname, context, clearContext])

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    }
  }, [])

  const handleAction = useCallback(
    (action: SuggestedAction) => {
      setActiveAction(action)
      resetAutoDismiss()
      setTimeout(() => inputRef.current?.focus(), 100)
    },
    [resetAutoDismiss]
  )

  const handleSave = useCallback(() => {
    if (!inputValue.trim() || !activeAction || !context) return
    setSaved(true)
    setTimeout(clearContext, 1500)
  }, [inputValue, activeAction, context, clearContext])

  if (!context || !visible) return null

  const promptText = `Back from research? Update ${context.entityName}.`

  return (
    <div
      className={`fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[480px] z-50 transition-transform duration-300 ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
      role="complementary"
      aria-label="Return capture prompt"
      onMouseMove={resetAutoDismiss}
    >
      <div className="bg-stone-800/95 border border-stone-700 rounded-lg shadow-xl p-4">
        {saved ? (
          <p className="text-sm text-emerald-400">Saved.</p>
        ) : activeAction ? (
          <div className="space-y-3">
            <p className="text-sm text-stone-300">{activeAction.label}</p>
            {activeAction.type === 'note' ? (
              <textarea
                ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-stone-400 min-h-[60px] resize-none"
                placeholder="Add your notes..."
              />
            ) : (
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type={activeAction.type === 'number' ? 'number' : 'text'}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="w-full bg-stone-900 border border-stone-600 rounded px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-stone-400"
                placeholder={activeAction.type === 'number' ? '0.00' : 'Type here...'}
                step={activeAction.type === 'number' ? '0.01' : undefined}
              />
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={dismiss}
                className="px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!inputValue.trim()}
                className="px-3 py-1.5 text-xs bg-stone-700 hover:bg-stone-600 text-stone-100 rounded disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-stone-300 mb-2">{promptText}</p>
              <div className="flex flex-wrap gap-2">
                {context.suggestedActions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => handleAction(action)}
                    className="px-3 py-1.5 text-xs bg-stone-700 hover:bg-stone-600 text-stone-200 rounded transition-colors min-h-[36px] sm:min-h-0"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="flex-shrink-0 p-1 text-stone-500 hover:text-stone-300 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
