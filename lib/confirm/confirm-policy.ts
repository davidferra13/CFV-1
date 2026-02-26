export type ConfirmRisk = 'low' | 'medium' | 'high'

export type ConfirmPolicyInput = {
  risk: ConfirmRisk
  reversible: boolean
  entityName?: string
  impactPreview?: string
  actionLabel?: string
}

export type ConfirmPolicyDecision = {
  mode: 'none' | 'simple' | 'strong'
  title: string
  message: string
  impactPreview?: string
  actionLabel: string
  requireTypedConfirmation: boolean
  typedValue?: string
}

function isProductionRuntime(): boolean {
  const raw =
    process.env.NEXT_PUBLIC_APP_ENV ||
    process.env.APP_ENV ||
    process.env.NEXT_PUBLIC_VERCEL_ENV ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    ''
  return raw.toLowerCase().includes('prod')
}

export function confirmPolicy(input: ConfirmPolicyInput): ConfirmPolicyDecision {
  const actionLabel = input.actionLabel ?? 'Confirm'
  const entityLabel = input.entityName?.trim() || 'this item'

  if (input.risk === 'low' && input.reversible) {
    return {
      mode: 'none',
      title: 'No Confirmation Required',
      message: 'This action is reversible and low risk.',
      impactPreview: input.impactPreview,
      actionLabel,
      requireTypedConfirmation: false,
    }
  }

  if (input.risk === 'high' && (!input.reversible || isProductionRuntime())) {
    return {
      mode: 'strong',
      title: `Confirm high-risk action on ${entityLabel}`,
      message:
        input.reversible && isProductionRuntime()
          ? 'This is a production action. Confirm before continuing.'
          : 'This action cannot be undone. Please confirm before continuing.',
      impactPreview: input.impactPreview,
      actionLabel,
      requireTypedConfirmation: true,
      typedValue: input.entityName?.trim() || 'CONFIRM',
    }
  }

  return {
    mode: 'simple',
    title: `Confirm action for ${entityLabel}`,
    message: input.reversible
      ? 'Please confirm you want to continue.'
      : 'This action may not be reversible.',
    impactPreview: input.impactPreview,
    actionLabel,
    requireTypedConfirmation: false,
  }
}
