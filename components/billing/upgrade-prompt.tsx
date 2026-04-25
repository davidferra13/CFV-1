'use client'

type UpgradePromptProps = {
  featureSlug: string
  show: boolean
  message?: string
  cta?: string
  onUpgrade?: () => void
  variant?: 'inline' | 'card'
  className?: string
}

export function UpgradePrompt(_props: UpgradePromptProps) {
  return null
}

export function useUpgradePrompt(_featureSlug: string) {
  return {
    shouldShow: false,
    trigger: () => undefined,
    dismiss: () => undefined,
  }
}
