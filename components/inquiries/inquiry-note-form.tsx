'use client'

import { useState, useRef } from 'react'
import { Loader2, ImagePlus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { InquiryNoteCategory } from '@/lib/inquiries/note-actions'

const CATEGORIES: { value: InquiryNoteCategory; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'inspiration', label: 'Inspiration' },
  { value: 'menu_planning', label: 'Menu Planning' },
  { value: 'sourcing', label: 'Sourcing' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'staffing', label: 'Staffing' },
  { value: 'post_event', label: 'Post-Event' },
]

interface InquiryNoteFormProps {
  inquiryId: string
  initialData?: {
    note_text: string
    category: InquiryNoteCategory
    attachment_url?: string | null
    attachment_filename?: string | null
  }
  onSubmit: (data: {
    note_text: string
    category: InquiryNoteCategory
    attachment_url: string | null
    attachment_filename: string | null
  }) => Promise<void>
  onCancel: () => void
  submitting?: boolean
}

export function InquiryNoteForm({
  inquiryId,
  initialData,
  onSubmit,
  onCancel,
  submitting = false,
}: InquiryNoteFormProps) {
  const [noteText, setNoteText] = useState(initialData?.note_text || '')
  const [category, setCategory] = useState<InquiryNoteCategory>(initialData?.category || 'general')
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(
    initialData?.attachment_url || null
  )
  const [attachmentFilename, setAttachmentFilename] = useState<string | null>(
    initialData?.attachment_filename || null
  )
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(null)

    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `${inquiryId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error } = await supabase.storage
        .from('inquiry-note-attachments')
        .upload(path, file, { upsert: false })

      if (error) {
        throw new Error(error.message)
      }

      const { data: urlData } = supabase.storage.from('inquiry-note-attachments').getPublicUrl(path)

      setAttachmentUrl(urlData.publicUrl)
      setAttachmentFilename(file.name)
    } catch (err) {
      setUploadError('Upload failed. Please try again.')
      console.error('[InquiryNoteForm] Upload error:', err)
    } finally {
      setUploading(false)
      // Reset input so same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveAttachment = () => {
    setAttachmentUrl(null)
    setAttachmentFilename(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteText.trim()) return
    await onSubmit({
      note_text: noteText.trim(),
      category,
      attachment_url: attachmentUrl,
      attachment_filename: attachmentFilename,
    })
  }

  const isWorking = submitting || uploading

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        value={noteText}
        onChange={(e) => setNoteText(e.target.value)}
        placeholder="Write a note..."
        rows={3}
        autoFocus
        className="w-full text-sm border border-stone-600 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
      />

      {/* Attachment area */}
      {attachmentUrl ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={attachmentUrl}
            alt={attachmentFilename || 'Attachment'}
            className="h-20 w-auto rounded-lg object-cover border border-stone-700"
          />
          <button
            type="button"
            onClick={handleRemoveAttachment}
            className="absolute -top-1.5 -right-1.5 bg-surface border border-stone-600 rounded-full p-0.5 hover:bg-red-950 hover:border-red-300 transition-colors"
            title="Remove image"
          >
            <X className="w-3 h-3 text-stone-500 hover:text-red-500" />
          </button>
          <p className="text-[10px] text-stone-400 mt-1 max-w-[12rem] truncate">
            {attachmentFilename}
          </p>
        </div>
      ) : (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            onChange={handleFileChange}
            className="hidden"
            id="note-attachment-input"
          />
          <label
            htmlFor="note-attachment-input"
            className={`inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-300 cursor-pointer transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {uploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ImagePlus className="w-3.5 h-3.5" />
            )}
            {uploading ? 'Uploading...' : 'Add image'}
          </label>
          {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
        </div>
      )}

      <div className="flex items-center justify-between">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as InquiryNoteCategory)}
          className="text-xs border border-stone-600 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isWorking}
            className="px-3 py-1 text-xs text-stone-400 hover:text-stone-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!noteText.trim() || isWorking}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
            {initialData ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </form>
  )
}
