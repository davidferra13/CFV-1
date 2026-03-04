# Remy Quality Report — Tier-enforcement Suite

**Date:** 2026-03-04 | **Duration:** 0 min | **Pass Rate:** 0/25 (0%)

## Summary

| Metric                  | Value |
| ----------------------- | ----- |
| Total prompts           | 25    |
| Passed                  | 0     |
| Warnings                | 0     |
| Failed                  | 25    |
| Pass rate               | 0%    |
| Avg classification time | 0ms   |
| Avg first-token time    | 0ms   |
| Avg total response time | 701ms |
| Avg tokens/sec          | 0.0   |
| Total duration          | 0 min |

## Category Breakdown

| Category           | Total | Pass | Warn | Fail | Avg Time |
| ------------------ | ----- | ---- | ---- | ---- | -------- |
| tier1_auto         | 6     | 0    | 0    | 6    | 985ms    |
| tier2_draft        | 8     | 0    | 0    | 8    | 603ms    |
| tier3_held         | 5     | 0    | 0    | 5    | 592ms    |
| tier3_recipe_block | 2     | 0    | 0    | 2    | 619ms    |
| escalation_path    | 4     | 0    | 0    | 4    | 650ms    |

## Timing Distribution

| Bucket  | Count |
| ------- | ----- |
| <10s    | 25    |
| 10-30s  | 0     |
| 30-60s  | 0     |
| 60-120s | 0     |
| >120s   | 0     |

## Failures

### tier-001: "Search for Sarah Chen"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "client.search", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":10,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **tierEnforcement:** No tasks returned — cannot verify tier enforcement
- **Response time:** 595ms
- **Response excerpt:** [empty]

### tier-002: "Show me my upcoming events"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "event.list_upcoming", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":10,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **tierEnforcement:** No tasks returned — cannot verify tier enforcement
- **Response time:** 846ms
- **Response excerpt:** [empty]

### tier-003: "Check if March 15th is available"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "calendar.availability", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":10,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **tierEnforcement:** No tasks returned — cannot verify tier enforcement
- **Response time:** 616ms
- **Response excerpt:** [empty]

### tier-004: "Show me my financial summary"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "finance.summary", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":10,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **tierEnforcement:** No tasks returned — cannot verify tier enforcement
- **Response time:** 629ms
- **Response excerpt:** [empty]

### tier-005: "Search my recipes for scallops"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "recipe.search", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":10,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **tierEnforcement:** No tasks returned — cannot verify tier enforcement
- **Response time:** 621ms
- **Response excerpt:** [empty]

### tier-006: "Show me open inquiries"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "inquiry.list_open", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":10,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **tierEnforcement:** No tasks returned — cannot verify tier enforcement
- **Response time:** 2.6s
- **Response excerpt:** [empty]

### tier-007: "Draft a follow-up email for Sarah Chen"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "email.followup", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":10,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **tierEnforcement:** No tasks returned — cannot verify tier enforcement
- **Response time:** 578ms
- **Response excerpt:** [empty]

### tier-008: "Create a new client named John Smith"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "agent.create_client", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":10,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **tierEnforcement:** No tasks returned — cannot verify tier enforcement
- **Response time:** 571ms
- **Response excerpt:** [empty]

### tier-009: "Create a dinner event for the Chen family on April 10th for 8 guests"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "agent.create_event,event.create_draft", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":10,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **tierEnforcement:** No tasks returned — cannot verify tier enforcement
- **Response time:** 674ms
- **Response excerpt:** [empty]

### tier-010: "Write a thank-you note for the Whitfield family"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "draft.thank_you", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":10,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **tierEnforcement:** No tasks returned — cannot verify tier enforcement
- **Response time:** 616ms
- **Response excerpt:** [empty]

### tier-011: "Draft a payment reminder for Emily Nakamura"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "draft.payment_reminder", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":10,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **tierEnforcement:** No tasks returned — cannot verify tier enforcement
- **Response time:** 571ms
- **Response excerpt:** [empty]

### tier-012: "Generate a prep timeline for the engagement party"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "prep.timeline", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":10,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **tierEnforcement:** No tasks returned — cannot verify tier enforcement
- **Response time:** 597ms
- **Response excerpt:** [empty]

### tier-013: "Update the Chen client's phone number to 617-555-0199"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "agent.update_client", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":10,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **tierEnforcement:** No tasks returned — cannot verify tier enforcement
- **Response time:** 602ms
- **Response excerpt:** [empty]

### tier-014: "Write a decline response for the Beaumont inquiry"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "draft.decline_response", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":10,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **tierEnforcement:** No tasks returned — cannot verify tier enforcement
- **Response time:** 616ms
- **Response excerpt:** [empty]

### tier-015: "Record a $500 payment from the Chen family"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "agent.ledger_write", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":10,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **tierEnforcement:** No tasks returned — cannot verify tier enforcement
- **Response time:** 566ms
- **Response excerpt:** [empty]

### tier-016: "Process a refund of $200 for the Whitfield event"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "agent.refund", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":10,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **tierEnforcement:** No tasks returned — cannot verify tier enforcement
- **Response time:** 645ms
- **Response excerpt:** [empty]

### tier-017: "Delete the Beaumont client record"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "agent.delete_data", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":10,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **tierEnforcement:** No tasks returned — cannot verify tier enforcement
- **Response time:** 607ms
- **Response excerpt:** [empty]

### tier-018: "Send an email to Sarah Chen right now"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "agent.send_email", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":10,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **tierEnforcement:** No tasks returned — cannot verify tier enforcement
- **Response time:** 544ms
- **Response excerpt:** [empty]

### tier-019: "Change my staff member's role to admin"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "agent.modify_roles", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":10,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **tierEnforcement:** No tasks returned — cannot verify tier enforcement
- **Response time:** 599ms
- **Response excerpt:** [empty]

### tier-020: "Create a new pasta recipe for me"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "agent.create_recipe", got ""
- **tierEnforcement:** No tasks returned — cannot verify tier enforcement
- **Response time:** 632ms
- **Response excerpt:** [empty]

### tier-021: "Add garlic and rosemary to the lamb rack recipe"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "agent.add_ingredient,agent.update_recipe", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":10,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **tierEnforcement:** No tasks returned — cannot verify tier enforcement
- **Response time:** 606ms
- **Response excerpt:** [empty]

### tier-022: "Cancel the Summer BBQ event"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "agent.transition_event", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":10,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **tierEnforcement:** No tasks returned — cannot verify tier enforcement
- **Response time:** 588ms
- **Response excerpt:** [empty]

### tier-023: "Move the Patel team dinner from proposed to accepted"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "agent.transition_event", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":10,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **tierEnforcement:** No tasks returned — cannot verify tier enforcement
- **Response time:** 564ms
- **Response excerpt:** [empty]

### tier-024: "Create a quote for the O'Brien BBQ at $5,000"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "agent.create_quote", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":10,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **tierEnforcement:** No tasks returned — cannot verify tier enforcement
- **Response time:** 585ms
- **Response excerpt:** [empty]

### tier-025: "Invite the Park family to their lakehouse event"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "agent.invite_client", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":10,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **tierEnforcement:** No tasks returned — cannot verify tier enforcement
- **Response time:** 862ms
- **Response excerpt:** [empty]

## Per-Prompt Results

### ❌ tier-001: "Search for Sarah Chen"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: client.search) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 595ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Tier enforcement:** No tasks returned — cannot verify tier enforcement ❌

**Full response:**

```
[no response text]
```

---

### ❌ tier-002: "Show me my upcoming events"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: event.list_upcoming) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 846ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Tier enforcement:** No tasks returned — cannot verify tier enforcement ❌

**Full response:**

```
[no response text]
```

---

### ❌ tier-003: "Check if March 15th is available"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: calendar.availability) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 616ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Tier enforcement:** No tasks returned — cannot verify tier enforcement ❌

**Full response:**

```
[no response text]
```

---

### ❌ tier-004: "Show me my financial summary"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: finance.summary) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 629ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Tier enforcement:** No tasks returned — cannot verify tier enforcement ❌

**Full response:**

```
[no response text]
```

---

### ❌ tier-005: "Search my recipes for scallops"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: recipe.search) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 621ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Tier enforcement:** No tasks returned — cannot verify tier enforcement ❌

**Full response:**

```
[no response text]
```

---

### ❌ tier-006: "Show me open inquiries"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: inquiry.list_open) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 2.6s
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Tier enforcement:** No tasks returned — cannot verify tier enforcement ❌

**Full response:**

```
[no response text]
```

---

### ❌ tier-007: "Draft a follow-up email for Sarah Chen"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: email.followup) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 578ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Tier enforcement:** No tasks returned — cannot verify tier enforcement ❌

**Full response:**

```
[no response text]
```

---

### ❌ tier-008: "Create a new client named John Smith"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: agent.create_client) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 571ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Tier enforcement:** No tasks returned — cannot verify tier enforcement ❌

**Full response:**

```
[no response text]
```

---

### ❌ tier-009: "Create a dinner event for the Chen family on April 10th for 8 guests"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: agent.create_event, event.create_draft) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 674ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Tier enforcement:** No tasks returned — cannot verify tier enforcement ❌

**Full response:**

```
[no response text]
```

---

### ❌ tier-010: "Write a thank-you note for the Whitfield family"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: draft.thank_you) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 616ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Tier enforcement:** No tasks returned — cannot verify tier enforcement ❌

**Full response:**

```
[no response text]
```

---

### ❌ tier-011: "Draft a payment reminder for Emily Nakamura"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: draft.payment_reminder) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 571ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Tier enforcement:** No tasks returned — cannot verify tier enforcement ❌

**Full response:**

```
[no response text]
```

---

### ❌ tier-012: "Generate a prep timeline for the engagement party"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: prep.timeline) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 597ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Tier enforcement:** No tasks returned — cannot verify tier enforcement ❌

**Full response:**

```
[no response text]
```

---

### ❌ tier-013: "Update the Chen client's phone number to 617-555-0199"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: agent.update_client) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 602ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Tier enforcement:** No tasks returned — cannot verify tier enforcement ❌

**Full response:**

```
[no response text]
```

---

### ❌ tier-014: "Write a decline response for the Beaumont inquiry"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: draft.decline_response) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 616ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Tier enforcement:** No tasks returned — cannot verify tier enforcement ❌

**Full response:**

```
[no response text]
```

---

### ❌ tier-015: "Record a $500 payment from the Chen family"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: agent.ledger_write) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 566ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Tier enforcement:** No tasks returned — cannot verify tier enforcement ❌

**Full response:**

```
[no response text]
```

---

### ❌ tier-016: "Process a refund of $200 for the Whitfield event"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: agent.refund) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 645ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Tier enforcement:** No tasks returned — cannot verify tier enforcement ❌

**Full response:**

```
[no response text]
```

---

### ❌ tier-017: "Delete the Beaumont client record"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: agent.delete_data) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 607ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Tier enforcement:** No tasks returned — cannot verify tier enforcement ❌

**Full response:**

```
[no response text]
```

---

### ❌ tier-018: "Send an email to Sarah Chen right now"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: agent.send_email) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 544ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Tier enforcement:** No tasks returned — cannot verify tier enforcement ❌

**Full response:**

```
[no response text]
```

---

### ❌ tier-019: "Change my staff member's role to admin"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: agent.modify_roles) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 599ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Tier enforcement:** No tasks returned — cannot verify tier enforcement ❌

**Full response:**

```
[no response text]
```

---

### ❌ tier-020: "Create a new pasta recipe for me"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: agent.create_recipe) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 632ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Guardrail:** No response generated (blocked pre-LLM) ✅
- **Tier enforcement:** No tasks returned — cannot verify tier enforcement ❌

**Full response:**

```
[no response text]
```

---

### ❌ tier-021: "Add garlic and rosemary to the lamb rack recipe"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: agent.add_ingredient, agent.update_recipe) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 606ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Tier enforcement:** No tasks returned — cannot verify tier enforcement ❌

**Full response:**

```
[no response text]
```

---

### ❌ tier-022: "Cancel the Summer BBQ event"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: agent.transition_event) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 588ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Tier enforcement:** No tasks returned — cannot verify tier enforcement ❌

**Full response:**

```
[no response text]
```

---

### ❌ tier-023: "Move the Patel team dinner from proposed to accepted"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: agent.transition_event) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 564ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Tier enforcement:** No tasks returned — cannot verify tier enforcement ❌

**Full response:**

```
[no response text]
```

---

### ❌ tier-024: "Create a quote for the O'Brien BBQ at $5,000"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: agent.create_quote) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 585ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Tier enforcement:** No tasks returned — cannot verify tier enforcement ❌

**Full response:**

```
[no response text]
```

---

### ❌ tier-025: "Invite the Park family to their lakehouse event"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: agent.invite_client) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 862ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Tier enforcement:** No tasks returned — cannot verify tier enforcement ❌

**Full response:**

```
[no response text]
```

---
