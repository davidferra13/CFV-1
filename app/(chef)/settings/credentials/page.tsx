// Credentials Settings Page - manage public professional story.
// Career timeline, community impact, and private resume.

import type { Metadata } from 'next'
import Link from 'next/link'
import { listWorkHistoryEntries, getPrivateResumeStatus } from '@/lib/credentials/actions'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { WorkHistoryEditor } from '@/components/credentials/work-history-editor'
import { CredentialProfileForm } from '@/components/credentials/credential-profile-form'

export const metadata: Metadata = { title: 'Credentials' }

export default async function CredentialsSettingsPage() {
  const chef = await requireChef()
  const db: any = createServerClient()

  const [workHistory, resumeStatus, chefResult, charityResult] = await Promise.all([
    listWorkHistoryEntries(),
    getPrivateResumeStatus(),
    db
      .from('chefs')
      .select('public_charity_percent, public_charity_note, show_resume_available_note')
      .eq('id', chef.id)
      .single(),
    db.from('charity_hours').select('hours').eq('chef_id', chef.id),
  ])

  const charityRows: Array<{ hours: number }> = charityResult.data ?? []
  const totalCharityHours = charityRows.reduce((sum, r) => sum + Number(r.hours), 0)

  const chefSettings = chefResult.data ?? {
    public_charity_percent: null,
    public_charity_note: null,
    show_resume_available_note: false,
  }

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Credentials</h1>
        <p className="text-stone-400 mt-1 text-sm">
          Manage the professional story that appears on your public profile.
        </p>
      </div>

      {/* Career Timeline */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">Career Timeline</h2>
          <p className="text-stone-400 text-sm mt-0.5">
            Add roles, positions, and career milestones. Each entry can include a brief summary and
            public-safe notable credits.
          </p>
        </div>
        <WorkHistoryEditor initialEntries={workHistory} />
      </section>

      {/* Awards link */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">Awards and Accomplishments</h2>
          <p className="text-stone-400 text-sm mt-0.5">
            Awards, certifications, press features, and other achievements are managed in
            Professional Development. Public achievements appear automatically on your credentials
            panel.
          </p>
        </div>
        <Link
          href="/settings/professional"
          className="inline-flex items-center gap-2 text-sm text-stone-400 hover:text-stone-200 underline transition-colors"
        >
          Go to Professional Development
        </Link>
      </section>

      {/* Community Impact and Private Resume */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">Community Impact and Resume</h2>
          <p className="text-stone-400 text-sm mt-0.5">
            Set a public statement about your charitable giving and keep a private resume on file.
          </p>
        </div>

        {totalCharityHours > 0 && (
          <div className="rounded-xl border border-stone-700 bg-stone-900/60 px-5 py-3 flex items-center gap-4">
            <div>
              <p className="text-xs text-stone-500">Logged volunteer hours</p>
              <p className="text-2xl font-bold text-stone-100">
                {Math.round(totalCharityHours * 100) / 100}
              </p>
            </div>
            <Link
              href="/charity/hours"
              className="ml-auto text-xs text-stone-500 hover:text-stone-300 underline transition-colors"
            >
              Manage logs
            </Link>
          </div>
        )}

        <CredentialProfileForm
          initialValues={{
            publicCharityPercent: chefSettings.public_charity_percent ?? null,
            publicCharityNote: chefSettings.public_charity_note ?? null,
            showResumeAvailableNote: chefSettings.show_resume_available_note ?? false,
          }}
          resumeStatus={resumeStatus}
        />
      </section>
    </div>
  )
}
