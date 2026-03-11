'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Upload, X } from '@/components/ui/icons'
import { uploadBusinessDocument } from '@/lib/documents/file-actions'
import { toast } from 'sonner'

type UploadedDocumentRef = {
  id: string
  url: string
  enhancedUrl: string | null
  title: string
  originalFilename: string | null
  extractionStatus: string
  canEnhancePreview: boolean
}

type DocumentUploadFieldProps = {
  label: string
  description?: string
  documentType?: 'contract' | 'template' | 'policy' | 'checklist' | 'note' | 'general'
  entityType?: string
  entityId?: string | null
  title?: string
  tags?: string[]
  revalidatePaths?: string[]
  initialUrl?: string | null
  initialName?: string | null
  accept?: string
  buttonLabel?: string
  compact?: boolean
  refreshOnUpload?: boolean
  onUploaded?: (document: UploadedDocumentRef) => void
  onCleared?: () => void
}

const DEFAULT_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.jpg,.jpeg,.png,.webp,.heic,.heif'

export function DocumentUploadField({
  label,
  description,
  documentType = 'general',
  entityType,
  entityId,
  title,
  tags = [],
  revalidatePaths = [],
  initialUrl,
  initialName,
  accept = DEFAULT_ACCEPT,
  buttonLabel = 'Upload file',
  compact = false,
  refreshOnUpload = false,
  onUploaded,
  onCleared,
}: DocumentUploadFieldProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [uploaded, setUploaded] = useState<UploadedDocumentRef | null>(
    initialUrl
        ? {
          id: '',
          url: initialUrl,
          enhancedUrl: null,
          title: initialName ?? 'Uploaded document',
          originalFilename: initialName ?? null,
          extractionStatus: 'unknown',
          canEnhancePreview: false,
        }
      : null
  )

  useEffect(() => {
    if (!initialUrl) {
      setUploaded(null)
      return
    }

    setUploaded((current) => {
      if (current?.url === initialUrl) return current
      return {
        id: current?.id ?? '',
        url: initialUrl,
        enhancedUrl: current?.enhancedUrl ?? null,
        title: initialName ?? current?.title ?? 'Uploaded document',
        originalFilename: initialName ?? current?.originalFilename ?? null,
        extractionStatus: current?.extractionStatus ?? 'unknown',
        canEnhancePreview: current?.canEnhancePreview ?? false,
      }
    })
  }, [initialName, initialUrl])

  const acceptedLabel = useMemo(
    () => 'PDF, Word, Excel, CSV, text, or image files up to 50 MB.',
    []
  )
  const previewLabel = useMemo(
    () => 'Enhanced preview available. Original file preserved.',
    []
  )

  function openPicker() {
    inputRef.current?.click()
  }

  function clearSelection() {
    setUploaded(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
    onCleared?.()
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)

    startTransition(async () => {
      const formData = new FormData()
      formData.set('file', file)
      formData.set('document_type', documentType)
      if (entityType) formData.set('entity_type', entityType)
      if (entityId) formData.set('entity_id', entityId)
      if (title) formData.set('title', title)
      if (tags.length > 0) formData.set('tags', JSON.stringify(tags))
      if (revalidatePaths.length > 0) {
        formData.set('revalidate_paths', JSON.stringify(revalidatePaths))
      }

      const result = await uploadBusinessDocument(formData)

      if (!result.success) {
        setError(result.error)
        toast.error(result.error)
        if (inputRef.current) inputRef.current.value = ''
        return
      }

      const nextValue: UploadedDocumentRef = {
        canEnhancePreview: result.document.canEnhancePreview,
        id: result.document.id,
        url: result.document.viewUrl,
        enhancedUrl: result.document.enhancedViewUrl,
        title: result.document.title,
        originalFilename: result.document.originalFilename,
        extractionStatus: result.document.extractionStatus,
      }

      setUploaded(nextValue)
      toast.success('Document uploaded')
      onUploaded?.(nextValue)
      if (refreshOnUpload) router.refresh()
      if (inputRef.current) inputRef.current.value = ''
    })
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-stone-200">{label}</p>
          {uploaded && <Badge variant="success">On file</Badge>}
        </div>
        <p className="text-xs text-stone-500 mt-1">{description ?? acceptedLabel}</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="sr-only"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={openPicker}
          loading={isPending}
        >
          <Upload className="h-4 w-4" />
          {buttonLabel}
        </Button>
        {uploaded && (
          <Button type="button" size="sm" variant="ghost" onClick={clearSelection}>
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {uploaded && (
        <div className="rounded-lg border border-stone-700 bg-stone-900/70 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <FileText className="h-4 w-4 text-stone-400" />
            <a
              href={uploaded.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-amber-200 underline underline-offset-2"
            >
              {uploaded.originalFilename ?? uploaded.title}
            </a>
            {uploaded.extractionStatus === 'completed' && <Badge variant="info">Text ready</Badge>}
            {uploaded.canEnhancePreview && uploaded.enhancedUrl && (
              <>
                <Badge variant="success">Original preserved</Badge>
                <a
                  href={uploaded.enhancedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-amber-200 underline underline-offset-2"
                >
                  Enhanced preview
                </a>
              </>
            )}
          </div>
          {uploaded.canEnhancePreview && uploaded.enhancedUrl && (
            <p className="mt-2 text-xs text-stone-500">{previewLabel}</p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
