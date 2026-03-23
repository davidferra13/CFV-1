'use client'

import { useState, useRef, useTransition } from 'react'
import { uploadHubMediaFile, getMediaUrl } from '@/lib/hub/media-actions'
import { postHubMessage } from '@/lib/hub/message-actions'

interface HubFileShareProps {
  groupId: string
  profileToken: string
  onUploaded?: () => void
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
]

function getFileIcon(contentType: string): string {
  if (contentType.startsWith('image/')) return '🖼️'
  if (contentType === 'application/pdf') return '📄'
  if (contentType.includes('word')) return '📝'
  if (contentType.includes('excel') || contentType.includes('spreadsheet')) return '📊'
  if (contentType === 'text/csv') return '📊'
  return '📎'
}

export function HubFileShare({ groupId, profileToken, onUploaded }: HubFileShareProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    if (file.size > MAX_FILE_SIZE) {
      setError('File too large (max 10MB)')
      return
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('File type not supported')
      return
    }

    startTransition(async () => {
      try {
        const fd = new FormData()
        fd.append('file', file)

        // Upload to storage and record in database via server action
        const media = await uploadHubMediaFile(groupId, profileToken, fd)

        // Post a message with inline media for images, or text link for documents
        const icon = getFileIcon(file.type)
        const isImage = file.type.startsWith('image/')

        if (isImage) {
          // Get signed URL so the image renders inline in the chat
          const signedUrl = await getMediaUrl(media.storage_path)
          await postHubMessage({
            groupId,
            profileToken,
            body: file.name,
            media_urls: [signedUrl],
            media_captions: [file.name],
          })
        } else {
          await postHubMessage({
            groupId,
            profileToken,
            body: `${icon} Shared: ${file.name}`,
          })
        }

        onUploaded?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed')
      }
    })

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        id="hub-file-input"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isPending}
        className="flex-shrink-0 rounded-full p-2 text-stone-400 hover:bg-stone-800 hover:text-stone-200 disabled:opacity-50"
        title="Share a file"
      >
        {isPending ? (
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
            />
          </svg>
        )}
      </button>
      {error && (
        <div className="absolute bottom-full left-0 mb-1 rounded bg-red-900/80 px-2 py-1 text-xs text-red-300">
          {error}
        </div>
      )}
    </div>
  )
}
