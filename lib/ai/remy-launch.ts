export type OpenRemyEventDetail = {
  prompt?: string
  source?: string
}

export function openRemy(detail?: OpenRemyEventDetail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<OpenRemyEventDetail>('open-remy', { detail }))
}
