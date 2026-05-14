export type DiscoveryMobileControlKind = 'filter' | 'sort' | 'shuffle' | 'favorites' | 'incognito'

export type DiscoveryMobileControl = {
  id: string
  kind: DiscoveryMobileControlKind
  label: string
  priority: number
  selected?: boolean
}

export type DiscoveryMobileBottomSheetContract = {
  title: string
  controls: DiscoveryMobileControl[]
  minTouchTargetPx: number
  trapsFocus: boolean
  closesOnEscape: boolean
  closesOnScrim: boolean
  snapPoints: readonly ['peek', 'half', 'full']
  overflowPolicy: 'sheet-scroll'
}

export function buildDiscoveryMobileBottomSheetContract(input: {
  title?: string
  controls: readonly DiscoveryMobileControl[]
}): DiscoveryMobileBottomSheetContract {
  return {
    title: input.title ?? 'Discovery controls',
    controls: [...input.controls].sort((a, b) => a.priority - b.priority).filter(dedupeControl()),
    minTouchTargetPx: 44,
    trapsFocus: true,
    closesOnEscape: true,
    closesOnScrim: true,
    snapPoints: ['peek', 'half', 'full'],
    overflowPolicy: 'sheet-scroll',
  }
}

export function validateDiscoveryMobileBottomSheetContract(
  contract: DiscoveryMobileBottomSheetContract
): { passed: boolean; violations: string[] } {
  const violations: string[] = []
  if (contract.minTouchTargetPx < 44) violations.push('touch-target-too-small')
  if (!contract.trapsFocus) violations.push('focus-not-trapped')
  if (!contract.closesOnEscape) violations.push('escape-does-not-close')
  if (!contract.closesOnScrim) violations.push('scrim-does-not-close')
  if (contract.overflowPolicy !== 'sheet-scroll') violations.push('horizontal-overflow-risk')
  if (contract.controls.some((control) => !control.label.trim())) violations.push('unnamed-control')
  return { passed: violations.length === 0, violations }
}

function dedupeControl(): (control: DiscoveryMobileControl) => boolean {
  const seen = new Set<string>()
  return (control) => {
    if (seen.has(control.id)) return false
    seen.add(control.id)
    return true
  }
}
