// Chef Culinary Profile - Constants & Types
// Separated from chef-profile-actions.ts because 'use server' files
// can only export async functions.

export const CULINARY_QUESTIONS = [
  { key: 'cooking_philosophy', question: "What's your cooking philosophy in one sentence?" },
  { key: 'signature_dish', question: "What's your signature dish - the one that defines you?" },
  { key: 'favorite_cuisines', question: 'What cuisines inspire you most?' },
  { key: 'cant_live_without', question: 'What 5 ingredients can you not live without?' },
  {
    key: 'cooking_style',
    question: 'How would you describe your cooking style? (e.g., rustic, refined, modern, comfort)',
  },
  { key: 'food_memory', question: "What's a food memory that shaped who you are as a chef?" },
  { key: 'plating_philosophy', question: 'How do you approach plating and presentation?' },
  {
    key: 'sourcing_values',
    question:
      'What matters most to you about ingredient sourcing? (organic, local, seasonal, etc.)',
  },
  { key: 'comfort_food', question: 'What do you cook when you cook just for yourself?' },
  {
    key: 'dream_dinner_party',
    question: 'If you could cook for anyone (living or dead), who and what would you make?',
  },
  { key: 'culinary_hero', question: 'Who is the chef that influenced you most and why?' },
  {
    key: 'flavor_profile',
    question:
      'What flavor profiles do you gravitate toward? (bright/acidic, umami-rich, spice-forward, etc.)',
  },
] as const

export type CulinaryQuestionKey = (typeof CULINARY_QUESTIONS)[number]['key']

export interface CulinaryProfileAnswer {
  questionKey: CulinaryQuestionKey
  question: string
  answer: string
}
