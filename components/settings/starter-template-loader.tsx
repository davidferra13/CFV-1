'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  getStarterTemplates,
  hasLoadedStarterTemplates,
  loadStarterTemplates,
  getStarterTemplateCount,
} from '@/lib/archetypes/template-actions'
import {
  TEMPLATE_TYPE_LABELS,
  type StarterTemplate,
  type StarterTemplateType,
} from '@/lib/archetypes/starter-templates'

// ---- Template Preview Modal -------------------------------------------------

function TemplatePreviewModal({
  template,
  onClose,
}: {
  template: StarterTemplate
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {template.name}
            </h3>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {TEMPLATE_TYPE_LABELS[template.templateType]}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {template.subject && (
          <div className="mb-3">
            <span className="text-xs font-medium uppercase text-zinc-400 dark:text-zinc-500">
              Subject
            </span>
            <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{template.subject}</p>
          </div>
        )}

        <div>
          <span className="text-xs font-medium uppercase text-zinc-400 dark:text-zinc-500">
            Body
          </span>
          <pre className="mt-1 whitespace-pre-wrap rounded border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {template.body}
          </pre>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Template Card ----------------------------------------------------------

function TemplateCard({
  template,
  onPreview,
}: {
  template: StarterTemplate
  onPreview: (t: StarterTemplate) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {template.name}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {TEMPLATE_TYPE_LABELS[template.templateType]}
        </p>
      </div>
      <button
        onClick={() => onPreview(template)}
        className="ml-2 shrink-0 rounded px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
      >
        Preview
      </button>
    </div>
  )
}

// ---- Main Component ---------------------------------------------------------

export function StarterTemplateLoader() {
  const [templates, setTemplates] = useState<StarterTemplate[]>([])
  const [loaded, setLoaded] = useState<boolean | null>(null)
  const [loadedCount, setLoadedCount] = useState(0)
  const [previewTemplate, setPreviewTemplate] = useState<StarterTemplate | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const [tpls, isLoaded, count] = await Promise.all([
          getStarterTemplates(),
          hasLoadedStarterTemplates(),
          getStarterTemplateCount(),
        ])
        if (!cancelled) {
          setTemplates(tpls)
          setLoaded(isLoaded)
          setLoadedCount(count)
        }
      } catch (err) {
        console.error('[StarterTemplateLoader] init error:', err)
        if (!cancelled) {
          setError('Could not load template information')
        }
      }
    }

    init()
    return () => {
      cancelled = true
    }
  }, [])

  function handleLoad() {
    setError(null)
    setSuccessMessage(null)

    startTransition(async () => {
      try {
        const result = await loadStarterTemplates()
        if (result.skipped) {
          setSuccessMessage('Templates were already loaded.')
        } else {
          setSuccessMessage(`Loaded ${result.loaded} starter templates.`)
        }
        setLoaded(true)
        setLoadedCount(result.loaded)
      } catch (err) {
        console.error('[StarterTemplateLoader] load error:', err)
        setError('Failed to load templates. Please try again.')
      }
    })
  }

  // Group templates by type for display
  const grouped = templates.reduce(
    (acc, t) => {
      const key = t.templateType
      if (!acc[key]) acc[key] = []
      acc[key].push(t)
      return acc
    },
    {} as Record<StarterTemplateType, StarterTemplate[]>
  )

  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Starter Templates
          </h3>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Pre-built contracts, emails, and invoice memos tailored to your business type.
          </p>
        </div>

        {/* Status indicator */}
        {loaded === true && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-200 dark:bg-green-900/30 dark:text-green-400">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Loaded ({loadedCount})
          </span>
        )}
        {loaded === false && (
          <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            Not loaded
          </span>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-200 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Success message */}
      {successMessage && (
        <div className="mb-3 rounded-md bg-green-50 p-3 text-sm text-green-200 dark:bg-green-900/20 dark:text-green-400">
          {successMessage}
        </div>
      )}

      {/* Template list grouped by type */}
      {templates.length > 0 && (
        <div className="mb-4 space-y-4">
          {(Object.keys(grouped) as StarterTemplateType[]).map((type) => (
            <div key={type}>
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                {TEMPLATE_TYPE_LABELS[type]}
              </h4>
              <div className="space-y-2">
                {grouped[type].map((t, i) => (
                  <TemplateCard
                    key={`${t.archetypeId}-${t.templateType}-${i}`}
                    template={t}
                    onPreview={setPreviewTemplate}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load button */}
      {loaded === false && (
        <button
          onClick={handleLoad}
          disabled={isPending || templates.length === 0}
          className="w-full rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-amber-600 dark:hover:bg-amber-500"
        >
          {isPending ? 'Loading templates...' : `Load ${templates.length} Templates`}
        </button>
      )}

      {/* Preview modal */}
      {previewTemplate && (
        <TemplatePreviewModal template={previewTemplate} onClose={() => setPreviewTemplate(null)} />
      )}
    </div>
  )
}
