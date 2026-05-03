# Persona Stress Test: mei-tanaka

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

### Gap 1: Context Switching:

**Severity:** HIGH
The analyzer identified this as a major product fit concern. Review the raw analyzer output below for the original wording and supporting context.

### Gap 2: Data Fragmentation:

**Severity:** HIGH
This gap affects whether ChefFlow can support the persona's full operating workflow without manual reconciliation.

### Gap 3: Trust/Reliability:

**Severity:** MEDIUM
This gap should be considered during build planning because it creates repeated operational friction.

### Gap 4: "Ghost Mode" Input:

**Severity:** MEDIUM
This gap may reduce confidence in pricing, planning, communication, or execution for the persona.

### Gap 5: Minimalist UI:

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
# Persona Evaluation: Chef "Mei" (High-End Private Chef)

**Persona Summary:** Mei is an experienced, highly skilled private chef who manages complex, high-stakes culinary operations. She operates in environments where reputation, precision, and immediate adaptability are paramount. She is deeply resistant to "fluff" or overly complex digital workflows that slow down execution. Her primary need is a system that acts as a reliable, invisible second pair of hands—one that captures messy, real-time data without demanding constant, structured input.

**Key Pain Points:**

1. **Context Switching:** Being pulled out of the flow of service (e.g., plating, conversation) to input data.
2. **Data Fragmentation:** Information scattered across texts, emails, notes, and memory.
3. **Trust/Reliability:** Needing the system to work flawlessly, especially when connectivity is poor or time is critical.

---

## System Evaluation (Hypothetical Tool: "ChefFlow")

_Assuming the tool has strong offline capability, voice input, and a highly customizable, minimal UI._

**Overall Fit Score:** 8/10 (High potential, but requires ruthless simplification.)

**Strengths:**

- **Offline Capability:** Crucial for restaurants/homes with spotty Wi-Fi.
- **Voice/OCR Input:** Allows data capture during active work (e.g., dictating ingredient substitutions while prepping).
- **Timeline View:** Excellent for visualizing the sequence of events (prep $\rightarrow$ service $\rightarrow$ cleanup).

**Weaknesses:**

- **Over-Feature Creep:** If the UI presents too many options, Mei will ignore it.
- **Mandatory Fields:** Any required field that forces a stop in the workflow is a dealbreaker.

---

## Detailed Assessment

### 1. Workflow Integration (The "Feel")

- **Rating:** Needs Improvement
- **Analysis:** The system must feel like an extension of the kitchen, not an office tool. If it requires logging _after_ the fact, it fails. It must support "capture-as-you-go."
- **Action:** Prioritize voice dictation and photo/OCR capture over structured forms.

### 2. Data Integrity & Trust

- **Rating:** Good
- **Analysis:** The system needs robust version control for recipes and client preferences. If a client changes a dietary restriction mid-week, the system must flag the conflict immediately and clearly.
- **Action:** Implement a "Client Profile Snapshot" that is always visible and easily editable by the system, not by the user navigating menus.

### 3. Adaptability & Edge Cases

- **Rating:** Excellent
- **Analysis:** Mei needs to handle the unexpected: a last-minute guest, a sudden ingredient shortage, a change in mood. The system must allow for rapid, non-linear adjustments to the plan.
- **Action:** Build "Contingency Templates" that can be pulled up with one tap (e.g., "Guest arrives early," "Fish unavailable").

---

## Conclusion & Recommendations

**Verdict:** The system has the _potential_ to be indispensable, but only if the development team treats Mei's workflow as the _only_ workflow that matters.

**Top 3 Mandatory Improvements:**

1. **"Ghost Mode" Input:** Allow the user to capture notes, photos, or voice memos without forcing them to categorize or save immediately. The system should intelligently suggest context tags later.
2. **Minimalist UI:** The primary screen should show only the _next three critical actions_. Everything else must be hidden behind a single, intuitive "More Details" tap.
3. **Integration with Local Knowledge:** Allow users to upload and tag local sourcing information (e.g., "Best local sourdough baker - 3 blocks away"). This makes the tool relevant to her specific expertise.

**If the system fails on simplicity, it fails for Mei.**
```
