// Smart Fill Modal
// A small dialog with a textarea for pasting text, then parsing into structured data.
'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'
import { AccessibleDialog } from '@/components/ui/accessible-dialog'
import { mapErrorToUI } from '@/lib/errors/map-error-to-ui'

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
  placeholder,
}: SmartFillModalProps<T>) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const textRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!open) return
    setTimeout(() => textRef.current?.focus(), 0)
  }, [open])

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
      const uiError = mapErrorToUI(err)
      setError(uiError.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (loading) return
    setText('')
    setError(null)
    setWarnings([])
    onClose()
  }

  return (
    <AccessibleDialog
      open={open}
      onClose={handleClose}
      title={title}
      description="Paste source text and let Smart Fill extract fields."
      initialFocusRef={textRef as React.RefObject<HTMLElement | null>}
      closeOnBackdrop={!loading}
      escapeCloses={!loading}
      widthClassName="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleParse} disabled={!text.trim() || loading} loading={loading}>
            {loading ? 'Parsing...' : 'Parse & Fill'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        {warnings.length > 0 && (
          <Alert variant="warning">
            <ul className="list-disc list-inside">
              {warnings.map((warning, index) => (
                <li key={`${warning}-${index}`}>{warning}</li>
              ))}
            </ul>
          </Alert>
        )}

        <Textarea
          ref={textRef}
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          disabled={loading}
          className="font-mono text-sm"
        />
      </div>
    </AccessibleDialog>
  )
}
