export type AcquisitionReadinessStatus = 'missing' | 'instrumented' | 'operator_review' | 'verified'

export type AcquisitionReadinessFacts = {
  publicBookingSubmissions: number
  utmAttributedSubmissions: number
  referralAttributedSubmissions: number
  uniqueSources: number
  latestSubmissionAt?: string | null
}

export type AcquisitionReadiness = {
  status: AcquisitionReadinessStatus
  evidence: string
  nextStep: string
  href: string
}

function countLabel(count: number, singular: string, plural: string): string {
  if (count === 1) return `1 ${singular}`
  return `${count} ${plural}`
}

function safeCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
}

export function buildAcquisitionReadiness(facts: AcquisitionReadinessFacts): AcquisitionReadiness {
  const publicBookingSubmissions = safeCount(facts.publicBookingSubmissions)
  const utmAttributedSubmissions = safeCount(facts.utmAttributedSubmissions)
  const referralAttributedSubmissions = safeCount(facts.referralAttributedSubmissions)
  const uniqueSources = safeCount(facts.uniqueSources)
  const attributedSubmissions = utmAttributedSubmissions + referralAttributedSubmissions

  if (publicBookingSubmissions === 0) {
    return {
      status: 'missing',
      evidence: 'No public booking submissions exist yet',
      nextStep: 'Drive one test or pilot visitor through the public booking form.',
      href: '/book',
    }
  }

  if (attributedSubmissions === 0) {
    return {
      status: 'instrumented',
      evidence: `${countLabel(publicBookingSubmissions, 'public booking submission exists', 'public booking submissions exist')}, but none have campaign or referral attribution`,
      nextStep:
        'Use a UTM or referral link for the next booking test so acquisition source is provable.',
      href: '/admin/activity',
    }
  }

  if (uniqueSources < 2) {
    return {
      status: 'operator_review',
      evidence: `${countLabel(attributedSubmissions, 'attributed submission', 'attributed submissions')} from ${countLabel(uniqueSources, 'source', 'sources')}`,
      nextStep: 'Confirm this source is intentional, then run one more channel before launch.',
      href: '/admin/activity',
    }
  }

  return {
    status: 'verified',
    evidence: `${countLabel(attributedSubmissions, 'attributed submission', 'attributed submissions')} across ${countLabel(uniqueSources, 'source', 'sources')}`,
    nextStep: 'Keep source tracking active and compare conversion quality after launch.',
    href: '/admin/activity',
  }
}
