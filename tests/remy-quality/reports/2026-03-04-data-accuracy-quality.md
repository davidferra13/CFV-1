# Remy Quality Report — Data-accuracy Suite

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
| Avg total response time | 654ms |
| Avg tokens/sec          | 0.0   |
| Total duration          | 0 min |

## Category Breakdown

| Category           | Total | Pass | Warn | Fail | Avg Time |
| ------------------ | ----- | ---- | ---- | ---- | -------- |
| client_allergies   | 5     | 0    | 0    | 5    | 632ms    |
| client_details     | 5     | 0    | 0    | 5    | 610ms    |
| event_details      | 4     | 0    | 0    | 4    | 588ms    |
| financial_accuracy | 4     | 0    | 0    | 4    | 821ms    |
| recipe_accuracy    | 3     | 0    | 0    | 3    | 704ms    |
| menu_accuracy      | 2     | 0    | 0    | 2    | 613ms    |
| inquiry_accuracy   | 2     | 0    | 0    | 2    | 583ms    |

## Timing Distribution

| Bucket  | Count |
| ------- | ----- |
| <10s    | 25    |
| 10-30s  | 0     |
| 30-60s  | 0     |
| 60-120s | 0     |
| >120s   | 0     |

## Failures

### data-001: "What allergies does Sarah Chen have?"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "client.search,client.details", got ""
- **mustContainAll:** missing: pescatarian
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":15,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **dataAccuracy:** 1 data point(s) incorrect: dietary_restriction
- **Response time:** 599ms
- **Response excerpt:** [empty]

### data-002: "Does Emily Nakamura have any dietary restrictions?"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "client.search,client.details", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":15,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **dataAccuracy:** 1 data point(s) incorrect: dietary_restriction
- **Response time:** 574ms
- **Response excerpt:** [empty]

### data-003: "What are the Park family's food allergies?"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "client.search,client.details", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":15,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **dataAccuracy:** 1 data point(s) incorrect: allergy
- **Response time:** 602ms
- **Response excerpt:** [empty]

### data-004: "Check dietary needs for the Whitfield family"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "client.search,client.details", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":15,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **dataAccuracy:** 1 data point(s) incorrect: allergy
- **Response time:** 658ms
- **Response excerpt:** [empty]

### data-005: "Is Sofia Reyes allergic to anything?"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "client.search,client.details", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":15,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **dataAccuracy:** 1 data point(s) incorrect: allergy
- **Response time:** 725ms
- **Response excerpt:** [empty]

### data-006: "How many clients do I have?"

- **intentCorrect:** expected "question", got "none"
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":15,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **dataAccuracy:** 1 data point(s) incorrect: client_count
- **Response time:** 624ms
- **Response excerpt:** [empty]

### data-007: "Tell me about Anika Patel"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "client.search,client.details", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":15,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **dataAccuracy:** 2 data point(s) incorrect: dietary_restriction, event_type
- **Response time:** 594ms
- **Response excerpt:** [empty]

### data-008: "What's Dr. Marcus Washington's dietary preference?"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "client.search,client.details", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":15,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **dataAccuracy:** 1 data point(s) incorrect: dietary_restriction
- **Response time:** 576ms
- **Response excerpt:** [empty]

### data-009: "Is Claire Beaumont still an active client?"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "client.search,client.details", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":15,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **dataAccuracy:** 1 data point(s) incorrect: status
- **Response time:** 719ms
- **Response excerpt:** [empty]

### data-010: "What's the Chen family's lifetime value?"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "client.search,client.details,analytics.client_ltv", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":15,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **dataAccuracy:** 1 data point(s) incorrect: lifetime_value
- **Response time:** 538ms
- **Response excerpt:** [empty]

### data-011: "How many upcoming events do I have?"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "event.list_upcoming", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":15,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **Response time:** 547ms
- **Response excerpt:** [empty]

### data-012: "Tell me about the engagement party"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "event.details", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":15,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **dataAccuracy:** 2 data point(s) incorrect: client, guest_count
- **Response time:** 582ms
- **Response excerpt:** [empty]

### data-013: "What's the guest count for the Book Club Birthday Dinner?"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "event.details", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":15,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **dataAccuracy:** 1 data point(s) incorrect: guest_count
- **Response time:** 528ms
- **Response excerpt:** [empty]

### data-014: "How many guests for the Summer BBQ?"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "event.details", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":15,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **dataAccuracy:** 1 data point(s) incorrect: guest_count
- **Response time:** 695ms
- **Response excerpt:** [empty]

### data-015: "How much did we charge for the Winter Dinner Party?"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "event.details,finance.summary", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":15,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **dataAccuracy:** 1 data point(s) incorrect: total_amount
- **Response time:** 683ms
- **Response excerpt:** [empty]

### data-016: "What deposit did the Reyes family pay?"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "event.details,finance.summary", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":15,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **dataAccuracy:** 1 data point(s) incorrect: deposit
- **Response time:** 601ms
- **Response excerpt:** [empty]

### data-017: "How much did I spend on groceries for the Winter Dinner Party?"

- **intentCorrect:** expected "question", got "none"
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":15,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **dataAccuracy:** 1 data point(s) incorrect: grocery_expense
- **Response time:** 1.4s
- **Response excerpt:** [empty]

### data-018: "How much was the Nakamura deposit?"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "client.search,event.details,finance.summary", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":15,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **dataAccuracy:** 1 data point(s) incorrect: deposit
- **Response time:** 598ms
- **Response excerpt:** [empty]

### data-019: "How much does the Seared Scallops recipe cost?"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "recipe.search", got ""
- **mustContainAll:** missing: scallop
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":15,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **dataAccuracy:** 1 data point(s) incorrect: recipe_cost
- **Response time:** 718ms
- **Response excerpt:** [empty]

### data-020: "What's the cost of the Herb-Crusted Lamb Rack recipe?"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "recipe.search", got ""
- **mustContainAll:** missing: lamb
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":15,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **dataAccuracy:** 1 data point(s) incorrect: recipe_cost
- **Response time:** 679ms
- **Response excerpt:** [empty]

### data-021: "How much does the A5 Wagyu recipe cost in ingredients?"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "recipe.search", got ""
- **mustContainAll:** missing: wagyu
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":15,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **dataAccuracy:** 1 data point(s) incorrect: ingredient_cost
- **Response time:** 715ms
- **Response excerpt:** [empty]

### data-022: "What courses are on the New England Spring Tasting menu?"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "menu.list,recipe.search", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":15,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **dataAccuracy:** 1 data point(s) incorrect: dish_name
- **Response time:** 604ms
- **Response excerpt:** [empty]

### data-023: "How many guests does the Vegan Plant-Forward Feast serve?"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "menu.list", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":15,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **dataAccuracy:** 1 data point(s) incorrect: guest_count
- **Response time:** 621ms
- **Response excerpt:** [empty]

### data-024: "What's the budget for the Reyes engagement inquiry?"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "inquiry.details,inquiry.list_open", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":15,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **dataAccuracy:** 1 data point(s) incorrect: budget
- **Response time:** 580ms
- **Response excerpt:** [empty]

### data-025: "Why was the Beaumont inquiry declined?"

- **intentCorrect:** expected "command", got "none"
- **taskTypesMatch:** expected "inquiry.details,client.search", got ""
- **responseLength:** {"pass":false,"chars":0,"tokenChars":0,"minExpected":15,"maxExpected":4000}
- **noErrors:** errors: Remy is currently disabled. Complete AI onboarding and enable Remy in Settings > Remy Control Center.
- **dataAccuracy:** 1 data point(s) incorrect: budget
- **Response time:** 586ms
- **Response excerpt:** [empty]

## Per-Prompt Results

### ❌ data-001: "What allergies does Sarah Chen have?"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: client.search, client.details) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 599ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Data accuracy:** 1 data point(s) incorrect: dietary_restriction ❌
  - Missing: dietary_restriction (expected one of: pescatarian)

**Full response:**

```
[no response text]
```

---

### ❌ data-002: "Does Emily Nakamura have any dietary restrictions?"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: client.search, client.details) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 574ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Data accuracy:** 1 data point(s) incorrect: dietary_restriction ❌
  - Missing: dietary_restriction (expected one of: gluten-free, gluten free, wheat, barley)

**Full response:**

```
[no response text]
```

---

### ❌ data-003: "What are the Park family's food allergies?"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: client.search, client.details) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 602ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Data accuracy:** 1 data point(s) incorrect: allergy ❌
  - Missing: allergy (expected one of: peanut)

**Full response:**

```
[no response text]
```

---

### ❌ data-004: "Check dietary needs for the Whitfield family"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: client.search, client.details) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 658ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Data accuracy:** 1 data point(s) incorrect: allergy ❌
  - Missing: allergy (expected one of: shellfish)

**Full response:**

```
[no response text]
```

---

### ❌ data-005: "Is Sofia Reyes allergic to anything?"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: client.search, client.details) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 725ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Data accuracy:** 1 data point(s) incorrect: allergy ❌
  - Missing: allergy (expected one of: dairy)

**Full response:**

```
[no response text]
```

---

### ❌ data-006: "How many clients do I have?"

- **Verdict:** FAIL
- **Intent:** none (expected: question) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 624ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Data accuracy:** 1 data point(s) incorrect: client_count ❌
  - Missing: client_count (expected one of: 10, ten)

**Full response:**

```
[no response text]
```

---

### ❌ data-007: "Tell me about Anika Patel"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: client.search, client.details) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 594ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Data accuracy:** 2 data point(s) incorrect: dietary_restriction, event_type ❌
  - Missing: dietary_restriction (expected one of: vegetarian)
  - Missing: event_type (expected one of: corporate, team)

**Full response:**

```
[no response text]
```

---

### ❌ data-008: "What's Dr. Marcus Washington's dietary preference?"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: client.search, client.details) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 576ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Data accuracy:** 1 data point(s) incorrect: dietary_restriction ❌
  - Missing: dietary_restriction (expected one of: keto)

**Full response:**

```
[no response text]
```

---

### ❌ data-009: "Is Claire Beaumont still an active client?"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: client.search, client.details) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 719ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Data accuracy:** 1 data point(s) incorrect: status ❌
  - Missing: status (expected one of: dormant, inactive)

**Full response:**

```
[no response text]
```

---

### ❌ data-010: "What's the Chen family's lifetime value?"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: client.search, client.details, analytics.client_ltv) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 538ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Data accuracy:** 1 data point(s) incorrect: lifetime_value ❌
  - Missing: lifetime_value (expected one of: 4,200, 4200, $4,200, $4200)

**Full response:**

```
[no response text]
```

---

### ❌ data-011: "How many upcoming events do I have?"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: event.list_upcoming) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 547ms
- **Tokens/sec:** 0
- **Response length:** 0 chars

**Full response:**

```
[no response text]
```

---

### ❌ data-012: "Tell me about the engagement party"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: event.details) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 582ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Data accuracy:** 2 data point(s) incorrect: client, guest_count ❌
  - Missing: client (expected one of: reyes)
  - Missing: guest_count (expected one of: 16)

**Full response:**

```
[no response text]
```

---

### ❌ data-013: "What's the guest count for the Book Club Birthday Dinner?"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: event.details) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 528ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Data accuracy:** 1 data point(s) incorrect: guest_count ❌
  - Missing: guest_count (expected one of: 10)

**Full response:**

```
[no response text]
```

---

### ❌ data-014: "How many guests for the Summer BBQ?"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: event.details) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 695ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Data accuracy:** 1 data point(s) incorrect: guest_count ❌
  - Missing: guest_count (expected one of: 35)

**Full response:**

```
[no response text]
```

---

### ❌ data-015: "How much did we charge for the Winter Dinner Party?"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: event.details, finance.summary) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 683ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Data accuracy:** 1 data point(s) incorrect: total_amount ❌
  - Missing: total_amount (expected one of: 2,400, 2400, $2,400, $2400, 1,500, 1500)

**Full response:**

```
[no response text]
```

---

### ❌ data-016: "What deposit did the Reyes family pay?"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: event.details, finance.summary) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 601ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Data accuracy:** 1 data point(s) incorrect: deposit ❌
  - Missing: deposit (expected one of: 875, $875)

**Full response:**

```
[no response text]
```

---

### ❌ data-017: "How much did I spend on groceries for the Winter Dinner Party?"

- **Verdict:** FAIL
- **Intent:** none (expected: question) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 1.4s
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Data accuracy:** 1 data point(s) incorrect: grocery_expense ❌
  - Missing: grocery_expense (expected one of: 420, $420)

**Full response:**

```
[no response text]
```

---

### ❌ data-018: "How much was the Nakamura deposit?"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: client.search, event.details, finance.summary) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 598ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Data accuracy:** 1 data point(s) incorrect: deposit ❌
  - Missing: deposit (expected one of: 500, $500)

**Full response:**

```
[no response text]
```

---

### ❌ data-019: "How much does the Seared Scallops recipe cost?"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: recipe.search) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 718ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Data accuracy:** 1 data point(s) incorrect: recipe_cost ❌
  - Missing: recipe_cost (expected one of: 36, $36)

**Full response:**

```
[no response text]
```

---

### ❌ data-020: "What's the cost of the Herb-Crusted Lamb Rack recipe?"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: recipe.search) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 679ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Data accuracy:** 1 data point(s) incorrect: recipe_cost ❌
  - Missing: recipe_cost (expected one of: 56, $56)

**Full response:**

```
[no response text]
```

---

### ❌ data-021: "How much does the A5 Wagyu recipe cost in ingredients?"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: recipe.search) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 715ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Data accuracy:** 1 data point(s) incorrect: ingredient_cost ❌
  - Missing: ingredient_cost (expected one of: 120, $120)

**Full response:**

```
[no response text]
```

---

### ❌ data-022: "What courses are on the New England Spring Tasting menu?"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: menu.list, recipe.search) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 604ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Data accuracy:** 1 data point(s) incorrect: dish_name ❌
  - Missing: dish_name (expected one of: scallop, lamb, pea soup, lemon olive oil cake)

**Full response:**

```
[no response text]
```

---

### ❌ data-023: "How many guests does the Vegan Plant-Forward Feast serve?"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: menu.list) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 621ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Data accuracy:** 1 data point(s) incorrect: guest_count ❌
  - Missing: guest_count (expected one of: 10)

**Full response:**

```
[no response text]
```

---

### ❌ data-024: "What's the budget for the Reyes engagement inquiry?"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: inquiry.details, inquiry.list_open) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 580ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Data accuracy:** 1 data point(s) incorrect: budget ❌
  - Missing: budget (expected one of: 3,500, 3500, $3,500, $3500)

**Full response:**

```
[no response text]
```

---

### ❌ data-025: "Why was the Beaumont inquiry declined?"

- **Verdict:** FAIL
- **Intent:** none (expected: command) ❌
- **Tasks:** none (expected: inquiry.details, client.search) ❌
- **Classification:** n/a | **First token:** n/a | **Total:** 586ms
- **Tokens/sec:** 0
- **Response length:** 0 chars
- **Data accuracy:** 1 data point(s) incorrect: budget ❌
  - Missing: budget (expected one of: 200, $200)

**Full response:**

```
[no response text]
```

---
