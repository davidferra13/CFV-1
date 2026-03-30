// Dinner Circle email invitation templates
// Appended to the chef's first response to a new inquiry.

export type InvitationStyle = 'casual' | 'formal' | 'minimal' | 'enthusiastic'

interface TemplateInput {
  chefName: string
  circleUrl: string
  style?: InvitationStyle
}

const templates: Record<InvitationStyle, (input: TemplateInput) => string> = {
  casual: ({ circleUrl }) =>
    `I also set up a page for your dinner where you can see the menu, share details with anyone joining, and keep everything in one place. No account needed:\n\n${circleUrl}\n\nIf you prefer email, that works too.`,

  formal: ({ chefName, circleUrl }) =>
    `For your convenience, I have prepared a dedicated page for your event where you can review the menu, share information with your guests, and track all the details. No account or login is required:\n\n${circleUrl}\n\nPlease feel free to continue corresponding via email if you prefer. - ${chefName}`,

  minimal: ({ circleUrl }) => `Here's your dinner page (no login needed): ${circleUrl}`,

  enthusiastic: ({ circleUrl }) =>
    `I'm excited about this dinner! I set up a page where you (and anyone else joining) can check out the menu, share dietary info, and see everything come together. No sign-up, just click:\n\n${circleUrl}`,
}

export function getDinnerCircleInvitation(input: TemplateInput): {
  paragraph: string
  circleUrl: string
} {
  const style = input.style || 'casual'
  return {
    paragraph: templates[style](input),
    circleUrl: input.circleUrl,
  }
}

export function getAvailableStyles(): { value: InvitationStyle; label: string }[] {
  return [
    { value: 'casual', label: 'Casual (recommended)' },
    { value: 'formal', label: 'Formal (corporate clients)' },
    { value: 'minimal', label: 'Minimal (just the link)' },
    { value: 'enthusiastic', label: 'Enthusiastic (tech-friendly clients)' },
  ]
}
