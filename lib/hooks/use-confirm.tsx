'use client'

// useConfirm - Declarative confirmation dialog hook.
//
// Problem: 15+ destructive actions (revoke, delete, cancel) execute on single
// click with no confirmation. ConfirmModal exists but requires 3 lines of
// boilerplate (useState + handler + JSX) every time. Result: developers skip it.
//
// Solution: A hook that returns { confirm, ConfirmDialog }. Call confirm() to
// open the modal, render <ConfirmDialog /> once. Zero boilerplate.
//
// Usage:
//   const { confirm, ConfirmDialog } = useConfirm()
//
//   async function handleRevoke(id: string) {
//     const ok = await confirm({
//       title: 'Revoke API key?',
//       description: 'Any integration using this key will stop working immediately.',
//       confirmLabel: 'Revoke',
//       variant: 'danger',
//     })
//     if (!ok) return
//     await revokeApiKey(id)
//   }
//
//   return (
//     <>
//       <Button onClick={() => handleRevoke(key.id)}>Revoke</Button>
//       <ConfirmDialog />
//     </>
//   )

import { useState, useCallback, useRef } from 'react'
import { ConfirmModal } from '@/components/ui/confirm-modal'

interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'primary' | 'danger'
}

const DEFAULT_OPTIONS: ConfirmOptions = {
  title: 'Are you sure?',
  confirmLabel: 'Confirm',
  variant: 'primary',
}

export function useConfirm() {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions>(DEFAULT_OPTIONS)
  const [loading, setLoading] = useState(false)
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions({ ...DEFAULT_OPTIONS, ...opts })
    setOpen(true)
    setLoading(false)

    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
    })
  }, [])

  const handleConfirm = useCallback(() => {
    setOpen(false)
    resolveRef.current?.(true)
    resolveRef.current = null
  }, [])

  const handleCancel = useCallback(() => {
    setOpen(false)
    resolveRef.current?.(false)
    resolveRef.current = null
  }, [])

  // Render function that returns the modal JSX
  const ConfirmDialog = useCallback(
    () => (
      <ConfirmModal
        open={open}
        title={options.title}
        description={options.description}
        confirmLabel={options.confirmLabel}
        cancelLabel={options.cancelLabel}
        variant={options.variant}
        loading={loading}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    ),
    [open, options, loading, handleConfirm, handleCancel]
  )

  return { confirm, ConfirmDialog, setConfirmLoading: setLoading }
}
