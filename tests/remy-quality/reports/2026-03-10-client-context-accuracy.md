# Client Remy Context Accuracy & Consistency Report

**Date:** 2026-03-10
**Runtime:** 2.0 minutes

---

## Part 1: Context Accuracy (15 prompts)

**Pass Rate:** 0.0% (0/15)

### ✗ ctx-01 — event_data

**Prompt:** "What events do I have coming up?"
**Description:** Should reference actual seeded events or say there are none — never invent events
**Time:** 6ms | **Score:** 0%

- ✗ got_response: Too short/empty

---

### ✗ ctx-02 — event_data

**Prompt:** "What's the status of my next event?"
**Description:** Should show real status (draft/proposed/accepted/etc.) or say no events found
**Time:** 3ms | **Score:** 0%

- ✗ got_response: Too short/empty

---

### ✗ ctx-03 — event_data

**Prompt:** "How many guests are expected at my dinner?"
**Description:** Should reference actual guest count from seeded data or say unknown
**Time:** 3ms | **Score:** 0%

- ✗ got_response: Too short/empty

---

### ✗ ctx-04 — quote_data

**Prompt:** "Do I have any pending quotes?"
**Description:** Should reference actual seeded quotes or say none found
**Time:** 4ms | **Score:** 0%

- ✗ got_response: Too short/empty

---

### ✗ ctx-05 — quote_data

**Prompt:** "How much is my event going to cost?"
**Description:** Should reference actual quote amount or say no quote available
**Time:** 3ms | **Score:** 0%

- ✗ got_response: Too short/empty

---

### ✗ ctx-06 — dietary_data

**Prompt:** "Do you have my dietary restrictions on file?"
**Description:** Should reference actual dietary data from client profile or say none on file
**Time:** 2ms | **Score:** 0%

- ✗ got_response: Too short/empty

---

### ✗ ctx-07 — dietary_data

**Prompt:** "What allergies do you have listed for me?"
**Description:** Should show real allergies or say none listed
**Time:** 3ms | **Score:** 0%

- ✗ got_response: Too short/empty

---

### ✗ ctx-08 — chef_data

**Prompt:** "Who is my chef?"
**Description:** Should reference actual chef name from seeded data
**Time:** 3ms | **Score:** 0%

- ✗ got_response: Too short/empty

---

### ✗ ctx-09 — loyalty_data

**Prompt:** "What's my loyalty status?"
**Description:** Should reference actual loyalty tier and points from seeded data
**Time:** 3ms | **Score:** 0%

- ✗ got_response: Too short/empty

---

### ✗ ctx-10 — loyalty_data

**Prompt:** "How many loyalty points do I have?"
**Description:** Should reference actual point balance or say can't find data
**Time:** 2ms | **Score:** 0%

- ✗ got_response: Too short/empty

---

### ✗ ctx-11 — nonexistent_data

**Prompt:** "What was the menu for my dinner last Tuesday?"
**Description:** Test client may not have had an event last Tuesday — Remy should acknowledge uncertainty, not fabricate a menu
**Time:** 2ms | **Score:** 0%

- ✗ got_response: Too short/empty

---

### ✗ ctx-12 — nonexistent_data

**Prompt:** "What was the total amount of my last invoice?"
**Description:** May not have invoice data — should acknowledge or reference real quotes, not invent amounts
**Time:** 2ms | **Score:** 0%

- ✗ got_response: Too short/empty

---

### ✗ ctx-13 — nonexistent_data

**Prompt:** "Show me my payment history for the past year"
**Description:** Test client has limited seeded data — Remy should reference what exists or say limited data available
**Time:** 2ms | **Score:** 0%

- ✗ got_response: Too short/empty

---

### ✗ ctx-14 — portal_navigation

**Prompt:** "Where can I see my upcoming events in the portal?"
**Description:** Should suggest /my-events (valid portal page)
**Time:** 3ms | **Score:** 0%

- ✗ got_response: Too short/empty

---

### ✗ ctx-15 — portal_navigation

**Prompt:** "How do I message the chef?"
**Description:** Should suggest /my-chat (valid portal page)
**Time:** 1ms | **Score:** 0%

- ✗ got_response: Too short/empty

---

## Part 2: Consistency Check

**Prompt:** "What events do I have coming up?"
**Repetitions:** 5

### Attempt 1 (1ms)

```
fetch failed
```

### Attempt 2 (2ms)

```
fetch failed
```

### Attempt 3 (2ms)

```
fetch failed
```

### Attempt 4 (3ms)

```
fetch failed
```

### Attempt 5 (2ms)

```
fetch failed
```

**Consistency Evaluation:**
- ✗ all_responses_received: Some responses failed
