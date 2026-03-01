// Remy "Get to Know You" Survey — Question definitions, groups, and culinary profile mapping.
// 25 questions across 5 groups. Each question has a conversational phrasing for Remy
// and an optional mapping to a culinary profile key for automatic backfill.

import type { CulinaryQuestionKey } from '@/lib/ai/chef-profile-constants'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SurveyQuestion {
  /** Unique key, e.g. 'kitchen_0' */
  key: string
  /** Conversational prompt Remy will adapt (not read verbatim) */
  prompt: string
  /** Memory category for persisting the answer */
  memoryCategory: MemoryCategory
  /** If set, backfills this culinary profile question automatically */
  culinaryProfileKey?: CulinaryQuestionKey
}

export interface SurveyGroup {
  id: string
  label: string
  questions: SurveyQuestion[]
}

export interface SurveyState {
  status: 'not_started' | 'in_progress' | 'completed'
  introCompleted: boolean
  currentGroup: number
  currentQuestion: number
  answered: string[]
  skipped: string[]
  startedAt: string
  completedAt?: string
}

type MemoryCategory =
  | 'chef_preference'
  | 'client_insight'
  | 'business_rule'
  | 'communication_style'
  | 'culinary_note'
  | 'scheduling_pattern'
  | 'pricing_pattern'
  | 'workflow_preference'

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export const SURVEY_GROUPS: SurveyGroup[] = [
  {
    id: 'kitchen',
    label: 'Kitchen DNA',
    questions: [
      {
        key: 'kitchen_0',
        prompt:
          'What kind of chef are you? Like, if someone asked at a dinner party — how do you describe what you do?',
        memoryCategory: 'culinary_note',
        culinaryProfileKey: 'cooking_philosophy',
      },
      {
        key: 'kitchen_1',
        prompt: 'What got you into private cheffing specifically? Everyone has an origin story.',
        memoryCategory: 'culinary_note',
      },
      {
        key: 'kitchen_2',
        prompt: "What's your go-to dish when you really want to impress someone?",
        memoryCategory: 'culinary_note',
        culinaryProfileKey: 'signature_dish',
      },
      {
        key: 'kitchen_3',
        prompt: 'Which cuisines feel most like home to you?',
        memoryCategory: 'culinary_note',
        culinaryProfileKey: 'favorite_cuisines',
      },
      {
        key: 'kitchen_4',
        prompt: "What's a flavor or technique you can't stop using lately?",
        memoryCategory: 'culinary_note',
        culinaryProfileKey: 'flavor_profile',
      },
    ],
  },
  {
    id: 'business',
    label: 'Business Style',
    questions: [
      {
        key: 'business_0',
        prompt: "What's your sweet spot for event size? Where do you feel most in your element?",
        memoryCategory: 'business_rule',
      },
      {
        key: 'business_1',
        prompt:
          "What's your dream client like? Not just someone who pays well — who lights you up?",
        memoryCategory: 'client_insight',
      },
      {
        key: 'business_2',
        prompt:
          'How do you feel about pricing? Are you someone who charges confidently or still finding your number?',
        memoryCategory: 'pricing_pattern',
      },
      {
        key: 'business_3',
        prompt:
          'What part of running the business feels like a drag vs what part do you actually enjoy?',
        memoryCategory: 'workflow_preference',
      },
      {
        key: 'business_4',
        prompt: 'Where do you want your business to be in a year?',
        memoryCategory: 'business_rule',
      },
    ],
  },
  {
    id: 'workflow',
    label: 'How You Work',
    questions: [
      {
        key: 'workflow_0',
        prompt: 'Walk me through your typical prep day — what does that look like?',
        memoryCategory: 'workflow_preference',
      },
      {
        key: 'workflow_1',
        prompt: 'What days are your busiest? When do you like to keep free?',
        memoryCategory: 'scheduling_pattern',
      },
      {
        key: 'workflow_2',
        prompt: 'How do you handle grocery shopping — one big trip, or day-of?',
        memoryCategory: 'scheduling_pattern',
      },
      {
        key: 'workflow_3',
        prompt: 'Do you work solo or do you have people you bring in for bigger events?',
        memoryCategory: 'workflow_preference',
      },
      {
        key: 'workflow_4',
        prompt: "What's your biggest bottleneck right now — the thing that slows you down most?",
        memoryCategory: 'workflow_preference',
      },
    ],
  },
  {
    id: 'communication',
    label: 'Communication Style',
    questions: [
      {
        key: 'communication_0',
        prompt: "When you email a client, are you more formal or more casual? What's your vibe?",
        memoryCategory: 'communication_style',
      },
      {
        key: 'communication_1',
        prompt: 'How detailed do you like things? Short and sweet, or the full rundown?',
        memoryCategory: 'communication_style',
      },
      {
        key: 'communication_2',
        prompt:
          'How do you like ME to talk to you? More emojis and energy, or more chill and direct?',
        memoryCategory: 'communication_style',
      },
      {
        key: 'communication_3',
        prompt:
          'How often do you want me checking in with nudges and reminders — a lot, or only when it matters?',
        memoryCategory: 'communication_style',
      },
      {
        key: 'communication_4',
        prompt: 'Do you prefer I give you the full picture or just the highlights?',
        memoryCategory: 'communication_style',
      },
    ],
  },
  {
    id: 'personal',
    label: 'The Personal Touch',
    questions: [
      {
        key: 'personal_0',
        prompt: "What's a food memory that really shaped you — something you still think about?",
        memoryCategory: 'culinary_note',
        culinaryProfileKey: 'food_memory',
      },
      {
        key: 'personal_1',
        prompt: 'If you could cook for one person, living or dead, who and what would you make?',
        memoryCategory: 'culinary_note',
        culinaryProfileKey: 'dream_dinner_party',
      },
      {
        key: 'personal_2',
        prompt: "What's the hardest lesson you learned in a kitchen?",
        memoryCategory: 'culinary_note',
      },
      {
        key: 'personal_3',
        prompt: 'What are you most proud of in your career so far?',
        memoryCategory: 'chef_preference',
      },
      {
        key: 'personal_4',
        prompt: "What's something people would be surprised to learn about you as a chef?",
        memoryCategory: 'chef_preference',
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Total number of survey questions */
export const SURVEY_TOTAL_QUESTIONS = SURVEY_GROUPS.reduce((sum, g) => sum + g.questions.length, 0)

/** Get a specific question by group + question index */
export function getSurveyQuestion(
  groupIndex: number,
  questionIndex: number
): SurveyQuestion | null {
  const group = SURVEY_GROUPS[groupIndex]
  if (!group) return null
  return group.questions[questionIndex] ?? null
}

/** Get the next question after a given position, skipping already-answered */
export function getNextSurveyQuestion(
  state: SurveyState
): { groupIndex: number; questionIndex: number; question: SurveyQuestion } | null {
  let gi = state.currentGroup
  let qi = state.currentQuestion

  while (gi < SURVEY_GROUPS.length) {
    const group = SURVEY_GROUPS[gi]
    while (qi < group.questions.length) {
      const q = group.questions[qi]
      if (!state.answered.includes(q.key) && !state.skipped.includes(q.key)) {
        return { groupIndex: gi, questionIndex: qi, question: q }
      }
      qi++
    }
    gi++
    qi = 0
  }

  return null // all questions answered or skipped
}

/** Create a fresh survey state */
export function createInitialSurveyState(): SurveyState {
  return {
    status: 'in_progress',
    introCompleted: false,
    currentGroup: 0,
    currentQuestion: 0,
    answered: [],
    skipped: [],
    startedAt: new Date().toISOString(),
  }
}
