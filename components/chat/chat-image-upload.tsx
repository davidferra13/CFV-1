'use client'

import { useState } from 'react'
import { X, Upload, Loader2 } from 'lucide-react'

interface ChatImageUploadProps {
  onUpload: (file: File, caption: string) => Promise<void>
  onCancel: () => void
}

export function ChatImageUpload({ onUpload, onCancel }: ChatImageUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    setFile(selected)
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(selected)
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

  return (
    <div className="border-t border-stone-200 bg-white p-4">
      {!file ? (
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-stone-300 rounded-lg p-6 cursor-pointer hover:border-brand-400 transition-colors">
          <Upload className="w-8 h-8 text-stone-400 mb-2" />
          <span className="text-sm text-stone-500">Click to select an image</span>
          <span className="text-xs text-stone-400 mt-1">JPEG, PNG, WebP, HEIC - max 10MB</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      ) : (
        <div className="space-y-3">
          {/* Preview */}
          <div className="relative inline-block">
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt="Upload preview"
                className="max-h-48 rounded-lg object-cover"
              />
            )}
            <button
              onClick={() => {
                setFile(null)
                setPreview(null)
                setCaption('')
              }}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-stone-700 text-white flex items-center justify-center hover:bg-stone-800"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* File info */}
          <p className="text-xs text-stone-500">
            {file.name} ({(file.size / 1024 / 1024).toFixed(1)}MB)
          </p>

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
              ) : (
                'Send Photo'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
