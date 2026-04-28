<!-- REJECTED: all 2 referenced files are missing -->
<!-- 2026-04-28T01:28:58.909Z -->

# Build Task: Proactive Alerting:
**Source Persona:** padma-lakshmi
**Gap Number:** 2 of 5
**Severity:** HIGH

## What to Build
Implement proactive alerting for high priority inquiries based on AI-powered analysis. Send alerts when an inquiry matches a predefined set of criteria indicating it's a promising lead.

## Files to Modify
- `src/lib/intelligence/proactive-alerts.ts` -- Add logic to analyze new inquiries and determine if they should trigger an alert

## Files to Create (if any)
- `src/components/alert-notifications/inquiry-alert-banner.tsx` -- Display the proactive alert to the chef when they log in, highlighting the new high-priority inquiry

## Implementation Notes
- Use a scoring system to evaluate each new inquiry against criteria like engagement score, booking potential, and lead quality 
- When an inquiry meets or exceeds the threshold for an alert, send a notification to the chef's dashboard with a summary of why it's important
- Consider using existing data points like lead score, booking score, and entity activity timeline as part of the scoring logic

## Acceptance Criteria
1. When a new high-priority inquiry is created that meets the criteria for an alert, the chef receives a proactive alert banner on their dashboard 
2. The alert banner provides a brief summary of why this inquiry was flagged as important based on its lead score, booking potential, and other key metrics
3. Clicking the alert takes the chef directly to the inquiry details page so they can respond promptly
4. `npx tsc --noEmit --skipLibCheck` runs against all modified files without errors

## DO NOT
- Modify the existing inquiry detail page component or its behavior
- Change how inquiries are scored or ranked in the overall system outside of this alerting feature 
- Add any new dependencies beyond those needed for the proactive alert banner component