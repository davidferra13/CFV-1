export type SnoozeEscalation = {
  message: string
  remyPrompt: string
  actionLabel: string
}

export const REPEAT_SNOOZE_THRESHOLD = 2

type ItemType = 'inquiry' | 'payment' | 'follow-up' | 'thread' | 'reminder' | 'generic'

type EscalationContext = {
  clientName?: string
  subject?: string
  snoozeCount: number
}

const MESSAGES: Record<ItemType, (ctx: EscalationContext) => string> = {
  inquiry: (ctx) =>
    `You've snoozed this inquiry ${ctx.snoozeCount} times. Want Remy to draft a follow-up?`,
  payment: () => 'This payment reminder keeps coming back. Let Remy draft a friendly nudge?',
  'follow-up': () => 'Still pending. Want Remy to draft a reply?',
  thread: () => 'Still pending. Want Remy to draft a reply?',
  reminder: (ctx) => `You've deferred this ${ctx.snoozeCount} times. Want Remy to help?`,
  generic: (ctx) => `You've deferred this ${ctx.snoozeCount} times. Want Remy to help?`,
}

function buildRemyPrompt(itemType: ItemType, ctx: EscalationContext): string {
  const name = ctx.clientName ?? 'the client'
  switch (itemType) {
    case 'inquiry':
      return `Draft a follow-up for ${name}'s inquiry`
    case 'payment':
      return `Draft a payment reminder for ${name}`
    case 'follow-up':
      return `Draft a follow-up message for ${name}`
    case 'thread':
      return ctx.subject
        ? `Draft a reply to ${name}'s message about ${ctx.subject}`
        : `Draft a reply to ${name}'s message`
    case 'reminder':
      return ctx.subject
        ? `Help me handle this reminder: ${ctx.subject}`
        : 'Help me handle this reminder'
    case 'generic':
      return 'Help me decide what to do about this'
  }
}

export function getSnoozeEscalation(
  itemType: ItemType,
  context: EscalationContext
): SnoozeEscalation {
  return {
    message: MESSAGES[itemType](context),
    remyPrompt: buildRemyPrompt(itemType, context),
    actionLabel: 'Let Remy handle it',
  }
}
