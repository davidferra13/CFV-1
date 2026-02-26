'use client'

import { useMemo, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AccessibleDialog } from '@/components/ui/accessible-dialog'
import { confirmPolicy, type ConfirmPolicyInput } from '@/lib/confirm/confirm-policy'

type ConfirmPolicyDialogProps = {
  open: boolean
  policy: ConfirmPolicyInput | null
  loading?: boolean
  onCancel: () => void
  onConfirm: () => void | Promise<unknown>
}

export function ConfirmPolicyDialog({
  open,
  policy,
  loading = false,
  onCancel,
  onConfirm,
}: ConfirmPolicyDialogProps) {
  const decision = useMemo(() => (policy ? confirmPolicy(policy) : null), [policy])
  const [typed, setTyped] = useState('')
  const typedInputRef = useRef<HTMLInputElement | null>(null)

  const requiresTyped = decision?.requireTypedConfirmation && !!decision.typedValue
  const typedMatches = !requiresTyped || typed.trim() === decision?.typedValue

  if (!open || !decision) return null

  return (
    <AccessibleDialog
      open={open}
      onClose={onCancel}
      title={decision.title}
      description={decision.message}
      initialFocusRef={typedInputRef as React.RefObject<HTMLElement | null>}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={decision.mode === 'strong' ? 'danger' : 'primary'}
            onClick={() => void onConfirm()}
            disabled={loading || !typedMatches}
          >
            {decision.actionLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {decision.impactPreview ? (
          <div className="rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-xs text-stone-300">
            {decision.impactPreview}
          </div>
        ) : null}

        {decision.mode === 'strong' ? (
          <div className="rounded-md border border-red-300 bg-red-950 px-3 py-2 text-xs text-red-800 flex gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>This action is high-risk and irreversible.</span>
          </div>
        ) : null}

        {requiresTyped ? (
          <div className="space-y-1.5">
            <label className="text-sm text-stone-300" htmlFor="confirm-policy-typed">
              Type <strong>{decision.typedValue}</strong> to confirm.
            </label>
            <input
              id="confirm-policy-typed"
              ref={typedInputRef}
              type="text"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              className="w-full rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 outline-none focus:border-stone-400"
            />
          </div>
        ) : null}
      </div>
    </AccessibleDialog>
  )
}
