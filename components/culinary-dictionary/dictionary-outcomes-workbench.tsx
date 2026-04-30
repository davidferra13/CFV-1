'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import {
  analyzeDictionaryTextSurface,
  buildMenuPublishPreflight,
  buildPrepSpecificityChecklist,
  guardPublicInternalLanguage,
  type DictionarySurfaceKind,
} from '@/lib/culinary-dictionary/outcomes'
import type { CulinaryDictionaryTerm } from '@/lib/culinary-dictionary/types'

type DictionaryOutcomesWorkbenchProps = {
  terms: CulinaryDictionaryTerm[]
}

const SAMPLE_TEXT =
  'Crispy seasonal salad with aioli. Fire garnish as needed and hold cold until pickup.'

const SURFACE_OPTIONS: Array<{ value: DictionarySurfaceKind; label: string }> = [
  { value: 'menu_copy', label: 'Menu copy' },
  { value: 'staff_prep', label: 'Staff prep' },
  { value: 'ingredient_page', label: 'Ingredient page' },
  { value: 'public_page', label: 'Public page' },
  { value: 'recipe_note', label: 'Recipe note' },
]

export function DictionaryOutcomesWorkbench({ terms }: DictionaryOutcomesWorkbenchProps) {
  const [text, setText] = useState(SAMPLE_TEXT)
  const [surfaceKind, setSurfaceKind] = useState<DictionarySurfaceKind>('menu_copy')

  const surfaceAnalysis = useMemo(
    () =>
      analyzeDictionaryTextSurface(
        {
          id: 'dictionary-outcomes-workbench',
          title: 'Workbench text',
          surface: surfaceKind,
          text,
        },
        terms,
      ),
    [surfaceKind, terms, text],
  )
  const preflight = useMemo(
    () => buildMenuPublishPreflight({ text, terms }),
    [terms, text],
  )
  const guardFindings = useMemo(
    () => guardPublicInternalLanguage({ text, terms }),
    [terms, text],
  )
  const prepChecklist = useMemo(
    () => buildPrepSpecificityChecklist({ text, terms }),
    [terms, text],
  )

  return (
    <section className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">Dictionary Outcomes Workbench</h2>
          <p className="mt-1 max-w-2xl text-sm text-stone-400">
            Test how dictionary terms affect menu publishing, public copy, and staff prep. This
            only checks existing vocabulary and does not generate recipes or replacement copy.
          </p>
        </div>
        <select
          value={surfaceKind}
          onChange={(event) => setSurfaceKind(event.target.value as DictionarySurfaceKind)}
          className="min-h-[44px] rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100"
        >
          {SURFACE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={4}
        className="mt-4 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-600"
      />

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Panel title="Dictionary Everywhere">
          {surfaceAnalysis.matches.length === 0 ? (
            <EmptyLine>No controlled terms found in this text.</EmptyLine>
          ) : (
            <div className="flex flex-wrap gap-2">
              {surfaceAnalysis.matches.map((match) => (
                <Link
                  key={`${match.termId}-${match.source}-${match.matchedValue}`}
                  href={match.href}
                  className="rounded-full border border-stone-700 bg-stone-950 px-3 py-1 text-xs text-stone-200 hover:border-stone-500"
                >
                  {match.matchedValue}
                  <span className="ml-1 text-stone-500">as {match.canonicalName}</span>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Menu Publish Preflight">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={preflight.canPublish ? 'success' : 'error'}>
              {preflight.canPublish ? 'No blockers' : `${preflight.blockerCount} blocker`}
            </Badge>
            <Badge variant={preflight.warningCount > 0 ? 'warning' : 'success'}>
              {preflight.warningCount} warning{preflight.warningCount === 1 ? '' : 's'}
            </Badge>
          </div>
          <FindingList values={[...preflight.blockers, ...preflight.warnings].slice(0, 5)} />
          <p className="mt-3 text-xs text-stone-500">{preflight.nextSteps[0]}</p>
        </Panel>

        <Panel title="Public vs Internal Guard">
          {guardFindings.length === 0 ? (
            <EmptyLine>No internal language leak found.</EmptyLine>
          ) : (
            <div className="space-y-2">
              {guardFindings.slice(0, 5).map((finding) => (
                <div key={finding.id} className="rounded-lg border border-stone-800 bg-stone-950 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-stone-200">{finding.message}</p>
                    <Badge variant={finding.severity === 'critical' ? 'error' : finding.severity === 'caution' ? 'warning' : 'info'}>
                      {finding.severity}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-stone-500">{finding.nextStep}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Prep Specificity Builder">
          {prepChecklist.length === 0 ? (
            <EmptyLine>No prep specificity gaps found.</EmptyLine>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {prepChecklist.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-lg border border-stone-800 bg-stone-950 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-stone-200">{item.label}</p>
                    <Badge variant={item.severity === 'critical' ? 'error' : item.severity === 'caution' ? 'warning' : 'info'}>
                      {item.severity}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-stone-500">{item.nextStep}</p>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </section>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-4">
      <h3 className="text-sm font-semibold text-stone-100">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="text-sm text-stone-500">{children}</p>
}

function FindingList({ values }: { values: string[] }) {
  if (values.length === 0) return <EmptyLine>No findings.</EmptyLine>

  return (
    <ul className="mt-3 space-y-1 text-sm text-stone-400">
      {values.map((value) => (
        <li key={value}>{value}</li>
      ))}
    </ul>
  )
}
