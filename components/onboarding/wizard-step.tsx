// WizardStep - Reusable step wrapper for multi-step wizards
// Provides consistent layout: title, description, content, navigation buttons.

'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from '@/components/ui/icons'

type WizardStepProps = {
  title: string
  description: string
  children: React.ReactNode
  onNext?: () => void
  onBack?: () => void
  onSkip?: () => void
  nextLabel?: string
  nextDisabled?: boolean
  showBack?: boolean
  showSkip?: boolean
  isSubmitting?: boolean
}

export function WizardStep({
  title,
  description,
  children,
  onNext,
  onBack,
  onSkip,
  nextLabel = 'Continue',
  nextDisabled = false,
  showBack = true,
  showSkip = false,
  isSubmitting = false,
}: WizardStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-stone-100">{title}</h2>
        <p className="text-sm text-stone-400 mt-1">{description}</p>
      </div>

      <div className="space-y-4">{children}</div>

      <div className="flex items-center justify-between pt-2">
        <div>
          {showBack && onBack && (
            <Button variant="ghost" onClick={onBack} disabled={isSubmitting}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {showSkip && onSkip && (
            <Button variant="ghost" onClick={onSkip} disabled={isSubmitting}>
              Skip
            </Button>
          )}
          {onNext && (
            <Button
              variant="primary"
              onClick={onNext}
              disabled={nextDisabled || isSubmitting}
            >
              {isSubmitting ? 'Creating...' : nextLabel}
              {!isSubmitting && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
