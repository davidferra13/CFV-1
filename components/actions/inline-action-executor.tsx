'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getAction, executeAction } from '@/lib/actions/action-registry'
import { ActionConfirmDialog } from './action-confirm-dialog'
import { Button } from '@/components/ui/button'
import type { ActionContext, ActionVariant } from '@/lib/actions/types'

interface InlineActionExecutorProps {
  actionId: string
  entityId: string
  context?: Record<string, unknown>
  variant?: 'chip' | 'button' | 'card-action'
  onSuccess?: () => void
  onDismiss?: () => void
  className?: string
}

type FeedbackState = 'idle' | 'confirming' | 'success' | 'error'

const variantStyles: Record<ActionVariant, string> = {
  default: 'bg-stone-800/60 hover:bg-stone-700/80 text-stone-200 border border-stone-700/50',
  destructive: 'bg-red-900/40 hover:bg-red-900/60 text-red-200 border border-red-800/40',
  success: 'bg-green-900/40 hover:bg-green-900/60 text-green-200 border border-green-800/40',
}

export function InlineActionExecutor({
  actionId,
  entityId,
  context,
  variant = 'chip',
  onSuccess,
  onDismiss,
  className,
}: InlineActionExecutorProps) {
  const def = getAction(actionId)
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<FeedbackState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const run = useCallback(() => {
    startTransition(async () => {
      try {
        const result = await executeAction(actionId, entityId, context as ActionContext)
        if (result.success) {
          setFeedback('success')
          router.refresh()
          setTimeout(() => {
            setFeedback('idle')
            if (result.dismiss) onDismiss?.()
            onSuccess?.()
          }, 1200)
        } else {
          setErrorMsg(result.message || 'Action failed')
          setFeedback('error')
          setTimeout(() => {
            setFeedback('idle')
            setErrorMsg('')
          }, 2000)
        }
      } catch {
        setErrorMsg('Unexpected error')
        setFeedback('error')
        setTimeout(() => {
          setFeedback('idle')
          setErrorMsg('')
        }, 2000)
      }
    })
  }, [actionId, entityId, context, router, onSuccess, onDismiss])

  const handleClick = () => {
    if (def?.requiresConfirm) {
      setFeedback('confirming')
    } else {
      run()
    }
  }

  if (!def) return null

  const actionVariant = def.variant || 'default'
  const styles = variantStyles[actionVariant]

  const renderFeedback = () => {
    if (feedback === 'success') {
      return <span className="text-green-400 text-xs font-medium">Done!</span>
    }
    if (feedback === 'error') {
      return <span className="text-red-400 text-xs font-medium">{errorMsg}</span>
    }
    return null
  }

  if (feedback === 'confirming') {
    return (
      <ActionConfirmDialog
        message={def.confirmMessage || `Confirm: ${def.label}?`}
        actionLabel={def.label}
        variant={actionVariant}
        isPending={isPending}
        onConfirm={run}
        onCancel={() => setFeedback('idle')}
      />
    )
  }

  if (feedback === 'success' || feedback === 'error') {
    return <div className={className}>{renderFeedback()}</div>
  }

  if (variant === 'button') {
    const buttonVariant = actionVariant === 'destructive' ? 'danger' : 'primary'
    return (
      <Button
        variant={buttonVariant}
        onClick={handleClick}
        disabled={isPending}
        className={className}
      >
        {isPending ? '...' : def.label}
      </Button>
    )
  }

  if (variant === 'card-action') {
    return (
      <button
        onClick={handleClick}
        disabled={isPending}
        className={`inline-flex items-center gap-1.5 px-3 py-1 text-sm rounded-full transition-colors ${styles} ${className || ''}`}
      >
        {isPending ? '...' : def.label}
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`inline-flex items-center px-2.5 py-0.5 text-xs rounded-full transition-colors ${styles} ${className || ''}`}
    >
      {isPending ? '...' : def.label}
    </button>
  )
}
