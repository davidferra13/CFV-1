'use client'

// Cannabis Portal — About Page Components
// Collapsible accordion sections, styled tables, timeline, feature status badges.
// All themed to the dark green cannabis aesthetic.

import { useState, type ReactNode } from 'react'

// ─── Collapsible Accordion Section ───────────────────
interface AboutSectionProps {
  title: string
  icon: string
  children: ReactNode
  defaultOpen?: boolean
}

export function AboutSection({ title, icon, children, defaultOpen = false }: AboutSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: 'linear-gradient(135deg, #0f1a0f 0%, #131f14 100%)',
        border: `1px solid ${isOpen ? 'rgba(139, 195, 74, 0.25)' : 'rgba(74, 124, 78, 0.2)'}`,
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-3 px-5 py-4 text-left cursor-pointer group"
      >
        <span className="text-lg shrink-0">{icon}</span>
        <span className="flex-1 text-sm font-semibold" style={{ color: '#e8f5e9' }}>
          {title}
        </span>
        <span
          className="text-xs transition-transform duration-200"
          style={{
            color: '#4a7c4e',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          &#x25BE;
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isOpen ? 'max-h-[6000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-5 pb-5" style={{ borderTop: '1px solid rgba(74, 124, 78, 0.1)' }}>
          <div className="pt-4 space-y-3">{children}</div>
        </div>
      </div>
    </div>
  )
}

// ─── Styled Paragraph ────────────────────────────────
export function AboutParagraph({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm leading-relaxed" style={{ color: '#6aaa6e' }}>
      {children}
    </p>
  )
}

// ─── External Link (opens new tab) ───────────────────
export function AboutExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm font-medium underline underline-offset-2 transition-opacity hover:opacity-80"
      style={{ color: '#8bc34a' }}
    >
      {children}
      <span className="text-xs">&#x2197;</span>
    </a>
  )
}

// ─── Inline Highlight (for statute numbers, dates, etc.) ─
export function AboutHighlight({ children }: { children: ReactNode }) {
  return (
    <span
      className="px-1.5 py-0.5 rounded text-xs font-mono font-medium"
      style={{ background: 'rgba(139, 195, 74, 0.12)', color: '#8bc34a' }}
    >
      {children}
    </span>
  )
}

// ─── Task Force Member Table ─────────────────────────
interface MemberRow {
  name: string
  organization: string
  seat: string
}

export function AboutMemberTable({ members }: { members: MemberRow[] }) {
  return (
    <div
      className="overflow-x-auto rounded-lg"
      style={{ border: '1px solid rgba(74, 124, 78, 0.15)' }}
    >
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: '#0a130a' }}>
            <th
              className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wider"
              style={{ color: '#4a7c4e' }}
            >
              Name
            </th>
            <th
              className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wider"
              style={{ color: '#4a7c4e' }}
            >
              Organization
            </th>
            <th
              className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wider"
              style={{ color: '#4a7c4e' }}
            >
              Seat
            </th>
          </tr>
        </thead>
        <tbody>
          {members.map((m, i) => (
            <tr
              key={m.name}
              style={{
                background: i % 2 === 0 ? 'rgba(15, 26, 15, 0.5)' : 'rgba(10, 19, 10, 0.5)',
                borderTop: '1px solid rgba(74, 124, 78, 0.08)',
              }}
            >
              <td className="px-3 py-2 font-medium" style={{ color: '#e8f5e9' }}>
                {m.name}
              </td>
              <td className="px-3 py-2" style={{ color: '#6aaa6e' }}>
                {m.organization || '—'}
              </td>
              <td className="px-3 py-2 text-xs" style={{ color: '#4a7c4e' }}>
                {m.seat}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Legislative Timeline ────────────────────────────
interface TimelineEvent {
  date: string
  description: string
  detail?: string
}

export function AboutTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="relative pl-4 space-y-4">
      {/* Vertical line */}
      <div
        className="absolute left-[7px] top-2 bottom-2 w-px"
        style={{ background: 'rgba(74, 124, 78, 0.3)' }}
      />
      {events.map((event, i) => (
        <div key={i} className="relative flex gap-3">
          {/* Dot */}
          <div
            className="absolute left-[-13px] top-1.5 h-2.5 w-2.5 rounded-full shrink-0"
            style={{
              background: i === events.length - 1 ? '#8bc34a' : '#4a7c4e',
              boxShadow: i === events.length - 1 ? '0 0 8px rgba(139, 195, 74, 0.4)' : 'none',
            }}
          />
          <div>
            <p className="text-xs font-mono font-medium" style={{ color: '#8bc34a' }}>
              {event.date}
            </p>
            <p className="text-sm font-medium mt-0.5" style={{ color: '#e8f5e9' }}>
              {event.description}
            </p>
            {event.detail && (
              <p className="text-xs mt-1 leading-relaxed" style={{ color: '#4a7c4e' }}>
                {event.detail}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Feature Status List ─────────────────────────────
interface FeatureItem {
  label: string
  status: 'live' | 'planned' | 'coming'
}

const statusStyles = {
  live: { bg: 'rgba(139, 195, 74, 0.15)', color: '#8bc34a', text: 'Live' },
  planned: { bg: 'rgba(230, 168, 98, 0.15)', color: '#e6a862', text: 'Planned' },
  coming: { bg: 'rgba(74, 124, 78, 0.15)', color: '#4a7c4e', text: 'Coming' },
}

export function AboutFeatureStatus({ items }: { items: FeatureItem[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const s = statusStyles[item.status]
        return (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-lg px-3 py-2"
            style={{ background: '#0a130a', border: '1px solid rgba(74, 124, 78, 0.1)' }}
          >
            <span className="text-sm" style={{ color: '#6aaa6e' }}>
              {item.label}
            </span>
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider"
              style={{ background: s.bg, color: s.color }}
            >
              {s.text}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Link List (for the sources panel) ───────────────
interface LinkItem {
  label: string
  href: string
}

export function AboutLinkGroup({ title, links }: { title: string; links: LinkItem[] }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#4a7c4e' }}>
        {title}
      </p>
      <div className="space-y-1">
        {links.map((link) => (
          <div key={link.href}>
            <AboutExternalLink href={link.href}>{link.label}</AboutExternalLink>
          </div>
        ))}
      </div>
    </div>
  )
}
