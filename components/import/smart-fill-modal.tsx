// Smart Fill Modal
// A small modal with a textarea for pasting text — parses and returns structured data
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'

type SmartFillModalProps<T> = {
  open: boolean
  onClose: () => void
  onFill: (data: T) => void
  parseFn: (text: string) => Promise<{ parsed: T; confidence: string; warnings: string[] }>
  title: string
  placeholder: string
}

export function SmartFillModal<T>({
  open,
  onClose,
  onFill,
  parseFn,
  title,
  placeholder
}: SmartFillModalProps<T>) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

  if (!open) return null

  const handleParse = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    setWarnings([])

    try {
      const result = await parseFn(text)
      setWarnings(result.warnings)
      onFill(result.parsed)
      setText('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse text')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setText('')
    setError(null)
    setWarnings([])
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-stone-900">{title}</h3>
          <button
            onClick={handleClose}
            className="text-stone-400 hover:text-stone-600 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {error && (
          <Alert variant="error">{error}</Alert>
        )}

        {warnings.length > 0 && (
          <Alert variant="warning">
            <ul className="list-disc list-inside">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </Alert>
        )}

        <Textarea
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          disabled={loading}
          className="font-mono text-sm"
        />

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleParse} disabled={!text.trim() || loading} loading={loading}>
            {loading ? 'Parsing...' : 'Parse & Fill'}
          </Button>
        </div>
      </div>
    </div>
  )
}
