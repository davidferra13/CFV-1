import type { MenuCallCoordination } from '@/lib/calling/voice-ops-types'

const CREATIVE_MENU_PATTERNS = [
  /\bbuild (?:me |us )?a menu\b/i,
  /\bcreate (?:me |us )?a menu\b/i,
  /\bmake (?:me |us )?a menu\b/i,
  /\bsuggest (?:a |some )?(?:menu|menus|dishes)\b/i,
  /\bwhat should (?:we|i) (?:serve|cook|make)\b/i,
  /\bdish idea\b/i,
  /\bmenu idea\b/i,
  /\brecipe\b/i,
]

const DIETARY_PATTERNS = [
  /\ballerg/i,
  /\bdietary\b/i,
  /\bgluten\b/i,
  /\bnut\b/i,
  /\bshellfish\b/i,
  /\bmedical\b/i,
  /\bcross.?contact\b/i,
  /\bcross.?contamination\b/i,
]

const REVISION_PATTERNS = [
  /\bswap\b/i,
  /\bchange\b/i,
  /\breplace\b/i,
  /\bsubstitut/i,
  /\brevision\b/i,
  /\bedit\b/i,
]

const CONFIRMATION_PATTERNS = [
  /\bapprove\b/i,
  /\bapproved\b/i,
  /\bconfirm\b/i,
  /\bconfirmed\b/i,
  /\blooks good\b/i,
  /\byes\b/i,
]

export function coordinateMenuCall(utterance: string | null | undefined): MenuCallCoordination {
  const text = (utterance ?? '').replace(/\s+/g, ' ').trim()
  if (!text || !/\b(menu|course|dish|allerg|dietary|gluten|shellfish|nut)\b/i.test(text)) {
    return {
      category: 'not_menu_related',
      allowedToHandleByVoice: true,
      urgency: 'standard',
      response: 'I can take a message for the chef.',
      followUpPrompt: 'Please share your name, number, and the best next step.',
    }
  }

  if (CREATIVE_MENU_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      category: 'restricted_creative_request',
      allowedToHandleByVoice: false,
      urgency: 'review',
      response:
        'I cannot create recipes, menus, dish ideas, or tell the chef what to cook. I can record your preference for chef review.',
      followUpPrompt: 'Please share the preference or question you want the chef to review.',
    }
  }

  if (DIETARY_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      category: 'dietary_review',
      allowedToHandleByVoice: true,
      urgency: 'urgent',
      response:
        'Dietary and allergy details need chef review. I can record the exact concern for the chef now.',
      followUpPrompt: 'Please state the allergy, restriction, severity, and affected guest.',
    }
  }

  if (REVISION_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      category: 'menu_revision',
      allowedToHandleByVoice: true,
      urgency: 'review',
      response:
        "I can record menu revision notes for the chef, but I cannot change the chef's menu by voice.",
      followUpPrompt:
        'Please say which course or item needs review and what you want the chef to consider.',
    }
  }

  if (CONFIRMATION_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      category: 'menu_confirmation',
      allowedToHandleByVoice: true,
      urgency: 'standard',
      response: 'I can record that menu confirmation for the chef.',
      followUpPrompt: 'Please confirm the menu version, event date, and any final constraints.',
    }
  }

  return {
    category: 'menu_revision',
    allowedToHandleByVoice: true,
    urgency: 'review',
    response:
      'I can record menu selections, preferences, and questions for the chef, but I cannot create or change the menu.',
    followUpPrompt: 'Please share the exact menu note you want the chef to review.',
  }
}
