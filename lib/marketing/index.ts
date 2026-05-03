// Marketing module - public API

// ab-test-actions.ts - 'use server'
export { createABTest, resolveABTest, getABTestResults, listABTests } from './ab-test-actions'
export type { CreateABTestInput, ABTest, ABTestWithStats } from './ab-test-actions'

// actions.ts - 'use server'
export {
  createCampaign,
  updateCampaign,
  deleteCampaign,
  listCampaigns,
  getCampaign,
  previewCampaignAudience,
  getChannelSplit,
  sendCampaignNow,
  recordUnsubscribeByRecipientId,
  getCampaignStats,
  getCampaignRecipients,
  getCampaignRevenueAttribution,
  listCampaignTemplates,
  createCampaignTemplate,
  deleteCampaignTemplate,
  saveAsTemplate,
  sendDirectOutreach,
  getClientOutreachHistory,
  processScheduledCampaigns,
  listSequences,
  createSequence,
  toggleSequence,
  deleteSequence,
  enrollInSequence,
  processSequences,
  processBirthdayEnrollments,
} from './actions'
export type { CampaignInput, ChannelSplit } from './actions'

export { COMPARE_PAGES, getComparePage } from './compare-pages'
export type { CompareRow, CompareFaq, ComparePage } from './compare-pages'

export { CAMPAIGN_TYPE_LABELS, SEGMENT_OPTIONS, SYSTEM_TEMPLATES } from './constants'

// content-performance-actions.ts - 'use server'
export {
  recordContentPerformance,
  getContentROI,
  getBestPerformingContent,
} from './content-performance-actions'
export type {
  RecordContentPerformanceInput,
  Platform,
  ContentPost,
  PlatformROI,
  ContentROISummary,
  RankedContent,
} from './content-performance-actions'

export { CUSTOMER_STORIES, getCustomerStory } from './customer-stories'
export type { CustomerStoryMetric, CustomerStory } from './customer-stories'

// email-template-actions.ts - 'use server'
export {
  saveEmailTemplate,
  listEmailTemplates,
  deleteEmailTemplate,
} from './email-template-actions'
export type { EmailTemplate, SaveEmailTemplateInput } from './email-template-actions'

// holiday-campaign-actions.ts - 'use server'
export { processHolidayCampaignDrafts } from './holiday-campaign-actions'

export { LAUNCH_MODE, PRIMARY_SIGNUP_HREF, PRIMARY_SIGNUP_LABEL } from './launch-mode'
export type { LaunchMode } from './launch-mode'

// newsletter-actions.ts - 'use server'
export { subscribeToNewsletter } from './newsletter-actions'

export { NO_CLICK_FIRST_PUBLIC_ENABLED } from './no-click-rollout'

export {
  PLATFORM_AUDIENCE_LABEL,
  PLATFORM_META_DESCRIPTION,
  PLATFORM_SHORT_DESCRIPTION,
  PLATFORM_HERO_HEADLINE,
  PLATFORM_HERO_COPY,
  PLATFORM_KEYWORDS,
  PLATFORM_STRUCTURED_DATA_FEATURES,
  PLATFORM_NAME,
  PLATFORM_TAGLINE,
} from './platform-positioning'

// segmentation-actions.ts - 'use server'
export {
  buildBehavioralSegment,
  getSegmentPreview,
  deleteBehavioralSegment,
  evaluateSegmentFilters,
} from './segmentation-actions'
export type {
  BehavioralFilters,
  BuildBehavioralSegmentInput,
  SegmentPreview,
  EvaluatedSegment,
} from './segmentation-actions'

export { buildMarketingSignupHref } from './signup-links'

// social-template-actions.ts - 'use server'
export {
  getSocialTemplates,
  createSocialTemplate,
  updateSocialTemplate,
  deleteSocialTemplate,
  duplicateSocialTemplate,
  incrementUsedCount,
  getDefaultTemplates,
  seedDefaultTemplates,
} from './social-template-actions'
export type { SocialTemplate, TemplateType } from './social-template-actions'

export { PLATFORM_CHAR_LIMITS } from './social-template-constants'
export type { SocialPlatform } from './social-template-constants'

export { buildMarketingSourceHref, readMarketingSourceFromSearchParams } from './source-links'
export type { MarketingSourceContext } from './source-links'

export { renderTokens, splitName, AVAILABLE_TOKENS } from './tokens'
export type { TokenContext } from './tokens'

export { buildOperatorWalkthroughHref } from './walkthrough-links'
