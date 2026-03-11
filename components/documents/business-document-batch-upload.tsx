'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Upload, X, FileText } from '@/components/ui/icons'
import { uploadBusinessDocument } from '@/lib/documents/file-actions'
import { toast } from 'sonner'

const DOCUMENT_TYPE_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'contract', label: 'Contract' },
  { value: 'policy', label: 'Policy' },
  { value: 'checklist', label: 'Checklist' },
  { value: 'template', label: 'Template' },
  { value: 'note', label: 'Note' },
] as const

type UploadedBatchItem = {
  id: string
  title: string
  originalFilename: string | null
  viewUrl: string
  enhancedViewUrl: string | null
}

type FailedBatchItem = {
  fileName: string
  error: string
}

export function BusinessDocumentBatchUpload() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [documentType, setDocumentType] = useState<
    'contract' | 'template' | 'policy' | 'checklist' | 'note' | 'general'
  >('general')
  const [uploadedItems, setUploadedItems] = useState<UploadedBatchItem[]>([])
  const [failedItems, setFailedItems] = useState<FailedBatchItem[]>([])

  const selectedLabel = useMemo(() => {
    if (selectedFiles.length === 0) return 'No files selected'
    if (selectedFiles.length === 1) return selectedFiles[0].name
    return `${selectedFiles.length} files selected`
  }, [selectedFiles])

  function openPicker() {
    inputRef.current?.click()
  }

  function resetSelection() {
    setSelectedFiles([])
    setUploadedItems([])
    setFailedItems([])
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleChoose(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    setSelectedFiles(files)
    setUploadedItems([])
    setFailedItems([])
  }

  function handleUpload() {
    if (selectedFiles.length === 0) return

    startTransition(async () => {
      const uploaded: UploadedBatchItem[] = []
      const failed: FailedBatchItem[] = []

      for (const file of selectedFiles) {
        const formData = new FormData()
        formData.set('file', file)
        formData.set('document_type', documentType)
        formData.set('tags', JSON.stringify(['vault', 'batch-upload']))
        formData.set('revalidate_paths', JSON.stringify(['/documents']))

        const result = await uploadBusinessDocument(formData)
        if (result.success) {
          uploaded.push({
            id: result.document.id,
            title: result.document.title,
            originalFilename: result.document.originalFilename,
            viewUrl: result.document.viewUrl,
            enhancedViewUrl: result.document.enhancedViewUrl,
          })
          continue
        }

        failed.push({
          fileName: file.name,
          error: result.error,
        })
      }

      setUploadedItems(uploaded)
      setFailedItems(failed)

      if (uploaded.length > 0) {
        toast.success(`Uploaded ${uploaded.length} document${uploaded.length === 1 ? '' : 's'}`)
        router.refresh()
      }
      if (failed.length > 0) {
        toast.error(`${failed.length} upload${failed.length === 1 ? '' : 's'} failed`)
      }

      if (inputRef.current) inputRef.current.value = ''
      setSelectedFiles([])
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-stone-200">Batch Upload</p>
        <p className="mt-1 text-xs text-stone-500">
          Bring multiple archive files in at once. Choose a document class for the batch, then
          upload PDFs, Office files, spreadsheets, text files, or images. Image documents get an
          optional enhanced preview while the original stays preserved.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.jpg,.jpeg,.png,.webp,.heic,.heif"
        onChange={handleChoose}
        className="sr-only"
      />

      <div className="grid gap-3 sm:grid-cols-[1fr,180px]">
        <div className="rounded-lg border border-stone-700 bg-stone-900/70 px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-stone-500">Selection</p>
          <p className="mt-1 text-sm text-stone-200">{selectedLabel}</p>
        </div>
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-stone-500">
            Batch Type
          </label>
          <select
            value={documentType}
            onChange={(event) =>
              setDocumentType(
                event.target.value as
                  | 'contract'
                  | 'template'
                  | 'policy'
                  | 'checklist'
                  | 'note'
                  | 'general'
              )
            }
            className="h-10 w-full rounded-lg border border-stone-700 bg-stone-900 px-3 text-sm text-stone-200"
          >
            {DOCUMENT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={openPicker}>
          <Upload className="h-4 w-4" />
          Choose Files
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleUpload}
          loading={isPending}
          disabled={selectedFiles.length === 0}
        >
          Upload Batch
        </Button>
        {(selectedFiles.length > 0 || uploadedItems.length > 0 || failedItems.length > 0) && (
          <Button type="button" size="sm" variant="ghost" onClick={resetSelection}>
            <X className="h-4 w-4" />
            Reset
          </Button>
        )}
      </div>

      {(uploadedItems.length > 0 || failedItems.length > 0) && (
        <div className="space-y-3 rounded-xl border border-stone-800 bg-stone-900/60 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {uploadedItems.length > 0 && <Badge variant="success">{uploadedItems.length} uploaded</Badge>}
            {failedItems.length > 0 && <Badge variant="error">{failedItems.length} failed</Badge>}
          </div>

          {uploadedItems.length > 0 && (
            <div className="space-y-2">
              {uploadedItems.slice(0, 8).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-stone-200">
                      {item.originalFilename ?? item.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.enhancedViewUrl && (
                      <a
                        href={item.enhancedViewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-amber-200 underline underline-offset-2"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Enhanced Preview
                      </a>
                    )}
                    <a
                      href={item.viewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-amber-200 underline underline-offset-2"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Original
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {failedItems.length > 0 && (
            <div className="space-y-2 border-t border-stone-800 pt-3">
              {failedItems.slice(0, 6).map((item) => (
                <div key={`${item.fileName}-${item.error}`} className="text-xs text-red-300">
                  {item.fileName}: {item.error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
