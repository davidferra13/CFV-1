'use client'

// Loyalty Guide - Reusable Section Components
// Warm brand-themed collapsible sections for chef and client loyalty pages.
// Follows the same architecture as cannabis about-sections.tsx but with ChefFlow branding.

import { useState, type ReactNode } from 'react'

// ─── Collapsible Guide Section (summary always visible, detail expandable) ───
interface GuideSectionProps {
  title: string
  icon: string
  summary: string
  children: ReactNode
  defaultOpen?: boolean
}

export function GuideSection({
  title,
  icon,
  summary,
  children,
  defaultOpen = false,
}: GuideSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: isOpen
          ? 'linear-gradient(135deg, rgba(232, 143, 71, 0.06) 0%, rgba(28, 25, 23, 1) 100%)'
          : 'linear-gradient(135deg, #1c1917 0%, #1c1917 100%)',
        border: `1px solid ${isOpen ? 'rgba(232, 143, 71, 0.25)' : 'rgba(120, 113, 108, 0.2)'}`,
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="flex w-full items-start gap-3 px-5 py-4 text-left cursor-pointer group"
      >
        <span className="text-lg shrink-0 mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-stone-100">{title}</span>
          <span className="block text-sm text-stone-400 mt-1 leading-relaxed">{summary}</span>
        </div>
        <span
          className="text-xs transition-transform duration-200 mt-1.5 text-stone-500"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          &#x25BE;
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[50000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-5 pb-5 border-t border-stone-800/50">
          <div className="pt-4 space-y-4">{children}</div>
        </div>
      </div>
    </div>
  )
}

// ─── Paragraph ───
export function GuideParagraph({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-stone-400">{children}</p>
}

// ─── Strong/emphasis within paragraphs ───
export function GuideStrong({ children }: { children: ReactNode }) {
  return <strong className="text-stone-200 font-semibold">{children}</strong>
}

// ─── Stat callout (big number + label) ───
interface GuideStatProps {
  value: string
  label: string
}

export function GuideStat({ value, label }: GuideStatProps) {
  return (
    <div className="text-center px-3 py-2">
      <div className="text-xl font-bold text-brand-500">{value}</div>
      <div className="text-xs text-stone-500 mt-0.5">{label}</div>
    </div>
  )
}

export function GuideStatRow({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-stone-800/50 border border-stone-700/30">
      {children}
    </div>
  )
}

// ─── Table ───
interface GuideTableProps {
  headers: string[]
  rows: string[][]
}

export function GuideTable({ headers, rows }: GuideTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-stone-700/30">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-stone-800/80">
            {headers.map((h) => (
              <th
                key={h}
                className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-stone-500"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-stone-800/30' : 'bg-stone-900/30'}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`px-3 py-2 ${j === 0 ? 'text-stone-200 font-medium' : 'text-stone-400'}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Callout box (tip, insight, warning) ───
interface GuideCalloutProps {
  type?: 'tip' | 'insight' | 'warning'
  children: ReactNode
}

const calloutStyles = {
  tip: { border: 'rgba(232, 143, 71, 0.3)', bg: 'rgba(232, 143, 71, 0.06)', icon: '💡' },
  insight: { border: 'rgba(139, 195, 74, 0.3)', bg: 'rgba(139, 195, 74, 0.06)', icon: '📊' },
  warning: { border: 'rgba(239, 68, 68, 0.3)', bg: 'rgba(239, 68, 68, 0.06)', icon: '⚠️' },
}

export function GuideCallout({ type = 'tip', children }: GuideCalloutProps) {
  const s = calloutStyles[type]
  return (
    <div
      className="rounded-lg px-4 py-3 flex gap-3 items-start"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}
    >
      <span className="text-sm shrink-0 mt-0.5">{s.icon}</span>
      <div className="text-sm leading-relaxed text-stone-300">{children}</div>
    </div>
  )
}

// ─── Bullet list ───
export function GuideBullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-stone-400">
      <span className="mt-1.5 shrink-0 h-1.5 w-1.5 rounded-full bg-brand-500/60" />
      <span>{children}</span>
    </li>
  )
}

export function GuideBulletList({ children }: { children: ReactNode }) {
  return <ul className="space-y-2 pl-1">{children}</ul>
}

// ─── Sub-header within a section ───
export function GuideSubHeader({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 pt-2">{children}</p>
  )
}

// ─── Numbered ranking list ───
interface GuideRankItem {
  rank: number
  label: string
  description: string
}

export function GuideRankList({ items }: { items: GuideRankItem[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.rank}
          className="flex items-start gap-3 rounded-lg px-3 py-2.5 bg-stone-800/40 border border-stone-700/20"
        >
          <span className="shrink-0 h-6 w-6 rounded-full bg-brand-500/20 text-brand-500 text-xs font-bold flex items-center justify-center mt-0.5">
            {item.rank}
          </span>
          <div>
            <span className="text-sm font-medium text-stone-200">{item.label}</span>
            <span className="text-sm text-stone-400"> - {item.description}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Brand card (used for feature/program highlights on client page) ───
interface GuideBrandCardProps {
  icon: string
  title: string
  children: ReactNode
}

export function GuideBrandCard({ icon, title, children }: GuideBrandCardProps) {
  return (
    <div className="rounded-xl p-4 bg-stone-800/40 border border-stone-700/20">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-semibold text-stone-200">{title}</span>
      </div>
      <div className="text-sm text-stone-400 leading-relaxed">{children}</div>
    </div>
  )
}

// ─── Hero section for the client about page ───
interface GuideHeroProps {
  title: string
  subtitle: string
  children?: ReactNode
}

export function GuideHero({ title, subtitle, children }: GuideHeroProps) {
  return (
    <div
      className="rounded-2xl p-6 sm:p-8 text-center"
      style={{
        background:
          'linear-gradient(135deg, rgba(232, 143, 71, 0.12) 0%, rgba(28, 25, 23, 1) 60%, rgba(212, 117, 48, 0.08) 100%)',
        border: '1px solid rgba(232, 143, 71, 0.2)',
      }}
    >
      <h1 className="text-2xl sm:text-3xl font-bold text-stone-100">{title}</h1>
      <p className="text-sm sm:text-base text-stone-400 mt-2 max-w-xl mx-auto leading-relaxed">
        {subtitle}
      </p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
