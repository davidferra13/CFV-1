import { type NextRequest, NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { sendBetaLifecycleEmail } from '@/lib/beta/lifecycle-email'
import {
  getBetaOnboardingProgressForChef,
  upsertBetaSignupTracker,
} from '@/lib/beta/signup-tracker'
import { createServerClient } from '@/lib/supabase/server'

const REMINDER_INTERVAL_HOURS = 48

function normalizeSignup(row: any) {
  if (!row) return null
  if (Array.isArray(row)) return row[0] ?? null
  return row
}

async function handleBetaOnboardingReminders(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const supabase: any = createServerClient({ admin: true })
  const reminderThreshold = new Date(
    Date.now() - REMINDER_INTERVAL_HOURS * 60 * 60 * 1000
  ).toISOString()

  const results = {
    scanned: 0,
    skipped: 0,
    remindersSent: 0,
    completionsSent: 0,
    errors: [] as string[],
  }

  const { data: trackerRows, error } = await supabase
    .from('beta_signup_trackers')
    .select('*, beta_signups(*)')
    .in('current_status', ['account_ready', 'onboarding'])
    .not('chef_id', 'is', null)
    .order('updated_at', { ascending: true })
    .limit(100)

  if (error) {
    console.error('[beta-onboarding-reminders] Query failed:', error)
    return NextResponse.json(
      { error: 'Failed to query beta onboarding reminders.' },
      { status: 500 }
    )
  }

  for (const trackerRow of trackerRows ?? []) {
    results.scanned += 1

    try {
      const signup = normalizeSignup((trackerRow as any).beta_signups)
      if (!signup || !(trackerRow as any).chef_id) {
        results.skipped += 1
        continue
      }

      const onboardingProgress = await getBetaOnboardingProgressForChef(
        (trackerRow as any).chef_id,
        supabase
      )
      const liveTracker = await upsertBetaSignupTracker({
        signup,
        supabase,
        chefId: (trackerRow as any).chef_id,
        authUserId: (trackerRow as any).auth_user_id,
        accountCreatedAt: signup.onboarded_at,
        onboardingProgress,
      })

      if (onboardingProgress?.onboardingCompletedAt) {
        if ((trackerRow as any).completed_sent_at || liveTracker?.completed_sent_at) {
          results.skipped += 1
          continue
        }

        const completionEmail = await sendBetaLifecycleEmail({
          emailType: 'onboarding_complete',
          signup,
          tracker: liveTracker,
          onboardingProgress,
        })

        if (!completionEmail.success) {
          results.errors.push(
            `Completion email failed for ${signup.email}: ${completionEmail.error || 'unknown error'}`
          )
          continue
        }

        await upsertBetaSignupTracker({
          signup,
          supabase,
          emailType: 'onboarding_complete',
          chefId: (trackerRow as any).chef_id,
          authUserId: (trackerRow as any).auth_user_id,
          accountCreatedAt: signup.onboarded_at,
          forceCompleted: true,
          onboardingProgress,
        })

        results.completionsSent += 1
        continue
      }

      const lastLifecycleTouch =
        (trackerRow as any).onboarding_reminder_sent_at ||
        (trackerRow as any).account_ready_sent_at ||
        (trackerRow as any).last_email_sent_at ||
        (trackerRow as any).updated_at

      if (lastLifecycleTouch && lastLifecycleTouch > reminderThreshold) {
        results.skipped += 1
        continue
      }

      const reminderEmail = await sendBetaLifecycleEmail({
        emailType: 'onboarding_reminder',
        signup,
        tracker: liveTracker,
        onboardingProgress,
      })

      if (!reminderEmail.success) {
        results.errors.push(
          `Reminder email failed for ${signup.email}: ${reminderEmail.error || 'unknown error'}`
        )
        continue
      }

      await upsertBetaSignupTracker({
        signup,
        supabase,
        emailType: 'onboarding_reminder',
        chefId: (trackerRow as any).chef_id,
        authUserId: (trackerRow as any).auth_user_id,
        accountCreatedAt: signup.onboarded_at,
        onboardingProgress,
      })

      results.remindersSent += 1
    } catch (processingError) {
      results.errors.push((processingError as Error).message)
    }
  }

  return NextResponse.json(results)
}

export { handleBetaOnboardingReminders as GET, handleBetaOnboardingReminders as POST }
