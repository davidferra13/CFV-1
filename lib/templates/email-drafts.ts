// Email Draft Templates — Fill-in-the-Blank
// Professional email templates with variable substitution.
// These are the standard templates every catering business uses.
// AI can optionally personalize tone — but the template always works.

// ── Types (match the AI version exactly) ───────────────────────────────────

export type EmailDraft = {
  subject: string
  body: string
}

// ── Template Variables ─────────────────────────────────────────────────────

export type TemplateVars = {
  clientName: string
  clientFirstName: string
  chefName: string
  businessName?: string
  occasion?: string
  eventDate?: string
  guestCount?: number
  quotedAmount?: string // formatted, e.g. "$2,500"
  amountDue?: string
  declineReason?: string
  milestone?: string
  incidentDescription?: string
  paymentLink?: string
  reviewLink?: string
  referralLink?: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'your upcoming event'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

// ── Templates ──────────────────────────────────────────────────────────────

/** Thank-you email after a completed event */
export function thankYouTemplate(v: TemplateVars): EmailDraft {
  return {
    subject: `Thank you, ${v.clientFirstName}!`,
    body: `Hi ${v.clientFirstName},

Thank you so much for having me cook for your ${v.occasion ?? 'event'}${v.eventDate ? ' on ' + formatDate(v.eventDate) : ''}. It was a true pleasure, and I hope you and your guests enjoyed every course.

If there's anything you'd like to share about the experience — or if you're already thinking about your next event — I'd love to hear from you.

Warmly,
${v.chefName}${v.businessName ? '\n' + v.businessName : ''}`,
  }
}

/** Referral request — warm, non-pushy */
export function referralRequestTemplate(v: TemplateVars): EmailDraft {
  return {
    subject: `A small favor, ${v.clientFirstName}`,
    body: `Hi ${v.clientFirstName},

I hope you're doing well! I truly enjoyed cooking for your ${v.occasion ?? 'event'} and it means a lot that you trusted me with such a special occasion.

If you know anyone who might enjoy a private chef experience, I'd be honored if you passed along my name. Word of mouth is the heart of my business, and a recommendation from you would mean the world.

No pressure at all — just wanted to put it out there.

Thank you again,
${v.chefName}${v.businessName ? '\n' + v.businessName : ''}`,
  }
}

/** Testimonial request */
export function testimonialRequestTemplate(v: TemplateVars): EmailDraft {
  return {
    subject: `Would you share a few words?`,
    body: `Hi ${v.clientFirstName},

I'm so glad you enjoyed your ${v.occasion ?? 'event'}. If you have a moment, I'd love to feature a short testimonial from you — just a sentence or two about your experience.

It helps other clients know what to expect, and it would really mean a lot to me.

If you're open to it, just reply to this email with a few words. No pressure at all.

Thank you so much,
${v.chefName}${v.businessName ? '\n' + v.businessName : ''}`,
  }
}

/** Quote cover letter — professional, confident */
export function quoteCoverLetterTemplate(v: TemplateVars): EmailDraft {
  return {
    subject: `Your personalized quote for ${v.occasion ?? 'your event'}`,
    body: `Hi ${v.clientFirstName},

Thank you for reaching out! I'm excited about your ${v.occasion ?? 'upcoming event'}${v.eventDate ? ' on ' + formatDate(v.eventDate) : ''}${v.guestCount ? ' for ' + v.guestCount + ' guests' : ''}.

Attached is your personalized quote${v.quotedAmount ? ' totaling ' + v.quotedAmount : ''}. It includes everything we discussed — menu, service, and all the details.

Please take your time reviewing it. If you have any questions or would like to adjust anything, I'm happy to chat.

Looking forward to cooking for you,
${v.chefName}${v.businessName ? '\n' + v.businessName : ''}`,
  }
}

/** Decline response — gracious, leaves door open */
export function declineResponseTemplate(v: TemplateVars): EmailDraft {
  return {
    subject: `Thank you for considering me`,
    body: `Hi ${v.clientFirstName},

Thank you so much for reaching out about your ${v.occasion ?? 'event'}. ${v.declineReason ? 'Unfortunately, ' + v.declineReason + '.' : "Unfortunately, I won't be able to take this one on."}

I truly appreciate you thinking of me, and I hope we can work together on a future occasion. Please don't hesitate to reach out anytime.

Wishing you a wonderful event,
${v.chefName}${v.businessName ? '\n' + v.businessName : ''}`,
  }
}

/** Cancellation response — empathetic, professional */
export function cancellationResponseTemplate(v: TemplateVars): EmailDraft {
  return {
    subject: `Regarding your ${v.occasion ?? 'event'} cancellation`,
    body: `Hi ${v.clientFirstName},

I received your cancellation for the ${v.occasion ?? 'event'}${v.eventDate ? ' on ' + formatDate(v.eventDate) : ''}. I completely understand — life happens, and I want you to know there are no hard feelings.

${v.amountDue ? "Per our agreement, I'll follow up separately regarding any applicable cancellation terms." : "If any financial matters need to be sorted, I'll follow up separately."}

I hope we get the chance to work together in the future. Please don't hesitate to reach out when the time is right.

All the best,
${v.chefName}${v.businessName ? '\n' + v.businessName : ''}`,
  }
}

/** Payment reminder — friendly but clear */
export function paymentReminderTemplate(v: TemplateVars): EmailDraft {
  return {
    subject: `Friendly reminder: payment for your ${v.occasion ?? 'event'}`,
    body: `Hi ${v.clientFirstName},

I hope you're doing well! I'm writing with a friendly reminder about the outstanding balance${v.amountDue ? ' of ' + v.amountDue : ''} for your ${v.occasion ?? 'event'}${v.eventDate ? ' on ' + formatDate(v.eventDate) : ''}.

${v.paymentLink ? 'You can pay online here: ' + v.paymentLink : 'Please let me know the best way to arrange payment.'}

If you've already sent payment, please disregard this note. And if you have any questions about the invoice, I'm happy to go over it.

Thank you,
${v.chefName}${v.businessName ? '\n' + v.businessName : ''}`,
  }
}

/** Re-engagement — warm check-in for dormant clients */
export function reEngagementTemplate(v: TemplateVars): EmailDraft {
  return {
    subject: `It's been a while, ${v.clientFirstName}!`,
    body: `Hi ${v.clientFirstName},

It's been a while since we last connected, and I just wanted to say hello! I have such great memories of cooking for your ${v.occasion ?? 'event'}.

If you're thinking about hosting again — whether it's a dinner party, holiday gathering, or just a special night in — I'd love to be part of it.

No pressure at all. Just wanted you to know I'm here whenever you're ready.

Hope you're doing great,
${v.chefName}${v.businessName ? '\n' + v.businessName : ''}`,
  }
}

/** Milestone recognition — celebrate loyalty */
export function milestoneRecognitionTemplate(v: TemplateVars): EmailDraft {
  const milestoneText = v.milestone ?? 'another wonderful event together'
  return {
    subject: `Celebrating ${milestoneText}!`,
    body: `Hi ${v.clientFirstName},

I wanted to take a moment to celebrate — ${milestoneText}! It's been such a joy cooking for you, and I'm grateful for your continued trust.

Every event with you is special, and I look forward to many more. Thank you for being such a wonderful client.

With gratitude,
${v.chefName}${v.businessName ? '\n' + v.businessName : ''}`,
  }
}

/** Food safety incident report — formal, factual */
export function foodSafetyIncidentTemplate(v: TemplateVars): EmailDraft {
  return {
    subject: `Food Safety Incident Report`,
    body: `FOOD SAFETY INCIDENT REPORT

Date: ${new Date().toLocaleDateString('en-US')}
Reported by: ${v.chefName}${v.businessName ? ' (' + v.businessName + ')' : ''}

INCIDENT DESCRIPTION:
${v.incidentDescription ?? '[Description required]'}

IMMEDIATE ACTIONS TAKEN:
- [List actions taken to address the issue]
- [List any affected food items that were discarded]
- [List any guests notified]

CORRECTIVE MEASURES:
- [Steps to prevent recurrence]

FOLLOW-UP REQUIRED:
- [ ] Health department notification (if required)
- [ ] Insurance company notification (if required)
- [ ] Client communication
- [ ] Team debriefing

This report is for internal documentation purposes. Consult your local health department for reporting requirements.`,
  }
}

/** Follow-up email — warm, personal */
export function followUpTemplate(v: TemplateVars): EmailDraft {
  return {
    subject: `Following up — ${v.occasion ?? 'your event'}`,
    body: `Hi ${v.clientFirstName},

Just wanted to follow up and see how everything went after your ${v.occasion ?? 'event'}${v.eventDate ? ' on ' + formatDate(v.eventDate) : ''}. I hope you and your guests are still enjoying the memories!

If there's anything on your mind — feedback, future events, or just saying hello — I'm always here.

Looking forward to hearing from you,
${v.chefName}${v.businessName ? '\n' + v.businessName : ''}`,
  }
}

/** Review request */
export function reviewRequestTemplate(v: TemplateVars): EmailDraft {
  return {
    subject: `How was your experience?`,
    body: `Hi ${v.clientFirstName},

Thank you again for a wonderful ${v.occasion ?? 'event'}! I hope you and your guests had an incredible time.

If you have a moment, I'd love to hear how the experience was for you. ${v.reviewLink ? 'You can leave a review here: ' + v.reviewLink : 'A quick reply with your thoughts would mean the world.'}

Your feedback helps me improve and helps other clients find the right chef for their special occasions.

Thank you so much,
${v.chefName}${v.businessName ? '\n' + v.businessName : ''}`,
  }
}

// ── Router ─────────────────────────────────────────────────────────────────

const TEMPLATE_MAP: Record<string, (v: TemplateVars) => EmailDraft> = {
  'draft.thank_you': thankYouTemplate,
  'draft.referral_request': referralRequestTemplate,
  'draft.testimonial_request': testimonialRequestTemplate,
  'draft.quote_cover_letter': quoteCoverLetterTemplate,
  'draft.decline_response': declineResponseTemplate,
  'draft.cancellation_response': cancellationResponseTemplate,
  'draft.payment_reminder': paymentReminderTemplate,
  'draft.re_engagement': reEngagementTemplate,
  'draft.milestone_recognition': milestoneRecognitionTemplate,
  'draft.food_safety_incident': foodSafetyIncidentTemplate,
  'draft.follow_up': followUpTemplate,
  'draft.review_request': reviewRequestTemplate,
}

/**
 * Routes to the correct template by task type.
 * Returns null if the task type is not recognized.
 */
export function getEmailTemplate(taskType: string, vars: TemplateVars): EmailDraft | null {
  const templateFn = TEMPLATE_MAP[taskType]
  if (!templateFn) return null
  return templateFn(vars)
}

/** List all available template types */
export function listEmailTemplates(): string[] {
  return Object.keys(TEMPLATE_MAP)
}
