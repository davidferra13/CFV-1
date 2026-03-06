'use client'

import { useMemo, useState } from 'react'
import { Settings } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import {
  FRONT_OF_HOUSE_THEMES,
  FRONT_OF_HOUSE_EVENT_TYPES,
  type FrontOfHouseEventType,
} from '@/lib/front-of-house/menuTemplateSchema'
import {
  generateAndSaveFrontOfHouseMenu,
  listFrontOfHouseTemplates,
} from '@/lib/front-of-house/menuGeneratorService'

type TemplateOption = {
  id: string
  name: string
  type: 'default' | 'holiday' | 'special_event'
  theme: string | null
}

type Props = {
  menuId: string
  menuStatus: 'draft' | 'shared' | 'locked' | 'archived'
  defaultHostName?: string | null
}

const EVENT_TYPE_LABELS: Record<FrontOfHouseEventType, string> = {
  regular_menu: 'Regular Menu',
  birthday: 'Birthday',
  bachelorette_party: 'Bachelorette Party',
  anniversary: 'Anniversary',
  holiday: 'Holiday',
  corporate_event: 'Corporate Event',
}

export function MenuGeneratorUI({ menuId, menuStatus, defaultHostName }: Props) {
  const [open, setOpen] = useState(false)
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [templateId, setTemplateId] = useState('')
  const [hostName, setHostName] = useState(defaultHostName ?? '')
  const [theme, setTheme] = useState('')
  const [specialNote, setSpecialNote] = useState('')
  const [customStamp, setCustomStamp] = useState('')
  const [eventType, setEventType] = useState<FrontOfHouseEventType>('regular_menu')
  const [previewEnabled, setPreviewEnabled] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [error, setError] = useState('')

  const isConfirmed = menuStatus === 'locked'
  const canExport = previewHtml.length > 0

  const themeOptions = useMemo(
    () => FRONT_OF_HOUSE_THEMES.map((value) => ({ label: value, value })),
    []
  )

  async function handleOpen() {
    setOpen(true)
    if (templates.length > 0 || loadingTemplates) return
    setLoadingTemplates(true)
    setError('')
    try {
      const rows = await listFrontOfHouseTemplates()
      setTemplates(
        rows.map((t) => ({
          id: t.id,
          name: t.name,
          type: t.type,
          theme: t.theme ?? null,
        }))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates')
    } finally {
      setLoadingTemplates(false)
    }
  }

  async function handleGenerate() {
    setIsGenerating(true)
    setError('')
    try {
      const result = await generateAndSaveFrontOfHouseMenu({
        menuId,
        templateId: templateId || undefined,
        context: {
          hostName: hostName || undefined,
          theme: theme || undefined,
          specialNote: specialNote || undefined,
          customStamp: customStamp || undefined,
          eventType,
        },
      })
      setPreviewHtml(result.html)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate menu')
    } finally {
      setIsGenerating(false)
    }
  }

  function handleDownload() {
    if (!canExport) return
    const blob = new Blob([previewHtml], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'front-of-house-menu.html'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  function handlePrint() {
    if (!canExport) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(previewHtml)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  if (!isConfirmed) return null

  return (
    <>
      <Button variant="secondary" size="sm" onClick={handleOpen}>
        <Settings className="h-4 w-4 mr-2" />
        FOH Menu Generator
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div className="w-full max-w-4xl rounded-xl border border-stone-700 bg-stone-900 p-5">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-stone-100">
                  Front-of-House Menu Generator
                </h3>
                <p className="text-xs text-stone-400 mt-1">
                  Pick a template, add optional event details, and generate a print-ready menu.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-stone-400 hover:text-stone-200 text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-stone-300">Template</label>
                <Select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  disabled={loadingTemplates}
                >
                  <option value="">
                    {loadingTemplates ? 'Loading templates...' : 'Auto-select'}
                  </option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-stone-300">Event Type</label>
                <Select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as FrontOfHouseEventType)}
                  options={FRONT_OF_HOUSE_EVENT_TYPES.map((value) => ({
                    value,
                    label: EVENT_TYPE_LABELS[value],
                  }))}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-stone-300">Host Name</label>
                <Input
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="Host name (optional)"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-stone-300">Theme</label>
                <Select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  options={[{ value: '', label: 'Auto-select' }, ...themeOptions]}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-stone-300">Special Note</label>
                <Textarea
                  value={specialNote}
                  onChange={(e) => setSpecialNote(e.target.value)}
                  rows={2}
                  placeholder='Optional note (example: "Celebrating 10 years!")'
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-stone-300">Custom Stamp Text</label>
                <Input
                  value={customStamp}
                  onChange={(e) => setCustomStamp(e.target.value)}
                  placeholder='Optional stamp (example: "Happy Birthday Sarah!")'
                />
              </div>

              <div className="md:col-span-2 flex items-center justify-between rounded-lg border border-stone-700 p-3">
                <div>
                  <p className="text-sm text-stone-100">Preview</p>
                  <p className="text-xs text-stone-500">
                    Toggle generated preview before print/download.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewEnabled((value) => !value)}
                  className={`rounded-md px-3 py-1 text-xs font-medium ${
                    previewEnabled
                      ? 'bg-emerald-900 text-emerald-300'
                      : 'bg-stone-800 text-stone-300'
                  }`}
                >
                  {previewEnabled ? 'On' : 'Off'}
                </button>
              </div>
            </div>

            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? 'Generating...' : 'Generate'}
              </Button>
              <Button variant="secondary" onClick={handleDownload} disabled={!canExport}>
                Download
              </Button>
              <Button variant="secondary" onClick={handlePrint} disabled={!canExport}>
                Print
              </Button>
            </div>

            {previewEnabled && canExport && (
              <div className="mt-4 h-[420px] overflow-hidden rounded-lg border border-stone-700">
                <iframe
                  title="Front-of-house menu preview"
                  className="h-full w-full border-0 bg-white"
                  srcDoc={previewHtml}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
