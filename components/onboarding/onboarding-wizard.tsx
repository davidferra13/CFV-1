'use client'

// Onboarding Wizard — 5-step setup for new chefs
// Steps: Profile → Branding → Public URL → Payments → Done
// Each step saves immediately so progress is preserved if the chef
// navigates away (e.g., to Stripe and back).

import { useState, useTransition, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { markOnboardingComplete, updateChefFullProfile } from '@/lib/chef/profile-actions'
import { updateChefSlug, updateChefPortalTheme } from '@/lib/profile/actions'
import { createConnectAccountLink } from '@/lib/stripe/connect'
import { checkSlugAvailability } from '@/lib/onboarding/actions'
import type { ConnectAccountStatus } from '@/lib/stripe/connect'
import type { ChefFullProfile } from '@/lib/chef/profile-actions'

// ─── Slug util (pure, client-side) ────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

const TOTAL_STEPS = 5

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100)
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-stone-500">
          Step {current} of {total}
        </span>
        <span className="text-sm font-medium text-stone-500">{pct}%</span>
      </div>
      <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-600 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ─── Step 1: Profile ──────────────────────────────────────────────────────────

function Step1({
  profile,
  onSaveAndContinue,
  onSkip,
  saving,
}: {
  profile: ChefFullProfile | null
  onSaveAndContinue: (displayName: string, bio: string) => void
  onSkip: () => void
  saving: boolean
}) {
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-stone-900">Set Up Your Profile</h2>
        <p className="mt-1 text-stone-500">Your name and bio appear on your public profile page</p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-stone-700 mb-1">
            Display name
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={profile?.business_name ?? 'Chef Maria'}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
          <p className="mt-1 text-xs text-stone-400">
            Defaults to your business name if left blank
          </p>
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-stone-700 mb-1">
            Bio
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            maxLength={1200}
            placeholder="Tell clients a bit about your cooking style, background, and what makes your events special…"
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 resize-none"
          />
          <p className="mt-1 text-xs text-stone-400">{bio.length}/1200</p>
        </div>

        <p className="text-xs text-stone-400">
          Profile photo can be added in{' '}
          <a href="/settings/my-profile" className="underline">
            Settings → My Profile
          </a>
          .
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          variant="primary"
          loading={saving}
          onClick={() => onSaveAndContinue(displayName, bio)}
        >
          Save &amp; Continue
        </Button>
        <Button variant="ghost" onClick={onSkip} disabled={saving}>
          Skip for now
        </Button>
      </div>
    </div>
  )
}

// ─── Step 2: Branding ─────────────────────────────────────────────────────────

function Step2({
  profile,
  onSaveAndContinue,
  onSkip,
  saving,
}: {
  profile: ChefFullProfile | null
  onSaveAndContinue: (tagline: string, color: string) => void
  onSkip: () => void
  saving: boolean
}) {
  const [tagline, setTagline] = useState(profile?.tagline ?? '')
  const [color, setColor] = useState('#18181b')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-stone-900">Brand Your Portal</h2>
        <p className="mt-1 text-stone-500">
          A tagline and brand color make your client portal feel professional
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="tagline" className="block text-sm font-medium text-stone-700 mb-1">
            Tagline
          </label>
          <input
            id="tagline"
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            maxLength={160}
            placeholder="Restaurant-quality dining in your home"
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>

        <div>
          <label htmlFor="brandColor" className="block text-sm font-medium text-stone-700 mb-1">
            Brand color
          </label>
          <div className="flex items-center gap-3">
            <input
              id="brandColor"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-16 rounded border border-stone-300 cursor-pointer"
            />
            <span className="text-sm text-stone-600 font-mono">{color}</span>
          </div>
          <p className="mt-1 text-xs text-stone-400">
            Used for buttons and accents in your client portal
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="primary"
          loading={saving}
          onClick={() => onSaveAndContinue(tagline, color)}
        >
          Save &amp; Continue
        </Button>
        <Button variant="ghost" onClick={onSkip} disabled={saving}>
          Skip for now
        </Button>
      </div>
    </div>
  )
}

// ─── Step 3: Public URL ───────────────────────────────────────────────────────

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

function Step3({
  profile,
  onSaveAndContinue,
  onSkip,
  saving,
}: {
  profile: ChefFullProfile | null
  onSaveAndContinue: (slug: string) => void
  onSkip: () => void
  saving: boolean
}) {
  const initialSlug = toSlug(profile?.display_name ?? profile?.business_name ?? '')
  const [slug, setSlug] = useState(initialSlug)
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const checkSlug = useCallback(async (value: string) => {
    if (!value || !/^[a-z0-9-]{3,50}$/.test(value)) {
      setSlugStatus(value.length > 0 ? 'invalid' : 'idle')
      return
    }
    setSlugStatus('checking')
    try {
      const available = await checkSlugAvailability(value)
      setSlugStatus(available ? 'available' : 'taken')
    } catch {
      setSlugStatus('idle')
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => checkSlug(slug), 500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [slug, checkSlug])

  const statusMessage: Record<SlugStatus, { text: string; color: string } | null> = {
    idle: null,
    checking: { text: 'Checking availability…', color: 'text-stone-400' },
    available: { text: 'Available!', color: 'text-green-600' },
    taken: { text: 'Already taken — try another', color: 'text-red-600' },
    invalid: {
      text: 'Only lowercase letters, numbers, and hyphens (min 3 chars)',
      color: 'text-amber-600',
    },
  }

  const canSave = slugStatus === 'available' && slug.length >= 3

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-stone-900">Your Public URL</h2>
        <p className="mt-1 text-stone-500">Clients will find your profile at this address</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="slug" className="block text-sm font-medium text-stone-700">
          Profile URL
        </label>
        <div className="flex items-center border border-stone-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500">
          <span className="px-3 py-2 text-sm text-stone-400 bg-stone-50 border-r border-stone-300 whitespace-nowrap">
            cheflowhq.com/chef/
          </span>
          <input
            id="slug"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="your-name"
            className="flex-1 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 outline-none"
          />
        </div>

        {statusMessage[slugStatus] && (
          <p className={`text-xs ${statusMessage[slugStatus]!.color}`}>
            {statusMessage[slugStatus]!.text}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Button
          variant="primary"
          loading={saving}
          disabled={!canSave}
          onClick={() => onSaveAndContinue(slug)}
        >
          Save &amp; Continue
        </Button>
        <Button variant="ghost" onClick={onSkip} disabled={saving}>
          Skip for now
        </Button>
      </div>
    </div>
  )
}

// ─── Step 4: Stripe Connect ────────────────────────────────────────────────────

function Step4({
  connectStatus,
  onContinue,
}: {
  connectStatus: ConnectAccountStatus
  onContinue: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = async () => {
    setLoading(true)
    setError(null)
    try {
      const { url } = await createConnectAccountLink(true)
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start Stripe onboarding')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-stone-900">Get Paid</h2>
        <p className="mt-1 text-stone-500">Connect Stripe so clients can pay you directly</p>
      </div>

      {connectStatus.connected ? (
        <div className="bg-green-950 border border-green-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-green-800">
            <span className="text-green-500">✓</span>
            Stripe account connected
          </div>
          <div className="flex items-center gap-2 text-sm text-green-700">
            <span className="text-green-500">✓</span>
            Charges enabled — ready to accept payments
          </div>
          <div className="flex items-center gap-2 text-sm text-green-700">
            <span className="text-green-500">✓</span>
            Payouts enabled — funds transfer to your bank
          </div>
        </div>
      ) : connectStatus.pending ? (
        <div className="space-y-4">
          <div className="bg-amber-950 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-800">
              Your Stripe account was created but onboarding isn&apos;t complete yet. Click below to
              continue where you left off.
            </p>
          </div>
          <Button variant="primary" loading={loading} onClick={handleConnect}>
            Continue Stripe Setup
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
            <ul className="space-y-2 text-sm text-stone-600">
              <li className="flex items-start gap-2">
                <span className="text-brand-600 font-bold mt-0.5">→</span>
                Direct deposits to your bank account
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-600 font-bold mt-0.5">→</span>
                Automatic payouts on your schedule
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-600 font-bold mt-0.5">→</span>
                Takes about 5 minutes — bank-level security
              </li>
            </ul>
          </div>
          <Button variant="primary" loading={loading} onClick={handleConnect}>
            Connect Stripe Account
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      <button
        type="button"
        onClick={onContinue}
        className="block text-sm text-stone-400 hover:text-stone-600 underline"
      >
        {connectStatus.connected
          ? 'Continue to finish'
          : 'Skip for now — connect later in Settings'}
      </button>
    </div>
  )
}

// ─── Step 5: Done ─────────────────────────────────────────────────────────────

function Step5({
  connectStatus,
  onFinish,
  finishing,
}: {
  connectStatus: ConnectAccountStatus
  onFinish: () => void
  finishing: boolean
}) {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-4xl mb-3">🎉</div>
        <h2 className="text-2xl font-bold text-stone-900">You&apos;re All Set!</h2>
        <p className="mt-1 text-stone-500">
          Your ChefFlow account is ready. Here&apos;s what&apos;s been configured:
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-stone-700 bg-stone-50 rounded-lg px-3 py-2">
          <span className="text-green-500">✓</span>
          Profile and branding set up
        </div>
        <div className="flex items-center gap-2 text-sm text-stone-700 bg-stone-50 rounded-lg px-3 py-2">
          <span className="text-green-500">✓</span>
          Public profile URL configured
        </div>
        <div
          className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
            connectStatus.connected ? 'text-stone-700 bg-stone-50' : 'text-amber-700 bg-amber-950'
          }`}
        >
          {connectStatus.connected ? (
            <>
              <span className="text-green-500">✓</span> Stripe payments connected
            </>
          ) : (
            <>
              <span className="text-amber-500">!</span> Stripe not connected — add later in Settings
            </>
          )}
        </div>
      </div>

      <Button variant="primary" size="lg" className="w-full" loading={finishing} onClick={onFinish}>
        Go to Dashboard
      </Button>
    </div>
  )
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

interface OnboardingWizardProps {
  profile: ChefFullProfile | null
  connectStatus: ConnectAccountStatus
  initialStep?: number
}

export function OnboardingWizard({
  profile,
  connectStatus,
  initialStep = 1,
}: OnboardingWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState(initialStep)
  const [isPending, startTransition] = useTransition()
  const [stepError, setStepError] = useState<string | null>(null)

  function goNext() {
    setStepError(null)
    setStep((s) => Math.min(TOTAL_STEPS, s + 1))
  }

  function goBack() {
    setStepError(null)
    setStep((s) => Math.max(1, s - 1))
  }

  async function handleProfileSave(displayName: string, bio: string) {
    startTransition(async () => {
      try {
        await updateChefFullProfile({
          display_name: displayName || undefined,
          bio: bio || undefined,
        })
        goNext()
      } catch (err) {
        setStepError(err instanceof Error ? err.message : 'Failed to save profile')
      }
    })
  }

  async function handleBrandingSave(tagline: string, color: string) {
    startTransition(async () => {
      try {
        await updateChefPortalTheme({
          tagline: tagline || undefined,
          portal_primary_color: /^#[0-9a-fA-F]{6}$/.test(color) ? color : undefined,
        })
        goNext()
      } catch (err) {
        setStepError(err instanceof Error ? err.message : 'Failed to save branding')
      }
    })
  }

  async function handleSlugSave(slug: string) {
    startTransition(async () => {
      try {
        await updateChefSlug(slug)
        goNext()
      } catch (err) {
        setStepError(err instanceof Error ? err.message : 'Failed to save URL')
      }
    })
  }

  function handleFinish() {
    startTransition(async () => {
      await markOnboardingComplete()
      router.push('/dashboard')
    })
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <ProgressBar current={step} total={TOTAL_STEPS} />

        <Card>
          <CardContent className="pt-8 pb-8">
            {step === 1 && (
              <Step1
                profile={profile}
                onSaveAndContinue={handleProfileSave}
                onSkip={goNext}
                saving={isPending}
              />
            )}
            {step === 2 && (
              <Step2
                profile={profile}
                onSaveAndContinue={handleBrandingSave}
                onSkip={goNext}
                saving={isPending}
              />
            )}
            {step === 3 && (
              <Step3
                profile={profile}
                onSaveAndContinue={handleSlugSave}
                onSkip={goNext}
                saving={isPending}
              />
            )}
            {step === 4 && <Step4 connectStatus={connectStatus} onContinue={goNext} />}
            {step === 5 && (
              <Step5 connectStatus={connectStatus} onFinish={handleFinish} finishing={isPending} />
            )}

            {stepError && <p className="mt-4 text-sm text-red-600">{stepError}</p>}
          </CardContent>

          {step > 1 && step < TOTAL_STEPS && (
            <div className="px-6 pb-6 border-t border-stone-100 pt-4">
              <Button variant="ghost" onClick={goBack}>
                Back
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
