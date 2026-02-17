'use client'

import { useState, useRef } from 'react'
import { X, Upload, Loader2, FileText, FileSpreadsheet, File } from 'lucide-react'

const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
]

const ACCEPT_STRING = ACCEPTED_TYPES.join(',')

interface ChatFileUploadProps {
  onUpload: (file: File, caption: string) => Promise<void>
  onCancel: () => void
}

function isImageType(type: string) {
  return type.startsWith('image/')
}

function getFileIcon(type: string) {
  if (type === 'application/pdf') return <FileText className="w-10 h-10 text-red-500" />
  if (type.includes('spreadsheet') || type.includes('excel') || type === 'text/csv') {
    return <FileSpreadsheet className="w-10 h-10 text-green-600" />
  }
  if (type.includes('word') || type === 'application/msword') {
    return <FileText className="w-10 h-10 text-blue-600" />
  }
  return <File className="w-10 h-10 text-stone-500" />
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ChatFileUpload({ onUpload, onCancel }: ChatFileUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (selected: File) => {
    setFile(selected)
    if (isImageType(selected.type)) {
      const reader = new FileReader()
      reader.onload = () => setPreview(reader.result as string)
      reader.readAsDataURL(selected)
    } else {
      setPreview(null)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) handleFileSelect(selected)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFileSelect(dropped)
  }

  const handleSend = async () => {
    if (!file) return
    setUploading(true)
    try {
      await onUpload(file, caption)
    } finally {
      setUploading(false)
    }
  }

  const clearFile = () => {
    setFile(null)
    setPreview(null)
    setCaption('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const isImage = file ? isImageType(file.type) : false

  return (
    <div className="border-t border-stone-200 bg-white p-4">
      {!file ? (
        <label
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors ${
            dragOver
              ? 'border-brand-400 bg-brand-50'
              : 'border-stone-300 hover:border-brand-400'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <Upload className="w-8 h-8 text-stone-400 mb-2" />
          <span className="text-sm text-stone-500">
            Drop a file here or click to select
          </span>
          <span className="text-xs text-stone-400 mt-1">
            Images (10MB) or documents (25MB): PDF, Word, Excel, CSV, TXT
          </span>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_STRING}
            onChange={handleInputChange}
            className="hidden"
          />
        </label>
      ) : (
        <div className="space-y-3">
          {/* Preview */}
          <div className="relative inline-block">
            {isImage && preview ? (
              <img
                src={preview}
                alt="Upload preview"
                className="max-h-48 rounded-lg object-cover"
              />
            ) : (
              <div className="flex items-center gap-3 bg-stone-50 border border-stone-200 rounded-lg p-4 pr-8">
                {getFileIcon(file.type)}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-stone-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
            )}
            <button
              onClick={clearFile}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-stone-700 text-white flex items-center justify-center hover:bg-stone-800"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* File info for images */}
          {isImage && (
            <p className="text-xs text-stone-500">
              {file.name} ({formatFileSize(file.size)})
            </p>
          )}

          {/* Caption input */}
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption (optional)"
            className="w-full text-sm border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              disabled={uploading}
              className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : isImage ? (
                'Send Photo'
              ) : (
                'Send File'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
