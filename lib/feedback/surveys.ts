import {
  getEventPostEventSurvey,
  getPostEventSurveyPageData,
  getRecentPostEventSurveys,
} from '@/lib/post-event/trust-loop-actions'

export async function getSurveyData(token: string) {
  return getPostEventSurveyPageData(token)
}

export async function getEventFeedback(eventId: string) {
  return getEventPostEventSurvey(eventId)
}

export async function getRecentFeedback(limit = 10) {
  return getRecentPostEventSurveys(limit)
}
