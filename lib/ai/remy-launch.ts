export type OpenRemyEventDetail = {
  prompt?: string
  source?: string
  send?: boolean
}

export function getOpenRemyPrompt(detail?: OpenRemyEventDetail): string | null {
  const prompt = detail?.prompt?.trim()
  return prompt ? prompt : null
}

export function shouldAutoSendOpenRemyPrompt(detail?: OpenRemyEventDetail): boolean {
  return Boolean(detail?.send && getOpenRemyPrompt(detail))
}

export function openRemy(detail?: OpenRemyEventDetail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<OpenRemyEventDetail>('open-remy', { detail }))
}
