// AI Prompt Templates for CIL Signal Draft Generation
// Each function returns a system prompt + user context for parseWithOllama.

export interface DraftPromptContext {
  clientName: string
  chefName: string
  [key: string]: unknown
}

// -- Pipeline: follow-up for stale leads / expiring proposals ----------------

export function pipelineFollowUpPrompt(ctx: {
  clientName: string
  chefName: string
  daysSinceContact: number
  originalInquiry?: string | null
  occasion?: string | null
}): { system: string; user: string } {
  const userLines = [
    `Client: ${ctx.clientName}`,
    `Chef: ${ctx.chefName}`,
    `Days since last contact: ${ctx.daysSinceContact}`,
    ctx.originalInquiry ? `Original inquiry: ${ctx.originalInquiry}` : null,
    ctx.occasion ? `Occasion: ${ctx.occasion}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  return {
    system: `You are writing a warm, professional follow-up email from a private chef to a prospective client who inquired but has not responded. Keep it short (2-3 sentences). Be friendly, not pushy. Reference their original interest if known. Never use em dashes. Return JSON: {"subject": "short subject line", "greeting": "Hi [name],", "body": "2-3 sentences", "signOff": "brief closing"}`,
    user: userLines,
  }
}

// -- Calendar: outreach for dead spots / open dates --------------------------

export function calendarOutreachPrompt(ctx: {
  clientName: string
  chefName: string
  openDates: string[]
  seasonalNote?: string | null
}): { system: string; user: string } {
  const userLines = [
    `Client: ${ctx.clientName}`,
    `Chef: ${ctx.chefName}`,
    `Available dates: ${ctx.openDates.join(', ')}`,
    ctx.seasonalNote ? `Seasonal note: ${ctx.seasonalNote}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  return {
    system: `You are writing a casual, friendly email from a private chef to a past client about upcoming availability. Mention open dates naturally. Tease seasonal menu possibilities. Keep it short (2-3 sentences). No sales pressure. Never use em dashes. Return JSON: {"subject": "short subject line", "greeting": "Hi [name],", "body": "2-3 sentences", "signOff": "brief closing"}`,
    user: userLines,
  }
}

// -- Finance: gentle payment reminder ----------------------------------------

export function financeReminderPrompt(ctx: {
  clientName: string
  chefName: string
  amountDue: string
  daysOverdue: number
  eventReference?: string | null
}): { system: string; user: string } {
  const userLines = [
    `Client: ${ctx.clientName}`,
    `Chef: ${ctx.chefName}`,
    `Amount due: ${ctx.amountDue}`,
    `Days overdue: ${ctx.daysOverdue}`,
    ctx.eventReference ? `Event: ${ctx.eventReference}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  return {
    system: `You are writing a gentle, friendly payment reminder email from a private chef to a client with an outstanding balance. Be warm and understanding, not demanding. Reference the event if known. Keep it short (2-3 sentences). Provide easy next steps. Never use em dashes. Return JSON: {"subject": "short subject line", "greeting": "Hi [name],", "body": "2-3 sentences", "signOff": "brief closing"}`,
    user: userLines,
  }
}

// -- Reputation: review/testimonial request ----------------------------------

export function reputationRequestPrompt(ctx: {
  clientName: string
  chefName: string
  recentEvent?: string | null
  eventDate?: string | null
}): { system: string; user: string } {
  const userLines = [
    `Client: ${ctx.clientName}`,
    `Chef: ${ctx.chefName}`,
    ctx.recentEvent ? `Recent event: ${ctx.recentEvent}` : null,
    ctx.eventDate ? `Event date: ${ctx.eventDate}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  return {
    system: `You are writing a grateful, casual email from a private chef asking a happy client for a review or testimonial. Reference their recent event. Make it easy (suggest a short sentence is enough). Keep it brief (2-3 sentences). No guilt, no pressure. Never use em dashes. Return JSON: {"subject": "short subject line", "greeting": "Hi [name],", "body": "2-3 sentences", "signOff": "brief closing"}`,
    user: userLines,
  }
}
