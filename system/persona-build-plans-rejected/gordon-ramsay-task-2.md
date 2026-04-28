<!-- REJECTED: all 1 referenced files are missing -->
<!-- 2026-04-28T01:00:10.018Z -->

Here is the focused build plan for the gap you identified:

# Build Task: Predictive Analytics:
**Source Persona:** gordon-ramsay
**Gap Number:** 2 of 5
**Severity:** HIGH

## What to Build
Implement a machine learning model that predicts optimal menu items and pricing based on historical event data for each chef. The model will analyze past events, identify top-performing dishes and price points, and make personalized recommendations to the chef during the event creation flow.

## Files to Modify
- `app/(admin)/admin/flags/page.tsx` -- Add new KNOWN_FLAGS entry for predictive analytics feature flag 
- `app/chefs/[chefId]/events/new.tsx` -- Integrate model recommendations into event creation page

## Files to Create (if any)
- `server/src/models/predictive-analytics-model.ts` -- Define ML model and train it on historical event data
- `server/src/routes/api/[chefId]/predictive-analytics.ts` -- API endpoint for fetching chef-specific recommendations

## Implementation Notes
- Use a supervised learning algorithm like random forest or gradient boosting that can handle categorical input features
- Normalize numerical input features (e.g. dish price, portion size) to improve model accuracy  
- Handle edge case of chefs with very few past events by providing general recommendations
- Ensure API response includes enough context for chef to understand and act on the recommendation

## Acceptance Criteria
1. New "Predictive Analytics" feature flag is added in admin dashboard 
2. When enabled, event creation page now shows a "Recommended Menu Items & Pricing" section that populates with 3-5 suggested dishes and optimal price point based on historical data for that chef's events
3. Recommendations are personalized per chef - different chefs see different suggestions even if creating the same type of event 
4. API endpoint exists to fetch recommendations, accepts chefId parameter, returns JSON array of recommended dish objects
5. `npx tsc --noEmit --skipLibCheck` passes on all modified files

Let me know if you need any clarification or have additional requirements to include!