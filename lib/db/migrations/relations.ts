import { relations } from "drizzle-orm/relations";
import { betaSurveyResponses, betaSurveyInvites, betaSurveyDefinitions, chefs, inventoryAudits, usersInAuth, events, storageLocations, inventoryAuditItems, ingredients, ingredientSubstitutions, inventoryBatches, vendors, vendorInvoices, staffMeals, recipes, staffMealItems, haccpPlans, cannabisHostAgreements, userRoles, clientInvitations, cannabisControlPacketReconciliations, cannabisControlPacketSnapshots, cannabisControlPacketEvidence, eventCannabisSettings, auditLog, eventCannabisCourseConfig, inquiries, inquiryStateTransitions, mutationIdempotency, qolMetricEvents, eventStateTransitions, quotes, quoteStateTransitions, afterActionReviews, clients, loyaltyTransactions, dailyReports, dishes, menus, menuStateTransitions, components, loyaltyRewards, menuModifications, unusedIngredients, shoppingSubstitutions, seasonalPalettes, conversations, conversationParticipants, chatMessages, chatInsights, chefConnections, households, clientNotes, householdMembers, notifications, contactSubmissions, clientConnections, chefFeedback, referralPartners, partnerLocations, partnerImages, wixConnections, wixSubmissions, gmailSyncLog, menuUploadJobs, dishIndex, dishAppearances, dishVariations, activityEvents, chefActivityLog, dishFeedback, automationRules, automationExecutions, communicationEvents, conversationThreads, suggestedLinks, followUpTimers, communicationClassificationRules, communicationActionLog, devices, deviceSessions, staffMembers, deviceEvents, copilotRuns, copilotRecommendations, copilotActions, copilotRunErrors, chefNetworkPosts, chefNetworkContactShares, chefNetworkFeaturePreferences, integrationConnections, integrationEvents, integrationSyncJobs, integrationEntityLinks, integrationFieldMappings, chefJourneys, chefJourneyIdeas, chefJourneyEntries, prospectOutreachLog, prospects, socialQueueSettings, clientIncentives, incentiveDeliveries, chefJournalMedia, chefJournalRecipeLinks, socialMediaAssets, socialPostAssets, socialPosts, zapierWebhookSubscriptions, zapierWebhookDeliveries, externalReviewSources, externalReviews, ledgerEntries, prospectStageHistory, chefGoals, goalSnapshots, goalClientSuggestions, giftCardPurchaseIntents, incentiveRedemptions, inquiryNotes, inquiryRecipeLinks, chefTodos, notificationPreferences, pushSubscriptions, smsSendLog, notificationDeliveryLog, scheduledCalls, contractTemplates, menuApprovalRequests, eventStaffAssignments, chefAvailabilityBlocks, adminTimeLogs, recurringServices, equipmentRentals, taxSettings, kitchenRentals, eventTempLogs, receiptPhotos, receiptExtractions, productProjections, saleItems, sales, receiptLineItems, commercePayments, commerceRefunds, commercePaymentSchedules, chefEmergencyContacts, eventContingencyNotes, professionalAchievements, learningGoals, registerSessions, orderQueue, eventTravelLegs, travelLegIngredients, eventSurveys, vendorPricePoints, eventPrepBlocks, dailyReconciliationReports, settlementRecords, dailyTaxSummary, directOutreachLog, campaignTemplates, automatedSequences, sequenceSteps, sequenceEnrollments, cashDrawerMovements, recipeShares, socialHashtagSets, chefProfiles, chefSocialChannels, chefSocialPosts, chefFollows, chefPostReactions, chefPostComments, chefCommentReactions, chefPostSaves, chefChannelMemberships, chefStories, chefStoryViews, chefStoryReactions, chefPostMentions, tenantSettings, clientAllergyRecords, chefTeamMembers, chefCalendarEntries, availabilitySignalNotificationLog, timeBlocks, socialPlatformCredentials, socialConnectedAccounts, socialStatsSnapshots, eventContracts, eventContractVersions, eventContractSigners, competitorBenchmarks, websiteStatsSnapshots, clientTags, charityHours, chefSchedulingRules, clientSegments, paymentPlanInstallments, eventTips, clientQuickRequests, beverages, menuBeveragePairings, chefApiKeys, webhookEndpoints, webhookDeliveries, documentVersions, communityTemplates, raffleEntries, raffleRounds, loyaltyConfig, customFieldDefinitions, customFieldValues, chefEventTypeLabels, loyaltyRewardRedemptions, bankConnections, bankTransactions, expenses, taxQuarterlyEstimates, contractorPayments, paymentDisputes, eventGuests, eventShareInvites, eventShares, staffPerformanceScores, wasteLogs, vendorInvoiceItems, proposalTemplates, proposalAddons, proposalViews, smartFieldValues, followupRules, marketingCampaigns, abTests, contentPerformance, serviceCourses, documentComments, chefDailyBriefings, benchmarkSnapshots, demandForecasts, portfolioItems, profileHighlights, dietaryConflictAlerts, clientPreferencePatterns, stripeTransfers, platformFeeLedger, userFeedback, groceryPriceQuotes, groceryPriceQuoteItems, purchaseOrders, purchaseOrderItems, dailyChecklistCustomItems, clientIntakeForms, clientIntakeResponses, clientIntakeShares, eventJoinRequests, eventGuestDietaryItems, eventGuestRsvpAudit, eventShareInviteEvents, automationExecutionLog, rsvpReminderLog, deadLetterQueue, guestCommunicationLogs, jobRetryLog, retirementContributions, healthInsurancePremiums, equipmentDepreciationSchedules, equipmentItems, salesTaxSettings, eventSalesTax, salesTaxRemittances, employees, payrollRecords, payroll941Summaries, payrollW2Summaries, chefServiceTypes, campaignRecipients, chefNotificationTierOverrides, goalCheckIns, chefTaxConfig, simulationRuns, simulationResults, hubGuestEventHistory, hubGuestProfiles, fineTuningExamples, remyAbuseLog, cannabisTierUsers, cannabisTierInvitations, cannabisEventDetails, chefIncidents, chefInsurancePolicies, chefBusinessHealthItems, eventSafetyChecklists, eventAlcoholLogs, chefBackupContacts, chefBrandMentions, chefCrisisPlans, chefCapabilityInventory, eventStubs, hubGroups, chefEducationLog, chefCreativeProjects, staffOnboardingItems, contractorServiceAgreements, chefPortfolioRemovalRequests, hubMessages, hubMessageReactions, chefGrowthCheckins, chefMomentumSnapshots, chefAvailabilityShareTokens, guestTestimonials, chefAutomationSettings, remyArtifacts, remyConversations, guestLeads, guestPhotos, retainers, retainerPeriods, hubMedia, hubPinnedNotes, remyMessages, remyMemories, hubPolls, hubPollOptions, hubPollVotes, prospectScrubSessions, clientPhotos, favoriteChefs, prospectNotes, prospectCallScripts, dailyPlanDrafts, dailyPlanDismissals, chefCulinaryWords, chefCulinaryProfiles, chefBreadcrumbs, aiTaskQueue, chefReminders, remyUsageMetrics, remySupportShares, taskTemplates, stations, tasks, taskCompletionLog, remyFeedback, stationMenuItems, stationComponents, hubGuestFriends, clipboardEntries, shiftLogs, orderRequests, hubChefRecommendations, aiPreferences, wasteLog, opsLog, vendorItems, vendorInvoiceLineItems, menuPreferences, hubAvailability, hubAvailabilityResponses, dailyRevenue, guests, guestTags, guestComps, emailSenderReputation, guestVisits, guestReservations, recipeSubRecipes, inventoryTransactions, eventDocumentSnapshots, remyActionAuditLog, eventDocumentGenerationJobs, remyApprovalPolicies, chefTrustedCircle, chefHandoffs, chefHandoffRecipients, chefHandoffEvents, chefAvailabilitySignals, chefSocialNotifications, commercePromotions, saleAppliedPromotions, posAlertEvents, posMetricSnapshots, commerceDiningZones, commerceDiningTables, commerceDiningChecks, vendorCatalogImportRows, vendorDocumentUploads, vendorPriceAlertSettings, clientMealRequests, eventServiceSessions, eventSeries, recurringMenuRecommendations, servedDishHistory, chefServiceConfig, shiftHandoffNotes, prepTimeline, workflowTemplates, workflowSteps, workflowExecutions, workflowExecutionLog, eventEquipmentAssignments, hubGroupEvents, hubMessageReads, clientWorksheets, betaOnboardingChecklist, hubGroupMembers, frontOfHouseMenus, menuTemplates, eventLeftoverDetails, guestFeedback, guestMessages, guestDayOfReminders, guestDietaryConfirmations, eventGuestDocuments, eventThemes, chefBudgets, clientProposals, staffEventTokens, mealPrepWeeks, mealPrepPrograms, menuNutrition, followUpSends, productTourProgress, vendorEventAssignments, eventEquipmentRentals, hubShareCards, openTableConsents, openTableRequests, shoppingLists, packingTemplates, platingGuides, eventPrepSteps, dietaryConfirmations, quoteLineItems, eventLiveStatus, clientReviews, proposalTokens, quoteAddons, proposalAddonSelections, recipeIngredients, bookingEventTypes, bookingAvailabilityRules, bookingDateOverrides, bookingDailyCaps, recurringInvoices, recurringInvoiceHistory, proposalSections, clientOutreachLog, referralRequestLog, eventEquipmentChecklist, eventStationAssignments, eventVendorDeliveries, eventFloorPlans, containerInventory, containerTransactions, clientMealPrepPreferences, recipeNutrition, mealPrepBatchLog, kdsTickets, productModifierGroups, productModifiers, productModifierAssignments, dailySpecials, truckLocations, truckSchedule, bakeryBatches, fermentationLogs, bakeryOvens, bakeSchedule, bakeryYieldRecords, smsMessages, giftCards, giftCardTransactions, taxJurisdictions, taxCollected, taxFilings, qrCodes, qrScans, entityTemplates, ingredientShelfLifeDefaults, businessLocations, inventoryCounts, dailyChecklistCompletions, inventoryLots, communicationLog, staffClockEntries, permits, vehicleMaintenance, bakeryOrders, wholesaleAccounts, wholesaleOrders, bakeryTastings, bakerySeasonalItems, displayCaseItems, bakeryParStock, bakeryProductionLog, feedbackRequests, feedbackResponses, googleConnections, documentIntelligenceJobs, documentIntelligenceItems, googleMailboxes, messages, gmailHistoricalFindings, platformRecords, platformSnapshots, platformActionLog, platformPayouts, betaSignupTrackers, betaSignups, outreachCampaigns, eventSiteAssessments, waitlistEntries, complianceTempLogs, complianceCleaningLogs, truckPreorders, entityPhotos, sops, sopCompletions, stocktakes, stocktakeItems, reorderSettings, tipEntries, tipPoolConfigs, tipDistributions, shiftTemplates, scheduledShifts, shiftSwapRequests, productPublicMediaLinks, publicMediaAssets, eventReadinessGates, dopTaskCompletions, packingConfirmations, rebookTokens, guestEventProfile, eventTemplates, clientPreferences, clientKitchenInventory, chefEquipmentMaster, chefCapacitySettings, eventWasteLogs, cancellationPolicies, expenseTaxCategories, clientReferrals, recurringSchedules, chefCertifications, testimonials, mileageLogs, clientNdas, cookingClasses, classRegistrations, chefDepositSettings, experiencePackages, pantryLocations, pantryItems, chefSeasonalAvailability, eventPhotos, clientGiftLog, clientFollowupRules, groceryPriceEntries, tastingMenus, tastingMenuCourses, menuServiceHistory, seasonalAvailabilityPeriods, groceryTrips, groceryTripItems, groceryTripSplits, chefEquipment, packingChecklists, packingChecklistItems, dietaryChangeLog, smartGroceryLists, smartGroceryItems, aislePreferences, chefPreferredStores, storeItemAssignments, emailSequences, emailSequenceSteps, emailSequenceEnrollments, sourcingEntries, featureRequests, featureVotes, recipeStepPhotos, socialTemplates, vaTasks, mealPrepItems, mealPrepOrders, mealPrepWindows, eventFeedback, vendorPriceEntries, staffSchedules, staffAvailability, insurancePolicies, onboardingProgress, insuranceClaims, communityProfiles, communityBenchmarks, communityMessages, chefDirectoryListings, mentorshipProfiles, mentorshipConnections, subcontractAgreements, grocerySpendEntries, tipRequests, giftCertificates, marketingSpendLog, platformApiConnections, clientMergeLog, ingredientPriceHistory, vendorPreferredIngredients, varianceAlertSettings, autoResponseConfig, businessHoursConfig, responseTemplates, paymentMilestoneTemplates, eventPaymentMilestones, eventContacts, kitchenAssessments, menuRevisions, menuDishFeedback, guestCountChanges, paymentMilestones, followUpSequences, postEventSurveys, scheduledMessages, orderAheadItems, orderAheadOrders, orderAheadOrderItems, mealPrepContainers, mealPrepDeliveries, clientSatisfactionSurveys, menuItems, directoryListings, directoryNominations, directoryOutreachLog, chefFolders, chefDocuments, recipeProductionLog, chefPreferences, chefPricingConfig, clientTasteProfiles, eventContentDrafts, clientTouchpointRules, equipmentMaintenanceLog, eventCollaborators, chefTaxonomyExtensions, chefTaxonomyHidden, taskDependencies, chefSocialHashtags, chefPostHashtags, conversationThreadReads, chefFeatureFlags, quoteSelectedAddons } from "./schema";

export const betaSurveyInvitesRelations = relations(betaSurveyInvites, ({one}) => ({
	betaSurveyResponse: one(betaSurveyResponses, {
		fields: [betaSurveyInvites.responseId],
		references: [betaSurveyResponses.id]
	}),
	betaSurveyDefinition: one(betaSurveyDefinitions, {
		fields: [betaSurveyInvites.surveyId],
		references: [betaSurveyDefinitions.id]
	}),
}));

export const betaSurveyResponsesRelations = relations(betaSurveyResponses, ({one, many}) => ({
	betaSurveyInvites: many(betaSurveyInvites),
	usersInAuth: one(usersInAuth, {
		fields: [betaSurveyResponses.authUserId],
		references: [usersInAuth.id]
	}),
	betaSurveyDefinition: one(betaSurveyDefinitions, {
		fields: [betaSurveyResponses.surveyId],
		references: [betaSurveyDefinitions.id]
	}),
}));

export const betaSurveyDefinitionsRelations = relations(betaSurveyDefinitions, ({many}) => ({
	betaSurveyInvites: many(betaSurveyInvites),
	betaSurveyResponses: many(betaSurveyResponses),
}));

export const inventoryAuditsRelations = relations(inventoryAudits, ({one, many}) => ({
	chef: one(chefs, {
		fields: [inventoryAudits.chefId],
		references: [chefs.id]
	}),
	usersInAuth_createdBy: one(usersInAuth, {
		fields: [inventoryAudits.createdBy],
		references: [usersInAuth.id],
		relationName: "inventoryAudits_createdBy_usersInAuth_id"
	}),
	event: one(events, {
		fields: [inventoryAudits.eventId],
		references: [events.id]
	}),
	usersInAuth_finalizedBy: one(usersInAuth, {
		fields: [inventoryAudits.finalizedBy],
		references: [usersInAuth.id],
		relationName: "inventoryAudits_finalizedBy_usersInAuth_id"
	}),
	storageLocation: one(storageLocations, {
		fields: [inventoryAudits.locationId],
		references: [storageLocations.id]
	}),
	inventoryAuditItems: many(inventoryAuditItems),
}));

export const chefsRelations = relations(chefs, ({one, many}) => ({
	inventoryAudits: many(inventoryAudits),
	ingredientSubstitutions: many(ingredientSubstitutions),
	inventoryBatches: many(inventoryBatches),
	staffMeals: many(staffMeals),
	haccpPlans: many(haccpPlans),
	clientInvitations: many(clientInvitations),
	cannabisControlPacketReconciliations: many(cannabisControlPacketReconciliations),
	cannabisControlPacketEvidences: many(cannabisControlPacketEvidence),
	eventCannabisSettings: many(eventCannabisSettings),
	auditLogs: many(auditLog),
	eventCannabisCourseConfigs: many(eventCannabisCourseConfig),
	cannabisControlPacketSnapshots: many(cannabisControlPacketSnapshots),
	inquiryStateTransitions: many(inquiryStateTransitions),
	mutationIdempotencies: many(mutationIdempotency),
	qolMetricEvents: many(qolMetricEvents),
	eventStateTransitions: many(eventStateTransitions),
	quoteStateTransitions: many(quoteStateTransitions),
	afterActionReviews: many(afterActionReviews),
	loyaltyTransactions: many(loyaltyTransactions),
	dailyReports: many(dailyReports),
	dishes: many(dishes),
	menuStateTransitions: many(menuStateTransitions),
	components: many(components),
	loyaltyRewards: many(loyaltyRewards),
	menuModifications: many(menuModifications),
	unusedIngredients: many(unusedIngredients),
	shoppingSubstitutions: many(shoppingSubstitutions),
	seasonalPalettes: many(seasonalPalettes),
	conversations: many(conversations),
	chatInsights: many(chatInsights),
	chefConnections_addresseeId: many(chefConnections, {
		relationName: "chefConnections_addresseeId_chefs_id"
	}),
	chefConnections_requesterId: many(chefConnections, {
		relationName: "chefConnections_requesterId_chefs_id"
	}),
	households: many(households),
	clientNotes: many(clientNotes),
	notifications: many(notifications),
	contactSubmissions: many(contactSubmissions),
	clientConnections: many(clientConnections),
	chefFeedbacks: many(chefFeedback),
	partnerLocations: many(partnerLocations),
	partnerImages: many(partnerImages),
	wixConnections_chefId: many(wixConnections, {
		relationName: "wixConnections_chefId_chefs_id"
	}),
	wixConnections_tenantId: many(wixConnections, {
		relationName: "wixConnections_tenantId_chefs_id"
	}),
	wixSubmissions: many(wixSubmissions),
	referralPartners: many(referralPartners),
	menuUploadJobs: many(menuUploadJobs),
	dishIndices: many(dishIndex),
	dishAppearances: many(dishAppearances),
	dishVariations: many(dishVariations),
	activityEvents: many(activityEvents),
	chefActivityLogs: many(chefActivityLog),
	dishFeedbacks: many(dishFeedback),
	automationExecutions: many(automationExecutions),
	communicationEvents: many(communicationEvents),
	suggestedLinks: many(suggestedLinks),
	conversationThreads: many(conversationThreads),
	followUpTimers: many(followUpTimers),
	communicationClassificationRules: many(communicationClassificationRules),
	communicationActionLogs: many(communicationActionLog),
	devices: many(devices),
	deviceEvents: many(deviceEvents),
	copilotRuns: many(copilotRuns),
	copilotRecommendations: many(copilotRecommendations),
	copilotActions: many(copilotActions),
	copilotRunErrors: many(copilotRunErrors),
	chefNetworkPosts: many(chefNetworkPosts),
	chefNetworkContactShares_recipientChefId: many(chefNetworkContactShares, {
		relationName: "chefNetworkContactShares_recipientChefId_chefs_id"
	}),
	chefNetworkContactShares_senderChefId: many(chefNetworkContactShares, {
		relationName: "chefNetworkContactShares_senderChefId_chefs_id"
	}),
	chefNetworkFeaturePreferences: many(chefNetworkFeaturePreferences),
	integrationConnections_chefId: many(integrationConnections, {
		relationName: "integrationConnections_chefId_chefs_id"
	}),
	integrationConnections_tenantId: many(integrationConnections, {
		relationName: "integrationConnections_tenantId_chefs_id"
	}),
	integrationEvents: many(integrationEvents),
	integrationSyncJobs: many(integrationSyncJobs),
	integrationEntityLinks: many(integrationEntityLinks),
	integrationFieldMappings: many(integrationFieldMappings),
	chefJourneys: many(chefJourneys),
	chefJourneyIdeas: many(chefJourneyIdeas),
	chefJourneyEntries: many(chefJourneyEntries),
	prospectOutreachLogs: many(prospectOutreachLog),
	socialQueueSettings: many(socialQueueSettings),
	incentiveDeliveries: many(incentiveDeliveries),
	chefJournalMedias: many(chefJournalMedia),
	chefJournalRecipeLinks: many(chefJournalRecipeLinks),
	socialMediaAssets: many(socialMediaAssets),
	socialPostAssets: many(socialPostAssets),
	zapierWebhookSubscriptions: many(zapierWebhookSubscriptions),
	externalReviewSources: many(externalReviewSources),
	externalReviews: many(externalReviews),
	ledgerEntries: many(ledgerEntries),
	prospectStageHistories: many(prospectStageHistory),
	goalSnapshots: many(goalSnapshots),
	goalClientSuggestions: many(goalClientSuggestions),
	clientIncentives: many(clientIncentives),
	chefGoals: many(chefGoals),
	giftCardPurchaseIntents: many(giftCardPurchaseIntents),
	incentiveRedemptions: many(incentiveRedemptions),
	inquiryNotes: many(inquiryNotes),
	inquiryRecipeLinks: many(inquiryRecipeLinks),
	chefTodos: many(chefTodos),
	notificationPreferences: many(notificationPreferences),
	pushSubscriptions: many(pushSubscriptions),
	smsSendLogs: many(smsSendLog),
	notificationDeliveryLogs: many(notificationDeliveryLog),
	scheduledCalls: many(scheduledCalls),
	contractTemplates: many(contractTemplates),
	menuApprovalRequests: many(menuApprovalRequests),
	eventStaffAssignments: many(eventStaffAssignments),
	chefAvailabilityBlocks: many(chefAvailabilityBlocks),
	adminTimeLogs: many(adminTimeLogs),
	recurringServices: many(recurringServices),
	equipmentRentals: many(equipmentRentals),
	taxSettings: many(taxSettings),
	kitchenRentals: many(kitchenRentals),
	eventTempLogs: many(eventTempLogs),
	receiptPhotos: many(receiptPhotos),
	receiptExtractions: many(receiptExtractions),
	saleItems: many(saleItems),
	receiptLineItems: many(receiptLineItems),
	commercePayments: many(commercePayments),
	commerceRefunds: many(commerceRefunds),
	commercePaymentSchedules: many(commercePaymentSchedules),
	chefEmergencyContacts: many(chefEmergencyContacts),
	eventContingencyNotes: many(eventContingencyNotes),
	professionalAchievements: many(professionalAchievements),
	learningGoals: many(learningGoals),
	registerSessions: many(registerSessions),
	orderQueues: many(orderQueue),
	eventTravelLegs: many(eventTravelLegs),
	eventSurveys_chefId: many(eventSurveys, {
		relationName: "eventSurveys_chefId_chefs_id"
	}),
	eventSurveys_tenantId: many(eventSurveys, {
		relationName: "eventSurveys_tenantId_chefs_id"
	}),
	vendorPricePoints: many(vendorPricePoints),
	eventPrepBlocks: many(eventPrepBlocks),
	dailyReconciliationReports: many(dailyReconciliationReports),
	settlementRecords: many(settlementRecords),
	dailyTaxSummaries: many(dailyTaxSummary),
	directOutreachLogs: many(directOutreachLog),
	campaignTemplates: many(campaignTemplates),
	automatedSequences: many(automatedSequences),
	sequenceEnrollments: many(sequenceEnrollments),
	cashDrawerMovements: many(cashDrawerMovements),
	recipeShares_fromChefId: many(recipeShares, {
		relationName: "recipeShares_fromChefId_chefs_id"
	}),
	recipeShares_toChefId: many(recipeShares, {
		relationName: "recipeShares_toChefId_chefs_id"
	}),
	socialHashtagSets: many(socialHashtagSets),
	chefProfiles_chefId: many(chefProfiles, {
		relationName: "chefProfiles_chefId_chefs_id"
	}),
	chefProfiles_tenantId: many(chefProfiles, {
		relationName: "chefProfiles_tenantId_chefs_id"
	}),
	chefSocialPosts: many(chefSocialPosts),
	chefFollows_followerChefId: many(chefFollows, {
		relationName: "chefFollows_followerChefId_chefs_id"
	}),
	chefFollows_followingChefId: many(chefFollows, {
		relationName: "chefFollows_followingChefId_chefs_id"
	}),
	chefPostReactions: many(chefPostReactions),
	chefPostComments: many(chefPostComments),
	chefCommentReactions: many(chefCommentReactions),
	chefPostSaves: many(chefPostSaves),
	chefSocialChannels: many(chefSocialChannels),
	chefChannelMemberships: many(chefChannelMemberships),
	chefStories: many(chefStories),
	chefStoryViews: many(chefStoryViews),
	chefStoryReactions: many(chefStoryReactions),
	chefPostMentions: many(chefPostMentions),
	tenantSettings: many(tenantSettings),
	clientAllergyRecords: many(clientAllergyRecords),
	chefTeamMembers_chefId: many(chefTeamMembers, {
		relationName: "chefTeamMembers_chefId_chefs_id"
	}),
	chefTeamMembers_memberChefId: many(chefTeamMembers, {
		relationName: "chefTeamMembers_memberChefId_chefs_id"
	}),
	chefTeamMembers_tenantId: many(chefTeamMembers, {
		relationName: "chefTeamMembers_tenantId_chefs_id"
	}),
	chefCalendarEntries: many(chefCalendarEntries),
	availabilitySignalNotificationLogs: many(availabilitySignalNotificationLog),
	timeBlocks: many(timeBlocks),
	socialPlatformCredentials: many(socialPlatformCredentials),
	socialConnectedAccounts: many(socialConnectedAccounts),
	socialStatsSnapshots: many(socialStatsSnapshots),
	eventContractVersions: many(eventContractVersions),
	eventContractSigners: many(eventContractSigners),
	competitorBenchmarks: many(competitorBenchmarks),
	websiteStatsSnapshots: many(websiteStatsSnapshots),
	clientTags: many(clientTags),
	charityHours: many(charityHours),
	chefSchedulingRules: many(chefSchedulingRules),
	clientSegments: many(clientSegments),
	paymentPlanInstallments: many(paymentPlanInstallments),
	eventTips: many(eventTips),
	clientQuickRequests: many(clientQuickRequests),
	beverages: many(beverages),
	menuBeveragePairings: many(menuBeveragePairings),
	chefApiKeys: many(chefApiKeys),
	webhookEndpoints: many(webhookEndpoints),
	documentVersions: many(documentVersions),
	communityTemplates: many(communityTemplates),
	raffleEntries: many(raffleEntries),
	loyaltyConfigs: many(loyaltyConfig),
	customFieldDefinitions: many(customFieldDefinitions),
	customFieldValues: many(customFieldValues),
	raffleRounds: many(raffleRounds),
	chefEventTypeLabels: many(chefEventTypeLabels),
	loyaltyRewardRedemptions: many(loyaltyRewardRedemptions),
	bankConnections: many(bankConnections),
	bankTransactions: many(bankTransactions),
	taxQuarterlyEstimates: many(taxQuarterlyEstimates),
	contractorPayments: many(contractorPayments),
	paymentDisputes: many(paymentDisputes),
	eventShareInvites: many(eventShareInvites),
	staffPerformanceScores: many(staffPerformanceScores),
	vendorInvoices: many(vendorInvoices),
	wasteLogs_chefId: many(wasteLogs),
	proposalTemplates: many(proposalTemplates),
	proposalAddons: many(proposalAddons),
	smartFieldValues: many(smartFieldValues),
	followupRules: many(followupRules),
	abTests: many(abTests),
	contentPerformances: many(contentPerformance),
	serviceCourses: many(serviceCourses),
	documentComments: many(documentComments),
	chefDailyBriefings: many(chefDailyBriefings),
	benchmarkSnapshots: many(benchmarkSnapshots),
	demandForecasts: many(demandForecasts),
	portfolioItems: many(portfolioItems),
	profileHighlights: many(profileHighlights),
	dietaryConflictAlerts: many(dietaryConflictAlerts),
	clientPreferencePatterns: many(clientPreferencePatterns),
	stripeTransfers: many(stripeTransfers),
	platformFeeLedgers: many(platformFeeLedger),
	groceryPriceQuotes: many(groceryPriceQuotes),
	purchaseOrders: many(purchaseOrders),
	purchaseOrderItems: many(purchaseOrderItems),
	dailyChecklistCustomItems: many(dailyChecklistCustomItems),
	clientIntakeForms: many(clientIntakeForms),
	clientIntakeResponses: many(clientIntakeResponses),
	clientIntakeShares: many(clientIntakeShares),
	eventJoinRequests: many(eventJoinRequests),
	eventGuestDietaryItems: many(eventGuestDietaryItems),
	eventGuestRsvpAudits: many(eventGuestRsvpAudit),
	eventShareInviteEvents: many(eventShareInviteEvents),
	automationExecutionLogs: many(automationExecutionLog),
	rsvpReminderLogs: many(rsvpReminderLog),
	deadLetterQueues: many(deadLetterQueue),
	guestCommunicationLogs: many(guestCommunicationLogs),
	jobRetryLogs: many(jobRetryLog),
	retirementContributions: many(retirementContributions),
	healthInsurancePremiums: many(healthInsurancePremiums),
	equipmentDepreciationSchedules: many(equipmentDepreciationSchedules),
	salesTaxSettings: many(salesTaxSettings),
	eventSalesTaxes: many(eventSalesTax),
	salesTaxRemittances: many(salesTaxRemittances),
	employees: many(employees),
	payrollRecords: many(payrollRecords),
	payroll941Summaries: many(payroll941Summaries),
	payrollW2Summaries: many(payrollW2Summaries),
	marketingCampaigns: many(marketingCampaigns),
	chefServiceTypes: many(chefServiceTypes),
	campaignRecipients: many(campaignRecipients),
	chefNotificationTierOverrides: many(chefNotificationTierOverrides),
	goalCheckIns: many(goalCheckIns),
	chefTaxConfigs: many(chefTaxConfig),
	simulationRuns: many(simulationRuns),
	simulationResults: many(simulationResults),
	hubGuestEventHistories: many(hubGuestEventHistory),
	fineTuningExamples: many(fineTuningExamples),
	remyAbuseLogs: many(remyAbuseLog),
	cannabisTierUsers: many(cannabisTierUsers),
	cannabisEventDetails: many(cannabisEventDetails),
	chefIncidents: many(chefIncidents),
	chefInsurancePolicies: many(chefInsurancePolicies),
	chefBusinessHealthItems: many(chefBusinessHealthItems),
	eventSafetyChecklists: many(eventSafetyChecklists),
	eventAlcoholLogs: many(eventAlcoholLogs),
	chefBackupContacts: many(chefBackupContacts),
	chefBrandMentions: many(chefBrandMentions),
	chefCrisisPlans: many(chefCrisisPlans),
	chefCapabilityInventories: many(chefCapabilityInventory),
	eventStubs: many(eventStubs),
	chefEducationLogs: many(chefEducationLog),
	chefCreativeProjects: many(chefCreativeProjects),
	staffOnboardingItems: many(staffOnboardingItems),
	contractorServiceAgreements: many(contractorServiceAgreements),
	chefPortfolioRemovalRequests: many(chefPortfolioRemovalRequests),
	chefGrowthCheckins: many(chefGrowthCheckins),
	chefMomentumSnapshots: many(chefMomentumSnapshots),
	chefAvailabilityShareTokens: many(chefAvailabilityShareTokens),
	guestTestimonials: many(guestTestimonials),
	chefAutomationSettings: many(chefAutomationSettings),
	remyArtifacts: many(remyArtifacts),
	remyConversations: many(remyConversations),
	guestLeads: many(guestLeads),
	guestPhotos: many(guestPhotos),
	retainers: many(retainers),
	retainerPeriods: many(retainerPeriods),
	remyMessages: many(remyMessages),
	remyMemories: many(remyMemories),
	prospectScrubSessions: many(prospectScrubSessions),
	clientPhotos: many(clientPhotos),
	favoriteChefs: many(favoriteChefs),
	prospectNotes: many(prospectNotes),
	prospectCallScripts: many(prospectCallScripts),
	dailyPlanDrafts: many(dailyPlanDrafts),
	dailyPlanDismissals: many(dailyPlanDismissals),
	chefCulinaryWords: many(chefCulinaryWords),
	chefCulinaryProfiles: many(chefCulinaryProfiles),
	chefBreadcrumbs: many(chefBreadcrumbs),
	aiTaskQueues: many(aiTaskQueue),
	chefReminders: many(chefReminders),
	remyUsageMetrics: many(remyUsageMetrics),
	remySupportShares: many(remySupportShares),
	taskTemplates: many(taskTemplates),
	tasks: many(tasks),
	taskCompletionLogs: many(taskCompletionLog),
	remyFeedbacks_chefId: many(remyFeedback, {
		relationName: "remyFeedback_chefId_chefs_id"
	}),
	remyFeedbacks_tenantId: many(remyFeedback, {
		relationName: "remyFeedback_tenantId_chefs_id"
	}),
	stations: many(stations),
	stationMenuItems: many(stationMenuItems),
	stationComponents: many(stationComponents),
	clipboardEntries: many(clipboardEntries),
	shiftLogs: many(shiftLogs),
	orderRequests: many(orderRequests),
	hubChefRecommendations: many(hubChefRecommendations),
	aiPreferences: many(aiPreferences),
	wasteLogs_chefId: many(wasteLog),
	opsLogs: many(opsLog),
	menus: many(menus, {
		relationName: "menus_tenantId_chefs_id"
	}),
	vendorItems: many(vendorItems),
	vendorInvoiceLineItems: many(vendorInvoiceLineItems),
	menuPreferences: many(menuPreferences),
	dailyRevenues: many(dailyRevenue),
	guests: many(guests),
	guestTags: many(guestTags),
	guestComps: many(guestComps),
	emailSenderReputations: many(emailSenderReputation),
	guestVisits: many(guestVisits),
	guestReservations: many(guestReservations),
	inventoryTransactions: many(inventoryTransactions),
	storageLocations: many(storageLocations),
	eventDocumentSnapshots: many(eventDocumentSnapshots),
	remyActionAuditLogs_chefId: many(remyActionAuditLog, {
		relationName: "remyActionAuditLog_chefId_chefs_id"
	}),
	remyActionAuditLogs_tenantId: many(remyActionAuditLog, {
		relationName: "remyActionAuditLog_tenantId_chefs_id"
	}),
	eventDocumentGenerationJobs: many(eventDocumentGenerationJobs),
	remyApprovalPolicies: many(remyApprovalPolicies),
	chefTrustedCircles_chefId: many(chefTrustedCircle, {
		relationName: "chefTrustedCircle_chefId_chefs_id"
	}),
	chefTrustedCircles_trustedChefId: many(chefTrustedCircle, {
		relationName: "chefTrustedCircle_trustedChefId_chefs_id"
	}),
	chefHandoffs: many(chefHandoffs),
	chefHandoffRecipients: many(chefHandoffRecipients),
	chefHandoffEvents: many(chefHandoffEvents),
	chefAvailabilitySignals: many(chefAvailabilitySignals),
	chefSocialNotifications_actorChefId: many(chefSocialNotifications, {
		relationName: "chefSocialNotifications_actorChefId_chefs_id"
	}),
	chefSocialNotifications_recipientChefId: many(chefSocialNotifications, {
		relationName: "chefSocialNotifications_recipientChefId_chefs_id"
	}),
	commercePromotions: many(commercePromotions),
	saleAppliedPromotions: many(saleAppliedPromotions),
	posAlertEvents: many(posAlertEvents),
	posMetricSnapshots: many(posMetricSnapshots),
	commerceDiningZones: many(commerceDiningZones),
	commerceDiningTables: many(commerceDiningTables),
	commerceDiningChecks: many(commerceDiningChecks),
	vendorCatalogImportRows: many(vendorCatalogImportRows),
	vendorDocumentUploads: many(vendorDocumentUploads),
	vendorPriceAlertSettings: many(vendorPriceAlertSettings),
	clientMealRequests: many(clientMealRequests),
	eventServiceSessions: many(eventServiceSessions),
	recurringMenuRecommendations: many(recurringMenuRecommendations),
	servedDishHistories: many(servedDishHistory),
	chefServiceConfigs: many(chefServiceConfig),
	shiftHandoffNotes: many(shiftHandoffNotes),
	prepTimelines: many(prepTimeline),
	workflowTemplates: many(workflowTemplates),
	workflowExecutions: many(workflowExecutions),
	workflowExecutionLogs: many(workflowExecutionLog),
	eventEquipmentAssignments: many(eventEquipmentAssignments),
	clientWorksheets: many(clientWorksheets),
	betaOnboardingChecklists: many(betaOnboardingChecklist),
	frontOfHouseMenus: many(frontOfHouseMenus),
	eventLeftoverDetails: many(eventLeftoverDetails),
	guestFeedbacks: many(guestFeedback),
	guestMessages: many(guestMessages),
	guestDayOfReminders: many(guestDayOfReminders),
	guestDietaryConfirmations: many(guestDietaryConfirmations),
	eventGuestDocuments: many(eventGuestDocuments),
	eventShares: many(eventShares),
	chefBudgets: many(chefBudgets),
	socialPosts: many(socialPosts),
	clientProposals: many(clientProposals),
	staffEventTokens: many(staffEventTokens),
	mealPrepWeeks: many(mealPrepWeeks),
	menuNutritions: many(menuNutrition),
	followUpSends: many(followUpSends),
	vendorEventAssignments: many(vendorEventAssignments),
	eventEquipmentRentals: many(eventEquipmentRentals),
	hubGroups: many(hubGroups),
	openTableRequests: many(openTableRequests),
	shoppingLists: many(shoppingLists),
	packingTemplates: many(packingTemplates),
	platingGuides: many(platingGuides),
	eventPrepSteps: many(eventPrepSteps),
	dietaryConfirmations_confirmedByChefId: many(dietaryConfirmations, {
		relationName: "dietaryConfirmations_confirmedByChefId_chefs_id"
	}),
	dietaryConfirmations_tenantId: many(dietaryConfirmations, {
		relationName: "dietaryConfirmations_tenantId_chefs_id"
	}),
	quoteLineItems: many(quoteLineItems),
	eventLiveStatuses: many(eventLiveStatus),
	eventGuests: many(eventGuests),
	clientReviews: many(clientReviews),
	eventContracts: many(eventContracts),
	proposalTokens: many(proposalTokens),
	quoteAddons: many(quoteAddons),
	ingredients: many(ingredients),
	recipes: many(recipes),
	bookingEventTypes: many(bookingEventTypes),
	bookingAvailabilityRules: many(bookingAvailabilityRules),
	bookingDateOverrides: many(bookingDateOverrides),
	bookingDailyCaps: many(bookingDailyCaps),
	recurringInvoices: many(recurringInvoices),
	recurringInvoiceHistories: many(recurringInvoiceHistory),
	quotes: many(quotes),
	proposalSections: many(proposalSections),
	clientOutreachLogs: many(clientOutreachLog),
	referralRequestLogs: many(referralRequestLog),
	eventEquipmentChecklists: many(eventEquipmentChecklist),
	eventStationAssignments: many(eventStationAssignments),
	eventVendorDeliveries: many(eventVendorDeliveries),
	eventFloorPlans: many(eventFloorPlans),
	mealPrepPrograms: many(mealPrepPrograms),
	containerInventories: many(containerInventory),
	containerTransactions: many(containerTransactions),
	clientMealPrepPreferences: many(clientMealPrepPreferences),
	recipeNutritions: many(recipeNutrition),
	mealPrepBatchLogs: many(mealPrepBatchLog),
	kdsTickets: many(kdsTickets),
	productProjections: many(productProjections),
	productModifierGroups: many(productModifierGroups),
	productModifiers: many(productModifiers),
	productModifierAssignments: many(productModifierAssignments),
	dailySpecials: many(dailySpecials),
	truckLocations: many(truckLocations),
	truckSchedules: many(truckSchedule),
	bakeryBatches: many(bakeryBatches),
	fermentationLogs: many(fermentationLogs),
	bakeryOvens: many(bakeryOvens),
	bakeSchedules: many(bakeSchedule),
	bakeryYieldRecords: many(bakeryYieldRecords),
	smsMessages: many(smsMessages),
	giftCards: many(giftCards),
	giftCardTransactions: many(giftCardTransactions),
	taxJurisdictions: many(taxJurisdictions),
	taxCollecteds: many(taxCollected),
	taxFilings: many(taxFilings),
	qrCodes: many(qrCodes),
	qrScans: many(qrScans),
	entityTemplates: many(entityTemplates),
	ingredientShelfLifeDefaults: many(ingredientShelfLifeDefaults),
	businessLocations: many(businessLocations),
	inventoryCounts: many(inventoryCounts),
	sales: many(sales),
	dailyChecklistCompletions: many(dailyChecklistCompletions),
	inventoryLots: many(inventoryLots),
	communicationLogs: many(communicationLog),
	staffMembers: many(staffMembers),
	staffClockEntries: many(staffClockEntries),
	permits: many(permits),
	vehicleMaintenances: many(vehicleMaintenance),
	bakeryOrders: many(bakeryOrders),
	wholesaleAccounts: many(wholesaleAccounts),
	wholesaleOrders: many(wholesaleOrders),
	bakeryTastings: many(bakeryTastings),
	bakerySeasonalItems: many(bakerySeasonalItems),
	displayCaseItems: many(displayCaseItems),
	bakeryParStocks: many(bakeryParStock),
	bakeryProductionLogs: many(bakeryProductionLog),
	feedbackResponses: many(feedbackResponses),
	googleConnections_chefId: many(googleConnections, {
		relationName: "googleConnections_chefId_chefs_id"
	}),
	googleConnections_tenantId: many(googleConnections, {
		relationName: "googleConnections_tenantId_chefs_id"
	}),
	documentIntelligenceJobs: many(documentIntelligenceJobs),
	documentIntelligenceItems: many(documentIntelligenceItems),
	googleMailboxes_chefId: many(googleMailboxes, {
		relationName: "googleMailboxes_chefId_chefs_id"
	}),
	googleMailboxes_tenantId: many(googleMailboxes, {
		relationName: "googleMailboxes_tenantId_chefs_id"
	}),
	gmailSyncLogs: many(gmailSyncLog),
	gmailHistoricalFindings_chefId: many(gmailHistoricalFindings, {
		relationName: "gmailHistoricalFindings_chefId_chefs_id"
	}),
	gmailHistoricalFindings_tenantId: many(gmailHistoricalFindings, {
		relationName: "gmailHistoricalFindings_tenantId_chefs_id"
	}),
	messages: many(messages),
	platformRecords: many(platformRecords),
	platformSnapshots: many(platformSnapshots),
	platformActionLogs: many(platformActionLog),
	platformPayouts: many(platformPayouts),
	betaSignupTrackers: many(betaSignupTrackers),
	outreachCampaigns: many(outreachCampaigns),
	prospects: many(prospects),
	menuTemplates: many(menuTemplates),
	eventSiteAssessments: many(eventSiteAssessments),
	waitlistEntries: many(waitlistEntries),
	complianceTempLogs: many(complianceTempLogs),
	complianceCleaningLogs: many(complianceCleaningLogs),
	truckPreorders: many(truckPreorders),
	entityPhotos: many(entityPhotos),
	sops: many(sops),
	sopCompletions: many(sopCompletions),
	stocktakes: many(stocktakes),
	stocktakeItems: many(stocktakeItems),
	reorderSettings: many(reorderSettings),
	tipEntries: many(tipEntries),
	tipPoolConfigs: many(tipPoolConfigs),
	tipDistributions: many(tipDistributions),
	shiftTemplates: many(shiftTemplates),
	scheduledShifts: many(scheduledShifts),
	shiftSwapRequests: many(shiftSwapRequests),
	feedbackRequests: many(feedbackRequests),
	productPublicMediaLinks: many(productPublicMediaLinks),
	eventReadinessGates: many(eventReadinessGates),
	dopTaskCompletions: many(dopTaskCompletions),
	rebookTokens: many(rebookTokens),
	eventTemplates: many(eventTemplates),
	eventSeries: many(eventSeries),
	usersInAuth: one(usersInAuth, {
		fields: [chefs.authUserId],
		references: [usersInAuth.id]
	}),
	menu: one(menus, {
		fields: [chefs.featuredBookingMenuId],
		references: [menus.id],
		relationName: "chefs_featuredBookingMenuId_menus_id"
	}),
	clientPreferences: many(clientPreferences),
	clientKitchenInventories: many(clientKitchenInventory),
	chefEquipmentMasters: many(chefEquipmentMaster),
	chefCapacitySettings: many(chefCapacitySettings),
	eventWasteLogs: many(eventWasteLogs),
	cancellationPolicies: many(cancellationPolicies),
	expenseTaxCategories: many(expenseTaxCategories),
	clientReferrals: many(clientReferrals),
	recurringSchedules: many(recurringSchedules),
	chefCertifications_chefId: many(chefCertifications, {
		relationName: "chefCertifications_chefId_chefs_id"
	}),
	chefCertifications_tenantId: many(chefCertifications, {
		relationName: "chefCertifications_tenantId_chefs_id"
	}),
	testimonials: many(testimonials),
	mileageLogs_chefId: many(mileageLogs, {
		relationName: "mileageLogs_chefId_chefs_id"
	}),
	mileageLogs_tenantId: many(mileageLogs, {
		relationName: "mileageLogs_tenantId_chefs_id"
	}),
	clientNdas: many(clientNdas),
	cookingClasses: many(cookingClasses),
	classRegistrations: many(classRegistrations),
	chefDepositSettings: many(chefDepositSettings),
	experiencePackages: many(experiencePackages),
	pantryLocations: many(pantryLocations),
	pantryItems: many(pantryItems),
	chefSeasonalAvailabilities: many(chefSeasonalAvailability),
	eventPhotos: many(eventPhotos),
	clientGiftLogs: many(clientGiftLog),
	clientFollowupRules: many(clientFollowupRules),
	groceryPriceEntries: many(groceryPriceEntries),
	tastingMenus: many(tastingMenus),
	menuServiceHistories: many(menuServiceHistory),
	seasonalAvailabilityPeriods: many(seasonalAvailabilityPeriods),
	groceryTrips: many(groceryTrips),
	chefEquipments: many(chefEquipment),
	packingChecklists: many(packingChecklists),
	dietaryChangeLogs: many(dietaryChangeLog),
	smartGroceryLists: many(smartGroceryLists),
	aislePreferences: many(aislePreferences),
	chefPreferredStores: many(chefPreferredStores),
	storeItemAssignments: many(storeItemAssignments),
	emailSequences: many(emailSequences),
	emailSequenceEnrollments: many(emailSequenceEnrollments),
	sourcingEntries: many(sourcingEntries),
	featureRequests: many(featureRequests),
	featureVotes: many(featureVotes),
	recipeStepPhotos: many(recipeStepPhotos),
	socialTemplates: many(socialTemplates),
	vaTasks: many(vaTasks),
	mealPrepItems: many(mealPrepItems),
	mealPrepOrders: many(mealPrepOrders),
	mealPrepWindows: many(mealPrepWindows),
	eventFeedbacks: many(eventFeedback),
	vendors: many(vendors),
	vendorPriceEntries: many(vendorPriceEntries),
	staffSchedules: many(staffSchedules),
	staffAvailabilities_chefId: many(staffAvailability, {
		relationName: "staffAvailability_chefId_chefs_id"
	}),
	staffAvailabilities_tenantId: many(staffAvailability, {
		relationName: "staffAvailability_tenantId_chefs_id"
	}),
	insurancePolicies: many(insurancePolicies),
	onboardingProgresses: many(onboardingProgress),
	insuranceClaims: many(insuranceClaims),
	communityProfiles: many(communityProfiles),
	communityBenchmarks: many(communityBenchmarks),
	communityMessages_recipientId: many(communityMessages, {
		relationName: "communityMessages_recipientId_chefs_id"
	}),
	communityMessages_senderId: many(communityMessages, {
		relationName: "communityMessages_senderId_chefs_id"
	}),
	chefDirectoryListings: many(chefDirectoryListings),
	mentorshipProfiles: many(mentorshipProfiles),
	mentorshipConnections_menteeId: many(mentorshipConnections, {
		relationName: "mentorshipConnections_menteeId_chefs_id"
	}),
	mentorshipConnections_mentorId: many(mentorshipConnections, {
		relationName: "mentorshipConnections_mentorId_chefs_id"
	}),
	subcontractAgreements_hiringChefId: many(subcontractAgreements, {
		relationName: "subcontractAgreements_hiringChefId_chefs_id"
	}),
	subcontractAgreements_subcontractorChefId: many(subcontractAgreements, {
		relationName: "subcontractAgreements_subcontractorChefId_chefs_id"
	}),
	grocerySpendEntries: many(grocerySpendEntries),
	tipRequests: many(tipRequests),
	giftCertificates: many(giftCertificates),
	marketingSpendLogs: many(marketingSpendLog),
	platformApiConnections: many(platformApiConnections),
	clientMergeLogs: many(clientMergeLog),
	ingredientPriceHistories: many(ingredientPriceHistory),
	vendorPreferredIngredients: many(vendorPreferredIngredients),
	varianceAlertSettings: many(varianceAlertSettings),
	autoResponseConfigs: many(autoResponseConfig),
	businessHoursConfigs: many(businessHoursConfig),
	inquiries: many(inquiries),
	clients: many(clients),
	events: many(events),
	paymentMilestoneTemplates: many(paymentMilestoneTemplates),
	eventPaymentMilestones: many(eventPaymentMilestones),
	eventContacts: many(eventContacts),
	kitchenAssessments: many(kitchenAssessments),
	responseTemplates_chefId: many(responseTemplates, {
		relationName: "responseTemplates_chefId_chefs_id"
	}),
	responseTemplates_tenantId: many(responseTemplates, {
		relationName: "responseTemplates_tenantId_chefs_id"
	}),
	menuRevisions: many(menuRevisions),
	menuDishFeedbacks: many(menuDishFeedback),
	guestCountChanges: many(guestCountChanges),
	paymentMilestones: many(paymentMilestones),
	followUpSequences: many(followUpSequences),
	postEventSurveys: many(postEventSurveys),
	scheduledMessages: many(scheduledMessages),
	automationRules: many(automationRules),
	orderAheadItems: many(orderAheadItems),
	orderAheadOrders: many(orderAheadOrders),
	mealPrepContainers: many(mealPrepContainers),
	mealPrepDeliveries: many(mealPrepDeliveries),
	clientSatisfactionSurveys: many(clientSatisfactionSurveys),
	menuItems: many(menuItems),
	chefFolders: many(chefFolders),
	chefDocuments: many(chefDocuments),
	expenses: many(expenses),
	recipeProductionLogs: many(recipeProductionLog),
	chefPreferences_chefId: many(chefPreferences, {
		relationName: "chefPreferences_chefId_chefs_id"
	}),
	chefPreferences_tenantId: many(chefPreferences, {
		relationName: "chefPreferences_tenantId_chefs_id"
	}),
	chefPricingConfigs: many(chefPricingConfig),
	clientTasteProfiles: many(clientTasteProfiles),
	eventContentDrafts: many(eventContentDrafts),
	clientTouchpointRules: many(clientTouchpointRules),
	equipmentItems: many(equipmentItems),
	equipmentMaintenanceLogs: many(equipmentMaintenanceLog),
	eventCollaborators_chefId: many(eventCollaborators, {
		relationName: "eventCollaborators_chefId_chefs_id"
	}),
	eventCollaborators_invitedByChefId: many(eventCollaborators, {
		relationName: "eventCollaborators_invitedByChefId_chefs_id"
	}),
	chefTaxonomyExtensions: many(chefTaxonomyExtensions),
	chefTaxonomyHiddens: many(chefTaxonomyHidden),
	taskDependencies: many(taskDependencies),
	conversationThreadReads: many(conversationThreadReads),
	chefFeatureFlags: many(chefFeatureFlags),
	quoteSelectedAddons: many(quoteSelectedAddons),
}));

export const usersInAuthRelations = relations(usersInAuth, ({many}) => ({
	inventoryAudits_createdBy: many(inventoryAudits, {
		relationName: "inventoryAudits_createdBy_usersInAuth_id"
	}),
	inventoryAudits_finalizedBy: many(inventoryAudits, {
		relationName: "inventoryAudits_finalizedBy_usersInAuth_id"
	}),
	staffMeals: many(staffMeals),
	cannabisHostAgreements: many(cannabisHostAgreements),
	userRoles: many(userRoles),
	clientInvitations: many(clientInvitations),
	cannabisControlPacketReconciliations_finalizedBy: many(cannabisControlPacketReconciliations, {
		relationName: "cannabisControlPacketReconciliations_finalizedBy_usersInAuth_id"
	}),
	cannabisControlPacketReconciliations_reconciledBy: many(cannabisControlPacketReconciliations, {
		relationName: "cannabisControlPacketReconciliations_reconciledBy_usersInAuth_id"
	}),
	cannabisControlPacketEvidences: many(cannabisControlPacketEvidence),
	auditLogs: many(auditLog),
	cannabisControlPacketSnapshots_finalizedBy: many(cannabisControlPacketSnapshots, {
		relationName: "cannabisControlPacketSnapshots_finalizedBy_usersInAuth_id"
	}),
	cannabisControlPacketSnapshots_generatedBy: many(cannabisControlPacketSnapshots, {
		relationName: "cannabisControlPacketSnapshots_generatedBy_usersInAuth_id"
	}),
	inquiryStateTransitions: many(inquiryStateTransitions),
	qolMetricEvents: many(qolMetricEvents),
	eventStateTransitions: many(eventStateTransitions),
	quoteStateTransitions: many(quoteStateTransitions),
	afterActionReviews_createdBy: many(afterActionReviews, {
		relationName: "afterActionReviews_createdBy_usersInAuth_id"
	}),
	afterActionReviews_updatedBy: many(afterActionReviews, {
		relationName: "afterActionReviews_updatedBy_usersInAuth_id"
	}),
	loyaltyTransactions: many(loyaltyTransactions),
	dishes_createdBy: many(dishes, {
		relationName: "dishes_createdBy_usersInAuth_id"
	}),
	dishes_updatedBy: many(dishes, {
		relationName: "dishes_updatedBy_usersInAuth_id"
	}),
	menuStateTransitions: many(menuStateTransitions),
	components_createdBy: many(components, {
		relationName: "components_createdBy_usersInAuth_id"
	}),
	components_updatedBy: many(components, {
		relationName: "components_updatedBy_usersInAuth_id"
	}),
	loyaltyRewards_createdBy: many(loyaltyRewards, {
		relationName: "loyaltyRewards_createdBy_usersInAuth_id"
	}),
	loyaltyRewards_updatedBy: many(loyaltyRewards, {
		relationName: "loyaltyRewards_updatedBy_usersInAuth_id"
	}),
	seasonalPalettes_createdBy: many(seasonalPalettes, {
		relationName: "seasonalPalettes_createdBy_usersInAuth_id"
	}),
	seasonalPalettes_updatedBy: many(seasonalPalettes, {
		relationName: "seasonalPalettes_updatedBy_usersInAuth_id"
	}),
	conversationParticipants: many(conversationParticipants),
	chatMessages: many(chatMessages),
	notifications: many(notifications),
	chefFeedbacks: many(chefFeedback),
	referralPartners: many(referralPartners),
	copilotActions: many(copilotActions),
	incentiveDeliveries: many(incentiveDeliveries),
	externalReviewSources: many(externalReviewSources),
	ledgerEntries: many(ledgerEntries),
	clientIncentives_createdByUserId: many(clientIncentives, {
		relationName: "clientIncentives_createdByUserId_usersInAuth_id"
	}),
	clientIncentives_purchasedByUserId: many(clientIncentives, {
		relationName: "clientIncentives_purchasedByUserId_usersInAuth_id"
	}),
	giftCardPurchaseIntents: many(giftCardPurchaseIntents),
	incentiveRedemptions: many(incentiveRedemptions),
	chefTodos: many(chefTodos),
	notificationPreferences: many(notificationPreferences),
	pushSubscriptions: many(pushSubscriptions),
	commercePayments: many(commercePayments),
	commerceRefunds: many(commerceRefunds),
	registerSessions_closedBy: many(registerSessions, {
		relationName: "registerSessions_closedBy_usersInAuth_id"
	}),
	registerSessions_openedBy: many(registerSessions, {
		relationName: "registerSessions_openedBy_usersInAuth_id"
	}),
	orderQueues: many(orderQueue),
	dailyReconciliationReports: many(dailyReconciliationReports),
	cashDrawerMovements: many(cashDrawerMovements),
	chefTeamMembers: many(chefTeamMembers),
	timeBlocks: many(timeBlocks),
	eventContractVersions: many(eventContractVersions),
	eventContractSigners_createdBy: many(eventContractSigners, {
		relationName: "eventContractSigners_createdBy_usersInAuth_id"
	}),
	eventContractSigners_signedByAuthUserId: many(eventContractSigners, {
		relationName: "eventContractSigners_signedByAuthUserId_usersInAuth_id"
	}),
	documentVersions: many(documentVersions),
	raffleRounds: many(raffleRounds),
	userFeedbacks: many(userFeedback),
	deadLetterQueues: many(deadLetterQueue),
	guestCommunicationLogs: many(guestCommunicationLogs),
	cannabisTierUsers: many(cannabisTierUsers),
	cannabisTierInvitations: many(cannabisTierInvitations),
	clientPhotos: many(clientPhotos),
	menus_createdBy: many(menus, {
		relationName: "menus_createdBy_usersInAuth_id"
	}),
	menus_updatedBy: many(menus, {
		relationName: "menus_updatedBy_usersInAuth_id"
	}),
	menuPreferences: many(menuPreferences),
	inventoryTransactions: many(inventoryTransactions),
	betaSurveyResponses: many(betaSurveyResponses),
	eventDocumentSnapshots: many(eventDocumentSnapshots),
	commercePromotions: many(commercePromotions),
	posAlertEvents_acknowledgedBy: many(posAlertEvents, {
		relationName: "posAlertEvents_acknowledgedBy_usersInAuth_id"
	}),
	posAlertEvents_resolvedBy: many(posAlertEvents, {
		relationName: "posAlertEvents_resolvedBy_usersInAuth_id"
	}),
	commerceDiningChecks_closedBy: many(commerceDiningChecks, {
		relationName: "commerceDiningChecks_closedBy_usersInAuth_id"
	}),
	commerceDiningChecks_openedBy: many(commerceDiningChecks, {
		relationName: "commerceDiningChecks_openedBy_usersInAuth_id"
	}),
	clientMealRequests: many(clientMealRequests),
	eventServiceSessions_createdBy: many(eventServiceSessions, {
		relationName: "eventServiceSessions_createdBy_usersInAuth_id"
	}),
	eventServiceSessions_updatedBy: many(eventServiceSessions, {
		relationName: "eventServiceSessions_updatedBy_usersInAuth_id"
	}),
	recurringMenuRecommendations_respondedBy: many(recurringMenuRecommendations, {
		relationName: "recurringMenuRecommendations_respondedBy_usersInAuth_id"
	}),
	recurringMenuRecommendations_sentBy: many(recurringMenuRecommendations, {
		relationName: "recurringMenuRecommendations_sentBy_usersInAuth_id"
	}),
	frontOfHouseMenus: many(frontOfHouseMenus),
	productTourProgresses: many(productTourProgress),
	hubGuestProfiles: many(hubGuestProfiles),
	eventGuests_authUserId: many(eventGuests, {
		relationName: "eventGuests_authUserId_usersInAuth_id"
	}),
	eventGuests_reconciledBy: many(eventGuests, {
		relationName: "eventGuests_reconciledBy_usersInAuth_id"
	}),
	ingredients_createdBy: many(ingredients, {
		relationName: "ingredients_createdBy_usersInAuth_id"
	}),
	ingredients_updatedBy: many(ingredients, {
		relationName: "ingredients_updatedBy_usersInAuth_id"
	}),
	recipes_createdBy: many(recipes, {
		relationName: "recipes_createdBy_usersInAuth_id"
	}),
	recipes_updatedBy: many(recipes, {
		relationName: "recipes_updatedBy_usersInAuth_id"
	}),
	quotes_createdBy: many(quotes, {
		relationName: "quotes_createdBy_usersInAuth_id"
	}),
	quotes_updatedBy: many(quotes, {
		relationName: "quotes_updatedBy_usersInAuth_id"
	}),
	sales_createdBy: many(sales, {
		relationName: "sales_createdBy_usersInAuth_id"
	}),
	sales_voidedBy: many(sales, {
		relationName: "sales_voidedBy_usersInAuth_id"
	}),
	staffMembers: many(staffMembers),
	messages_approvedBy: many(messages, {
		relationName: "messages_approvedBy_usersInAuth_id"
	}),
	messages_fromUserId: many(messages, {
		relationName: "messages_fromUserId_usersInAuth_id"
	}),
	messages_toUserId: many(messages, {
		relationName: "messages_toUserId_usersInAuth_id"
	}),
	menuTemplates_createdBy: many(menuTemplates, {
		relationName: "menuTemplates_createdBy_usersInAuth_id"
	}),
	menuTemplates_updatedBy: many(menuTemplates, {
		relationName: "menuTemplates_updatedBy_usersInAuth_id"
	}),
	eventReadinessGates: many(eventReadinessGates),
	eventSeries_createdBy: many(eventSeries, {
		relationName: "eventSeries_createdBy_usersInAuth_id"
	}),
	eventSeries_updatedBy: many(eventSeries, {
		relationName: "eventSeries_updatedBy_usersInAuth_id"
	}),
	chefs: many(chefs),
	pantryItems: many(pantryItems),
	eventPhotos: many(eventPhotos),
	grocerySpendEntries: many(grocerySpendEntries),
	clients: many(clients),
	events_createdBy: many(events, {
		relationName: "events_createdBy_usersInAuth_id"
	}),
	events_preEventChecklistConfirmedBy: many(events, {
		relationName: "events_preEventChecklistConfirmedBy_usersInAuth_id"
	}),
	events_updatedBy: many(events, {
		relationName: "events_updatedBy_usersInAuth_id"
	}),
	chefDocuments_createdBy: many(chefDocuments, {
		relationName: "chefDocuments_createdBy_usersInAuth_id"
	}),
	chefDocuments_updatedBy: many(chefDocuments, {
		relationName: "chefDocuments_updatedBy_usersInAuth_id"
	}),
	expenses_createdBy: many(expenses, {
		relationName: "expenses_createdBy_usersInAuth_id"
	}),
	expenses_updatedBy: many(expenses, {
		relationName: "expenses_updatedBy_usersInAuth_id"
	}),
}));

export const eventsRelations = relations(events, ({one, many}) => ({
	inventoryAudits: many(inventoryAudits),
	staffMeals: many(staffMeals),
	cannabisControlPacketReconciliations: many(cannabisControlPacketReconciliations),
	cannabisControlPacketEvidences: many(cannabisControlPacketEvidence),
	eventCannabisSettings: many(eventCannabisSettings),
	eventCannabisCourseConfigs: many(eventCannabisCourseConfig),
	cannabisControlPacketSnapshots: many(cannabisControlPacketSnapshots),
	eventStateTransitions: many(eventStateTransitions),
	afterActionReviews: many(afterActionReviews),
	loyaltyTransactions: many(loyaltyTransactions),
	menuModifications: many(menuModifications),
	unusedIngredients_eventId: many(unusedIngredients, {
		relationName: "unusedIngredients_eventId_events_id"
	}),
	unusedIngredients_transferredToEventId: many(unusedIngredients, {
		relationName: "unusedIngredients_transferredToEventId_events_id"
	}),
	shoppingSubstitutions: many(shoppingSubstitutions),
	conversations: many(conversations),
	chatMessages: many(chatMessages),
	clientNotes: many(clientNotes),
	notifications: many(notifications),
	chefFeedbacks: many(chefFeedback),
	referralPartners: many(referralPartners, {
		relationName: "referralPartners_originEventId_events_id"
	}),
	dishAppearances: many(dishAppearances),
	dishFeedbacks: many(dishFeedback),
	ledgerEntries: many(ledgerEntries),
	goalClientSuggestions: many(goalClientSuggestions),
	incentiveRedemptions: many(incentiveRedemptions),
	scheduledCalls: many(scheduledCalls),
	menuApprovalRequests: many(menuApprovalRequests),
	eventStaffAssignments: many(eventStaffAssignments),
	chefAvailabilityBlocks: many(chefAvailabilityBlocks),
	adminTimeLogs: many(adminTimeLogs),
	equipmentRentals: many(equipmentRentals),
	kitchenRentals: many(kitchenRentals),
	eventTempLogs: many(eventTempLogs),
	receiptPhotos: many(receiptPhotos),
	receiptLineItems: many(receiptLineItems),
	commercePayments: many(commercePayments),
	commercePaymentSchedules: many(commercePaymentSchedules),
	eventContingencyNotes: many(eventContingencyNotes),
	eventTravelLegs: many(eventTravelLegs),
	travelLegIngredients: many(travelLegIngredients),
	eventSurveys: many(eventSurveys),
	eventPrepBlocks: many(eventPrepBlocks),
	paymentPlanInstallments: many(paymentPlanInstallments),
	eventTips: many(eventTips),
	clientQuickRequests: many(clientQuickRequests),
	loyaltyRewardRedemptions: many(loyaltyRewardRedemptions),
	paymentDisputes: many(paymentDisputes),
	eventShareInvites: many(eventShareInvites),
	wasteLogs: many(wasteLogs),
	serviceCourses: many(serviceCourses),
	dietaryConflictAlerts: many(dietaryConflictAlerts),
	stripeTransfers: many(stripeTransfers),
	platformFeeLedgers: many(platformFeeLedger),
	groceryPriceQuotes: many(groceryPriceQuotes),
	eventJoinRequests: many(eventJoinRequests),
	eventGuestDietaryItems: many(eventGuestDietaryItems),
	eventGuestRsvpAudits: many(eventGuestRsvpAudit),
	eventShareInviteEvents: many(eventShareInviteEvents),
	rsvpReminderLogs: many(rsvpReminderLog),
	guestCommunicationLogs: many(guestCommunicationLogs),
	eventSalesTaxes: many(eventSalesTax),
	hubGuestEventHistories: many(hubGuestEventHistory),
	cannabisEventDetails: many(cannabisEventDetails),
	chefIncidents: many(chefIncidents),
	eventSafetyChecklists: many(eventSafetyChecklists),
	eventAlcoholLogs: many(eventAlcoholLogs),
	eventStubs: many(eventStubs),
	guestTestimonials: many(guestTestimonials),
	remyArtifacts: many(remyArtifacts),
	guestLeads: many(guestLeads),
	guestPhotos: many(guestPhotos),
	hubMedias: many(hubMedia),
	remyMemories: many(remyMemories),
	aiTaskQueues: many(aiTaskQueue),
	chefReminders: many(chefReminders),
	menus: many(menus, {
		relationName: "menus_eventId_events_id"
	}),
	menuPreferences: many(menuPreferences),
	inventoryTransactions: many(inventoryTransactions),
	eventDocumentSnapshots: many(eventDocumentSnapshots),
	eventDocumentGenerationJobs: many(eventDocumentGenerationJobs),
	eventServiceSessions: many(eventServiceSessions, {
		relationName: "eventServiceSessions_eventId_events_id"
	}),
	servedDishHistories: many(servedDishHistory),
	prepTimelines: many(prepTimeline),
	eventEquipmentAssignments: many(eventEquipmentAssignments),
	hubGroupEvents: many(hubGroupEvents),
	clientWorksheets: many(clientWorksheets),
	frontOfHouseMenus: many(frontOfHouseMenus),
	eventLeftoverDetails_eventId: many(eventLeftoverDetails, {
		relationName: "eventLeftoverDetails_eventId_events_id"
	}),
	eventLeftoverDetails_nextEventId: many(eventLeftoverDetails, {
		relationName: "eventLeftoverDetails_nextEventId_events_id"
	}),
	guestFeedbacks: many(guestFeedback),
	guestMessages: many(guestMessages),
	guestDayOfReminders: many(guestDayOfReminders),
	guestDietaryConfirmations: many(guestDietaryConfirmations),
	eventGuestDocuments: many(eventGuestDocuments),
	eventShares: many(eventShares),
	socialPosts: many(socialPosts),
	clientProposals: many(clientProposals),
	staffEventTokens: many(staffEventTokens),
	followUpSends: many(followUpSends),
	vendorEventAssignments: many(vendorEventAssignments),
	eventEquipmentRentals: many(eventEquipmentRentals),
	hubShareCards: many(hubShareCards),
	hubGroups: many(hubGroups),
	shoppingLists: many(shoppingLists),
	eventPrepSteps: many(eventPrepSteps),
	dietaryConfirmations: many(dietaryConfirmations),
	eventLiveStatuses: many(eventLiveStatus),
	eventGuests: many(eventGuests),
	clientReviews: many(clientReviews),
	eventContracts: many(eventContracts),
	proposalTokens: many(proposalTokens),
	quotes: many(quotes, {
		relationName: "quotes_eventId_events_id"
	}),
	referralRequestLogs: many(referralRequestLog),
	eventEquipmentChecklists: many(eventEquipmentChecklist),
	eventStationAssignments: many(eventStationAssignments),
	eventVendorDeliveries: many(eventVendorDeliveries),
	eventFloorPlans: many(eventFloorPlans),
	sales: many(sales),
	staffClockEntries: many(staffClockEntries),
	messages: many(messages),
	platformRecords: many(platformRecords),
	platformSnapshots: many(platformSnapshots),
	platformActionLogs: many(platformActionLog),
	platformPayouts: many(platformPayouts),
	eventSiteAssessments: many(eventSiteAssessments),
	waitlistEntries: many(waitlistEntries),
	eventReadinessGates: many(eventReadinessGates),
	dopTaskCompletions: many(dopTaskCompletions),
	packingConfirmations: many(packingConfirmations),
	rebookTokens: many(rebookTokens),
	guestEventProfiles: many(guestEventProfile),
	clientPreferences: many(clientPreferences),
	eventWasteLogs: many(eventWasteLogs),
	clientReferrals: many(clientReferrals),
	testimonials: many(testimonials),
	mileageLogs: many(mileageLogs),
	eventPhotos: many(eventPhotos),
	menuServiceHistories: many(menuServiceHistory),
	groceryTripSplits: many(groceryTripSplits),
	packingChecklists: many(packingChecklists),
	smartGroceryLists: many(smartGroceryLists),
	sourcingEntries: many(sourcingEntries),
	eventFeedbacks: many(eventFeedback),
	staffSchedules: many(staffSchedules),
	insuranceClaims: many(insuranceClaims),
	subcontractAgreements: many(subcontractAgreements),
	grocerySpendEntries: many(grocerySpendEntries),
	tipRequests: many(tipRequests),
	giftCertificates: many(giftCertificates),
	inquiries: many(inquiries, {
		relationName: "inquiries_convertedToEventId_events_id"
	}),
	chefBackupContact: one(chefBackupContacts, {
		fields: [events.backupContactId],
		references: [chefBackupContacts.id]
	}),
	client: one(clients, {
		fields: [events.clientId],
		references: [clients.id]
	}),
	quote: one(quotes, {
		fields: [events.convertingQuoteId],
		references: [quotes.id],
		relationName: "events_convertingQuoteId_quotes_id"
	}),
	usersInAuth_createdBy: one(usersInAuth, {
		fields: [events.createdBy],
		references: [usersInAuth.id],
		relationName: "events_createdBy_usersInAuth_id"
	}),
	eventSery: one(eventSeries, {
		fields: [events.eventSeriesId],
		references: [eventSeries.id]
	}),
	household: one(households, {
		fields: [events.householdId],
		references: [households.id]
	}),
	inquiry: one(inquiries, {
		fields: [events.inquiryId],
		references: [inquiries.id],
		relationName: "events_inquiryId_inquiries_id"
	}),
	menu: one(menus, {
		fields: [events.menuId],
		references: [menus.id],
		relationName: "events_menuId_menus_id"
	}),
	partnerLocation: one(partnerLocations, {
		fields: [events.partnerLocationId],
		references: [partnerLocations.id]
	}),
	usersInAuth_preEventChecklistConfirmedBy: one(usersInAuth, {
		fields: [events.preEventChecklistConfirmedBy],
		references: [usersInAuth.id],
		relationName: "events_preEventChecklistConfirmedBy_usersInAuth_id"
	}),
	referralPartner: one(referralPartners, {
		fields: [events.referralPartnerId],
		references: [referralPartners.id],
		relationName: "events_referralPartnerId_referralPartners_id"
	}),
	retainer: one(retainers, {
		fields: [events.retainerId],
		references: [retainers.id]
	}),
	retainerPeriod: one(retainerPeriods, {
		fields: [events.retainerPeriodId],
		references: [retainerPeriods.id]
	}),
	eventServiceSession: one(eventServiceSessions, {
		fields: [events.sourceSessionId],
		references: [eventServiceSessions.id],
		relationName: "events_sourceSessionId_eventServiceSessions_id"
	}),
	chef: one(chefs, {
		fields: [events.tenantId],
		references: [chefs.id]
	}),
	usersInAuth_updatedBy: one(usersInAuth, {
		fields: [events.updatedBy],
		references: [usersInAuth.id],
		relationName: "events_updatedBy_usersInAuth_id"
	}),
	eventPaymentMilestones: many(eventPaymentMilestones),
	eventContacts: many(eventContacts),
	kitchenAssessments: many(kitchenAssessments),
	menuRevisions: many(menuRevisions),
	guestCountChanges: many(guestCountChanges),
	paymentMilestones: many(paymentMilestones),
	postEventSurveys: many(postEventSurveys),
	clientSatisfactionSurveys: many(clientSatisfactionSurveys),
	chefDocuments: many(chefDocuments),
	expenses: many(expenses),
	recipeProductionLogs: many(recipeProductionLog),
	chefPreferences: many(chefPreferences),
	eventContentDrafts: many(eventContentDrafts),
	eventCollaborators: many(eventCollaborators),
}));

export const storageLocationsRelations = relations(storageLocations, ({one, many}) => ({
	inventoryAudits: many(inventoryAudits),
	inventoryAuditItems: many(inventoryAuditItems),
	inventoryBatches: many(inventoryBatches),
	inventoryTransactions: many(inventoryTransactions),
	chef: one(chefs, {
		fields: [storageLocations.chefId],
		references: [chefs.id]
	}),
}));

export const inventoryAuditItemsRelations = relations(inventoryAuditItems, ({one}) => ({
	inventoryAudit: one(inventoryAudits, {
		fields: [inventoryAuditItems.auditId],
		references: [inventoryAudits.id]
	}),
	ingredient: one(ingredients, {
		fields: [inventoryAuditItems.ingredientId],
		references: [ingredients.id]
	}),
	storageLocation: one(storageLocations, {
		fields: [inventoryAuditItems.locationId],
		references: [storageLocations.id]
	}),
}));

export const ingredientsRelations = relations(ingredients, ({one, many}) => ({
	inventoryAuditItems: many(inventoryAuditItems),
	inventoryBatches: many(inventoryBatches),
	staffMealItems: many(staffMealItems),
	travelLegIngredients: many(travelLegIngredients),
	vendorPricePoints: many(vendorPricePoints),
	vendorInvoiceItems: many(vendorInvoiceItems),
	groceryPriceQuoteItems: many(groceryPriceQuoteItems),
	inventoryTransactions: many(inventoryTransactions),
	usersInAuth_createdBy: one(usersInAuth, {
		fields: [ingredients.createdBy],
		references: [usersInAuth.id],
		relationName: "ingredients_createdBy_usersInAuth_id"
	}),
	chef: one(chefs, {
		fields: [ingredients.tenantId],
		references: [chefs.id]
	}),
	usersInAuth_updatedBy: one(usersInAuth, {
		fields: [ingredients.updatedBy],
		references: [usersInAuth.id],
		relationName: "ingredients_updatedBy_usersInAuth_id"
	}),
	recipeIngredients: many(recipeIngredients),
	inventoryCounts: many(inventoryCounts),
	pantryItems: many(pantryItems),
	ingredientPriceHistories: many(ingredientPriceHistory),
	vendorPreferredIngredients: many(vendorPreferredIngredients),
}));

export const ingredientSubstitutionsRelations = relations(ingredientSubstitutions, ({one}) => ({
	chef: one(chefs, {
		fields: [ingredientSubstitutions.chefId],
		references: [chefs.id]
	}),
}));

export const inventoryBatchesRelations = relations(inventoryBatches, ({one}) => ({
	chef: one(chefs, {
		fields: [inventoryBatches.chefId],
		references: [chefs.id]
	}),
	ingredient: one(ingredients, {
		fields: [inventoryBatches.ingredientId],
		references: [ingredients.id]
	}),
	storageLocation: one(storageLocations, {
		fields: [inventoryBatches.locationId],
		references: [storageLocations.id]
	}),
	vendor: one(vendors, {
		fields: [inventoryBatches.vendorId],
		references: [vendors.id]
	}),
	vendorInvoice: one(vendorInvoices, {
		fields: [inventoryBatches.vendorInvoiceId],
		references: [vendorInvoices.id]
	}),
}));

export const vendorsRelations = relations(vendors, ({one, many}) => ({
	inventoryBatches: many(inventoryBatches),
	vendorPricePoints: many(vendorPricePoints),
	vendorInvoices: many(vendorInvoices),
	purchaseOrders: many(purchaseOrders),
	vendorItems: many(vendorItems),
	vendorCatalogImportRows: many(vendorCatalogImportRows),
	vendorDocumentUploads: many(vendorDocumentUploads),
	vendorPriceAlertSettings: many(vendorPriceAlertSettings),
	vendorEventAssignments: many(vendorEventAssignments),
	eventVendorDeliveries: many(eventVendorDeliveries),
	inventoryCounts: many(inventoryCounts),
	reorderSettings: many(reorderSettings),
	chef: one(chefs, {
		fields: [vendors.chefId],
		references: [chefs.id]
	}),
	vendorPriceEntries: many(vendorPriceEntries),
	ingredientPriceHistories: many(ingredientPriceHistory),
	vendorPreferredIngredients: many(vendorPreferredIngredients),
}));

export const vendorInvoicesRelations = relations(vendorInvoices, ({one, many}) => ({
	inventoryBatches: many(inventoryBatches),
	chef: one(chefs, {
		fields: [vendorInvoices.chefId],
		references: [chefs.id]
	}),
	vendor: one(vendors, {
		fields: [vendorInvoices.vendorId],
		references: [vendors.id]
	}),
	vendorInvoiceItems: many(vendorInvoiceItems),
	vendorInvoiceLineItems: many(vendorInvoiceLineItems),
	inventoryTransactions: many(inventoryTransactions),
}));

export const staffMealsRelations = relations(staffMeals, ({one, many}) => ({
	chef: one(chefs, {
		fields: [staffMeals.chefId],
		references: [chefs.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [staffMeals.createdBy],
		references: [usersInAuth.id]
	}),
	event: one(events, {
		fields: [staffMeals.eventId],
		references: [events.id]
	}),
	recipe: one(recipes, {
		fields: [staffMeals.recipeId],
		references: [recipes.id]
	}),
	staffMealItems: many(staffMealItems),
}));

export const recipesRelations = relations(recipes, ({one, many}) => ({
	staffMeals: many(staffMeals),
	components: many(components),
	dishIndices: many(dishIndex),
	chefJourneyIdeas: many(chefJourneyIdeas),
	chefJournalRecipeLinks: many(chefJournalRecipeLinks),
	inquiryRecipeLinks: many(inquiryRecipeLinks),
	recipeShares_createdRecipeId: many(recipeShares, {
		relationName: "recipeShares_createdRecipeId_recipes_id"
	}),
	recipeShares_originalRecipeId: many(recipeShares, {
		relationName: "recipeShares_originalRecipeId_recipes_id"
	}),
	recipeSubRecipes_childRecipeId: many(recipeSubRecipes, {
		relationName: "recipeSubRecipes_childRecipeId_recipes_id"
	}),
	recipeSubRecipes_parentRecipeId: many(recipeSubRecipes, {
		relationName: "recipeSubRecipes_parentRecipeId_recipes_id"
	}),
	servedDishHistories: many(servedDishHistory),
	menuNutritions: many(menuNutrition),
	platingGuides: many(platingGuides),
	recipeIngredients: many(recipeIngredients),
	usersInAuth_createdBy: one(usersInAuth, {
		fields: [recipes.createdBy],
		references: [usersInAuth.id],
		relationName: "recipes_createdBy_usersInAuth_id"
	}),
	chef: one(chefs, {
		fields: [recipes.tenantId],
		references: [chefs.id]
	}),
	usersInAuth_updatedBy: one(usersInAuth, {
		fields: [recipes.updatedBy],
		references: [usersInAuth.id],
		relationName: "recipes_updatedBy_usersInAuth_id"
	}),
	recipeNutritions: many(recipeNutrition),
	mealPrepBatchLogs: many(mealPrepBatchLog),
	productProjections: many(productProjections),
	dailySpecials: many(dailySpecials),
	bakeryBatches: many(bakeryBatches),
	tastingMenuCourses: many(tastingMenuCourses),
	recipeStepPhotos: many(recipeStepPhotos),
	menuItems: many(menuItems),
	recipeProductionLogs: many(recipeProductionLog),
}));

export const staffMealItemsRelations = relations(staffMealItems, ({one}) => ({
	ingredient: one(ingredients, {
		fields: [staffMealItems.ingredientId],
		references: [ingredients.id]
	}),
	staffMeal: one(staffMeals, {
		fields: [staffMealItems.staffMealId],
		references: [staffMeals.id]
	}),
}));

export const haccpPlansRelations = relations(haccpPlans, ({one}) => ({
	chef: one(chefs, {
		fields: [haccpPlans.chefId],
		references: [chefs.id]
	}),
}));

export const cannabisHostAgreementsRelations = relations(cannabisHostAgreements, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [cannabisHostAgreements.hostUserId],
		references: [usersInAuth.id]
	}),
}));

export const userRolesRelations = relations(userRoles, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [userRoles.authUserId],
		references: [usersInAuth.id]
	}),
}));

export const clientInvitationsRelations = relations(clientInvitations, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [clientInvitations.createdBy],
		references: [usersInAuth.id]
	}),
	chef: one(chefs, {
		fields: [clientInvitations.tenantId],
		references: [chefs.id]
	}),
}));

export const cannabisControlPacketReconciliationsRelations = relations(cannabisControlPacketReconciliations, ({one, many}) => ({
	event: one(events, {
		fields: [cannabisControlPacketReconciliations.eventId],
		references: [events.id]
	}),
	usersInAuth_finalizedBy: one(usersInAuth, {
		fields: [cannabisControlPacketReconciliations.finalizedBy],
		references: [usersInAuth.id],
		relationName: "cannabisControlPacketReconciliations_finalizedBy_usersInAuth_id"
	}),
	usersInAuth_reconciledBy: one(usersInAuth, {
		fields: [cannabisControlPacketReconciliations.reconciledBy],
		references: [usersInAuth.id],
		relationName: "cannabisControlPacketReconciliations_reconciledBy_usersInAuth_id"
	}),
	cannabisControlPacketSnapshot: one(cannabisControlPacketSnapshots, {
		fields: [cannabisControlPacketReconciliations.snapshotId],
		references: [cannabisControlPacketSnapshots.id]
	}),
	chef: one(chefs, {
		fields: [cannabisControlPacketReconciliations.tenantId],
		references: [chefs.id]
	}),
	cannabisControlPacketEvidences: many(cannabisControlPacketEvidence),
}));

export const cannabisControlPacketSnapshotsRelations = relations(cannabisControlPacketSnapshots, ({one, many}) => ({
	cannabisControlPacketReconciliations: many(cannabisControlPacketReconciliations),
	cannabisControlPacketEvidences: many(cannabisControlPacketEvidence),
	event: one(events, {
		fields: [cannabisControlPacketSnapshots.eventId],
		references: [events.id]
	}),
	usersInAuth_finalizedBy: one(usersInAuth, {
		fields: [cannabisControlPacketSnapshots.finalizedBy],
		references: [usersInAuth.id],
		relationName: "cannabisControlPacketSnapshots_finalizedBy_usersInAuth_id"
	}),
	usersInAuth_generatedBy: one(usersInAuth, {
		fields: [cannabisControlPacketSnapshots.generatedBy],
		references: [usersInAuth.id],
		relationName: "cannabisControlPacketSnapshots_generatedBy_usersInAuth_id"
	}),
	chef: one(chefs, {
		fields: [cannabisControlPacketSnapshots.tenantId],
		references: [chefs.id]
	}),
}));

export const cannabisControlPacketEvidenceRelations = relations(cannabisControlPacketEvidence, ({one}) => ({
	event: one(events, {
		fields: [cannabisControlPacketEvidence.eventId],
		references: [events.id]
	}),
	cannabisControlPacketReconciliation: one(cannabisControlPacketReconciliations, {
		fields: [cannabisControlPacketEvidence.reconciliationId],
		references: [cannabisControlPacketReconciliations.id]
	}),
	cannabisControlPacketSnapshot: one(cannabisControlPacketSnapshots, {
		fields: [cannabisControlPacketEvidence.snapshotId],
		references: [cannabisControlPacketSnapshots.id]
	}),
	chef: one(chefs, {
		fields: [cannabisControlPacketEvidence.tenantId],
		references: [chefs.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [cannabisControlPacketEvidence.uploadedBy],
		references: [usersInAuth.id]
	}),
}));

export const eventCannabisSettingsRelations = relations(eventCannabisSettings, ({one}) => ({
	event: one(events, {
		fields: [eventCannabisSettings.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [eventCannabisSettings.tenantId],
		references: [chefs.id]
	}),
}));

export const auditLogRelations = relations(auditLog, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [auditLog.changedBy],
		references: [usersInAuth.id]
	}),
	chef: one(chefs, {
		fields: [auditLog.tenantId],
		references: [chefs.id]
	}),
}));

export const eventCannabisCourseConfigRelations = relations(eventCannabisCourseConfig, ({one}) => ({
	event: one(events, {
		fields: [eventCannabisCourseConfig.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [eventCannabisCourseConfig.tenantId],
		references: [chefs.id]
	}),
}));

export const inquiryStateTransitionsRelations = relations(inquiryStateTransitions, ({one}) => ({
	inquiry: one(inquiries, {
		fields: [inquiryStateTransitions.inquiryId],
		references: [inquiries.id]
	}),
	chef: one(chefs, {
		fields: [inquiryStateTransitions.tenantId],
		references: [chefs.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [inquiryStateTransitions.transitionedBy],
		references: [usersInAuth.id]
	}),
}));

export const inquiriesRelations = relations(inquiries, ({one, many}) => ({
	inquiryStateTransitions: many(inquiryStateTransitions),
	conversations: many(conversations),
	notifications: many(notifications),
	contactSubmissions: many(contactSubmissions),
	wixSubmissions: many(wixSubmissions),
	inquiryNotes: many(inquiryNotes),
	inquiryRecipeLinks: many(inquiryRecipeLinks),
	scheduledCalls: many(scheduledCalls),
	campaignRecipients: many(campaignRecipients),
	aiTaskQueues: many(aiTaskQueue),
	chefReminders: many(chefReminders),
	eventServiceSessions: many(eventServiceSessions),
	hubGroups: many(hubGroups),
	quotes: many(quotes),
	gmailSyncLogs: many(gmailSyncLog),
	gmailHistoricalFindings: many(gmailHistoricalFindings),
	messages: many(messages),
	platformRecords: many(platformRecords),
	platformSnapshots: many(platformSnapshots),
	platformActionLogs: many(platformActionLog),
	platformPayouts: many(platformPayouts),
	prospects: many(prospects),
	eventSeries: many(eventSeries),
	clientReferrals: many(clientReferrals),
	event: one(events, {
		fields: [inquiries.convertedToEventId],
		references: [events.id],
		relationName: "inquiries_convertedToEventId_events_id"
	}),
	responseTemplate: one(responseTemplates, {
		fields: [inquiries.autoResponseTemplateId],
		references: [responseTemplates.id]
	}),
	client: one(clients, {
		fields: [inquiries.clientId],
		references: [clients.id]
	}),
	partnerLocation: one(partnerLocations, {
		fields: [inquiries.partnerLocationId],
		references: [partnerLocations.id]
	}),
	referralPartner: one(referralPartners, {
		fields: [inquiries.referralPartnerId],
		references: [referralPartners.id]
	}),
	menu: one(menus, {
		fields: [inquiries.selectedMenuId],
		references: [menus.id]
	}),
	chef: one(chefs, {
		fields: [inquiries.tenantId],
		references: [chefs.id]
	}),
	events: many(events, {
		relationName: "events_inquiryId_inquiries_id"
	}),
	chefDocuments: many(chefDocuments),
}));

export const mutationIdempotencyRelations = relations(mutationIdempotency, ({one}) => ({
	chef: one(chefs, {
		fields: [mutationIdempotency.tenantId],
		references: [chefs.id]
	}),
}));

export const qolMetricEventsRelations = relations(qolMetricEvents, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [qolMetricEvents.actorId],
		references: [usersInAuth.id]
	}),
	chef: one(chefs, {
		fields: [qolMetricEvents.tenantId],
		references: [chefs.id]
	}),
}));

export const eventStateTransitionsRelations = relations(eventStateTransitions, ({one}) => ({
	event: one(events, {
		fields: [eventStateTransitions.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [eventStateTransitions.tenantId],
		references: [chefs.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [eventStateTransitions.transitionedBy],
		references: [usersInAuth.id]
	}),
}));

export const quoteStateTransitionsRelations = relations(quoteStateTransitions, ({one}) => ({
	quote: one(quotes, {
		fields: [quoteStateTransitions.quoteId],
		references: [quotes.id]
	}),
	chef: one(chefs, {
		fields: [quoteStateTransitions.tenantId],
		references: [chefs.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [quoteStateTransitions.transitionedBy],
		references: [usersInAuth.id]
	}),
}));

export const quotesRelations = relations(quotes, ({one, many}) => ({
	quoteStateTransitions: many(quoteStateTransitions),
	proposalViews: many(proposalViews),
	quoteLineItems: many(quoteLineItems),
	proposalTokens: many(proposalTokens),
	quoteAddons: many(quoteAddons),
	client: one(clients, {
		fields: [quotes.clientId],
		references: [clients.id]
	}),
	usersInAuth_createdBy: one(usersInAuth, {
		fields: [quotes.createdBy],
		references: [usersInAuth.id],
		relationName: "quotes_createdBy_usersInAuth_id"
	}),
	event: one(events, {
		fields: [quotes.eventId],
		references: [events.id],
		relationName: "quotes_eventId_events_id"
	}),
	inquiry: one(inquiries, {
		fields: [quotes.inquiryId],
		references: [inquiries.id]
	}),
	quote: one(quotes, {
		fields: [quotes.previousVersionId],
		references: [quotes.id],
		relationName: "quotes_previousVersionId_quotes_id"
	}),
	quotes: many(quotes, {
		relationName: "quotes_previousVersionId_quotes_id"
	}),
	chef: one(chefs, {
		fields: [quotes.tenantId],
		references: [chefs.id]
	}),
	usersInAuth_updatedBy: one(usersInAuth, {
		fields: [quotes.updatedBy],
		references: [usersInAuth.id],
		relationName: "quotes_updatedBy_usersInAuth_id"
	}),
	proposalSections: many(proposalSections),
	events: many(events, {
		relationName: "events_convertingQuoteId_quotes_id"
	}),
	quoteSelectedAddons: many(quoteSelectedAddons),
}));

export const afterActionReviewsRelations = relations(afterActionReviews, ({one}) => ({
	usersInAuth_createdBy: one(usersInAuth, {
		fields: [afterActionReviews.createdBy],
		references: [usersInAuth.id],
		relationName: "afterActionReviews_createdBy_usersInAuth_id"
	}),
	event: one(events, {
		fields: [afterActionReviews.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [afterActionReviews.tenantId],
		references: [chefs.id]
	}),
	usersInAuth_updatedBy: one(usersInAuth, {
		fields: [afterActionReviews.updatedBy],
		references: [usersInAuth.id],
		relationName: "afterActionReviews_updatedBy_usersInAuth_id"
	}),
}));

export const loyaltyTransactionsRelations = relations(loyaltyTransactions, ({one, many}) => ({
	client: one(clients, {
		fields: [loyaltyTransactions.clientId],
		references: [clients.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [loyaltyTransactions.createdBy],
		references: [usersInAuth.id]
	}),
	event: one(events, {
		fields: [loyaltyTransactions.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [loyaltyTransactions.tenantId],
		references: [chefs.id]
	}),
	loyaltyRewardRedemptions: many(loyaltyRewardRedemptions),
}));

export const clientsRelations = relations(clients, ({one, many}) => ({
	loyaltyTransactions: many(loyaltyTransactions),
	chatInsights: many(chatInsights),
	households: many(households),
	clientNotes: many(clientNotes),
	householdMembers: many(householdMembers),
	notifications: many(notifications),
	clientConnections_clientAId: many(clientConnections, {
		relationName: "clientConnections_clientAId_clients_id"
	}),
	clientConnections_clientBId: many(clientConnections, {
		relationName: "clientConnections_clientBId_clients_id"
	}),
	chefFeedbacks: many(chefFeedback),
	wixSubmissions: many(wixSubmissions),
	referralPartners: many(referralPartners),
	activityEvents: many(activityEvents),
	chefActivityLogs: many(chefActivityLog),
	communicationEvents: many(communicationEvents),
	conversationThreads: many(conversationThreads),
	ledgerEntries: many(ledgerEntries),
	goalClientSuggestions: many(goalClientSuggestions),
	clientIncentives_createdByClientId: many(clientIncentives, {
		relationName: "clientIncentives_createdByClientId_clients_id"
	}),
	clientIncentives_targetClientId: many(clientIncentives, {
		relationName: "clientIncentives_targetClientId_clients_id"
	}),
	incentiveRedemptions: many(incentiveRedemptions),
	scheduledCalls: many(scheduledCalls),
	menuApprovalRequests: many(menuApprovalRequests),
	recurringServices: many(recurringServices),
	receiptPhotos: many(receiptPhotos),
	commercePayments: many(commercePayments),
	directOutreachLogs: many(directOutreachLog),
	sequenceEnrollments: many(sequenceEnrollments),
	clientAllergyRecords: many(clientAllergyRecords),
	availabilitySignalNotificationLogs: many(availabilitySignalNotificationLog),
	clientTags: many(clientTags),
	clientQuickRequests: many(clientQuickRequests),
	raffleEntries: many(raffleEntries),
	raffleRounds_mostDedicatedClientId: many(raffleRounds, {
		relationName: "raffleRounds_mostDedicatedClientId_clients_id"
	}),
	raffleRounds_topScorerClientId: many(raffleRounds, {
		relationName: "raffleRounds_topScorerClientId_clients_id"
	}),
	raffleRounds_winnerClientId: many(raffleRounds, {
		relationName: "raffleRounds_winnerClientId_clients_id"
	}),
	loyaltyRewardRedemptions: many(loyaltyRewardRedemptions),
	eventShareInvites: many(eventShareInvites),
	clientPreferencePatterns: many(clientPreferencePatterns),
	clientIntakeResponses: many(clientIntakeResponses),
	clientIntakeShares: many(clientIntakeShares),
	eventJoinRequests: many(eventJoinRequests),
	campaignRecipients: many(campaignRecipients),
	chefPortfolioRemovalRequests: many(chefPortfolioRemovalRequests),
	remyArtifacts: many(remyArtifacts),
	guestLeads: many(guestLeads),
	retainers: many(retainers),
	remyMemories: many(remyMemories),
	clientPhotos: many(clientPhotos),
	dailyPlanDrafts: many(dailyPlanDrafts),
	aiTaskQueues: many(aiTaskQueue),
	chefReminders: many(chefReminders),
	clientMealRequests: many(clientMealRequests),
	eventServiceSessions: many(eventServiceSessions),
	recurringMenuRecommendations: many(recurringMenuRecommendations),
	servedDishHistories: many(servedDishHistory),
	clientWorksheets: many(clientWorksheets),
	betaOnboardingChecklists: many(betaOnboardingChecklist),
	eventShares: many(eventShares),
	clientProposals: many(clientProposals),
	followUpSends: many(followUpSends),
	hubGuestProfiles: many(hubGuestProfiles),
	dietaryConfirmations: many(dietaryConfirmations),
	clientReviews: many(clientReviews),
	eventContracts: many(eventContracts),
	proposalTokens: many(proposalTokens),
	recurringInvoices: many(recurringInvoices),
	recurringInvoiceHistories: many(recurringInvoiceHistory),
	quotes: many(quotes),
	clientOutreachLogs: many(clientOutreachLog),
	referralRequestLogs: many(referralRequestLog),
	mealPrepPrograms: many(mealPrepPrograms),
	containerTransactions: many(containerTransactions),
	clientMealPrepPreferences: many(clientMealPrepPreferences),
	sales: many(sales),
	communicationLogs: many(communicationLog),
	bakeryOrders: many(bakeryOrders),
	messages: many(messages),
	platformRecords: many(platformRecords),
	waitlistEntries: many(waitlistEntries),
	feedbackRequests: many(feedbackRequests),
	rebookTokens: many(rebookTokens),
	eventSeries: many(eventSeries),
	clientPreferences: many(clientPreferences),
	clientKitchenInventories: many(clientKitchenInventory),
	clientReferrals_referredClientId: many(clientReferrals, {
		relationName: "clientReferrals_referredClientId_clients_id"
	}),
	clientReferrals_referrerClientId: many(clientReferrals, {
		relationName: "clientReferrals_referrerClientId_clients_id"
	}),
	recurringSchedules: many(recurringSchedules),
	testimonials: many(testimonials),
	clientNdas: many(clientNdas),
	pantryLocations: many(pantryLocations),
	eventPhotos: many(eventPhotos),
	clientGiftLogs: many(clientGiftLog),
	menuServiceHistories: many(menuServiceHistory),
	groceryTripSplits: many(groceryTripSplits),
	packingChecklists: many(packingChecklists),
	dietaryChangeLogs: many(dietaryChangeLog),
	emailSequenceEnrollments: many(emailSequenceEnrollments),
	eventFeedbacks: many(eventFeedback),
	tipRequests: many(tipRequests),
	clientMergeLogs: many(clientMergeLog),
	inquiries: many(inquiries),
	usersInAuth: one(usersInAuth, {
		fields: [clients.authUserId],
		references: [usersInAuth.id]
	}),
	hubGroup_dinnerCircleGroupId: one(hubGroups, {
		fields: [clients.dinnerCircleGroupId],
		references: [hubGroups.id],
		relationName: "clients_dinnerCircleGroupId_hubGroups_id"
	}),
	client: one(clients, {
		fields: [clients.referredByClientId],
		references: [clients.id],
		relationName: "clients_referredByClientId_clients_id"
	}),
	clients: many(clients, {
		relationName: "clients_referredByClientId_clients_id"
	}),
	hubGroup_referredFromGroupId: one(hubGroups, {
		fields: [clients.referredFromGroupId],
		references: [hubGroups.id],
		relationName: "clients_referredFromGroupId_hubGroups_id"
	}),
	chef: one(chefs, {
		fields: [clients.tenantId],
		references: [chefs.id]
	}),
	events: many(events),
	kitchenAssessments: many(kitchenAssessments),
	menuDishFeedbacks: many(menuDishFeedback),
	postEventSurveys: many(postEventSurveys),
	orderAheadOrders: many(orderAheadOrders),
	mealPrepContainers: many(mealPrepContainers),
	mealPrepDeliveries: many(mealPrepDeliveries),
	clientSatisfactionSurveys: many(clientSatisfactionSurveys),
	chefDocuments: many(chefDocuments),
	clientTasteProfiles: many(clientTasteProfiles),
}));

export const dailyReportsRelations = relations(dailyReports, ({one}) => ({
	chef: one(chefs, {
		fields: [dailyReports.tenantId],
		references: [chefs.id]
	}),
}));

export const dishesRelations = relations(dishes, ({one, many}) => ({
	usersInAuth_createdBy: one(usersInAuth, {
		fields: [dishes.createdBy],
		references: [usersInAuth.id],
		relationName: "dishes_createdBy_usersInAuth_id"
	}),
	menu: one(menus, {
		fields: [dishes.menuId],
		references: [menus.id]
	}),
	chef: one(chefs, {
		fields: [dishes.tenantId],
		references: [chefs.id]
	}),
	usersInAuth_updatedBy: one(usersInAuth, {
		fields: [dishes.updatedBy],
		references: [usersInAuth.id],
		relationName: "dishes_updatedBy_usersInAuth_id"
	}),
	components: many(components),
	menuDishFeedbacks: many(menuDishFeedback),
}));

export const menusRelations = relations(menus, ({one, many}) => ({
	dishes: many(dishes),
	menuStateTransitions: many(menuStateTransitions),
	dishAppearances: many(dishAppearances),
	clientQuickRequests: many(clientQuickRequests),
	menuBeveragePairings: many(menuBeveragePairings),
	proposalTemplates: many(proposalTemplates),
	marketingCampaigns: many(marketingCampaigns),
	usersInAuth_createdBy: one(usersInAuth, {
		fields: [menus.createdBy],
		references: [usersInAuth.id],
		relationName: "menus_createdBy_usersInAuth_id"
	}),
	event: one(events, {
		fields: [menus.eventId],
		references: [events.id],
		relationName: "menus_eventId_events_id"
	}),
	chef: one(chefs, {
		fields: [menus.tenantId],
		references: [chefs.id],
		relationName: "menus_tenantId_chefs_id"
	}),
	usersInAuth_updatedBy: one(usersInAuth, {
		fields: [menus.updatedBy],
		references: [usersInAuth.id],
		relationName: "menus_updatedBy_usersInAuth_id"
	}),
	menuPreferences: many(menuPreferences),
	frontOfHouseMenus: many(frontOfHouseMenus),
	clientProposals: many(clientProposals),
	mealPrepWeeks: many(mealPrepWeeks),
	menuNutritions: many(menuNutrition),
	productProjections: many(productProjections),
	chefs: many(chefs, {
		relationName: "chefs_featuredBookingMenuId_menus_id"
	}),
	recurringSchedules: many(recurringSchedules),
	cookingClasses: many(cookingClasses),
	experiencePackages: many(experiencePackages),
	inquiries: many(inquiries),
	events: many(events, {
		relationName: "events_menuId_menus_id"
	}),
	menuRevisions: many(menuRevisions),
	menuItems: many(menuItems),
}));

export const menuStateTransitionsRelations = relations(menuStateTransitions, ({one}) => ({
	menu: one(menus, {
		fields: [menuStateTransitions.menuId],
		references: [menus.id]
	}),
	chef: one(chefs, {
		fields: [menuStateTransitions.tenantId],
		references: [chefs.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [menuStateTransitions.transitionedBy],
		references: [usersInAuth.id]
	}),
}));

export const componentsRelations = relations(components, ({one, many}) => ({
	usersInAuth_createdBy: one(usersInAuth, {
		fields: [components.createdBy],
		references: [usersInAuth.id],
		relationName: "components_createdBy_usersInAuth_id"
	}),
	dish: one(dishes, {
		fields: [components.dishId],
		references: [dishes.id]
	}),
	recipe: one(recipes, {
		fields: [components.recipeId],
		references: [recipes.id]
	}),
	chef: one(chefs, {
		fields: [components.tenantId],
		references: [chefs.id]
	}),
	usersInAuth_updatedBy: one(usersInAuth, {
		fields: [components.updatedBy],
		references: [usersInAuth.id],
		relationName: "components_updatedBy_usersInAuth_id"
	}),
	menuModifications: many(menuModifications),
	eventLeftoverDetails: many(eventLeftoverDetails),
}));

export const loyaltyRewardsRelations = relations(loyaltyRewards, ({one, many}) => ({
	usersInAuth_createdBy: one(usersInAuth, {
		fields: [loyaltyRewards.createdBy],
		references: [usersInAuth.id],
		relationName: "loyaltyRewards_createdBy_usersInAuth_id"
	}),
	chef: one(chefs, {
		fields: [loyaltyRewards.tenantId],
		references: [chefs.id]
	}),
	usersInAuth_updatedBy: one(usersInAuth, {
		fields: [loyaltyRewards.updatedBy],
		references: [usersInAuth.id],
		relationName: "loyaltyRewards_updatedBy_usersInAuth_id"
	}),
	loyaltyRewardRedemptions: many(loyaltyRewardRedemptions),
}));

export const menuModificationsRelations = relations(menuModifications, ({one}) => ({
	component: one(components, {
		fields: [menuModifications.componentId],
		references: [components.id]
	}),
	event: one(events, {
		fields: [menuModifications.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [menuModifications.tenantId],
		references: [chefs.id]
	}),
}));

export const unusedIngredientsRelations = relations(unusedIngredients, ({one}) => ({
	event_eventId: one(events, {
		fields: [unusedIngredients.eventId],
		references: [events.id],
		relationName: "unusedIngredients_eventId_events_id"
	}),
	chef: one(chefs, {
		fields: [unusedIngredients.tenantId],
		references: [chefs.id]
	}),
	event_transferredToEventId: one(events, {
		fields: [unusedIngredients.transferredToEventId],
		references: [events.id],
		relationName: "unusedIngredients_transferredToEventId_events_id"
	}),
}));

export const shoppingSubstitutionsRelations = relations(shoppingSubstitutions, ({one}) => ({
	event: one(events, {
		fields: [shoppingSubstitutions.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [shoppingSubstitutions.tenantId],
		references: [chefs.id]
	}),
}));

export const seasonalPalettesRelations = relations(seasonalPalettes, ({one}) => ({
	usersInAuth_createdBy: one(usersInAuth, {
		fields: [seasonalPalettes.createdBy],
		references: [usersInAuth.id],
		relationName: "seasonalPalettes_createdBy_usersInAuth_id"
	}),
	chef: one(chefs, {
		fields: [seasonalPalettes.tenantId],
		references: [chefs.id]
	}),
	usersInAuth_updatedBy: one(usersInAuth, {
		fields: [seasonalPalettes.updatedBy],
		references: [usersInAuth.id],
		relationName: "seasonalPalettes_updatedBy_usersInAuth_id"
	}),
}));

export const conversationsRelations = relations(conversations, ({one, many}) => ({
	event: one(events, {
		fields: [conversations.eventId],
		references: [events.id]
	}),
	inquiry: one(inquiries, {
		fields: [conversations.inquiryId],
		references: [inquiries.id]
	}),
	chef: one(chefs, {
		fields: [conversations.tenantId],
		references: [chefs.id]
	}),
	conversationParticipants: many(conversationParticipants),
	chatMessages: many(chatMessages),
	chatInsights: many(chatInsights),
}));

export const conversationParticipantsRelations = relations(conversationParticipants, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [conversationParticipants.authUserId],
		references: [usersInAuth.id]
	}),
	conversation: one(conversations, {
		fields: [conversationParticipants.conversationId],
		references: [conversations.id]
	}),
}));

export const chatMessagesRelations = relations(chatMessages, ({one, many}) => ({
	conversation: one(conversations, {
		fields: [chatMessages.conversationId],
		references: [conversations.id]
	}),
	event: one(events, {
		fields: [chatMessages.referencedEventId],
		references: [events.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [chatMessages.senderId],
		references: [usersInAuth.id]
	}),
	chatInsights: many(chatInsights),
	clientAllergyRecords: many(clientAllergyRecords),
}));

export const chatInsightsRelations = relations(chatInsights, ({one}) => ({
	client: one(clients, {
		fields: [chatInsights.clientId],
		references: [clients.id]
	}),
	conversation: one(conversations, {
		fields: [chatInsights.conversationId],
		references: [conversations.id]
	}),
	chatMessage: one(chatMessages, {
		fields: [chatInsights.messageId],
		references: [chatMessages.id]
	}),
	chef: one(chefs, {
		fields: [chatInsights.tenantId],
		references: [chefs.id]
	}),
}));

export const chefConnectionsRelations = relations(chefConnections, ({one}) => ({
	chef_addresseeId: one(chefs, {
		fields: [chefConnections.addresseeId],
		references: [chefs.id],
		relationName: "chefConnections_addresseeId_chefs_id"
	}),
	chef_requesterId: one(chefs, {
		fields: [chefConnections.requesterId],
		references: [chefs.id],
		relationName: "chefConnections_requesterId_chefs_id"
	}),
}));

export const householdsRelations = relations(households, ({one, many}) => ({
	client: one(clients, {
		fields: [households.primaryClientId],
		references: [clients.id]
	}),
	chef: one(chefs, {
		fields: [households.tenantId],
		references: [chefs.id]
	}),
	householdMembers: many(householdMembers),
	events: many(events),
}));

export const clientNotesRelations = relations(clientNotes, ({one}) => ({
	client: one(clients, {
		fields: [clientNotes.clientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [clientNotes.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [clientNotes.tenantId],
		references: [chefs.id]
	}),
}));

export const householdMembersRelations = relations(householdMembers, ({one}) => ({
	client: one(clients, {
		fields: [householdMembers.clientId],
		references: [clients.id]
	}),
	household: one(households, {
		fields: [householdMembers.householdId],
		references: [households.id]
	}),
}));

export const notificationsRelations = relations(notifications, ({one, many}) => ({
	client: one(clients, {
		fields: [notifications.clientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [notifications.eventId],
		references: [events.id]
	}),
	inquiry: one(inquiries, {
		fields: [notifications.inquiryId],
		references: [inquiries.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [notifications.recipientId],
		references: [usersInAuth.id]
	}),
	chef: one(chefs, {
		fields: [notifications.tenantId],
		references: [chefs.id]
	}),
	notificationDeliveryLogs: many(notificationDeliveryLog),
}));

export const contactSubmissionsRelations = relations(contactSubmissions, ({one}) => ({
	chef: one(chefs, {
		fields: [contactSubmissions.claimedByChefId],
		references: [chefs.id]
	}),
	inquiry: one(inquiries, {
		fields: [contactSubmissions.inquiryId],
		references: [inquiries.id]
	}),
}));

export const clientConnectionsRelations = relations(clientConnections, ({one}) => ({
	client_clientAId: one(clients, {
		fields: [clientConnections.clientAId],
		references: [clients.id],
		relationName: "clientConnections_clientAId_clients_id"
	}),
	client_clientBId: one(clients, {
		fields: [clientConnections.clientBId],
		references: [clients.id],
		relationName: "clientConnections_clientBId_clients_id"
	}),
	chef: one(chefs, {
		fields: [clientConnections.tenantId],
		references: [chefs.id]
	}),
}));

export const chefFeedbackRelations = relations(chefFeedback, ({one}) => ({
	client: one(clients, {
		fields: [chefFeedback.clientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [chefFeedback.eventId],
		references: [events.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [chefFeedback.loggedBy],
		references: [usersInAuth.id]
	}),
	chef: one(chefs, {
		fields: [chefFeedback.tenantId],
		references: [chefs.id]
	}),
}));

export const partnerLocationsRelations = relations(partnerLocations, ({one, many}) => ({
	referralPartner: one(referralPartners, {
		fields: [partnerLocations.partnerId],
		references: [referralPartners.id]
	}),
	chef: one(chefs, {
		fields: [partnerLocations.tenantId],
		references: [chefs.id]
	}),
	partnerImages: many(partnerImages),
	inquiries: many(inquiries),
	events: many(events),
}));

export const referralPartnersRelations = relations(referralPartners, ({one, many}) => ({
	partnerLocations: many(partnerLocations),
	partnerImages: many(partnerImages),
	usersInAuth: one(usersInAuth, {
		fields: [referralPartners.authUserId],
		references: [usersInAuth.id]
	}),
	client: one(clients, {
		fields: [referralPartners.originClientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [referralPartners.originEventId],
		references: [events.id],
		relationName: "referralPartners_originEventId_events_id"
	}),
	chef: one(chefs, {
		fields: [referralPartners.tenantId],
		references: [chefs.id]
	}),
	inquiries: many(inquiries),
	events: many(events, {
		relationName: "events_referralPartnerId_referralPartners_id"
	}),
}));

export const partnerImagesRelations = relations(partnerImages, ({one}) => ({
	partnerLocation: one(partnerLocations, {
		fields: [partnerImages.locationId],
		references: [partnerLocations.id]
	}),
	referralPartner: one(referralPartners, {
		fields: [partnerImages.partnerId],
		references: [referralPartners.id]
	}),
	chef: one(chefs, {
		fields: [partnerImages.tenantId],
		references: [chefs.id]
	}),
}));

export const wixConnectionsRelations = relations(wixConnections, ({one}) => ({
	chef_chefId: one(chefs, {
		fields: [wixConnections.chefId],
		references: [chefs.id],
		relationName: "wixConnections_chefId_chefs_id"
	}),
	chef_tenantId: one(chefs, {
		fields: [wixConnections.tenantId],
		references: [chefs.id],
		relationName: "wixConnections_tenantId_chefs_id"
	}),
}));

export const wixSubmissionsRelations = relations(wixSubmissions, ({one}) => ({
	client: one(clients, {
		fields: [wixSubmissions.clientId],
		references: [clients.id]
	}),
	gmailSyncLog: one(gmailSyncLog, {
		fields: [wixSubmissions.gmailDuplicateOf],
		references: [gmailSyncLog.id]
	}),
	inquiry: one(inquiries, {
		fields: [wixSubmissions.inquiryId],
		references: [inquiries.id]
	}),
	chef: one(chefs, {
		fields: [wixSubmissions.tenantId],
		references: [chefs.id]
	}),
}));

export const gmailSyncLogRelations = relations(gmailSyncLog, ({one, many}) => ({
	wixSubmissions: many(wixSubmissions),
	inquiry: one(inquiries, {
		fields: [gmailSyncLog.inquiryId],
		references: [inquiries.id]
	}),
	googleMailbox: one(googleMailboxes, {
		fields: [gmailSyncLog.mailboxId],
		references: [googleMailboxes.id]
	}),
	message: one(messages, {
		fields: [gmailSyncLog.messageId],
		references: [messages.id]
	}),
	chef: one(chefs, {
		fields: [gmailSyncLog.tenantId],
		references: [chefs.id]
	}),
}));

export const menuUploadJobsRelations = relations(menuUploadJobs, ({one, many}) => ({
	chef: one(chefs, {
		fields: [menuUploadJobs.tenantId],
		references: [chefs.id]
	}),
	dishAppearances: many(dishAppearances),
}));

export const dishIndexRelations = relations(dishIndex, ({one, many}) => ({
	recipe: one(recipes, {
		fields: [dishIndex.linkedRecipeId],
		references: [recipes.id]
	}),
	chef: one(chefs, {
		fields: [dishIndex.tenantId],
		references: [chefs.id]
	}),
	dishAppearances: many(dishAppearances),
	dishVariations_parentDishId: many(dishVariations, {
		relationName: "dishVariations_parentDishId_dishIndex_id"
	}),
	dishVariations_variantDishId: many(dishVariations, {
		relationName: "dishVariations_variantDishId_dishIndex_id"
	}),
	dishFeedbacks: many(dishFeedback),
}));

export const dishAppearancesRelations = relations(dishAppearances, ({one}) => ({
	dishIndex: one(dishIndex, {
		fields: [dishAppearances.dishId],
		references: [dishIndex.id]
	}),
	event: one(events, {
		fields: [dishAppearances.eventId],
		references: [events.id]
	}),
	menu: one(menus, {
		fields: [dishAppearances.menuId],
		references: [menus.id]
	}),
	menuUploadJob: one(menuUploadJobs, {
		fields: [dishAppearances.menuUploadJobId],
		references: [menuUploadJobs.id]
	}),
	chef: one(chefs, {
		fields: [dishAppearances.tenantId],
		references: [chefs.id]
	}),
}));

export const dishVariationsRelations = relations(dishVariations, ({one}) => ({
	dishIndex_parentDishId: one(dishIndex, {
		fields: [dishVariations.parentDishId],
		references: [dishIndex.id],
		relationName: "dishVariations_parentDishId_dishIndex_id"
	}),
	chef: one(chefs, {
		fields: [dishVariations.tenantId],
		references: [chefs.id]
	}),
	dishIndex_variantDishId: one(dishIndex, {
		fields: [dishVariations.variantDishId],
		references: [dishIndex.id],
		relationName: "dishVariations_variantDishId_dishIndex_id"
	}),
}));

export const activityEventsRelations = relations(activityEvents, ({one}) => ({
	client: one(clients, {
		fields: [activityEvents.clientId],
		references: [clients.id]
	}),
	chef: one(chefs, {
		fields: [activityEvents.tenantId],
		references: [chefs.id]
	}),
}));

export const chefActivityLogRelations = relations(chefActivityLog, ({one}) => ({
	client: one(clients, {
		fields: [chefActivityLog.clientId],
		references: [clients.id]
	}),
	chef: one(chefs, {
		fields: [chefActivityLog.tenantId],
		references: [chefs.id]
	}),
}));

export const dishFeedbackRelations = relations(dishFeedback, ({one}) => ({
	dishIndex: one(dishIndex, {
		fields: [dishFeedback.dishId],
		references: [dishIndex.id]
	}),
	event: one(events, {
		fields: [dishFeedback.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [dishFeedback.tenantId],
		references: [chefs.id]
	}),
}));

export const automationExecutionsRelations = relations(automationExecutions, ({one}) => ({
	automationRule: one(automationRules, {
		fields: [automationExecutions.ruleId],
		references: [automationRules.id]
	}),
	chef: one(chefs, {
		fields: [automationExecutions.tenantId],
		references: [chefs.id]
	}),
}));

export const automationRulesRelations = relations(automationRules, ({one, many}) => ({
	automationExecutions: many(automationExecutions),
	chef: one(chefs, {
		fields: [automationRules.tenantId],
		references: [chefs.id]
	}),
}));

export const communicationEventsRelations = relations(communicationEvents, ({one, many}) => ({
	client: one(clients, {
		fields: [communicationEvents.resolvedClientId],
		references: [clients.id]
	}),
	chef: one(chefs, {
		fields: [communicationEvents.tenantId],
		references: [chefs.id]
	}),
	conversationThread: one(conversationThreads, {
		fields: [communicationEvents.threadId],
		references: [conversationThreads.id]
	}),
	suggestedLinks: many(suggestedLinks),
	communicationActionLogs: many(communicationActionLog),
}));

export const conversationThreadsRelations = relations(conversationThreads, ({one, many}) => ({
	communicationEvents: many(communicationEvents),
	client: one(clients, {
		fields: [conversationThreads.clientId],
		references: [clients.id]
	}),
	chef: one(chefs, {
		fields: [conversationThreads.tenantId],
		references: [chefs.id]
	}),
	followUpTimers: many(followUpTimers),
	communicationActionLogs: many(communicationActionLog),
	messages: many(messages),
	conversationThreadReads: many(conversationThreadReads),
}));

export const suggestedLinksRelations = relations(suggestedLinks, ({one}) => ({
	communicationEvent: one(communicationEvents, {
		fields: [suggestedLinks.communicationEventId],
		references: [communicationEvents.id]
	}),
	chef: one(chefs, {
		fields: [suggestedLinks.tenantId],
		references: [chefs.id]
	}),
}));

export const followUpTimersRelations = relations(followUpTimers, ({one}) => ({
	chef: one(chefs, {
		fields: [followUpTimers.tenantId],
		references: [chefs.id]
	}),
	conversationThread: one(conversationThreads, {
		fields: [followUpTimers.threadId],
		references: [conversationThreads.id]
	}),
}));

export const communicationClassificationRulesRelations = relations(communicationClassificationRules, ({one}) => ({
	chef: one(chefs, {
		fields: [communicationClassificationRules.tenantId],
		references: [chefs.id]
	}),
}));

export const communicationActionLogRelations = relations(communicationActionLog, ({one}) => ({
	communicationEvent: one(communicationEvents, {
		fields: [communicationActionLog.communicationEventId],
		references: [communicationEvents.id]
	}),
	chef: one(chefs, {
		fields: [communicationActionLog.tenantId],
		references: [chefs.id]
	}),
	conversationThread: one(conversationThreads, {
		fields: [communicationActionLog.threadId],
		references: [conversationThreads.id]
	}),
}));

export const devicesRelations = relations(devices, ({one, many}) => ({
	chef: one(chefs, {
		fields: [devices.tenantId],
		references: [chefs.id]
	}),
	deviceSessions: many(deviceSessions),
	deviceEvents: many(deviceEvents),
}));

export const deviceSessionsRelations = relations(deviceSessions, ({one}) => ({
	device: one(devices, {
		fields: [deviceSessions.deviceId],
		references: [devices.id]
	}),
	staffMember: one(staffMembers, {
		fields: [deviceSessions.staffMemberId],
		references: [staffMembers.id]
	}),
}));

export const staffMembersRelations = relations(staffMembers, ({one, many}) => ({
	deviceSessions: many(deviceSessions),
	deviceEvents: many(deviceEvents),
	eventStaffAssignments: many(eventStaffAssignments),
	contractorPayments: many(contractorPayments),
	staffPerformanceScores: many(staffPerformanceScores),
	employees: many(employees),
	staffOnboardingItems: many(staffOnboardingItems),
	contractorServiceAgreements: many(contractorServiceAgreements),
	tasks_assignedTo: many(tasks, {
		relationName: "tasks_assignedTo_staffMembers_id"
	}),
	tasks_completedBy: many(tasks, {
		relationName: "tasks_completedBy_staffMembers_id"
	}),
	taskCompletionLogs: many(taskCompletionLog),
	clipboardEntries: many(clipboardEntries),
	shiftLogs: many(shiftLogs),
	orderRequests: many(orderRequests),
	wasteLogs: many(wasteLog),
	opsLogs: many(opsLog),
	guestComps_createdBy: many(guestComps, {
		relationName: "guestComps_createdBy_staffMembers_id"
	}),
	guestComps_redeemedBy: many(guestComps, {
		relationName: "guestComps_redeemedBy_staffMembers_id"
	}),
	guestVisits: many(guestVisits),
	eventStationAssignments: many(eventStationAssignments),
	usersInAuth: one(usersInAuth, {
		fields: [staffMembers.authUserId],
		references: [usersInAuth.id]
	}),
	chef: one(chefs, {
		fields: [staffMembers.chefId],
		references: [chefs.id]
	}),
	businessLocation: one(businessLocations, {
		fields: [staffMembers.locationId],
		references: [businessLocations.id]
	}),
	staffClockEntries: many(staffClockEntries),
	sopCompletions: many(sopCompletions),
	tipEntries: many(tipEntries),
	tipDistributions: many(tipDistributions),
	scheduledShifts: many(scheduledShifts),
	shiftSwapRequests_coveringStaffId: many(shiftSwapRequests, {
		relationName: "shiftSwapRequests_coveringStaffId_staffMembers_id"
	}),
	shiftSwapRequests_requestingStaffId: many(shiftSwapRequests, {
		relationName: "shiftSwapRequests_requestingStaffId_staffMembers_id"
	}),
	staffSchedules: many(staffSchedules),
	staffAvailabilities: many(staffAvailability),
}));

export const deviceEventsRelations = relations(deviceEvents, ({one}) => ({
	device: one(devices, {
		fields: [deviceEvents.deviceId],
		references: [devices.id]
	}),
	staffMember: one(staffMembers, {
		fields: [deviceEvents.staffMemberId],
		references: [staffMembers.id]
	}),
	chef: one(chefs, {
		fields: [deviceEvents.tenantId],
		references: [chefs.id]
	}),
}));

export const copilotRunsRelations = relations(copilotRuns, ({one, many}) => ({
	chef: one(chefs, {
		fields: [copilotRuns.tenantId],
		references: [chefs.id]
	}),
	copilotRecommendations: many(copilotRecommendations),
	copilotActions: many(copilotActions),
	copilotRunErrors: many(copilotRunErrors),
}));

export const copilotRecommendationsRelations = relations(copilotRecommendations, ({one, many}) => ({
	copilotRun: one(copilotRuns, {
		fields: [copilotRecommendations.runId],
		references: [copilotRuns.id]
	}),
	chef: one(chefs, {
		fields: [copilotRecommendations.tenantId],
		references: [chefs.id]
	}),
	copilotActions: many(copilotActions),
}));

export const copilotActionsRelations = relations(copilotActions, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [copilotActions.actorAuthUserId],
		references: [usersInAuth.id]
	}),
	copilotRecommendation: one(copilotRecommendations, {
		fields: [copilotActions.recommendationId],
		references: [copilotRecommendations.id]
	}),
	copilotRun: one(copilotRuns, {
		fields: [copilotActions.runId],
		references: [copilotRuns.id]
	}),
	chef: one(chefs, {
		fields: [copilotActions.tenantId],
		references: [chefs.id]
	}),
}));

export const copilotRunErrorsRelations = relations(copilotRunErrors, ({one}) => ({
	copilotRun: one(copilotRuns, {
		fields: [copilotRunErrors.runId],
		references: [copilotRuns.id]
	}),
	chef: one(chefs, {
		fields: [copilotRunErrors.tenantId],
		references: [chefs.id]
	}),
}));

export const chefNetworkPostsRelations = relations(chefNetworkPosts, ({one}) => ({
	chef: one(chefs, {
		fields: [chefNetworkPosts.authorChefId],
		references: [chefs.id]
	}),
}));

export const chefNetworkContactSharesRelations = relations(chefNetworkContactShares, ({one}) => ({
	chef_recipientChefId: one(chefs, {
		fields: [chefNetworkContactShares.recipientChefId],
		references: [chefs.id],
		relationName: "chefNetworkContactShares_recipientChefId_chefs_id"
	}),
	chef_senderChefId: one(chefs, {
		fields: [chefNetworkContactShares.senderChefId],
		references: [chefs.id],
		relationName: "chefNetworkContactShares_senderChefId_chefs_id"
	}),
}));

export const chefNetworkFeaturePreferencesRelations = relations(chefNetworkFeaturePreferences, ({one}) => ({
	chef: one(chefs, {
		fields: [chefNetworkFeaturePreferences.chefId],
		references: [chefs.id]
	}),
}));

export const integrationConnectionsRelations = relations(integrationConnections, ({one, many}) => ({
	chef_chefId: one(chefs, {
		fields: [integrationConnections.chefId],
		references: [chefs.id],
		relationName: "integrationConnections_chefId_chefs_id"
	}),
	chef_tenantId: one(chefs, {
		fields: [integrationConnections.tenantId],
		references: [chefs.id],
		relationName: "integrationConnections_tenantId_chefs_id"
	}),
	integrationEvents: many(integrationEvents),
	integrationSyncJobs: many(integrationSyncJobs),
	integrationFieldMappings: many(integrationFieldMappings),
}));

export const integrationEventsRelations = relations(integrationEvents, ({one}) => ({
	integrationConnection: one(integrationConnections, {
		fields: [integrationEvents.connectionId],
		references: [integrationConnections.id]
	}),
	chef: one(chefs, {
		fields: [integrationEvents.tenantId],
		references: [chefs.id]
	}),
}));

export const integrationSyncJobsRelations = relations(integrationSyncJobs, ({one}) => ({
	integrationConnection: one(integrationConnections, {
		fields: [integrationSyncJobs.connectionId],
		references: [integrationConnections.id]
	}),
	chef: one(chefs, {
		fields: [integrationSyncJobs.tenantId],
		references: [chefs.id]
	}),
}));

export const integrationEntityLinksRelations = relations(integrationEntityLinks, ({one}) => ({
	chef: one(chefs, {
		fields: [integrationEntityLinks.tenantId],
		references: [chefs.id]
	}),
}));

export const integrationFieldMappingsRelations = relations(integrationFieldMappings, ({one}) => ({
	integrationConnection: one(integrationConnections, {
		fields: [integrationFieldMappings.connectionId],
		references: [integrationConnections.id]
	}),
	chef: one(chefs, {
		fields: [integrationFieldMappings.tenantId],
		references: [chefs.id]
	}),
}));

export const chefJourneysRelations = relations(chefJourneys, ({one, many}) => ({
	chef: one(chefs, {
		fields: [chefJourneys.tenantId],
		references: [chefs.id]
	}),
	chefJourneyIdeas: many(chefJourneyIdeas),
	chefJourneyEntries: many(chefJourneyEntries),
	chefJournalMedias: many(chefJournalMedia),
	chefJournalRecipeLinks: many(chefJournalRecipeLinks),
}));

export const chefJourneyIdeasRelations = relations(chefJourneyIdeas, ({one}) => ({
	recipe: one(recipes, {
		fields: [chefJourneyIdeas.adoptedRecipeId],
		references: [recipes.id]
	}),
	chefJourney: one(chefJourneys, {
		fields: [chefJourneyIdeas.journeyId],
		references: [chefJourneys.id]
	}),
	chefJourneyEntry: one(chefJourneyEntries, {
		fields: [chefJourneyIdeas.tenantId],
		references: [chefJourneyEntries.id]
	}),
	chef: one(chefs, {
		fields: [chefJourneyIdeas.tenantId],
		references: [chefs.id]
	}),
}));

export const chefJourneyEntriesRelations = relations(chefJourneyEntries, ({one, many}) => ({
	chefJourneyIdeas: many(chefJourneyIdeas),
	chefJourney: one(chefJourneys, {
		fields: [chefJourneyEntries.journeyId],
		references: [chefJourneys.id]
	}),
	chef: one(chefs, {
		fields: [chefJourneyEntries.tenantId],
		references: [chefs.id]
	}),
	chefJournalMedias: many(chefJournalMedia),
	chefJournalRecipeLinks: many(chefJournalRecipeLinks),
}));

export const prospectOutreachLogRelations = relations(prospectOutreachLog, ({one}) => ({
	chef: one(chefs, {
		fields: [prospectOutreachLog.chefId],
		references: [chefs.id]
	}),
	prospect: one(prospects, {
		fields: [prospectOutreachLog.prospectId],
		references: [prospects.id]
	}),
}));

export const prospectsRelations = relations(prospects, ({one, many}) => ({
	prospectOutreachLogs: many(prospectOutreachLog),
	prospectStageHistories: many(prospectStageHistory),
	scheduledCalls: many(scheduledCalls),
	prospectNotes: many(prospectNotes),
	chef: one(chefs, {
		fields: [prospects.chefId],
		references: [chefs.id]
	}),
	inquiry: one(inquiries, {
		fields: [prospects.convertedToInquiryId],
		references: [inquiries.id]
	}),
	prospect: one(prospects, {
		fields: [prospects.lookalikeSourceId],
		references: [prospects.id],
		relationName: "prospects_lookalikeSourceId_prospects_id"
	}),
	prospects: many(prospects, {
		relationName: "prospects_lookalikeSourceId_prospects_id"
	}),
	outreachCampaign: one(outreachCampaigns, {
		fields: [prospects.outreachCampaignId],
		references: [outreachCampaigns.id]
	}),
	prospectScrubSession: one(prospectScrubSessions, {
		fields: [prospects.scrubSessionId],
		references: [prospectScrubSessions.id]
	}),
}));

export const socialQueueSettingsRelations = relations(socialQueueSettings, ({one}) => ({
	chef: one(chefs, {
		fields: [socialQueueSettings.tenantId],
		references: [chefs.id]
	}),
}));

export const incentiveDeliveriesRelations = relations(incentiveDeliveries, ({one}) => ({
	clientIncentive: one(clientIncentives, {
		fields: [incentiveDeliveries.incentiveId],
		references: [clientIncentives.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [incentiveDeliveries.sentByUserId],
		references: [usersInAuth.id]
	}),
	chef: one(chefs, {
		fields: [incentiveDeliveries.tenantId],
		references: [chefs.id]
	}),
}));

export const clientIncentivesRelations = relations(clientIncentives, ({one, many}) => ({
	incentiveDeliveries: many(incentiveDeliveries),
	client_createdByClientId: one(clients, {
		fields: [clientIncentives.createdByClientId],
		references: [clients.id],
		relationName: "clientIncentives_createdByClientId_clients_id"
	}),
	usersInAuth_createdByUserId: one(usersInAuth, {
		fields: [clientIncentives.createdByUserId],
		references: [usersInAuth.id],
		relationName: "clientIncentives_createdByUserId_usersInAuth_id"
	}),
	usersInAuth_purchasedByUserId: one(usersInAuth, {
		fields: [clientIncentives.purchasedByUserId],
		references: [usersInAuth.id],
		relationName: "clientIncentives_purchasedByUserId_usersInAuth_id"
	}),
	client_targetClientId: one(clients, {
		fields: [clientIncentives.targetClientId],
		references: [clients.id],
		relationName: "clientIncentives_targetClientId_clients_id"
	}),
	chef: one(chefs, {
		fields: [clientIncentives.tenantId],
		references: [chefs.id]
	}),
	giftCardPurchaseIntents: many(giftCardPurchaseIntents),
	incentiveRedemptions: many(incentiveRedemptions),
}));

export const chefJournalMediaRelations = relations(chefJournalMedia, ({one}) => ({
	chefJourneyEntry: one(chefJourneyEntries, {
		fields: [chefJournalMedia.entryId],
		references: [chefJourneyEntries.id]
	}),
	chefJourney: one(chefJourneys, {
		fields: [chefJournalMedia.journeyId],
		references: [chefJourneys.id]
	}),
	chef: one(chefs, {
		fields: [chefJournalMedia.tenantId],
		references: [chefs.id]
	}),
}));

export const chefJournalRecipeLinksRelations = relations(chefJournalRecipeLinks, ({one}) => ({
	chefJourneyEntry: one(chefJourneyEntries, {
		fields: [chefJournalRecipeLinks.entryId],
		references: [chefJourneyEntries.id]
	}),
	chefJourney: one(chefJourneys, {
		fields: [chefJournalRecipeLinks.journeyId],
		references: [chefJourneys.id]
	}),
	recipe: one(recipes, {
		fields: [chefJournalRecipeLinks.recipeId],
		references: [recipes.id]
	}),
	chef: one(chefs, {
		fields: [chefJournalRecipeLinks.tenantId],
		references: [chefs.id]
	}),
}));

export const socialMediaAssetsRelations = relations(socialMediaAssets, ({one, many}) => ({
	chef: one(chefs, {
		fields: [socialMediaAssets.tenantId],
		references: [chefs.id]
	}),
	socialPostAssets: many(socialPostAssets),
}));

export const socialPostAssetsRelations = relations(socialPostAssets, ({one}) => ({
	socialMediaAsset: one(socialMediaAssets, {
		fields: [socialPostAssets.assetId],
		references: [socialMediaAssets.id]
	}),
	socialPost: one(socialPosts, {
		fields: [socialPostAssets.postId],
		references: [socialPosts.id]
	}),
	chef: one(chefs, {
		fields: [socialPostAssets.tenantId],
		references: [chefs.id]
	}),
}));

export const socialPostsRelations = relations(socialPosts, ({one, many}) => ({
	socialPostAssets: many(socialPostAssets),
	event: one(events, {
		fields: [socialPosts.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [socialPosts.tenantId],
		references: [chefs.id]
	}),
}));

export const zapierWebhookSubscriptionsRelations = relations(zapierWebhookSubscriptions, ({one, many}) => ({
	chef: one(chefs, {
		fields: [zapierWebhookSubscriptions.tenantId],
		references: [chefs.id]
	}),
	zapierWebhookDeliveries: many(zapierWebhookDeliveries),
}));

export const zapierWebhookDeliveriesRelations = relations(zapierWebhookDeliveries, ({one}) => ({
	zapierWebhookSubscription: one(zapierWebhookSubscriptions, {
		fields: [zapierWebhookDeliveries.subscriptionId],
		references: [zapierWebhookSubscriptions.id]
	}),
}));

export const externalReviewSourcesRelations = relations(externalReviewSources, ({one, many}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [externalReviewSources.createdBy],
		references: [usersInAuth.id]
	}),
	chef: one(chefs, {
		fields: [externalReviewSources.tenantId],
		references: [chefs.id]
	}),
	externalReviews: many(externalReviews),
}));

export const externalReviewsRelations = relations(externalReviews, ({one}) => ({
	externalReviewSource: one(externalReviewSources, {
		fields: [externalReviews.sourceId],
		references: [externalReviewSources.id]
	}),
	chef: one(chefs, {
		fields: [externalReviews.tenantId],
		references: [chefs.id]
	}),
}));

export const ledgerEntriesRelations = relations(ledgerEntries, ({one, many}) => ({
	client: one(clients, {
		fields: [ledgerEntries.clientId],
		references: [clients.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [ledgerEntries.createdBy],
		references: [usersInAuth.id]
	}),
	event: one(events, {
		fields: [ledgerEntries.eventId],
		references: [events.id]
	}),
	ledgerEntry: one(ledgerEntries, {
		fields: [ledgerEntries.refundedEntryId],
		references: [ledgerEntries.id],
		relationName: "ledgerEntries_refundedEntryId_ledgerEntries_id"
	}),
	ledgerEntries: many(ledgerEntries, {
		relationName: "ledgerEntries_refundedEntryId_ledgerEntries_id"
	}),
	chef: one(chefs, {
		fields: [ledgerEntries.tenantId],
		references: [chefs.id]
	}),
	incentiveRedemptions: many(incentiveRedemptions),
	commercePayments: many(commercePayments),
	commerceRefunds: many(commerceRefunds),
	eventPaymentMilestones: many(eventPaymentMilestones),
}));

export const prospectStageHistoryRelations = relations(prospectStageHistory, ({one}) => ({
	chef: one(chefs, {
		fields: [prospectStageHistory.chefId],
		references: [chefs.id]
	}),
	prospect: one(prospects, {
		fields: [prospectStageHistory.prospectId],
		references: [prospects.id]
	}),
}));

export const goalSnapshotsRelations = relations(goalSnapshots, ({one}) => ({
	chefGoal: one(chefGoals, {
		fields: [goalSnapshots.goalId],
		references: [chefGoals.id]
	}),
	chef: one(chefs, {
		fields: [goalSnapshots.tenantId],
		references: [chefs.id]
	}),
}));

export const chefGoalsRelations = relations(chefGoals, ({one, many}) => ({
	goalSnapshots: many(goalSnapshots),
	goalClientSuggestions: many(goalClientSuggestions),
	chef: one(chefs, {
		fields: [chefGoals.tenantId],
		references: [chefs.id]
	}),
	goalCheckIns: many(goalCheckIns),
}));

export const goalClientSuggestionsRelations = relations(goalClientSuggestions, ({one}) => ({
	event: one(events, {
		fields: [goalClientSuggestions.bookedEventId],
		references: [events.id]
	}),
	client: one(clients, {
		fields: [goalClientSuggestions.clientId],
		references: [clients.id]
	}),
	chefGoal: one(chefGoals, {
		fields: [goalClientSuggestions.goalId],
		references: [chefGoals.id]
	}),
	chef: one(chefs, {
		fields: [goalClientSuggestions.tenantId],
		references: [chefs.id]
	}),
}));

export const giftCardPurchaseIntentsRelations = relations(giftCardPurchaseIntents, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [giftCardPurchaseIntents.buyerUserId],
		references: [usersInAuth.id]
	}),
	clientIncentive: one(clientIncentives, {
		fields: [giftCardPurchaseIntents.createdIncentiveId],
		references: [clientIncentives.id]
	}),
	chef: one(chefs, {
		fields: [giftCardPurchaseIntents.tenantId],
		references: [chefs.id]
	}),
}));

export const incentiveRedemptionsRelations = relations(incentiveRedemptions, ({one}) => ({
	client: one(clients, {
		fields: [incentiveRedemptions.clientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [incentiveRedemptions.eventId],
		references: [events.id]
	}),
	clientIncentive: one(clientIncentives, {
		fields: [incentiveRedemptions.incentiveId],
		references: [clientIncentives.id]
	}),
	ledgerEntry: one(ledgerEntries, {
		fields: [incentiveRedemptions.ledgerEntryId],
		references: [ledgerEntries.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [incentiveRedemptions.redeemedByUserId],
		references: [usersInAuth.id]
	}),
	chef: one(chefs, {
		fields: [incentiveRedemptions.tenantId],
		references: [chefs.id]
	}),
}));

export const inquiryNotesRelations = relations(inquiryNotes, ({one}) => ({
	inquiry: one(inquiries, {
		fields: [inquiryNotes.inquiryId],
		references: [inquiries.id]
	}),
	chef: one(chefs, {
		fields: [inquiryNotes.tenantId],
		references: [chefs.id]
	}),
}));

export const inquiryRecipeLinksRelations = relations(inquiryRecipeLinks, ({one}) => ({
	inquiry: one(inquiries, {
		fields: [inquiryRecipeLinks.inquiryId],
		references: [inquiries.id]
	}),
	recipe: one(recipes, {
		fields: [inquiryRecipeLinks.recipeId],
		references: [recipes.id]
	}),
	chef: one(chefs, {
		fields: [inquiryRecipeLinks.tenantId],
		references: [chefs.id]
	}),
}));

export const chefTodosRelations = relations(chefTodos, ({one}) => ({
	chef: one(chefs, {
		fields: [chefTodos.chefId],
		references: [chefs.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [chefTodos.createdBy],
		references: [usersInAuth.id]
	}),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [notificationPreferences.authUserId],
		references: [usersInAuth.id]
	}),
	chef: one(chefs, {
		fields: [notificationPreferences.tenantId],
		references: [chefs.id]
	}),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [pushSubscriptions.authUserId],
		references: [usersInAuth.id]
	}),
	chef: one(chefs, {
		fields: [pushSubscriptions.tenantId],
		references: [chefs.id]
	}),
}));

export const smsSendLogRelations = relations(smsSendLog, ({one}) => ({
	chef: one(chefs, {
		fields: [smsSendLog.tenantId],
		references: [chefs.id]
	}),
}));

export const notificationDeliveryLogRelations = relations(notificationDeliveryLog, ({one}) => ({
	notification: one(notifications, {
		fields: [notificationDeliveryLog.notificationId],
		references: [notifications.id]
	}),
	chef: one(chefs, {
		fields: [notificationDeliveryLog.tenantId],
		references: [chefs.id]
	}),
}));

export const scheduledCallsRelations = relations(scheduledCalls, ({one}) => ({
	client: one(clients, {
		fields: [scheduledCalls.clientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [scheduledCalls.eventId],
		references: [events.id]
	}),
	inquiry: one(inquiries, {
		fields: [scheduledCalls.inquiryId],
		references: [inquiries.id]
	}),
	prospect: one(prospects, {
		fields: [scheduledCalls.prospectId],
		references: [prospects.id]
	}),
	chef: one(chefs, {
		fields: [scheduledCalls.tenantId],
		references: [chefs.id]
	}),
}));

export const contractTemplatesRelations = relations(contractTemplates, ({one, many}) => ({
	chef: one(chefs, {
		fields: [contractTemplates.chefId],
		references: [chefs.id]
	}),
	eventContracts: many(eventContracts),
}));

export const menuApprovalRequestsRelations = relations(menuApprovalRequests, ({one}) => ({
	chef: one(chefs, {
		fields: [menuApprovalRequests.chefId],
		references: [chefs.id]
	}),
	client: one(clients, {
		fields: [menuApprovalRequests.clientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [menuApprovalRequests.eventId],
		references: [events.id]
	}),
}));

export const eventStaffAssignmentsRelations = relations(eventStaffAssignments, ({one}) => ({
	chef: one(chefs, {
		fields: [eventStaffAssignments.chefId],
		references: [chefs.id]
	}),
	event: one(events, {
		fields: [eventStaffAssignments.eventId],
		references: [events.id]
	}),
	staffMember: one(staffMembers, {
		fields: [eventStaffAssignments.staffMemberId],
		references: [staffMembers.id]
	}),
}));

export const chefAvailabilityBlocksRelations = relations(chefAvailabilityBlocks, ({one}) => ({
	chef: one(chefs, {
		fields: [chefAvailabilityBlocks.chefId],
		references: [chefs.id]
	}),
	event: one(events, {
		fields: [chefAvailabilityBlocks.eventId],
		references: [events.id]
	}),
}));

export const adminTimeLogsRelations = relations(adminTimeLogs, ({one}) => ({
	chef: one(chefs, {
		fields: [adminTimeLogs.chefId],
		references: [chefs.id]
	}),
	event: one(events, {
		fields: [adminTimeLogs.eventId],
		references: [events.id]
	}),
}));

export const recurringServicesRelations = relations(recurringServices, ({one, many}) => ({
	chef: one(chefs, {
		fields: [recurringServices.chefId],
		references: [chefs.id]
	}),
	client: one(clients, {
		fields: [recurringServices.clientId],
		references: [clients.id]
	}),
	mealPrepPrograms: many(mealPrepPrograms),
}));

export const equipmentRentalsRelations = relations(equipmentRentals, ({one}) => ({
	chef: one(chefs, {
		fields: [equipmentRentals.chefId],
		references: [chefs.id]
	}),
	event: one(events, {
		fields: [equipmentRentals.eventId],
		references: [events.id]
	}),
}));

export const taxSettingsRelations = relations(taxSettings, ({one}) => ({
	chef: one(chefs, {
		fields: [taxSettings.chefId],
		references: [chefs.id]
	}),
}));

export const kitchenRentalsRelations = relations(kitchenRentals, ({one}) => ({
	chef: one(chefs, {
		fields: [kitchenRentals.chefId],
		references: [chefs.id]
	}),
	event: one(events, {
		fields: [kitchenRentals.eventId],
		references: [events.id]
	}),
}));

export const eventTempLogsRelations = relations(eventTempLogs, ({one}) => ({
	chef: one(chefs, {
		fields: [eventTempLogs.chefId],
		references: [chefs.id]
	}),
	event: one(events, {
		fields: [eventTempLogs.eventId],
		references: [events.id]
	}),
}));

export const receiptPhotosRelations = relations(receiptPhotos, ({one, many}) => ({
	client: one(clients, {
		fields: [receiptPhotos.clientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [receiptPhotos.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [receiptPhotos.tenantId],
		references: [chefs.id]
	}),
	receiptExtractions: many(receiptExtractions),
	expenses: many(expenses),
}));

export const receiptExtractionsRelations = relations(receiptExtractions, ({one, many}) => ({
	receiptPhoto: one(receiptPhotos, {
		fields: [receiptExtractions.receiptPhotoId],
		references: [receiptPhotos.id]
	}),
	chef: one(chefs, {
		fields: [receiptExtractions.tenantId],
		references: [chefs.id]
	}),
	receiptLineItems: many(receiptLineItems),
}));

export const saleItemsRelations = relations(saleItems, ({one}) => ({
	productProjection: one(productProjections, {
		fields: [saleItems.productProjectionId],
		references: [productProjections.id]
	}),
	sale: one(sales, {
		fields: [saleItems.saleId],
		references: [sales.id]
	}),
	chef: one(chefs, {
		fields: [saleItems.tenantId],
		references: [chefs.id]
	}),
}));

export const productProjectionsRelations = relations(productProjections, ({one, many}) => ({
	saleItems: many(saleItems),
	menu: one(menus, {
		fields: [productProjections.menuId],
		references: [menus.id]
	}),
	recipe: one(recipes, {
		fields: [productProjections.recipeId],
		references: [recipes.id]
	}),
	station: one(stations, {
		fields: [productProjections.stationId],
		references: [stations.id]
	}),
	chef: one(chefs, {
		fields: [productProjections.tenantId],
		references: [chefs.id]
	}),
	productModifierAssignments: many(productModifierAssignments),
	dailySpecials: many(dailySpecials),
	productPublicMediaLinks: many(productPublicMediaLinks),
}));

export const salesRelations = relations(sales, ({one, many}) => ({
	saleItems: many(saleItems),
	commercePayments: many(commercePayments),
	commerceRefunds: many(commerceRefunds),
	commercePaymentSchedules: many(commercePaymentSchedules),
	orderQueues: many(orderQueue),
	inventoryTransactions: many(inventoryTransactions),
	saleAppliedPromotions: many(saleAppliedPromotions),
	commerceDiningChecks: many(commerceDiningChecks),
	kdsTickets: many(kdsTickets),
	client: one(clients, {
		fields: [sales.clientId],
		references: [clients.id]
	}),
	usersInAuth_createdBy: one(usersInAuth, {
		fields: [sales.createdBy],
		references: [usersInAuth.id],
		relationName: "sales_createdBy_usersInAuth_id"
	}),
	event: one(events, {
		fields: [sales.eventId],
		references: [events.id]
	}),
	businessLocation: one(businessLocations, {
		fields: [sales.locationId],
		references: [businessLocations.id]
	}),
	chef: one(chefs, {
		fields: [sales.tenantId],
		references: [chefs.id]
	}),
	usersInAuth_voidedBy: one(usersInAuth, {
		fields: [sales.voidedBy],
		references: [usersInAuth.id],
		relationName: "sales_voidedBy_usersInAuth_id"
	}),
}));

export const receiptLineItemsRelations = relations(receiptLineItems, ({one}) => ({
	event: one(events, {
		fields: [receiptLineItems.eventId],
		references: [events.id]
	}),
	receiptExtraction: one(receiptExtractions, {
		fields: [receiptLineItems.receiptExtractionId],
		references: [receiptExtractions.id]
	}),
	chef: one(chefs, {
		fields: [receiptLineItems.tenantId],
		references: [chefs.id]
	}),
}));

export const commercePaymentsRelations = relations(commercePayments, ({one, many}) => ({
	client: one(clients, {
		fields: [commercePayments.clientId],
		references: [clients.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [commercePayments.createdBy],
		references: [usersInAuth.id]
	}),
	event: one(events, {
		fields: [commercePayments.eventId],
		references: [events.id]
	}),
	ledgerEntry: one(ledgerEntries, {
		fields: [commercePayments.ledgerEntryId],
		references: [ledgerEntries.id]
	}),
	sale: one(sales, {
		fields: [commercePayments.saleId],
		references: [sales.id]
	}),
	chef: one(chefs, {
		fields: [commercePayments.tenantId],
		references: [chefs.id]
	}),
	commerceRefunds: many(commerceRefunds),
	commercePaymentSchedules: many(commercePaymentSchedules),
	cashDrawerMovements: many(cashDrawerMovements),
}));

export const commerceRefundsRelations = relations(commerceRefunds, ({one, many}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [commerceRefunds.createdBy],
		references: [usersInAuth.id]
	}),
	ledgerEntry: one(ledgerEntries, {
		fields: [commerceRefunds.ledgerEntryId],
		references: [ledgerEntries.id]
	}),
	commercePayment: one(commercePayments, {
		fields: [commerceRefunds.paymentId],
		references: [commercePayments.id]
	}),
	sale: one(sales, {
		fields: [commerceRefunds.saleId],
		references: [sales.id]
	}),
	chef: one(chefs, {
		fields: [commerceRefunds.tenantId],
		references: [chefs.id]
	}),
	cashDrawerMovements: many(cashDrawerMovements),
}));

export const commercePaymentSchedulesRelations = relations(commercePaymentSchedules, ({one}) => ({
	event: one(events, {
		fields: [commercePaymentSchedules.eventId],
		references: [events.id]
	}),
	commercePayment: one(commercePayments, {
		fields: [commercePaymentSchedules.paymentId],
		references: [commercePayments.id]
	}),
	sale: one(sales, {
		fields: [commercePaymentSchedules.saleId],
		references: [sales.id]
	}),
	chef: one(chefs, {
		fields: [commercePaymentSchedules.tenantId],
		references: [chefs.id]
	}),
}));

export const chefEmergencyContactsRelations = relations(chefEmergencyContacts, ({one, many}) => ({
	chef: one(chefs, {
		fields: [chefEmergencyContacts.chefId],
		references: [chefs.id]
	}),
	eventContingencyNotes: many(eventContingencyNotes),
}));

export const eventContingencyNotesRelations = relations(eventContingencyNotes, ({one}) => ({
	chefEmergencyContact: one(chefEmergencyContacts, {
		fields: [eventContingencyNotes.backupContactId],
		references: [chefEmergencyContacts.id]
	}),
	chef: one(chefs, {
		fields: [eventContingencyNotes.chefId],
		references: [chefs.id]
	}),
	event: one(events, {
		fields: [eventContingencyNotes.eventId],
		references: [events.id]
	}),
}));

export const professionalAchievementsRelations = relations(professionalAchievements, ({one}) => ({
	chef: one(chefs, {
		fields: [professionalAchievements.chefId],
		references: [chefs.id]
	}),
}));

export const learningGoalsRelations = relations(learningGoals, ({one}) => ({
	chef: one(chefs, {
		fields: [learningGoals.chefId],
		references: [chefs.id]
	}),
}));

export const registerSessionsRelations = relations(registerSessions, ({one, many}) => ({
	usersInAuth_closedBy: one(usersInAuth, {
		fields: [registerSessions.closedBy],
		references: [usersInAuth.id],
		relationName: "registerSessions_closedBy_usersInAuth_id"
	}),
	usersInAuth_openedBy: one(usersInAuth, {
		fields: [registerSessions.openedBy],
		references: [usersInAuth.id],
		relationName: "registerSessions_openedBy_usersInAuth_id"
	}),
	chef: one(chefs, {
		fields: [registerSessions.tenantId],
		references: [chefs.id]
	}),
	cashDrawerMovements: many(cashDrawerMovements),
	commerceDiningChecks: many(commerceDiningChecks),
}));

export const orderQueueRelations = relations(orderQueue, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [orderQueue.assignedTo],
		references: [usersInAuth.id]
	}),
	sale: one(sales, {
		fields: [orderQueue.saleId],
		references: [sales.id]
	}),
	chef: one(chefs, {
		fields: [orderQueue.tenantId],
		references: [chefs.id]
	}),
}));

export const eventTravelLegsRelations = relations(eventTravelLegs, ({one, many}) => ({
	chef: one(chefs, {
		fields: [eventTravelLegs.chefId],
		references: [chefs.id]
	}),
	event: one(events, {
		fields: [eventTravelLegs.primaryEventId],
		references: [events.id]
	}),
	travelLegIngredients: many(travelLegIngredients),
}));

export const travelLegIngredientsRelations = relations(travelLegIngredients, ({one}) => ({
	event: one(events, {
		fields: [travelLegIngredients.eventId],
		references: [events.id]
	}),
	ingredient: one(ingredients, {
		fields: [travelLegIngredients.ingredientId],
		references: [ingredients.id]
	}),
	eventTravelLeg: one(eventTravelLegs, {
		fields: [travelLegIngredients.legId],
		references: [eventTravelLegs.id]
	}),
}));

export const eventSurveysRelations = relations(eventSurveys, ({one}) => ({
	chef_chefId: one(chefs, {
		fields: [eventSurveys.chefId],
		references: [chefs.id],
		relationName: "eventSurveys_chefId_chefs_id"
	}),
	event: one(events, {
		fields: [eventSurveys.eventId],
		references: [events.id]
	}),
	chef_tenantId: one(chefs, {
		fields: [eventSurveys.tenantId],
		references: [chefs.id],
		relationName: "eventSurveys_tenantId_chefs_id"
	}),
}));

export const vendorPricePointsRelations = relations(vendorPricePoints, ({one}) => ({
	chef: one(chefs, {
		fields: [vendorPricePoints.chefId],
		references: [chefs.id]
	}),
	ingredient: one(ingredients, {
		fields: [vendorPricePoints.ingredientId],
		references: [ingredients.id]
	}),
	vendor: one(vendors, {
		fields: [vendorPricePoints.vendorId],
		references: [vendors.id]
	}),
}));

export const eventPrepBlocksRelations = relations(eventPrepBlocks, ({one}) => ({
	chef: one(chefs, {
		fields: [eventPrepBlocks.chefId],
		references: [chefs.id]
	}),
	event: one(events, {
		fields: [eventPrepBlocks.eventId],
		references: [events.id]
	}),
}));

export const dailyReconciliationReportsRelations = relations(dailyReconciliationReports, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [dailyReconciliationReports.reviewedBy],
		references: [usersInAuth.id]
	}),
	chef: one(chefs, {
		fields: [dailyReconciliationReports.tenantId],
		references: [chefs.id]
	}),
}));

export const settlementRecordsRelations = relations(settlementRecords, ({one}) => ({
	chef: one(chefs, {
		fields: [settlementRecords.tenantId],
		references: [chefs.id]
	}),
}));

export const dailyTaxSummaryRelations = relations(dailyTaxSummary, ({one}) => ({
	chef: one(chefs, {
		fields: [dailyTaxSummary.tenantId],
		references: [chefs.id]
	}),
}));

export const directOutreachLogRelations = relations(directOutreachLog, ({one}) => ({
	chef: one(chefs, {
		fields: [directOutreachLog.chefId],
		references: [chefs.id]
	}),
	client: one(clients, {
		fields: [directOutreachLog.clientId],
		references: [clients.id]
	}),
}));

export const campaignTemplatesRelations = relations(campaignTemplates, ({one}) => ({
	chef: one(chefs, {
		fields: [campaignTemplates.chefId],
		references: [chefs.id]
	}),
}));

export const automatedSequencesRelations = relations(automatedSequences, ({one, many}) => ({
	chef: one(chefs, {
		fields: [automatedSequences.chefId],
		references: [chefs.id]
	}),
	sequenceSteps: many(sequenceSteps),
	sequenceEnrollments: many(sequenceEnrollments),
}));

export const sequenceStepsRelations = relations(sequenceSteps, ({one}) => ({
	automatedSequence: one(automatedSequences, {
		fields: [sequenceSteps.sequenceId],
		references: [automatedSequences.id]
	}),
}));

export const sequenceEnrollmentsRelations = relations(sequenceEnrollments, ({one}) => ({
	chef: one(chefs, {
		fields: [sequenceEnrollments.chefId],
		references: [chefs.id]
	}),
	client: one(clients, {
		fields: [sequenceEnrollments.clientId],
		references: [clients.id]
	}),
	automatedSequence: one(automatedSequences, {
		fields: [sequenceEnrollments.sequenceId],
		references: [automatedSequences.id]
	}),
}));

export const cashDrawerMovementsRelations = relations(cashDrawerMovements, ({one}) => ({
	commercePayment: one(commercePayments, {
		fields: [cashDrawerMovements.commercePaymentId],
		references: [commercePayments.id]
	}),
	commerceRefund: one(commerceRefunds, {
		fields: [cashDrawerMovements.commerceRefundId],
		references: [commerceRefunds.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [cashDrawerMovements.createdBy],
		references: [usersInAuth.id]
	}),
	registerSession: one(registerSessions, {
		fields: [cashDrawerMovements.registerSessionId],
		references: [registerSessions.id]
	}),
	chef: one(chefs, {
		fields: [cashDrawerMovements.tenantId],
		references: [chefs.id]
	}),
}));

export const recipeSharesRelations = relations(recipeShares, ({one}) => ({
	recipe_createdRecipeId: one(recipes, {
		fields: [recipeShares.createdRecipeId],
		references: [recipes.id],
		relationName: "recipeShares_createdRecipeId_recipes_id"
	}),
	chef_fromChefId: one(chefs, {
		fields: [recipeShares.fromChefId],
		references: [chefs.id],
		relationName: "recipeShares_fromChefId_chefs_id"
	}),
	recipe_originalRecipeId: one(recipes, {
		fields: [recipeShares.originalRecipeId],
		references: [recipes.id],
		relationName: "recipeShares_originalRecipeId_recipes_id"
	}),
	chef_toChefId: one(chefs, {
		fields: [recipeShares.toChefId],
		references: [chefs.id],
		relationName: "recipeShares_toChefId_chefs_id"
	}),
}));

export const socialHashtagSetsRelations = relations(socialHashtagSets, ({one}) => ({
	chef: one(chefs, {
		fields: [socialHashtagSets.tenantId],
		references: [chefs.id]
	}),
}));

export const chefProfilesRelations = relations(chefProfiles, ({one}) => ({
	chef_chefId: one(chefs, {
		fields: [chefProfiles.chefId],
		references: [chefs.id],
		relationName: "chefProfiles_chefId_chefs_id"
	}),
	chef_tenantId: one(chefs, {
		fields: [chefProfiles.tenantId],
		references: [chefs.id],
		relationName: "chefProfiles_tenantId_chefs_id"
	}),
}));

export const chefSocialPostsRelations = relations(chefSocialPosts, ({one, many}) => ({
	chefSocialChannel: one(chefSocialChannels, {
		fields: [chefSocialPosts.channelId],
		references: [chefSocialChannels.id]
	}),
	chef: one(chefs, {
		fields: [chefSocialPosts.chefId],
		references: [chefs.id]
	}),
	chefSocialPost: one(chefSocialPosts, {
		fields: [chefSocialPosts.originalPostId],
		references: [chefSocialPosts.id],
		relationName: "chefSocialPosts_originalPostId_chefSocialPosts_id"
	}),
	chefSocialPosts: many(chefSocialPosts, {
		relationName: "chefSocialPosts_originalPostId_chefSocialPosts_id"
	}),
	chefPostReactions: many(chefPostReactions),
	chefPostComments: many(chefPostComments),
	chefPostSaves: many(chefPostSaves),
	chefPostMentions: many(chefPostMentions),
	chefPostHashtags: many(chefPostHashtags),
}));

export const chefSocialChannelsRelations = relations(chefSocialChannels, ({one, many}) => ({
	chefSocialPosts: many(chefSocialPosts),
	chef: one(chefs, {
		fields: [chefSocialChannels.createdByChefId],
		references: [chefs.id]
	}),
	chefChannelMemberships: many(chefChannelMemberships),
}));

export const chefFollowsRelations = relations(chefFollows, ({one}) => ({
	chef_followerChefId: one(chefs, {
		fields: [chefFollows.followerChefId],
		references: [chefs.id],
		relationName: "chefFollows_followerChefId_chefs_id"
	}),
	chef_followingChefId: one(chefs, {
		fields: [chefFollows.followingChefId],
		references: [chefs.id],
		relationName: "chefFollows_followingChefId_chefs_id"
	}),
}));

export const chefPostReactionsRelations = relations(chefPostReactions, ({one}) => ({
	chef: one(chefs, {
		fields: [chefPostReactions.chefId],
		references: [chefs.id]
	}),
	chefSocialPost: one(chefSocialPosts, {
		fields: [chefPostReactions.postId],
		references: [chefSocialPosts.id]
	}),
}));

export const chefPostCommentsRelations = relations(chefPostComments, ({one, many}) => ({
	chef: one(chefs, {
		fields: [chefPostComments.chefId],
		references: [chefs.id]
	}),
	chefPostComment: one(chefPostComments, {
		fields: [chefPostComments.parentCommentId],
		references: [chefPostComments.id],
		relationName: "chefPostComments_parentCommentId_chefPostComments_id"
	}),
	chefPostComments: many(chefPostComments, {
		relationName: "chefPostComments_parentCommentId_chefPostComments_id"
	}),
	chefSocialPost: one(chefSocialPosts, {
		fields: [chefPostComments.postId],
		references: [chefSocialPosts.id]
	}),
	chefCommentReactions: many(chefCommentReactions),
	chefPostMentions: many(chefPostMentions),
}));

export const chefCommentReactionsRelations = relations(chefCommentReactions, ({one}) => ({
	chef: one(chefs, {
		fields: [chefCommentReactions.chefId],
		references: [chefs.id]
	}),
	chefPostComment: one(chefPostComments, {
		fields: [chefCommentReactions.commentId],
		references: [chefPostComments.id]
	}),
}));

export const chefPostSavesRelations = relations(chefPostSaves, ({one}) => ({
	chef: one(chefs, {
		fields: [chefPostSaves.chefId],
		references: [chefs.id]
	}),
	chefSocialPost: one(chefSocialPosts, {
		fields: [chefPostSaves.postId],
		references: [chefSocialPosts.id]
	}),
}));

export const chefChannelMembershipsRelations = relations(chefChannelMemberships, ({one}) => ({
	chefSocialChannel: one(chefSocialChannels, {
		fields: [chefChannelMemberships.channelId],
		references: [chefSocialChannels.id]
	}),
	chef: one(chefs, {
		fields: [chefChannelMemberships.chefId],
		references: [chefs.id]
	}),
}));

export const chefStoriesRelations = relations(chefStories, ({one, many}) => ({
	chef: one(chefs, {
		fields: [chefStories.chefId],
		references: [chefs.id]
	}),
	chefStoryViews: many(chefStoryViews),
	chefStoryReactions: many(chefStoryReactions),
}));

export const chefStoryViewsRelations = relations(chefStoryViews, ({one}) => ({
	chefStory: one(chefStories, {
		fields: [chefStoryViews.storyId],
		references: [chefStories.id]
	}),
	chef: one(chefs, {
		fields: [chefStoryViews.viewerChefId],
		references: [chefs.id]
	}),
}));

export const chefStoryReactionsRelations = relations(chefStoryReactions, ({one}) => ({
	chef: one(chefs, {
		fields: [chefStoryReactions.chefId],
		references: [chefs.id]
	}),
	chefStory: one(chefStories, {
		fields: [chefStoryReactions.storyId],
		references: [chefStories.id]
	}),
}));

export const chefPostMentionsRelations = relations(chefPostMentions, ({one}) => ({
	chefPostComment: one(chefPostComments, {
		fields: [chefPostMentions.commentId],
		references: [chefPostComments.id]
	}),
	chef: one(chefs, {
		fields: [chefPostMentions.mentionedChefId],
		references: [chefs.id]
	}),
	chefSocialPost: one(chefSocialPosts, {
		fields: [chefPostMentions.postId],
		references: [chefSocialPosts.id]
	}),
}));

export const tenantSettingsRelations = relations(tenantSettings, ({one}) => ({
	chef: one(chefs, {
		fields: [tenantSettings.tenantId],
		references: [chefs.id]
	}),
}));

export const clientAllergyRecordsRelations = relations(clientAllergyRecords, ({one}) => ({
	client: one(clients, {
		fields: [clientAllergyRecords.clientId],
		references: [clients.id]
	}),
	chatMessage: one(chatMessages, {
		fields: [clientAllergyRecords.detectedInMessageId],
		references: [chatMessages.id]
	}),
	chef: one(chefs, {
		fields: [clientAllergyRecords.tenantId],
		references: [chefs.id]
	}),
}));

export const chefTeamMembersRelations = relations(chefTeamMembers, ({one}) => ({
	chef_chefId: one(chefs, {
		fields: [chefTeamMembers.chefId],
		references: [chefs.id],
		relationName: "chefTeamMembers_chefId_chefs_id"
	}),
	usersInAuth: one(usersInAuth, {
		fields: [chefTeamMembers.invitedBy],
		references: [usersInAuth.id]
	}),
	chef_memberChefId: one(chefs, {
		fields: [chefTeamMembers.memberChefId],
		references: [chefs.id],
		relationName: "chefTeamMembers_memberChefId_chefs_id"
	}),
	chef_tenantId: one(chefs, {
		fields: [chefTeamMembers.tenantId],
		references: [chefs.id],
		relationName: "chefTeamMembers_tenantId_chefs_id"
	}),
}));

export const chefCalendarEntriesRelations = relations(chefCalendarEntries, ({one, many}) => ({
	chef: one(chefs, {
		fields: [chefCalendarEntries.chefId],
		references: [chefs.id]
	}),
	availabilitySignalNotificationLogs: many(availabilitySignalNotificationLog),
}));

export const availabilitySignalNotificationLogRelations = relations(availabilitySignalNotificationLog, ({one}) => ({
	chefCalendarEntry: one(chefCalendarEntries, {
		fields: [availabilitySignalNotificationLog.calendarEntryId],
		references: [chefCalendarEntries.id]
	}),
	chef: one(chefs, {
		fields: [availabilitySignalNotificationLog.chefId],
		references: [chefs.id]
	}),
	client: one(clients, {
		fields: [availabilitySignalNotificationLog.clientId],
		references: [clients.id]
	}),
}));

export const timeBlocksRelations = relations(timeBlocks, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [timeBlocks.createdBy],
		references: [usersInAuth.id]
	}),
	chef: one(chefs, {
		fields: [timeBlocks.tenantId],
		references: [chefs.id]
	}),
}));

export const socialPlatformCredentialsRelations = relations(socialPlatformCredentials, ({one}) => ({
	chef: one(chefs, {
		fields: [socialPlatformCredentials.tenantId],
		references: [chefs.id]
	}),
}));

export const socialConnectedAccountsRelations = relations(socialConnectedAccounts, ({one}) => ({
	chef: one(chefs, {
		fields: [socialConnectedAccounts.tenantId],
		references: [chefs.id]
	}),
}));

export const socialStatsSnapshotsRelations = relations(socialStatsSnapshots, ({one}) => ({
	chef: one(chefs, {
		fields: [socialStatsSnapshots.chefId],
		references: [chefs.id]
	}),
}));

export const eventContractVersionsRelations = relations(eventContractVersions, ({one}) => ({
	eventContract: one(eventContracts, {
		fields: [eventContractVersions.contractId],
		references: [eventContracts.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [eventContractVersions.createdBy],
		references: [usersInAuth.id]
	}),
	chef: one(chefs, {
		fields: [eventContractVersions.tenantId],
		references: [chefs.id]
	}),
}));

export const eventContractsRelations = relations(eventContracts, ({one, many}) => ({
	eventContractVersions: many(eventContractVersions),
	eventContractSigners: many(eventContractSigners),
	chef: one(chefs, {
		fields: [eventContracts.chefId],
		references: [chefs.id]
	}),
	client: one(clients, {
		fields: [eventContracts.clientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [eventContracts.eventId],
		references: [events.id]
	}),
	proposalToken: one(proposalTokens, {
		fields: [eventContracts.proposalTokenId],
		references: [proposalTokens.id],
		relationName: "eventContracts_proposalTokenId_proposalTokens_id"
	}),
	contractTemplate: one(contractTemplates, {
		fields: [eventContracts.templateId],
		references: [contractTemplates.id]
	}),
	proposalTokens: many(proposalTokens, {
		relationName: "proposalTokens_contractId_eventContracts_id"
	}),
}));

export const eventContractSignersRelations = relations(eventContractSigners, ({one}) => ({
	eventContract: one(eventContracts, {
		fields: [eventContractSigners.contractId],
		references: [eventContracts.id]
	}),
	usersInAuth_createdBy: one(usersInAuth, {
		fields: [eventContractSigners.createdBy],
		references: [usersInAuth.id],
		relationName: "eventContractSigners_createdBy_usersInAuth_id"
	}),
	usersInAuth_signedByAuthUserId: one(usersInAuth, {
		fields: [eventContractSigners.signedByAuthUserId],
		references: [usersInAuth.id],
		relationName: "eventContractSigners_signedByAuthUserId_usersInAuth_id"
	}),
	chef: one(chefs, {
		fields: [eventContractSigners.tenantId],
		references: [chefs.id]
	}),
}));

export const competitorBenchmarksRelations = relations(competitorBenchmarks, ({one}) => ({
	chef: one(chefs, {
		fields: [competitorBenchmarks.chefId],
		references: [chefs.id]
	}),
}));

export const websiteStatsSnapshotsRelations = relations(websiteStatsSnapshots, ({one}) => ({
	chef: one(chefs, {
		fields: [websiteStatsSnapshots.chefId],
		references: [chefs.id]
	}),
}));

export const clientTagsRelations = relations(clientTags, ({one}) => ({
	client: one(clients, {
		fields: [clientTags.clientId],
		references: [clients.id]
	}),
	chef: one(chefs, {
		fields: [clientTags.tenantId],
		references: [chefs.id]
	}),
}));

export const charityHoursRelations = relations(charityHours, ({one}) => ({
	chef: one(chefs, {
		fields: [charityHours.chefId],
		references: [chefs.id]
	}),
}));

export const chefSchedulingRulesRelations = relations(chefSchedulingRules, ({one}) => ({
	chef: one(chefs, {
		fields: [chefSchedulingRules.tenantId],
		references: [chefs.id]
	}),
}));

export const clientSegmentsRelations = relations(clientSegments, ({one}) => ({
	chef: one(chefs, {
		fields: [clientSegments.tenantId],
		references: [chefs.id]
	}),
}));

export const paymentPlanInstallmentsRelations = relations(paymentPlanInstallments, ({one}) => ({
	event: one(events, {
		fields: [paymentPlanInstallments.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [paymentPlanInstallments.tenantId],
		references: [chefs.id]
	}),
}));

export const eventTipsRelations = relations(eventTips, ({one}) => ({
	event: one(events, {
		fields: [eventTips.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [eventTips.tenantId],
		references: [chefs.id]
	}),
}));

export const clientQuickRequestsRelations = relations(clientQuickRequests, ({one}) => ({
	client: one(clients, {
		fields: [clientQuickRequests.clientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [clientQuickRequests.convertedEventId],
		references: [events.id]
	}),
	menu: one(menus, {
		fields: [clientQuickRequests.preferredMenuId],
		references: [menus.id]
	}),
	chef: one(chefs, {
		fields: [clientQuickRequests.tenantId],
		references: [chefs.id]
	}),
}));

export const beveragesRelations = relations(beverages, ({one, many}) => ({
	chef: one(chefs, {
		fields: [beverages.chefId],
		references: [chefs.id]
	}),
	menuBeveragePairings: many(menuBeveragePairings),
}));

export const menuBeveragePairingsRelations = relations(menuBeveragePairings, ({one}) => ({
	beverage: one(beverages, {
		fields: [menuBeveragePairings.beverageId],
		references: [beverages.id]
	}),
	chef: one(chefs, {
		fields: [menuBeveragePairings.chefId],
		references: [chefs.id]
	}),
	menu: one(menus, {
		fields: [menuBeveragePairings.menuId],
		references: [menus.id]
	}),
}));

export const chefApiKeysRelations = relations(chefApiKeys, ({one}) => ({
	chef: one(chefs, {
		fields: [chefApiKeys.tenantId],
		references: [chefs.id]
	}),
}));

export const webhookDeliveriesRelations = relations(webhookDeliveries, ({one}) => ({
	webhookEndpoint: one(webhookEndpoints, {
		fields: [webhookDeliveries.endpointId],
		references: [webhookEndpoints.id]
	}),
}));

export const webhookEndpointsRelations = relations(webhookEndpoints, ({one, many}) => ({
	webhookDeliveries: many(webhookDeliveries),
	chef: one(chefs, {
		fields: [webhookEndpoints.tenantId],
		references: [chefs.id]
	}),
}));

export const documentVersionsRelations = relations(documentVersions, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [documentVersions.createdBy],
		references: [usersInAuth.id]
	}),
	chef: one(chefs, {
		fields: [documentVersions.tenantId],
		references: [chefs.id]
	}),
}));

export const communityTemplatesRelations = relations(communityTemplates, ({one}) => ({
	chef: one(chefs, {
		fields: [communityTemplates.authorTenantId],
		references: [chefs.id]
	}),
}));

export const raffleEntriesRelations = relations(raffleEntries, ({one, many}) => ({
	client: one(clients, {
		fields: [raffleEntries.clientId],
		references: [clients.id]
	}),
	raffleRound: one(raffleRounds, {
		fields: [raffleEntries.roundId],
		references: [raffleRounds.id],
		relationName: "raffleEntries_roundId_raffleRounds_id"
	}),
	chef: one(chefs, {
		fields: [raffleEntries.tenantId],
		references: [chefs.id]
	}),
	raffleRounds_topScorerEntryId: many(raffleRounds, {
		relationName: "raffleRounds_topScorerEntryId_raffleEntries_id"
	}),
	raffleRounds_winnerEntryId: many(raffleRounds, {
		relationName: "raffleRounds_winnerEntryId_raffleEntries_id"
	}),
}));

export const raffleRoundsRelations = relations(raffleRounds, ({one, many}) => ({
	raffleEntries: many(raffleEntries, {
		relationName: "raffleEntries_roundId_raffleRounds_id"
	}),
	usersInAuth: one(usersInAuth, {
		fields: [raffleRounds.createdBy],
		references: [usersInAuth.id]
	}),
	client_mostDedicatedClientId: one(clients, {
		fields: [raffleRounds.mostDedicatedClientId],
		references: [clients.id],
		relationName: "raffleRounds_mostDedicatedClientId_clients_id"
	}),
	chef: one(chefs, {
		fields: [raffleRounds.tenantId],
		references: [chefs.id]
	}),
	client_topScorerClientId: one(clients, {
		fields: [raffleRounds.topScorerClientId],
		references: [clients.id],
		relationName: "raffleRounds_topScorerClientId_clients_id"
	}),
	raffleEntry_topScorerEntryId: one(raffleEntries, {
		fields: [raffleRounds.topScorerEntryId],
		references: [raffleEntries.id],
		relationName: "raffleRounds_topScorerEntryId_raffleEntries_id"
	}),
	client_winnerClientId: one(clients, {
		fields: [raffleRounds.winnerClientId],
		references: [clients.id],
		relationName: "raffleRounds_winnerClientId_clients_id"
	}),
	raffleEntry_winnerEntryId: one(raffleEntries, {
		fields: [raffleRounds.winnerEntryId],
		references: [raffleEntries.id],
		relationName: "raffleRounds_winnerEntryId_raffleEntries_id"
	}),
}));

export const loyaltyConfigRelations = relations(loyaltyConfig, ({one}) => ({
	chef: one(chefs, {
		fields: [loyaltyConfig.tenantId],
		references: [chefs.id]
	}),
}));

export const customFieldDefinitionsRelations = relations(customFieldDefinitions, ({one, many}) => ({
	chef: one(chefs, {
		fields: [customFieldDefinitions.tenantId],
		references: [chefs.id]
	}),
	customFieldValues: many(customFieldValues),
}));

export const customFieldValuesRelations = relations(customFieldValues, ({one}) => ({
	customFieldDefinition: one(customFieldDefinitions, {
		fields: [customFieldValues.fieldDefinitionId],
		references: [customFieldDefinitions.id]
	}),
	chef: one(chefs, {
		fields: [customFieldValues.tenantId],
		references: [chefs.id]
	}),
}));

export const chefEventTypeLabelsRelations = relations(chefEventTypeLabels, ({one}) => ({
	chef: one(chefs, {
		fields: [chefEventTypeLabels.tenantId],
		references: [chefs.id]
	}),
}));

export const loyaltyRewardRedemptionsRelations = relations(loyaltyRewardRedemptions, ({one}) => ({
	client: one(clients, {
		fields: [loyaltyRewardRedemptions.clientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [loyaltyRewardRedemptions.eventId],
		references: [events.id]
	}),
	loyaltyTransaction: one(loyaltyTransactions, {
		fields: [loyaltyRewardRedemptions.loyaltyTransactionId],
		references: [loyaltyTransactions.id]
	}),
	loyaltyReward: one(loyaltyRewards, {
		fields: [loyaltyRewardRedemptions.rewardId],
		references: [loyaltyRewards.id]
	}),
	chef: one(chefs, {
		fields: [loyaltyRewardRedemptions.tenantId],
		references: [chefs.id]
	}),
}));

export const bankConnectionsRelations = relations(bankConnections, ({one, many}) => ({
	chef: one(chefs, {
		fields: [bankConnections.chefId],
		references: [chefs.id]
	}),
	bankTransactions: many(bankTransactions),
}));

export const bankTransactionsRelations = relations(bankTransactions, ({one}) => ({
	bankConnection: one(bankConnections, {
		fields: [bankTransactions.bankConnectionId],
		references: [bankConnections.id]
	}),
	chef: one(chefs, {
		fields: [bankTransactions.chefId],
		references: [chefs.id]
	}),
	expense: one(expenses, {
		fields: [bankTransactions.matchedExpenseId],
		references: [expenses.id]
	}),
}));

export const expensesRelations = relations(expenses, ({one, many}) => ({
	bankTransactions: many(bankTransactions),
	ingredientPriceHistories: many(ingredientPriceHistory),
	usersInAuth_createdBy: one(usersInAuth, {
		fields: [expenses.createdBy],
		references: [usersInAuth.id],
		relationName: "expenses_createdBy_usersInAuth_id"
	}),
	event: one(events, {
		fields: [expenses.eventId],
		references: [events.id]
	}),
	receiptPhoto: one(receiptPhotos, {
		fields: [expenses.receiptPhotoId],
		references: [receiptPhotos.id]
	}),
	chef: one(chefs, {
		fields: [expenses.tenantId],
		references: [chefs.id]
	}),
	usersInAuth_updatedBy: one(usersInAuth, {
		fields: [expenses.updatedBy],
		references: [usersInAuth.id],
		relationName: "expenses_updatedBy_usersInAuth_id"
	}),
}));

export const taxQuarterlyEstimatesRelations = relations(taxQuarterlyEstimates, ({one}) => ({
	chef: one(chefs, {
		fields: [taxQuarterlyEstimates.chefId],
		references: [chefs.id]
	}),
}));

export const contractorPaymentsRelations = relations(contractorPayments, ({one}) => ({
	chef: one(chefs, {
		fields: [contractorPayments.chefId],
		references: [chefs.id]
	}),
	staffMember: one(staffMembers, {
		fields: [contractorPayments.staffMemberId],
		references: [staffMembers.id]
	}),
}));

export const paymentDisputesRelations = relations(paymentDisputes, ({one}) => ({
	chef: one(chefs, {
		fields: [paymentDisputes.chefId],
		references: [chefs.id]
	}),
	event: one(events, {
		fields: [paymentDisputes.eventId],
		references: [events.id]
	}),
}));

export const eventShareInvitesRelations = relations(eventShareInvites, ({one, many}) => ({
	eventGuest: one(eventGuests, {
		fields: [eventShareInvites.consumedByGuestId],
		references: [eventGuests.id]
	}),
	client: one(clients, {
		fields: [eventShareInvites.createdByClientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [eventShareInvites.eventId],
		references: [events.id]
	}),
	eventShare: one(eventShares, {
		fields: [eventShareInvites.eventShareId],
		references: [eventShares.id]
	}),
	chef: one(chefs, {
		fields: [eventShareInvites.tenantId],
		references: [chefs.id]
	}),
	eventJoinRequests: many(eventJoinRequests),
	eventShareInviteEvents: many(eventShareInviteEvents),
}));

export const eventGuestsRelations = relations(eventGuests, ({one, many}) => ({
	eventShareInvites: many(eventShareInvites),
	eventJoinRequests: many(eventJoinRequests),
	eventGuestDietaryItems: many(eventGuestDietaryItems),
	eventGuestRsvpAudits: many(eventGuestRsvpAudit),
	rsvpReminderLogs: many(rsvpReminderLog),
	hubGuestEventHistories: many(hubGuestEventHistory),
	guestTestimonials: many(guestTestimonials),
	guestPhotos: many(guestPhotos),
	guestFeedbacks: many(guestFeedback),
	guestMessages: many(guestMessages),
	guestDayOfReminders: many(guestDayOfReminders),
	guestDietaryConfirmations: many(guestDietaryConfirmations),
	usersInAuth_authUserId: one(usersInAuth, {
		fields: [eventGuests.authUserId],
		references: [usersInAuth.id],
		relationName: "eventGuests_authUserId_usersInAuth_id"
	}),
	event: one(events, {
		fields: [eventGuests.eventId],
		references: [events.id]
	}),
	eventShare: one(eventShares, {
		fields: [eventGuests.eventShareId],
		references: [eventShares.id]
	}),
	usersInAuth_reconciledBy: one(usersInAuth, {
		fields: [eventGuests.reconciledBy],
		references: [usersInAuth.id],
		relationName: "eventGuests_reconciledBy_usersInAuth_id"
	}),
	chef: one(chefs, {
		fields: [eventGuests.tenantId],
		references: [chefs.id]
	}),
}));

export const eventSharesRelations = relations(eventShares, ({one, many}) => ({
	eventShareInvites: many(eventShareInvites),
	eventJoinRequests: many(eventJoinRequests),
	guestLeads: many(guestLeads),
	client: one(clients, {
		fields: [eventShares.createdByClientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [eventShares.eventId],
		references: [events.id]
	}),
	hubGroup: one(hubGroups, {
		fields: [eventShares.hubGroupId],
		references: [hubGroups.id]
	}),
	chef: one(chefs, {
		fields: [eventShares.tenantId],
		references: [chefs.id]
	}),
	eventTheme: one(eventThemes, {
		fields: [eventShares.themeId],
		references: [eventThemes.id]
	}),
	eventGuests: many(eventGuests),
}));

export const staffPerformanceScoresRelations = relations(staffPerformanceScores, ({one}) => ({
	chef: one(chefs, {
		fields: [staffPerformanceScores.chefId],
		references: [chefs.id]
	}),
	staffMember: one(staffMembers, {
		fields: [staffPerformanceScores.staffMemberId],
		references: [staffMembers.id]
	}),
}));

export const wasteLogsRelations = relations(wasteLogs, ({one, many}) => ({
	chef: one(chefs, {
		fields: [wasteLogs.chefId],
		references: [chefs.id]
	}),
	event: one(events, {
		fields: [wasteLogs.eventId],
		references: [events.id]
	}),
	inventoryTransactions: many(inventoryTransactions),
}));

export const vendorInvoiceItemsRelations = relations(vendorInvoiceItems, ({one}) => ({
	ingredient: one(ingredients, {
		fields: [vendorInvoiceItems.matchedIngredientId],
		references: [ingredients.id]
	}),
	vendorInvoice: one(vendorInvoices, {
		fields: [vendorInvoiceItems.vendorInvoiceId],
		references: [vendorInvoices.id]
	}),
}));

export const proposalTemplatesRelations = relations(proposalTemplates, ({one, many}) => ({
	chef: one(chefs, {
		fields: [proposalTemplates.chefId],
		references: [chefs.id]
	}),
	menu: one(menus, {
		fields: [proposalTemplates.defaultMenuId],
		references: [menus.id]
	}),
	clientProposals: many(clientProposals),
}));

export const proposalAddonsRelations = relations(proposalAddons, ({one, many}) => ({
	chef: one(chefs, {
		fields: [proposalAddons.chefId],
		references: [chefs.id]
	}),
	quoteAddons: many(quoteAddons),
	quoteSelectedAddons: many(quoteSelectedAddons),
}));

export const proposalViewsRelations = relations(proposalViews, ({one}) => ({
	quote: one(quotes, {
		fields: [proposalViews.quoteId],
		references: [quotes.id]
	}),
}));

export const smartFieldValuesRelations = relations(smartFieldValues, ({one}) => ({
	chef: one(chefs, {
		fields: [smartFieldValues.chefId],
		references: [chefs.id]
	}),
}));

export const followupRulesRelations = relations(followupRules, ({one, many}) => ({
	chef: one(chefs, {
		fields: [followupRules.chefId],
		references: [chefs.id]
	}),
	followUpSends: many(followUpSends),
}));

export const abTestsRelations = relations(abTests, ({one}) => ({
	marketingCampaign: one(marketingCampaigns, {
		fields: [abTests.campaignId],
		references: [marketingCampaigns.id]
	}),
	chef: one(chefs, {
		fields: [abTests.chefId],
		references: [chefs.id]
	}),
}));

export const marketingCampaignsRelations = relations(marketingCampaigns, ({one, many}) => ({
	abTests: many(abTests),
	chef: one(chefs, {
		fields: [marketingCampaigns.chefId],
		references: [chefs.id]
	}),
	menu: one(menus, {
		fields: [marketingCampaigns.menuId],
		references: [menus.id]
	}),
	campaignRecipients: many(campaignRecipients),
}));

export const contentPerformanceRelations = relations(contentPerformance, ({one}) => ({
	chef: one(chefs, {
		fields: [contentPerformance.chefId],
		references: [chefs.id]
	}),
}));

export const serviceCoursesRelations = relations(serviceCourses, ({one}) => ({
	chef: one(chefs, {
		fields: [serviceCourses.chefId],
		references: [chefs.id]
	}),
	event: one(events, {
		fields: [serviceCourses.eventId],
		references: [events.id]
	}),
}));

export const documentCommentsRelations = relations(documentComments, ({one}) => ({
	chef: one(chefs, {
		fields: [documentComments.chefId],
		references: [chefs.id]
	}),
}));

export const chefDailyBriefingsRelations = relations(chefDailyBriefings, ({one}) => ({
	chef: one(chefs, {
		fields: [chefDailyBriefings.chefId],
		references: [chefs.id]
	}),
}));

export const benchmarkSnapshotsRelations = relations(benchmarkSnapshots, ({one}) => ({
	chef: one(chefs, {
		fields: [benchmarkSnapshots.chefId],
		references: [chefs.id]
	}),
}));

export const demandForecastsRelations = relations(demandForecasts, ({one}) => ({
	chef: one(chefs, {
		fields: [demandForecasts.chefId],
		references: [chefs.id]
	}),
}));

export const portfolioItemsRelations = relations(portfolioItems, ({one}) => ({
	chef: one(chefs, {
		fields: [portfolioItems.chefId],
		references: [chefs.id]
	}),
}));

export const profileHighlightsRelations = relations(profileHighlights, ({one}) => ({
	chef: one(chefs, {
		fields: [profileHighlights.chefId],
		references: [chefs.id]
	}),
}));

export const dietaryConflictAlertsRelations = relations(dietaryConflictAlerts, ({one}) => ({
	chef: one(chefs, {
		fields: [dietaryConflictAlerts.chefId],
		references: [chefs.id]
	}),
	event: one(events, {
		fields: [dietaryConflictAlerts.eventId],
		references: [events.id]
	}),
}));

export const clientPreferencePatternsRelations = relations(clientPreferencePatterns, ({one}) => ({
	chef: one(chefs, {
		fields: [clientPreferencePatterns.chefId],
		references: [chefs.id]
	}),
	client: one(clients, {
		fields: [clientPreferencePatterns.clientId],
		references: [clients.id]
	}),
}));

export const stripeTransfersRelations = relations(stripeTransfers, ({one}) => ({
	event: one(events, {
		fields: [stripeTransfers.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [stripeTransfers.tenantId],
		references: [chefs.id]
	}),
}));

export const platformFeeLedgerRelations = relations(platformFeeLedger, ({one}) => ({
	event: one(events, {
		fields: [platformFeeLedger.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [platformFeeLedger.tenantId],
		references: [chefs.id]
	}),
}));

export const userFeedbackRelations = relations(userFeedback, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [userFeedback.userId],
		references: [usersInAuth.id]
	}),
}));

export const groceryPriceQuotesRelations = relations(groceryPriceQuotes, ({one, many}) => ({
	event: one(events, {
		fields: [groceryPriceQuotes.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [groceryPriceQuotes.tenantId],
		references: [chefs.id]
	}),
	groceryPriceQuoteItems: many(groceryPriceQuoteItems),
}));

export const groceryPriceQuoteItemsRelations = relations(groceryPriceQuoteItems, ({one}) => ({
	ingredient: one(ingredients, {
		fields: [groceryPriceQuoteItems.ingredientId],
		references: [ingredients.id]
	}),
	groceryPriceQuote: one(groceryPriceQuotes, {
		fields: [groceryPriceQuoteItems.quoteId],
		references: [groceryPriceQuotes.id]
	}),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({one, many}) => ({
	chef: one(chefs, {
		fields: [purchaseOrders.chefId],
		references: [chefs.id]
	}),
	vendor: one(vendors, {
		fields: [purchaseOrders.vendorId],
		references: [vendors.id]
	}),
	purchaseOrderItems: many(purchaseOrderItems),
}));

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({one}) => ({
	chef: one(chefs, {
		fields: [purchaseOrderItems.chefId],
		references: [chefs.id]
	}),
	purchaseOrder: one(purchaseOrders, {
		fields: [purchaseOrderItems.poId],
		references: [purchaseOrders.id]
	}),
}));

export const dailyChecklistCustomItemsRelations = relations(dailyChecklistCustomItems, ({one}) => ({
	chef: one(chefs, {
		fields: [dailyChecklistCustomItems.chefId],
		references: [chefs.id]
	}),
}));

export const clientIntakeFormsRelations = relations(clientIntakeForms, ({one, many}) => ({
	chef: one(chefs, {
		fields: [clientIntakeForms.tenantId],
		references: [chefs.id]
	}),
	clientIntakeResponses: many(clientIntakeResponses),
	clientIntakeShares: many(clientIntakeShares),
}));

export const clientIntakeResponsesRelations = relations(clientIntakeResponses, ({one, many}) => ({
	client: one(clients, {
		fields: [clientIntakeResponses.clientId],
		references: [clients.id]
	}),
	clientIntakeForm: one(clientIntakeForms, {
		fields: [clientIntakeResponses.formId],
		references: [clientIntakeForms.id]
	}),
	chef: one(chefs, {
		fields: [clientIntakeResponses.tenantId],
		references: [chefs.id]
	}),
	clientIntakeShares: many(clientIntakeShares),
}));

export const clientIntakeSharesRelations = relations(clientIntakeShares, ({one}) => ({
	client: one(clients, {
		fields: [clientIntakeShares.clientId],
		references: [clients.id]
	}),
	clientIntakeForm: one(clientIntakeForms, {
		fields: [clientIntakeShares.formId],
		references: [clientIntakeForms.id]
	}),
	clientIntakeResponse: one(clientIntakeResponses, {
		fields: [clientIntakeShares.responseId],
		references: [clientIntakeResponses.id]
	}),
	chef: one(chefs, {
		fields: [clientIntakeShares.tenantId],
		references: [chefs.id]
	}),
}));

export const eventJoinRequestsRelations = relations(eventJoinRequests, ({one, many}) => ({
	event: one(events, {
		fields: [eventJoinRequests.eventId],
		references: [events.id]
	}),
	eventShare: one(eventShares, {
		fields: [eventJoinRequests.eventShareId],
		references: [eventShares.id]
	}),
	eventGuest: one(eventGuests, {
		fields: [eventJoinRequests.guestId],
		references: [eventGuests.id]
	}),
	eventShareInvite: one(eventShareInvites, {
		fields: [eventJoinRequests.inviteId],
		references: [eventShareInvites.id]
	}),
	client: one(clients, {
		fields: [eventJoinRequests.resolvedByClientId],
		references: [clients.id]
	}),
	chef: one(chefs, {
		fields: [eventJoinRequests.tenantId],
		references: [chefs.id]
	}),
	guestLeads: many(guestLeads),
}));

export const eventGuestDietaryItemsRelations = relations(eventGuestDietaryItems, ({one}) => ({
	event: one(events, {
		fields: [eventGuestDietaryItems.eventId],
		references: [events.id]
	}),
	eventGuest: one(eventGuests, {
		fields: [eventGuestDietaryItems.guestId],
		references: [eventGuests.id]
	}),
	chef: one(chefs, {
		fields: [eventGuestDietaryItems.tenantId],
		references: [chefs.id]
	}),
}));

export const eventGuestRsvpAuditRelations = relations(eventGuestRsvpAudit, ({one}) => ({
	event: one(events, {
		fields: [eventGuestRsvpAudit.eventId],
		references: [events.id]
	}),
	eventGuest: one(eventGuests, {
		fields: [eventGuestRsvpAudit.guestId],
		references: [eventGuests.id]
	}),
	chef: one(chefs, {
		fields: [eventGuestRsvpAudit.tenantId],
		references: [chefs.id]
	}),
}));

export const eventShareInviteEventsRelations = relations(eventShareInviteEvents, ({one}) => ({
	event: one(events, {
		fields: [eventShareInviteEvents.eventId],
		references: [events.id]
	}),
	eventShareInvite: one(eventShareInvites, {
		fields: [eventShareInviteEvents.inviteId],
		references: [eventShareInvites.id]
	}),
	chef: one(chefs, {
		fields: [eventShareInviteEvents.tenantId],
		references: [chefs.id]
	}),
}));

export const automationExecutionLogRelations = relations(automationExecutionLog, ({one}) => ({
	chef: one(chefs, {
		fields: [automationExecutionLog.tenantId],
		references: [chefs.id]
	}),
}));

export const rsvpReminderLogRelations = relations(rsvpReminderLog, ({one}) => ({
	event: one(events, {
		fields: [rsvpReminderLog.eventId],
		references: [events.id]
	}),
	eventGuest: one(eventGuests, {
		fields: [rsvpReminderLog.guestId],
		references: [eventGuests.id]
	}),
	chef: one(chefs, {
		fields: [rsvpReminderLog.tenantId],
		references: [chefs.id]
	}),
}));

export const deadLetterQueueRelations = relations(deadLetterQueue, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [deadLetterQueue.resolvedBy],
		references: [usersInAuth.id]
	}),
	chef: one(chefs, {
		fields: [deadLetterQueue.tenantId],
		references: [chefs.id]
	}),
}));

export const guestCommunicationLogsRelations = relations(guestCommunicationLogs, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [guestCommunicationLogs.createdByAuthUser],
		references: [usersInAuth.id]
	}),
	event: one(events, {
		fields: [guestCommunicationLogs.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [guestCommunicationLogs.tenantId],
		references: [chefs.id]
	}),
}));

export const jobRetryLogRelations = relations(jobRetryLog, ({one}) => ({
	chef: one(chefs, {
		fields: [jobRetryLog.tenantId],
		references: [chefs.id]
	}),
}));

export const retirementContributionsRelations = relations(retirementContributions, ({one}) => ({
	chef: one(chefs, {
		fields: [retirementContributions.chefId],
		references: [chefs.id]
	}),
}));

export const healthInsurancePremiumsRelations = relations(healthInsurancePremiums, ({one}) => ({
	chef: one(chefs, {
		fields: [healthInsurancePremiums.chefId],
		references: [chefs.id]
	}),
}));

export const equipmentDepreciationSchedulesRelations = relations(equipmentDepreciationSchedules, ({one}) => ({
	chef: one(chefs, {
		fields: [equipmentDepreciationSchedules.chefId],
		references: [chefs.id]
	}),
	equipmentItem: one(equipmentItems, {
		fields: [equipmentDepreciationSchedules.equipmentItemId],
		references: [equipmentItems.id]
	}),
}));

export const equipmentItemsRelations = relations(equipmentItems, ({one, many}) => ({
	equipmentDepreciationSchedules: many(equipmentDepreciationSchedules),
	eventEquipmentAssignments: many(eventEquipmentAssignments),
	chef: one(chefs, {
		fields: [equipmentItems.chefId],
		references: [chefs.id]
	}),
	equipmentMaintenanceLogs: many(equipmentMaintenanceLog),
}));

export const salesTaxSettingsRelations = relations(salesTaxSettings, ({one}) => ({
	chef: one(chefs, {
		fields: [salesTaxSettings.chefId],
		references: [chefs.id]
	}),
}));

export const eventSalesTaxRelations = relations(eventSalesTax, ({one}) => ({
	chef: one(chefs, {
		fields: [eventSalesTax.chefId],
		references: [chefs.id]
	}),
	event: one(events, {
		fields: [eventSalesTax.eventId],
		references: [events.id]
	}),
}));

export const salesTaxRemittancesRelations = relations(salesTaxRemittances, ({one}) => ({
	chef: one(chefs, {
		fields: [salesTaxRemittances.chefId],
		references: [chefs.id]
	}),
}));

export const employeesRelations = relations(employees, ({one, many}) => ({
	chef: one(chefs, {
		fields: [employees.chefId],
		references: [chefs.id]
	}),
	staffMember: one(staffMembers, {
		fields: [employees.staffMemberId],
		references: [staffMembers.id]
	}),
	payrollRecords: many(payrollRecords),
	payrollW2Summaries: many(payrollW2Summaries),
}));

export const payrollRecordsRelations = relations(payrollRecords, ({one}) => ({
	chef: one(chefs, {
		fields: [payrollRecords.chefId],
		references: [chefs.id]
	}),
	employee: one(employees, {
		fields: [payrollRecords.employeeId],
		references: [employees.id]
	}),
}));

export const payroll941SummariesRelations = relations(payroll941Summaries, ({one}) => ({
	chef: one(chefs, {
		fields: [payroll941Summaries.chefId],
		references: [chefs.id]
	}),
}));

export const payrollW2SummariesRelations = relations(payrollW2Summaries, ({one}) => ({
	chef: one(chefs, {
		fields: [payrollW2Summaries.chefId],
		references: [chefs.id]
	}),
	employee: one(employees, {
		fields: [payrollW2Summaries.employeeId],
		references: [employees.id]
	}),
}));

export const chefServiceTypesRelations = relations(chefServiceTypes, ({one}) => ({
	chef: one(chefs, {
		fields: [chefServiceTypes.tenantId],
		references: [chefs.id]
	}),
}));

export const campaignRecipientsRelations = relations(campaignRecipients, ({one}) => ({
	marketingCampaign: one(marketingCampaigns, {
		fields: [campaignRecipients.campaignId],
		references: [marketingCampaigns.id]
	}),
	chef: one(chefs, {
		fields: [campaignRecipients.chefId],
		references: [chefs.id]
	}),
	client: one(clients, {
		fields: [campaignRecipients.clientId],
		references: [clients.id]
	}),
	inquiry: one(inquiries, {
		fields: [campaignRecipients.convertedToInquiryId],
		references: [inquiries.id]
	}),
}));

export const chefNotificationTierOverridesRelations = relations(chefNotificationTierOverrides, ({one}) => ({
	chef: one(chefs, {
		fields: [chefNotificationTierOverrides.chefId],
		references: [chefs.id]
	}),
}));

export const goalCheckInsRelations = relations(goalCheckIns, ({one}) => ({
	chefGoal: one(chefGoals, {
		fields: [goalCheckIns.goalId],
		references: [chefGoals.id]
	}),
	chef: one(chefs, {
		fields: [goalCheckIns.tenantId],
		references: [chefs.id]
	}),
}));

export const chefTaxConfigRelations = relations(chefTaxConfig, ({one}) => ({
	chef: one(chefs, {
		fields: [chefTaxConfig.chefId],
		references: [chefs.id]
	}),
}));

export const simulationRunsRelations = relations(simulationRuns, ({one, many}) => ({
	chef: one(chefs, {
		fields: [simulationRuns.tenantId],
		references: [chefs.id]
	}),
	simulationResults: many(simulationResults),
}));

export const simulationResultsRelations = relations(simulationResults, ({one}) => ({
	simulationRun: one(simulationRuns, {
		fields: [simulationResults.runId],
		references: [simulationRuns.id]
	}),
	chef: one(chefs, {
		fields: [simulationResults.tenantId],
		references: [chefs.id]
	}),
}));

export const hubGuestEventHistoryRelations = relations(hubGuestEventHistory, ({one}) => ({
	eventGuest: one(eventGuests, {
		fields: [hubGuestEventHistory.eventGuestId],
		references: [eventGuests.id]
	}),
	event: one(events, {
		fields: [hubGuestEventHistory.eventId],
		references: [events.id]
	}),
	hubGuestProfile: one(hubGuestProfiles, {
		fields: [hubGuestEventHistory.profileId],
		references: [hubGuestProfiles.id]
	}),
	chef: one(chefs, {
		fields: [hubGuestEventHistory.tenantId],
		references: [chefs.id]
	}),
}));

export const hubGuestProfilesRelations = relations(hubGuestProfiles, ({one, many}) => ({
	hubGuestEventHistories: many(hubGuestEventHistory),
	eventStubs: many(eventStubs),
	hubMessageReactions: many(hubMessageReactions),
	hubMedias: many(hubMedia),
	hubPinnedNotes: many(hubPinnedNotes),
	hubPolls: many(hubPolls),
	hubPollVotes: many(hubPollVotes),
	hubGuestFriends_addresseeId: many(hubGuestFriends, {
		relationName: "hubGuestFriends_addresseeId_hubGuestProfiles_id"
	}),
	hubGuestFriends_requesterId: many(hubGuestFriends, {
		relationName: "hubGuestFriends_requesterId_hubGuestProfiles_id"
	}),
	hubChefRecommendations_fromProfileId: many(hubChefRecommendations, {
		relationName: "hubChefRecommendations_fromProfileId_hubGuestProfiles_id"
	}),
	hubChefRecommendations_toProfileId: many(hubChefRecommendations, {
		relationName: "hubChefRecommendations_toProfileId_hubGuestProfiles_id"
	}),
	hubAvailabilities: many(hubAvailability),
	hubAvailabilityResponses: many(hubAvailabilityResponses),
	hubMessageReads: many(hubMessageReads),
	hubMessages_authorProfileId: many(hubMessages, {
		relationName: "hubMessages_authorProfileId_hubGuestProfiles_id"
	}),
	hubMessages_pinnedByProfileId: many(hubMessages, {
		relationName: "hubMessages_pinnedByProfileId_hubGuestProfiles_id"
	}),
	hubGroupMembers: many(hubGroupMembers),
	hubShareCards: many(hubShareCards),
	hubGroups: many(hubGroups, {
		relationName: "hubGroups_createdByProfileId_hubGuestProfiles_id"
	}),
	usersInAuth: one(usersInAuth, {
		fields: [hubGuestProfiles.authUserId],
		references: [usersInAuth.id]
	}),
	client: one(clients, {
		fields: [hubGuestProfiles.clientId],
		references: [clients.id]
	}),
	hubGroup: one(hubGroups, {
		fields: [hubGuestProfiles.firstGroupId],
		references: [hubGroups.id],
		relationName: "hubGuestProfiles_firstGroupId_hubGroups_id"
	}),
	hubGuestProfile: one(hubGuestProfiles, {
		fields: [hubGuestProfiles.referredByProfileId],
		references: [hubGuestProfiles.id],
		relationName: "hubGuestProfiles_referredByProfileId_hubGuestProfiles_id"
	}),
	hubGuestProfiles: many(hubGuestProfiles, {
		relationName: "hubGuestProfiles_referredByProfileId_hubGuestProfiles_id"
	}),
	openTableConsents_profileId: many(openTableConsents, {
		relationName: "openTableConsents_profileId_hubGuestProfiles_id"
	}),
	openTableConsents_requestedByProfileId: many(openTableConsents, {
		relationName: "openTableConsents_requestedByProfileId_hubGuestProfiles_id"
	}),
	openTableRequests: many(openTableRequests),
}));

export const fineTuningExamplesRelations = relations(fineTuningExamples, ({one}) => ({
	chef: one(chefs, {
		fields: [fineTuningExamples.tenantId],
		references: [chefs.id]
	}),
}));

export const remyAbuseLogRelations = relations(remyAbuseLog, ({one}) => ({
	chef: one(chefs, {
		fields: [remyAbuseLog.tenantId],
		references: [chefs.id]
	}),
}));

export const cannabisTierUsersRelations = relations(cannabisTierUsers, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [cannabisTierUsers.authUserId],
		references: [usersInAuth.id]
	}),
	chef: one(chefs, {
		fields: [cannabisTierUsers.tenantId],
		references: [chefs.id]
	}),
}));

export const cannabisTierInvitationsRelations = relations(cannabisTierInvitations, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [cannabisTierInvitations.invitedByAuthUserId],
		references: [usersInAuth.id]
	}),
}));

export const cannabisEventDetailsRelations = relations(cannabisEventDetails, ({one}) => ({
	event: one(events, {
		fields: [cannabisEventDetails.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [cannabisEventDetails.tenantId],
		references: [chefs.id]
	}),
}));

export const chefIncidentsRelations = relations(chefIncidents, ({one}) => ({
	event: one(events, {
		fields: [chefIncidents.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [chefIncidents.tenantId],
		references: [chefs.id]
	}),
}));

export const chefInsurancePoliciesRelations = relations(chefInsurancePolicies, ({one}) => ({
	chef: one(chefs, {
		fields: [chefInsurancePolicies.tenantId],
		references: [chefs.id]
	}),
}));

export const chefBusinessHealthItemsRelations = relations(chefBusinessHealthItems, ({one}) => ({
	chef: one(chefs, {
		fields: [chefBusinessHealthItems.tenantId],
		references: [chefs.id]
	}),
}));

export const eventSafetyChecklistsRelations = relations(eventSafetyChecklists, ({one}) => ({
	event: one(events, {
		fields: [eventSafetyChecklists.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [eventSafetyChecklists.tenantId],
		references: [chefs.id]
	}),
}));

export const eventAlcoholLogsRelations = relations(eventAlcoholLogs, ({one}) => ({
	event: one(events, {
		fields: [eventAlcoholLogs.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [eventAlcoholLogs.tenantId],
		references: [chefs.id]
	}),
}));

export const chefBackupContactsRelations = relations(chefBackupContacts, ({one, many}) => ({
	chef: one(chefs, {
		fields: [chefBackupContacts.tenantId],
		references: [chefs.id]
	}),
	events: many(events),
}));

export const chefBrandMentionsRelations = relations(chefBrandMentions, ({one}) => ({
	chef: one(chefs, {
		fields: [chefBrandMentions.tenantId],
		references: [chefs.id]
	}),
}));

export const chefCrisisPlansRelations = relations(chefCrisisPlans, ({one}) => ({
	chef: one(chefs, {
		fields: [chefCrisisPlans.tenantId],
		references: [chefs.id]
	}),
}));

export const chefCapabilityInventoryRelations = relations(chefCapabilityInventory, ({one}) => ({
	chef: one(chefs, {
		fields: [chefCapabilityInventory.tenantId],
		references: [chefs.id]
	}),
}));

export const eventStubsRelations = relations(eventStubs, ({one, many}) => ({
	event: one(events, {
		fields: [eventStubs.adoptedEventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [eventStubs.adoptedTenantId],
		references: [chefs.id]
	}),
	hubGuestProfile: one(hubGuestProfiles, {
		fields: [eventStubs.createdByProfileId],
		references: [hubGuestProfiles.id]
	}),
	hubGroup: one(hubGroups, {
		fields: [eventStubs.hubGroupId],
		references: [hubGroups.id],
		relationName: "eventStubs_hubGroupId_hubGroups_id"
	}),
	hubGroups: many(hubGroups, {
		relationName: "hubGroups_eventStubId_eventStubs_id"
	}),
}));

export const hubGroupsRelations = relations(hubGroups, ({one, many}) => ({
	eventStubs: many(eventStubs, {
		relationName: "eventStubs_hubGroupId_hubGroups_id"
	}),
	hubMedias: many(hubMedia),
	hubPinnedNotes: many(hubPinnedNotes),
	hubPolls: many(hubPolls),
	hubAvailabilities: many(hubAvailability),
	hubGroupEvents: many(hubGroupEvents),
	betaOnboardingChecklists: many(betaOnboardingChecklist),
	hubMessages: many(hubMessages),
	hubGroupMembers: many(hubGroupMembers),
	eventShares: many(eventShares),
	hubShareCards: many(hubShareCards),
	hubGuestProfile: one(hubGuestProfiles, {
		fields: [hubGroups.createdByProfileId],
		references: [hubGuestProfiles.id],
		relationName: "hubGroups_createdByProfileId_hubGuestProfiles_id"
	}),
	event: one(events, {
		fields: [hubGroups.eventId],
		references: [events.id]
	}),
	eventStub: one(eventStubs, {
		fields: [hubGroups.eventStubId],
		references: [eventStubs.id],
		relationName: "hubGroups_eventStubId_eventStubs_id"
	}),
	inquiry: one(inquiries, {
		fields: [hubGroups.inquiryId],
		references: [inquiries.id]
	}),
	chef: one(chefs, {
		fields: [hubGroups.tenantId],
		references: [chefs.id]
	}),
	eventTheme: one(eventThemes, {
		fields: [hubGroups.themeId],
		references: [eventThemes.id]
	}),
	hubGuestProfiles: many(hubGuestProfiles, {
		relationName: "hubGuestProfiles_firstGroupId_hubGroups_id"
	}),
	openTableConsents: many(openTableConsents),
	openTableRequests: many(openTableRequests),
	clients_dinnerCircleGroupId: many(clients, {
		relationName: "clients_dinnerCircleGroupId_hubGroups_id"
	}),
	clients_referredFromGroupId: many(clients, {
		relationName: "clients_referredFromGroupId_hubGroups_id"
	}),
}));

export const chefEducationLogRelations = relations(chefEducationLog, ({one}) => ({
	chef: one(chefs, {
		fields: [chefEducationLog.tenantId],
		references: [chefs.id]
	}),
}));

export const chefCreativeProjectsRelations = relations(chefCreativeProjects, ({one}) => ({
	chef: one(chefs, {
		fields: [chefCreativeProjects.tenantId],
		references: [chefs.id]
	}),
}));

export const staffOnboardingItemsRelations = relations(staffOnboardingItems, ({one}) => ({
	staffMember: one(staffMembers, {
		fields: [staffOnboardingItems.staffMemberId],
		references: [staffMembers.id]
	}),
	chef: one(chefs, {
		fields: [staffOnboardingItems.tenantId],
		references: [chefs.id]
	}),
}));

export const contractorServiceAgreementsRelations = relations(contractorServiceAgreements, ({one}) => ({
	staffMember: one(staffMembers, {
		fields: [contractorServiceAgreements.staffMemberId],
		references: [staffMembers.id]
	}),
	chef: one(chefs, {
		fields: [contractorServiceAgreements.tenantId],
		references: [chefs.id]
	}),
}));

export const chefPortfolioRemovalRequestsRelations = relations(chefPortfolioRemovalRequests, ({one}) => ({
	client: one(clients, {
		fields: [chefPortfolioRemovalRequests.clientId],
		references: [clients.id]
	}),
	chef: one(chefs, {
		fields: [chefPortfolioRemovalRequests.tenantId],
		references: [chefs.id]
	}),
}));

export const hubMessageReactionsRelations = relations(hubMessageReactions, ({one}) => ({
	hubMessage: one(hubMessages, {
		fields: [hubMessageReactions.messageId],
		references: [hubMessages.id]
	}),
	hubGuestProfile: one(hubGuestProfiles, {
		fields: [hubMessageReactions.profileId],
		references: [hubGuestProfiles.id]
	}),
}));

export const hubMessagesRelations = relations(hubMessages, ({one, many}) => ({
	hubMessageReactions: many(hubMessageReactions),
	hubPolls: many(hubPolls),
	hubMessageReads: many(hubMessageReads),
	hubGuestProfile_authorProfileId: one(hubGuestProfiles, {
		fields: [hubMessages.authorProfileId],
		references: [hubGuestProfiles.id],
		relationName: "hubMessages_authorProfileId_hubGuestProfiles_id"
	}),
	hubGroup: one(hubGroups, {
		fields: [hubMessages.groupId],
		references: [hubGroups.id]
	}),
	hubGuestProfile_pinnedByProfileId: one(hubGuestProfiles, {
		fields: [hubMessages.pinnedByProfileId],
		references: [hubGuestProfiles.id],
		relationName: "hubMessages_pinnedByProfileId_hubGuestProfiles_id"
	}),
	hubMessage: one(hubMessages, {
		fields: [hubMessages.replyToMessageId],
		references: [hubMessages.id],
		relationName: "hubMessages_replyToMessageId_hubMessages_id"
	}),
	hubMessages: many(hubMessages, {
		relationName: "hubMessages_replyToMessageId_hubMessages_id"
	}),
}));

export const chefGrowthCheckinsRelations = relations(chefGrowthCheckins, ({one}) => ({
	chef: one(chefs, {
		fields: [chefGrowthCheckins.tenantId],
		references: [chefs.id]
	}),
}));

export const chefMomentumSnapshotsRelations = relations(chefMomentumSnapshots, ({one}) => ({
	chef: one(chefs, {
		fields: [chefMomentumSnapshots.tenantId],
		references: [chefs.id]
	}),
}));

export const chefAvailabilityShareTokensRelations = relations(chefAvailabilityShareTokens, ({one}) => ({
	chef: one(chefs, {
		fields: [chefAvailabilityShareTokens.tenantId],
		references: [chefs.id]
	}),
}));

export const guestTestimonialsRelations = relations(guestTestimonials, ({one}) => ({
	event: one(events, {
		fields: [guestTestimonials.eventId],
		references: [events.id]
	}),
	eventGuest: one(eventGuests, {
		fields: [guestTestimonials.guestId],
		references: [eventGuests.id]
	}),
	chef: one(chefs, {
		fields: [guestTestimonials.tenantId],
		references: [chefs.id]
	}),
}));

export const chefAutomationSettingsRelations = relations(chefAutomationSettings, ({one}) => ({
	chef: one(chefs, {
		fields: [chefAutomationSettings.tenantId],
		references: [chefs.id]
	}),
}));

export const remyArtifactsRelations = relations(remyArtifacts, ({one, many}) => ({
	client: one(clients, {
		fields: [remyArtifacts.relatedClientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [remyArtifacts.relatedEventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [remyArtifacts.tenantId],
		references: [chefs.id]
	}),
	remyMemories: many(remyMemories),
}));

export const remyConversationsRelations = relations(remyConversations, ({one, many}) => ({
	chef: one(chefs, {
		fields: [remyConversations.tenantId],
		references: [chefs.id]
	}),
	remyMessages: many(remyMessages),
}));

export const guestLeadsRelations = relations(guestLeads, ({one}) => ({
	client: one(clients, {
		fields: [guestLeads.convertedClientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [guestLeads.eventId],
		references: [events.id]
	}),
	eventShare: one(eventShares, {
		fields: [guestLeads.sourceEventShareId],
		references: [eventShares.id]
	}),
	eventJoinRequest: one(eventJoinRequests, {
		fields: [guestLeads.sourceJoinRequestId],
		references: [eventJoinRequests.id]
	}),
	chef: one(chefs, {
		fields: [guestLeads.tenantId],
		references: [chefs.id]
	}),
}));

export const guestPhotosRelations = relations(guestPhotos, ({one}) => ({
	event: one(events, {
		fields: [guestPhotos.eventId],
		references: [events.id]
	}),
	eventGuest: one(eventGuests, {
		fields: [guestPhotos.guestId],
		references: [eventGuests.id]
	}),
	chef: one(chefs, {
		fields: [guestPhotos.tenantId],
		references: [chefs.id]
	}),
}));

export const retainersRelations = relations(retainers, ({one, many}) => ({
	client: one(clients, {
		fields: [retainers.clientId],
		references: [clients.id]
	}),
	chef: one(chefs, {
		fields: [retainers.tenantId],
		references: [chefs.id]
	}),
	retainerPeriods: many(retainerPeriods),
	events: many(events),
}));

export const retainerPeriodsRelations = relations(retainerPeriods, ({one, many}) => ({
	retainer: one(retainers, {
		fields: [retainerPeriods.retainerId],
		references: [retainers.id]
	}),
	chef: one(chefs, {
		fields: [retainerPeriods.tenantId],
		references: [chefs.id]
	}),
	events: many(events),
}));

export const hubMediaRelations = relations(hubMedia, ({one}) => ({
	event: one(events, {
		fields: [hubMedia.eventId],
		references: [events.id]
	}),
	hubGroup: one(hubGroups, {
		fields: [hubMedia.groupId],
		references: [hubGroups.id]
	}),
	hubGuestProfile: one(hubGuestProfiles, {
		fields: [hubMedia.uploadedByProfileId],
		references: [hubGuestProfiles.id]
	}),
}));

export const hubPinnedNotesRelations = relations(hubPinnedNotes, ({one}) => ({
	hubGuestProfile: one(hubGuestProfiles, {
		fields: [hubPinnedNotes.authorProfileId],
		references: [hubGuestProfiles.id]
	}),
	hubGroup: one(hubGroups, {
		fields: [hubPinnedNotes.groupId],
		references: [hubGroups.id]
	}),
}));

export const remyMessagesRelations = relations(remyMessages, ({one}) => ({
	remyConversation: one(remyConversations, {
		fields: [remyMessages.conversationId],
		references: [remyConversations.id]
	}),
	chef: one(chefs, {
		fields: [remyMessages.tenantId],
		references: [chefs.id]
	}),
}));

export const remyMemoriesRelations = relations(remyMemories, ({one}) => ({
	client: one(clients, {
		fields: [remyMemories.relatedClientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [remyMemories.relatedEventId],
		references: [events.id]
	}),
	remyArtifact: one(remyArtifacts, {
		fields: [remyMemories.sourceArtifactId],
		references: [remyArtifacts.id]
	}),
	chef: one(chefs, {
		fields: [remyMemories.tenantId],
		references: [chefs.id]
	}),
}));

export const hubPollsRelations = relations(hubPolls, ({one, many}) => ({
	hubGuestProfile: one(hubGuestProfiles, {
		fields: [hubPolls.createdByProfileId],
		references: [hubGuestProfiles.id]
	}),
	hubGroup: one(hubGroups, {
		fields: [hubPolls.groupId],
		references: [hubGroups.id]
	}),
	hubMessage: one(hubMessages, {
		fields: [hubPolls.messageId],
		references: [hubMessages.id]
	}),
	hubPollOptions: many(hubPollOptions),
	hubPollVotes: many(hubPollVotes),
}));

export const hubPollOptionsRelations = relations(hubPollOptions, ({one, many}) => ({
	hubPoll: one(hubPolls, {
		fields: [hubPollOptions.pollId],
		references: [hubPolls.id]
	}),
	hubPollVotes: many(hubPollVotes),
}));

export const hubPollVotesRelations = relations(hubPollVotes, ({one}) => ({
	hubPollOption: one(hubPollOptions, {
		fields: [hubPollVotes.optionId],
		references: [hubPollOptions.id]
	}),
	hubPoll: one(hubPolls, {
		fields: [hubPollVotes.pollId],
		references: [hubPolls.id]
	}),
	hubGuestProfile: one(hubGuestProfiles, {
		fields: [hubPollVotes.profileId],
		references: [hubGuestProfiles.id]
	}),
}));

export const prospectScrubSessionsRelations = relations(prospectScrubSessions, ({one, many}) => ({
	chef: one(chefs, {
		fields: [prospectScrubSessions.chefId],
		references: [chefs.id]
	}),
	prospects: many(prospects),
}));

export const clientPhotosRelations = relations(clientPhotos, ({one}) => ({
	client: one(clients, {
		fields: [clientPhotos.clientId],
		references: [clients.id]
	}),
	chef: one(chefs, {
		fields: [clientPhotos.tenantId],
		references: [chefs.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [clientPhotos.uploadedBy],
		references: [usersInAuth.id]
	}),
}));

export const favoriteChefsRelations = relations(favoriteChefs, ({one}) => ({
	chef: one(chefs, {
		fields: [favoriteChefs.chefId],
		references: [chefs.id]
	}),
}));

export const prospectNotesRelations = relations(prospectNotes, ({one}) => ({
	chef: one(chefs, {
		fields: [prospectNotes.chefId],
		references: [chefs.id]
	}),
	prospect: one(prospects, {
		fields: [prospectNotes.prospectId],
		references: [prospects.id]
	}),
}));

export const prospectCallScriptsRelations = relations(prospectCallScripts, ({one}) => ({
	chef: one(chefs, {
		fields: [prospectCallScripts.chefId],
		references: [chefs.id]
	}),
}));

export const dailyPlanDraftsRelations = relations(dailyPlanDrafts, ({one}) => ({
	chef: one(chefs, {
		fields: [dailyPlanDrafts.chefId],
		references: [chefs.id]
	}),
	client: one(clients, {
		fields: [dailyPlanDrafts.recipientClientId],
		references: [clients.id]
	}),
}));

export const dailyPlanDismissalsRelations = relations(dailyPlanDismissals, ({one}) => ({
	chef: one(chefs, {
		fields: [dailyPlanDismissals.chefId],
		references: [chefs.id]
	}),
}));

export const chefCulinaryWordsRelations = relations(chefCulinaryWords, ({one}) => ({
	chef: one(chefs, {
		fields: [chefCulinaryWords.chefId],
		references: [chefs.id]
	}),
}));

export const chefCulinaryProfilesRelations = relations(chefCulinaryProfiles, ({one}) => ({
	chef: one(chefs, {
		fields: [chefCulinaryProfiles.chefId],
		references: [chefs.id]
	}),
}));

export const chefBreadcrumbsRelations = relations(chefBreadcrumbs, ({one}) => ({
	chef: one(chefs, {
		fields: [chefBreadcrumbs.tenantId],
		references: [chefs.id]
	}),
}));

export const aiTaskQueueRelations = relations(aiTaskQueue, ({one}) => ({
	client: one(clients, {
		fields: [aiTaskQueue.relatedClientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [aiTaskQueue.relatedEventId],
		references: [events.id]
	}),
	inquiry: one(inquiries, {
		fields: [aiTaskQueue.relatedInquiryId],
		references: [inquiries.id]
	}),
	chef: one(chefs, {
		fields: [aiTaskQueue.tenantId],
		references: [chefs.id]
	}),
}));

export const chefRemindersRelations = relations(chefReminders, ({one}) => ({
	client: one(clients, {
		fields: [chefReminders.relatedClientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [chefReminders.relatedEventId],
		references: [events.id]
	}),
	inquiry: one(inquiries, {
		fields: [chefReminders.relatedInquiryId],
		references: [inquiries.id]
	}),
	chef: one(chefs, {
		fields: [chefReminders.tenantId],
		references: [chefs.id]
	}),
}));

export const remyUsageMetricsRelations = relations(remyUsageMetrics, ({one}) => ({
	chef: one(chefs, {
		fields: [remyUsageMetrics.tenantId],
		references: [chefs.id]
	}),
}));

export const remySupportSharesRelations = relations(remySupportShares, ({one}) => ({
	chef: one(chefs, {
		fields: [remySupportShares.tenantId],
		references: [chefs.id]
	}),
}));

export const taskTemplatesRelations = relations(taskTemplates, ({one, many}) => ({
	chef: one(chefs, {
		fields: [taskTemplates.chefId],
		references: [chefs.id]
	}),
	tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({one, many}) => ({
	station: one(stations, {
		fields: [tasks.stationId],
		references: [stations.id]
	}),
	staffMember_assignedTo: one(staffMembers, {
		fields: [tasks.assignedTo],
		references: [staffMembers.id],
		relationName: "tasks_assignedTo_staffMembers_id"
	}),
	chef: one(chefs, {
		fields: [tasks.chefId],
		references: [chefs.id]
	}),
	staffMember_completedBy: one(staffMembers, {
		fields: [tasks.completedBy],
		references: [staffMembers.id],
		relationName: "tasks_completedBy_staffMembers_id"
	}),
	taskTemplate: one(taskTemplates, {
		fields: [tasks.templateId],
		references: [taskTemplates.id]
	}),
	taskCompletionLogs: many(taskCompletionLog),
	taskDependencies_dependsOnTaskId: many(taskDependencies, {
		relationName: "taskDependencies_dependsOnTaskId_tasks_id"
	}),
	taskDependencies_taskId: many(taskDependencies, {
		relationName: "taskDependencies_taskId_tasks_id"
	}),
}));

export const stationsRelations = relations(stations, ({one, many}) => ({
	tasks: many(tasks),
	chef: one(chefs, {
		fields: [stations.chefId],
		references: [chefs.id]
	}),
	stationMenuItems: many(stationMenuItems),
	clipboardEntries: many(clipboardEntries),
	shiftLogs: many(shiftLogs),
	orderRequests: many(orderRequests),
	wasteLogs: many(wasteLog),
	opsLogs: many(opsLog),
	prepTimelines: many(prepTimeline),
	eventStationAssignments: many(eventStationAssignments),
	kdsTickets: many(kdsTickets),
	productProjections: many(productProjections),
}));

export const taskCompletionLogRelations = relations(taskCompletionLog, ({one}) => ({
	chef: one(chefs, {
		fields: [taskCompletionLog.chefId],
		references: [chefs.id]
	}),
	staffMember: one(staffMembers, {
		fields: [taskCompletionLog.staffMemberId],
		references: [staffMembers.id]
	}),
	task: one(tasks, {
		fields: [taskCompletionLog.taskId],
		references: [tasks.id]
	}),
}));

export const remyFeedbackRelations = relations(remyFeedback, ({one}) => ({
	chef_chefId: one(chefs, {
		fields: [remyFeedback.chefId],
		references: [chefs.id],
		relationName: "remyFeedback_chefId_chefs_id"
	}),
	chef_tenantId: one(chefs, {
		fields: [remyFeedback.tenantId],
		references: [chefs.id],
		relationName: "remyFeedback_tenantId_chefs_id"
	}),
}));

export const stationMenuItemsRelations = relations(stationMenuItems, ({one, many}) => ({
	chef: one(chefs, {
		fields: [stationMenuItems.chefId],
		references: [chefs.id]
	}),
	station: one(stations, {
		fields: [stationMenuItems.stationId],
		references: [stations.id]
	}),
	stationComponents: many(stationComponents),
}));

export const stationComponentsRelations = relations(stationComponents, ({one, many}) => ({
	chef: one(chefs, {
		fields: [stationComponents.chefId],
		references: [chefs.id]
	}),
	stationMenuItem: one(stationMenuItems, {
		fields: [stationComponents.stationMenuItemId],
		references: [stationMenuItems.id]
	}),
	clipboardEntries: many(clipboardEntries),
	orderRequests: many(orderRequests),
	wasteLogs: many(wasteLog),
}));

export const hubGuestFriendsRelations = relations(hubGuestFriends, ({one}) => ({
	hubGuestProfile_addresseeId: one(hubGuestProfiles, {
		fields: [hubGuestFriends.addresseeId],
		references: [hubGuestProfiles.id],
		relationName: "hubGuestFriends_addresseeId_hubGuestProfiles_id"
	}),
	hubGuestProfile_requesterId: one(hubGuestProfiles, {
		fields: [hubGuestFriends.requesterId],
		references: [hubGuestProfiles.id],
		relationName: "hubGuestFriends_requesterId_hubGuestProfiles_id"
	}),
}));

export const clipboardEntriesRelations = relations(clipboardEntries, ({one}) => ({
	chef: one(chefs, {
		fields: [clipboardEntries.chefId],
		references: [chefs.id]
	}),
	stationComponent: one(stationComponents, {
		fields: [clipboardEntries.componentId],
		references: [stationComponents.id]
	}),
	station: one(stations, {
		fields: [clipboardEntries.stationId],
		references: [stations.id]
	}),
	staffMember: one(staffMembers, {
		fields: [clipboardEntries.updatedBy],
		references: [staffMembers.id]
	}),
}));

export const shiftLogsRelations = relations(shiftLogs, ({one}) => ({
	chef: one(chefs, {
		fields: [shiftLogs.chefId],
		references: [chefs.id]
	}),
	staffMember: one(staffMembers, {
		fields: [shiftLogs.staffMemberId],
		references: [staffMembers.id]
	}),
	station: one(stations, {
		fields: [shiftLogs.stationId],
		references: [stations.id]
	}),
}));

export const orderRequestsRelations = relations(orderRequests, ({one}) => ({
	chef: one(chefs, {
		fields: [orderRequests.chefId],
		references: [chefs.id]
	}),
	stationComponent: one(stationComponents, {
		fields: [orderRequests.componentId],
		references: [stationComponents.id]
	}),
	staffMember: one(staffMembers, {
		fields: [orderRequests.requestedBy],
		references: [staffMembers.id]
	}),
	station: one(stations, {
		fields: [orderRequests.stationId],
		references: [stations.id]
	}),
}));

export const hubChefRecommendationsRelations = relations(hubChefRecommendations, ({one}) => ({
	chef: one(chefs, {
		fields: [hubChefRecommendations.chefId],
		references: [chefs.id]
	}),
	hubGuestProfile_fromProfileId: one(hubGuestProfiles, {
		fields: [hubChefRecommendations.fromProfileId],
		references: [hubGuestProfiles.id],
		relationName: "hubChefRecommendations_fromProfileId_hubGuestProfiles_id"
	}),
	hubGuestProfile_toProfileId: one(hubGuestProfiles, {
		fields: [hubChefRecommendations.toProfileId],
		references: [hubGuestProfiles.id],
		relationName: "hubChefRecommendations_toProfileId_hubGuestProfiles_id"
	}),
}));

export const aiPreferencesRelations = relations(aiPreferences, ({one}) => ({
	chef: one(chefs, {
		fields: [aiPreferences.tenantId],
		references: [chefs.id]
	}),
}));

export const wasteLogRelations = relations(wasteLog, ({one}) => ({
	chef: one(chefs, {
		fields: [wasteLog.chefId],
		references: [chefs.id]
	}),
	stationComponent: one(stationComponents, {
		fields: [wasteLog.componentId],
		references: [stationComponents.id]
	}),
	staffMember: one(staffMembers, {
		fields: [wasteLog.staffMemberId],
		references: [staffMembers.id]
	}),
	station: one(stations, {
		fields: [wasteLog.stationId],
		references: [stations.id]
	}),
}));

export const opsLogRelations = relations(opsLog, ({one}) => ({
	chef: one(chefs, {
		fields: [opsLog.chefId],
		references: [chefs.id]
	}),
	staffMember: one(staffMembers, {
		fields: [opsLog.staffMemberId],
		references: [staffMembers.id]
	}),
	station: one(stations, {
		fields: [opsLog.stationId],
		references: [stations.id]
	}),
}));

export const vendorItemsRelations = relations(vendorItems, ({one, many}) => ({
	chef: one(chefs, {
		fields: [vendorItems.chefId],
		references: [chefs.id]
	}),
	vendor: one(vendors, {
		fields: [vendorItems.vendorId],
		references: [vendors.id]
	}),
	vendorInvoiceLineItems: many(vendorInvoiceLineItems),
	vendorCatalogImportRows: many(vendorCatalogImportRows),
}));

export const vendorInvoiceLineItemsRelations = relations(vendorInvoiceLineItems, ({one}) => ({
	chef: one(chefs, {
		fields: [vendorInvoiceLineItems.chefId],
		references: [chefs.id]
	}),
	vendorInvoice: one(vendorInvoices, {
		fields: [vendorInvoiceLineItems.invoiceId],
		references: [vendorInvoices.id]
	}),
	vendorItem: one(vendorItems, {
		fields: [vendorInvoiceLineItems.vendorItemId],
		references: [vendorItems.id]
	}),
}));

export const menuPreferencesRelations = relations(menuPreferences, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [menuPreferences.clientId],
		references: [usersInAuth.id]
	}),
	event: one(events, {
		fields: [menuPreferences.eventId],
		references: [events.id]
	}),
	menu: one(menus, {
		fields: [menuPreferences.selectedMenuId],
		references: [menus.id]
	}),
	chef: one(chefs, {
		fields: [menuPreferences.tenantId],
		references: [chefs.id]
	}),
}));

export const hubAvailabilityRelations = relations(hubAvailability, ({one, many}) => ({
	hubGuestProfile: one(hubGuestProfiles, {
		fields: [hubAvailability.createdByProfileId],
		references: [hubGuestProfiles.id]
	}),
	hubGroup: one(hubGroups, {
		fields: [hubAvailability.groupId],
		references: [hubGroups.id]
	}),
	hubAvailabilityResponses: many(hubAvailabilityResponses),
}));

export const hubAvailabilityResponsesRelations = relations(hubAvailabilityResponses, ({one}) => ({
	hubAvailability: one(hubAvailability, {
		fields: [hubAvailabilityResponses.availabilityId],
		references: [hubAvailability.id]
	}),
	hubGuestProfile: one(hubGuestProfiles, {
		fields: [hubAvailabilityResponses.profileId],
		references: [hubGuestProfiles.id]
	}),
}));

export const dailyRevenueRelations = relations(dailyRevenue, ({one}) => ({
	chef: one(chefs, {
		fields: [dailyRevenue.chefId],
		references: [chefs.id]
	}),
}));

export const guestsRelations = relations(guests, ({one, many}) => ({
	chef: one(chefs, {
		fields: [guests.chefId],
		references: [chefs.id]
	}),
	guestTags: many(guestTags),
	guestComps: many(guestComps),
	guestVisits: many(guestVisits),
	guestReservations: many(guestReservations),
}));

export const guestTagsRelations = relations(guestTags, ({one}) => ({
	chef: one(chefs, {
		fields: [guestTags.chefId],
		references: [chefs.id]
	}),
	guest: one(guests, {
		fields: [guestTags.guestId],
		references: [guests.id]
	}),
}));

export const guestCompsRelations = relations(guestComps, ({one}) => ({
	chef: one(chefs, {
		fields: [guestComps.chefId],
		references: [chefs.id]
	}),
	staffMember_createdBy: one(staffMembers, {
		fields: [guestComps.createdBy],
		references: [staffMembers.id],
		relationName: "guestComps_createdBy_staffMembers_id"
	}),
	guest: one(guests, {
		fields: [guestComps.guestId],
		references: [guests.id]
	}),
	staffMember_redeemedBy: one(staffMembers, {
		fields: [guestComps.redeemedBy],
		references: [staffMembers.id],
		relationName: "guestComps_redeemedBy_staffMembers_id"
	}),
}));

export const emailSenderReputationRelations = relations(emailSenderReputation, ({one}) => ({
	chef: one(chefs, {
		fields: [emailSenderReputation.tenantId],
		references: [chefs.id]
	}),
}));

export const guestVisitsRelations = relations(guestVisits, ({one}) => ({
	chef: one(chefs, {
		fields: [guestVisits.chefId],
		references: [chefs.id]
	}),
	guest: one(guests, {
		fields: [guestVisits.guestId],
		references: [guests.id]
	}),
	staffMember: one(staffMembers, {
		fields: [guestVisits.serverId],
		references: [staffMembers.id]
	}),
}));

export const guestReservationsRelations = relations(guestReservations, ({one}) => ({
	chef: one(chefs, {
		fields: [guestReservations.chefId],
		references: [chefs.id]
	}),
	guest: one(guests, {
		fields: [guestReservations.guestId],
		references: [guests.id]
	}),
}));

export const recipeSubRecipesRelations = relations(recipeSubRecipes, ({one}) => ({
	recipe_childRecipeId: one(recipes, {
		fields: [recipeSubRecipes.childRecipeId],
		references: [recipes.id],
		relationName: "recipeSubRecipes_childRecipeId_recipes_id"
	}),
	recipe_parentRecipeId: one(recipes, {
		fields: [recipeSubRecipes.parentRecipeId],
		references: [recipes.id],
		relationName: "recipeSubRecipes_parentRecipeId_recipes_id"
	}),
}));

export const inventoryTransactionsRelations = relations(inventoryTransactions, ({one}) => ({
	chef: one(chefs, {
		fields: [inventoryTransactions.chefId],
		references: [chefs.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [inventoryTransactions.createdBy],
		references: [usersInAuth.id]
	}),
	event: one(events, {
		fields: [inventoryTransactions.eventId],
		references: [events.id]
	}),
	ingredient: one(ingredients, {
		fields: [inventoryTransactions.ingredientId],
		references: [ingredients.id]
	}),
	storageLocation: one(storageLocations, {
		fields: [inventoryTransactions.locationId],
		references: [storageLocations.id]
	}),
	sale: one(sales, {
		fields: [inventoryTransactions.saleId],
		references: [sales.id]
	}),
	vendorInvoice: one(vendorInvoices, {
		fields: [inventoryTransactions.vendorInvoiceId],
		references: [vendorInvoices.id]
	}),
	wasteLog: one(wasteLogs, {
		fields: [inventoryTransactions.wasteLogId],
		references: [wasteLogs.id]
	}),
}));

export const eventDocumentSnapshotsRelations = relations(eventDocumentSnapshots, ({one}) => ({
	event: one(events, {
		fields: [eventDocumentSnapshots.eventId],
		references: [events.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [eventDocumentSnapshots.generatedBy],
		references: [usersInAuth.id]
	}),
	chef: one(chefs, {
		fields: [eventDocumentSnapshots.tenantId],
		references: [chefs.id]
	}),
}));

export const remyActionAuditLogRelations = relations(remyActionAuditLog, ({one}) => ({
	chef_chefId: one(chefs, {
		fields: [remyActionAuditLog.chefId],
		references: [chefs.id],
		relationName: "remyActionAuditLog_chefId_chefs_id"
	}),
	chef_tenantId: one(chefs, {
		fields: [remyActionAuditLog.tenantId],
		references: [chefs.id],
		relationName: "remyActionAuditLog_tenantId_chefs_id"
	}),
}));

export const eventDocumentGenerationJobsRelations = relations(eventDocumentGenerationJobs, ({one}) => ({
	event: one(events, {
		fields: [eventDocumentGenerationJobs.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [eventDocumentGenerationJobs.tenantId],
		references: [chefs.id]
	}),
}));

export const remyApprovalPoliciesRelations = relations(remyApprovalPolicies, ({one}) => ({
	chef: one(chefs, {
		fields: [remyApprovalPolicies.tenantId],
		references: [chefs.id]
	}),
}));

export const chefTrustedCircleRelations = relations(chefTrustedCircle, ({one}) => ({
	chef_chefId: one(chefs, {
		fields: [chefTrustedCircle.chefId],
		references: [chefs.id],
		relationName: "chefTrustedCircle_chefId_chefs_id"
	}),
	chef_trustedChefId: one(chefs, {
		fields: [chefTrustedCircle.trustedChefId],
		references: [chefs.id],
		relationName: "chefTrustedCircle_trustedChefId_chefs_id"
	}),
}));

export const chefHandoffsRelations = relations(chefHandoffs, ({one, many}) => ({
	chef: one(chefs, {
		fields: [chefHandoffs.fromChefId],
		references: [chefs.id]
	}),
	chefHandoffRecipients: many(chefHandoffRecipients),
	chefHandoffEvents: many(chefHandoffEvents),
}));

export const chefHandoffRecipientsRelations = relations(chefHandoffRecipients, ({one}) => ({
	chefHandoff: one(chefHandoffs, {
		fields: [chefHandoffRecipients.handoffId],
		references: [chefHandoffs.id]
	}),
	chef: one(chefs, {
		fields: [chefHandoffRecipients.recipientChefId],
		references: [chefs.id]
	}),
}));

export const chefHandoffEventsRelations = relations(chefHandoffEvents, ({one}) => ({
	chef: one(chefs, {
		fields: [chefHandoffEvents.actorChefId],
		references: [chefs.id]
	}),
	chefHandoff: one(chefHandoffs, {
		fields: [chefHandoffEvents.handoffId],
		references: [chefHandoffs.id]
	}),
}));

export const chefAvailabilitySignalsRelations = relations(chefAvailabilitySignals, ({one}) => ({
	chef: one(chefs, {
		fields: [chefAvailabilitySignals.chefId],
		references: [chefs.id]
	}),
}));

export const chefSocialNotificationsRelations = relations(chefSocialNotifications, ({one}) => ({
	chef_actorChefId: one(chefs, {
		fields: [chefSocialNotifications.actorChefId],
		references: [chefs.id],
		relationName: "chefSocialNotifications_actorChefId_chefs_id"
	}),
	chef_recipientChefId: one(chefs, {
		fields: [chefSocialNotifications.recipientChefId],
		references: [chefs.id],
		relationName: "chefSocialNotifications_recipientChefId_chefs_id"
	}),
}));

export const commercePromotionsRelations = relations(commercePromotions, ({one, many}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [commercePromotions.createdBy],
		references: [usersInAuth.id]
	}),
	chef: one(chefs, {
		fields: [commercePromotions.tenantId],
		references: [chefs.id]
	}),
	saleAppliedPromotions: many(saleAppliedPromotions),
}));

export const saleAppliedPromotionsRelations = relations(saleAppliedPromotions, ({one}) => ({
	commercePromotion: one(commercePromotions, {
		fields: [saleAppliedPromotions.promotionId],
		references: [commercePromotions.id]
	}),
	sale: one(sales, {
		fields: [saleAppliedPromotions.saleId],
		references: [sales.id]
	}),
	chef: one(chefs, {
		fields: [saleAppliedPromotions.tenantId],
		references: [chefs.id]
	}),
}));

export const posAlertEventsRelations = relations(posAlertEvents, ({one}) => ({
	usersInAuth_acknowledgedBy: one(usersInAuth, {
		fields: [posAlertEvents.acknowledgedBy],
		references: [usersInAuth.id],
		relationName: "posAlertEvents_acknowledgedBy_usersInAuth_id"
	}),
	usersInAuth_resolvedBy: one(usersInAuth, {
		fields: [posAlertEvents.resolvedBy],
		references: [usersInAuth.id],
		relationName: "posAlertEvents_resolvedBy_usersInAuth_id"
	}),
	chef: one(chefs, {
		fields: [posAlertEvents.tenantId],
		references: [chefs.id]
	}),
}));

export const posMetricSnapshotsRelations = relations(posMetricSnapshots, ({one}) => ({
	chef: one(chefs, {
		fields: [posMetricSnapshots.tenantId],
		references: [chefs.id]
	}),
}));

export const commerceDiningZonesRelations = relations(commerceDiningZones, ({one, many}) => ({
	chef: one(chefs, {
		fields: [commerceDiningZones.tenantId],
		references: [chefs.id]
	}),
	commerceDiningTables: many(commerceDiningTables),
}));

export const commerceDiningTablesRelations = relations(commerceDiningTables, ({one, many}) => ({
	chef: one(chefs, {
		fields: [commerceDiningTables.tenantId],
		references: [chefs.id]
	}),
	commerceDiningZone: one(commerceDiningZones, {
		fields: [commerceDiningTables.zoneId],
		references: [commerceDiningZones.id]
	}),
	commerceDiningChecks: many(commerceDiningChecks),
}));

export const commerceDiningChecksRelations = relations(commerceDiningChecks, ({one}) => ({
	usersInAuth_closedBy: one(usersInAuth, {
		fields: [commerceDiningChecks.closedBy],
		references: [usersInAuth.id],
		relationName: "commerceDiningChecks_closedBy_usersInAuth_id"
	}),
	usersInAuth_openedBy: one(usersInAuth, {
		fields: [commerceDiningChecks.openedBy],
		references: [usersInAuth.id],
		relationName: "commerceDiningChecks_openedBy_usersInAuth_id"
	}),
	registerSession: one(registerSessions, {
		fields: [commerceDiningChecks.registerSessionId],
		references: [registerSessions.id]
	}),
	sale: one(sales, {
		fields: [commerceDiningChecks.saleId],
		references: [sales.id]
	}),
	commerceDiningTable: one(commerceDiningTables, {
		fields: [commerceDiningChecks.tableId],
		references: [commerceDiningTables.id]
	}),
	chef: one(chefs, {
		fields: [commerceDiningChecks.tenantId],
		references: [chefs.id]
	}),
}));

export const vendorCatalogImportRowsRelations = relations(vendorCatalogImportRows, ({one}) => ({
	vendorItem: one(vendorItems, {
		fields: [vendorCatalogImportRows.appliedVendorItemId],
		references: [vendorItems.id]
	}),
	chef: one(chefs, {
		fields: [vendorCatalogImportRows.chefId],
		references: [chefs.id]
	}),
	vendor: one(vendors, {
		fields: [vendorCatalogImportRows.vendorId],
		references: [vendors.id]
	}),
}));

export const vendorDocumentUploadsRelations = relations(vendorDocumentUploads, ({one}) => ({
	chef: one(chefs, {
		fields: [vendorDocumentUploads.chefId],
		references: [chefs.id]
	}),
	vendor: one(vendors, {
		fields: [vendorDocumentUploads.vendorId],
		references: [vendors.id]
	}),
}));

export const vendorPriceAlertSettingsRelations = relations(vendorPriceAlertSettings, ({one}) => ({
	chef: one(chefs, {
		fields: [vendorPriceAlertSettings.chefId],
		references: [chefs.id]
	}),
	vendor: one(vendors, {
		fields: [vendorPriceAlertSettings.vendorId],
		references: [vendors.id]
	}),
}));

export const clientMealRequestsRelations = relations(clientMealRequests, ({one}) => ({
	client: one(clients, {
		fields: [clientMealRequests.clientId],
		references: [clients.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [clientMealRequests.reviewedBy],
		references: [usersInAuth.id]
	}),
	chef: one(chefs, {
		fields: [clientMealRequests.tenantId],
		references: [chefs.id]
	}),
}));

export const eventServiceSessionsRelations = relations(eventServiceSessions, ({one, many}) => ({
	client: one(clients, {
		fields: [eventServiceSessions.clientId],
		references: [clients.id]
	}),
	usersInAuth_createdBy: one(usersInAuth, {
		fields: [eventServiceSessions.createdBy],
		references: [usersInAuth.id],
		relationName: "eventServiceSessions_createdBy_usersInAuth_id"
	}),
	event: one(events, {
		fields: [eventServiceSessions.eventId],
		references: [events.id],
		relationName: "eventServiceSessions_eventId_events_id"
	}),
	inquiry: one(inquiries, {
		fields: [eventServiceSessions.inquiryId],
		references: [inquiries.id]
	}),
	eventSery: one(eventSeries, {
		fields: [eventServiceSessions.seriesId],
		references: [eventSeries.id]
	}),
	chef: one(chefs, {
		fields: [eventServiceSessions.tenantId],
		references: [chefs.id]
	}),
	usersInAuth_updatedBy: one(usersInAuth, {
		fields: [eventServiceSessions.updatedBy],
		references: [usersInAuth.id],
		relationName: "eventServiceSessions_updatedBy_usersInAuth_id"
	}),
	events: many(events, {
		relationName: "events_sourceSessionId_eventServiceSessions_id"
	}),
}));

export const eventSeriesRelations = relations(eventSeries, ({one, many}) => ({
	eventServiceSessions: many(eventServiceSessions),
	client: one(clients, {
		fields: [eventSeries.clientId],
		references: [clients.id]
	}),
	usersInAuth_createdBy: one(usersInAuth, {
		fields: [eventSeries.createdBy],
		references: [usersInAuth.id],
		relationName: "eventSeries_createdBy_usersInAuth_id"
	}),
	inquiry: one(inquiries, {
		fields: [eventSeries.inquiryId],
		references: [inquiries.id]
	}),
	chef: one(chefs, {
		fields: [eventSeries.tenantId],
		references: [chefs.id]
	}),
	usersInAuth_updatedBy: one(usersInAuth, {
		fields: [eventSeries.updatedBy],
		references: [usersInAuth.id],
		relationName: "eventSeries_updatedBy_usersInAuth_id"
	}),
	events: many(events),
}));

export const recurringMenuRecommendationsRelations = relations(recurringMenuRecommendations, ({one}) => ({
	client: one(clients, {
		fields: [recurringMenuRecommendations.clientId],
		references: [clients.id]
	}),
	usersInAuth_respondedBy: one(usersInAuth, {
		fields: [recurringMenuRecommendations.respondedBy],
		references: [usersInAuth.id],
		relationName: "recurringMenuRecommendations_respondedBy_usersInAuth_id"
	}),
	usersInAuth_sentBy: one(usersInAuth, {
		fields: [recurringMenuRecommendations.sentBy],
		references: [usersInAuth.id],
		relationName: "recurringMenuRecommendations_sentBy_usersInAuth_id"
	}),
	chef: one(chefs, {
		fields: [recurringMenuRecommendations.tenantId],
		references: [chefs.id]
	}),
}));

export const servedDishHistoryRelations = relations(servedDishHistory, ({one}) => ({
	chef: one(chefs, {
		fields: [servedDishHistory.chefId],
		references: [chefs.id]
	}),
	client: one(clients, {
		fields: [servedDishHistory.clientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [servedDishHistory.eventId],
		references: [events.id]
	}),
	recipe: one(recipes, {
		fields: [servedDishHistory.recipeId],
		references: [recipes.id]
	}),
}));

export const chefServiceConfigRelations = relations(chefServiceConfig, ({one}) => ({
	chef: one(chefs, {
		fields: [chefServiceConfig.chefId],
		references: [chefs.id]
	}),
}));

export const shiftHandoffNotesRelations = relations(shiftHandoffNotes, ({one}) => ({
	chef: one(chefs, {
		fields: [shiftHandoffNotes.chefId],
		references: [chefs.id]
	}),
}));

export const prepTimelineRelations = relations(prepTimeline, ({one}) => ({
	chef: one(chefs, {
		fields: [prepTimeline.chefId],
		references: [chefs.id]
	}),
	event: one(events, {
		fields: [prepTimeline.eventId],
		references: [events.id]
	}),
	station: one(stations, {
		fields: [prepTimeline.stationId],
		references: [stations.id]
	}),
}));

export const workflowTemplatesRelations = relations(workflowTemplates, ({one, many}) => ({
	chef: one(chefs, {
		fields: [workflowTemplates.chefId],
		references: [chefs.id]
	}),
	workflowSteps: many(workflowSteps),
	workflowExecutions: many(workflowExecutions),
}));

export const workflowStepsRelations = relations(workflowSteps, ({one}) => ({
	workflowTemplate: one(workflowTemplates, {
		fields: [workflowSteps.templateId],
		references: [workflowTemplates.id]
	}),
}));

export const workflowExecutionsRelations = relations(workflowExecutions, ({one, many}) => ({
	chef: one(chefs, {
		fields: [workflowExecutions.chefId],
		references: [chefs.id]
	}),
	workflowTemplate: one(workflowTemplates, {
		fields: [workflowExecutions.templateId],
		references: [workflowTemplates.id]
	}),
	workflowExecutionLogs: many(workflowExecutionLog),
}));

export const workflowExecutionLogRelations = relations(workflowExecutionLog, ({one}) => ({
	chef: one(chefs, {
		fields: [workflowExecutionLog.chefId],
		references: [chefs.id]
	}),
	workflowExecution: one(workflowExecutions, {
		fields: [workflowExecutionLog.executionId],
		references: [workflowExecutions.id]
	}),
}));

export const eventEquipmentAssignmentsRelations = relations(eventEquipmentAssignments, ({one}) => ({
	chef: one(chefs, {
		fields: [eventEquipmentAssignments.chefId],
		references: [chefs.id]
	}),
	equipmentItem: one(equipmentItems, {
		fields: [eventEquipmentAssignments.equipmentItemId],
		references: [equipmentItems.id]
	}),
	event: one(events, {
		fields: [eventEquipmentAssignments.eventId],
		references: [events.id]
	}),
}));

export const hubGroupEventsRelations = relations(hubGroupEvents, ({one}) => ({
	event: one(events, {
		fields: [hubGroupEvents.eventId],
		references: [events.id]
	}),
	hubGroup: one(hubGroups, {
		fields: [hubGroupEvents.groupId],
		references: [hubGroups.id]
	}),
}));

export const hubMessageReadsRelations = relations(hubMessageReads, ({one}) => ({
	hubMessage: one(hubMessages, {
		fields: [hubMessageReads.messageId],
		references: [hubMessages.id]
	}),
	hubGuestProfile: one(hubGuestProfiles, {
		fields: [hubMessageReads.profileId],
		references: [hubGuestProfiles.id]
	}),
}));

export const clientWorksheetsRelations = relations(clientWorksheets, ({one}) => ({
	client: one(clients, {
		fields: [clientWorksheets.clientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [clientWorksheets.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [clientWorksheets.tenantId],
		references: [chefs.id]
	}),
}));

export const betaOnboardingChecklistRelations = relations(betaOnboardingChecklist, ({one}) => ({
	client: one(clients, {
		fields: [betaOnboardingChecklist.clientId],
		references: [clients.id]
	}),
	hubGroup: one(hubGroups, {
		fields: [betaOnboardingChecklist.primaryCircleId],
		references: [hubGroups.id]
	}),
	chef: one(chefs, {
		fields: [betaOnboardingChecklist.tenantId],
		references: [chefs.id]
	}),
}));

export const hubGroupMembersRelations = relations(hubGroupMembers, ({one}) => ({
	hubGroup: one(hubGroups, {
		fields: [hubGroupMembers.groupId],
		references: [hubGroups.id]
	}),
	hubGuestProfile: one(hubGuestProfiles, {
		fields: [hubGroupMembers.profileId],
		references: [hubGuestProfiles.id]
	}),
}));

export const frontOfHouseMenusRelations = relations(frontOfHouseMenus, ({one}) => ({
	event: one(events, {
		fields: [frontOfHouseMenus.eventId],
		references: [events.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [frontOfHouseMenus.generatedBy],
		references: [usersInAuth.id]
	}),
	menu: one(menus, {
		fields: [frontOfHouseMenus.menuId],
		references: [menus.id]
	}),
	menuTemplate: one(menuTemplates, {
		fields: [frontOfHouseMenus.templateId],
		references: [menuTemplates.id]
	}),
	chef: one(chefs, {
		fields: [frontOfHouseMenus.tenantId],
		references: [chefs.id]
	}),
}));

export const menuTemplatesRelations = relations(menuTemplates, ({one, many}) => ({
	frontOfHouseMenus: many(frontOfHouseMenus),
	usersInAuth_createdBy: one(usersInAuth, {
		fields: [menuTemplates.createdBy],
		references: [usersInAuth.id],
		relationName: "menuTemplates_createdBy_usersInAuth_id"
	}),
	chef: one(chefs, {
		fields: [menuTemplates.tenantId],
		references: [chefs.id]
	}),
	usersInAuth_updatedBy: one(usersInAuth, {
		fields: [menuTemplates.updatedBy],
		references: [usersInAuth.id],
		relationName: "menuTemplates_updatedBy_usersInAuth_id"
	}),
}));

export const eventLeftoverDetailsRelations = relations(eventLeftoverDetails, ({one}) => ({
	chef: one(chefs, {
		fields: [eventLeftoverDetails.chefId],
		references: [chefs.id]
	}),
	component: one(components, {
		fields: [eventLeftoverDetails.componentId],
		references: [components.id]
	}),
	event_eventId: one(events, {
		fields: [eventLeftoverDetails.eventId],
		references: [events.id],
		relationName: "eventLeftoverDetails_eventId_events_id"
	}),
	event_nextEventId: one(events, {
		fields: [eventLeftoverDetails.nextEventId],
		references: [events.id],
		relationName: "eventLeftoverDetails_nextEventId_events_id"
	}),
}));

export const guestFeedbackRelations = relations(guestFeedback, ({one}) => ({
	event: one(events, {
		fields: [guestFeedback.eventId],
		references: [events.id]
	}),
	eventGuest: one(eventGuests, {
		fields: [guestFeedback.guestId],
		references: [eventGuests.id]
	}),
	chef: one(chefs, {
		fields: [guestFeedback.tenantId],
		references: [chefs.id]
	}),
}));

export const guestMessagesRelations = relations(guestMessages, ({one}) => ({
	event: one(events, {
		fields: [guestMessages.eventId],
		references: [events.id]
	}),
	eventGuest: one(eventGuests, {
		fields: [guestMessages.guestId],
		references: [eventGuests.id]
	}),
	chef: one(chefs, {
		fields: [guestMessages.tenantId],
		references: [chefs.id]
	}),
}));

export const guestDayOfRemindersRelations = relations(guestDayOfReminders, ({one}) => ({
	event: one(events, {
		fields: [guestDayOfReminders.eventId],
		references: [events.id]
	}),
	eventGuest: one(eventGuests, {
		fields: [guestDayOfReminders.guestId],
		references: [eventGuests.id]
	}),
	chef: one(chefs, {
		fields: [guestDayOfReminders.tenantId],
		references: [chefs.id]
	}),
}));

export const guestDietaryConfirmationsRelations = relations(guestDietaryConfirmations, ({one}) => ({
	event: one(events, {
		fields: [guestDietaryConfirmations.eventId],
		references: [events.id]
	}),
	eventGuest: one(eventGuests, {
		fields: [guestDietaryConfirmations.guestId],
		references: [eventGuests.id]
	}),
	chef: one(chefs, {
		fields: [guestDietaryConfirmations.tenantId],
		references: [chefs.id]
	}),
}));

export const eventGuestDocumentsRelations = relations(eventGuestDocuments, ({one}) => ({
	event: one(events, {
		fields: [eventGuestDocuments.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [eventGuestDocuments.tenantId],
		references: [chefs.id]
	}),
}));

export const eventThemesRelations = relations(eventThemes, ({many}) => ({
	eventShares: many(eventShares),
	hubGroups: many(hubGroups),
}));

export const chefBudgetsRelations = relations(chefBudgets, ({one}) => ({
	chef: one(chefs, {
		fields: [chefBudgets.chefId],
		references: [chefs.id]
	}),
}));

export const clientProposalsRelations = relations(clientProposals, ({one}) => ({
	client: one(clients, {
		fields: [clientProposals.clientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [clientProposals.eventId],
		references: [events.id]
	}),
	menu: one(menus, {
		fields: [clientProposals.menuId],
		references: [menus.id]
	}),
	proposalTemplate: one(proposalTemplates, {
		fields: [clientProposals.templateId],
		references: [proposalTemplates.id]
	}),
	chef: one(chefs, {
		fields: [clientProposals.tenantId],
		references: [chefs.id]
	}),
}));

export const staffEventTokensRelations = relations(staffEventTokens, ({one}) => ({
	event: one(events, {
		fields: [staffEventTokens.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [staffEventTokens.tenantId],
		references: [chefs.id]
	}),
}));

export const mealPrepWeeksRelations = relations(mealPrepWeeks, ({one}) => ({
	menu: one(menus, {
		fields: [mealPrepWeeks.menuId],
		references: [menus.id]
	}),
	mealPrepProgram: one(mealPrepPrograms, {
		fields: [mealPrepWeeks.programId],
		references: [mealPrepPrograms.id]
	}),
	chef: one(chefs, {
		fields: [mealPrepWeeks.tenantId],
		references: [chefs.id]
	}),
}));

export const mealPrepProgramsRelations = relations(mealPrepPrograms, ({one, many}) => ({
	mealPrepWeeks: many(mealPrepWeeks),
	client: one(clients, {
		fields: [mealPrepPrograms.clientId],
		references: [clients.id]
	}),
	recurringService: one(recurringServices, {
		fields: [mealPrepPrograms.recurringServiceId],
		references: [recurringServices.id]
	}),
	chef: one(chefs, {
		fields: [mealPrepPrograms.tenantId],
		references: [chefs.id]
	}),
	containerTransactions: many(containerTransactions),
	mealPrepDeliveries: many(mealPrepDeliveries),
}));

export const menuNutritionRelations = relations(menuNutrition, ({one}) => ({
	menu: one(menus, {
		fields: [menuNutrition.menuId],
		references: [menus.id]
	}),
	recipe: one(recipes, {
		fields: [menuNutrition.recipeId],
		references: [recipes.id]
	}),
	chef: one(chefs, {
		fields: [menuNutrition.tenantId],
		references: [chefs.id]
	}),
}));

export const followUpSendsRelations = relations(followUpSends, ({one}) => ({
	client: one(clients, {
		fields: [followUpSends.clientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [followUpSends.eventId],
		references: [events.id]
	}),
	followupRule: one(followupRules, {
		fields: [followUpSends.ruleId],
		references: [followupRules.id]
	}),
	chef: one(chefs, {
		fields: [followUpSends.tenantId],
		references: [chefs.id]
	}),
}));

export const productTourProgressRelations = relations(productTourProgress, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [productTourProgress.authUserId],
		references: [usersInAuth.id]
	}),
}));

export const vendorEventAssignmentsRelations = relations(vendorEventAssignments, ({one}) => ({
	event: one(events, {
		fields: [vendorEventAssignments.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [vendorEventAssignments.tenantId],
		references: [chefs.id]
	}),
	vendor: one(vendors, {
		fields: [vendorEventAssignments.vendorId],
		references: [vendors.id]
	}),
}));

export const eventEquipmentRentalsRelations = relations(eventEquipmentRentals, ({one}) => ({
	chef: one(chefs, {
		fields: [eventEquipmentRentals.chefId],
		references: [chefs.id]
	}),
	event: one(events, {
		fields: [eventEquipmentRentals.eventId],
		references: [events.id]
	}),
}));

export const hubShareCardsRelations = relations(hubShareCards, ({one}) => ({
	hubGuestProfile: one(hubGuestProfiles, {
		fields: [hubShareCards.createdByProfileId],
		references: [hubGuestProfiles.id]
	}),
	event: one(events, {
		fields: [hubShareCards.eventId],
		references: [events.id]
	}),
	hubGroup: one(hubGroups, {
		fields: [hubShareCards.groupId],
		references: [hubGroups.id]
	}),
}));

export const openTableConsentsRelations = relations(openTableConsents, ({one}) => ({
	hubGroup: one(hubGroups, {
		fields: [openTableConsents.groupId],
		references: [hubGroups.id]
	}),
	hubGuestProfile_profileId: one(hubGuestProfiles, {
		fields: [openTableConsents.profileId],
		references: [hubGuestProfiles.id],
		relationName: "openTableConsents_profileId_hubGuestProfiles_id"
	}),
	hubGuestProfile_requestedByProfileId: one(hubGuestProfiles, {
		fields: [openTableConsents.requestedByProfileId],
		references: [hubGuestProfiles.id],
		relationName: "openTableConsents_requestedByProfileId_hubGuestProfiles_id"
	}),
}));

export const openTableRequestsRelations = relations(openTableRequests, ({one}) => ({
	hubGroup: one(hubGroups, {
		fields: [openTableRequests.groupId],
		references: [hubGroups.id]
	}),
	hubGuestProfile: one(hubGuestProfiles, {
		fields: [openTableRequests.requesterProfileId],
		references: [hubGuestProfiles.id]
	}),
	chef: one(chefs, {
		fields: [openTableRequests.tenantId],
		references: [chefs.id]
	}),
}));

export const shoppingListsRelations = relations(shoppingLists, ({one}) => ({
	chef: one(chefs, {
		fields: [shoppingLists.chefId],
		references: [chefs.id]
	}),
	event: one(events, {
		fields: [shoppingLists.eventId],
		references: [events.id]
	}),
}));

export const packingTemplatesRelations = relations(packingTemplates, ({one}) => ({
	chef: one(chefs, {
		fields: [packingTemplates.chefId],
		references: [chefs.id]
	}),
}));

export const platingGuidesRelations = relations(platingGuides, ({one}) => ({
	chef: one(chefs, {
		fields: [platingGuides.chefId],
		references: [chefs.id]
	}),
	recipe: one(recipes, {
		fields: [platingGuides.recipeId],
		references: [recipes.id]
	}),
}));

export const eventPrepStepsRelations = relations(eventPrepSteps, ({one}) => ({
	event: one(events, {
		fields: [eventPrepSteps.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [eventPrepSteps.tenantId],
		references: [chefs.id]
	}),
}));

export const dietaryConfirmationsRelations = relations(dietaryConfirmations, ({one}) => ({
	client: one(clients, {
		fields: [dietaryConfirmations.clientId],
		references: [clients.id]
	}),
	chef_confirmedByChefId: one(chefs, {
		fields: [dietaryConfirmations.confirmedByChefId],
		references: [chefs.id],
		relationName: "dietaryConfirmations_confirmedByChefId_chefs_id"
	}),
	event: one(events, {
		fields: [dietaryConfirmations.eventId],
		references: [events.id]
	}),
	chef_tenantId: one(chefs, {
		fields: [dietaryConfirmations.tenantId],
		references: [chefs.id],
		relationName: "dietaryConfirmations_tenantId_chefs_id"
	}),
}));

export const quoteLineItemsRelations = relations(quoteLineItems, ({one}) => ({
	quote: one(quotes, {
		fields: [quoteLineItems.quoteId],
		references: [quotes.id]
	}),
	chef: one(chefs, {
		fields: [quoteLineItems.tenantId],
		references: [chefs.id]
	}),
}));

export const eventLiveStatusRelations = relations(eventLiveStatus, ({one}) => ({
	event: one(events, {
		fields: [eventLiveStatus.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [eventLiveStatus.tenantId],
		references: [chefs.id]
	}),
}));

export const clientReviewsRelations = relations(clientReviews, ({one}) => ({
	client: one(clients, {
		fields: [clientReviews.clientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [clientReviews.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [clientReviews.tenantId],
		references: [chefs.id]
	}),
}));

export const proposalTokensRelations = relations(proposalTokens, ({one, many}) => ({
	eventContracts: many(eventContracts, {
		relationName: "eventContracts_proposalTokenId_proposalTokens_id"
	}),
	client: one(clients, {
		fields: [proposalTokens.clientId],
		references: [clients.id]
	}),
	eventContract: one(eventContracts, {
		fields: [proposalTokens.contractId],
		references: [eventContracts.id],
		relationName: "proposalTokens_contractId_eventContracts_id"
	}),
	event: one(events, {
		fields: [proposalTokens.eventId],
		references: [events.id]
	}),
	quote: one(quotes, {
		fields: [proposalTokens.quoteId],
		references: [quotes.id]
	}),
	chef: one(chefs, {
		fields: [proposalTokens.tenantId],
		references: [chefs.id]
	}),
	proposalAddonSelections: many(proposalAddonSelections),
}));

export const quoteAddonsRelations = relations(quoteAddons, ({one, many}) => ({
	proposalAddon: one(proposalAddons, {
		fields: [quoteAddons.addonId],
		references: [proposalAddons.id]
	}),
	quote: one(quotes, {
		fields: [quoteAddons.quoteId],
		references: [quotes.id]
	}),
	chef: one(chefs, {
		fields: [quoteAddons.tenantId],
		references: [chefs.id]
	}),
	proposalAddonSelections: many(proposalAddonSelections),
}));

export const proposalAddonSelectionsRelations = relations(proposalAddonSelections, ({one}) => ({
	proposalToken: one(proposalTokens, {
		fields: [proposalAddonSelections.proposalTokenId],
		references: [proposalTokens.id]
	}),
	quoteAddon: one(quoteAddons, {
		fields: [proposalAddonSelections.quoteAddonId],
		references: [quoteAddons.id]
	}),
}));

export const recipeIngredientsRelations = relations(recipeIngredients, ({one}) => ({
	ingredient: one(ingredients, {
		fields: [recipeIngredients.ingredientId],
		references: [ingredients.id]
	}),
	recipe: one(recipes, {
		fields: [recipeIngredients.recipeId],
		references: [recipes.id]
	}),
}));

export const bookingEventTypesRelations = relations(bookingEventTypes, ({one}) => ({
	chef: one(chefs, {
		fields: [bookingEventTypes.chefId],
		references: [chefs.id]
	}),
}));

export const bookingAvailabilityRulesRelations = relations(bookingAvailabilityRules, ({one}) => ({
	chef: one(chefs, {
		fields: [bookingAvailabilityRules.chefId],
		references: [chefs.id]
	}),
}));

export const bookingDateOverridesRelations = relations(bookingDateOverrides, ({one}) => ({
	chef: one(chefs, {
		fields: [bookingDateOverrides.chefId],
		references: [chefs.id]
	}),
}));

export const bookingDailyCapsRelations = relations(bookingDailyCaps, ({one}) => ({
	chef: one(chefs, {
		fields: [bookingDailyCaps.chefId],
		references: [chefs.id]
	}),
}));

export const recurringInvoicesRelations = relations(recurringInvoices, ({one, many}) => ({
	chef: one(chefs, {
		fields: [recurringInvoices.chefId],
		references: [chefs.id]
	}),
	client: one(clients, {
		fields: [recurringInvoices.clientId],
		references: [clients.id]
	}),
	recurringInvoiceHistories: many(recurringInvoiceHistory),
}));

export const recurringInvoiceHistoryRelations = relations(recurringInvoiceHistory, ({one}) => ({
	chef: one(chefs, {
		fields: [recurringInvoiceHistory.chefId],
		references: [chefs.id]
	}),
	client: one(clients, {
		fields: [recurringInvoiceHistory.clientId],
		references: [clients.id]
	}),
	recurringInvoice: one(recurringInvoices, {
		fields: [recurringInvoiceHistory.scheduleId],
		references: [recurringInvoices.id]
	}),
}));

export const proposalSectionsRelations = relations(proposalSections, ({one}) => ({
	quote: one(quotes, {
		fields: [proposalSections.quoteId],
		references: [quotes.id]
	}),
	chef: one(chefs, {
		fields: [proposalSections.tenantId],
		references: [chefs.id]
	}),
}));

export const clientOutreachLogRelations = relations(clientOutreachLog, ({one}) => ({
	client: one(clients, {
		fields: [clientOutreachLog.clientId],
		references: [clients.id]
	}),
	chef: one(chefs, {
		fields: [clientOutreachLog.tenantId],
		references: [chefs.id]
	}),
}));

export const referralRequestLogRelations = relations(referralRequestLog, ({one}) => ({
	client: one(clients, {
		fields: [referralRequestLog.clientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [referralRequestLog.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [referralRequestLog.tenantId],
		references: [chefs.id]
	}),
}));

export const eventEquipmentChecklistRelations = relations(eventEquipmentChecklist, ({one}) => ({
	chef: one(chefs, {
		fields: [eventEquipmentChecklist.chefId],
		references: [chefs.id]
	}),
	event: one(events, {
		fields: [eventEquipmentChecklist.eventId],
		references: [events.id]
	}),
}));

export const eventStationAssignmentsRelations = relations(eventStationAssignments, ({one}) => ({
	chef: one(chefs, {
		fields: [eventStationAssignments.chefId],
		references: [chefs.id]
	}),
	event: one(events, {
		fields: [eventStationAssignments.eventId],
		references: [events.id]
	}),
	staffMember: one(staffMembers, {
		fields: [eventStationAssignments.staffMemberId],
		references: [staffMembers.id]
	}),
	station: one(stations, {
		fields: [eventStationAssignments.stationId],
		references: [stations.id]
	}),
}));

export const eventVendorDeliveriesRelations = relations(eventVendorDeliveries, ({one}) => ({
	chef: one(chefs, {
		fields: [eventVendorDeliveries.chefId],
		references: [chefs.id]
	}),
	event: one(events, {
		fields: [eventVendorDeliveries.eventId],
		references: [events.id]
	}),
	vendor: one(vendors, {
		fields: [eventVendorDeliveries.vendorId],
		references: [vendors.id]
	}),
}));

export const eventFloorPlansRelations = relations(eventFloorPlans, ({one}) => ({
	chef: one(chefs, {
		fields: [eventFloorPlans.chefId],
		references: [chefs.id]
	}),
	event: one(events, {
		fields: [eventFloorPlans.eventId],
		references: [events.id]
	}),
}));

export const containerInventoryRelations = relations(containerInventory, ({one, many}) => ({
	chef: one(chefs, {
		fields: [containerInventory.chefId],
		references: [chefs.id]
	}),
	containerTransactions: many(containerTransactions),
}));

export const containerTransactionsRelations = relations(containerTransactions, ({one}) => ({
	chef: one(chefs, {
		fields: [containerTransactions.chefId],
		references: [chefs.id]
	}),
	client: one(clients, {
		fields: [containerTransactions.clientId],
		references: [clients.id]
	}),
	containerInventory: one(containerInventory, {
		fields: [containerTransactions.containerTypeId],
		references: [containerInventory.id]
	}),
	mealPrepProgram: one(mealPrepPrograms, {
		fields: [containerTransactions.programId],
		references: [mealPrepPrograms.id]
	}),
}));

export const clientMealPrepPreferencesRelations = relations(clientMealPrepPreferences, ({one}) => ({
	chef: one(chefs, {
		fields: [clientMealPrepPreferences.chefId],
		references: [chefs.id]
	}),
	client: one(clients, {
		fields: [clientMealPrepPreferences.clientId],
		references: [clients.id]
	}),
}));

export const recipeNutritionRelations = relations(recipeNutrition, ({one}) => ({
	chef: one(chefs, {
		fields: [recipeNutrition.chefId],
		references: [chefs.id]
	}),
	recipe: one(recipes, {
		fields: [recipeNutrition.recipeId],
		references: [recipes.id]
	}),
}));

export const mealPrepBatchLogRelations = relations(mealPrepBatchLog, ({one}) => ({
	chef: one(chefs, {
		fields: [mealPrepBatchLog.chefId],
		references: [chefs.id]
	}),
	recipe: one(recipes, {
		fields: [mealPrepBatchLog.recipeId],
		references: [recipes.id]
	}),
}));

export const kdsTicketsRelations = relations(kdsTickets, ({one}) => ({
	chef: one(chefs, {
		fields: [kdsTickets.chefId],
		references: [chefs.id]
	}),
	sale: one(sales, {
		fields: [kdsTickets.saleId],
		references: [sales.id]
	}),
	station: one(stations, {
		fields: [kdsTickets.stationId],
		references: [stations.id]
	}),
}));

export const productModifierGroupsRelations = relations(productModifierGroups, ({one, many}) => ({
	chef: one(chefs, {
		fields: [productModifierGroups.chefId],
		references: [chefs.id]
	}),
	productModifiers: many(productModifiers),
	productModifierAssignments: many(productModifierAssignments),
}));

export const productModifiersRelations = relations(productModifiers, ({one}) => ({
	chef: one(chefs, {
		fields: [productModifiers.chefId],
		references: [chefs.id]
	}),
	productModifierGroup: one(productModifierGroups, {
		fields: [productModifiers.groupId],
		references: [productModifierGroups.id]
	}),
}));

export const productModifierAssignmentsRelations = relations(productModifierAssignments, ({one}) => ({
	chef: one(chefs, {
		fields: [productModifierAssignments.chefId],
		references: [chefs.id]
	}),
	productModifierGroup: one(productModifierGroups, {
		fields: [productModifierAssignments.modifierGroupId],
		references: [productModifierGroups.id]
	}),
	productProjection: one(productProjections, {
		fields: [productModifierAssignments.productId],
		references: [productProjections.id]
	}),
}));

export const dailySpecialsRelations = relations(dailySpecials, ({one}) => ({
	chef: one(chefs, {
		fields: [dailySpecials.chefId],
		references: [chefs.id]
	}),
	productProjection: one(productProjections, {
		fields: [dailySpecials.productId],
		references: [productProjections.id]
	}),
	recipe: one(recipes, {
		fields: [dailySpecials.recipeId],
		references: [recipes.id]
	}),
}));

export const truckLocationsRelations = relations(truckLocations, ({one, many}) => ({
	chef: one(chefs, {
		fields: [truckLocations.tenantId],
		references: [chefs.id]
	}),
	truckSchedules: many(truckSchedule),
}));

export const truckScheduleRelations = relations(truckSchedule, ({one, many}) => ({
	truckLocation: one(truckLocations, {
		fields: [truckSchedule.locationId],
		references: [truckLocations.id]
	}),
	chef: one(chefs, {
		fields: [truckSchedule.tenantId],
		references: [chefs.id]
	}),
	truckPreorders: many(truckPreorders),
}));

export const bakeryBatchesRelations = relations(bakeryBatches, ({one, many}) => ({
	recipe: one(recipes, {
		fields: [bakeryBatches.recipeId],
		references: [recipes.id]
	}),
	chef: one(chefs, {
		fields: [bakeryBatches.tenantId],
		references: [chefs.id]
	}),
	fermentationLogs: many(fermentationLogs),
}));

export const fermentationLogsRelations = relations(fermentationLogs, ({one}) => ({
	bakeryBatch: one(bakeryBatches, {
		fields: [fermentationLogs.batchId],
		references: [bakeryBatches.id]
	}),
	chef: one(chefs, {
		fields: [fermentationLogs.tenantId],
		references: [chefs.id]
	}),
}));

export const bakeryOvensRelations = relations(bakeryOvens, ({one, many}) => ({
	chef: one(chefs, {
		fields: [bakeryOvens.tenantId],
		references: [chefs.id]
	}),
	bakeSchedules: many(bakeSchedule),
}));

export const bakeScheduleRelations = relations(bakeSchedule, ({one, many}) => ({
	bakeryOven: one(bakeryOvens, {
		fields: [bakeSchedule.ovenId],
		references: [bakeryOvens.id]
	}),
	chef: one(chefs, {
		fields: [bakeSchedule.tenantId],
		references: [chefs.id]
	}),
	bakeryYieldRecords: many(bakeryYieldRecords),
}));

export const bakeryYieldRecordsRelations = relations(bakeryYieldRecords, ({one}) => ({
	bakeSchedule: one(bakeSchedule, {
		fields: [bakeryYieldRecords.bakeScheduleId],
		references: [bakeSchedule.id]
	}),
	chef: one(chefs, {
		fields: [bakeryYieldRecords.tenantId],
		references: [chefs.id]
	}),
}));

export const smsMessagesRelations = relations(smsMessages, ({one}) => ({
	chef: one(chefs, {
		fields: [smsMessages.tenantId],
		references: [chefs.id]
	}),
}));

export const giftCardsRelations = relations(giftCards, ({one, many}) => ({
	chef: one(chefs, {
		fields: [giftCards.tenantId],
		references: [chefs.id]
	}),
	giftCardTransactions: many(giftCardTransactions),
}));

export const giftCardTransactionsRelations = relations(giftCardTransactions, ({one}) => ({
	giftCard: one(giftCards, {
		fields: [giftCardTransactions.giftCardId],
		references: [giftCards.id]
	}),
	chef: one(chefs, {
		fields: [giftCardTransactions.tenantId],
		references: [chefs.id]
	}),
}));

export const taxJurisdictionsRelations = relations(taxJurisdictions, ({one, many}) => ({
	chef: one(chefs, {
		fields: [taxJurisdictions.tenantId],
		references: [chefs.id]
	}),
	taxCollecteds: many(taxCollected),
}));

export const taxCollectedRelations = relations(taxCollected, ({one}) => ({
	taxJurisdiction: one(taxJurisdictions, {
		fields: [taxCollected.jurisdictionId],
		references: [taxJurisdictions.id]
	}),
	chef: one(chefs, {
		fields: [taxCollected.tenantId],
		references: [chefs.id]
	}),
}));

export const taxFilingsRelations = relations(taxFilings, ({one}) => ({
	chef: one(chefs, {
		fields: [taxFilings.tenantId],
		references: [chefs.id]
	}),
}));

export const qrCodesRelations = relations(qrCodes, ({one, many}) => ({
	chef: one(chefs, {
		fields: [qrCodes.tenantId],
		references: [chefs.id]
	}),
	qrScans: many(qrScans),
}));

export const qrScansRelations = relations(qrScans, ({one}) => ({
	qrCode: one(qrCodes, {
		fields: [qrScans.qrCodeId],
		references: [qrCodes.id]
	}),
	chef: one(chefs, {
		fields: [qrScans.tenantId],
		references: [chefs.id]
	}),
}));

export const entityTemplatesRelations = relations(entityTemplates, ({one}) => ({
	chef: one(chefs, {
		fields: [entityTemplates.tenantId],
		references: [chefs.id]
	}),
}));

export const ingredientShelfLifeDefaultsRelations = relations(ingredientShelfLifeDefaults, ({one}) => ({
	chef: one(chefs, {
		fields: [ingredientShelfLifeDefaults.tenantId],
		references: [chefs.id]
	}),
}));

export const businessLocationsRelations = relations(businessLocations, ({one, many}) => ({
	chef: one(chefs, {
		fields: [businessLocations.tenantId],
		references: [chefs.id]
	}),
	inventoryCounts: many(inventoryCounts),
	sales: many(sales),
	dailyChecklistCompletions: many(dailyChecklistCompletions),
	inventoryLots: many(inventoryLots),
	staffMembers: many(staffMembers),
}));

export const inventoryCountsRelations = relations(inventoryCounts, ({one}) => ({
	chef: one(chefs, {
		fields: [inventoryCounts.chefId],
		references: [chefs.id]
	}),
	ingredient: one(ingredients, {
		fields: [inventoryCounts.ingredientId],
		references: [ingredients.id]
	}),
	businessLocation: one(businessLocations, {
		fields: [inventoryCounts.locationId],
		references: [businessLocations.id]
	}),
	vendor: one(vendors, {
		fields: [inventoryCounts.vendorId],
		references: [vendors.id]
	}),
}));

export const dailyChecklistCompletionsRelations = relations(dailyChecklistCompletions, ({one}) => ({
	chef: one(chefs, {
		fields: [dailyChecklistCompletions.chefId],
		references: [chefs.id]
	}),
	businessLocation: one(businessLocations, {
		fields: [dailyChecklistCompletions.locationId],
		references: [businessLocations.id]
	}),
}));

export const inventoryLotsRelations = relations(inventoryLots, ({one}) => ({
	businessLocation: one(businessLocations, {
		fields: [inventoryLots.locationId],
		references: [businessLocations.id]
	}),
	chef: one(chefs, {
		fields: [inventoryLots.tenantId],
		references: [chefs.id]
	}),
}));

export const communicationLogRelations = relations(communicationLog, ({one}) => ({
	client: one(clients, {
		fields: [communicationLog.clientId],
		references: [clients.id]
	}),
	chef: one(chefs, {
		fields: [communicationLog.tenantId],
		references: [chefs.id]
	}),
}));

export const staffClockEntriesRelations = relations(staffClockEntries, ({one}) => ({
	chef: one(chefs, {
		fields: [staffClockEntries.chefId],
		references: [chefs.id]
	}),
	event: one(events, {
		fields: [staffClockEntries.eventId],
		references: [events.id]
	}),
	staffMember: one(staffMembers, {
		fields: [staffClockEntries.staffMemberId],
		references: [staffMembers.id]
	}),
}));

export const permitsRelations = relations(permits, ({one}) => ({
	chef: one(chefs, {
		fields: [permits.tenantId],
		references: [chefs.id]
	}),
}));

export const vehicleMaintenanceRelations = relations(vehicleMaintenance, ({one}) => ({
	chef: one(chefs, {
		fields: [vehicleMaintenance.tenantId],
		references: [chefs.id]
	}),
}));

export const bakeryOrdersRelations = relations(bakeryOrders, ({one}) => ({
	client: one(clients, {
		fields: [bakeryOrders.clientId],
		references: [clients.id]
	}),
	chef: one(chefs, {
		fields: [bakeryOrders.tenantId],
		references: [chefs.id]
	}),
}));

export const wholesaleAccountsRelations = relations(wholesaleAccounts, ({one, many}) => ({
	chef: one(chefs, {
		fields: [wholesaleAccounts.tenantId],
		references: [chefs.id]
	}),
	wholesaleOrders: many(wholesaleOrders),
}));

export const wholesaleOrdersRelations = relations(wholesaleOrders, ({one}) => ({
	wholesaleAccount: one(wholesaleAccounts, {
		fields: [wholesaleOrders.accountId],
		references: [wholesaleAccounts.id]
	}),
	chef: one(chefs, {
		fields: [wholesaleOrders.tenantId],
		references: [chefs.id]
	}),
}));

export const bakeryTastingsRelations = relations(bakeryTastings, ({one}) => ({
	chef: one(chefs, {
		fields: [bakeryTastings.tenantId],
		references: [chefs.id]
	}),
}));

export const bakerySeasonalItemsRelations = relations(bakerySeasonalItems, ({one}) => ({
	chef: one(chefs, {
		fields: [bakerySeasonalItems.tenantId],
		references: [chefs.id]
	}),
}));

export const displayCaseItemsRelations = relations(displayCaseItems, ({one}) => ({
	chef: one(chefs, {
		fields: [displayCaseItems.tenantId],
		references: [chefs.id]
	}),
}));

export const bakeryParStockRelations = relations(bakeryParStock, ({one}) => ({
	chef: one(chefs, {
		fields: [bakeryParStock.tenantId],
		references: [chefs.id]
	}),
}));

export const bakeryProductionLogRelations = relations(bakeryProductionLog, ({one}) => ({
	chef: one(chefs, {
		fields: [bakeryProductionLog.tenantId],
		references: [chefs.id]
	}),
}));

export const feedbackResponsesRelations = relations(feedbackResponses, ({one}) => ({
	feedbackRequest: one(feedbackRequests, {
		fields: [feedbackResponses.requestId],
		references: [feedbackRequests.id]
	}),
	chef: one(chefs, {
		fields: [feedbackResponses.tenantId],
		references: [chefs.id]
	}),
}));

export const feedbackRequestsRelations = relations(feedbackRequests, ({one, many}) => ({
	feedbackResponses: many(feedbackResponses),
	client: one(clients, {
		fields: [feedbackRequests.clientId],
		references: [clients.id]
	}),
	chef: one(chefs, {
		fields: [feedbackRequests.tenantId],
		references: [chefs.id]
	}),
}));

export const googleConnectionsRelations = relations(googleConnections, ({one}) => ({
	chef_chefId: one(chefs, {
		fields: [googleConnections.chefId],
		references: [chefs.id],
		relationName: "googleConnections_chefId_chefs_id"
	}),
	chef_tenantId: one(chefs, {
		fields: [googleConnections.tenantId],
		references: [chefs.id],
		relationName: "googleConnections_tenantId_chefs_id"
	}),
}));

export const documentIntelligenceJobsRelations = relations(documentIntelligenceJobs, ({one, many}) => ({
	chef: one(chefs, {
		fields: [documentIntelligenceJobs.tenantId],
		references: [chefs.id]
	}),
	documentIntelligenceItems: many(documentIntelligenceItems),
}));

export const documentIntelligenceItemsRelations = relations(documentIntelligenceItems, ({one}) => ({
	documentIntelligenceJob: one(documentIntelligenceJobs, {
		fields: [documentIntelligenceItems.jobId],
		references: [documentIntelligenceJobs.id]
	}),
	chef: one(chefs, {
		fields: [documentIntelligenceItems.tenantId],
		references: [chefs.id]
	}),
}));

export const googleMailboxesRelations = relations(googleMailboxes, ({one, many}) => ({
	chef_chefId: one(chefs, {
		fields: [googleMailboxes.chefId],
		references: [chefs.id],
		relationName: "googleMailboxes_chefId_chefs_id"
	}),
	chef_tenantId: one(chefs, {
		fields: [googleMailboxes.tenantId],
		references: [chefs.id],
		relationName: "googleMailboxes_tenantId_chefs_id"
	}),
	gmailSyncLogs: many(gmailSyncLog),
	gmailHistoricalFindings: many(gmailHistoricalFindings),
	messages: many(messages),
}));

export const messagesRelations = relations(messages, ({one, many}) => ({
	gmailSyncLogs: many(gmailSyncLog),
	event: one(events, {
		fields: [messages.eventId],
		references: [events.id]
	}),
	usersInAuth_approvedBy: one(usersInAuth, {
		fields: [messages.approvedBy],
		references: [usersInAuth.id],
		relationName: "messages_approvedBy_usersInAuth_id"
	}),
	client: one(clients, {
		fields: [messages.clientId],
		references: [clients.id]
	}),
	conversationThread: one(conversationThreads, {
		fields: [messages.conversationThreadId],
		references: [conversationThreads.id]
	}),
	usersInAuth_fromUserId: one(usersInAuth, {
		fields: [messages.fromUserId],
		references: [usersInAuth.id],
		relationName: "messages_fromUserId_usersInAuth_id"
	}),
	inquiry: one(inquiries, {
		fields: [messages.inquiryId],
		references: [inquiries.id]
	}),
	googleMailbox: one(googleMailboxes, {
		fields: [messages.mailboxId],
		references: [googleMailboxes.id]
	}),
	chef: one(chefs, {
		fields: [messages.tenantId],
		references: [chefs.id]
	}),
	usersInAuth_toUserId: one(usersInAuth, {
		fields: [messages.toUserId],
		references: [usersInAuth.id],
		relationName: "messages_toUserId_usersInAuth_id"
	}),
}));

export const gmailHistoricalFindingsRelations = relations(gmailHistoricalFindings, ({one}) => ({
	chef_chefId: one(chefs, {
		fields: [gmailHistoricalFindings.chefId],
		references: [chefs.id],
		relationName: "gmailHistoricalFindings_chefId_chefs_id"
	}),
	inquiry: one(inquiries, {
		fields: [gmailHistoricalFindings.importedInquiryId],
		references: [inquiries.id]
	}),
	googleMailbox: one(googleMailboxes, {
		fields: [gmailHistoricalFindings.mailboxId],
		references: [googleMailboxes.id]
	}),
	chef_tenantId: one(chefs, {
		fields: [gmailHistoricalFindings.tenantId],
		references: [chefs.id],
		relationName: "gmailHistoricalFindings_tenantId_chefs_id"
	}),
}));

export const platformRecordsRelations = relations(platformRecords, ({one, many}) => ({
	client: one(clients, {
		fields: [platformRecords.clientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [platformRecords.eventId],
		references: [events.id]
	}),
	inquiry: one(inquiries, {
		fields: [platformRecords.inquiryId],
		references: [inquiries.id]
	}),
	chef: one(chefs, {
		fields: [platformRecords.tenantId],
		references: [chefs.id]
	}),
	platformSnapshots: many(platformSnapshots),
	platformActionLogs: many(platformActionLog),
	platformPayouts: many(platformPayouts),
}));

export const platformSnapshotsRelations = relations(platformSnapshots, ({one}) => ({
	event: one(events, {
		fields: [platformSnapshots.eventId],
		references: [events.id]
	}),
	inquiry: one(inquiries, {
		fields: [platformSnapshots.inquiryId],
		references: [inquiries.id]
	}),
	platformRecord: one(platformRecords, {
		fields: [platformSnapshots.platformRecordId],
		references: [platformRecords.id]
	}),
	chef: one(chefs, {
		fields: [platformSnapshots.tenantId],
		references: [chefs.id]
	}),
}));

export const platformActionLogRelations = relations(platformActionLog, ({one}) => ({
	event: one(events, {
		fields: [platformActionLog.eventId],
		references: [events.id]
	}),
	inquiry: one(inquiries, {
		fields: [platformActionLog.inquiryId],
		references: [inquiries.id]
	}),
	platformRecord: one(platformRecords, {
		fields: [platformActionLog.platformRecordId],
		references: [platformRecords.id]
	}),
	chef: one(chefs, {
		fields: [platformActionLog.tenantId],
		references: [chefs.id]
	}),
}));

export const platformPayoutsRelations = relations(platformPayouts, ({one}) => ({
	event: one(events, {
		fields: [platformPayouts.eventId],
		references: [events.id]
	}),
	inquiry: one(inquiries, {
		fields: [platformPayouts.inquiryId],
		references: [inquiries.id]
	}),
	platformRecord: one(platformRecords, {
		fields: [platformPayouts.platformRecordId],
		references: [platformRecords.id]
	}),
	chef: one(chefs, {
		fields: [platformPayouts.tenantId],
		references: [chefs.id]
	}),
}));

export const betaSignupTrackersRelations = relations(betaSignupTrackers, ({one}) => ({
	chef: one(chefs, {
		fields: [betaSignupTrackers.chefId],
		references: [chefs.id]
	}),
	betaSignup: one(betaSignups, {
		fields: [betaSignupTrackers.signupId],
		references: [betaSignups.id]
	}),
}));

export const betaSignupsRelations = relations(betaSignups, ({many}) => ({
	betaSignupTrackers: many(betaSignupTrackers),
}));

export const outreachCampaignsRelations = relations(outreachCampaigns, ({one, many}) => ({
	chef: one(chefs, {
		fields: [outreachCampaigns.chefId],
		references: [chefs.id]
	}),
	prospects: many(prospects),
}));

export const eventSiteAssessmentsRelations = relations(eventSiteAssessments, ({one}) => ({
	chef: one(chefs, {
		fields: [eventSiteAssessments.chefId],
		references: [chefs.id]
	}),
	event: one(events, {
		fields: [eventSiteAssessments.eventId],
		references: [events.id]
	}),
}));

export const waitlistEntriesRelations = relations(waitlistEntries, ({one}) => ({
	chef: one(chefs, {
		fields: [waitlistEntries.chefId],
		references: [chefs.id]
	}),
	client: one(clients, {
		fields: [waitlistEntries.clientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [waitlistEntries.convertedEventId],
		references: [events.id]
	}),
}));

export const complianceTempLogsRelations = relations(complianceTempLogs, ({one}) => ({
	chef: one(chefs, {
		fields: [complianceTempLogs.chefId],
		references: [chefs.id]
	}),
}));

export const complianceCleaningLogsRelations = relations(complianceCleaningLogs, ({one}) => ({
	chef: one(chefs, {
		fields: [complianceCleaningLogs.chefId],
		references: [chefs.id]
	}),
}));

export const truckPreordersRelations = relations(truckPreorders, ({one}) => ({
	truckSchedule: one(truckSchedule, {
		fields: [truckPreorders.scheduleId],
		references: [truckSchedule.id]
	}),
	chef: one(chefs, {
		fields: [truckPreorders.tenantId],
		references: [chefs.id]
	}),
}));

export const entityPhotosRelations = relations(entityPhotos, ({one}) => ({
	chef: one(chefs, {
		fields: [entityPhotos.tenantId],
		references: [chefs.id]
	}),
}));

export const sopsRelations = relations(sops, ({one, many}) => ({
	chef: one(chefs, {
		fields: [sops.tenantId],
		references: [chefs.id]
	}),
	sopCompletions: many(sopCompletions),
}));

export const sopCompletionsRelations = relations(sopCompletions, ({one}) => ({
	sop: one(sops, {
		fields: [sopCompletions.sopId],
		references: [sops.id]
	}),
	staffMember: one(staffMembers, {
		fields: [sopCompletions.staffMemberId],
		references: [staffMembers.id]
	}),
	chef: one(chefs, {
		fields: [sopCompletions.tenantId],
		references: [chefs.id]
	}),
}));

export const stocktakesRelations = relations(stocktakes, ({one, many}) => ({
	chef: one(chefs, {
		fields: [stocktakes.tenantId],
		references: [chefs.id]
	}),
	stocktakeItems: many(stocktakeItems),
}));

export const stocktakeItemsRelations = relations(stocktakeItems, ({one}) => ({
	stocktake: one(stocktakes, {
		fields: [stocktakeItems.stocktakeId],
		references: [stocktakes.id]
	}),
	chef: one(chefs, {
		fields: [stocktakeItems.tenantId],
		references: [chefs.id]
	}),
}));

export const reorderSettingsRelations = relations(reorderSettings, ({one}) => ({
	chef: one(chefs, {
		fields: [reorderSettings.chefId],
		references: [chefs.id]
	}),
	vendor: one(vendors, {
		fields: [reorderSettings.preferredVendorId],
		references: [vendors.id]
	}),
}));

export const tipEntriesRelations = relations(tipEntries, ({one}) => ({
	staffMember: one(staffMembers, {
		fields: [tipEntries.staffMemberId],
		references: [staffMembers.id]
	}),
	chef: one(chefs, {
		fields: [tipEntries.tenantId],
		references: [chefs.id]
	}),
}));

export const tipPoolConfigsRelations = relations(tipPoolConfigs, ({one, many}) => ({
	chef: one(chefs, {
		fields: [tipPoolConfigs.tenantId],
		references: [chefs.id]
	}),
	tipDistributions: many(tipDistributions),
}));

export const tipDistributionsRelations = relations(tipDistributions, ({one}) => ({
	tipPoolConfig: one(tipPoolConfigs, {
		fields: [tipDistributions.poolConfigId],
		references: [tipPoolConfigs.id]
	}),
	staffMember: one(staffMembers, {
		fields: [tipDistributions.staffMemberId],
		references: [staffMembers.id]
	}),
	chef: one(chefs, {
		fields: [tipDistributions.tenantId],
		references: [chefs.id]
	}),
}));

export const shiftTemplatesRelations = relations(shiftTemplates, ({one, many}) => ({
	chef: one(chefs, {
		fields: [shiftTemplates.tenantId],
		references: [chefs.id]
	}),
	scheduledShifts: many(scheduledShifts),
}));

export const scheduledShiftsRelations = relations(scheduledShifts, ({one, many}) => ({
	staffMember: one(staffMembers, {
		fields: [scheduledShifts.staffMemberId],
		references: [staffMembers.id]
	}),
	shiftTemplate: one(shiftTemplates, {
		fields: [scheduledShifts.templateId],
		references: [shiftTemplates.id]
	}),
	chef: one(chefs, {
		fields: [scheduledShifts.tenantId],
		references: [chefs.id]
	}),
	shiftSwapRequests: many(shiftSwapRequests),
}));

export const shiftSwapRequestsRelations = relations(shiftSwapRequests, ({one}) => ({
	staffMember_coveringStaffId: one(staffMembers, {
		fields: [shiftSwapRequests.coveringStaffId],
		references: [staffMembers.id],
		relationName: "shiftSwapRequests_coveringStaffId_staffMembers_id"
	}),
	staffMember_requestingStaffId: one(staffMembers, {
		fields: [shiftSwapRequests.requestingStaffId],
		references: [staffMembers.id],
		relationName: "shiftSwapRequests_requestingStaffId_staffMembers_id"
	}),
	scheduledShift: one(scheduledShifts, {
		fields: [shiftSwapRequests.shiftId],
		references: [scheduledShifts.id]
	}),
	chef: one(chefs, {
		fields: [shiftSwapRequests.tenantId],
		references: [chefs.id]
	}),
}));

export const productPublicMediaLinksRelations = relations(productPublicMediaLinks, ({one}) => ({
	productProjection: one(productProjections, {
		fields: [productPublicMediaLinks.productId],
		references: [productProjections.id]
	}),
	publicMediaAsset: one(publicMediaAssets, {
		fields: [productPublicMediaLinks.publicMediaAssetId],
		references: [publicMediaAssets.id]
	}),
	chef: one(chefs, {
		fields: [productPublicMediaLinks.tenantId],
		references: [chefs.id]
	}),
}));

export const publicMediaAssetsRelations = relations(publicMediaAssets, ({many}) => ({
	productPublicMediaLinks: many(productPublicMediaLinks),
}));

export const eventReadinessGatesRelations = relations(eventReadinessGates, ({one}) => ({
	event: one(events, {
		fields: [eventReadinessGates.eventId],
		references: [events.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [eventReadinessGates.overriddenBy],
		references: [usersInAuth.id]
	}),
	chef: one(chefs, {
		fields: [eventReadinessGates.tenantId],
		references: [chefs.id]
	}),
}));

export const dopTaskCompletionsRelations = relations(dopTaskCompletions, ({one}) => ({
	event: one(events, {
		fields: [dopTaskCompletions.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [dopTaskCompletions.tenantId],
		references: [chefs.id]
	}),
}));

export const packingConfirmationsRelations = relations(packingConfirmations, ({one}) => ({
	event: one(events, {
		fields: [packingConfirmations.eventId],
		references: [events.id]
	}),
}));

export const rebookTokensRelations = relations(rebookTokens, ({one}) => ({
	client: one(clients, {
		fields: [rebookTokens.clientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [rebookTokens.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [rebookTokens.tenantId],
		references: [chefs.id]
	}),
}));

export const guestEventProfileRelations = relations(guestEventProfile, ({one}) => ({
	event: one(events, {
		fields: [guestEventProfile.eventId],
		references: [events.id]
	}),
}));

export const eventTemplatesRelations = relations(eventTemplates, ({one}) => ({
	chef: one(chefs, {
		fields: [eventTemplates.tenantId],
		references: [chefs.id]
	}),
}));

export const clientPreferencesRelations = relations(clientPreferences, ({one}) => ({
	client: one(clients, {
		fields: [clientPreferences.clientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [clientPreferences.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [clientPreferences.tenantId],
		references: [chefs.id]
	}),
}));

export const clientKitchenInventoryRelations = relations(clientKitchenInventory, ({one}) => ({
	client: one(clients, {
		fields: [clientKitchenInventory.clientId],
		references: [clients.id]
	}),
	chef: one(chefs, {
		fields: [clientKitchenInventory.tenantId],
		references: [chefs.id]
	}),
}));

export const chefEquipmentMasterRelations = relations(chefEquipmentMaster, ({one}) => ({
	chef: one(chefs, {
		fields: [chefEquipmentMaster.tenantId],
		references: [chefs.id]
	}),
}));

export const chefCapacitySettingsRelations = relations(chefCapacitySettings, ({one}) => ({
	chef: one(chefs, {
		fields: [chefCapacitySettings.tenantId],
		references: [chefs.id]
	}),
}));

export const eventWasteLogsRelations = relations(eventWasteLogs, ({one}) => ({
	event: one(events, {
		fields: [eventWasteLogs.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [eventWasteLogs.tenantId],
		references: [chefs.id]
	}),
}));

export const cancellationPoliciesRelations = relations(cancellationPolicies, ({one}) => ({
	chef: one(chefs, {
		fields: [cancellationPolicies.chefId],
		references: [chefs.id]
	}),
}));

export const expenseTaxCategoriesRelations = relations(expenseTaxCategories, ({one}) => ({
	chef: one(chefs, {
		fields: [expenseTaxCategories.tenantId],
		references: [chefs.id]
	}),
}));

export const clientReferralsRelations = relations(clientReferrals, ({one}) => ({
	event: one(events, {
		fields: [clientReferrals.convertedEventId],
		references: [events.id]
	}),
	inquiry: one(inquiries, {
		fields: [clientReferrals.inquiryId],
		references: [inquiries.id]
	}),
	client_referredClientId: one(clients, {
		fields: [clientReferrals.referredClientId],
		references: [clients.id],
		relationName: "clientReferrals_referredClientId_clients_id"
	}),
	client_referrerClientId: one(clients, {
		fields: [clientReferrals.referrerClientId],
		references: [clients.id],
		relationName: "clientReferrals_referrerClientId_clients_id"
	}),
	chef: one(chefs, {
		fields: [clientReferrals.tenantId],
		references: [chefs.id]
	}),
}));

export const recurringSchedulesRelations = relations(recurringSchedules, ({one}) => ({
	client: one(clients, {
		fields: [recurringSchedules.clientId],
		references: [clients.id]
	}),
	menu: one(menus, {
		fields: [recurringSchedules.menuId],
		references: [menus.id]
	}),
	chef: one(chefs, {
		fields: [recurringSchedules.tenantId],
		references: [chefs.id]
	}),
}));

export const chefCertificationsRelations = relations(chefCertifications, ({one}) => ({
	chef_chefId: one(chefs, {
		fields: [chefCertifications.chefId],
		references: [chefs.id],
		relationName: "chefCertifications_chefId_chefs_id"
	}),
	chef_tenantId: one(chefs, {
		fields: [chefCertifications.tenantId],
		references: [chefs.id],
		relationName: "chefCertifications_tenantId_chefs_id"
	}),
}));

export const testimonialsRelations = relations(testimonials, ({one}) => ({
	client: one(clients, {
		fields: [testimonials.clientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [testimonials.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [testimonials.tenantId],
		references: [chefs.id]
	}),
}));

export const mileageLogsRelations = relations(mileageLogs, ({one}) => ({
	chef_chefId: one(chefs, {
		fields: [mileageLogs.chefId],
		references: [chefs.id],
		relationName: "mileageLogs_chefId_chefs_id"
	}),
	event: one(events, {
		fields: [mileageLogs.eventId],
		references: [events.id]
	}),
	chef_tenantId: one(chefs, {
		fields: [mileageLogs.tenantId],
		references: [chefs.id],
		relationName: "mileageLogs_tenantId_chefs_id"
	}),
}));

export const clientNdasRelations = relations(clientNdas, ({one}) => ({
	client: one(clients, {
		fields: [clientNdas.clientId],
		references: [clients.id]
	}),
	chef: one(chefs, {
		fields: [clientNdas.tenantId],
		references: [chefs.id]
	}),
}));

export const cookingClassesRelations = relations(cookingClasses, ({one, many}) => ({
	menu: one(menus, {
		fields: [cookingClasses.menuId],
		references: [menus.id]
	}),
	chef: one(chefs, {
		fields: [cookingClasses.tenantId],
		references: [chefs.id]
	}),
	classRegistrations: many(classRegistrations),
}));

export const classRegistrationsRelations = relations(classRegistrations, ({one}) => ({
	cookingClass: one(cookingClasses, {
		fields: [classRegistrations.classId],
		references: [cookingClasses.id]
	}),
	chef: one(chefs, {
		fields: [classRegistrations.tenantId],
		references: [chefs.id]
	}),
}));

export const chefDepositSettingsRelations = relations(chefDepositSettings, ({one}) => ({
	chef: one(chefs, {
		fields: [chefDepositSettings.chefId],
		references: [chefs.id]
	}),
}));

export const experiencePackagesRelations = relations(experiencePackages, ({one}) => ({
	menu: one(menus, {
		fields: [experiencePackages.menuId],
		references: [menus.id]
	}),
	chef: one(chefs, {
		fields: [experiencePackages.tenantId],
		references: [chefs.id]
	}),
}));

export const pantryLocationsRelations = relations(pantryLocations, ({one, many}) => ({
	client: one(clients, {
		fields: [pantryLocations.clientId],
		references: [clients.id]
	}),
	chef: one(chefs, {
		fields: [pantryLocations.tenantId],
		references: [chefs.id]
	}),
	pantryItems: many(pantryItems),
}));

export const pantryItemsRelations = relations(pantryItems, ({one}) => ({
	ingredient: one(ingredients, {
		fields: [pantryItems.ingredientId],
		references: [ingredients.id]
	}),
	pantryLocation: one(pantryLocations, {
		fields: [pantryItems.locationId],
		references: [pantryLocations.id]
	}),
	chef: one(chefs, {
		fields: [pantryItems.tenantId],
		references: [chefs.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [pantryItems.updatedBy],
		references: [usersInAuth.id]
	}),
}));

export const chefSeasonalAvailabilityRelations = relations(chefSeasonalAvailability, ({one}) => ({
	chef: one(chefs, {
		fields: [chefSeasonalAvailability.chefId],
		references: [chefs.id]
	}),
}));

export const eventPhotosRelations = relations(eventPhotos, ({one}) => ({
	client: one(clients, {
		fields: [eventPhotos.clientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [eventPhotos.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [eventPhotos.tenantId],
		references: [chefs.id]
	}),
	usersInAuth: one(usersInAuth, {
		fields: [eventPhotos.uploadedBy],
		references: [usersInAuth.id]
	}),
}));

export const clientGiftLogRelations = relations(clientGiftLog, ({one}) => ({
	chef: one(chefs, {
		fields: [clientGiftLog.chefId],
		references: [chefs.id]
	}),
	client: one(clients, {
		fields: [clientGiftLog.clientId],
		references: [clients.id]
	}),
}));

export const clientFollowupRulesRelations = relations(clientFollowupRules, ({one}) => ({
	chef: one(chefs, {
		fields: [clientFollowupRules.chefId],
		references: [chefs.id]
	}),
}));

export const groceryPriceEntriesRelations = relations(groceryPriceEntries, ({one}) => ({
	chef: one(chefs, {
		fields: [groceryPriceEntries.chefId],
		references: [chefs.id]
	}),
}));

export const tastingMenusRelations = relations(tastingMenus, ({one, many}) => ({
	chef: one(chefs, {
		fields: [tastingMenus.chefId],
		references: [chefs.id]
	}),
	tastingMenuCourses: many(tastingMenuCourses),
}));

export const tastingMenuCoursesRelations = relations(tastingMenuCourses, ({one}) => ({
	recipe: one(recipes, {
		fields: [tastingMenuCourses.recipeId],
		references: [recipes.id]
	}),
	tastingMenu: one(tastingMenus, {
		fields: [tastingMenuCourses.tastingMenuId],
		references: [tastingMenus.id]
	}),
}));

export const menuServiceHistoryRelations = relations(menuServiceHistory, ({one}) => ({
	chef: one(chefs, {
		fields: [menuServiceHistory.chefId],
		references: [chefs.id]
	}),
	client: one(clients, {
		fields: [menuServiceHistory.clientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [menuServiceHistory.eventId],
		references: [events.id]
	}),
}));

export const seasonalAvailabilityPeriodsRelations = relations(seasonalAvailabilityPeriods, ({one}) => ({
	chef: one(chefs, {
		fields: [seasonalAvailabilityPeriods.chefId],
		references: [chefs.id]
	}),
}));

export const groceryTripsRelations = relations(groceryTrips, ({one, many}) => ({
	chef: one(chefs, {
		fields: [groceryTrips.chefId],
		references: [chefs.id]
	}),
	groceryTripItems: many(groceryTripItems),
	groceryTripSplits: many(groceryTripSplits),
}));

export const groceryTripItemsRelations = relations(groceryTripItems, ({one, many}) => ({
	groceryTrip: one(groceryTrips, {
		fields: [groceryTripItems.tripId],
		references: [groceryTrips.id]
	}),
	groceryTripSplits: many(groceryTripSplits),
}));

export const groceryTripSplitsRelations = relations(groceryTripSplits, ({one}) => ({
	client: one(clients, {
		fields: [groceryTripSplits.clientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [groceryTripSplits.eventId],
		references: [events.id]
	}),
	groceryTripItem: one(groceryTripItems, {
		fields: [groceryTripSplits.itemId],
		references: [groceryTripItems.id]
	}),
	groceryTrip: one(groceryTrips, {
		fields: [groceryTripSplits.tripId],
		references: [groceryTrips.id]
	}),
}));

export const chefEquipmentRelations = relations(chefEquipment, ({one, many}) => ({
	chef: one(chefs, {
		fields: [chefEquipment.chefId],
		references: [chefs.id]
	}),
	packingChecklistItems: many(packingChecklistItems),
}));

export const packingChecklistsRelations = relations(packingChecklists, ({one, many}) => ({
	chef: one(chefs, {
		fields: [packingChecklists.chefId],
		references: [chefs.id]
	}),
	client: one(clients, {
		fields: [packingChecklists.clientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [packingChecklists.eventId],
		references: [events.id]
	}),
	packingChecklistItems: many(packingChecklistItems),
}));

export const packingChecklistItemsRelations = relations(packingChecklistItems, ({one}) => ({
	packingChecklist: one(packingChecklists, {
		fields: [packingChecklistItems.checklistId],
		references: [packingChecklists.id]
	}),
	chefEquipment: one(chefEquipment, {
		fields: [packingChecklistItems.equipmentId],
		references: [chefEquipment.id]
	}),
}));

export const dietaryChangeLogRelations = relations(dietaryChangeLog, ({one}) => ({
	chef: one(chefs, {
		fields: [dietaryChangeLog.chefId],
		references: [chefs.id]
	}),
	client: one(clients, {
		fields: [dietaryChangeLog.clientId],
		references: [clients.id]
	}),
}));

export const smartGroceryListsRelations = relations(smartGroceryLists, ({one, many}) => ({
	chef: one(chefs, {
		fields: [smartGroceryLists.chefId],
		references: [chefs.id]
	}),
	event: one(events, {
		fields: [smartGroceryLists.eventId],
		references: [events.id]
	}),
	smartGroceryItems: many(smartGroceryItems),
}));

export const smartGroceryItemsRelations = relations(smartGroceryItems, ({one}) => ({
	smartGroceryList: one(smartGroceryLists, {
		fields: [smartGroceryItems.listId],
		references: [smartGroceryLists.id]
	}),
}));

export const aislePreferencesRelations = relations(aislePreferences, ({one}) => ({
	chef: one(chefs, {
		fields: [aislePreferences.chefId],
		references: [chefs.id]
	}),
}));

export const chefPreferredStoresRelations = relations(chefPreferredStores, ({one, many}) => ({
	chef: one(chefs, {
		fields: [chefPreferredStores.chefId],
		references: [chefs.id]
	}),
	storeItemAssignments: many(storeItemAssignments),
}));

export const storeItemAssignmentsRelations = relations(storeItemAssignments, ({one}) => ({
	chef: one(chefs, {
		fields: [storeItemAssignments.chefId],
		references: [chefs.id]
	}),
	chefPreferredStore: one(chefPreferredStores, {
		fields: [storeItemAssignments.storeId],
		references: [chefPreferredStores.id]
	}),
}));

export const emailSequencesRelations = relations(emailSequences, ({one, many}) => ({
	chef: one(chefs, {
		fields: [emailSequences.chefId],
		references: [chefs.id]
	}),
	emailSequenceSteps: many(emailSequenceSteps),
	emailSequenceEnrollments: many(emailSequenceEnrollments),
}));

export const emailSequenceStepsRelations = relations(emailSequenceSteps, ({one}) => ({
	emailSequence: one(emailSequences, {
		fields: [emailSequenceSteps.sequenceId],
		references: [emailSequences.id]
	}),
}));

export const emailSequenceEnrollmentsRelations = relations(emailSequenceEnrollments, ({one}) => ({
	chef: one(chefs, {
		fields: [emailSequenceEnrollments.chefId],
		references: [chefs.id]
	}),
	client: one(clients, {
		fields: [emailSequenceEnrollments.clientId],
		references: [clients.id]
	}),
	emailSequence: one(emailSequences, {
		fields: [emailSequenceEnrollments.sequenceId],
		references: [emailSequences.id]
	}),
}));

export const sourcingEntriesRelations = relations(sourcingEntries, ({one}) => ({
	chef: one(chefs, {
		fields: [sourcingEntries.chefId],
		references: [chefs.id]
	}),
	event: one(events, {
		fields: [sourcingEntries.eventId],
		references: [events.id]
	}),
}));

export const featureRequestsRelations = relations(featureRequests, ({one, many}) => ({
	chef: one(chefs, {
		fields: [featureRequests.submittedBy],
		references: [chefs.id]
	}),
	featureVotes: many(featureVotes),
}));

export const featureVotesRelations = relations(featureVotes, ({one}) => ({
	chef: one(chefs, {
		fields: [featureVotes.chefId],
		references: [chefs.id]
	}),
	featureRequest: one(featureRequests, {
		fields: [featureVotes.featureId],
		references: [featureRequests.id]
	}),
}));

export const recipeStepPhotosRelations = relations(recipeStepPhotos, ({one}) => ({
	chef: one(chefs, {
		fields: [recipeStepPhotos.chefId],
		references: [chefs.id]
	}),
	recipe: one(recipes, {
		fields: [recipeStepPhotos.recipeId],
		references: [recipes.id]
	}),
}));

export const socialTemplatesRelations = relations(socialTemplates, ({one}) => ({
	chef: one(chefs, {
		fields: [socialTemplates.chefId],
		references: [chefs.id]
	}),
}));

export const vaTasksRelations = relations(vaTasks, ({one}) => ({
	chef: one(chefs, {
		fields: [vaTasks.chefId],
		references: [chefs.id]
	}),
}));

export const mealPrepItemsRelations = relations(mealPrepItems, ({one}) => ({
	chef: one(chefs, {
		fields: [mealPrepItems.chefId],
		references: [chefs.id]
	}),
}));

export const mealPrepOrdersRelations = relations(mealPrepOrders, ({one}) => ({
	chef: one(chefs, {
		fields: [mealPrepOrders.chefId],
		references: [chefs.id]
	}),
}));

export const mealPrepWindowsRelations = relations(mealPrepWindows, ({one}) => ({
	chef: one(chefs, {
		fields: [mealPrepWindows.chefId],
		references: [chefs.id]
	}),
}));

export const eventFeedbackRelations = relations(eventFeedback, ({one}) => ({
	chef: one(chefs, {
		fields: [eventFeedback.chefId],
		references: [chefs.id]
	}),
	client: one(clients, {
		fields: [eventFeedback.clientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [eventFeedback.eventId],
		references: [events.id]
	}),
}));

export const vendorPriceEntriesRelations = relations(vendorPriceEntries, ({one}) => ({
	chef: one(chefs, {
		fields: [vendorPriceEntries.chefId],
		references: [chefs.id]
	}),
	vendor: one(vendors, {
		fields: [vendorPriceEntries.vendorId],
		references: [vendors.id]
	}),
}));

export const staffSchedulesRelations = relations(staffSchedules, ({one}) => ({
	chef: one(chefs, {
		fields: [staffSchedules.chefId],
		references: [chefs.id]
	}),
	event: one(events, {
		fields: [staffSchedules.eventId],
		references: [events.id]
	}),
	staffMember: one(staffMembers, {
		fields: [staffSchedules.staffMemberId],
		references: [staffMembers.id]
	}),
}));

export const staffAvailabilityRelations = relations(staffAvailability, ({one}) => ({
	chef_chefId: one(chefs, {
		fields: [staffAvailability.chefId],
		references: [chefs.id],
		relationName: "staffAvailability_chefId_chefs_id"
	}),
	staffMember: one(staffMembers, {
		fields: [staffAvailability.staffMemberId],
		references: [staffMembers.id]
	}),
	chef_tenantId: one(chefs, {
		fields: [staffAvailability.tenantId],
		references: [chefs.id],
		relationName: "staffAvailability_tenantId_chefs_id"
	}),
}));

export const insurancePoliciesRelations = relations(insurancePolicies, ({one}) => ({
	chef: one(chefs, {
		fields: [insurancePolicies.chefId],
		references: [chefs.id]
	}),
}));

export const onboardingProgressRelations = relations(onboardingProgress, ({one}) => ({
	chef: one(chefs, {
		fields: [onboardingProgress.chefId],
		references: [chefs.id]
	}),
}));

export const insuranceClaimsRelations = relations(insuranceClaims, ({one}) => ({
	chef: one(chefs, {
		fields: [insuranceClaims.chefId],
		references: [chefs.id]
	}),
	event: one(events, {
		fields: [insuranceClaims.eventId],
		references: [events.id]
	}),
}));

export const communityProfilesRelations = relations(communityProfiles, ({one}) => ({
	chef: one(chefs, {
		fields: [communityProfiles.chefId],
		references: [chefs.id]
	}),
}));

export const communityBenchmarksRelations = relations(communityBenchmarks, ({one}) => ({
	chef: one(chefs, {
		fields: [communityBenchmarks.chefId],
		references: [chefs.id]
	}),
}));

export const communityMessagesRelations = relations(communityMessages, ({one}) => ({
	chef_recipientId: one(chefs, {
		fields: [communityMessages.recipientId],
		references: [chefs.id],
		relationName: "communityMessages_recipientId_chefs_id"
	}),
	chef_senderId: one(chefs, {
		fields: [communityMessages.senderId],
		references: [chefs.id],
		relationName: "communityMessages_senderId_chefs_id"
	}),
}));

export const chefDirectoryListingsRelations = relations(chefDirectoryListings, ({one}) => ({
	chef: one(chefs, {
		fields: [chefDirectoryListings.chefId],
		references: [chefs.id]
	}),
}));

export const mentorshipProfilesRelations = relations(mentorshipProfiles, ({one}) => ({
	chef: one(chefs, {
		fields: [mentorshipProfiles.chefId],
		references: [chefs.id]
	}),
}));

export const mentorshipConnectionsRelations = relations(mentorshipConnections, ({one}) => ({
	chef_menteeId: one(chefs, {
		fields: [mentorshipConnections.menteeId],
		references: [chefs.id],
		relationName: "mentorshipConnections_menteeId_chefs_id"
	}),
	chef_mentorId: one(chefs, {
		fields: [mentorshipConnections.mentorId],
		references: [chefs.id],
		relationName: "mentorshipConnections_mentorId_chefs_id"
	}),
}));

export const subcontractAgreementsRelations = relations(subcontractAgreements, ({one}) => ({
	event: one(events, {
		fields: [subcontractAgreements.eventId],
		references: [events.id]
	}),
	chef_hiringChefId: one(chefs, {
		fields: [subcontractAgreements.hiringChefId],
		references: [chefs.id],
		relationName: "subcontractAgreements_hiringChefId_chefs_id"
	}),
	chef_subcontractorChefId: one(chefs, {
		fields: [subcontractAgreements.subcontractorChefId],
		references: [chefs.id],
		relationName: "subcontractAgreements_subcontractorChefId_chefs_id"
	}),
}));

export const grocerySpendEntriesRelations = relations(grocerySpendEntries, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [grocerySpendEntries.createdBy],
		references: [usersInAuth.id]
	}),
	event: one(events, {
		fields: [grocerySpendEntries.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [grocerySpendEntries.tenantId],
		references: [chefs.id]
	}),
}));

export const tipRequestsRelations = relations(tipRequests, ({one}) => ({
	client: one(clients, {
		fields: [tipRequests.clientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [tipRequests.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [tipRequests.tenantId],
		references: [chefs.id]
	}),
}));

export const giftCertificatesRelations = relations(giftCertificates, ({one}) => ({
	event: one(events, {
		fields: [giftCertificates.redeemedEventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [giftCertificates.tenantId],
		references: [chefs.id]
	}),
}));

export const marketingSpendLogRelations = relations(marketingSpendLog, ({one}) => ({
	chef: one(chefs, {
		fields: [marketingSpendLog.chefId],
		references: [chefs.id]
	}),
}));

export const platformApiConnectionsRelations = relations(platformApiConnections, ({one}) => ({
	chef: one(chefs, {
		fields: [platformApiConnections.chefId],
		references: [chefs.id]
	}),
}));

export const clientMergeLogRelations = relations(clientMergeLog, ({one}) => ({
	chef: one(chefs, {
		fields: [clientMergeLog.chefId],
		references: [chefs.id]
	}),
	client: one(clients, {
		fields: [clientMergeLog.keptClientId],
		references: [clients.id]
	}),
}));

export const ingredientPriceHistoryRelations = relations(ingredientPriceHistory, ({one}) => ({
	expense: one(expenses, {
		fields: [ingredientPriceHistory.expenseId],
		references: [expenses.id]
	}),
	ingredient: one(ingredients, {
		fields: [ingredientPriceHistory.ingredientId],
		references: [ingredients.id]
	}),
	chef: one(chefs, {
		fields: [ingredientPriceHistory.tenantId],
		references: [chefs.id]
	}),
	vendor: one(vendors, {
		fields: [ingredientPriceHistory.vendorId],
		references: [vendors.id]
	}),
}));

export const vendorPreferredIngredientsRelations = relations(vendorPreferredIngredients, ({one}) => ({
	chef: one(chefs, {
		fields: [vendorPreferredIngredients.chefId],
		references: [chefs.id]
	}),
	ingredient: one(ingredients, {
		fields: [vendorPreferredIngredients.ingredientId],
		references: [ingredients.id]
	}),
	vendor: one(vendors, {
		fields: [vendorPreferredIngredients.vendorId],
		references: [vendors.id]
	}),
}));

export const varianceAlertSettingsRelations = relations(varianceAlertSettings, ({one}) => ({
	chef: one(chefs, {
		fields: [varianceAlertSettings.chefId],
		references: [chefs.id]
	}),
}));

export const autoResponseConfigRelations = relations(autoResponseConfig, ({one}) => ({
	chef: one(chefs, {
		fields: [autoResponseConfig.chefId],
		references: [chefs.id]
	}),
}));

export const businessHoursConfigRelations = relations(businessHoursConfig, ({one}) => ({
	chef: one(chefs, {
		fields: [businessHoursConfig.chefId],
		references: [chefs.id]
	}),
}));

export const responseTemplatesRelations = relations(responseTemplates, ({one, many}) => ({
	inquiries: many(inquiries),
	chef_chefId: one(chefs, {
		fields: [responseTemplates.chefId],
		references: [chefs.id],
		relationName: "responseTemplates_chefId_chefs_id"
	}),
	chef_tenantId: one(chefs, {
		fields: [responseTemplates.tenantId],
		references: [chefs.id],
		relationName: "responseTemplates_tenantId_chefs_id"
	}),
	scheduledMessages: many(scheduledMessages),
}));

export const paymentMilestoneTemplatesRelations = relations(paymentMilestoneTemplates, ({one}) => ({
	chef: one(chefs, {
		fields: [paymentMilestoneTemplates.chefId],
		references: [chefs.id]
	}),
}));

export const eventPaymentMilestonesRelations = relations(eventPaymentMilestones, ({one}) => ({
	event: one(events, {
		fields: [eventPaymentMilestones.eventId],
		references: [events.id]
	}),
	ledgerEntry: one(ledgerEntries, {
		fields: [eventPaymentMilestones.ledgerEntryId],
		references: [ledgerEntries.id]
	}),
	chef: one(chefs, {
		fields: [eventPaymentMilestones.tenantId],
		references: [chefs.id]
	}),
}));

export const eventContactsRelations = relations(eventContacts, ({one}) => ({
	event: one(events, {
		fields: [eventContacts.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [eventContacts.tenantId],
		references: [chefs.id]
	}),
}));

export const kitchenAssessmentsRelations = relations(kitchenAssessments, ({one}) => ({
	chef: one(chefs, {
		fields: [kitchenAssessments.chefId],
		references: [chefs.id]
	}),
	client: one(clients, {
		fields: [kitchenAssessments.clientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [kitchenAssessments.eventId],
		references: [events.id]
	}),
}));

export const menuRevisionsRelations = relations(menuRevisions, ({one, many}) => ({
	event: one(events, {
		fields: [menuRevisions.eventId],
		references: [events.id]
	}),
	menu: one(menus, {
		fields: [menuRevisions.menuId],
		references: [menus.id]
	}),
	chef: one(chefs, {
		fields: [menuRevisions.tenantId],
		references: [chefs.id]
	}),
	menuDishFeedbacks: many(menuDishFeedback),
}));

export const menuDishFeedbackRelations = relations(menuDishFeedback, ({one}) => ({
	client: one(clients, {
		fields: [menuDishFeedback.clientId],
		references: [clients.id]
	}),
	dish: one(dishes, {
		fields: [menuDishFeedback.dishId],
		references: [dishes.id]
	}),
	menuRevision: one(menuRevisions, {
		fields: [menuDishFeedback.menuRevisionId],
		references: [menuRevisions.id]
	}),
	chef: one(chefs, {
		fields: [menuDishFeedback.tenantId],
		references: [chefs.id]
	}),
}));

export const guestCountChangesRelations = relations(guestCountChanges, ({one}) => ({
	event: one(events, {
		fields: [guestCountChanges.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [guestCountChanges.tenantId],
		references: [chefs.id]
	}),
}));

export const paymentMilestonesRelations = relations(paymentMilestones, ({one}) => ({
	event: one(events, {
		fields: [paymentMilestones.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [paymentMilestones.tenantId],
		references: [chefs.id]
	}),
}));

export const followUpSequencesRelations = relations(followUpSequences, ({one}) => ({
	chef: one(chefs, {
		fields: [followUpSequences.chefId],
		references: [chefs.id]
	}),
}));

export const postEventSurveysRelations = relations(postEventSurveys, ({one}) => ({
	client: one(clients, {
		fields: [postEventSurveys.clientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [postEventSurveys.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [postEventSurveys.tenantId],
		references: [chefs.id]
	}),
}));

export const scheduledMessagesRelations = relations(scheduledMessages, ({one}) => ({
	chef: one(chefs, {
		fields: [scheduledMessages.chefId],
		references: [chefs.id]
	}),
	responseTemplate: one(responseTemplates, {
		fields: [scheduledMessages.templateId],
		references: [responseTemplates.id]
	}),
}));

export const orderAheadItemsRelations = relations(orderAheadItems, ({one, many}) => ({
	chef: one(chefs, {
		fields: [orderAheadItems.chefId],
		references: [chefs.id]
	}),
	orderAheadOrderItems: many(orderAheadOrderItems),
}));

export const orderAheadOrdersRelations = relations(orderAheadOrders, ({one, many}) => ({
	chef: one(chefs, {
		fields: [orderAheadOrders.chefId],
		references: [chefs.id]
	}),
	client: one(clients, {
		fields: [orderAheadOrders.clientId],
		references: [clients.id]
	}),
	orderAheadOrderItems: many(orderAheadOrderItems),
}));

export const orderAheadOrderItemsRelations = relations(orderAheadOrderItems, ({one}) => ({
	orderAheadItem: one(orderAheadItems, {
		fields: [orderAheadOrderItems.itemId],
		references: [orderAheadItems.id]
	}),
	orderAheadOrder: one(orderAheadOrders, {
		fields: [orderAheadOrderItems.orderId],
		references: [orderAheadOrders.id]
	}),
}));

export const mealPrepContainersRelations = relations(mealPrepContainers, ({one}) => ({
	chef: one(chefs, {
		fields: [mealPrepContainers.chefId],
		references: [chefs.id]
	}),
	client: one(clients, {
		fields: [mealPrepContainers.clientId],
		references: [clients.id]
	}),
}));

export const mealPrepDeliveriesRelations = relations(mealPrepDeliveries, ({one}) => ({
	chef: one(chefs, {
		fields: [mealPrepDeliveries.chefId],
		references: [chefs.id]
	}),
	client: one(clients, {
		fields: [mealPrepDeliveries.clientId],
		references: [clients.id]
	}),
	mealPrepProgram: one(mealPrepPrograms, {
		fields: [mealPrepDeliveries.programId],
		references: [mealPrepPrograms.id]
	}),
}));

export const clientSatisfactionSurveysRelations = relations(clientSatisfactionSurveys, ({one}) => ({
	chef: one(chefs, {
		fields: [clientSatisfactionSurveys.chefId],
		references: [chefs.id]
	}),
	client: one(clients, {
		fields: [clientSatisfactionSurveys.clientId],
		references: [clients.id]
	}),
	event: one(events, {
		fields: [clientSatisfactionSurveys.eventId],
		references: [events.id]
	}),
}));

export const menuItemsRelations = relations(menuItems, ({one}) => ({
	chef: one(chefs, {
		fields: [menuItems.chefId],
		references: [chefs.id]
	}),
	menu: one(menus, {
		fields: [menuItems.menuId],
		references: [menus.id]
	}),
	recipe: one(recipes, {
		fields: [menuItems.recipeId],
		references: [recipes.id]
	}),
}));

export const directoryNominationsRelations = relations(directoryNominations, ({one}) => ({
	directoryListing: one(directoryListings, {
		fields: [directoryNominations.listingId],
		references: [directoryListings.id]
	}),
}));

export const directoryListingsRelations = relations(directoryListings, ({many}) => ({
	directoryNominations: many(directoryNominations),
	directoryOutreachLogs: many(directoryOutreachLog),
}));

export const directoryOutreachLogRelations = relations(directoryOutreachLog, ({one}) => ({
	directoryListing: one(directoryListings, {
		fields: [directoryOutreachLog.listingId],
		references: [directoryListings.id]
	}),
}));

export const chefFoldersRelations = relations(chefFolders, ({one, many}) => ({
	chefFolder: one(chefFolders, {
		fields: [chefFolders.parentFolderId],
		references: [chefFolders.id],
		relationName: "chefFolders_parentFolderId_chefFolders_id"
	}),
	chefFolders: many(chefFolders, {
		relationName: "chefFolders_parentFolderId_chefFolders_id"
	}),
	chef: one(chefs, {
		fields: [chefFolders.tenantId],
		references: [chefs.id]
	}),
	chefDocuments: many(chefDocuments),
}));

export const chefDocumentsRelations = relations(chefDocuments, ({one}) => ({
	client: one(clients, {
		fields: [chefDocuments.clientId],
		references: [clients.id]
	}),
	usersInAuth_createdBy: one(usersInAuth, {
		fields: [chefDocuments.createdBy],
		references: [usersInAuth.id],
		relationName: "chefDocuments_createdBy_usersInAuth_id"
	}),
	event: one(events, {
		fields: [chefDocuments.eventId],
		references: [events.id]
	}),
	chefFolder: one(chefFolders, {
		fields: [chefDocuments.folderId],
		references: [chefFolders.id]
	}),
	inquiry: one(inquiries, {
		fields: [chefDocuments.inquiryId],
		references: [inquiries.id]
	}),
	chef: one(chefs, {
		fields: [chefDocuments.tenantId],
		references: [chefs.id]
	}),
	usersInAuth_updatedBy: one(usersInAuth, {
		fields: [chefDocuments.updatedBy],
		references: [usersInAuth.id],
		relationName: "chefDocuments_updatedBy_usersInAuth_id"
	}),
}));

export const recipeProductionLogRelations = relations(recipeProductionLog, ({one}) => ({
	event: one(events, {
		fields: [recipeProductionLog.eventId],
		references: [events.id]
	}),
	recipe: one(recipes, {
		fields: [recipeProductionLog.recipeId],
		references: [recipes.id]
	}),
	chef: one(chefs, {
		fields: [recipeProductionLog.tenantId],
		references: [chefs.id]
	}),
}));

export const chefPreferencesRelations = relations(chefPreferences, ({one}) => ({
	chef_chefId: one(chefs, {
		fields: [chefPreferences.chefId],
		references: [chefs.id],
		relationName: "chefPreferences_chefId_chefs_id"
	}),
	event: one(events, {
		fields: [chefPreferences.lockedEventId],
		references: [events.id]
	}),
	chef_tenantId: one(chefs, {
		fields: [chefPreferences.tenantId],
		references: [chefs.id],
		relationName: "chefPreferences_tenantId_chefs_id"
	}),
}));

export const chefPricingConfigRelations = relations(chefPricingConfig, ({one}) => ({
	chef: one(chefs, {
		fields: [chefPricingConfig.chefId],
		references: [chefs.id]
	}),
}));

export const clientTasteProfilesRelations = relations(clientTasteProfiles, ({one}) => ({
	client: one(clients, {
		fields: [clientTasteProfiles.clientId],
		references: [clients.id]
	}),
	chef: one(chefs, {
		fields: [clientTasteProfiles.tenantId],
		references: [chefs.id]
	}),
}));

export const eventContentDraftsRelations = relations(eventContentDrafts, ({one}) => ({
	event: one(events, {
		fields: [eventContentDrafts.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [eventContentDrafts.tenantId],
		references: [chefs.id]
	}),
}));

export const clientTouchpointRulesRelations = relations(clientTouchpointRules, ({one}) => ({
	chef: one(chefs, {
		fields: [clientTouchpointRules.chefId],
		references: [chefs.id]
	}),
}));

export const equipmentMaintenanceLogRelations = relations(equipmentMaintenanceLog, ({one}) => ({
	chef: one(chefs, {
		fields: [equipmentMaintenanceLog.chefId],
		references: [chefs.id]
	}),
	equipmentItem: one(equipmentItems, {
		fields: [equipmentMaintenanceLog.equipmentId],
		references: [equipmentItems.id]
	}),
}));

export const eventCollaboratorsRelations = relations(eventCollaborators, ({one}) => ({
	chef_chefId: one(chefs, {
		fields: [eventCollaborators.chefId],
		references: [chefs.id],
		relationName: "eventCollaborators_chefId_chefs_id"
	}),
	event: one(events, {
		fields: [eventCollaborators.eventId],
		references: [events.id]
	}),
	chef_invitedByChefId: one(chefs, {
		fields: [eventCollaborators.invitedByChefId],
		references: [chefs.id],
		relationName: "eventCollaborators_invitedByChefId_chefs_id"
	}),
}));

export const chefTaxonomyExtensionsRelations = relations(chefTaxonomyExtensions, ({one}) => ({
	chef: one(chefs, {
		fields: [chefTaxonomyExtensions.chefId],
		references: [chefs.id]
	}),
}));

export const chefTaxonomyHiddenRelations = relations(chefTaxonomyHidden, ({one}) => ({
	chef: one(chefs, {
		fields: [chefTaxonomyHidden.chefId],
		references: [chefs.id]
	}),
}));

export const taskDependenciesRelations = relations(taskDependencies, ({one}) => ({
	chef: one(chefs, {
		fields: [taskDependencies.chefId],
		references: [chefs.id]
	}),
	task_dependsOnTaskId: one(tasks, {
		fields: [taskDependencies.dependsOnTaskId],
		references: [tasks.id],
		relationName: "taskDependencies_dependsOnTaskId_tasks_id"
	}),
	task_taskId: one(tasks, {
		fields: [taskDependencies.taskId],
		references: [tasks.id],
		relationName: "taskDependencies_taskId_tasks_id"
	}),
}));

export const chefPostHashtagsRelations = relations(chefPostHashtags, ({one}) => ({
	chefSocialHashtag: one(chefSocialHashtags, {
		fields: [chefPostHashtags.hashtagId],
		references: [chefSocialHashtags.id]
	}),
	chefSocialPost: one(chefSocialPosts, {
		fields: [chefPostHashtags.postId],
		references: [chefSocialPosts.id]
	}),
}));

export const chefSocialHashtagsRelations = relations(chefSocialHashtags, ({many}) => ({
	chefPostHashtags: many(chefPostHashtags),
}));

export const conversationThreadReadsRelations = relations(conversationThreadReads, ({one}) => ({
	chef: one(chefs, {
		fields: [conversationThreadReads.tenantId],
		references: [chefs.id]
	}),
	conversationThread: one(conversationThreads, {
		fields: [conversationThreadReads.threadId],
		references: [conversationThreads.id]
	}),
}));

export const chefFeatureFlagsRelations = relations(chefFeatureFlags, ({one}) => ({
	chef: one(chefs, {
		fields: [chefFeatureFlags.chefId],
		references: [chefs.id]
	}),
}));

export const quoteSelectedAddonsRelations = relations(quoteSelectedAddons, ({one}) => ({
	proposalAddon: one(proposalAddons, {
		fields: [quoteSelectedAddons.addonId],
		references: [proposalAddons.id]
	}),
	quote: one(quotes, {
		fields: [quoteSelectedAddons.quoteId],
		references: [quotes.id]
	}),
	chef: one(chefs, {
		fields: [quoteSelectedAddons.tenantId],
		references: [chefs.id]
	}),
}));