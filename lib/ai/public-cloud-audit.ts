import type {
  PublicCloudBlockReason,
  PublicCloudSurface,
  PublicCloudTaskId,
} from './public-cloud-policy'

type PublicCloudAuditEvent =
  | {
      type: 'policy_block'
      taskId: string
      surface: string
      reason: PublicCloudBlockReason
      signal?: string
    }
  | {
      type: 'provider_start'
      taskId: PublicCloudTaskId
      surface: PublicCloudSurface
      provider: string
      model: string
    }
  | {
      type: 'provider_done'
      taskId: PublicCloudTaskId
      surface: PublicCloudSurface
      provider: string
      model: string
      durationMs: number
      firstTokenMs: number | null
      outputTokenEvents: number
    }
  | {
      type: 'provider_error'
      taskId: string
      surface: string
      provider: string
      model: string
      durationMs: number
      errorName: string
    }

export function logPublicCloudAiEvent(event: PublicCloudAuditEvent): void {
  console.log('[public-cloud-ai]', event)
}
