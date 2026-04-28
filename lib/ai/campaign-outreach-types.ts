export type CampaignConceptDraft = {
  hook: string
  description: string
  callToAction: string
  generatedAt: string
}

export type PersonalizedDraft = {
  subject: string
  body: string
}

export type GenerateAllResult = {
  generated: number
  failed: number
  ollamaOffline: boolean
}
