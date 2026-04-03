import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildBetaSurveyAnswersWithMeta,
  getDefaultRespondentRoleForSurveyType,
  getBetaSurveyResponseMeta,
  getStepsForSurvey,
  isQuestionVisible,
  type SurveyQuestion,
} from '../../lib/beta-survey/survey-utils'
import {
  BETA_SURVEY_BANNER_DISMISS_DURATION_MS,
  getBetaSurveyBannerDismissKey,
  getBetaSurveyCompletionKey,
} from '../../lib/beta-survey/survey-presence'

const branchingQuestions: SurveyQuestion[] = [
  {
    id: 'role_status',
    type: 'single_select',
    label: 'Role',
    required: true,
    order: 1,
    section: 'About You',
    options: ['Hired before', 'Considering'],
  },
  {
    id: 'core',
    type: 'short_text',
    label: 'Core',
    required: true,
    order: 2,
    section: 'Core Questions',
  },
  {
    id: 'experienced_only',
    type: 'single_select',
    label: 'Experienced',
    required: true,
    order: 3,
    section: 'Experienced Branch',
    options: ['Yes'],
    show_if: { questionId: 'role_status', equals: ['Hired before'] },
  },
  {
    id: 'considering_only',
    type: 'single_select',
    label: 'Considering',
    required: true,
    order: 4,
    section: 'Consideration Branch',
    options: ['Yes'],
    show_if: { questionId: 'role_status', equals: ['Considering'] },
  },
]

describe('beta survey utils', () => {
  it('groups sectioned questions into ordered steps', () => {
    const steps = getStepsForSurvey('market_research_client', branchingQuestions)

    assert.deepEqual(steps, [
      { label: 'About You', questionIds: ['role_status'] },
      { label: 'Core Questions', questionIds: ['core'] },
      { label: 'Experienced Branch', questionIds: ['experienced_only'] },
      { label: 'Consideration Branch', questionIds: ['considering_only'] },
    ])
  })

  it('evaluates branching visibility from prior answers', () => {
    const experienced = branchingQuestions[2]
    const considering = branchingQuestions[3]

    assert.equal(isQuestionVisible(experienced, { role_status: 'Hired before' }), true)
    assert.equal(isQuestionVisible(experienced, { role_status: 'Considering' }), false)
    assert.equal(isQuestionVisible(considering, { role_status: 'Considering' }), true)
    assert.equal(isQuestionVisible(considering, { role_status: 'Hired before' }), false)
  })

  it('maps public research surveys to generalized respondent roles', () => {
    assert.equal(getDefaultRespondentRoleForSurveyType('market_research_operator'), 'food_operator')
    assert.equal(getDefaultRespondentRoleForSurveyType('market_research_client'), 'consumer')
    assert.equal(getDefaultRespondentRoleForSurveyType('pre_beta'), 'tester')
  })

  it('stores and reads launch metadata without mutating core answers', () => {
    const enriched = buildBetaSurveyAnswersWithMeta(
      { one_wish: 'Automate form launches' },
      {
        source: 'warm_outreach',
        channel: 'email',
        campaign: 'wave_1',
        wave: 'wave-1',
        launch: 'operator-soft-launch',
        surveySlug: 'food-operator-wave-1',
        respondentRole: 'food_operator',
      }
    )

    assert.equal(enriched.one_wish, 'Automate form launches')

    assert.deepEqual(getBetaSurveyResponseMeta(enriched), {
      source: 'warm_outreach',
      channel: 'email',
      campaign: 'wave_1',
      wave: 'wave-1',
      launch: 'operator-soft-launch',
      surveySlug: 'food-operator-wave-1',
      respondentRole: 'food_operator',
    })
  })

  it('builds stable browser markers for survey dismissal and completion', () => {
    assert.equal(
      getBetaSurveyBannerDismissKey('food-operator-wave-1'),
      'beta-survey-banner-dismissed-food-operator-wave-1'
    )
    assert.equal(
      getBetaSurveyCompletionKey('food-operator-wave-1'),
      'beta-survey-completed-food-operator-wave-1'
    )
    assert.equal(BETA_SURVEY_BANNER_DISMISS_DURATION_MS, 24 * 60 * 60 * 1000)
  })
})
