'use client'

import Link from 'next/link'

interface TosAcceptanceProps {
  /** Callback when the user checks/unchecks the acceptance checkbox. */
  onAcceptedChange: (accepted: boolean) => void
  /** Current accepted state (controlled). */
  accepted: boolean
  /** Optional extra className on the wrapper. */
  className?: string
}

/**
 * TosAcceptance - a checkbox + label used on signup and first-login forms.
 *
 * Usage:
 *   const [tosAccepted, setTosAccepted] = useState(false)
 *   <TosAcceptance accepted={tosAccepted} onAcceptedChange={setTosAccepted} />
 *
 * Render this component wherever a user must acknowledge the Terms of Service
 * before creating an account or first accessing the client portal.
 */
export function TosAcceptance({ onAcceptedChange, accepted, className }: TosAcceptanceProps) {
  return (
    <div className={`flex items-start gap-3 ${className ?? ''}`}>
      <input
        id="tos-acceptance"
        type="checkbox"
        checked={accepted}
        onChange={(e) => onAcceptedChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-stone-600 text-brand-600 focus:ring-brand-500"
        aria-required="true"
      />
      <label
        htmlFor="tos-acceptance"
        className="cursor-pointer text-sm leading-snug text-stone-400"
      >
        I have read and agree to the{' '}
        <Link
          href="/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-brand-600 hover:underline"
        >
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-brand-600 hover:underline"
        >
          Privacy Policy
        </Link>
        .
      </label>
    </div>
  )
}
