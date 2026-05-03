// Hub module - public API

// types
export type {
  HubGuestProfile,
  HubGuestEventHistory,
  HubGroupVisibility,
  HubGroup,
  HubMemberRole,
  HubDigestMode,
  HubGroupMember,
  HubGroupEvent,
  HubMessageType,
  HubNotificationType,
  HubMessageSource,
  HubMessage,
  HubMessageReaction,
  HubMedia,
  HubNoteColor,
  HubPinnedNote,
  HubPollType,
  HubPollScope,
  HubPollOptionType,
  HubPoll,
  HubPollOption,
  HubPollVote,
  ThemeCategory,
  EventTheme,
  EventStubStatus,
  EventStub,
  MealType,
  MealStatus,
  MealBoardEntry,
  RecurringPattern,
  CandidateSnapshot,
  PlanningBrief,
} from './types'

// availability-actions ('use server')
export {
  createAvailability,
  getGroupAvailability,
  getAvailabilityWithResponses,
  setAvailabilityResponse,
  closeAvailability,
} from './availability-actions'
export type { HubAvailability, HubAvailabilityResponse } from './availability-actions'

// chef-circle-actions ('use server')
export {
  getChefCircles,
  getCirclesUnreadCount,
  getOrCreateChefHubProfileToken,
  createCircleForEvent,
  getOrCreateChefCircleTokenForEvent,
  archiveCircle,
  restoreCircle,
  markCircleRead,
  createDinnerClub,
  linkEventToCircle,
  unlinkEventFromCircle,
  getCircleEvents,
  ensureCircleForEvent,
  getCirclesMomentum,
} from './chef-circle-actions'
export type { PipelineStage, ChefCircleSummary } from './chef-circle-actions'

// chef-decision-brief-actions ('use server')
export { getChefDecisionBrief } from './chef-decision-brief-actions'
export type { ChefDecisionBrief } from './chef-decision-brief-actions'

// chef-share-actions ('use server')
export {
  getMyChefsToShare,
  shareChefWithFriend,
  getMyChefRecommendations,
} from './chef-share-actions'
export type { ShareableChef, ChefRecommendation } from './chef-share-actions'

// circle-approval-actions ('use server')
export { getPendingQuoteForCircle, approveQuoteFromCircle } from './circle-approval-actions'

// circle-chef-proof
export { getCircleChefProofData } from './circle-chef-proof'
export type { CircleChefProofMessage, CircleChefProofData } from './circle-chef-proof'

// circle-detail-actions ('use server')
export {
  getCircleDetail,
  addClientToCircle,
  removeCircleMember,
  linkEventToCircle as linkEventToCircleDetail,
  unlinkEventFromCircle as unlinkEventFromCircleDetail,
  getClientsNotInCircle,
  getCircleSourcingData,
} from './circle-detail-actions'
export type {
  CircleMemberDetail,
  CircleEventLink,
  CircleMessage,
  CircleDetail,
  CircleSourcingItem,
} from './circle-detail-actions'

// circle-digest ('use server')
export { processDigests } from './circle-digest'

// circle-first-notify ('use server')
export { circleFirstNotify } from './circle-first-notify'

// circle-lifecycle-hooks (internal hooks, not 'use server')
export {
  postMenuSharedToCircle,
  postQuoteSentToCircle,
  postQuoteAcceptedToCircle,
  postPaymentReceivedToCircle,
  postEventConfirmedToCircle,
  postArrivalToCircle,
  postEventCompletedToCircle,
  postPhotosToCircle,
  postPrepUpdateToCircle,
} from './circle-lifecycle-hooks'

// circle-lookup ('use server')
export { getCircleForContext, getChefHubProfileId, getCircleForEvent } from './circle-lookup'
export type { CircleContext } from './circle-lookup'

// circle-notification-actions ('use server')
export {
  notifyCircleMembers,
  notifyFriendRequest,
  broadcastEventToCircleMembers,
} from './circle-notification-actions'

// circle-pipeline-stats ('use server')
export { getCirclePipelineStats } from './circle-pipeline-stats'
export type {
  PipelineFinancials,
  WorkloadSummary,
  CirclePipelineStats,
} from './circle-pipeline-stats'

// client-hub-actions ('use server')
export {
  getOrCreateClientHubProfile,
  getClientHubGroups,
  getClientProfileToken,
  getCircleTokenForEvent,
} from './client-hub-actions'
export type { ClientHubGroup } from './client-hub-actions'

// client-quick-actions ('use server')
export {
  postGuestCountUpdate,
  postDietaryUpdate,
  postRunningLate,
  postRepeatBookingRequest,
} from './client-quick-actions'

// community-circle-actions ('use server')
export {
  getOrCreateUniversalHubProfile,
  createCommunityCircle,
  discoverPublicCircles,
  archiveCommunityCircle,
} from './community-circle-actions'
export type { PublicCircleResult } from './community-circle-actions'

// completion-tracker-actions ('use server')
export { getGuestCompletionStatus } from './completion-tracker-actions'
export type { GuestCompletionRow, CompletionSummary } from './completion-tracker-actions'

// crew-circle-actions ('use server')
export {
  ensureCrewCircle,
  addStaffToCrewCircle,
  removeStaffFromCrewCircle,
} from './crew-circle-actions'

// delegation-actions ('use server')
export {
  assignDelegateToCircle,
  bulkAssignDelegate,
  getDelegatesForProfile,
} from './delegation-actions'

// email-to-circle ('use server')
export { findOrCreateClientHubProfile, routeEmailReplyToCircle } from './email-to-circle'

// friend-actions ('use server')
export {
  sendFriendRequest,
  requestDinnerCircleInviteByProfileToken,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  getMyFriends,
  getPendingFriendRequests,
  searchPeople,
} from './friend-actions'
export type { HubFriend } from './friend-actions'

// group-actions ('use server')
export {
  createHubGroup,
  getGroupByToken,
  getGroupById,
  joinHubGroup,
  getGroupMembers,
  getGroupEvents,
  addEventToGroup,
  updateHubGroup,
  getGroupMemberCount,
  toggleMuteCircle,
  updateMemberNotificationPreferences,
  updateMemberRole,
  updateMemberPermissions,
  removeMember,
  leaveGroup,
} from './group-actions'

// household-actions ('use server')
export {
  getHouseholdMembers,
  getCircleDietarySummaryByToken,
  getCircleHouseholdSummary,
  addHouseholdMember,
  updateHouseholdMember,
  removeHouseholdMember,
  getHouseholdForClient,
  addClientHouseholdMember,
  updateClientHouseholdMember,
  removeClientHouseholdMember,
  getCircleHouseholdMembers,
  getMealAttendance,
  setMealAttendance,
  bulkSetMealAttendance,
} from './household-actions'
export type {
  HouseholdMember,
  HouseholdDietarySummary,
  ClientHouseholdSummary,
  MealAttendance,
} from './household-actions'

// hub-push-subscriptions ('use server')
export {
  saveHubPushSubscription,
  getHubPushSubscriptions,
  deactivateHubPushSubscription,
  incrementPushFailedCount,
} from './hub-push-subscriptions'

// inquiry-circle-actions ('use server')
export {
  createInquiryCircle,
  getInquiryCircleToken,
  linkInquiryCircleToEvent,
} from './inquiry-circle-actions'

// inquiry-circle-first-message ('use server')
export { postFirstCircleMessage } from './inquiry-circle-first-message'

// integration-actions ('use server')
export {
  syncRSVPToHubProfile,
  snapshotEventToHub,
  ensureEventDinnerCircle,
  getOrCreateEventHubGroup,
  getEventHubGroupToken,
  getGuestVisibleEventsMissingDinnerCircles,
  getStubsSeekingChef,
  getHubStats,
} from './integration-actions'

// invite-actions ('use server')
export { getCircleInviteLinkContext } from './invite-actions'

// invite-copy
export {
  deriveInviteCopyRole,
  getInviteRoleLabel,
  formatInviteSenderLabel,
  buildCircleInviteShareMessage,
} from './invite-copy'
export type { HubInviteCopyRole } from './invite-copy'

// invite-links
export {
  createHubInviteAttributionToken,
  verifyHubInviteAttributionToken,
  getHubInviteLinkContext,
  resolveHubInviteAttribution,
} from './invite-links'

// meal-board-actions ('use server')
export {
  getMealBoard,
  upsertMealEntry,
  deleteMealEntry,
  updateMealStatus,
  bulkUpsertMealEntries,
  cloneWeekMeals,
  saveWeekAsTemplate,
  getTemplates,
  loadTemplate,
  deleteTemplate,
  postScheduleChange,
  getScheduleChanges,
  acknowledgeScheduleChange,
  resolveScheduleChange,
  createRecurringMeal,
  getRecurringMeals,
  deleteRecurringMeal,
  applyRecurringMeals,
  getFeedbackInsights,
  getMealHistory,
  updateGroupDefaultHeadCount,
  getGroupDefaultHeadCount,
  getDefaultMealTimes,
  updateDefaultMealTimes,
  getBatchCommentCounts,
} from './meal-board-actions'
export type {
  MealTemplate,
  ScheduleChange,
  RecurringMealInput,
  FeedbackInsight,
  MealHistoryEntry,
} from './meal-board-actions'

// meal-board-shopping-list ('use server')
export { generateWeeklyShoppingList } from './meal-board-shopping-list'
export type { ShoppingIngredient, WeeklyShoppingList } from './meal-board-shopping-list'

// meal-feedback-actions ('use server')
export {
  submitMealFeedback,
  removeMealFeedback,
  getMealFeedbackSummary,
  getBatchMealFeedback,
} from './meal-feedback-actions'

// media-actions ('use server')
export {
  uploadHubMediaFile,
  createHubMedia,
  getGroupMedia,
  deleteHubMedia,
  getMediaUrl,
} from './media-actions'

// menu-poll-actions ('use server')
export {
  getDinnerCircleMenuPollingState,
  createDinnerCircleMenuPollIteration,
  lockDinnerCircleMenuSelections,
} from './menu-poll-actions'
export type { DinnerCircleMenuPollingState } from './menu-poll-actions'

// menu-poll-core
export { summarizeHubPollVotes, buildMenuPollQuestion, getNextRank } from './menu-poll-core'
export type { ActiveHubPollVote, HubPollSummary } from './menu-poll-core'

// menu-polling-core
export {
  aggregateMenuPollOptions,
  pickLeadingMenuPollOption,
  buildDefaultLockSelections,
} from './menu-polling-core'
export type {
  MenuPollType,
  MenuPollOptionType,
  MenuPollOptionInput,
  MenuPollVoteInput,
  MenuPollOptionAggregate,
} from './menu-polling-core'

// menu-proposal-actions ('use server')
export { shareMenuProposalToCircle } from './menu-proposal-actions'

// message-actions ('use server')
export {
  postHubMessage,
  getHubMessages,
  getPinnedMessages,
  togglePinMessage,
  addReaction,
  removeReaction,
  deleteHubMessage,
  markHubRead,
  recordMessageReads,
  getMessageReaders,
  editHubMessage,
  searchHubMessages,
  createPinnedNote,
  getGroupNotes,
  deletePinnedNote,
  getCircleMilestones,
} from './message-actions'

// notification-actions ('use server')
export {
  getHubUnreadCounts,
  getHubTotalUnreadCount,
  markMyHubNotificationsRead,
  getMyHubUnreadCount,
  notifyHubActivity,
} from './notification-actions'
export type { HubUnreadCount } from './notification-actions'

// open-slot-actions ('use server')
export { broadcastOpenSlot } from './open-slot-actions'

// open-tables-actions ('use server')
export { getOpenTables } from './open-tables-actions'
export type { OpenTableListing } from './open-tables-actions'

// passport-actions ('use server')
export { getPassportForProfile, upsertPassport } from './passport-actions'

// planning-brief
export {
  normalizePlanningBrief,
  planningBriefFromSearchParams,
  normalizeCandidateSnapshot,
  hasPlanningBriefContent,
} from './planning-brief'

// planning-candidate-actions ('use server')
export {
  createPlanningGroupFromDiscovery,
  addPlanningCandidate,
  updatePlanningBrief,
  getPlanningCandidates,
} from './planning-candidate-actions'

// poll-actions ('use server')
export { createHubPoll, voteOnPoll, removeVote, getPoll, closePoll } from './poll-actions'

// pre-event-briefing-actions ('use server')
export { postPreEventBriefing } from './pre-event-briefing-actions'

// preference-sync ('use server')
export { syncHubPreferencesToClient } from './preference-sync'

// prep-assignment-actions ('use server')
export {
  assignMemberToMeal,
  unassignMemberFromMeal,
  getAssignableMembers,
  getMyMealAssignments,
} from './prep-assignment-actions'

// private-message-actions ('use server')
export {
  getOrCreatePrivateThread,
  sendPrivateMessage,
  getPrivateMessages,
  getMyPrivateThreads,
  markPrivateThreadRead,
  getChefHubProfileForCircle,
} from './private-message-actions'

// profile-actions ('use server')
export {
  getOrCreateProfile,
  getProfileByToken,
  getProfileById,
  updateProfile,
  getProfileEventHistory,
  upgradeGuestToClient,
  getProfileGroups,
  getUpcomingEventsForProfile,
  sendCircleRecoveryEmail,
} from './profile-actions'

// public-share-access
export { resolvePublicShareDinnerCircleAccess } from './public-share-access'
export type { PublicShareAccessRecord } from './public-share-access'

// realtime (client-side)
export {
  subscribeToHubMessages,
  subscribeToHubMessageUpdates,
  createHubTypingIndicator,
  subscribeToGroupMembers,
} from './realtime'

// social-feed-actions ('use server')
export { getSocialFeed, getChefSocialFeed } from './social-feed-actions'
export type { SocialFeedItem } from './social-feed-actions'
