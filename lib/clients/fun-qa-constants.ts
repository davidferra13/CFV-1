// Fun Q&A Constants
// Stable question keys shared between the client form and chef display.
// Lives in a separate file (no 'use server') so it can be imported by client components.

export const FUN_QA_QUESTIONS = [
  {
    key: 'time_travel_meal',
    emoji: '⏳',
    question: 'If you could eat in any time period, what would you eat, with who, and where?',
    placeholder: 'e.g. Paris in the 1920s, a long bistro lunch with Hemingway...',
  },
  {
    key: 'last_meal',
    emoji: '🥂',
    question: 'Last meal on earth — what is it? (food + drink)',
    placeholder: "Make it count. Don't hold back.",
  },
  {
    key: 'trash_food',
    emoji: '🍟',
    question: 'What\'s your "trash food" that you love way too much?',
    placeholder: 'No judgment. Everyone has one.',
  },
  {
    key: 'sweet_or_savory',
    emoji: '🍫',
    question: "Sweet or savory — and what's the one thing that always wins you over?",
    placeholder: 'e.g. Savory, but a warm chocolate chip cookie will always derail me',
  },
  {
    key: 'prove_yourself',
    emoji: '👨‍🍳',
    question: 'If I could only cook you one dish to prove myself, what should it be?',
    placeholder: 'Tell me your test.',
  },
  {
    key: 'food_you_hate',
    emoji: '🤢',
    question: "What's a food you hate that everyone else seems to love?",
    placeholder: 'e.g. Cilantro, oysters, black licorice...',
  },
  {
    key: 'midnight_snack',
    emoji: '🌙',
    question: 'What\'s the most "you" snack at 11pm?',
    placeholder: 'e.g. Crackers and cheese standing over the sink',
  },
  {
    key: 'dinner_vibe',
    emoji: '🕯️',
    question:
      "Pick one: cozy dinner party, chaotic feast, or quiet two-person meal — what's your vibe?",
    placeholder: 'Or describe your own...',
  },
  {
    key: 'dream_menu_theme',
    emoji: '🌊',
    question:
      'What\'s your dream menu theme: seafood night, steakhouse, Italian, coastal New England, or "surprise me"?',
    placeholder: 'e.g. Full Italian spread, Sunday gravy and all',
  },
  {
    key: 'obsessed_ingredient',
    emoji: '🧄',
    question: "What's one ingredient you're obsessed with right now?",
    placeholder: 'e.g. Miso, preserved lemon, Calabrian chili...',
  },
  {
    key: 'best_meal_ever',
    emoji: '🏆',
    question: "What's the best meal you've ever had, and what made it unforgettable?",
    placeholder: 'The food, the people, the place — all of it',
  },
  {
    key: 'meal_preference',
    emoji: '🍳',
    question:
      'What do you prefer: breakfast, lunch, dinner, brunch, breakfast for dinner, midnight snack, or just constant snacking?',
    placeholder: 'Be honest.',
  },
] as const

export type FunQAKey = (typeof FUN_QA_QUESTIONS)[number]['key']
export type FunQAAnswers = Partial<Record<FunQAKey, string>>
