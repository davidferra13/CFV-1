# Persona Stress Test: iris-coleman

**Type:** Chef
**Date:** 2026-04-30
**Method:** local-ollama-v2
**Normalized:** true

## Summary

The analyzer returned usable findings but did not follow the required markdown structure.

## Score: 50/100

- Workflow Coverage (0-40): 20 -- Normalized from non-standard analyzer output.
- Data Model Fit (0-25): 13 -- Normalized from non-standard analyzer output.
- UX Alignment (0-15): 8 -- Normalized from non-standard analyzer output.
- Financial Accuracy (0-10): 5 -- Normalized from non-standard analyzer output.
- Onboarding Viability (0-5): 3 -- Normalized from non-standard analyzer output.
- Retention Likelihood (0-5): 1 -- Normalized from non-standard analyzer output.

## Top 5 Gaps

### Gap 1: Contingency Planning:

**Severity:** HIGH
The analyzer identified this as a major product fit concern. Review the raw analyzer output below for the original wording and supporting context.

### Gap 2: Real-Time Communication Hub:

**Severity:** HIGH
This gap affects whether ChefFlow can support the persona's full operating workflow without manual reconciliation.

### Gap 3: Resource Tracking:

**Severity:** MEDIUM
This gap should be considered during build planning because it creates repeated operational friction.

### Gap 4: Audit Trail:

**Severity:** MEDIUM
This gap may reduce confidence in pricing, planning, communication, or execution for the persona.

### Gap 5: Mandate "Scenario Planning" View:

**Severity:** LOW
This gap is lower priority but still useful for product fit assessment.

## Quick Wins

1. Preserve the analyzer's original recommendations in the raw output section.
2. Convert the highest severity gap into a planner task.
3. Re-run analysis later if a fully templated report is required.

## Verdict

ChefFlow can use this normalized report for triage, but the raw analyzer output should be reviewed before making product decisions.

## Raw Analyzer Output

```markdown
# Persona Evaluation: Chef "Iris" (High-Touch, Operational Expert)

**Persona Summary:** Iris is a highly skilled, hands-on operational expert who manages complex, high-touch service events (private dining, pop-ups). Her primary pain points revolve around managing dynamic, unpredictable variables (weather, last-minute cancellations, venue changes) and ensuring flawless execution under pressure. She needs a system that acts as a reliable, centralized "War Room" dashboard, not just a booking tool.

**Key Needs:**

1. **Contingency Planning:** Must easily map out "Plan A, Plan B, Plan C" for every critical path item (e.g., power failure, rain, vendor no-show).
2. **Real-Time Communication Hub:** Needs to consolidate all communications (weather alerts, vendor texts, client emails) into one actionable feed.
3. **Resource Tracking:** Needs to track physical resources (linens, specialized equipment, staffing availability) against a schedule.
4. **Audit Trail:** Needs an undeniable, chronological record of _why_ a decision was made and _who_ approved it.

---

## System Fit Analysis (Assuming a modern, flexible platform)

**Strengths (Where the system likely excels):**

- **Scheduling/Resource Management:** If the system handles complex dependencies (e.g., "If Venue X is booked, then Vendor Y must be booked 48 hours prior"), it will be highly valuable.
- **Centralized Communication:** A unified dashboard for all related parties is crucial.

**Weaknesses (Where the system will likely fail for Iris):**

- **Lack of "If/Then" Logic:** If the system is purely linear (Task A -> Task B), it cannot handle the branching logic of real-world operations.
- **Over-Automation:** If it tries to _prevent_ her from making a necessary, on-the-spot human decision, she will bypass it.
- **Poor Mobile Experience:** During an event, she will be on a phone, and the interface must be ruthlessly simple.

---

## Detailed Pain Point Mapping

| Pain Point                        | Impact Level | Required Feature            | How the System Must Address It                                                                                                                                                                                    |
| :-------------------------------- | :----------- | :-------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Weather/Venue Change**          | Critical     | Dynamic Contingency Mapping | Must allow drag-and-drop swapping of entire operational blocks (e.g., "Outdoor Seating" block swaps to "Indoor Backup" block, automatically flagging necessary changes to lighting/power).                        |
| **Vendor Communication Overload** | High         | Unified, Actionable Feed    | Needs a dedicated "Event Comms" feed that filters noise and flags items requiring _Iris's_ immediate action (e.g., "Vendor X confirmed 10 AM arrival").                                                           |
| **Last-Minute Scope Creep**       | High         | Change Request Workflow     | Any deviation from the original plan must trigger a mandatory, visible workflow requiring approval (e.g., "Scope Change: +2 Guests. Requires: Extra linens, extra staffing hour. Cost: $X. Approved By: [Name]"). |
| **Staffing Coordination**         | Medium-High  | Role-Based Checklists       | Needs checklists that can be assigned to specific staff members who check them off _in the field_ (e.g., "Kitchen Prep: Mise en place complete").                                                                 |
| **Post-Event Reconciliation**     | Medium       | Automated Cost Tracking     | Must easily pull all associated costs (vendor invoices, overtime) against the original event budget for quick client billing.                                                                                     |

---

## Final Recommendation & Action Items

**Overall Fit Score:** 7/10 (High potential, but requires advanced operational features beyond standard booking software.)

**Recommendation:** Do not treat this as a booking tool. Treat it as a **Project Management War Room** for hospitality.

**Action Items for Development/Implementation:**

1. **Mandate "Scenario Planning" View:** The primary view for an active event must be a visual timeline that supports multiple, switchable operational scenarios.
2. **Build the "Decision Log":** Implement a mandatory, non-editable log attached to every event that records the _reason_ for any deviation from the plan, the _decision maker_, and the _time stamp_.
3. **Prioritize Mobile Usability:** The mobile app must be designed for one-handed, high-stress interaction (large buttons, minimal text entry).

**If the system cannot support dynamic, multi-scenario planning and mandatory decision logging, Iris will find workarounds that bypass the system entirely.**
```
