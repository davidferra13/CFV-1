Here is a focused build plan for the gap you identified:

# Build Task: Experience Mapping:
**Source Persona:** drew-nieporent  
**Gap Number:** 3 of 5  
**Severity:** MEDIUM  

## What to Build
Map out key steps in the guest experience flow, from initial invite through post-event outreach. Identify pain points and opportunities for improvement based on Drew's feedback.

## Files to Modify 
- `app/(chef)/events/[id]/_components/event-detail-overview-tab.tsx` -- Add sections for Guest Experience, Guest Messages, Post Event Outreach, Photo Consent Summary

## Files to Create (if any)
- `app/(chef)/events/[id]/_components/guest-experience-flow.tsx` -- New component detailing the guest experience flow and highlighting areas for optimization

## Implementation Notes
- Use user testing to validate the updated flow maps closely match real guest experiences  
- Incorporate Drew's specific suggestions and pain points into the mapping
- Consider both pre-event (invite, RSVP process) and post-event (feedback, outreach) touchpoints

## Acceptance Criteria
1. The new Guest Experience section in the event overview tab clearly outlines key steps from invite to post-event outreach 
2. Pain points and opportunities for improvement are called out based on Drew's feedback
3. `npx tsc --noEmit --skipLibCheck` passes without errors

## DO NOT  
- Modify any files outside of `app/(chef)/events/[id]/_components/`
- Add new npm packages or dependencies
- Change the database schema in any way
- Remove existing functionality related to guest experience tracking 

Let me know if you need any clarification or have additional requirements for this build task!