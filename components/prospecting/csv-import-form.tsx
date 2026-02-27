'use client'

import { useState, useTransition, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { importProspectsFromCSV } from '@/lib/prospecting/pipeline-actions'
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, Download } from 'lucide-react'

export function CSVImportForm() {
  const [csvText, setCsvText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [preview, setPreview] = useState<string[][]>([])
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{
    success: boolean
    imported?: number
    skipped?: number
    total?: number
    error?: string
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setResult(null)

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setCsvText(text)
      generatePreview(text)
    }
    reader.readAsText(file)
  }

  function handleTextPaste(text: string) {
    setCsvText(text)
    setFileName(null)
    setResult(null)
    generatePreview(text)
  }

  function generatePreview(text: string) {
    const lines = text.split('\n').filter((l) => l.trim())
    const previewRows = lines.slice(0, 6).map((line) => {
      // Simple CSV split (doesn't handle all edge cases but good for preview)
      return line.split(',').map((cell) => cell.trim().replace(/^["']|["']$/g, ''))
    })
    setPreview(previewRows)
  }

  function handleImport() {
    if (!csvText.trim() || isPending) return
    setResult(null)
    startTransition(async () => {
      try {
        const res = await importProspectsFromCSV(csvText)
        setResult({
          success: true,
          imported: res.imported,
          skipped: res.skipped,
          total: res.total,
        })
      } catch (err) {
        setResult({
          success: false,
          error: err instanceof Error ? err.message : 'Import failed',
        })
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Upload card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-brand-500" />
            Upload CSV
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File upload zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-stone-700 rounded-lg p-8 text-center cursor-pointer hover:border-brand-500 hover:bg-stone-800/50 transition-colors"
          >
            <FileText className="h-10 w-10 text-stone-500 mx-auto mb-3" />
            {fileName ? (
              <p className="text-sm text-stone-200 font-medium">{fileName}</p>
            ) : (
              <>
                <p className="text-sm text-stone-300">Click to upload a CSV file</p>
                <p className="text-xs text-stone-500 mt-1">or paste CSV text below</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Or paste text */}
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Or paste CSV text directly:
            </label>
            <textarea
              value={csvText}
              onChange={(e) => handleTextPaste(e.target.value)}
              placeholder={`name,phone,email,city,state,category\nCape Cod Yacht Club,(508) 555-1234,events@ccyc.com,Hyannis,MA,yacht_club\n...`}
              className="w-full h-40 rounded-lg border border-stone-600 px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              disabled={isPending}
            />
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="rounded-lg bg-stone-800 border border-stone-700 overflow-hidden">
              <div className="px-3 py-2 border-b border-stone-700">
                <span className="text-xs font-medium text-stone-400">
                  Preview (first {Math.min(preview.length - 1, 5)} rows)
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-stone-900">
                      {preview[0]?.map((header, i) => (
                        <th key={i} className="px-3 py-2 text-left text-stone-400 font-medium">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(1).map((row, i) => (
                      <tr key={i} className="border-t border-stone-800">
                        {row.map((cell, j) => (
                          <td key={j} className="px-3 py-1.5 text-stone-300 max-w-[200px] truncate">
                            {cell || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <Button
            onClick={handleImport}
            disabled={!csvText.trim() || isPending}
            className="flex items-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Import Prospects
              </>
            )}
          </Button>

          {/* Result */}
          {result && (
            <div
              className={`p-4 rounded-lg text-sm flex items-start gap-3 ${
                result.success
                  ? 'bg-green-950 border border-green-200 text-green-800'
                  : 'bg-red-950 border border-red-200 text-red-800'
              }`}
            >
              {result.success ? (
                <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              )}
              <div>
                {result.success ? (
                  <>
                    <p className="font-medium">Import complete!</p>
                    <p className="mt-1">
                      {result.imported} prospects imported
                      {(result.skipped ?? 0) > 0 && ` (${result.skipped} duplicates skipped)`}
                    </p>
                  </>
                ) : (
                  <p>{result.error}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Column mapping guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Supported Column Names</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-1 text-xs">
            <div>
              <span className="text-stone-500">Name:</span>{' '}
              <span className="text-stone-300 font-mono">name, business, company</span>
            </div>
            <div>
              <span className="text-stone-500">Phone:</span>{' '}
              <span className="text-stone-300 font-mono">phone, telephone</span>
            </div>
            <div>
              <span className="text-stone-500">Email:</span>{' '}
              <span className="text-stone-300 font-mono">email, email_address</span>
            </div>
            <div>
              <span className="text-stone-500">Website:</span>{' '}
              <span className="text-stone-300 font-mono">website, url</span>
            </div>
            <div>
              <span className="text-stone-500">Address:</span>{' '}
              <span className="text-stone-300 font-mono">address, street</span>
            </div>
            <div>
              <span className="text-stone-500">City:</span>{' '}
              <span className="text-stone-300 font-mono">city</span>
            </div>
            <div>
              <span className="text-stone-500">State:</span>{' '}
              <span className="text-stone-300 font-mono">state</span>
            </div>
            <div>
              <span className="text-stone-500">ZIP:</span>{' '}
              <span className="text-stone-300 font-mono">zip, zipcode, postal</span>
            </div>
            <div>
              <span className="text-stone-500">Region:</span>{' '}
              <span className="text-stone-300 font-mono">region, area</span>
            </div>
            <div>
              <span className="text-stone-500">Contact:</span>{' '}
              <span className="text-stone-300 font-mono">contact, contact_name</span>
            </div>
            <div>
              <span className="text-stone-500">Title:</span>{' '}
              <span className="text-stone-300 font-mono">title, role</span>
            </div>
            <div>
              <span className="text-stone-500">Category:</span>{' '}
              <span className="text-stone-300 font-mono">category</span>
            </div>
          </div>
          <p className="text-xs text-stone-500 mt-4">
            Column names are case-insensitive and spaces are converted to underscores. The first row
            must be headers. The &ldquo;name&rdquo; column is required. Duplicates are automatically
            skipped.
          </p>
        </CardContent>
      </Card>

      {/* Download template */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Download className="h-5 w-5 text-stone-400" />
            <div>
              <p className="text-sm text-stone-300 font-medium">Need a template?</p>
              <p className="text-xs text-stone-500">Start with this CSV header row:</p>
              <code className="text-xs text-brand-400 mt-1 block font-mono">
                name,phone,email,website,address,city,state,zip,region,contact_name,title,category,description
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
