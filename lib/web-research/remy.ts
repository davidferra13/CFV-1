import { buildCitations, claimHasRequiredCitation } from './policy'
import { runWebResearchJob } from './providers'
import type {
  Citation,
  EvidenceClaim,
  WebResearchJobType,
  WebResearchProvider,
  WebResearchRole,
  WebResearchUsageScope,
} from './types'

export type RemyWebResearchAnswer = {
  status: 'answered' | 'needs_review' | 'failed'
  answer: string
  citations: Citation[]
  evidenceIds: string[]
  warnings: string[]
}

export async function answerWebResearchQuestionWithCitations(params: {
  question: string
  requestedBy: Extract<WebResearchRole, 'admin' | 'chef'>
  jobType?: WebResearchJobType
  usageScope?: WebResearchUsageScope
  provider?: WebResearchProvider
  now?: Date
}): Promise<RemyWebResearchAnswer> {
  const job = await runWebResearchJob({
    provider: params.provider,
    now: params.now,
    request: {
      jobType: params.jobType ?? 'chef_profile_research',
      query: params.question,
      usageScope: params.usageScope ?? 'remy_answer',
      requestedBy: params.requestedBy,
      maxResults: 3,
    },
  })

  if (job.status !== 'completed') {
    return {
      status: 'failed',
      answer: job.error ?? 'Web research is unavailable.',
      citations: [],
      evidenceIds: [],
      warnings: ['No external fact was used because the research job did not complete.'],
    }
  }

  const citations = buildCitations(job.evidence)
  const claim: EvidenceClaim = {
    id: `${job.id}:summary`,
    text: `I found ${job.evidence.length} public source(s) for this research request.`,
    evidenceIds: job.evidence.map((item) => item.id),
    confidence:
      job.evidence.reduce((sum, item) => sum + item.confidence, 0) /
      Math.max(job.evidence.length, 1),
  }

  if (!claimHasRequiredCitation(claim, job.evidence)) {
    return {
      status: 'failed',
      answer: 'I cannot answer with external facts because citations are incomplete.',
      citations: [],
      evidenceIds: [],
      warnings: ['Citation gate blocked the answer.'],
    }
  }

  const sourceLines = job.evidence
    .slice(0, 3)
    .map((item, index) => `[${index + 1}] ${item.title}`)
    .join('; ')

  return {
    status: job.evidence.some((item) => item.reviewStatus !== 'saved')
      ? 'needs_review'
      : 'answered',
    answer: `I found source-backed web evidence for "${job.query}": ${sourceLines}. Treat this as external evidence until reviewed.`,
    citations,
    evidenceIds: claim.evidenceIds,
    warnings:
      job.evidence.length === 0
        ? ['No public sources were returned.']
        : ['External evidence is not ChefFlow truth until reviewed or saved.'],
  }
}
