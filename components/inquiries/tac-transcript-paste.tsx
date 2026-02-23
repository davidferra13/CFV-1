// TakeAChef Transcript Paste Dialog
// Chef pastes the full TakeAChef conversation. We attempt to parse individual messages,
// preview them, then save as messages in the communication log.
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { saveTacTranscript } from '@/lib/messages/tac-transcript-actions'

interface ParsedMessage {
  direction: 'inbound' | 'outbound'
  body: string
  sentAt: string | null
  senderName: string | null
}

interface TacTranscriptPasteProps {
  inquiryId: string
  clientName: string | null
  clientId?: string | null
  onClose: () => void
}

/**
 * Attempt to split a pasted TakeAChef transcript into individual messages.
 * TakeAChef conversations typically show messages with name/date patterns.
 * Falls back to treating the whole text as a single note if parsing fails.
 */
function parseTranscript(raw: string, clientName: string | null): ParsedMessage[] {
  const trimmed = raw.trim()
  if (!trimmed) return []

  // Try splitting by common TakeAChef chat patterns:
  // "Name - Date" or "Name:" at line start
  const messagePattern =
    /^([A-Za-z][A-Za-z .'-]+?)\s*[-–—]\s*(\d{1,2}\s+\w+\s+\d{4}(?:\s+\d{1,2}:\d{2})?)\s*$/m
  const simpleNamePattern = /^([A-Za-z][A-Za-z .'-]+?):\s*$/m

  const lines = trimmed.split('\n')
  const messages: ParsedMessage[] = []
  let currentSender: string | null = null
  let currentDate: string | null = null
  let currentBody: string[] = []

  const flushCurrent = () => {
    if (currentBody.length > 0) {
      const bodyText = currentBody.join('\n').trim()
      if (bodyText) {
        const isClient = clientName
          ? currentSender?.toLowerCase().includes(clientName.toLowerCase().split(' ')[0] || '') ||
            false
          : false
        messages.push({
          direction: isClient ? 'inbound' : 'outbound',
          body: bodyText,
          sentAt: currentDate,
          senderName: currentSender,
        })
      }
    }
    currentBody = []
  }

  for (const line of lines) {
    // Try "Name - Date" pattern
    const dateMatch = line.match(messagePattern)
    if (dateMatch) {
      flushCurrent()
      currentSender = dateMatch[1].trim()
      // Try to parse the date
      try {
        const parsed = new Date(dateMatch[2].trim())
        currentDate = isNaN(parsed.getTime()) ? null : parsed.toISOString()
      } catch {
        currentDate = null
      }
      continue
    }

    // Try "Name:" pattern
    const nameMatch = line.match(simpleNamePattern)
    if (nameMatch) {
      flushCurrent()
      currentSender = nameMatch[1].trim()
      currentDate = null
      continue
    }

    // Regular line — append to current message
    currentBody.push(line)
  }

  flushCurrent()

  // If we couldn't parse into multiple messages, return the whole text as one note
  if (messages.length === 0) {
    return [
      {
        direction: 'inbound' as const,
        body: trimmed,
        sentAt: null,
        senderName: null,
      },
    ]
  }

  return messages
}

export function TacTranscriptPaste({
  inquiryId,
  clientName,
  clientId,
  onClose,
}: TacTranscriptPasteProps) {
  const router = useRouter()
  const [rawText, setRawText] = useState('')
  const [preview, setPreview] = useState<ParsedMessage[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePreview = useCallback(() => {
    const parsed = parseTranscript(rawText, clientName)
    setPreview(parsed)
  }, [rawText, clientName])

  const handleSave = async () => {
    if (!preview || preview.length === 0) return
    setSaving(true)
    setError(null)

    try {
      await saveTacTranscript({
        inquiryId,
        clientId: clientId ?? null,
        messages: preview.map((m) => ({
          direction: m.direction,
          body: m.body,
          sentAt: m.sentAt,
        })),
      })
      router.refresh()
      onClose()
    } catch (err) {
      console.error('[TacTranscriptPaste] Save failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to save transcript')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-stone-900">Paste TakeAChef Conversation</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Open the conversation on TakeAChef, select all the messages (Ctrl+A), copy, and paste
              below
            </p>
          </div>
          <button
            type="button"
            className="text-stone-400 hover:text-stone-600 text-xl leading-none"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {!preview ? (
            <>
              <textarea
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
                rows={12}
                placeholder="Paste the full TakeAChef conversation here..."
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
              />
              <p className="text-xs text-stone-400">
                We'll try to split this into individual messages. If we can't detect message
                boundaries, the whole text will be saved as a single note.
              </p>
              <p className="text-xs text-stone-400">
                Messages will appear in the Communication Log on this inquiry's page — same place as
                emails and notes. You can always add more later.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="info">
                  {preview.length} message{preview.length !== 1 ? 's' : ''}
                </Badge>
                <button
                  type="button"
                  className="text-xs text-stone-500 hover:text-stone-700 underline"
                  onClick={() => setPreview(null)}
                >
                  Edit text
                </button>
              </div>
              <div className="space-y-2">
                {preview.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        msg.direction === 'outbound'
                          ? 'bg-brand-500/10 text-stone-800'
                          : 'bg-stone-100 text-stone-800'
                      }`}
                    >
                      {msg.senderName && (
                        <p className="text-xs font-medium text-stone-500 mb-0.5">
                          {msg.senderName}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap">{msg.body}</p>
                      {msg.sentAt && (
                        <p className="text-xs text-stone-400 mt-1">
                          {new Date(msg.sentAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="p-4 border-t border-stone-200 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          {!preview ? (
            <Button variant="primary" onClick={handlePreview} disabled={!rawText.trim()}>
              Preview Messages
            </Button>
          ) : (
            <Button variant="primary" onClick={handleSave} disabled={saving} loading={saving}>
              Save {preview.length} Message{preview.length !== 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}
