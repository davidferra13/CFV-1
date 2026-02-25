// Cannabis Dining Hub — Chef Portal
// The main entry point for the cannabis tier. Only visible to cannabis-tier chefs.

import { getCannabisEvents } from '@/lib/chef/cannabis-actions'
import Link from 'next/link'
import {
  CannabisPortalHeader,
  CannabisPageWrapper,
} from '@/components/cannabis/cannabis-portal-header'

export default async function CannabisHubPage() {
  const events = await getCannabisEvents().catch(() => [])
  const eventCount = events.length
  const recentEvents = events.filter(
    (e: any) => !['completed', 'cancelled'].includes(e.status ?? '')
  ).length

  return (
    <CannabisPageWrapper>
      <div className="px-6 py-8 max-w-3xl mx-auto">
        <CannabisPortalHeader title="Cannabis Dining" subtitle="Private tier · invitation only" />

        {/* Hub Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <HubCard
            href="/cannabis/events"
            icon="🍃"
            label="Events"
            value={eventCount}
            sublabel={`${recentEvents} active`}
            glow="rgba(74, 124, 78, 0.25)"
          />
          <HubCard
            href="/cannabis/ledger"
            icon="💚"
            label="Ledger"
            value={null}
            sublabel="All cannabis financials"
            glow="rgba(45, 122, 90, 0.25)"
          />
          <HubCard
            href="/cannabis/invite"
            icon="✉️"
            label="Invite"
            value={null}
            sublabel="Bring someone in"
            glow="rgba(90, 122, 45, 0.25)"
          />
          <HubCard
            href="/cannabis/rsvps"
            icon="\u{1F4CB}"
            label="RSVPs"
            value={null}
            sublabel="Guest participation & intake"
            glow="rgba(63, 125, 89, 0.26)"
          />
          <HubCard
            href="/cannabis/compliance"
            icon="⚠️"
            label="Compliance"
            value={null}
            sublabel="Needs your attention"
            glow="rgba(180, 100, 30, 0.35)"
            alert
          />
        </div>

        {/* Quick info panel */}
        <div
          className="rounded-xl p-5"
          style={{
            background: 'linear-gradient(135deg, #0a130a 0%, #0f1a0f 100%)',
            border: '1px solid rgba(74, 124, 78, 0.15)',
          }}
        >
          <p
            className="text-xs font-semibold mb-3 uppercase tracking-wider"
            style={{ color: '#4a7c4e' }}
          >
            How the Portal Works
          </p>
          <ul className="space-y-2">
            {[
              'Cannabis events are tracked separately from your regular dining calendar.',
              'Invite clients directly from this portal — invitations are reviewed before sending.',
              'The ledger captures all cannabis event revenue and expenses in one place.',
              'Compliance & dosing system coming in Phase 2 — build it before your next event.',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#6aaa6e' }}>
                <span className="mt-0.5 shrink-0" style={{ color: '#4a7c4e' }}>
                  ·
                </span>
                <span>{item}</span>
              </li>
            ))}
            <li className="flex items-start gap-2 text-sm" style={{ color: '#6aaa6e' }}>
              <span className="mt-0.5 shrink-0" style={{ color: '#4a7c4e' }}>
                ·
              </span>
              <span>
                This portal was built by a member of Maine&rsquo;s Cannabis Hospitality Task Force.{' '}
                <Link
                  href="/cannabis/about"
                  className="underline underline-offset-2"
                  style={{ color: '#8bc34a' }}
                >
                  Learn the full story &rarr;
                </Link>
              </span>
            </li>
          </ul>
        </div>
      </div>
    </CannabisPageWrapper>
  )
}

function HubCard({
  href,
  icon,
  label,
  value,
  sublabel,
  glow,
  alert,
}: {
  href: string
  icon: string
  label: string
  value: number | null
  sublabel: string
  glow: string
  alert?: boolean
}) {
  return (
    <Link href={href} className="block group">
      <div
        className="rounded-xl p-5 h-full transition-all duration-200 group-hover:scale-[1.02]"
        style={{
          background: 'linear-gradient(135deg, #0f1a0f 0%, #131f14 100%)',
          border: `1px solid ${alert ? 'rgba(180, 100, 30, 0.4)' : 'rgba(74, 124, 78, 0.2)'}`,
          boxShadow: `0 4px 20px ${glow}`,
        }}
      >
        <div className="text-2xl mb-3">{icon}</div>
        <p className="text-base font-semibold" style={{ color: '#e8f5e9' }}>
          {value !== null ? (
            <>
              {value}{' '}
              <span className="text-sm font-normal" style={{ color: '#6aaa6e' }}>
                {label}
              </span>
            </>
          ) : (
            label
          )}
        </p>
        <p className="text-xs mt-0.5" style={{ color: alert ? '#e6a862' : '#4a7c4e' }}>
          {sublabel}
        </p>
      </div>
    </Link>
  )
}
