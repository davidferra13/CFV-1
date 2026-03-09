'use client'

import { useState, useTransition, useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, Circle, ArrowRight } from '@/components/ui/icons'
import { markOnboardingComplete, updateChefFullProfile } from '@/lib/chef/profile-actions'
import { updateChefSlug, updateChefPortalTheme } from '@/lib/profile/actions'
import { createConnectAccountLink } from '@/lib/stripe/connect'
import { checkSlugAvailability } from '@/lib/onboarding/actions'
import type { LaunchStatus } from '@/lib/onboarding/launch-status'
import type { OnboardingProgress } from '@/lib/onboarding/progress-actions'
import type { ConnectAccountStatus } from '@/lib/stripe/connect'
import type { ChefFullProfile } from '@/lib/chef/profile-actions'

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

const TOTAL_STEPS = 5

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100)
  return (
    <div className="mb-8">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-stone-500">
          Step {current} of {total}
        </span>
        <span className="text-sm font-medium text-stone-500">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-stone-200">
        <div
          className="h-full rounded-full bg-brand-600 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

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
          <label htmlFor="displayName" className="mb-1 block text-sm font-medium text-stone-700">
            Display name
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={profile?.business_name ?? 'Chef Maria'}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <p className="mt-1 text-xs text-stone-400">
            Defaults to your business name if left blank
          </p>
        </div>

        <div>
          <label htmlFor="bio" className="mb-1 block text-sm font-medium text-stone-700">
            Bio
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            maxLength={1200}
            placeholder="Tell clients a bit about your cooking style, background, and what makes your events special..."
            className="w-full resize-none rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <p className="mt-1 text-xs text-stone-400">{bio.length}/1200</p>
        </div>

        <p className="text-xs text-stone-400">
          Profile photo can be added in{' '}
          <a href="/settings/my-profile" className="underline">
            Settings - My Profile
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
          <label htmlFor="tagline" className="mb-1 block text-sm font-medium text-stone-700">
            Tagline
          </label>
          <input
            id="tagline"
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            maxLength={160}
            placeholder="Restaurant-quality dining in your home"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label htmlFor="brandColor" className="mb-1 block text-sm font-medium text-stone-700">
            Brand color
          </label>
          <div className="flex items-center gap-3">
            <input
              id="brandColor"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-16 cursor-pointer rounded border border-stone-300"
            />
            <span className="font-mono text-sm text-stone-600">{color}</span>
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
    checking: { text: 'Checking availability...', color: 'text-stone-400' },
    available: { text: 'Available!', color: 'text-green-600' },
    taken: { text: 'Already taken - try another', color: 'text-red-600' },
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
        <div className="flex items-center overflow-hidden rounded-lg border border-stone-300 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500">
          <span className="whitespace-nowrap border-r border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-400">
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
        <div className="space-y-2 rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-green-800">
            <span className="text-green-500">OK</span>
            Stripe account connected
          </div>
          <div className="flex items-center gap-2 text-sm text-green-700">
            <span className="text-green-500">OK</span>
            Charges enabled - ready to accept payments
          </div>
          <div className="flex items-center gap-2 text-sm text-green-700">
            <span className="text-green-500">OK</span>
            Payouts enabled - funds transfer to your bank
          </div>
        </div>
      ) : connectStatus.pending ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-800">
              Your Stripe account was created but onboarding is not complete yet. Click below to
              continue where you left off.
            </p>
          </div>
          <Button variant="primary" loading={loading} onClick={handleConnect}>
            Continue Stripe Setup
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
            <ul className="space-y-2 text-sm text-stone-600">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 font-bold text-brand-600">-</span>
                Direct deposits to your bank account
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 font-bold text-brand-600">-</span>
                Automatic payouts on your schedule
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 font-bold text-brand-600">-</span>
                Takes about 5 minutes with bank-level security
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
        className="block text-sm text-stone-400 underline hover:text-stone-600"
      >
        {connectStatus.connected
          ? 'Continue to finish'
          : 'Skip for now - connect later in Settings'}
      </button>
    </div>
  )
}

function Step5({
  launchStatus,
  progress,
  connectStatus,
  onFinish,
  onGoToDashboard,
  finishing,
}: {
  launchStatus: LaunchStatus
  progress: OnboardingProgress
  connectStatus: ConnectAccountStatus
  onFinish: () => void
  onGoToDashboard: () => void
  finishing: boolean
}) {
  const nextActions = [
    {
      key: 'clients',
      label: 'Import your clients',
      done: progress.clients.done,
      detail: progress.clients.done
        ? progress.clients.count === 1
          ? '1 client already imported.'
          : `${progress.clients.count} clients already imported.`
        : 'Bring in the contacts and history you already have.',
    },
    {
      key: 'recipes',
      label: 'Build your recipe library',
      done: progress.recipes.done,
      detail: progress.recipes.done
        ? progress.recipes.count === 1
          ? '1 recipe already saved.'
          : `${progress.recipes.count} recipes already saved.`
        : 'Add the dishes you actually cook so events stay accurate.',
    },
    {
      key: 'loyalty',
      label: 'Set up loyalty',
      done: progress.loyalty.done,
      detail: progress.loyalty.done
        ? 'Rewards and tiers are configured.'
        : 'Seed your tiers, rewards, and historical balances.',
    },
    {
      key: 'staff',
      label: 'Add regular staff',
      done: progress.staff.done,
      detail: progress.staff.done
        ? progress.staff.count === 1
          ? '1 staff member already added.'
          : `${progress.staff.count} staff members already added.`
        : 'Optional, but worth doing if you schedule a team.',
    },
  ]

  const launchItems = [
    {
      key: 'profile',
      label: 'Profile',
      done: launchStatus.profileDone,
      detail: launchStatus.profileDone
        ? `Ready as ${launchStatus.displayName}`
        : 'Still worth tightening in My Profile.',
    },
    {
      key: 'url',
      label: 'Public URL',
      done: launchStatus.publicUrlDone,
      detail: launchStatus.publicUrlDone
        ? `chef/${launchStatus.slug}`
        : 'Claim it from Public Profile settings when you are ready.',
    },
    {
      key: 'payments',
      label: 'Stripe payouts',
      done: launchStatus.paymentsDone,
      detail: launchStatus.paymentsDone
        ? 'Ready to take deposits and payouts.'
        : 'Can be finished later from Stripe Connect settings.',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 text-4xl">Success</div>
        <h2 className="text-2xl font-bold text-stone-900">Core launch is finished</h2>
        <p className="mt-1 text-stone-500">
          Your workspace exists. Move into the setup hub so ChefFlow learns your real clients,
          recipes, loyalty data, and team.
        </p>
      </div>

      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-900">Launch status</h3>
          <span className="text-xs font-medium text-stone-500">
            {launchStatus.completedSteps}/{launchStatus.totalSteps} ready
          </span>
        </div>
        <div className="space-y-2">
          {launchItems.map((item) => (
            <div
              key={item.key}
              className="flex items-start gap-2 rounded-lg bg-white px-3 py-2 text-sm text-stone-700"
            >
              {item.done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
              )}
              <div className="min-w-0">
                <p className="font-medium text-stone-900">{item.label}</p>
                <p className="text-stone-500">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-900">What happens next</h3>
          <span className="text-xs font-medium text-stone-500">
            {nextActions.filter((item) => item.done).length}/{nextActions.length} started
          </span>
        </div>
        <div className="space-y-2">
          {nextActions.map((item) => (
            <div
              key={item.key}
              className="flex items-start gap-2 rounded-lg bg-white/80 px-3 py-2 text-sm text-stone-700"
            >
              {item.done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              )}
              <div className="min-w-0">
                <p className="font-medium text-stone-900">{item.label}</p>
                <p className="text-stone-500">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="primary"
          size="lg"
          className="w-full sm:flex-1"
          loading={finishing}
          onClick={onFinish}
        >
          Continue to Setup Hub
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="w-full sm:w-auto"
          disabled={finishing}
          onClick={onGoToDashboard}
        >
          Go to Dashboard
        </Button>
      </div>

      {!connectStatus.connected && (
        <p className="text-sm text-stone-500">
          Nothing gets locked if Stripe is still pending. You can finish payouts later from
          Settings.
        </p>
      )}
    </div>
  )
}

interface OnboardingWizardProps {
  profile: ChefFullProfile | null
  connectStatus: ConnectAccountStatus
  initialStep?: number
  launchStatus: LaunchStatus
  progress: OnboardingProgress
}

export function OnboardingWizard({
  profile,
  connectStatus,
  initialStep = 1,
  launchStatus,
  progress,
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

  function handleFinish(destination: 'hub' | 'dashboard' = 'hub') {
    startTransition(async () => {
      try {
        await markOnboardingComplete()
        router.push(destination === 'hub' ? '/onboarding' : '/dashboard')
      } catch {
        toast.error('Failed to complete onboarding')
      }
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 p-4">
      <div className="w-full max-w-xl">
        <ProgressBar current={step} total={TOTAL_STEPS} />
        <div className="mb-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-stone-900">Quick launch first.</p>
          <p className="mt-1 text-sm text-stone-600">
            This five-minute pass gets your profile, URL, and payouts into a usable state. After
            that, the setup hub walks you through importing clients, recipes, loyalty, and staff.
          </p>
        </div>

        <Card>
          <CardContent className="pb-8 pt-8">
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
              <Step5
                launchStatus={launchStatus}
                progress={progress}
                connectStatus={connectStatus}
                onFinish={() => handleFinish('hub')}
                onGoToDashboard={() => handleFinish('dashboard')}
                finishing={isPending}
              />
            )}

            {stepError && <p className="mt-4 text-sm text-red-600">{stepError}</p>}
          </CardContent>

          {step > 1 && step < TOTAL_STEPS && (
            <div className="border-t border-stone-100 px-6 pb-6 pt-4">
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
