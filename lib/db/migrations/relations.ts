import { relations } from "drizzle-orm/relations";
import { chefs, automatedSequences, adminTimeLogs, events, chefTodos, usersInAuth, chefEmergencyContacts, communicationEvents, suggestedLinks, communicationClassificationRules, eventSurveys, clients, conversationThreads, followUpTimers, chefCertifications, copilotActions, copilotRecommendations, copilotRuns, campaignTemplates, directOutreachLog, integrationConnections, auditLog, clientInvitations, userRoles, integrationEvents, inquiries, inquiryStateTransitions, eventStateTransitions, dishes, menus, tastingMenuCourses, afterActionReviews, menuStateTransitions, components, recipes, loyaltyTransactions, contractTemplates, eventContracts, proposalTokens, eventTips, seasonalPalettes, shoppingSubstitutions, chatInsights, conversations, chatMessages, conversationParticipants, chefConnections, clientNotes, chefFeedback, activityEvents, communicationActionLog, clientIntakeResponses, clientIntakeForms, clientIntakeShares, chefJourneys, jobRetryLog, chefJourneyEntries, chefJournalMedia, chefMomentumSnapshots, chefGoals, chefAvailabilityShareTokens, dishIndex, dishAppearances, menuUploadJobs, eventStaffAssignments, staffMembers, zapierWebhookSubscriptions, chefSocialChannels, chefChannelMemberships, zapierWebhookDeliveries, eventShares, hubGroups, eventThemes, chefNetworkFeaturePreferences, chefStories, posAlertEvents, posMetricSnapshots, chefCalendarEntries, availabilitySignalNotificationLog, competitorBenchmarks, clientSatisfactionSurveys, guestDayOfReminders, eventGuests, chefSchedulingRules, clientQuickRequests, guestDietaryConfirmations, eventGuestDocuments, contractorPayments, clientProposals, proposalTemplates, benchmarkSnapshots, clientPreferencePatterns, automationExecutionLog, staffEventTokens, deadLetterQueue, equipmentDepreciationSchedules, equipmentItems, mealPrepWeeks, mealPrepPrograms, eventSalesTax, chefServiceTypes, fineTuningExamples, goalCheckIns, cannabisEventDetails, menuNutrition, followUpSends, followupRules, chefBackupContacts, chefBrandMentions, chefCreativeProjects, chefAutomationSettings, guestMessages, openTableRequests, hubGuestProfiles, clientPhotos, favoriteChefs, chefCulinaryWords, dailyPlanDismissals, gmailSyncLog, googleMailboxes, messages, aiTaskQueue, platformActionLog, platformRecords, remySupportShares, eventReadinessGates, featureVotes, featureRequests, devices, deviceEvents, haccpPlans, inventoryAudits, storageLocations, tipRequests, cannabisControlPacketEvidence, cannabisControlPacketReconciliations, cannabisControlPacketSnapshots, mutationIdempotency, qolMetricEvents, clientMergeLog, chefActivityLog, chefPreferences, eventCannabisCourseConfig, directoryListings, directoryNominations, commercePaymentSchedules, commercePayments, sales, ledgerEntries, inventoryTransactions, ingredients, vendorInvoices, wasteLogs, orderQueue, cashDrawerMovements, commerceRefunds, registerSessions, chefProfiles, dailyReconciliationReports, dailyTaxSummary, settlementRecords, charityHours, chefMarketplaceProfiles, eventGuestDietaryItems, eventGuestRsvpAudit, eventJoinRequests, eventShareInvites, eventStubs, hubGroupEvents, priceWatchList, hubAvailability, hubAvailabilityResponses, emailSenderReputation, aiPreferences, hubChefRecommendations, ingredientAliases, systemIngredients, betaSurveyResponses, betaSurveyInvites, betaSurveyDefinitions, chefHandoffs, chefHandoffRecipients, chefHandoffEvents, chefAvailabilitySignals, commerceDiningZones, commerceDiningTables, commerceDiningChecks, clientMealRequests, clientPreferences, chefServiceConfig, eventSeries, hubMessages, hubMessageReads, clientWorksheets, betaOnboardingChecklist, hubShareCards, openTableConsents, quotes, quoteLineItems, eventPrepSteps, dietaryConfirmations, eventLiveStatus, clientReferrals, bookingAvailabilityRules, proposalSections, chefBudgets, clientOutreachLog, eventEquipmentChecklist, eventFloorPlans, clientMealPrepPreferences, containerInventory, containerTransactions, dailySpecials, productProjections, permits, hubMealBoard, bakeryOvens, bakeSchedule, bakeryBatches, bakeryOrders, bakeryParStock, bakeryProductionLog, feedbackRequests, feedbackResponses, hubMealFeedback, giftCards, giftCardTransactions, businessLocations, communicationLog, hubHouseholdMembers, complianceCleaningLogs, complianceTempLogs, eventSiteAssessments, reorderSettings, vendors, documentIntelligenceJobs, documentIntelligenceItems, chefDocuments, chefFolders, hubMealTemplates, entityPhotos, sops, sopCompletions, productPublicMediaLinks, publicMediaAssets, eventTemplates, hubScheduleChanges, tipPoolConfigs, tipDistributions, tipEntries, cancellationPolicies, chefCapacitySettings, chefEquipmentMaster, hubRecurringMeals, chefDepositSettings, cookingClasses, classRegistrations, chefSeasonalAvailability, hubMealAttendance, groceryTrips, groceryTripItems, groceryTripSplits, hubMealComments, aislePreferences, chefEquipment, chefPreferredStores, emailSequenceEnrollments, emailSequences, hubMealRequests, eventFeedback, mealPrepItems, chefDirectoryListings, communityBenchmarks, giftCertificates, grocerySpendEntries, expenses, ingredientPriceHistory, autoResponseConfig, businessHoursConfig, eventContacts, eventPaymentMilestones, guestCountChanges, followUpSequences, chefPricingConfig, clientTasteProfiles, marketingCampaigns, abTests, automationRules, automationExecutions, bakerySeasonalItems, bakeryTastings, bakeryYieldRecords, bankConnections, bankTransactions, betaSignupTrackers, betaSignups, beverages, bookingDailyCaps, bookingDateOverrides, bookingEventTypes, campaignRecipients, cannabisHostAgreements, cannabisTierInvitations, cannabisTierUsers, chefApiKeys, chefAvailabilityBlocks, chefBusinessHealthItems, chefCapabilityInventory, chefCommentReactions, chefPostComments, chefCrisisPlans, chefCulinaryProfiles, chefDailyBriefings, chefEducationLog, chefEventTypeLabels, chefFollows, chefGrowthCheckins, chefIncidents, chefInsurancePolicies, chefJournalRecipeLinks, chefJourneyIdeas, chefNetworkContactShares, chefNetworkPosts, chefNotificationTierOverrides, chefPortfolioRemovalRequests, chefSocialPosts, chefPostMentions, chefPostReactions, chefPostSaves, chefReminders, chefBreadcrumbs, chefSocialNotifications, chefStoryReactions, chefStoryViews, chefTaxConfig, chefTaxonomyExtensions, chefTaxonomyHidden, chefTeamMembers, clientConnections, clientFollowupRules, clientGiftLog, clientIncentives, clientKitchenInventory, clientNdas, clientReviews, clientSegments, clientTouchpointRules, clipboardEntries, stationComponents, stations, communityMessages, communityProfiles, communityTemplates, contactSubmissions, contentPerformance, contractorServiceAgreements, customFieldDefinitions, customFieldValues, dailyChecklistCompletions, dailyChecklistCustomItems, dailyPlanDrafts, copilotRunErrors, clientTags, clientAllergyRecords, commercePromotions, chefTrustedCircle, dailyReports, dailyRevenue, demandForecasts, deviceSessions, dietaryChangeLog, dietaryConflictAlerts, dishFeedback, dishVariations, displayCaseItems, documentComments, documentVersions, emailSequenceSteps, employees, entityTemplates, equipmentMaintenanceLog, equipmentRentals, eventAlcoholLogs, eventCannabisSettings, eventCollaborators, eventContentDrafts, eventContingencyNotes, eventContractSigners, eventContractVersions, eventDocumentGenerationJobs, eventEquipmentAssignments, eventEquipmentRentals, eventLeftoverDetails, eventPhotos, eventSafetyChecklists, eventServiceSessions, eventShareInviteEvents, eventStationAssignments, eventPrepBlocks, dopTaskCompletions, directoryOutreachLog, eventDocumentSnapshots, eventTempLogs, eventTravelLegs, eventVendorDeliveries, eventWasteLogs, externalReviewSources, expenseTaxCategories, experiencePackages, fermentationLogs, frontOfHouseMenus, menuTemplates, giftCardPurchaseIntents, goalClientSuggestions, goalSnapshots, googleConnections, groceryPriceEntries, groceryPriceQuoteItems, groceryPriceQuotes, guestCommunicationLogs, guestComps, guests, guestLeads, guestPhotos, guestReservations, guestTags, guestTestimonials, guestVisits, healthInsurancePremiums, householdMembers, households, externalReviews, guestEventProfile, receiptPhotos, hubGuestEventHistory, guestFeedback, hubGroupMembers, gmailHistoricalFindings, hubGuestFriends, incentiveDeliveries, incentiveRedemptions, ingredientShelfLifeDefaults, ingredientSubstitutions, inquiryNotes, inquiryRecipeLinks, insuranceClaims, insurancePolicies, inventoryAuditItems, inventoryBatches, inventoryCounts, inventoryLots, kdsTickets, kitchenAssessments, kitchenRentals, learningGoals, loyaltyRewardRedemptions, loyaltyRewards, mealPrepBatchLog, mealPrepContainers, mealPrepDeliveries, mealPrepOrders, mealPrepWindows, mentorshipConnections, mentorshipProfiles, integrationSyncJobs, integrationEntityLinks, integrationFieldMappings, hubMessageReactions, hubMedia, hubPinnedNotes, hubPolls, hubPollOptions, hubPollVotes, recurringServices, loyaltyConfig, marketingSpendLog, responseTemplates, partnerLocations, referralPartners, menuApprovalRequests, menuBeveragePairings, menuDishFeedback, menuRevisions, menuItems, menuModifications, menuPreferences, menuServiceHistory, paymentPlanInstallments, notifications, notificationDeliveryLog, notificationPreferences, onboardingProgress, opsLog, orderAheadItems, orderAheadOrderItems, orderAheadOrders, orderRequests, outreachCampaigns, packingChecklists, packingChecklistItems, packingTemplates, pantryItems, pantryLocations, partnerImages, paymentDisputes, paymentMilestoneTemplates, paymentMilestones, payroll941Summaries, payrollRecords, payrollW2Summaries, mileageLogs, platformPayouts, platformApiConnections, packingConfirmations, platingGuides, portfolioItems, postEventSurveys, prepTimeline, productModifierAssignments, productModifierGroups, productModifiers, professionalAchievements, profileHighlights, proposalAddonSelections, quoteAddons, proposalAddons, proposalViews, prospectCallScripts, prospectNotes, prospects, prospectOutreachLog, prospectScrubSessions, prospectStageHistory, purchaseOrderItems, purchaseOrders, pushSubscriptions, qrCodes, qrScans, quoteStateTransitions, raffleEntries, raffleRounds, platformSnapshots, productTourProgress, rebookTokens, receiptExtractions, receiptLineItems, recipeIngredients, recipeNutrition, recipeProductionLog, recipeShares, recipeStepPhotos, recipeSubRecipes, saleAppliedPromotions, recurringInvoiceHistory, recurringInvoices, recurringMenuRecommendations, recurringSchedules, referralRequestLog, remyAbuseLog, remyActionAuditLog, remyApprovalPolicies, remyArtifacts, remyConversations, remyFeedback, remyMemories, remyMessages, remyUsageMetrics, retainers, retainerPeriods, retirementContributions, rsvpReminderLog, saleItems, salesTaxRemittances, salesTaxSettings, scheduledCalls, scheduledMessages, scheduledShifts, shiftTemplates, seasonalAvailabilityPeriods, sequenceEnrollments, sequenceSteps, servedDishHistory, serviceCourses, shiftHandoffNotes, shiftLogs, shiftSwapRequests, shoppingLists, simulationRuns, simulationResults, smartFieldValues, smartGroceryLists, smartGroceryItems, smsMessages, smsSendLog, socialConnectedAccounts, socialHashtagSets, socialMediaAssets, socialPlatformCredentials, socialPostAssets, socialPosts, socialQueueSettings, socialStatsSnapshots, socialTemplates, sourcingEntries, staffAvailability, staffClockEntries, staffMealItems, staffMeals, staffOnboardingItems, staffPerformanceScores, staffSchedules, stationMenuItems, stocktakes, stocktakeItems, storeItemAssignments, stripeTransfers, subcontractAgreements, taskCompletionLog, tasks, taskDependencies, taskTemplates, tastingMenus, vendorItems, vendorCatalogImportRows, taxJurisdictions, taxCollected, taxFilings, taxQuarterlyEstimates, taxSettings, timeBlocks, travelLegIngredients, truckLocations, truckSchedule, truckPreorders, unusedIngredients, userFeedback, vaTasks, varianceAlertSettings, vehicleMaintenance, vendorEventAssignments, vendorInvoiceItems, vendorInvoiceLineItems, vendorPreferredIngredients, vendorPriceEntries, vendorPricePoints, waitlistEntries, wasteLog, webhookEndpoints, webhookDeliveries, websiteStatsSnapshots, wholesaleAccounts, wholesaleOrders, wixConnections, wixSubmissions, tenantSettings, vendorPriceAlertSettings, workflowExecutionLog, workflowExecutions, testimonials, vendorDocumentUploads, aarRecipeFeedback, recipeFamilies, aarIngredientIssues, expenseLineItems, workflowTemplates, workflowSteps, chefSocialHashtags, chefPostHashtags, conversationThreadReads, chefFeatureFlags, quoteSelectedAddons } from "./schema";

export const automatedSequencesRelations = relations(automatedSequences, ({one, many}) => ({
	chef: one(chefs, {
		fields: [automatedSequences.chefId],
		references: [chefs.id]
	}),
	sequenceEnrollments: many(sequenceEnrollments),
	sequenceSteps: many(sequenceSteps),
}));

export const chefsRelations = relations(chefs, ({one, many}) => ({
	automatedSequences: many(automatedSequences),
	adminTimeLogs: many(adminTimeLogs),
	chefTodos: many(chefTodos),
	chefEmergencyContacts: many(chefEmergencyContacts),
	suggestedLinks: many(suggestedLinks),
	communicationClassificationRules: many(communicationClassificationRules),
	eventSurveys_chefId: many(eventSurveys, {
		relationName: "eventSurveys_chefId_chefs_id"
	}),
	eventSurveys_tenantId: many(eventSurveys, {
		relationName: "eventSurveys_tenantId_chefs_id"
	}),
	conversationThreads: many(conversationThreads),
	followUpTimers: many(followUpTimers),
	chefCertifications_chefId: many(chefCertifications, {
		relationName: "chefCertifications_chefId_chefs_id"
	}),
	chefCertifications_tenantId: many(chefCertifications, {
		relationName: "chefCertifications_tenantId_chefs_id"
	}),
	copilotActions: many(copilotActions),
	campaignTemplates: many(campaignTemplates),
	directOutreachLogs: many(directOutreachLog),
	integrationConnections_chefId: many(integrationConnections, {
		relationName: "integrationConnections_chefId_chefs_id"
	}),
	integrationConnections_tenantId: many(integrationConnections, {
		relationName: "integrationConnections_tenantId_chefs_id"
	}),
	auditLogs: many(auditLog),
	clientInvitations: many(clientInvitations),
	integrationEvents: many(integrationEvents),
	inquiryStateTransitions: many(inquiryStateTransitions),
	eventStateTransitions: many(eventStateTransitions),
	dishes: many(dishes),
	afterActionReviews: many(afterActionReviews),
	menuStateTransitions: many(menuStateTransitions),
	components: many(components),
	loyaltyTransactions: many(loyaltyTransactions),
	contractTemplates: many(contractTemplates),
	eventContracts: many(eventContracts),
	eventTips: many(eventTips),
	seasonalPalettes: many(seasonalPalettes),
	shoppingSubstitutions: many(shoppingSubstitutions),
	chatInsights: many(chatInsights),
	chefConnections_addresseeId: many(chefConnections, {
		relationName: "chefConnections_addresseeId_chefs_id"
	}),
	chefConnections_requesterId: many(chefConnections, {
		relationName: "chefConnections_requesterId_chefs_id"
	}),
	clientNotes: many(clientNotes),
	chefFeedbacks: many(chefFeedback),
	activityEvents: many(activityEvents),
	communicationActionLogs: many(communicationActionLog),
	clientIntakeResponses: many(clientIntakeResponses),
	clientIntakeShares: many(clientIntakeShares),
	chefJourneys: many(chefJourneys),
	jobRetryLogs: many(jobRetryLog),
	chefJournalMedias: many(chefJournalMedia),
	chefMomentumSnapshots: many(chefMomentumSnapshots),
	chefGoals: many(chefGoals),
	chefAvailabilityShareTokens: many(chefAvailabilityShareTokens),
	dishAppearances: many(dishAppearances),
	eventStaffAssignments: many(eventStaffAssignments),
	zapierWebhookSubscriptions: many(zapierWebhookSubscriptions),
	chefChannelMemberships: many(chefChannelMemberships),
	eventShares: many(eventShares),
	chefNetworkFeaturePreferences: many(chefNetworkFeaturePreferences),
	chefStories: many(chefStories),
	posAlertEvents: many(posAlertEvents),
	posMetricSnapshots: many(posMetricSnapshots),
	availabilitySignalNotificationLogs: many(availabilitySignalNotificationLog),
	competitorBenchmarks: many(competitorBenchmarks),
	clientSatisfactionSurveys: many(clientSatisfactionSurveys),
	guestDayOfReminders: many(guestDayOfReminders),
	chefSchedulingRules: many(chefSchedulingRules),
	clientQuickRequests: many(clientQuickRequests),
	guestDietaryConfirmations: many(guestDietaryConfirmations),
	eventGuestDocuments: many(eventGuestDocuments),
	eventGuests: many(eventGuests),
	contractorPayments: many(contractorPayments),
	clientProposals: many(clientProposals),
	benchmarkSnapshots: many(benchmarkSnapshots),
	clientPreferencePatterns: many(clientPreferencePatterns),
	automationExecutionLogs: many(automationExecutionLog),
	staffEventTokens: many(staffEventTokens),
	deadLetterQueues: many(deadLetterQueue),
	equipmentDepreciationSchedules: many(equipmentDepreciationSchedules),
	mealPrepWeeks: many(mealPrepWeeks),
	eventSalesTaxes: many(eventSalesTax),
	chefServiceTypes: many(chefServiceTypes),
	fineTuningExamples: many(fineTuningExamples),
	goalCheckIns: many(goalCheckIns),
	cannabisEventDetails: many(cannabisEventDetails),
	menuNutritions: many(menuNutrition),
	followUpSends: many(followUpSends),
	chefBackupContacts: many(chefBackupContacts),
	chefBrandMentions: many(chefBrandMentions),
	chefCreativeProjects: many(chefCreativeProjects),
	chefAutomationSettings: many(chefAutomationSettings),
	guestMessages: many(guestMessages),
	openTableRequests: many(openTableRequests),
	clientPhotos: many(clientPhotos),
	favoriteChefs: many(favoriteChefs),
	chefCulinaryWords: many(chefCulinaryWords),
	dailyPlanDismissals: many(dailyPlanDismissals),
	gmailSyncLogs: many(gmailSyncLog),
	aiTaskQueues: many(aiTaskQueue),
	platformActionLogs: many(platformActionLog),
	remySupportShares: many(remySupportShares),
	eventReadinessGates: many(eventReadinessGates),
	featureVotes: many(featureVotes),
	deviceEvents: many(deviceEvents),
	haccpPlans: many(haccpPlans),
	inventoryAudits: many(inventoryAudits),
	tipRequests: many(tipRequests),
	cannabisControlPacketEvidences: many(cannabisControlPacketEvidence),
	mutationIdempotencies: many(mutationIdempotency),
	qolMetricEvents: many(qolMetricEvents),
	usersInAuth: one(usersInAuth, {
		fields: [chefs.authUserId],
		references: [usersInAuth.id]
	}),
	menu: one(menus, {
		fields: [chefs.featuredBookingMenuId],
		references: [menus.id],
		relationName: "chefs_featuredBookingMenuId_menus_id"
	}),
	clientMergeLogs: many(clientMergeLog),
	chefActivityLogs: many(chefActivityLog),
	chefPreferences_chefId: many(chefPreferences, {
		relationName: "chefPreferences_chefId_chefs_id"
	}),
	chefPreferences_tenantId: many(chefPreferences, {
		relationName: "chefPreferences_tenantId_chefs_id"
	}),
	eventCannabisCourseConfigs: many(eventCannabisCourseConfig),
	commercePaymentSchedules: many(commercePaymentSchedules),
	commercePayments: many(commercePayments),
	inventoryTransactions: many(inventoryTransactions),
	orderQueues: many(orderQueue),
	cashDrawerMovements: many(cashDrawerMovements),
	cannabisControlPacketSnapshots: many(cannabisControlPacketSnapshots),
	chefProfiles_chefId: many(chefProfiles, {
		relationName: "chefProfiles_chefId_chefs_id"
	}),
	chefProfiles_tenantId: many(chefProfiles, {
		relationName: "chefProfiles_tenantId_chefs_id"
	}),
	dailyReconciliationReports: many(dailyReconciliationReports),
	dailyTaxSummaries: many(dailyTaxSummary),
	settlementRecords: many(settlementRecords),
	charityHours: many(charityHours),
	chefMarketplaceProfiles: many(chefMarketplaceProfiles),
	eventGuestDietaryItems: many(eventGuestDietaryItems),
	eventGuestRsvpAudits: many(eventGuestRsvpAudit),
	eventJoinRequests: many(eventJoinRequests),
	eventStubs: many(eventStubs),
	priceWatchLists: many(priceWatchList),
	emailSenderReputations: many(emailSenderReputation),
	aiPreferences: many(aiPreferences),
	hubChefRecommendations: many(hubChefRecommendations),
	ingredientAliases: many(ingredientAliases),
	chefHandoffRecipients: many(chefHandoffRecipients),
	chefHandoffEvents: many(chefHandoffEvents),
	chefAvailabilitySignals: many(chefAvailabilitySignals),
	commerceDiningZones: many(commerceDiningZones),
	commerceDiningTables: many(commerceDiningTables),
	commerceDiningChecks: many(commerceDiningChecks),
	clientMealRequests: many(clientMealRequests),
	clientPreferences: many(clientPreferences),
	chefServiceConfigs: many(chefServiceConfig),
	eventSeries: many(eventSeries),
	clientWorksheets: many(clientWorksheets),
	betaOnboardingChecklists: many(betaOnboardingChecklist),
	quoteLineItems: many(quoteLineItems),
	eventPrepSteps: many(eventPrepSteps),
	dietaryConfirmations_confirmedByChefId: many(dietaryConfirmations, {
		relationName: "dietaryConfirmations_confirmedByChefId_chefs_id"
	}),
	dietaryConfirmations_tenantId: many(dietaryConfirmations, {
		relationName: "dietaryConfirmations_tenantId_chefs_id"
	}),
	eventLiveStatuses: many(eventLiveStatus),
	clientReferrals: many(clientReferrals),
	bookingAvailabilityRules: many(bookingAvailabilityRules),
	proposalSections: many(proposalSections),
	chefBudgets: many(chefBudgets),
	clientOutreachLogs: many(clientOutreachLog),
	eventEquipmentChecklists: many(eventEquipmentChecklist),
	eventFloorPlans: many(eventFloorPlans),
	clientMealPrepPreferences: many(clientMealPrepPreferences),
	containerInventories: many(containerInventory),
	containerTransactions: many(containerTransactions),
	clients: many(clients),
	dailySpecials: many(dailySpecials),
	permits: many(permits),
	bakeSchedules: many(bakeSchedule),
	bakeryBatches: many(bakeryBatches),
	bakeryOrders: many(bakeryOrders),
	bakeryParStocks: many(bakeryParStock),
	bakeryProductionLogs: many(bakeryProductionLog),
	feedbackResponses: many(feedbackResponses),
	giftCardTransactions: many(giftCardTransactions),
	businessLocations: many(businessLocations),
	communicationLogs: many(communicationLog),
	complianceCleaningLogs: many(complianceCleaningLogs),
	complianceTempLogs: many(complianceTempLogs),
	eventSiteAssessments: many(eventSiteAssessments),
	reorderSettings: many(reorderSettings),
	documentIntelligenceJobs: many(documentIntelligenceJobs),
	documentIntelligenceItems: many(documentIntelligenceItems),
	chefDocuments: many(chefDocuments),
	entityPhotos: many(entityPhotos),
	sopCompletions: many(sopCompletions),
	productPublicMediaLinks: many(productPublicMediaLinks),
	eventTemplates: many(eventTemplates),
	tipDistributions: many(tipDistributions),
	tipEntries: many(tipEntries),
	tipPoolConfigs: many(tipPoolConfigs),
	cancellationPolicies: many(cancellationPolicies),
	chefCapacitySettings: many(chefCapacitySettings),
	chefEquipmentMasters: many(chefEquipmentMaster),
	chefDepositSettings: many(chefDepositSettings),
	classRegistrations: many(classRegistrations),
	chefSeasonalAvailabilities: many(chefSeasonalAvailability),
	groceryTrips: many(groceryTrips),
	aislePreferences: many(aislePreferences),
	chefEquipments: many(chefEquipment),
	chefPreferredStores: many(chefPreferredStores),
	emailSequenceEnrollments: many(emailSequenceEnrollments),
	eventFeedbacks: many(eventFeedback),
	mealPrepItems: many(mealPrepItems),
	chefDirectoryListings: many(chefDirectoryListings),
	communityBenchmarks: many(communityBenchmarks),
	giftCertificates: many(giftCertificates),
	grocerySpendEntries: many(grocerySpendEntries),
	ingredientPriceHistories: many(ingredientPriceHistory),
	autoResponseConfigs: many(autoResponseConfig),
	businessHoursConfigs: many(businessHoursConfig),
	eventContacts: many(eventContacts),
	eventPaymentMilestones: many(eventPaymentMilestones),
	guestCountChanges: many(guestCountChanges),
	followUpSequences: many(followUpSequences),
	chefPricingConfigs: many(chefPricingConfig),
	clientTasteProfiles: many(clientTasteProfiles),
	abTests: many(abTests),
	bakeryOvens: many(bakeryOvens),
	automationExecutions: many(automationExecutions),
	automationRules: many(automationRules),
	bakerySeasonalItems: many(bakerySeasonalItems),
	bakeryTastings: many(bakeryTastings),
	bakeryYieldRecords: many(bakeryYieldRecords),
	bankConnections: many(bankConnections),
	bankTransactions: many(bankTransactions),
	betaSignupTrackers: many(betaSignupTrackers),
	beverages: many(beverages),
	bookingDailyCaps: many(bookingDailyCaps),
	bookingDateOverrides: many(bookingDateOverrides),
	bookingEventTypes: many(bookingEventTypes),
	campaignRecipients: many(campaignRecipients),
	cannabisTierUsers: many(cannabisTierUsers),
	chefApiKeys: many(chefApiKeys),
	chefAvailabilityBlocks: many(chefAvailabilityBlocks),
	chefBusinessHealthItems: many(chefBusinessHealthItems),
	chefCalendarEntries: many(chefCalendarEntries),
	chefCapabilityInventories: many(chefCapabilityInventory),
	chefCommentReactions: many(chefCommentReactions),
	chefCrisisPlans: many(chefCrisisPlans),
	chefCulinaryProfiles: many(chefCulinaryProfiles),
	chefDailyBriefings: many(chefDailyBriefings),
	chefEducationLogs: many(chefEducationLog),
	chefEventTypeLabels: many(chefEventTypeLabels),
	chefFolders: many(chefFolders),
	chefFollows_followerChefId: many(chefFollows, {
		relationName: "chefFollows_followerChefId_chefs_id"
	}),
	chefFollows_followingChefId: many(chefFollows, {
		relationName: "chefFollows_followingChefId_chefs_id"
	}),
	chefGrowthCheckins: many(chefGrowthCheckins),
	chefIncidents: many(chefIncidents),
	chefInsurancePolicies: many(chefInsurancePolicies),
	chefJournalRecipeLinks: many(chefJournalRecipeLinks),
	chefJourneyEntries: many(chefJourneyEntries),
	chefJourneyIdeas: many(chefJourneyIdeas),
	chefNetworkContactShares_recipientChefId: many(chefNetworkContactShares, {
		relationName: "chefNetworkContactShares_recipientChefId_chefs_id"
	}),
	chefNetworkContactShares_senderChefId: many(chefNetworkContactShares, {
		relationName: "chefNetworkContactShares_senderChefId_chefs_id"
	}),
	chefNetworkPosts: many(chefNetworkPosts),
	chefNotificationTierOverrides: many(chefNotificationTierOverrides),
	chefPortfolioRemovalRequests: many(chefPortfolioRemovalRequests),
	chefPostComments: many(chefPostComments),
	chefPostMentions: many(chefPostMentions),
	chefPostReactions: many(chefPostReactions),
	chefPostSaves: many(chefPostSaves),
	chefReminders: many(chefReminders),
	chefSocialChannels: many(chefSocialChannels),
	chefBreadcrumbs: many(chefBreadcrumbs),
	cannabisControlPacketReconciliations: many(cannabisControlPacketReconciliations),
	chefHandoffs: many(chefHandoffs),
	chefSocialNotifications_actorChefId: many(chefSocialNotifications, {
		relationName: "chefSocialNotifications_actorChefId_chefs_id"
	}),
	chefSocialNotifications_recipientChefId: many(chefSocialNotifications, {
		relationName: "chefSocialNotifications_recipientChefId_chefs_id"
	}),
	chefSocialPosts: many(chefSocialPosts),
	chefStoryReactions: many(chefStoryReactions),
	chefStoryViews: many(chefStoryViews),
	chefTaxConfigs: many(chefTaxConfig),
	chefTaxonomyExtensions: many(chefTaxonomyExtensions),
	chefTaxonomyHiddens: many(chefTaxonomyHidden),
	chefTeamMembers_chefId: many(chefTeamMembers, {
		relationName: "chefTeamMembers_chefId_chefs_id"
	}),
	chefTeamMembers_memberChefId: many(chefTeamMembers, {
		relationName: "chefTeamMembers_memberChefId_chefs_id"
	}),
	chefTeamMembers_tenantId: many(chefTeamMembers, {
		relationName: "chefTeamMembers_tenantId_chefs_id"
	}),
	clientConnections: many(clientConnections),
	clientFollowupRules: many(clientFollowupRules),
	clientGiftLogs: many(clientGiftLog),
	clientIncentives: many(clientIncentives),
	clientKitchenInventories: many(clientKitchenInventory),
	clientNdas: many(clientNdas),
	clientReviews: many(clientReviews),
	clientSegments: many(clientSegments),
	clientTouchpointRules: many(clientTouchpointRules),
	clipboardEntries: many(clipboardEntries),
	commerceRefunds: many(commerceRefunds),
	communityMessages_recipientId: many(communityMessages, {
		relationName: "communityMessages_recipientId_chefs_id"
	}),
	communityMessages_senderId: many(communityMessages, {
		relationName: "communityMessages_senderId_chefs_id"
	}),
	communityProfiles: many(communityProfiles),
	communityTemplates: many(communityTemplates),
	contactSubmissions: many(contactSubmissions),
	contentPerformances: many(contentPerformance),
	contractorServiceAgreements: many(contractorServiceAgreements),
	conversations: many(conversations),
	cookingClasses: many(cookingClasses),
	customFieldDefinitions: many(customFieldDefinitions),
	customFieldValues: many(customFieldValues),
	dailyChecklistCompletions: many(dailyChecklistCompletions),
	dailyChecklistCustomItems: many(dailyChecklistCustomItems),
	dailyPlanDrafts: many(dailyPlanDrafts),
	copilotRuns: many(copilotRuns),
	copilotRecommendations: many(copilotRecommendations),
	copilotRunErrors: many(copilotRunErrors),
	clientTags: many(clientTags),
	clientAllergyRecords: many(clientAllergyRecords),
	clientIntakeForms: many(clientIntakeForms),
	commercePromotions: many(commercePromotions),
	chefTrustedCircles_chefId: many(chefTrustedCircle, {
		relationName: "chefTrustedCircle_chefId_chefs_id"
	}),
	chefTrustedCircles_trustedChefId: many(chefTrustedCircle, {
		relationName: "chefTrustedCircle_trustedChefId_chefs_id"
	}),
	communicationEvents: many(communicationEvents),
	dailyReports: many(dailyReports),
	dailyRevenues: many(dailyRevenue),
	demandForecasts: many(demandForecasts),
	devices: many(devices),
	dietaryChangeLogs: many(dietaryChangeLog),
	dietaryConflictAlerts: many(dietaryConflictAlerts),
	dishFeedbacks: many(dishFeedback),
	dishIndices: many(dishIndex),
	dishVariations: many(dishVariations),
	displayCaseItems: many(displayCaseItems),
	documentComments: many(documentComments),
	documentVersions: many(documentVersions),
	emailSequences: many(emailSequences),
	employees: many(employees),
	entityTemplates: many(entityTemplates),
	equipmentMaintenanceLogs: many(equipmentMaintenanceLog),
	equipmentRentals: many(equipmentRentals),
	eventAlcoholLogs: many(eventAlcoholLogs),
	eventCannabisSettings: many(eventCannabisSettings),
	eventCollaborators_chefId: many(eventCollaborators, {
		relationName: "eventCollaborators_chefId_chefs_id"
	}),
	eventCollaborators_invitedByChefId: many(eventCollaborators, {
		relationName: "eventCollaborators_invitedByChefId_chefs_id"
	}),
	eventContentDrafts: many(eventContentDrafts),
	eventContingencyNotes: many(eventContingencyNotes),
	eventContractSigners: many(eventContractSigners),
	eventContractVersions: many(eventContractVersions),
	eventDocumentGenerationJobs: many(eventDocumentGenerationJobs),
	eventEquipmentAssignments: many(eventEquipmentAssignments),
	eventEquipmentRentals: many(eventEquipmentRentals),
	eventLeftoverDetails: many(eventLeftoverDetails),
	eventPhotos: many(eventPhotos),
	eventSafetyChecklists: many(eventSafetyChecklists),
	eventServiceSessions: many(eventServiceSessions),
	eventShareInviteEvents: many(eventShareInviteEvents),
	eventShareInvites: many(eventShareInvites),
	eventStationAssignments: many(eventStationAssignments),
	equipmentItems: many(equipmentItems),
	eventPrepBlocks: many(eventPrepBlocks),
	dopTaskCompletions: many(dopTaskCompletions),
	eventDocumentSnapshots: many(eventDocumentSnapshots),
	eventTempLogs: many(eventTempLogs),
	eventTravelLegs: many(eventTravelLegs),
	eventVendorDeliveries: many(eventVendorDeliveries),
	eventWasteLogs: many(eventWasteLogs),
	externalReviewSources: many(externalReviewSources),
	expenseTaxCategories: many(expenseTaxCategories),
	experiencePackages: many(experiencePackages),
	feedbackRequests: many(feedbackRequests),
	fermentationLogs: many(fermentationLogs),
	followupRules: many(followupRules),
	frontOfHouseMenus: many(frontOfHouseMenus),
	giftCardPurchaseIntents: many(giftCardPurchaseIntents),
	giftCards: many(giftCards),
	goalClientSuggestions: many(goalClientSuggestions),
	goalSnapshots: many(goalSnapshots),
	googleConnections_chefId: many(googleConnections, {
		relationName: "googleConnections_chefId_chefs_id"
	}),
	googleConnections_tenantId: many(googleConnections, {
		relationName: "googleConnections_tenantId_chefs_id"
	}),
	groceryPriceEntries: many(groceryPriceEntries),
	groceryPriceQuotes: many(groceryPriceQuotes),
	guestCommunicationLogs: many(guestCommunicationLogs),
	guestComps: many(guestComps),
	guestLeads: many(guestLeads),
	guestPhotos: many(guestPhotos),
	guestReservations: many(guestReservations),
	guestTags: many(guestTags),
	guestTestimonials: many(guestTestimonials),
	guestVisits: many(guestVisits),
	guests: many(guests),
	healthInsurancePremiums: many(healthInsurancePremiums),
	households: many(households),
	externalReviews: many(externalReviews),
	featureRequests: many(featureRequests),
	expenses: many(expenses),
	hubGuestEventHistories: many(hubGuestEventHistory),
	guestFeedbacks: many(guestFeedback),
	googleMailboxes_chefId: many(googleMailboxes, {
		relationName: "googleMailboxes_chefId_chefs_id"
	}),
	googleMailboxes_tenantId: many(googleMailboxes, {
		relationName: "googleMailboxes_tenantId_chefs_id"
	}),
	gmailHistoricalFindings_chefId: many(gmailHistoricalFindings, {
		relationName: "gmailHistoricalFindings_chefId_chefs_id"
	}),
	gmailHistoricalFindings_tenantId: many(gmailHistoricalFindings, {
		relationName: "gmailHistoricalFindings_tenantId_chefs_id"
	}),
	hubGroups: many(hubGroups),
	incentiveDeliveries: many(incentiveDeliveries),
	incentiveRedemptions: many(incentiveRedemptions),
	ingredientShelfLifeDefaults: many(ingredientShelfLifeDefaults),
	ingredientSubstitutions: many(ingredientSubstitutions),
	inquiryNotes: many(inquiryNotes),
	inquiryRecipeLinks: many(inquiryRecipeLinks),
	insuranceClaims: many(insuranceClaims),
	insurancePolicies: many(insurancePolicies),
	inventoryBatches: many(inventoryBatches),
	inventoryCounts: many(inventoryCounts),
	inventoryLots: many(inventoryLots),
	kdsTickets: many(kdsTickets),
	kitchenAssessments: many(kitchenAssessments),
	kitchenRentals: many(kitchenRentals),
	learningGoals: many(learningGoals),
	loyaltyRewardRedemptions: many(loyaltyRewardRedemptions),
	loyaltyRewards: many(loyaltyRewards),
	marketingCampaigns: many(marketingCampaigns),
	mealPrepBatchLogs: many(mealPrepBatchLog),
	mealPrepContainers: many(mealPrepContainers),
	mealPrepDeliveries: many(mealPrepDeliveries),
	mealPrepOrders: many(mealPrepOrders),
	mealPrepWindows: many(mealPrepWindows),
	mentorshipConnections_menteeId: many(mentorshipConnections, {
		relationName: "mentorshipConnections_menteeId_chefs_id"
	}),
	mentorshipConnections_mentorId: many(mentorshipConnections, {
		relationName: "mentorshipConnections_mentorId_chefs_id"
	}),
	mentorshipProfiles: many(mentorshipProfiles),
	integrationSyncJobs: many(integrationSyncJobs),
	integrationEntityLinks: many(integrationEntityLinks),
	integrationFieldMappings: many(integrationFieldMappings),
	ledgerEntries: many(ledgerEntries),
	mealPrepPrograms: many(mealPrepPrograms),
	loyaltyConfigs: many(loyaltyConfig),
	marketingSpendLogs: many(marketingSpendLog),
	inquiries: many(inquiries),
	ingredients: many(ingredients),
	menuApprovalRequests: many(menuApprovalRequests),
	menuBeveragePairings: many(menuBeveragePairings),
	menuDishFeedbacks: many(menuDishFeedback),
	menuItems: many(menuItems),
	menuModifications: many(menuModifications),
	menuPreferences: many(menuPreferences),
	menuRevisions: many(menuRevisions),
	menuServiceHistories: many(menuServiceHistory),
	menuTemplates: many(menuTemplates),
	menuUploadJobs: many(menuUploadJobs),
	paymentPlanInstallments: many(paymentPlanInstallments),
	notificationDeliveryLogs: many(notificationDeliveryLog),
	notificationPreferences: many(notificationPreferences),
	notifications: many(notifications),
	onboardingProgresses: many(onboardingProgress),
	opsLogs: many(opsLog),
	orderAheadItems: many(orderAheadItems),
	orderAheadOrders: many(orderAheadOrders),
	orderRequests: many(orderRequests),
	outreachCampaigns: many(outreachCampaigns),
	packingChecklists: many(packingChecklists),
	packingTemplates: many(packingTemplates),
	pantryItems: many(pantryItems),
	pantryLocations: many(pantryLocations),
	partnerImages: many(partnerImages),
	partnerLocations: many(partnerLocations),
	paymentDisputes: many(paymentDisputes),
	paymentMilestoneTemplates: many(paymentMilestoneTemplates),
	paymentMilestones: many(paymentMilestones),
	payroll941Summaries: many(payroll941Summaries),
	payrollRecords: many(payrollRecords),
	payrollW2Summaries: many(payrollW2Summaries),
	messages: many(messages),
	mileageLogs_chefId: many(mileageLogs, {
		relationName: "mileageLogs_chefId_chefs_id"
	}),
	mileageLogs_tenantId: many(mileageLogs, {
		relationName: "mileageLogs_tenantId_chefs_id"
	}),
	platformRecords: many(platformRecords),
	platformPayouts: many(platformPayouts),
	platformApiConnections: many(platformApiConnections),
	platingGuides: many(platingGuides),
	portfolioItems: many(portfolioItems),
	postEventSurveys: many(postEventSurveys),
	prepTimelines: many(prepTimeline),
	productModifierAssignments: many(productModifierAssignments),
	productModifierGroups: many(productModifierGroups),
	productModifiers: many(productModifiers),
	productProjections: many(productProjections),
	professionalAchievements: many(professionalAchievements),
	profileHighlights: many(profileHighlights),
	proposalAddons: many(proposalAddons),
	proposalTemplates: many(proposalTemplates),
	proposalTokens: many(proposalTokens),
	prospectCallScripts: many(prospectCallScripts),
	prospectNotes: many(prospectNotes),
	prospectOutreachLogs: many(prospectOutreachLog),
	prospectScrubSessions: many(prospectScrubSessions),
	prospectStageHistories: many(prospectStageHistory),
	purchaseOrderItems: many(purchaseOrderItems),
	purchaseOrders: many(purchaseOrders),
	pushSubscriptions: many(pushSubscriptions),
	qrCodes: many(qrCodes),
	qrScans: many(qrScans),
	quoteAddons: many(quoteAddons),
	quoteStateTransitions: many(quoteStateTransitions),
	quotes: many(quotes),
	raffleEntries: many(raffleEntries),
	raffleRounds: many(raffleRounds),
	platformSnapshots: many(platformSnapshots),
	rebookTokens: many(rebookTokens),
	prospects: many(prospects),
	receiptExtractions: many(receiptExtractions),
	receiptLineItems: many(receiptLineItems),
	receiptPhotos: many(receiptPhotos),
	recipeNutritions: many(recipeNutrition),
	recipeProductionLogs: many(recipeProductionLog),
	recipeShares_fromChefId: many(recipeShares, {
		relationName: "recipeShares_fromChefId_chefs_id"
	}),
	recipeShares_toChefId: many(recipeShares, {
		relationName: "recipeShares_toChefId_chefs_id"
	}),
	recipeStepPhotos: many(recipeStepPhotos),
	saleAppliedPromotions: many(saleAppliedPromotions),
	recurringInvoiceHistories: many(recurringInvoiceHistory),
	recurringInvoices: many(recurringInvoices),
	recurringMenuRecommendations: many(recurringMenuRecommendations),
	recurringSchedules: many(recurringSchedules),
	recurringServices: many(recurringServices),
	referralPartners: many(referralPartners),
	referralRequestLogs: many(referralRequestLog),
	registerSessions: many(registerSessions),
	remyAbuseLogs: many(remyAbuseLog),
	remyActionAuditLogs_chefId: many(remyActionAuditLog, {
		relationName: "remyActionAuditLog_chefId_chefs_id"
	}),
	remyActionAuditLogs_tenantId: many(remyActionAuditLog, {
		relationName: "remyActionAuditLog_tenantId_chefs_id"
	}),
	remyApprovalPolicies: many(remyApprovalPolicies),
	remyArtifacts: many(remyArtifacts),
	remyConversations: many(remyConversations),
	remyFeedbacks_chefId: many(remyFeedback, {
		relationName: "remyFeedback_chefId_chefs_id"
	}),
	remyFeedbacks_tenantId: many(remyFeedback, {
		relationName: "remyFeedback_tenantId_chefs_id"
	}),
	remyMemories: many(remyMemories),
	remyMessages: many(remyMessages),
	remyUsageMetrics: many(remyUsageMetrics),
	responseTemplates_chefId: many(responseTemplates, {
		relationName: "responseTemplates_chefId_chefs_id"
	}),
	responseTemplates_tenantId: many(responseTemplates, {
		relationName: "responseTemplates_tenantId_chefs_id"
	}),
	retainerPeriods: many(retainerPeriods),
	retainers: many(retainers),
	retirementContributions: many(retirementContributions),
	rsvpReminderLogs: many(rsvpReminderLog),
	saleItems: many(saleItems),
	sales: many(sales),
	salesTaxRemittances: many(salesTaxRemittances),
	salesTaxSettings: many(salesTaxSettings),
	scheduledCalls: many(scheduledCalls),
	scheduledMessages: many(scheduledMessages),
	scheduledShifts: many(scheduledShifts),
	seasonalAvailabilityPeriods: many(seasonalAvailabilityPeriods),
	sequenceEnrollments: many(sequenceEnrollments),
	servedDishHistories: many(servedDishHistory),
	serviceCourses: many(serviceCourses),
	shiftHandoffNotes: many(shiftHandoffNotes),
	shiftLogs: many(shiftLogs),
	shiftSwapRequests: many(shiftSwapRequests),
	shiftTemplates: many(shiftTemplates),
	shoppingLists: many(shoppingLists),
	simulationResults: many(simulationResults),
	simulationRuns: many(simulationRuns),
	smartFieldValues: many(smartFieldValues),
	smartGroceryLists: many(smartGroceryLists),
	smsMessages: many(smsMessages),
	smsSendLogs: many(smsSendLog),
	socialConnectedAccounts: many(socialConnectedAccounts),
	socialHashtagSets: many(socialHashtagSets),
	socialMediaAssets: many(socialMediaAssets),
	socialPlatformCredentials: many(socialPlatformCredentials),
	socialPostAssets: many(socialPostAssets),
	socialQueueSettings: many(socialQueueSettings),
	socialStatsSnapshots: many(socialStatsSnapshots),
	socialTemplates: many(socialTemplates),
	sops: many(sops),
	sourcingEntries: many(sourcingEntries),
	staffAvailabilities_chefId: many(staffAvailability, {
		relationName: "staffAvailability_chefId_chefs_id"
	}),
	staffAvailabilities_tenantId: many(staffAvailability, {
		relationName: "staffAvailability_tenantId_chefs_id"
	}),
	staffClockEntries: many(staffClockEntries),
	staffMeals: many(staffMeals),
	staffOnboardingItems: many(staffOnboardingItems),
	staffPerformanceScores: many(staffPerformanceScores),
	staffSchedules: many(staffSchedules),
	stationComponents: many(stationComponents),
	stationMenuItems: many(stationMenuItems),
	stations: many(stations),
	stocktakeItems: many(stocktakeItems),
	stocktakes: many(stocktakes),
	storageLocations: many(storageLocations),
	storeItemAssignments: many(storeItemAssignments),
	stripeTransfers: many(stripeTransfers),
	subcontractAgreements_hiringChefId: many(subcontractAgreements, {
		relationName: "subcontractAgreements_hiringChefId_chefs_id"
	}),
	subcontractAgreements_subcontractorChefId: many(subcontractAgreements, {
		relationName: "subcontractAgreements_subcontractorChefId_chefs_id"
	}),
	taskCompletionLogs: many(taskCompletionLog),
	taskDependencies: many(taskDependencies),
	socialPosts: many(socialPosts),
	staffMembers: many(staffMembers),
	taskTemplates: many(taskTemplates),
	tasks: many(tasks),
	vendorCatalogImportRows: many(vendorCatalogImportRows),
	taxCollecteds: many(taxCollected),
	taxFilings: many(taxFilings),
	taxJurisdictions: many(taxJurisdictions),
	taxQuarterlyEstimates: many(taxQuarterlyEstimates),
	taxSettings: many(taxSettings),
	timeBlocks: many(timeBlocks),
	truckLocations: many(truckLocations),
	truckPreorders: many(truckPreorders),
	truckSchedules: many(truckSchedule),
	unusedIngredients: many(unusedIngredients),
	vaTasks: many(vaTasks),
	varianceAlertSettings: many(varianceAlertSettings),
	vehicleMaintenances: many(vehicleMaintenance),
	vendorEventAssignments: many(vendorEventAssignments),
	vendorInvoiceLineItems: many(vendorInvoiceLineItems),
	vendorInvoices: many(vendorInvoices),
	vendorItems: many(vendorItems),
	vendorPreferredIngredients: many(vendorPreferredIngredients),
	vendorPriceEntries: many(vendorPriceEntries),
	vendorPricePoints: many(vendorPricePoints),
	waitlistEntries: many(waitlistEntries),
	wasteLogs_chefId: many(wasteLog),
	wasteLogs_chefId: many(wasteLogs),
	webhookEndpoints: many(webhookEndpoints),
	websiteStatsSnapshots: many(websiteStatsSnapshots),
	wholesaleAccounts: many(wholesaleAccounts),
	wholesaleOrders: many(wholesaleOrders),
	wixConnections_chefId: many(wixConnections, {
		relationName: "wixConnections_chefId_chefs_id"
	}),
	wixConnections_tenantId: many(wixConnections, {
		relationName: "wixConnections_tenantId_chefs_id"
	}),
	wixSubmissions: many(wixSubmissions),
	tenantSettings: many(tenantSettings),
	vendorPriceAlertSettings: many(vendorPriceAlertSettings),
	workflowExecutionLogs: many(workflowExecutionLog),
	testimonials: many(testimonials),
	vendorDocumentUploads: many(vendorDocumentUploads),
	vendors: many(vendors),
	tastingMenus: many(tastingMenus),
	aarRecipeFeedbacks: many(aarRecipeFeedback),
	recipeFamilies: many(recipeFamilies),
	recipes: many(recipes),
	aarIngredientIssues: many(aarIngredientIssues),
	expenseLineItems: many(expenseLineItems),
	workflowTemplates: many(workflowTemplates),
	menus: many(menus, {
		relationName: "menus_tenantId_chefs_id"
	}),
	events: many(events),
	workflowExecutions: many(workflowExecutions),
	conversationThreadReads: many(conversationThreadReads),
	chefFeatureFlags: many(chefFeatureFlags),
	quoteSelectedAddons: many(quoteSelectedAddons),
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

export const eventsRelations = relations(events, ({one, many}) => ({
	adminTimeLogs: many(adminTimeLogs),
	eventSurveys: many(eventSurveys),
	eventStateTransitions: many(eventStateTransitions),
	afterActionReviews: many(afterActionReviews),
	loyaltyTransactions: many(loyaltyTransactions),
	eventContracts: many(eventContracts),
	eventTips: many(eventTips),
	shoppingSubstitutions: many(shoppingSubstitutions),
	chatMessages: many(chatMessages),
	clientNotes: many(clientNotes),
	chefFeedbacks: many(chefFeedback),
	dishAppearances: many(dishAppearances),
	eventStaffAssignments: many(eventStaffAssignments),
	eventShares: many(eventShares),
	clientSatisfactionSurveys: many(clientSatisfactionSurveys),
	guestDayOfReminders: many(guestDayOfReminders),
	clientQuickRequests: many(clientQuickRequests),
	guestDietaryConfirmations: many(guestDietaryConfirmations),
	eventGuestDocuments: many(eventGuestDocuments),
	eventGuests: many(eventGuests),
	clientProposals: many(clientProposals),
	staffEventTokens: many(staffEventTokens),
	eventSalesTaxes: many(eventSalesTax),
	cannabisEventDetails: many(cannabisEventDetails),
	followUpSends: many(followUpSends),
	guestMessages: many(guestMessages),
	aiTaskQueues: many(aiTaskQueue),
	platformActionLogs: many(platformActionLog),
	eventReadinessGates: many(eventReadinessGates),
	inventoryAudits: many(inventoryAudits),
	tipRequests: many(tipRequests),
	cannabisControlPacketEvidences: many(cannabisControlPacketEvidence),
	chefPreferences: many(chefPreferences),
	eventCannabisCourseConfigs: many(eventCannabisCourseConfig),
	commercePaymentSchedules: many(commercePaymentSchedules),
	commercePayments: many(commercePayments),
	inventoryTransactions: many(inventoryTransactions),
	cannabisControlPacketSnapshots: many(cannabisControlPacketSnapshots),
	eventGuestDietaryItems: many(eventGuestDietaryItems),
	eventGuestRsvpAudits: many(eventGuestRsvpAudit),
	eventJoinRequests: many(eventJoinRequests),
	eventStubs: many(eventStubs),
	hubGroupEvents: many(hubGroupEvents),
	clientPreferences: many(clientPreferences),
	clientWorksheets: many(clientWorksheets),
	hubShareCards: many(hubShareCards),
	eventPrepSteps: many(eventPrepSteps),
	dietaryConfirmations: many(dietaryConfirmations),
	eventLiveStatuses: many(eventLiveStatus),
	clientReferrals: many(clientReferrals),
	eventEquipmentChecklists: many(eventEquipmentChecklist),
	eventFloorPlans: many(eventFloorPlans),
	eventSiteAssessments: many(eventSiteAssessments),
	chefDocuments: many(chefDocuments),
	groceryTripSplits: many(groceryTripSplits),
	eventFeedbacks: many(eventFeedback),
	giftCertificates: many(giftCertificates),
	grocerySpendEntries: many(grocerySpendEntries),
	eventContacts: many(eventContacts),
	eventPaymentMilestones: many(eventPaymentMilestones),
	guestCountChanges: many(guestCountChanges),
	chefAvailabilityBlocks: many(chefAvailabilityBlocks),
	chefIncidents: many(chefIncidents),
	chefReminders: many(chefReminders),
	cannabisControlPacketReconciliations: many(cannabisControlPacketReconciliations),
	clientReviews: many(clientReviews),
	conversations: many(conversations),
	dietaryConflictAlerts: many(dietaryConflictAlerts),
	dishFeedbacks: many(dishFeedback),
	equipmentRentals: many(equipmentRentals),
	eventAlcoholLogs: many(eventAlcoholLogs),
	eventCannabisSettings: many(eventCannabisSettings),
	eventCollaborators: many(eventCollaborators),
	eventContentDrafts: many(eventContentDrafts),
	eventContingencyNotes: many(eventContingencyNotes),
	eventDocumentGenerationJobs: many(eventDocumentGenerationJobs),
	eventEquipmentAssignments: many(eventEquipmentAssignments),
	eventEquipmentRentals: many(eventEquipmentRentals),
	eventLeftoverDetails_eventId: many(eventLeftoverDetails, {
		relationName: "eventLeftoverDetails_eventId_events_id"
	}),
	eventLeftoverDetails_nextEventId: many(eventLeftoverDetails, {
		relationName: "eventLeftoverDetails_nextEventId_events_id"
	}),
	eventPhotos: many(eventPhotos),
	eventSafetyChecklists: many(eventSafetyChecklists),
	eventServiceSessions: many(eventServiceSessions, {
		relationName: "eventServiceSessions_eventId_events_id"
	}),
	eventShareInviteEvents: many(eventShareInviteEvents),
	eventShareInvites: many(eventShareInvites),
	eventStationAssignments: many(eventStationAssignments),
	eventPrepBlocks: many(eventPrepBlocks),
	dopTaskCompletions: many(dopTaskCompletions),
	eventDocumentSnapshots: many(eventDocumentSnapshots),
	eventTempLogs: many(eventTempLogs),
	eventTravelLegs: many(eventTravelLegs),
	eventVendorDeliveries: many(eventVendorDeliveries),
	eventWasteLogs: many(eventWasteLogs),
	frontOfHouseMenus: many(frontOfHouseMenus),
	goalClientSuggestions: many(goalClientSuggestions),
	groceryPriceQuotes: many(groceryPriceQuotes),
	guestCommunicationLogs: many(guestCommunicationLogs),
	guestLeads: many(guestLeads),
	guestPhotos: many(guestPhotos),
	guestTestimonials: many(guestTestimonials),
	guestEventProfiles: many(guestEventProfile),
	expenses: many(expenses),
	hubGuestEventHistories: many(hubGuestEventHistory),
	guestFeedbacks: many(guestFeedback),
	hubGroups: many(hubGroups),
	incentiveRedemptions: many(incentiveRedemptions),
	insuranceClaims: many(insuranceClaims),
	kitchenAssessments: many(kitchenAssessments),
	kitchenRentals: many(kitchenRentals),
	loyaltyRewardRedemptions: many(loyaltyRewardRedemptions),
	ledgerEntries: many(ledgerEntries),
	hubMedias: many(hubMedia),
	inquiries: many(inquiries, {
		relationName: "inquiries_convertedToEventId_events_id"
	}),
	menuApprovalRequests: many(menuApprovalRequests),
	menuModifications: many(menuModifications),
	menuPreferences: many(menuPreferences),
	menuRevisions: many(menuRevisions),
	menuServiceHistories: many(menuServiceHistory),
	paymentPlanInstallments: many(paymentPlanInstallments),
	notifications: many(notifications),
	packingChecklists: many(packingChecklists),
	paymentDisputes: many(paymentDisputes),
	paymentMilestones: many(paymentMilestones),
	messages: many(messages),
	mileageLogs: many(mileageLogs),
	platformRecords: many(platformRecords),
	platformPayouts: many(platformPayouts),
	packingConfirmations: many(packingConfirmations),
	postEventSurveys: many(postEventSurveys),
	prepTimelines: many(prepTimeline),
	proposalTokens: many(proposalTokens),
	quotes: many(quotes, {
		relationName: "quotes_eventId_events_id"
	}),
	platformSnapshots: many(platformSnapshots),
	rebookTokens: many(rebookTokens),
	receiptLineItems: many(receiptLineItems),
	receiptPhotos: many(receiptPhotos),
	recipeProductionLogs: many(recipeProductionLog),
	referralPartners: many(referralPartners, {
		relationName: "referralPartners_originEventId_events_id"
	}),
	referralRequestLogs: many(referralRequestLog),
	remyArtifacts: many(remyArtifacts),
	remyMemories: many(remyMemories),
	rsvpReminderLogs: many(rsvpReminderLog),
	sales: many(sales),
	scheduledCalls: many(scheduledCalls),
	servedDishHistories: many(servedDishHistory),
	serviceCourses: many(serviceCourses),
	shoppingLists: many(shoppingLists),
	smartGroceryLists: many(smartGroceryLists),
	sourcingEntries: many(sourcingEntries),
	staffClockEntries: many(staffClockEntries),
	staffMeals: many(staffMeals),
	staffSchedules: many(staffSchedules),
	stripeTransfers: many(stripeTransfers),
	subcontractAgreements: many(subcontractAgreements),
	socialPosts: many(socialPosts),
	travelLegIngredients: many(travelLegIngredients),
	unusedIngredients_eventId: many(unusedIngredients, {
		relationName: "unusedIngredients_eventId_events_id"
	}),
	unusedIngredients_transferredToEventId: many(unusedIngredients, {
		relationName: "unusedIngredients_transferredToEventId_events_id"
	}),
	vendorEventAssignments: many(vendorEventAssignments),
	waitlistEntries: many(waitlistEntries),
	wasteLogs: many(wasteLogs),
	testimonials: many(testimonials),
	tastingMenus: many(tastingMenus),
	menus: many(menus, {
		relationName: "menus_eventId_events_id"
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

export const usersInAuthRelations = relations(usersInAuth, ({many}) => ({
	chefTodos: many(chefTodos),
	copilotActions: many(copilotActions),
	auditLogs: many(auditLog),
	clientInvitations: many(clientInvitations),
	userRoles: many(userRoles),
	inquiryStateTransitions: many(inquiryStateTransitions),
	eventStateTransitions: many(eventStateTransitions),
	dishes_createdBy: many(dishes, {
		relationName: "dishes_createdBy_usersInAuth_id"
	}),
	dishes_updatedBy: many(dishes, {
		relationName: "dishes_updatedBy_usersInAuth_id"
	}),
	afterActionReviews_createdBy: many(afterActionReviews, {
		relationName: "afterActionReviews_createdBy_usersInAuth_id"
	}),
	afterActionReviews_updatedBy: many(afterActionReviews, {
		relationName: "afterActionReviews_updatedBy_usersInAuth_id"
	}),
	menuStateTransitions: many(menuStateTransitions),
	components_createdBy: many(components, {
		relationName: "components_createdBy_usersInAuth_id"
	}),
	components_updatedBy: many(components, {
		relationName: "components_updatedBy_usersInAuth_id"
	}),
	loyaltyTransactions: many(loyaltyTransactions),
	seasonalPalettes_createdBy: many(seasonalPalettes, {
		relationName: "seasonalPalettes_createdBy_usersInAuth_id"
	}),
	seasonalPalettes_updatedBy: many(seasonalPalettes, {
		relationName: "seasonalPalettes_updatedBy_usersInAuth_id"
	}),
	chatMessages: many(chatMessages),
	conversationParticipants: many(conversationParticipants),
	chefFeedbacks: many(chefFeedback),
	posAlertEvents_acknowledgedBy: many(posAlertEvents, {
		relationName: "posAlertEvents_acknowledgedBy_usersInAuth_id"
	}),
	posAlertEvents_resolvedBy: many(posAlertEvents, {
		relationName: "posAlertEvents_resolvedBy_usersInAuth_id"
	}),
	eventGuests_authUserId: many(eventGuests, {
		relationName: "eventGuests_authUserId_usersInAuth_id"
	}),
	eventGuests_reconciledBy: many(eventGuests, {
		relationName: "eventGuests_reconciledBy_usersInAuth_id"
	}),
	deadLetterQueues: many(deadLetterQueue),
	clientPhotos: many(clientPhotos),
	eventReadinessGates: many(eventReadinessGates),
	inventoryAudits_createdBy: many(inventoryAudits, {
		relationName: "inventoryAudits_createdBy_usersInAuth_id"
	}),
	inventoryAudits_finalizedBy: many(inventoryAudits, {
		relationName: "inventoryAudits_finalizedBy_usersInAuth_id"
	}),
	cannabisControlPacketEvidences: many(cannabisControlPacketEvidence),
	qolMetricEvents: many(qolMetricEvents),
	chefs: many(chefs),
	commercePayments: many(commercePayments),
	inventoryTransactions: many(inventoryTransactions),
	orderQueues: many(orderQueue),
	cashDrawerMovements: many(cashDrawerMovements),
	cannabisControlPacketSnapshots_finalizedBy: many(cannabisControlPacketSnapshots, {
		relationName: "cannabisControlPacketSnapshots_finalizedBy_usersInAuth_id"
	}),
	cannabisControlPacketSnapshots_generatedBy: many(cannabisControlPacketSnapshots, {
		relationName: "cannabisControlPacketSnapshots_generatedBy_usersInAuth_id"
	}),
	dailyReconciliationReports: many(dailyReconciliationReports),
	betaSurveyResponses: many(betaSurveyResponses),
	commerceDiningChecks_closedBy: many(commerceDiningChecks, {
		relationName: "commerceDiningChecks_closedBy_usersInAuth_id"
	}),
	commerceDiningChecks_openedBy: many(commerceDiningChecks, {
		relationName: "commerceDiningChecks_openedBy_usersInAuth_id"
	}),
	clientMealRequests: many(clientMealRequests),
	eventSeries_createdBy: many(eventSeries, {
		relationName: "eventSeries_createdBy_usersInAuth_id"
	}),
	eventSeries_updatedBy: many(eventSeries, {
		relationName: "eventSeries_updatedBy_usersInAuth_id"
	}),
	hubGuestProfiles: many(hubGuestProfiles),
	clients: many(clients),
	chefDocuments_createdBy: many(chefDocuments, {
		relationName: "chefDocuments_createdBy_usersInAuth_id"
	}),
	chefDocuments_updatedBy: many(chefDocuments, {
		relationName: "chefDocuments_updatedBy_usersInAuth_id"
	}),
	grocerySpendEntries: many(grocerySpendEntries),
	cannabisHostAgreements: many(cannabisHostAgreements),
	cannabisTierInvitations: many(cannabisTierInvitations),
	cannabisTierUsers: many(cannabisTierUsers),
	cannabisControlPacketReconciliations_finalizedBy: many(cannabisControlPacketReconciliations, {
		relationName: "cannabisControlPacketReconciliations_finalizedBy_usersInAuth_id"
	}),
	cannabisControlPacketReconciliations_reconciledBy: many(cannabisControlPacketReconciliations, {
		relationName: "cannabisControlPacketReconciliations_reconciledBy_usersInAuth_id"
	}),
	chefTeamMembers: many(chefTeamMembers),
	clientIncentives_createdByUserId: many(clientIncentives, {
		relationName: "clientIncentives_createdByUserId_usersInAuth_id"
	}),
	clientIncentives_purchasedByUserId: many(clientIncentives, {
		relationName: "clientIncentives_purchasedByUserId_usersInAuth_id"
	}),
	commerceRefunds: many(commerceRefunds),
	commercePromotions: many(commercePromotions),
	documentVersions: many(documentVersions),
	eventContractSigners_createdBy: many(eventContractSigners, {
		relationName: "eventContractSigners_createdBy_usersInAuth_id"
	}),
	eventContractSigners_signedByAuthUserId: many(eventContractSigners, {
		relationName: "eventContractSigners_signedByAuthUserId_usersInAuth_id"
	}),
	eventContractVersions: many(eventContractVersions),
	eventPhotos: many(eventPhotos),
	eventServiceSessions_createdBy: many(eventServiceSessions, {
		relationName: "eventServiceSessions_createdBy_usersInAuth_id"
	}),
	eventServiceSessions_updatedBy: many(eventServiceSessions, {
		relationName: "eventServiceSessions_updatedBy_usersInAuth_id"
	}),
	eventDocumentSnapshots: many(eventDocumentSnapshots),
	externalReviewSources: many(externalReviewSources),
	frontOfHouseMenus: many(frontOfHouseMenus),
	giftCardPurchaseIntents: many(giftCardPurchaseIntents),
	guestCommunicationLogs: many(guestCommunicationLogs),
	expenses_createdBy: many(expenses, {
		relationName: "expenses_createdBy_usersInAuth_id"
	}),
	expenses_updatedBy: many(expenses, {
		relationName: "expenses_updatedBy_usersInAuth_id"
	}),
	incentiveDeliveries: many(incentiveDeliveries),
	incentiveRedemptions: many(incentiveRedemptions),
	loyaltyRewards_createdBy: many(loyaltyRewards, {
		relationName: "loyaltyRewards_createdBy_usersInAuth_id"
	}),
	loyaltyRewards_updatedBy: many(loyaltyRewards, {
		relationName: "loyaltyRewards_updatedBy_usersInAuth_id"
	}),
	ledgerEntries: many(ledgerEntries),
	ingredients_createdBy: many(ingredients, {
		relationName: "ingredients_createdBy_usersInAuth_id"
	}),
	ingredients_updatedBy: many(ingredients, {
		relationName: "ingredients_updatedBy_usersInAuth_id"
	}),
	menuPreferences: many(menuPreferences),
	menuTemplates_createdBy: many(menuTemplates, {
		relationName: "menuTemplates_createdBy_usersInAuth_id"
	}),
	menuTemplates_updatedBy: many(menuTemplates, {
		relationName: "menuTemplates_updatedBy_usersInAuth_id"
	}),
	notificationPreferences: many(notificationPreferences),
	notifications: many(notifications),
	pantryItems: many(pantryItems),
	messages_approvedBy: many(messages, {
		relationName: "messages_approvedBy_usersInAuth_id"
	}),
	messages_fromUserId: many(messages, {
		relationName: "messages_fromUserId_usersInAuth_id"
	}),
	messages_toUserId: many(messages, {
		relationName: "messages_toUserId_usersInAuth_id"
	}),
	pushSubscriptions: many(pushSubscriptions),
	quoteStateTransitions: many(quoteStateTransitions),
	quotes_createdBy: many(quotes, {
		relationName: "quotes_createdBy_usersInAuth_id"
	}),
	quotes_updatedBy: many(quotes, {
		relationName: "quotes_updatedBy_usersInAuth_id"
	}),
	raffleRounds: many(raffleRounds),
	productTourProgresses: many(productTourProgress),
	recurringMenuRecommendations_respondedBy: many(recurringMenuRecommendations, {
		relationName: "recurringMenuRecommendations_respondedBy_usersInAuth_id"
	}),
	recurringMenuRecommendations_sentBy: many(recurringMenuRecommendations, {
		relationName: "recurringMenuRecommendations_sentBy_usersInAuth_id"
	}),
	referralPartners: many(referralPartners),
	registerSessions_closedBy: many(registerSessions, {
		relationName: "registerSessions_closedBy_usersInAuth_id"
	}),
	registerSessions_openedBy: many(registerSessions, {
		relationName: "registerSessions_openedBy_usersInAuth_id"
	}),
	sales_createdBy: many(sales, {
		relationName: "sales_createdBy_usersInAuth_id"
	}),
	sales_voidedBy: many(sales, {
		relationName: "sales_voidedBy_usersInAuth_id"
	}),
	staffMeals: many(staffMeals),
	staffMembers: many(staffMembers),
	timeBlocks: many(timeBlocks),
	userFeedbacks: many(userFeedback),
	recipes_createdBy: many(recipes, {
		relationName: "recipes_createdBy_usersInAuth_id"
	}),
	recipes_updatedBy: many(recipes, {
		relationName: "recipes_updatedBy_usersInAuth_id"
	}),
	menus_createdBy: many(menus, {
		relationName: "menus_createdBy_usersInAuth_id"
	}),
	menus_updatedBy: many(menus, {
		relationName: "menus_updatedBy_usersInAuth_id"
	}),
	events_createdBy: many(events, {
		relationName: "events_createdBy_usersInAuth_id"
	}),
	events_preEventChecklistConfirmedBy: many(events, {
		relationName: "events_preEventChecklistConfirmedBy_usersInAuth_id"
	}),
	events_updatedBy: many(events, {
		relationName: "events_updatedBy_usersInAuth_id"
	}),
}));

export const chefEmergencyContactsRelations = relations(chefEmergencyContacts, ({one, many}) => ({
	chef: one(chefs, {
		fields: [chefEmergencyContacts.chefId],
		references: [chefs.id]
	}),
	eventContingencyNotes: many(eventContingencyNotes),
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

export const communicationEventsRelations = relations(communicationEvents, ({one, many}) => ({
	suggestedLinks: many(suggestedLinks),
	communicationActionLogs: many(communicationActionLog),
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
}));

export const communicationClassificationRulesRelations = relations(communicationClassificationRules, ({one}) => ({
	chef: one(chefs, {
		fields: [communicationClassificationRules.tenantId],
		references: [chefs.id]
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

export const conversationThreadsRelations = relations(conversationThreads, ({one, many}) => ({
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
	communicationEvents: many(communicationEvents),
	messages: many(messages),
	conversationThreadReads: many(conversationThreadReads),
}));

export const clientsRelations = relations(clients, ({one, many}) => ({
	conversationThreads: many(conversationThreads),
	directOutreachLogs: many(directOutreachLog),
	loyaltyTransactions: many(loyaltyTransactions),
	eventContracts: many(eventContracts),
	chatInsights: many(chatInsights),
	clientNotes: many(clientNotes),
	chefFeedbacks: many(chefFeedback),
	activityEvents: many(activityEvents),
	clientIntakeResponses: many(clientIntakeResponses),
	clientIntakeShares: many(clientIntakeShares),
	eventShares: many(eventShares),
	availabilitySignalNotificationLogs: many(availabilitySignalNotificationLog),
	clientSatisfactionSurveys: many(clientSatisfactionSurveys),
	clientQuickRequests: many(clientQuickRequests),
	clientProposals: many(clientProposals),
	clientPreferencePatterns: many(clientPreferencePatterns),
	followUpSends: many(followUpSends),
	clientPhotos: many(clientPhotos),
	aiTaskQueues: many(aiTaskQueue),
	tipRequests: many(tipRequests),
	clientMergeLogs: many(clientMergeLog),
	chefActivityLogs: many(chefActivityLog),
	commercePayments: many(commercePayments),
	eventJoinRequests: many(eventJoinRequests),
	clientMealRequests: many(clientMealRequests),
	clientPreferences: many(clientPreferences),
	eventSeries: many(eventSeries),
	clientWorksheets: many(clientWorksheets),
	betaOnboardingChecklists: many(betaOnboardingChecklist),
	hubGuestProfiles: many(hubGuestProfiles),
	dietaryConfirmations: many(dietaryConfirmations),
	clientReferrals_referredClientId: many(clientReferrals, {
		relationName: "clientReferrals_referredClientId_clients_id"
	}),
	clientReferrals_referrerClientId: many(clientReferrals, {
		relationName: "clientReferrals_referrerClientId_clients_id"
	}),
	clientOutreachLogs: many(clientOutreachLog),
	clientMealPrepPreferences: many(clientMealPrepPreferences),
	containerTransactions: many(containerTransactions),
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
	bakeryOrders: many(bakeryOrders),
	communicationLogs: many(communicationLog),
	chefDocuments: many(chefDocuments),
	groceryTripSplits: many(groceryTripSplits),
	emailSequenceEnrollments: many(emailSequenceEnrollments),
	eventFeedbacks: many(eventFeedback),
	clientTasteProfiles: many(clientTasteProfiles),
	campaignRecipients: many(campaignRecipients),
	chefPortfolioRemovalRequests: many(chefPortfolioRemovalRequests),
	chefReminders: many(chefReminders),
	clientConnections_clientAId: many(clientConnections, {
		relationName: "clientConnections_clientAId_clients_id"
	}),
	clientConnections_clientBId: many(clientConnections, {
		relationName: "clientConnections_clientBId_clients_id"
	}),
	clientGiftLogs: many(clientGiftLog),
	clientIncentives_createdByClientId: many(clientIncentives, {
		relationName: "clientIncentives_createdByClientId_clients_id"
	}),
	clientIncentives_targetClientId: many(clientIncentives, {
		relationName: "clientIncentives_targetClientId_clients_id"
	}),
	clientKitchenInventories: many(clientKitchenInventory),
	clientNdas: many(clientNdas),
	clientReviews: many(clientReviews),
	dailyPlanDrafts: many(dailyPlanDrafts),
	clientTags: many(clientTags),
	clientAllergyRecords: many(clientAllergyRecords),
	communicationEvents: many(communicationEvents),
	dietaryChangeLogs: many(dietaryChangeLog),
	eventPhotos: many(eventPhotos),
	eventServiceSessions: many(eventServiceSessions),
	eventShareInvites: many(eventShareInvites),
	feedbackRequests: many(feedbackRequests),
	goalClientSuggestions: many(goalClientSuggestions),
	guestLeads: many(guestLeads),
	householdMembers: many(householdMembers),
	households: many(households),
	incentiveRedemptions: many(incentiveRedemptions),
	kitchenAssessments: many(kitchenAssessments),
	loyaltyRewardRedemptions: many(loyaltyRewardRedemptions),
	mealPrepContainers: many(mealPrepContainers),
	mealPrepDeliveries: many(mealPrepDeliveries),
	ledgerEntries: many(ledgerEntries),
	mealPrepPrograms: many(mealPrepPrograms),
	inquiries: many(inquiries),
	menuApprovalRequests: many(menuApprovalRequests),
	menuDishFeedbacks: many(menuDishFeedback),
	menuServiceHistories: many(menuServiceHistory),
	notifications: many(notifications),
	orderAheadOrders: many(orderAheadOrders),
	packingChecklists: many(packingChecklists),
	pantryLocations: many(pantryLocations),
	messages: many(messages),
	platformRecords: many(platformRecords),
	postEventSurveys: many(postEventSurveys),
	proposalTokens: many(proposalTokens),
	quotes: many(quotes),
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
	rebookTokens: many(rebookTokens),
	receiptPhotos: many(receiptPhotos),
	recurringInvoiceHistories: many(recurringInvoiceHistory),
	recurringInvoices: many(recurringInvoices),
	recurringMenuRecommendations: many(recurringMenuRecommendations),
	recurringSchedules: many(recurringSchedules),
	recurringServices: many(recurringServices),
	referralPartners: many(referralPartners),
	referralRequestLogs: many(referralRequestLog),
	remyArtifacts: many(remyArtifacts),
	remyMemories: many(remyMemories),
	retainers: many(retainers),
	sales: many(sales),
	scheduledCalls: many(scheduledCalls),
	sequenceEnrollments: many(sequenceEnrollments),
	servedDishHistories: many(servedDishHistory),
	waitlistEntries: many(waitlistEntries),
	wixSubmissions: many(wixSubmissions),
	testimonials: many(testimonials),
	menus: many(menus),
	events: many(events),
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

export const copilotRecommendationsRelations = relations(copilotRecommendations, ({one, many}) => ({
	copilotActions: many(copilotActions),
	copilotRun: one(copilotRuns, {
		fields: [copilotRecommendations.runId],
		references: [copilotRuns.id]
	}),
	chef: one(chefs, {
		fields: [copilotRecommendations.tenantId],
		references: [chefs.id]
	}),
}));

export const copilotRunsRelations = relations(copilotRuns, ({one, many}) => ({
	copilotActions: many(copilotActions),
	chef: one(chefs, {
		fields: [copilotRuns.tenantId],
		references: [chefs.id]
	}),
	copilotRecommendations: many(copilotRecommendations),
	copilotRunErrors: many(copilotRunErrors),
}));

export const campaignTemplatesRelations = relations(campaignTemplates, ({one}) => ({
	chef: one(chefs, {
		fields: [campaignTemplates.chefId],
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

export const userRolesRelations = relations(userRoles, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [userRoles.authUserId],
		references: [usersInAuth.id]
	}),
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
	gmailSyncLogs: many(gmailSyncLog),
	aiTaskQueues: many(aiTaskQueue),
	platformActionLogs: many(platformActionLog),
	eventSeries: many(eventSeries),
	clientReferrals: many(clientReferrals),
	chefDocuments: many(chefDocuments),
	campaignRecipients: many(campaignRecipients),
	chefReminders: many(chefReminders),
	contactSubmissions: many(contactSubmissions),
	conversations: many(conversations),
	eventServiceSessions: many(eventServiceSessions),
	gmailHistoricalFindings: many(gmailHistoricalFindings),
	hubGroups: many(hubGroups),
	inquiryNotes: many(inquiryNotes),
	inquiryRecipeLinks: many(inquiryRecipeLinks),
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
	notifications: many(notifications),
	messages: many(messages),
	platformRecords: many(platformRecords),
	platformPayouts: many(platformPayouts),
	quotes: many(quotes),
	platformSnapshots: many(platformSnapshots),
	prospects: many(prospects),
	scheduledCalls: many(scheduledCalls),
	wixSubmissions: many(wixSubmissions),
	events: many(events, {
		relationName: "events_inquiryId_inquiries_id"
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
	tastingMenuCourse: one(tastingMenuCourses, {
		fields: [dishes.sourceTastingCourseId],
		references: [tastingMenuCourses.id]
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
	hubMealBoards: many(hubMealBoard),
	menuDishFeedbacks: many(menuDishFeedback),
}));

export const menusRelations = relations(menus, ({one, many}) => ({
	dishes: many(dishes),
	menuStateTransitions: many(menuStateTransitions),
	dishAppearances: many(dishAppearances),
	clientQuickRequests: many(clientQuickRequests),
	clientProposals: many(clientProposals),
	mealPrepWeeks: many(mealPrepWeeks),
	menuNutritions: many(menuNutrition),
	chefs: many(chefs, {
		relationName: "chefs_featuredBookingMenuId_menus_id"
	}),
	hubMealBoards: many(hubMealBoard),
	cookingClasses: many(cookingClasses),
	experiencePackages: many(experiencePackages),
	frontOfHouseMenus: many(frontOfHouseMenus),
	marketingCampaigns: many(marketingCampaigns),
	inquiries: many(inquiries),
	menuBeveragePairings: many(menuBeveragePairings),
	menuItems: many(menuItems),
	menuPreferences: many(menuPreferences),
	menuRevisions: many(menuRevisions),
	productProjections: many(productProjections),
	proposalTemplates: many(proposalTemplates),
	recurringSchedules: many(recurringSchedules),
	tastingMenus: many(tastingMenus),
	client: one(clients, {
		fields: [menus.clientId],
		references: [clients.id]
	}),
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
	events: many(events, {
		relationName: "events_menuId_menus_id"
	}),
}));

export const tastingMenuCoursesRelations = relations(tastingMenuCourses, ({one, many}) => ({
	dishes: many(dishes),
	components: many(components),
	recipe: one(recipes, {
		fields: [tastingMenuCourses.recipeId],
		references: [recipes.id]
	}),
	tastingMenu: one(tastingMenus, {
		fields: [tastingMenuCourses.tastingMenuId],
		references: [tastingMenus.id]
	}),
}));

export const afterActionReviewsRelations = relations(afterActionReviews, ({one, many}) => ({
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
	aarRecipeFeedbacks: many(aarRecipeFeedback),
	aarIngredientIssues: many(aarIngredientIssues),
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
	tastingMenuCourse: one(tastingMenuCourses, {
		fields: [components.sourceTastingCourseId],
		references: [tastingMenuCourses.id]
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
	eventLeftoverDetails: many(eventLeftoverDetails),
	menuModifications: many(menuModifications),
}));

export const recipesRelations = relations(recipes, ({one, many}) => ({
	components: many(components),
	menuNutritions: many(menuNutrition),
	dailySpecials: many(dailySpecials),
	bakeryBatches: many(bakeryBatches),
	chefJournalRecipeLinks: many(chefJournalRecipeLinks),
	chefJourneyIdeas: many(chefJourneyIdeas),
	dishIndices: many(dishIndex),
	inquiryRecipeLinks: many(inquiryRecipeLinks),
	mealPrepBatchLogs: many(mealPrepBatchLog),
	menuItems: many(menuItems),
	platingGuides: many(platingGuides),
	productProjections: many(productProjections),
	recipeIngredients: many(recipeIngredients),
	recipeNutritions: many(recipeNutrition),
	recipeProductionLogs: many(recipeProductionLog),
	recipeShares_createdRecipeId: many(recipeShares, {
		relationName: "recipeShares_createdRecipeId_recipes_id"
	}),
	recipeShares_originalRecipeId: many(recipeShares, {
		relationName: "recipeShares_originalRecipeId_recipes_id"
	}),
	recipeStepPhotos: many(recipeStepPhotos),
	recipeSubRecipes_childRecipeId: many(recipeSubRecipes, {
		relationName: "recipeSubRecipes_childRecipeId_recipes_id"
	}),
	recipeSubRecipes_parentRecipeId: many(recipeSubRecipes, {
		relationName: "recipeSubRecipes_parentRecipeId_recipes_id"
	}),
	servedDishHistories: many(servedDishHistory),
	staffMeals: many(staffMeals),
	tastingMenuCourses: many(tastingMenuCourses),
	aarRecipeFeedbacks: many(aarRecipeFeedback),
	usersInAuth_createdBy: one(usersInAuth, {
		fields: [recipes.createdBy],
		references: [usersInAuth.id],
		relationName: "recipes_createdBy_usersInAuth_id"
	}),
	recipeFamily: one(recipeFamilies, {
		fields: [recipes.familyId],
		references: [recipeFamilies.id]
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

export const contractTemplatesRelations = relations(contractTemplates, ({one, many}) => ({
	chef: one(chefs, {
		fields: [contractTemplates.chefId],
		references: [chefs.id]
	}),
	eventContracts: many(eventContracts),
}));

export const eventContractsRelations = relations(eventContracts, ({one, many}) => ({
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
	eventContractSigners: many(eventContractSigners),
	eventContractVersions: many(eventContractVersions),
	proposalTokens: many(proposalTokens, {
		relationName: "proposalTokens_contractId_eventContracts_id"
	}),
}));

export const proposalTokensRelations = relations(proposalTokens, ({one, many}) => ({
	eventContracts: many(eventContracts, {
		relationName: "eventContracts_proposalTokenId_proposalTokens_id"
	}),
	proposalAddonSelections: many(proposalAddonSelections),
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

export const conversationsRelations = relations(conversations, ({one, many}) => ({
	chatInsights: many(chatInsights),
	chatMessages: many(chatMessages),
	conversationParticipants: many(conversationParticipants),
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
}));

export const chatMessagesRelations = relations(chatMessages, ({one, many}) => ({
	chatInsights: many(chatInsights),
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
	clientAllergyRecords: many(clientAllergyRecords),
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

export const clientIntakeFormsRelations = relations(clientIntakeForms, ({one, many}) => ({
	clientIntakeResponses: many(clientIntakeResponses),
	clientIntakeShares: many(clientIntakeShares),
	chef: one(chefs, {
		fields: [clientIntakeForms.tenantId],
		references: [chefs.id]
	}),
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

export const chefJourneysRelations = relations(chefJourneys, ({one, many}) => ({
	chef: one(chefs, {
		fields: [chefJourneys.tenantId],
		references: [chefs.id]
	}),
	chefJournalMedias: many(chefJournalMedia),
	chefJournalRecipeLinks: many(chefJournalRecipeLinks),
	chefJourneyEntries: many(chefJourneyEntries),
	chefJourneyIdeas: many(chefJourneyIdeas),
}));

export const jobRetryLogRelations = relations(jobRetryLog, ({one}) => ({
	chef: one(chefs, {
		fields: [jobRetryLog.tenantId],
		references: [chefs.id]
	}),
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

export const chefJourneyEntriesRelations = relations(chefJourneyEntries, ({one, many}) => ({
	chefJournalMedias: many(chefJournalMedia),
	chefJournalRecipeLinks: many(chefJournalRecipeLinks),
	chefJourney: one(chefJourneys, {
		fields: [chefJourneyEntries.journeyId],
		references: [chefJourneys.id]
	}),
	chef: one(chefs, {
		fields: [chefJourneyEntries.tenantId],
		references: [chefs.id]
	}),
	chefJourneyIdeas: many(chefJourneyIdeas),
}));

export const chefMomentumSnapshotsRelations = relations(chefMomentumSnapshots, ({one}) => ({
	chef: one(chefs, {
		fields: [chefMomentumSnapshots.tenantId],
		references: [chefs.id]
	}),
}));

export const chefGoalsRelations = relations(chefGoals, ({one, many}) => ({
	chef: one(chefs, {
		fields: [chefGoals.tenantId],
		references: [chefs.id]
	}),
	goalCheckIns: many(goalCheckIns),
	goalClientSuggestions: many(goalClientSuggestions),
	goalSnapshots: many(goalSnapshots),
}));

export const chefAvailabilityShareTokensRelations = relations(chefAvailabilityShareTokens, ({one}) => ({
	chef: one(chefs, {
		fields: [chefAvailabilityShareTokens.tenantId],
		references: [chefs.id]
	}),
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

export const dishIndexRelations = relations(dishIndex, ({one, many}) => ({
	dishAppearances: many(dishAppearances),
	dishFeedbacks: many(dishFeedback),
	recipe: one(recipes, {
		fields: [dishIndex.linkedRecipeId],
		references: [recipes.id]
	}),
	chef: one(chefs, {
		fields: [dishIndex.tenantId],
		references: [chefs.id]
	}),
	dishVariations_parentDishId: many(dishVariations, {
		relationName: "dishVariations_parentDishId_dishIndex_id"
	}),
	dishVariations_variantDishId: many(dishVariations, {
		relationName: "dishVariations_variantDishId_dishIndex_id"
	}),
}));

export const menuUploadJobsRelations = relations(menuUploadJobs, ({one, many}) => ({
	dishAppearances: many(dishAppearances),
	chef: one(chefs, {
		fields: [menuUploadJobs.tenantId],
		references: [chefs.id]
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

export const staffMembersRelations = relations(staffMembers, ({one, many}) => ({
	eventStaffAssignments: many(eventStaffAssignments),
	contractorPayments: many(contractorPayments),
	deviceEvents: many(deviceEvents),
	sopCompletions: many(sopCompletions),
	tipDistributions: many(tipDistributions),
	tipEntries: many(tipEntries),
	clipboardEntries: many(clipboardEntries),
	contractorServiceAgreements: many(contractorServiceAgreements),
	deviceSessions: many(deviceSessions),
	employees: many(employees),
	eventStationAssignments: many(eventStationAssignments),
	guestComps_createdBy: many(guestComps, {
		relationName: "guestComps_createdBy_staffMembers_id"
	}),
	guestComps_redeemedBy: many(guestComps, {
		relationName: "guestComps_redeemedBy_staffMembers_id"
	}),
	guestVisits: many(guestVisits),
	opsLogs: many(opsLog),
	orderRequests: many(orderRequests),
	scheduledShifts: many(scheduledShifts),
	shiftLogs: many(shiftLogs),
	shiftSwapRequests_coveringStaffId: many(shiftSwapRequests, {
		relationName: "shiftSwapRequests_coveringStaffId_staffMembers_id"
	}),
	shiftSwapRequests_requestingStaffId: many(shiftSwapRequests, {
		relationName: "shiftSwapRequests_requestingStaffId_staffMembers_id"
	}),
	staffAvailabilities: many(staffAvailability),
	staffClockEntries: many(staffClockEntries),
	staffOnboardingItems: many(staffOnboardingItems),
	staffPerformanceScores: many(staffPerformanceScores),
	staffSchedules: many(staffSchedules),
	taskCompletionLogs: many(taskCompletionLog),
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
	tasks_assignedTo: many(tasks, {
		relationName: "tasks_assignedTo_staffMembers_id"
	}),
	tasks_completedBy: many(tasks, {
		relationName: "tasks_completedBy_staffMembers_id"
	}),
	wasteLogs: many(wasteLog),
}));

export const zapierWebhookSubscriptionsRelations = relations(zapierWebhookSubscriptions, ({one, many}) => ({
	chef: one(chefs, {
		fields: [zapierWebhookSubscriptions.tenantId],
		references: [chefs.id]
	}),
	zapierWebhookDeliveries: many(zapierWebhookDeliveries),
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

export const chefSocialChannelsRelations = relations(chefSocialChannels, ({one, many}) => ({
	chefChannelMemberships: many(chefChannelMemberships),
	chef: one(chefs, {
		fields: [chefSocialChannels.createdByChefId],
		references: [chefs.id]
	}),
	chefSocialPosts: many(chefSocialPosts),
}));

export const zapierWebhookDeliveriesRelations = relations(zapierWebhookDeliveries, ({one}) => ({
	zapierWebhookSubscription: one(zapierWebhookSubscriptions, {
		fields: [zapierWebhookDeliveries.subscriptionId],
		references: [zapierWebhookSubscriptions.id]
	}),
}));

export const eventSharesRelations = relations(eventShares, ({one, many}) => ({
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
	eventJoinRequests: many(eventJoinRequests),
	eventShareInvites: many(eventShareInvites),
	guestLeads: many(guestLeads),
}));

export const hubGroupsRelations = relations(hubGroups, ({one, many}) => ({
	eventShares: many(eventShares),
	openTableRequests: many(openTableRequests),
	eventStubs: many(eventStubs, {
		relationName: "eventStubs_hubGroupId_hubGroups_id"
	}),
	hubGroupEvents: many(hubGroupEvents),
	hubAvailabilities: many(hubAvailability),
	betaOnboardingChecklists: many(betaOnboardingChecklist),
	hubGuestProfiles: many(hubGuestProfiles, {
		relationName: "hubGuestProfiles_firstGroupId_hubGroups_id"
	}),
	hubShareCards: many(hubShareCards),
	openTableConsents: many(openTableConsents),
	clients_dinnerCircleGroupId: many(clients, {
		relationName: "clients_dinnerCircleGroupId_hubGroups_id"
	}),
	clients_referredFromGroupId: many(clients, {
		relationName: "clients_referredFromGroupId_hubGroups_id"
	}),
	hubMealBoards: many(hubMealBoard),
	hubMealTemplates: many(hubMealTemplates),
	hubScheduleChanges: many(hubScheduleChanges),
	hubRecurringMeals: many(hubRecurringMeals),
	hubMealRequests: many(hubMealRequests),
	hubGroupMembers: many(hubGroupMembers),
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
	hubMessages: many(hubMessages),
	hubMedias: many(hubMedia),
	hubPinnedNotes: many(hubPinnedNotes),
	hubPolls: many(hubPolls),
}));

export const eventThemesRelations = relations(eventThemes, ({many}) => ({
	eventShares: many(eventShares),
	hubGroups: many(hubGroups),
}));

export const chefNetworkFeaturePreferencesRelations = relations(chefNetworkFeaturePreferences, ({one}) => ({
	chef: one(chefs, {
		fields: [chefNetworkFeaturePreferences.chefId],
		references: [chefs.id]
	}),
}));

export const chefStoriesRelations = relations(chefStories, ({one, many}) => ({
	chef: one(chefs, {
		fields: [chefStories.chefId],
		references: [chefs.id]
	}),
	chefStoryReactions: many(chefStoryReactions),
	chefStoryViews: many(chefStoryViews),
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

export const chefCalendarEntriesRelations = relations(chefCalendarEntries, ({one, many}) => ({
	availabilitySignalNotificationLogs: many(availabilitySignalNotificationLog),
	chef: one(chefs, {
		fields: [chefCalendarEntries.chefId],
		references: [chefs.id]
	}),
}));

export const competitorBenchmarksRelations = relations(competitorBenchmarks, ({one}) => ({
	chef: one(chefs, {
		fields: [competitorBenchmarks.chefId],
		references: [chefs.id]
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

export const eventGuestsRelations = relations(eventGuests, ({one, many}) => ({
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
	guestMessages: many(guestMessages),
	eventGuestDietaryItems: many(eventGuestDietaryItems),
	eventGuestRsvpAudits: many(eventGuestRsvpAudit),
	eventJoinRequests: many(eventJoinRequests),
	eventShareInvites: many(eventShareInvites),
	guestPhotos: many(guestPhotos),
	guestTestimonials: many(guestTestimonials),
	hubGuestEventHistories: many(hubGuestEventHistory),
	guestFeedbacks: many(guestFeedback),
	rsvpReminderLogs: many(rsvpReminderLog),
}));

export const chefSchedulingRulesRelations = relations(chefSchedulingRules, ({one}) => ({
	chef: one(chefs, {
		fields: [chefSchedulingRules.tenantId],
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

export const proposalTemplatesRelations = relations(proposalTemplates, ({one, many}) => ({
	clientProposals: many(clientProposals),
	chef: one(chefs, {
		fields: [proposalTemplates.chefId],
		references: [chefs.id]
	}),
	menu: one(menus, {
		fields: [proposalTemplates.defaultMenuId],
		references: [menus.id]
	}),
}));

export const benchmarkSnapshotsRelations = relations(benchmarkSnapshots, ({one}) => ({
	chef: one(chefs, {
		fields: [benchmarkSnapshots.chefId],
		references: [chefs.id]
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

export const automationExecutionLogRelations = relations(automationExecutionLog, ({one}) => ({
	chef: one(chefs, {
		fields: [automationExecutionLog.tenantId],
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
	equipmentMaintenanceLogs: many(equipmentMaintenanceLog),
	eventEquipmentAssignments: many(eventEquipmentAssignments),
	chef: one(chefs, {
		fields: [equipmentItems.chefId],
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
	containerTransactions: many(containerTransactions),
	mealPrepDeliveries: many(mealPrepDeliveries),
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

export const chefServiceTypesRelations = relations(chefServiceTypes, ({one}) => ({
	chef: one(chefs, {
		fields: [chefServiceTypes.tenantId],
		references: [chefs.id]
	}),
}));

export const fineTuningExamplesRelations = relations(fineTuningExamples, ({one}) => ({
	chef: one(chefs, {
		fields: [fineTuningExamples.tenantId],
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

export const followupRulesRelations = relations(followupRules, ({one, many}) => ({
	followUpSends: many(followUpSends),
	chef: one(chefs, {
		fields: [followupRules.chefId],
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

export const chefCreativeProjectsRelations = relations(chefCreativeProjects, ({one}) => ({
	chef: one(chefs, {
		fields: [chefCreativeProjects.tenantId],
		references: [chefs.id]
	}),
}));

export const chefAutomationSettingsRelations = relations(chefAutomationSettings, ({one}) => ({
	chef: one(chefs, {
		fields: [chefAutomationSettings.tenantId],
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

export const hubGuestProfilesRelations = relations(hubGuestProfiles, ({one, many}) => ({
	openTableRequests: many(openTableRequests),
	eventStubs: many(eventStubs),
	hubAvailabilities: many(hubAvailability),
	hubAvailabilityResponses: many(hubAvailabilityResponses),
	hubChefRecommendations_fromProfileId: many(hubChefRecommendations, {
		relationName: "hubChefRecommendations_fromProfileId_hubGuestProfiles_id"
	}),
	hubChefRecommendations_toProfileId: many(hubChefRecommendations, {
		relationName: "hubChefRecommendations_toProfileId_hubGuestProfiles_id"
	}),
	hubMessageReads: many(hubMessageReads),
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
	hubShareCards: many(hubShareCards),
	openTableConsents_profileId: many(openTableConsents, {
		relationName: "openTableConsents_profileId_hubGuestProfiles_id"
	}),
	openTableConsents_requestedByProfileId: many(openTableConsents, {
		relationName: "openTableConsents_requestedByProfileId_hubGuestProfiles_id"
	}),
	hubMealBoards: many(hubMealBoard),
	hubMealFeedbacks: many(hubMealFeedback),
	hubHouseholdMembers: many(hubHouseholdMembers),
	hubMealTemplates: many(hubMealTemplates),
	hubScheduleChanges_acknowledgedByProfileId: many(hubScheduleChanges, {
		relationName: "hubScheduleChanges_acknowledgedByProfileId_hubGuestProfiles_id"
	}),
	hubScheduleChanges_postedByProfileId: many(hubScheduleChanges, {
		relationName: "hubScheduleChanges_postedByProfileId_hubGuestProfiles_id"
	}),
	hubRecurringMeals: many(hubRecurringMeals),
	hubMealComments: many(hubMealComments),
	hubMealRequests: many(hubMealRequests),
	hubGuestEventHistories: many(hubGuestEventHistory),
	hubGroupMembers: many(hubGroupMembers),
	hubGroups: many(hubGroups, {
		relationName: "hubGroups_createdByProfileId_hubGuestProfiles_id"
	}),
	hubGuestFriends_addresseeId: many(hubGuestFriends, {
		relationName: "hubGuestFriends_addresseeId_hubGuestProfiles_id"
	}),
	hubGuestFriends_requesterId: many(hubGuestFriends, {
		relationName: "hubGuestFriends_requesterId_hubGuestProfiles_id"
	}),
	hubMessages_authorProfileId: many(hubMessages, {
		relationName: "hubMessages_authorProfileId_hubGuestProfiles_id"
	}),
	hubMessages_pinnedByProfileId: many(hubMessages, {
		relationName: "hubMessages_pinnedByProfileId_hubGuestProfiles_id"
	}),
	hubMessageReactions: many(hubMessageReactions),
	hubMedias: many(hubMedia),
	hubPinnedNotes: many(hubPinnedNotes),
	hubPolls: many(hubPolls),
	hubPollVotes: many(hubPollVotes),
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

export const chefCulinaryWordsRelations = relations(chefCulinaryWords, ({one}) => ({
	chef: one(chefs, {
		fields: [chefCulinaryWords.chefId],
		references: [chefs.id]
	}),
}));

export const dailyPlanDismissalsRelations = relations(dailyPlanDismissals, ({one}) => ({
	chef: one(chefs, {
		fields: [dailyPlanDismissals.chefId],
		references: [chefs.id]
	}),
}));

export const gmailSyncLogRelations = relations(gmailSyncLog, ({one, many}) => ({
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
	wixSubmissions: many(wixSubmissions),
}));

export const googleMailboxesRelations = relations(googleMailboxes, ({one, many}) => ({
	gmailSyncLogs: many(gmailSyncLog),
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

export const platformRecordsRelations = relations(platformRecords, ({one, many}) => ({
	platformActionLogs: many(platformActionLog),
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
	platformPayouts: many(platformPayouts),
	platformSnapshots: many(platformSnapshots),
}));

export const remySupportSharesRelations = relations(remySupportShares, ({one}) => ({
	chef: one(chefs, {
		fields: [remySupportShares.tenantId],
		references: [chefs.id]
	}),
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

export const featureRequestsRelations = relations(featureRequests, ({one, many}) => ({
	featureVotes: many(featureVotes),
	chef: one(chefs, {
		fields: [featureRequests.submittedBy],
		references: [chefs.id]
	}),
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

export const devicesRelations = relations(devices, ({one, many}) => ({
	deviceEvents: many(deviceEvents),
	deviceSessions: many(deviceSessions),
	chef: one(chefs, {
		fields: [devices.tenantId],
		references: [chefs.id]
	}),
}));

export const haccpPlansRelations = relations(haccpPlans, ({one}) => ({
	chef: one(chefs, {
		fields: [haccpPlans.chefId],
		references: [chefs.id]
	}),
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

export const storageLocationsRelations = relations(storageLocations, ({one, many}) => ({
	inventoryAudits: many(inventoryAudits),
	inventoryTransactions: many(inventoryTransactions),
	inventoryAuditItems: many(inventoryAuditItems),
	inventoryBatches: many(inventoryBatches),
	chef: one(chefs, {
		fields: [storageLocations.chefId],
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

export const cannabisControlPacketReconciliationsRelations = relations(cannabisControlPacketReconciliations, ({one, many}) => ({
	cannabisControlPacketEvidences: many(cannabisControlPacketEvidence),
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
}));

export const cannabisControlPacketSnapshotsRelations = relations(cannabisControlPacketSnapshots, ({one, many}) => ({
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
	cannabisControlPacketReconciliations: many(cannabisControlPacketReconciliations),
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

export const commercePaymentsRelations = relations(commercePayments, ({one, many}) => ({
	commercePaymentSchedules: many(commercePaymentSchedules),
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
	cashDrawerMovements: many(cashDrawerMovements),
	commerceRefunds: many(commerceRefunds),
}));

export const salesRelations = relations(sales, ({one, many}) => ({
	commercePaymentSchedules: many(commercePaymentSchedules),
	commercePayments: many(commercePayments),
	inventoryTransactions: many(inventoryTransactions),
	orderQueues: many(orderQueue),
	commerceDiningChecks: many(commerceDiningChecks),
	commerceRefunds: many(commerceRefunds),
	kdsTickets: many(kdsTickets),
	saleAppliedPromotions: many(saleAppliedPromotions),
	saleItems: many(saleItems),
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

export const ledgerEntriesRelations = relations(ledgerEntries, ({one, many}) => ({
	commercePayments: many(commercePayments),
	eventPaymentMilestones: many(eventPaymentMilestones),
	commerceRefunds: many(commerceRefunds),
	incentiveRedemptions: many(incentiveRedemptions),
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

export const ingredientsRelations = relations(ingredients, ({one, many}) => ({
	inventoryTransactions: many(inventoryTransactions),
	ingredientAliases: many(ingredientAliases),
	ingredientPriceHistories: many(ingredientPriceHistory),
	groceryPriceQuoteItems: many(groceryPriceQuoteItems),
	inventoryAuditItems: many(inventoryAuditItems),
	inventoryBatches: many(inventoryBatches),
	inventoryCounts: many(inventoryCounts),
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
	pantryItems: many(pantryItems),
	recipeIngredients: many(recipeIngredients),
	staffMealItems: many(staffMealItems),
	travelLegIngredients: many(travelLegIngredients),
	vendorInvoiceItems: many(vendorInvoiceItems),
	vendorPreferredIngredients: many(vendorPreferredIngredients),
	vendorPricePoints: many(vendorPricePoints),
	aarIngredientIssues: many(aarIngredientIssues),
	expenseLineItems: many(expenseLineItems),
}));

export const vendorInvoicesRelations = relations(vendorInvoices, ({one, many}) => ({
	inventoryTransactions: many(inventoryTransactions),
	inventoryBatches: many(inventoryBatches),
	vendorInvoiceItems: many(vendorInvoiceItems),
	vendorInvoiceLineItems: many(vendorInvoiceLineItems),
	chef: one(chefs, {
		fields: [vendorInvoices.chefId],
		references: [chefs.id]
	}),
	vendor: one(vendors, {
		fields: [vendorInvoices.vendorId],
		references: [vendors.id]
	}),
}));

export const wasteLogsRelations = relations(wasteLogs, ({one, many}) => ({
	inventoryTransactions: many(inventoryTransactions),
	chef: one(chefs, {
		fields: [wasteLogs.chefId],
		references: [chefs.id]
	}),
	event: one(events, {
		fields: [wasteLogs.eventId],
		references: [events.id]
	}),
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

export const commerceRefundsRelations = relations(commerceRefunds, ({one, many}) => ({
	cashDrawerMovements: many(cashDrawerMovements),
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
}));

export const registerSessionsRelations = relations(registerSessions, ({one, many}) => ({
	cashDrawerMovements: many(cashDrawerMovements),
	commerceDiningChecks: many(commerceDiningChecks),
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

export const dailyTaxSummaryRelations = relations(dailyTaxSummary, ({one}) => ({
	chef: one(chefs, {
		fields: [dailyTaxSummary.tenantId],
		references: [chefs.id]
	}),
}));

export const settlementRecordsRelations = relations(settlementRecords, ({one}) => ({
	chef: one(chefs, {
		fields: [settlementRecords.tenantId],
		references: [chefs.id]
	}),
}));

export const charityHoursRelations = relations(charityHours, ({one}) => ({
	chef: one(chefs, {
		fields: [charityHours.chefId],
		references: [chefs.id]
	}),
}));

export const chefMarketplaceProfilesRelations = relations(chefMarketplaceProfiles, ({one}) => ({
	chef: one(chefs, {
		fields: [chefMarketplaceProfiles.chefId],
		references: [chefs.id]
	}),
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

export const eventShareInvitesRelations = relations(eventShareInvites, ({one, many}) => ({
	eventJoinRequests: many(eventJoinRequests),
	eventShareInviteEvents: many(eventShareInviteEvents),
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

export const priceWatchListRelations = relations(priceWatchList, ({one}) => ({
	chef: one(chefs, {
		fields: [priceWatchList.chefId],
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

export const emailSenderReputationRelations = relations(emailSenderReputation, ({one}) => ({
	chef: one(chefs, {
		fields: [emailSenderReputation.tenantId],
		references: [chefs.id]
	}),
}));

export const aiPreferencesRelations = relations(aiPreferences, ({one}) => ({
	chef: one(chefs, {
		fields: [aiPreferences.tenantId],
		references: [chefs.id]
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

export const ingredientAliasesRelations = relations(ingredientAliases, ({one}) => ({
	ingredient: one(ingredients, {
		fields: [ingredientAliases.ingredientId],
		references: [ingredients.id]
	}),
	systemIngredient: one(systemIngredients, {
		fields: [ingredientAliases.systemIngredientId],
		references: [systemIngredients.id]
	}),
	chef: one(chefs, {
		fields: [ingredientAliases.tenantId],
		references: [chefs.id]
	}),
}));

export const systemIngredientsRelations = relations(systemIngredients, ({many}) => ({
	ingredientAliases: many(ingredientAliases),
}));

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

export const chefHandoffsRelations = relations(chefHandoffs, ({one, many}) => ({
	chefHandoffRecipients: many(chefHandoffRecipients),
	chefHandoffEvents: many(chefHandoffEvents),
	chef: one(chefs, {
		fields: [chefHandoffs.fromChefId],
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

export const chefServiceConfigRelations = relations(chefServiceConfig, ({one}) => ({
	chef: one(chefs, {
		fields: [chefServiceConfig.chefId],
		references: [chefs.id]
	}),
}));

export const eventSeriesRelations = relations(eventSeries, ({one, many}) => ({
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
	eventServiceSessions: many(eventServiceSessions),
	events: many(events),
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

export const hubMessagesRelations = relations(hubMessages, ({one, many}) => ({
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
	hubMessageReactions: many(hubMessageReactions),
	hubPolls: many(hubPolls),
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

export const quotesRelations = relations(quotes, ({one, many}) => ({
	quoteLineItems: many(quoteLineItems),
	proposalSections: many(proposalSections),
	proposalTokens: many(proposalTokens),
	proposalViews: many(proposalViews),
	quoteAddons: many(quoteAddons),
	quoteStateTransitions: many(quoteStateTransitions),
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
	events: many(events, {
		relationName: "events_convertingQuoteId_quotes_id"
	}),
	quoteSelectedAddons: many(quoteSelectedAddons),
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

export const bookingAvailabilityRulesRelations = relations(bookingAvailabilityRules, ({one}) => ({
	chef: one(chefs, {
		fields: [bookingAvailabilityRules.chefId],
		references: [chefs.id]
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

export const chefBudgetsRelations = relations(chefBudgets, ({one}) => ({
	chef: one(chefs, {
		fields: [chefBudgets.chefId],
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

export const productProjectionsRelations = relations(productProjections, ({one, many}) => ({
	dailySpecials: many(dailySpecials),
	productPublicMediaLinks: many(productPublicMediaLinks),
	productModifierAssignments: many(productModifierAssignments),
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
	saleItems: many(saleItems),
}));

export const permitsRelations = relations(permits, ({one}) => ({
	chef: one(chefs, {
		fields: [permits.tenantId],
		references: [chefs.id]
	}),
}));

export const hubMealBoardRelations = relations(hubMealBoard, ({one, many}) => ({
	hubGuestProfile: one(hubGuestProfiles, {
		fields: [hubMealBoard.authorProfileId],
		references: [hubGuestProfiles.id]
	}),
	dish: one(dishes, {
		fields: [hubMealBoard.dishId],
		references: [dishes.id]
	}),
	hubGroup: one(hubGroups, {
		fields: [hubMealBoard.groupId],
		references: [hubGroups.id]
	}),
	menu: one(menus, {
		fields: [hubMealBoard.menuId],
		references: [menus.id]
	}),
	hubMealFeedbacks: many(hubMealFeedback),
	hubMealAttendances: many(hubMealAttendance),
	hubMealComments: many(hubMealComments),
	hubMealRequests: many(hubMealRequests),
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

export const bakeryOvensRelations = relations(bakeryOvens, ({one, many}) => ({
	bakeSchedules: many(bakeSchedule),
	chef: one(chefs, {
		fields: [bakeryOvens.tenantId],
		references: [chefs.id]
	}),
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

export const hubMealFeedbackRelations = relations(hubMealFeedback, ({one}) => ({
	hubMealBoard: one(hubMealBoard, {
		fields: [hubMealFeedback.mealEntryId],
		references: [hubMealBoard.id]
	}),
	hubGuestProfile: one(hubGuestProfiles, {
		fields: [hubMealFeedback.profileId],
		references: [hubGuestProfiles.id]
	}),
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

export const giftCardsRelations = relations(giftCards, ({one, many}) => ({
	giftCardTransactions: many(giftCardTransactions),
	chef: one(chefs, {
		fields: [giftCards.tenantId],
		references: [chefs.id]
	}),
}));

export const businessLocationsRelations = relations(businessLocations, ({one, many}) => ({
	chef: one(chefs, {
		fields: [businessLocations.tenantId],
		references: [chefs.id]
	}),
	dailyChecklistCompletions: many(dailyChecklistCompletions),
	inventoryCounts: many(inventoryCounts),
	inventoryLots: many(inventoryLots),
	sales: many(sales),
	staffMembers: many(staffMembers),
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

export const hubHouseholdMembersRelations = relations(hubHouseholdMembers, ({one, many}) => ({
	hubGuestProfile: one(hubGuestProfiles, {
		fields: [hubHouseholdMembers.profileId],
		references: [hubGuestProfiles.id]
	}),
	hubMealAttendances: many(hubMealAttendance),
}));

export const complianceCleaningLogsRelations = relations(complianceCleaningLogs, ({one}) => ({
	chef: one(chefs, {
		fields: [complianceCleaningLogs.chefId],
		references: [chefs.id]
	}),
}));

export const complianceTempLogsRelations = relations(complianceTempLogs, ({one}) => ({
	chef: one(chefs, {
		fields: [complianceTempLogs.chefId],
		references: [chefs.id]
	}),
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

export const vendorsRelations = relations(vendors, ({one, many}) => ({
	reorderSettings: many(reorderSettings),
	ingredientPriceHistories: many(ingredientPriceHistory),
	eventVendorDeliveries: many(eventVendorDeliveries),
	inventoryBatches: many(inventoryBatches),
	inventoryCounts: many(inventoryCounts),
	purchaseOrders: many(purchaseOrders),
	vendorCatalogImportRows: many(vendorCatalogImportRows),
	vendorEventAssignments: many(vendorEventAssignments),
	vendorInvoices: many(vendorInvoices),
	vendorItems: many(vendorItems),
	vendorPreferredIngredients: many(vendorPreferredIngredients),
	vendorPriceEntries: many(vendorPriceEntries),
	vendorPricePoints: many(vendorPricePoints),
	vendorPriceAlertSettings: many(vendorPriceAlertSettings),
	vendorDocumentUploads: many(vendorDocumentUploads),
	chef: one(chefs, {
		fields: [vendors.chefId],
		references: [chefs.id]
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

export const chefFoldersRelations = relations(chefFolders, ({one, many}) => ({
	chefDocuments: many(chefDocuments),
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
}));

export const hubMealTemplatesRelations = relations(hubMealTemplates, ({one}) => ({
	hubGuestProfile: one(hubGuestProfiles, {
		fields: [hubMealTemplates.createdByProfileId],
		references: [hubGuestProfiles.id]
	}),
	hubGroup: one(hubGroups, {
		fields: [hubMealTemplates.groupId],
		references: [hubGroups.id]
	}),
}));

export const entityPhotosRelations = relations(entityPhotos, ({one}) => ({
	chef: one(chefs, {
		fields: [entityPhotos.tenantId],
		references: [chefs.id]
	}),
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

export const sopsRelations = relations(sops, ({one, many}) => ({
	sopCompletions: many(sopCompletions),
	chef: one(chefs, {
		fields: [sops.tenantId],
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

export const eventTemplatesRelations = relations(eventTemplates, ({one}) => ({
	chef: one(chefs, {
		fields: [eventTemplates.tenantId],
		references: [chefs.id]
	}),
}));

export const hubScheduleChangesRelations = relations(hubScheduleChanges, ({one}) => ({
	hubGuestProfile_acknowledgedByProfileId: one(hubGuestProfiles, {
		fields: [hubScheduleChanges.acknowledgedByProfileId],
		references: [hubGuestProfiles.id],
		relationName: "hubScheduleChanges_acknowledgedByProfileId_hubGuestProfiles_id"
	}),
	hubGroup: one(hubGroups, {
		fields: [hubScheduleChanges.groupId],
		references: [hubGroups.id]
	}),
	hubGuestProfile_postedByProfileId: one(hubGuestProfiles, {
		fields: [hubScheduleChanges.postedByProfileId],
		references: [hubGuestProfiles.id],
		relationName: "hubScheduleChanges_postedByProfileId_hubGuestProfiles_id"
	}),
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

export const tipPoolConfigsRelations = relations(tipPoolConfigs, ({one, many}) => ({
	tipDistributions: many(tipDistributions),
	chef: one(chefs, {
		fields: [tipPoolConfigs.tenantId],
		references: [chefs.id]
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

export const cancellationPoliciesRelations = relations(cancellationPolicies, ({one}) => ({
	chef: one(chefs, {
		fields: [cancellationPolicies.chefId],
		references: [chefs.id]
	}),
}));

export const chefCapacitySettingsRelations = relations(chefCapacitySettings, ({one}) => ({
	chef: one(chefs, {
		fields: [chefCapacitySettings.tenantId],
		references: [chefs.id]
	}),
}));

export const chefEquipmentMasterRelations = relations(chefEquipmentMaster, ({one}) => ({
	chef: one(chefs, {
		fields: [chefEquipmentMaster.tenantId],
		references: [chefs.id]
	}),
}));

export const hubRecurringMealsRelations = relations(hubRecurringMeals, ({one}) => ({
	hubGuestProfile: one(hubGuestProfiles, {
		fields: [hubRecurringMeals.createdByProfileId],
		references: [hubGuestProfiles.id]
	}),
	hubGroup: one(hubGroups, {
		fields: [hubRecurringMeals.groupId],
		references: [hubGroups.id]
	}),
}));

export const chefDepositSettingsRelations = relations(chefDepositSettings, ({one}) => ({
	chef: one(chefs, {
		fields: [chefDepositSettings.chefId],
		references: [chefs.id]
	}),
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

export const cookingClassesRelations = relations(cookingClasses, ({one, many}) => ({
	classRegistrations: many(classRegistrations),
	menu: one(menus, {
		fields: [cookingClasses.menuId],
		references: [menus.id]
	}),
	chef: one(chefs, {
		fields: [cookingClasses.tenantId],
		references: [chefs.id]
	}),
}));

export const chefSeasonalAvailabilityRelations = relations(chefSeasonalAvailability, ({one}) => ({
	chef: one(chefs, {
		fields: [chefSeasonalAvailability.chefId],
		references: [chefs.id]
	}),
}));

export const hubMealAttendanceRelations = relations(hubMealAttendance, ({one}) => ({
	hubHouseholdMember: one(hubHouseholdMembers, {
		fields: [hubMealAttendance.householdMemberId],
		references: [hubHouseholdMembers.id]
	}),
	hubMealBoard: one(hubMealBoard, {
		fields: [hubMealAttendance.mealEntryId],
		references: [hubMealBoard.id]
	}),
}));

export const groceryTripItemsRelations = relations(groceryTripItems, ({one, many}) => ({
	groceryTrip: one(groceryTrips, {
		fields: [groceryTripItems.tripId],
		references: [groceryTrips.id]
	}),
	groceryTripSplits: many(groceryTripSplits),
}));

export const groceryTripsRelations = relations(groceryTrips, ({one, many}) => ({
	groceryTripItems: many(groceryTripItems),
	groceryTripSplits: many(groceryTripSplits),
	chef: one(chefs, {
		fields: [groceryTrips.chefId],
		references: [chefs.id]
	}),
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

export const hubMealCommentsRelations = relations(hubMealComments, ({one}) => ({
	hubGuestProfile: one(hubGuestProfiles, {
		fields: [hubMealComments.authorProfileId],
		references: [hubGuestProfiles.id]
	}),
	hubMealBoard: one(hubMealBoard, {
		fields: [hubMealComments.mealEntryId],
		references: [hubMealBoard.id]
	}),
}));

export const aislePreferencesRelations = relations(aislePreferences, ({one}) => ({
	chef: one(chefs, {
		fields: [aislePreferences.chefId],
		references: [chefs.id]
	}),
}));

export const chefEquipmentRelations = relations(chefEquipment, ({one, many}) => ({
	chef: one(chefs, {
		fields: [chefEquipment.chefId],
		references: [chefs.id]
	}),
	packingChecklistItems: many(packingChecklistItems),
}));

export const chefPreferredStoresRelations = relations(chefPreferredStores, ({one, many}) => ({
	chef: one(chefs, {
		fields: [chefPreferredStores.chefId],
		references: [chefs.id]
	}),
	storeItemAssignments: many(storeItemAssignments),
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

export const emailSequencesRelations = relations(emailSequences, ({one, many}) => ({
	emailSequenceEnrollments: many(emailSequenceEnrollments),
	emailSequenceSteps: many(emailSequenceSteps),
	chef: one(chefs, {
		fields: [emailSequences.chefId],
		references: [chefs.id]
	}),
}));

export const hubMealRequestsRelations = relations(hubMealRequests, ({one}) => ({
	hubGroup: one(hubGroups, {
		fields: [hubMealRequests.groupId],
		references: [hubGroups.id]
	}),
	hubGuestProfile: one(hubGuestProfiles, {
		fields: [hubMealRequests.requestedByProfileId],
		references: [hubGuestProfiles.id]
	}),
	hubMealBoard: one(hubMealBoard, {
		fields: [hubMealRequests.resolvedMealId],
		references: [hubMealBoard.id]
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

export const mealPrepItemsRelations = relations(mealPrepItems, ({one}) => ({
	chef: one(chefs, {
		fields: [mealPrepItems.chefId],
		references: [chefs.id]
	}),
}));

export const chefDirectoryListingsRelations = relations(chefDirectoryListings, ({one}) => ({
	chef: one(chefs, {
		fields: [chefDirectoryListings.chefId],
		references: [chefs.id]
	}),
}));

export const communityBenchmarksRelations = relations(communityBenchmarks, ({one}) => ({
	chef: one(chefs, {
		fields: [communityBenchmarks.chefId],
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

export const expensesRelations = relations(expenses, ({one, many}) => ({
	ingredientPriceHistories: many(ingredientPriceHistory),
	bankTransactions: many(bankTransactions),
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
	expenseLineItems: many(expenseLineItems),
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

export const followUpSequencesRelations = relations(followUpSequences, ({one}) => ({
	chef: one(chefs, {
		fields: [followUpSequences.chefId],
		references: [chefs.id]
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
	campaignRecipients: many(campaignRecipients),
	chef: one(chefs, {
		fields: [marketingCampaigns.chefId],
		references: [chefs.id]
	}),
	menu: one(menus, {
		fields: [marketingCampaigns.menuId],
		references: [menus.id]
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

export const bakerySeasonalItemsRelations = relations(bakerySeasonalItems, ({one}) => ({
	chef: one(chefs, {
		fields: [bakerySeasonalItems.tenantId],
		references: [chefs.id]
	}),
}));

export const bakeryTastingsRelations = relations(bakeryTastings, ({one}) => ({
	chef: one(chefs, {
		fields: [bakeryTastings.tenantId],
		references: [chefs.id]
	}),
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

export const beveragesRelations = relations(beverages, ({one, many}) => ({
	chef: one(chefs, {
		fields: [beverages.chefId],
		references: [chefs.id]
	}),
	menuBeveragePairings: many(menuBeveragePairings),
}));

export const bookingDailyCapsRelations = relations(bookingDailyCaps, ({one}) => ({
	chef: one(chefs, {
		fields: [bookingDailyCaps.chefId],
		references: [chefs.id]
	}),
}));

export const bookingDateOverridesRelations = relations(bookingDateOverrides, ({one}) => ({
	chef: one(chefs, {
		fields: [bookingDateOverrides.chefId],
		references: [chefs.id]
	}),
}));

export const bookingEventTypesRelations = relations(bookingEventTypes, ({one}) => ({
	chef: one(chefs, {
		fields: [bookingEventTypes.chefId],
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

export const cannabisHostAgreementsRelations = relations(cannabisHostAgreements, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [cannabisHostAgreements.hostUserId],
		references: [usersInAuth.id]
	}),
}));

export const cannabisTierInvitationsRelations = relations(cannabisTierInvitations, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [cannabisTierInvitations.invitedByAuthUserId],
		references: [usersInAuth.id]
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

export const chefApiKeysRelations = relations(chefApiKeys, ({one}) => ({
	chef: one(chefs, {
		fields: [chefApiKeys.tenantId],
		references: [chefs.id]
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

export const chefBusinessHealthItemsRelations = relations(chefBusinessHealthItems, ({one}) => ({
	chef: one(chefs, {
		fields: [chefBusinessHealthItems.tenantId],
		references: [chefs.id]
	}),
}));

export const chefCapabilityInventoryRelations = relations(chefCapabilityInventory, ({one}) => ({
	chef: one(chefs, {
		fields: [chefCapabilityInventory.tenantId],
		references: [chefs.id]
	}),
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

export const chefPostCommentsRelations = relations(chefPostComments, ({one, many}) => ({
	chefCommentReactions: many(chefCommentReactions),
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
	chefPostMentions: many(chefPostMentions),
}));

export const chefCrisisPlansRelations = relations(chefCrisisPlans, ({one}) => ({
	chef: one(chefs, {
		fields: [chefCrisisPlans.tenantId],
		references: [chefs.id]
	}),
}));

export const chefCulinaryProfilesRelations = relations(chefCulinaryProfiles, ({one}) => ({
	chef: one(chefs, {
		fields: [chefCulinaryProfiles.chefId],
		references: [chefs.id]
	}),
}));

export const chefDailyBriefingsRelations = relations(chefDailyBriefings, ({one}) => ({
	chef: one(chefs, {
		fields: [chefDailyBriefings.chefId],
		references: [chefs.id]
	}),
}));

export const chefEducationLogRelations = relations(chefEducationLog, ({one}) => ({
	chef: one(chefs, {
		fields: [chefEducationLog.tenantId],
		references: [chefs.id]
	}),
}));

export const chefEventTypeLabelsRelations = relations(chefEventTypeLabels, ({one}) => ({
	chef: one(chefs, {
		fields: [chefEventTypeLabels.tenantId],
		references: [chefs.id]
	}),
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

export const chefGrowthCheckinsRelations = relations(chefGrowthCheckins, ({one}) => ({
	chef: one(chefs, {
		fields: [chefGrowthCheckins.tenantId],
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

export const chefNetworkPostsRelations = relations(chefNetworkPosts, ({one}) => ({
	chef: one(chefs, {
		fields: [chefNetworkPosts.authorChefId],
		references: [chefs.id]
	}),
}));

export const chefNotificationTierOverridesRelations = relations(chefNotificationTierOverrides, ({one}) => ({
	chef: one(chefs, {
		fields: [chefNotificationTierOverrides.chefId],
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

export const chefSocialPostsRelations = relations(chefSocialPosts, ({one, many}) => ({
	chefPostComments: many(chefPostComments),
	chefPostMentions: many(chefPostMentions),
	chefPostReactions: many(chefPostReactions),
	chefPostSaves: many(chefPostSaves),
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
	chefPostHashtags: many(chefPostHashtags),
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

export const chefBreadcrumbsRelations = relations(chefBreadcrumbs, ({one}) => ({
	chef: one(chefs, {
		fields: [chefBreadcrumbs.tenantId],
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

export const chefTaxConfigRelations = relations(chefTaxConfig, ({one}) => ({
	chef: one(chefs, {
		fields: [chefTaxConfig.chefId],
		references: [chefs.id]
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

export const clientFollowupRulesRelations = relations(clientFollowupRules, ({one}) => ({
	chef: one(chefs, {
		fields: [clientFollowupRules.chefId],
		references: [chefs.id]
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

export const clientIncentivesRelations = relations(clientIncentives, ({one, many}) => ({
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
	incentiveDeliveries: many(incentiveDeliveries),
	incentiveRedemptions: many(incentiveRedemptions),
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

export const clientSegmentsRelations = relations(clientSegments, ({one}) => ({
	chef: one(chefs, {
		fields: [clientSegments.tenantId],
		references: [chefs.id]
	}),
}));

export const clientTouchpointRulesRelations = relations(clientTouchpointRules, ({one}) => ({
	chef: one(chefs, {
		fields: [clientTouchpointRules.chefId],
		references: [chefs.id]
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

export const stationComponentsRelations = relations(stationComponents, ({one, many}) => ({
	clipboardEntries: many(clipboardEntries),
	orderRequests: many(orderRequests),
	chef: one(chefs, {
		fields: [stationComponents.chefId],
		references: [chefs.id]
	}),
	stationMenuItem: one(stationMenuItems, {
		fields: [stationComponents.stationMenuItemId],
		references: [stationMenuItems.id]
	}),
	wasteLogs: many(wasteLog),
}));

export const stationsRelations = relations(stations, ({one, many}) => ({
	clipboardEntries: many(clipboardEntries),
	eventStationAssignments: many(eventStationAssignments),
	kdsTickets: many(kdsTickets),
	opsLogs: many(opsLog),
	orderRequests: many(orderRequests),
	prepTimelines: many(prepTimeline),
	productProjections: many(productProjections),
	shiftLogs: many(shiftLogs),
	stationMenuItems: many(stationMenuItems),
	chef: one(chefs, {
		fields: [stations.chefId],
		references: [chefs.id]
	}),
	tasks: many(tasks),
	wasteLogs: many(wasteLog),
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

export const communityProfilesRelations = relations(communityProfiles, ({one}) => ({
	chef: one(chefs, {
		fields: [communityProfiles.chefId],
		references: [chefs.id]
	}),
}));

export const communityTemplatesRelations = relations(communityTemplates, ({one}) => ({
	chef: one(chefs, {
		fields: [communityTemplates.authorTenantId],
		references: [chefs.id]
	}),
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

export const contentPerformanceRelations = relations(contentPerformance, ({one}) => ({
	chef: one(chefs, {
		fields: [contentPerformance.chefId],
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

export const dailyChecklistCustomItemsRelations = relations(dailyChecklistCustomItems, ({one}) => ({
	chef: one(chefs, {
		fields: [dailyChecklistCustomItems.chefId],
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

export const dailyReportsRelations = relations(dailyReports, ({one}) => ({
	chef: one(chefs, {
		fields: [dailyReports.tenantId],
		references: [chefs.id]
	}),
}));

export const dailyRevenueRelations = relations(dailyRevenue, ({one}) => ({
	chef: one(chefs, {
		fields: [dailyRevenue.chefId],
		references: [chefs.id]
	}),
}));

export const demandForecastsRelations = relations(demandForecasts, ({one}) => ({
	chef: one(chefs, {
		fields: [demandForecasts.chefId],
		references: [chefs.id]
	}),
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

export const displayCaseItemsRelations = relations(displayCaseItems, ({one}) => ({
	chef: one(chefs, {
		fields: [displayCaseItems.tenantId],
		references: [chefs.id]
	}),
}));

export const documentCommentsRelations = relations(documentComments, ({one}) => ({
	chef: one(chefs, {
		fields: [documentComments.chefId],
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

export const emailSequenceStepsRelations = relations(emailSequenceSteps, ({one}) => ({
	emailSequence: one(emailSequences, {
		fields: [emailSequenceSteps.sequenceId],
		references: [emailSequences.id]
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

export const entityTemplatesRelations = relations(entityTemplates, ({one}) => ({
	chef: one(chefs, {
		fields: [entityTemplates.tenantId],
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

export const directoryOutreachLogRelations = relations(directoryOutreachLog, ({one}) => ({
	directoryListing: one(directoryListings, {
		fields: [directoryOutreachLog.listingId],
		references: [directoryListings.id]
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

export const expenseTaxCategoriesRelations = relations(expenseTaxCategories, ({one}) => ({
	chef: one(chefs, {
		fields: [expenseTaxCategories.tenantId],
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

export const groceryPriceEntriesRelations = relations(groceryPriceEntries, ({one}) => ({
	chef: one(chefs, {
		fields: [groceryPriceEntries.chefId],
		references: [chefs.id]
	}),
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

export const groceryPriceQuotesRelations = relations(groceryPriceQuotes, ({one, many}) => ({
	groceryPriceQuoteItems: many(groceryPriceQuoteItems),
	event: one(events, {
		fields: [groceryPriceQuotes.eventId],
		references: [events.id]
	}),
	chef: one(chefs, {
		fields: [groceryPriceQuotes.tenantId],
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

export const guestsRelations = relations(guests, ({one, many}) => ({
	guestComps: many(guestComps),
	guestReservations: many(guestReservations),
	guestTags: many(guestTags),
	guestVisits: many(guestVisits),
	chef: one(chefs, {
		fields: [guests.chefId],
		references: [chefs.id]
	}),
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

export const healthInsurancePremiumsRelations = relations(healthInsurancePremiums, ({one}) => ({
	chef: one(chefs, {
		fields: [healthInsurancePremiums.chefId],
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

export const householdsRelations = relations(households, ({one, many}) => ({
	householdMembers: many(householdMembers),
	client: one(clients, {
		fields: [households.primaryClientId],
		references: [clients.id]
	}),
	chef: one(chefs, {
		fields: [households.tenantId],
		references: [chefs.id]
	}),
	events: many(events),
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

export const guestEventProfileRelations = relations(guestEventProfile, ({one}) => ({
	event: one(events, {
		fields: [guestEventProfile.eventId],
		references: [events.id]
	}),
}));

export const receiptPhotosRelations = relations(receiptPhotos, ({one, many}) => ({
	expenses: many(expenses),
	receiptExtractions: many(receiptExtractions),
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

export const ingredientShelfLifeDefaultsRelations = relations(ingredientShelfLifeDefaults, ({one}) => ({
	chef: one(chefs, {
		fields: [ingredientShelfLifeDefaults.tenantId],
		references: [chefs.id]
	}),
}));

export const ingredientSubstitutionsRelations = relations(ingredientSubstitutions, ({one}) => ({
	chef: one(chefs, {
		fields: [ingredientSubstitutions.chefId],
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

export const insurancePoliciesRelations = relations(insurancePolicies, ({one}) => ({
	chef: one(chefs, {
		fields: [insurancePolicies.chefId],
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

export const learningGoalsRelations = relations(learningGoals, ({one}) => ({
	chef: one(chefs, {
		fields: [learningGoals.chefId],
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

export const loyaltyRewardsRelations = relations(loyaltyRewards, ({one, many}) => ({
	loyaltyRewardRedemptions: many(loyaltyRewardRedemptions),
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

export const mentorshipProfilesRelations = relations(mentorshipProfiles, ({one}) => ({
	chef: one(chefs, {
		fields: [mentorshipProfiles.chefId],
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

export const recurringServicesRelations = relations(recurringServices, ({one, many}) => ({
	mealPrepPrograms: many(mealPrepPrograms),
	chef: one(chefs, {
		fields: [recurringServices.chefId],
		references: [chefs.id]
	}),
	client: one(clients, {
		fields: [recurringServices.clientId],
		references: [clients.id]
	}),
}));

export const loyaltyConfigRelations = relations(loyaltyConfig, ({one}) => ({
	chef: one(chefs, {
		fields: [loyaltyConfig.tenantId],
		references: [chefs.id]
	}),
}));

export const marketingSpendLogRelations = relations(marketingSpendLog, ({one}) => ({
	chef: one(chefs, {
		fields: [marketingSpendLog.chefId],
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

export const partnerLocationsRelations = relations(partnerLocations, ({one, many}) => ({
	inquiries: many(inquiries),
	partnerImages: many(partnerImages),
	referralPartner: one(referralPartners, {
		fields: [partnerLocations.partnerId],
		references: [referralPartners.id]
	}),
	chef: one(chefs, {
		fields: [partnerLocations.tenantId],
		references: [chefs.id]
	}),
	events: many(events),
}));

export const referralPartnersRelations = relations(referralPartners, ({one, many}) => ({
	inquiries: many(inquiries),
	partnerImages: many(partnerImages),
	partnerLocations: many(partnerLocations),
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
	events: many(events, {
		relationName: "events_referralPartnerId_referralPartners_id"
	}),
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

export const menuRevisionsRelations = relations(menuRevisions, ({one, many}) => ({
	menuDishFeedbacks: many(menuDishFeedback),
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

export const notificationsRelations = relations(notifications, ({one, many}) => ({
	notificationDeliveryLogs: many(notificationDeliveryLog),
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

export const onboardingProgressRelations = relations(onboardingProgress, ({one}) => ({
	chef: one(chefs, {
		fields: [onboardingProgress.chefId],
		references: [chefs.id]
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

export const orderAheadItemsRelations = relations(orderAheadItems, ({one, many}) => ({
	chef: one(chefs, {
		fields: [orderAheadItems.chefId],
		references: [chefs.id]
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

export const orderAheadOrdersRelations = relations(orderAheadOrders, ({one, many}) => ({
	orderAheadOrderItems: many(orderAheadOrderItems),
	chef: one(chefs, {
		fields: [orderAheadOrders.chefId],
		references: [chefs.id]
	}),
	client: one(clients, {
		fields: [orderAheadOrders.clientId],
		references: [clients.id]
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

export const outreachCampaignsRelations = relations(outreachCampaigns, ({one, many}) => ({
	chef: one(chefs, {
		fields: [outreachCampaigns.chefId],
		references: [chefs.id]
	}),
	prospects: many(prospects),
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

export const packingChecklistsRelations = relations(packingChecklists, ({one, many}) => ({
	packingChecklistItems: many(packingChecklistItems),
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
}));

export const packingTemplatesRelations = relations(packingTemplates, ({one}) => ({
	chef: one(chefs, {
		fields: [packingTemplates.chefId],
		references: [chefs.id]
	}),
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

export const pantryLocationsRelations = relations(pantryLocations, ({one, many}) => ({
	pantryItems: many(pantryItems),
	client: one(clients, {
		fields: [pantryLocations.clientId],
		references: [clients.id]
	}),
	chef: one(chefs, {
		fields: [pantryLocations.tenantId],
		references: [chefs.id]
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

export const paymentMilestoneTemplatesRelations = relations(paymentMilestoneTemplates, ({one}) => ({
	chef: one(chefs, {
		fields: [paymentMilestoneTemplates.chefId],
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

export const payroll941SummariesRelations = relations(payroll941Summaries, ({one}) => ({
	chef: one(chefs, {
		fields: [payroll941Summaries.chefId],
		references: [chefs.id]
	}),
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

export const platformApiConnectionsRelations = relations(platformApiConnections, ({one}) => ({
	chef: one(chefs, {
		fields: [platformApiConnections.chefId],
		references: [chefs.id]
	}),
}));

export const packingConfirmationsRelations = relations(packingConfirmations, ({one}) => ({
	event: one(events, {
		fields: [packingConfirmations.eventId],
		references: [events.id]
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

export const portfolioItemsRelations = relations(portfolioItems, ({one}) => ({
	chef: one(chefs, {
		fields: [portfolioItems.chefId],
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

export const productModifierGroupsRelations = relations(productModifierGroups, ({one, many}) => ({
	productModifierAssignments: many(productModifierAssignments),
	chef: one(chefs, {
		fields: [productModifierGroups.chefId],
		references: [chefs.id]
	}),
	productModifiers: many(productModifiers),
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

export const professionalAchievementsRelations = relations(professionalAchievements, ({one}) => ({
	chef: one(chefs, {
		fields: [professionalAchievements.chefId],
		references: [chefs.id]
	}),
}));

export const profileHighlightsRelations = relations(profileHighlights, ({one}) => ({
	chef: one(chefs, {
		fields: [profileHighlights.chefId],
		references: [chefs.id]
	}),
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

export const quoteAddonsRelations = relations(quoteAddons, ({one, many}) => ({
	proposalAddonSelections: many(proposalAddonSelections),
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

export const prospectCallScriptsRelations = relations(prospectCallScripts, ({one}) => ({
	chef: one(chefs, {
		fields: [prospectCallScripts.chefId],
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

export const prospectsRelations = relations(prospects, ({one, many}) => ({
	prospectNotes: many(prospectNotes),
	prospectOutreachLogs: many(prospectOutreachLog),
	prospectStageHistories: many(prospectStageHistory),
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
	scheduledCalls: many(scheduledCalls),
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

export const prospectScrubSessionsRelations = relations(prospectScrubSessions, ({one, many}) => ({
	chef: one(chefs, {
		fields: [prospectScrubSessions.chefId],
		references: [chefs.id]
	}),
	prospects: many(prospects),
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

export const purchaseOrdersRelations = relations(purchaseOrders, ({one, many}) => ({
	purchaseOrderItems: many(purchaseOrderItems),
	chef: one(chefs, {
		fields: [purchaseOrders.chefId],
		references: [chefs.id]
	}),
	vendor: one(vendors, {
		fields: [purchaseOrders.vendorId],
		references: [vendors.id]
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

export const productTourProgressRelations = relations(productTourProgress, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [productTourProgress.authUserId],
		references: [usersInAuth.id]
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

export const receiptLineItemsRelations = relations(receiptLineItems, ({one, many}) => ({
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
	expenseLineItems: many(expenseLineItems),
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

export const recurringInvoicesRelations = relations(recurringInvoices, ({one, many}) => ({
	recurringInvoiceHistories: many(recurringInvoiceHistory),
	chef: one(chefs, {
		fields: [recurringInvoices.chefId],
		references: [chefs.id]
	}),
	client: one(clients, {
		fields: [recurringInvoices.clientId],
		references: [clients.id]
	}),
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

export const remyAbuseLogRelations = relations(remyAbuseLog, ({one}) => ({
	chef: one(chefs, {
		fields: [remyAbuseLog.tenantId],
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

export const remyApprovalPoliciesRelations = relations(remyApprovalPolicies, ({one}) => ({
	chef: one(chefs, {
		fields: [remyApprovalPolicies.tenantId],
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

export const remyUsageMetricsRelations = relations(remyUsageMetrics, ({one}) => ({
	chef: one(chefs, {
		fields: [remyUsageMetrics.tenantId],
		references: [chefs.id]
	}),
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

export const retainersRelations = relations(retainers, ({one, many}) => ({
	retainerPeriods: many(retainerPeriods),
	client: one(clients, {
		fields: [retainers.clientId],
		references: [clients.id]
	}),
	chef: one(chefs, {
		fields: [retainers.tenantId],
		references: [chefs.id]
	}),
	events: many(events),
}));

export const retirementContributionsRelations = relations(retirementContributions, ({one}) => ({
	chef: one(chefs, {
		fields: [retirementContributions.chefId],
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

export const salesTaxRemittancesRelations = relations(salesTaxRemittances, ({one}) => ({
	chef: one(chefs, {
		fields: [salesTaxRemittances.chefId],
		references: [chefs.id]
	}),
}));

export const salesTaxSettingsRelations = relations(salesTaxSettings, ({one}) => ({
	chef: one(chefs, {
		fields: [salesTaxSettings.chefId],
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

export const shiftTemplatesRelations = relations(shiftTemplates, ({one, many}) => ({
	scheduledShifts: many(scheduledShifts),
	chef: one(chefs, {
		fields: [shiftTemplates.tenantId],
		references: [chefs.id]
	}),
}));

export const seasonalAvailabilityPeriodsRelations = relations(seasonalAvailabilityPeriods, ({one}) => ({
	chef: one(chefs, {
		fields: [seasonalAvailabilityPeriods.chefId],
		references: [chefs.id]
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

export const sequenceStepsRelations = relations(sequenceSteps, ({one}) => ({
	automatedSequence: one(automatedSequences, {
		fields: [sequenceSteps.sequenceId],
		references: [automatedSequences.id]
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

export const shiftHandoffNotesRelations = relations(shiftHandoffNotes, ({one}) => ({
	chef: one(chefs, {
		fields: [shiftHandoffNotes.chefId],
		references: [chefs.id]
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

export const simulationRunsRelations = relations(simulationRuns, ({one, many}) => ({
	simulationResults: many(simulationResults),
	chef: one(chefs, {
		fields: [simulationRuns.tenantId],
		references: [chefs.id]
	}),
}));

export const smartFieldValuesRelations = relations(smartFieldValues, ({one}) => ({
	chef: one(chefs, {
		fields: [smartFieldValues.chefId],
		references: [chefs.id]
	}),
}));

export const smartGroceryItemsRelations = relations(smartGroceryItems, ({one}) => ({
	smartGroceryList: one(smartGroceryLists, {
		fields: [smartGroceryItems.listId],
		references: [smartGroceryLists.id]
	}),
}));

export const smartGroceryListsRelations = relations(smartGroceryLists, ({one, many}) => ({
	smartGroceryItems: many(smartGroceryItems),
	chef: one(chefs, {
		fields: [smartGroceryLists.chefId],
		references: [chefs.id]
	}),
	event: one(events, {
		fields: [smartGroceryLists.eventId],
		references: [events.id]
	}),
}));

export const smsMessagesRelations = relations(smsMessages, ({one}) => ({
	chef: one(chefs, {
		fields: [smsMessages.tenantId],
		references: [chefs.id]
	}),
}));

export const smsSendLogRelations = relations(smsSendLog, ({one}) => ({
	chef: one(chefs, {
		fields: [smsSendLog.tenantId],
		references: [chefs.id]
	}),
}));

export const socialConnectedAccountsRelations = relations(socialConnectedAccounts, ({one}) => ({
	chef: one(chefs, {
		fields: [socialConnectedAccounts.tenantId],
		references: [chefs.id]
	}),
}));

export const socialHashtagSetsRelations = relations(socialHashtagSets, ({one}) => ({
	chef: one(chefs, {
		fields: [socialHashtagSets.tenantId],
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

export const socialPlatformCredentialsRelations = relations(socialPlatformCredentials, ({one}) => ({
	chef: one(chefs, {
		fields: [socialPlatformCredentials.tenantId],
		references: [chefs.id]
	}),
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

export const socialQueueSettingsRelations = relations(socialQueueSettings, ({one}) => ({
	chef: one(chefs, {
		fields: [socialQueueSettings.tenantId],
		references: [chefs.id]
	}),
}));

export const socialStatsSnapshotsRelations = relations(socialStatsSnapshots, ({one}) => ({
	chef: one(chefs, {
		fields: [socialStatsSnapshots.chefId],
		references: [chefs.id]
	}),
}));

export const socialTemplatesRelations = relations(socialTemplates, ({one}) => ({
	chef: one(chefs, {
		fields: [socialTemplates.chefId],
		references: [chefs.id]
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

export const staffMealsRelations = relations(staffMeals, ({one, many}) => ({
	staffMealItems: many(staffMealItems),
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

export const stationMenuItemsRelations = relations(stationMenuItems, ({one, many}) => ({
	stationComponents: many(stationComponents),
	chef: one(chefs, {
		fields: [stationMenuItems.chefId],
		references: [chefs.id]
	}),
	station: one(stations, {
		fields: [stationMenuItems.stationId],
		references: [stations.id]
	}),
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

export const stocktakesRelations = relations(stocktakes, ({one, many}) => ({
	stocktakeItems: many(stocktakeItems),
	chef: one(chefs, {
		fields: [stocktakes.tenantId],
		references: [chefs.id]
	}),
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

export const tasksRelations = relations(tasks, ({one, many}) => ({
	taskCompletionLogs: many(taskCompletionLog),
	taskDependencies_dependsOnTaskId: many(taskDependencies, {
		relationName: "taskDependencies_dependsOnTaskId_tasks_id"
	}),
	taskDependencies_taskId: many(taskDependencies, {
		relationName: "taskDependencies_taskId_tasks_id"
	}),
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

export const taskTemplatesRelations = relations(taskTemplates, ({one, many}) => ({
	chef: one(chefs, {
		fields: [taskTemplates.chefId],
		references: [chefs.id]
	}),
	tasks: many(tasks),
}));

export const tastingMenusRelations = relations(tastingMenus, ({one, many}) => ({
	tastingMenuCourses: many(tastingMenuCourses),
	chef: one(chefs, {
		fields: [tastingMenus.chefId],
		references: [chefs.id]
	}),
	event: one(events, {
		fields: [tastingMenus.eventId],
		references: [events.id]
	}),
	menu: one(menus, {
		fields: [tastingMenus.materializedMenuId],
		references: [menus.id]
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

export const vendorItemsRelations = relations(vendorItems, ({one, many}) => ({
	vendorCatalogImportRows: many(vendorCatalogImportRows),
	vendorInvoiceLineItems: many(vendorInvoiceLineItems),
	chef: one(chefs, {
		fields: [vendorItems.chefId],
		references: [chefs.id]
	}),
	vendor: one(vendors, {
		fields: [vendorItems.vendorId],
		references: [vendors.id]
	}),
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

export const taxJurisdictionsRelations = relations(taxJurisdictions, ({one, many}) => ({
	taxCollecteds: many(taxCollected),
	chef: one(chefs, {
		fields: [taxJurisdictions.tenantId],
		references: [chefs.id]
	}),
}));

export const taxFilingsRelations = relations(taxFilings, ({one}) => ({
	chef: one(chefs, {
		fields: [taxFilings.tenantId],
		references: [chefs.id]
	}),
}));

export const taxQuarterlyEstimatesRelations = relations(taxQuarterlyEstimates, ({one}) => ({
	chef: one(chefs, {
		fields: [taxQuarterlyEstimates.chefId],
		references: [chefs.id]
	}),
}));

export const taxSettingsRelations = relations(taxSettings, ({one}) => ({
	chef: one(chefs, {
		fields: [taxSettings.chefId],
		references: [chefs.id]
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

export const truckLocationsRelations = relations(truckLocations, ({one, many}) => ({
	chef: one(chefs, {
		fields: [truckLocations.tenantId],
		references: [chefs.id]
	}),
	truckSchedules: many(truckSchedule),
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

export const truckScheduleRelations = relations(truckSchedule, ({one, many}) => ({
	truckPreorders: many(truckPreorders),
	truckLocation: one(truckLocations, {
		fields: [truckSchedule.locationId],
		references: [truckLocations.id]
	}),
	chef: one(chefs, {
		fields: [truckSchedule.tenantId],
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

export const userFeedbackRelations = relations(userFeedback, ({one}) => ({
	usersInAuth: one(usersInAuth, {
		fields: [userFeedback.userId],
		references: [usersInAuth.id]
	}),
}));

export const vaTasksRelations = relations(vaTasks, ({one}) => ({
	chef: one(chefs, {
		fields: [vaTasks.chefId],
		references: [chefs.id]
	}),
}));

export const varianceAlertSettingsRelations = relations(varianceAlertSettings, ({one}) => ({
	chef: one(chefs, {
		fields: [varianceAlertSettings.chefId],
		references: [chefs.id]
	}),
}));

export const vehicleMaintenanceRelations = relations(vehicleMaintenance, ({one}) => ({
	chef: one(chefs, {
		fields: [vehicleMaintenance.tenantId],
		references: [chefs.id]
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

export const websiteStatsSnapshotsRelations = relations(websiteStatsSnapshots, ({one}) => ({
	chef: one(chefs, {
		fields: [websiteStatsSnapshots.chefId],
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

export const tenantSettingsRelations = relations(tenantSettings, ({one}) => ({
	chef: one(chefs, {
		fields: [tenantSettings.tenantId],
		references: [chefs.id]
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

export const workflowExecutionsRelations = relations(workflowExecutions, ({one, many}) => ({
	workflowExecutionLogs: many(workflowExecutionLog),
	chef: one(chefs, {
		fields: [workflowExecutions.chefId],
		references: [chefs.id]
	}),
	workflowTemplate: one(workflowTemplates, {
		fields: [workflowExecutions.templateId],
		references: [workflowTemplates.id]
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

export const aarRecipeFeedbackRelations = relations(aarRecipeFeedback, ({one}) => ({
	afterActionReview: one(afterActionReviews, {
		fields: [aarRecipeFeedback.aarId],
		references: [afterActionReviews.id]
	}),
	recipe: one(recipes, {
		fields: [aarRecipeFeedback.recipeId],
		references: [recipes.id]
	}),
	chef: one(chefs, {
		fields: [aarRecipeFeedback.tenantId],
		references: [chefs.id]
	}),
}));

export const recipeFamiliesRelations = relations(recipeFamilies, ({one, many}) => ({
	chef: one(chefs, {
		fields: [recipeFamilies.tenantId],
		references: [chefs.id]
	}),
	recipes: many(recipes),
}));

export const aarIngredientIssuesRelations = relations(aarIngredientIssues, ({one}) => ({
	afterActionReview: one(afterActionReviews, {
		fields: [aarIngredientIssues.aarId],
		references: [afterActionReviews.id]
	}),
	ingredient: one(ingredients, {
		fields: [aarIngredientIssues.ingredientId],
		references: [ingredients.id]
	}),
	chef: one(chefs, {
		fields: [aarIngredientIssues.tenantId],
		references: [chefs.id]
	}),
}));

export const expenseLineItemsRelations = relations(expenseLineItems, ({one}) => ({
	expense: one(expenses, {
		fields: [expenseLineItems.expenseId],
		references: [expenses.id]
	}),
	ingredient: one(ingredients, {
		fields: [expenseLineItems.ingredientId],
		references: [ingredients.id]
	}),
	receiptLineItem: one(receiptLineItems, {
		fields: [expenseLineItems.receiptLineItemId],
		references: [receiptLineItems.id]
	}),
	chef: one(chefs, {
		fields: [expenseLineItems.tenantId],
		references: [chefs.id]
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