export interface QuickReplyTemplate {
  id: string
  label: string
  /** Template body with placeholders: {clientName}, {occasion}, {chefName} */
  body: string
}

export const QUICK_REPLY_TEMPLATES: QuickReplyTemplate[] = [
  {
    id: 'working-on-it',
    label: 'Working on details',
    body: `Hi {clientName},\n\nWanted to let you know I'm working on the details for your {occasion}. I'll have more information for you shortly.\n\nBest,\n{chefName}`,
  },
  {
    id: 'menu-coming',
    label: 'Menu coming soon',
    body: `Hi {clientName},\n\nI'm putting together a menu for your {occasion} and will send it over for your review soon. Looking forward to cooking for you!\n\nBest,\n{chefName}`,
  },
  {
    id: 'checking-in',
    label: 'Quick check-in',
    body: `Hi {clientName},\n\nJust checking in about your {occasion}. Let me know if you have any questions or if anything has changed on your end.\n\nBest,\n{chefName}`,
  },
  {
    id: 'availability-confirm',
    label: 'Confirming availability',
    body: `Hi {clientName},\n\nGood news, I'm available for your {occasion}. I'll follow up with pricing and menu options shortly.\n\nBest,\n{chefName}`,
  },
]

export function fillQuickReplyTemplate(body: string, vars: Record<string, string>): string {
  let result = body
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value)
  }
  return result
}
