'use client'

import { useEffect, useId, useMemo, useRef } from 'react'

type AccessibleDialogProps = {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children?: React.ReactNode
  footer?: React.ReactNode
  initialFocusRef?: React.RefObject<HTMLElement | null>
  closeOnBackdrop?: boolean
  escapeCloses?: boolean
  widthClassName?: string
}

function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'))
}

export function AccessibleDialog({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  initialFocusRef,
  closeOnBackdrop = false,
  escapeCloses = true,
  widthClassName = 'max-w-md',
}: AccessibleDialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const labeledBy = useMemo(() => titleId, [titleId])

  useEffect(() => {
    if (!open) return

    previousFocusRef.current = document.activeElement as HTMLElement | null
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const timer = window.setTimeout(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus()
        return
      }
      if (!containerRef.current) return
      const focusable = getFocusable(containerRef.current)
      if (focusable.length > 0) {
        focusable[0].focus()
      } else {
        containerRef.current.focus()
      }
    }, 0)

    const onKeyDown = (event: KeyboardEvent) => {
      if (!containerRef.current) return

      if (event.key === 'Escape' && escapeCloses) {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab') return
      const focusable = getFocusable(containerRef.current)
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = originalOverflow
      previousFocusRef.current?.focus()
    }
  }, [escapeCloses, initialFocusRef, onClose, open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-[dialog-backdrop_0.2s_ease-out]"
        aria-hidden="true"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labeledBy}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`relative w-full ${widthClassName} rounded-xl border border-white/[0.08] p-5 shadow-2xl outline-none animate-[dialog-enter_0.25s_cubic-bezier(0.22,1,0.36,1)]`}
        style={{
          background: 'rgba(28, 25, 23, 0.85)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
          backdropFilter: 'blur(20px) saturate(1.3)',
        }}
      >
        <h2 id={titleId} className="text-lg font-semibold text-stone-100">
          {title}
        </h2>
        {description ? (
          <p id={descriptionId} className="mt-2 text-sm text-stone-400">
            {description}
          </p>
        ) : null}
        {children ? <div className="mt-4">{children}</div> : null}
        {footer ? (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">{footer}</div>
        ) : null}
      </div>
    </div>
  )
}
