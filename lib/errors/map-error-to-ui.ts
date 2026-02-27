import { toAppError } from '@/lib/errors/app-error'
import { trackError } from '@/lib/ai/remy-activity-tracker'

export type ErrorUIModel = {
  title: string
  message: string
  nextStep?: string
  retryable: boolean
  traceId?: string
}

export function mapErrorToUI(error: unknown, context?: string): ErrorUIModel {
  const appError = toAppError(error)

  let result: ErrorUIModel

  switch (appError.category) {
    case 'validation':
      result = {
        title: 'Check Required Information',
        message: appError.message || 'Some fields are invalid. Please review and try again.',
        nextStep: 'Review the highlighted fields, fix issues, and save again.',
        retryable: appError.retryable,
        traceId: appError.traceId,
      }
      break
    case 'auth':
      result = {
        title: 'Session Required',
        message: appError.message || 'You do not have permission to complete this action.',
        nextStep: 'Sign in again, then retry the action.',
        retryable: appError.retryable,
        traceId: appError.traceId,
      }
      break
    case 'conflict':
      result = {
        title: 'Record Updated Elsewhere',
        message: appError.message || 'This record changed elsewhere.',
        nextStep: 'Reload the latest version before saving again.',
        retryable: false,
        traceId: appError.traceId,
      }
      break
    case 'network':
      result = {
        title: 'Connection Problem',
        message: appError.message || 'Network issue while saving your changes.',
        nextStep: 'Keep your draft and retry when connectivity stabilizes.',
        retryable: true,
        traceId: appError.traceId,
      }
      break
    case 'rate_limit':
      result = {
        title: 'Too Many Requests',
        message: appError.message || 'Requests are temporarily limited.',
        nextStep: 'Wait a moment, then retry safely.',
        retryable: true,
        traceId: appError.traceId,
      }
      break
    default:
      result = {
        title: 'Save Failed',
        message: appError.message || 'Something unexpected happened while saving.',
        nextStep: 'Keep your local draft and retry. Contact support if this keeps happening.',
        retryable: appError.retryable,
        traceId: appError.traceId,
      }
  }

  // Track error for Remy awareness (browser only)
  if (typeof window !== 'undefined') {
    trackError(result.message, context || result.title)
  }

  return result
}
