// Cannabis Compliance & Dosing System — PLACEHOLDER
// This page exists to make it impossible to forget that the full compliance
// system hasn't been built yet. It is intentionally conspicuous.

import { requireChef } from '@/lib/auth/get-user'
import { hasCannabisAccess } from '@/lib/chef/cannabis-actions'
import { redirect } from 'next/navigation'
import {
  CannabisPortalHeader,
  CannabisPageWrapper,
} from '@/components/cannabis/cannabis-portal-header'
import { CompliancePlaceholderClient } from './compliance-placeholder-client'

export default async function CannabisCompliancePage() {
  const user = await requireChef()
  const hasAccess = await hasCannabisAccess(user.id)
  if (!hasAccess) redirect('/dashboard')

  return (
    <CannabisPageWrapper>
      <div className="px-6 py-8 max-w-3xl mx-auto">
        <CannabisPortalHeader
          title="Compliance & Dosing System"
          subtitle="Phase 2 — Not yet built"
          backHref="/cannabis"
          backLabel="Cannabis Hub"
        />

        {/* THE CONSPICUOUS PLACEHOLDER */}
        <div
          className="rounded-xl mb-6 overflow-hidden"
          style={{
            border: '2px solid #e6a862',
            boxShadow: '0 0 30px rgba(230, 168, 98, 0.3)',
          }}
        >
          {/* Banner */}
          <div
            className="px-5 py-4"
            style={{ background: 'linear-gradient(135deg, #2a1a00 0%, #3a2200 100%)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">⚠️</span>
              <h2 className="text-lg font-bold" style={{ color: '#e6a862' }}>
                THIS PAGE IS A PLACEHOLDER
              </h2>
            </div>
            <p className="text-sm font-medium" style={{ color: '#ffcc80' }}>
              The full cannabis compliance and dosing system has not been built yet.
            </p>
            <p className="text-sm mt-1" style={{ color: '#e6a862' }}>
              You said you&rsquo;d describe it. Now would be a good time.
            </p>
          </div>

          {/* What's missing checklist */}
          <div
            className="px-5 py-4"
            style={{ background: '#1a1200', borderTop: '1px solid rgba(230, 168, 98, 0.2)' }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: '#e6a862' }}
            >
              This system requires (at minimum):
            </p>
            <ul className="space-y-1.5">
              {[
                'SOPs — exact methods for how each cannabis dinner is conducted',
                'Dosing tracker — per-guest THC/CBD amounts, form (edible, tincture, infused), timing',
                'Extract tracking — what extracts were used, concentration, batch source',
                'Photo documentation — before/after photos of dishes, timestamped',
                "Guest consent forms — digital acknowledgment of dosing with each guest's details",
                'Maine state compliance log — the format you helped define, structured per your law',
                'Print-out generation — one-page compliance sheet that fits on a single page',
                'Receipt photo requirement — timestamped store receipt upload within 24 hours',
                'SOP enforcement — checklist that must be completed before event is marked compliant',
                'Carry-forward ingredient tracking — cannabis-specific ingredient logging across events',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs" style={{ color: '#d4a055' }}>
                  <span className="mt-0.5 shrink-0" style={{ color: '#e6a862' }}>
                    □
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Working notes area — actually useful even as placeholder */}
        <div
          className="rounded-xl p-5"
          style={{
            background: '#0f1a0f',
            border: '1px solid rgba(74, 124, 78, 0.2)',
          }}
        >
          <h3 className="text-sm font-semibold mb-1" style={{ color: '#e8f5e9' }}>
            Compliance Notes Scratchpad
          </h3>
          <p className="text-xs mb-4" style={{ color: '#4a7c4e' }}>
            Jot down your compliance methods here while you work. This is saved and will feed into
            Phase 2 when you&rsquo;re ready to build it out.
          </p>
          <CompliancePlaceholderClient />
        </div>

        {/* Phase 2 hint */}
        <p className="text-center text-xs mt-6" style={{ color: '#2d5a30' }}>
          When you&rsquo;re ready to build Phase 2, tell the developer:{' '}
          <span style={{ color: '#4a7c4e' }}>
            &ldquo;Build the cannabis compliance system&rdquo;
          </span>
        </p>
      </div>
    </CannabisPageWrapper>
  )
}
