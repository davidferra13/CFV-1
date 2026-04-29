'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  auditCulinaryLanguage,
  type CulinaryLanguageAuditSurface,
} from '@/lib/culinary-dictionary/language-auditor'
import type { CulinaryDictionaryTerm } from '@/lib/culinary-dictionary/types'

type LanguageAuditorPanelProps = {
  terms: CulinaryDictionaryTerm[]
}

const SAMPLE_TEXT =
  'Crispy seasonal vegetables with rich aioli. Prep garnish as needed and cook until done.'

export function LanguageAuditorPanel({ terms }: LanguageAuditorPanelProps) {
  const [text, setText] = useState(SAMPLE_TEXT)
  const [surface, setSurface] = useState<CulinaryLanguageAuditSurface>('menu')
  const audit = useMemo(
    () => auditCulinaryLanguage({ text, dictionaryTerms: terms, surface }),
    [surface, terms, text]
  )

  return (
    <section className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">Menu Language Auditor</h2>
          <p className="mt-1 max-w-2xl text-sm text-stone-400">
            Paste menu or staff prep language to check it against approved vocabulary. This does not
            generate copy.
          </p>
        </div>
        <select
          value={surface}
          onChange={(event) => setSurface(event.target.value as CulinaryLanguageAuditSurface)}
          className="min-h-[44px] rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100"
        >
          <option value="menu">Menu</option>
          <option value="staff_prep">Staff prep</option>
        </select>
      </div>

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={4}
        className="mt-4 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-600"
      />

      <div className="mt-4 grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="rounded-lg border border-stone-800 bg-stone-950 p-3">
          <p className="text-2xl font-semibold text-stone-100">{audit.findings.length}</p>
          <p className="mt-1 text-xs text-stone-500">Findings</p>
          <p className="mt-3 text-sm text-stone-300">
            {audit.matchedTerms.length} controlled term{audit.matchedTerms.length === 1 ? '' : 's'} matched.
          </p>
        </div>

        <div className="space-y-2">
          {audit.findings.length === 0 ? (
            <p className="rounded-lg border border-stone-800 bg-stone-950 p-3 text-sm text-stone-400">
              No language findings for this text.
            </p>
          ) : (
            audit.findings.slice(0, 8).map((finding) => (
              <div key={finding.id} className="rounded-lg border border-stone-800 bg-stone-950 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-stone-200">{finding.message}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      finding.severity === 'critical'
                        ? 'bg-red-950 text-red-300'
                        : finding.severity === 'caution'
                          ? 'bg-amber-950 text-amber-300'
                          : 'bg-stone-800 text-stone-300'
                    }`}
                  >
                    {finding.severity}
                  </span>
                </div>
                <p className="mt-1 text-xs text-stone-500">{finding.hint}</p>
                {finding.href && (
                  <Link
                    href={finding.href}
                    className="mt-2 inline-flex text-xs font-medium text-brand-400 hover:text-brand-300"
                  >
                    Search dictionary
                  </Link>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
