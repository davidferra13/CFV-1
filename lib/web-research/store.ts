import {
  buildPublishedBrowseRecord,
  publicBrowseCandidates,
  publishReviewedDirectoryCandidate,
} from './candidates'
import { stableWebResearchId } from './normalization'
import type {
  DirectoryListingCandidate,
  WebResearchAuditEvent,
  WebResearchJob,
  WebResearchRole,
} from './types'

type WebResearchStore = {
  jobs: Map<string, WebResearchJob>
  candidates: Map<string, DirectoryListingCandidate>
  auditEvents: WebResearchAuditEvent[]
}

const globalStore = globalThis as typeof globalThis & {
  __chefFlowWebResearchStore?: WebResearchStore
}

function getStore(): WebResearchStore {
  if (!globalStore.__chefFlowWebResearchStore) {
    globalStore.__chefFlowWebResearchStore = {
      jobs: new Map(),
      candidates: new Map(),
      auditEvents: [],
    }
  }
  return globalStore.__chefFlowWebResearchStore
}

function audit(input: Omit<WebResearchAuditEvent, 'id' | 'createdAt'>, now = new Date()) {
  const event: WebResearchAuditEvent = {
    id: stableWebResearchId('web-research-event', [
      input.type,
      input.jobId,
      input.candidateId,
      input.message,
      now.toISOString(),
    ]),
    createdAt: now.toISOString(),
    ...input,
  }
  getStore().auditEvents.unshift(event)
  getStore().auditEvents = getStore().auditEvents.slice(0, 100)
  return event
}

export function resetWebResearchStoreForTests() {
  globalStore.__chefFlowWebResearchStore = {
    jobs: new Map(),
    candidates: new Map(),
    auditEvents: [],
  }
}

export function saveWebResearchJob(job: WebResearchJob, actorRole: WebResearchRole = 'admin') {
  getStore().jobs.set(job.id, job)
  audit({
    jobId: job.id,
    actorRole,
    type: job.status === 'failed' ? 'job_failed' : 'job_created',
    message:
      job.status === 'failed'
        ? (job.error ?? 'Web research job failed.')
        : `Web research job completed with ${job.evidence.length} evidence item(s).`,
  })
  return job
}

export function listWebResearchJobs() {
  return [...getStore().jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getWebResearchJob(jobId: string) {
  return getStore().jobs.get(jobId) ?? null
}

export function saveDirectoryListingCandidate(
  candidate: DirectoryListingCandidate,
  actorRole: WebResearchRole = 'admin'
) {
  getStore().candidates.set(candidate.id, candidate)
  audit({
    candidateId: candidate.id,
    actorRole,
    type: 'candidate_created',
    message: `${candidate.name} entered web research candidate review.`,
  })
  return candidate
}

export function listDirectoryListingCandidates() {
  return [...getStore().candidates.values()].sort((a, b) =>
    b.retrievedAt.localeCompare(a.retrievedAt)
  )
}

export function getDirectoryListingCandidate(candidateId: string) {
  return getStore().candidates.get(candidateId) ?? null
}

export function reviewDirectoryListingCandidate(
  candidateId: string,
  actorRole: WebResearchRole = 'admin'
) {
  const candidate = getDirectoryListingCandidate(candidateId)
  if (!candidate) return { ok: false as const, reason: 'Candidate not found.' }

  const reviewed: DirectoryListingCandidate = {
    ...candidate,
    status: 'reviewed',
    publishable: true,
  }
  getStore().candidates.set(candidateId, reviewed)
  audit({
    candidateId,
    actorRole,
    type: 'candidate_reviewed',
    message: `${reviewed.name} was reviewed for public browse publication.`,
  })
  return { ok: true as const, candidate: reviewed }
}

export function rejectDirectoryListingCandidate(
  candidateId: string,
  reason: string,
  actorRole: WebResearchRole = 'admin'
) {
  const candidate = getDirectoryListingCandidate(candidateId)
  if (!candidate) return { ok: false as const, reason: 'Candidate not found.' }

  const rejected: DirectoryListingCandidate = {
    ...candidate,
    status: 'rejected',
    publishable: false,
    rejectionReason: reason || 'Rejected by admin review.',
  }
  getStore().candidates.set(candidateId, rejected)
  audit({
    candidateId,
    actorRole,
    type: 'candidate_rejected',
    message: rejected.rejectionReason ?? 'Rejected by admin review.',
  })
  return { ok: true as const, candidate: rejected }
}

export function markDirectoryListingCandidatePublished(params: {
  candidateId: string
  slug?: string
  actorRole?: WebResearchRole
}) {
  const candidate = getDirectoryListingCandidate(params.candidateId)
  if (!candidate) return { ok: false as const, reason: 'Candidate not found.' }

  const result = publishReviewedDirectoryCandidate(candidate)
  if (!result.ok) {
    audit({
      candidateId: params.candidateId,
      actorRole: params.actorRole ?? 'admin',
      type: 'candidate_publish_failed',
      message: result.reason ?? 'Candidate could not be published.',
    })
    return result
  }

  const published: DirectoryListingCandidate = {
    ...result.candidate,
    ...(params.slug ? { publishedListingSlug: params.slug } : {}),
  }
  getStore().candidates.set(params.candidateId, published)
  audit({
    candidateId: params.candidateId,
    actorRole: params.actorRole ?? 'admin',
    type: 'candidate_published',
    message: `${published.name} is published to the public browse read model.`,
  })
  return { ok: true as const, candidate: published }
}

export function recordDirectoryListingCandidatePublishFailure(params: {
  candidateId: string
  reason: string
  actorRole?: WebResearchRole
}) {
  const candidate = getDirectoryListingCandidate(params.candidateId)
  if (!candidate) return { ok: false as const, reason: 'Candidate not found.' }

  audit({
    candidateId: params.candidateId,
    actorRole: params.actorRole ?? 'admin',
    type: 'candidate_publish_failed',
    message: params.reason,
  })
  return { ok: true as const, candidate }
}

export function getPublishedWebResearchDirectoryRecords() {
  return publicBrowseCandidates(listDirectoryListingCandidates())
    .map(buildPublishedBrowseRecord)
    .filter((record): record is NonNullable<typeof record> => Boolean(record))
}

export function listWebResearchAuditEvents() {
  return [...getStore().auditEvents]
}
