'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/admin'
import { adminCreateListing } from '@/lib/discover/actions'
import { buildDirectoryCandidateFromEvidence, buildDirectoryListingCreateInput } from './candidates'
import { createMockWebResearchProvider, runWebResearchJob } from './providers'
import {
  getDirectoryListingCandidate,
  markDirectoryListingCandidatePublished,
  recordDirectoryListingCandidatePublishFailure,
  rejectDirectoryListingCandidate,
  reviewDirectoryListingCandidate,
  saveDirectoryListingCandidate,
  saveWebResearchJob,
} from './store'

function firstFormValue(formData: FormData, key: string, fallback = '') {
  const value = formData.get(key)
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

export async function runMockDirectoryCandidateDiscoveryAction(formData: FormData) {
  const admin = await requireAdmin()
  const query = firstFormValue(formData, 'query', 'restaurant chef near me')
  const city = firstFormValue(formData, 'city')
  const state = firstFormValue(formData, 'state')

  const job = await runWebResearchJob({
    provider: createMockWebResearchProvider(),
    request: {
      jobType: 'restaurant_browse_candidate_discovery',
      query,
      usageScope: 'public_browse_candidate',
      requestedBy: 'admin',
      maxResults: 3,
    },
  })
  saveWebResearchJob(
    { ...job, requestedBy: 'admin', usageScope: 'public_browse_candidate' },
    'admin'
  )

  if (job.status !== 'completed') {
    revalidatePath('/admin/web-research')
    return
  }

  const candidate = buildDirectoryCandidateFromEvidence({
    evidence: job.evidence,
    city: city || undefined,
    state: state || undefined,
  })

  if (!candidate) {
    revalidatePath('/admin/web-research')
    return
  }

  saveDirectoryListingCandidate(candidate, 'admin')
  revalidatePath('/admin/web-research')
  console.info(
    `[web-research] ${candidate.name} is ready for admin review by ${admin.email}. job=${job.id}`
  )
}

export async function reviewWebResearchCandidateAction(formData: FormData) {
  await requireAdmin()
  const candidateId = firstFormValue(formData, 'candidateId')
  reviewDirectoryListingCandidate(candidateId, 'admin')
  revalidatePath('/admin/web-research')
}

export async function rejectWebResearchCandidateAction(formData: FormData) {
  await requireAdmin()
  const candidateId = firstFormValue(formData, 'candidateId')
  const reason = firstFormValue(formData, 'reason', 'Rejected by admin review.')
  rejectDirectoryListingCandidate(candidateId, reason, 'admin')
  revalidatePath('/admin/web-research')
}

export async function publishWebResearchCandidateAction(formData: FormData) {
  await requireAdmin()
  const candidateId = firstFormValue(formData, 'candidateId')
  const candidate = getDirectoryListingCandidate(candidateId)
  if (!candidate) return

  const createInput = buildDirectoryListingCreateInput(candidate)
  const created = await adminCreateListing(createInput)
  if (!created.success) {
    recordDirectoryListingCandidatePublishFailure({
      candidateId,
      actorRole: 'admin',
      reason: created.error ?? 'Directory listing could not be created.',
    })
    revalidatePath('/admin/web-research')
    return
  }

  markDirectoryListingCandidatePublished({
    candidateId,
    slug: created.slug,
    actorRole: 'admin',
  })
  revalidatePath('/admin/web-research')
  revalidatePath('/admin/directory-listings')
  revalidatePath('/nearby')
}
