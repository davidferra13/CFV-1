# Client Remy Edge Case Test Report

**Date:** 2026-03-10
**Prompts:** 25 | **Pass:** 0 | **Fail:** 25
**Pass Rate:** 0.0%
**Runtime:** 2.6 minutes

---

## Category Breakdown

| Category | Pass | Fail |
|----------|------|------|
| unicode | 0 | 5 |
| boundary | 0 | 6 |
| special_chars | 0 | 4 |
| ambiguous | 0 | 5 |
| long_input | 0 | 1 |
| contradiction | 0 | 3 |
| meta | 0 | 1 |

---

## All Results

### ✗ edge-01 — unicode

**Input:** `Can I book a dinner for next Saturday? 🎉🍷🥩`
**Description:** Normal message with emojis
**Time:** 7ms | **Score:** 0%

**Error:** fetch failed

- ✗ no_crash: Crashed: fetch failed

---

### ✗ edge-02 — unicode

**Input:** `我想预订一个周六晚餐`
**Description:** Chinese — should get a response (likely in English)
**Time:** 3ms | **Score:** 0%

**Error:** fetch failed

- ✗ no_crash: Crashed: fetch failed

---

### ✗ edge-03 — unicode

**Input:** `Quiero reservar una cena para 8 personas el sábado`
**Description:** Spanish — should respond helpfully
**Time:** 4ms | **Score:** 0%

**Error:** fetch failed

- ✗ no_crash: Crashed: fetch failed

---

### ✗ edge-04 — unicode

**Input:** `مرحبا، أريد حجز عشاء`
**Description:** Arabic (RTL) — should respond
**Time:** 3ms | **Score:** 0%

**Error:** fetch failed

- ✗ no_crash: Crashed: fetch failed

---

### ✗ edge-05 — unicode

**Input:** `🍕🍕🍕🍕🍕🍕🍕🍕🍕🍕`
**Description:** Emoji-only message
**Time:** 2ms | **Score:** 0%

**Error:** fetch failed

- ✗ no_crash: Crashed: fetch failed

---

### ✗ edge-06 — boundary

**Input:** `a`
**Description:** Single character — minimal valid input
**Time:** 2ms | **Score:** 0%

**Error:** fetch failed

- ✗ no_crash: Crashed: fetch failed

---

### ✗ edge-07 — boundary

**Input:** `?`
**Description:** Just a question mark
**Time:** 3ms | **Score:** 0%

**Error:** fetch failed

- ✗ no_crash: Crashed: fetch failed

---

### ✗ edge-08 — boundary

**Input:** `...`
**Description:** Just ellipsis
**Time:** 2ms | **Score:** 0%

**Error:** fetch failed

- ✗ no_crash: Crashed: fetch failed

---

### ✗ edge-09 — boundary

**Input:** `                    hi                    `
**Description:** Lots of whitespace around a word
**Time:** 2ms | **Score:** 0%

**Error:** fetch failed

- ✗ no_crash: Crashed: fetch failed

---

### ✗ edge-10 — boundary

**Input:** `WHAT IS THE STATUS OF MY EVENT AND WHEN IS IT AND HOW MANY GUESTS AND WHAT IS THE MENU AND HOW MUCH ...`
**Description:** ALL CAPS shouting — should still answer calmly
**Time:** 2ms | **Score:** 0%

**Error:** fetch failed

- ✗ no_crash: Crashed: fetch failed

---

### ✗ edge-11 — boundary

**Input:** `hi hi hi hi hi hi hi hi hi hi hi hi hi hi hi hi hi hi hi hi hi hi hi hi hi hi hi hi hi hi hi hi hi h...`
**Description:** Repeated word many times
**Time:** 2ms | **Score:** 0%

**Error:** fetch failed

- ✗ no_crash: Crashed: fetch failed

---

### ✗ edge-12 — special_chars

**Input:** `What's the status of my event? (the one on 3/15) — I need an update ASAP!!!`
**Description:** Heavy punctuation and parentheses
**Time:** 2ms | **Score:** 0%

**Error:** fetch failed

- ✗ no_crash: Crashed: fetch failed

---

### ✗ edge-13 — special_chars

**Input:** `I need dinner for 10 people @ $100/person or less — is that doable?? Let me know ASAP & send the quo...`
**Description:** Mixed special characters — @, $, /, &
**Time:** 1ms | **Score:** 0%

**Error:** fetch failed

- ✗ no_crash: Crashed: fetch failed

---

### ✗ edge-14 — special_chars

**Input:** `<b>Can you make the menu bold?</b> <script>alert('test')</script>`
**Description:** HTML/XSS injection attempt — should be treated as text
**Time:** 2ms | **Score:** 0%

**Error:** fetch failed

- ✗ no_crash: Crashed: fetch failed

---

### ✗ edge-15 — special_chars

**Input:** `SELECT * FROM events WHERE client_id = '1'; DROP TABLE events;--`
**Description:** SQL injection attempt — should be treated as text
**Time:** 2ms | **Score:** 0%

**Error:** fetch failed

- ✗ no_crash: Crashed: fetch failed

---

### ✗ edge-16 — ambiguous

**Input:** `yes`
**Description:** Context-free affirmative — Remy should ask what they mean
**Time:** 2ms | **Score:** 0%

**Error:** fetch failed

- ✗ no_crash: Crashed: fetch failed

---

### ✗ edge-17 — ambiguous

**Input:** `no`
**Description:** Context-free negative
**Time:** 2ms | **Score:** 0%

**Error:** fetch failed

- ✗ no_crash: Crashed: fetch failed

---

### ✗ edge-18 — ambiguous

**Input:** `thanks`
**Description:** Just a thank you — Remy should respond warmly
**Time:** 2ms | **Score:** 0%

**Error:** fetch failed

- ✗ no_crash: Crashed: fetch failed

---

### ✗ edge-19 — ambiguous

**Input:** `nevermind`
**Description:** Dismissal — Remy should acknowledge gracefully
**Time:** 3ms | **Score:** 0%

**Error:** fetch failed

- ✗ no_crash: Crashed: fetch failed

---

### ✗ edge-20 — ambiguous

**Input:** `hello`
**Description:** Simple greeting — should get a warm welcome
**Time:** 3ms | **Score:** 0%

**Error:** fetch failed

- ✗ no_crash: Crashed: fetch failed

---

### ✗ edge-21 — long_input

**Input:** `So here's the thing, I've been going back and forth about this dinner party for weeks now and I keep...`
**Description:** Long stream-of-consciousness message — Remy should extract the core question
**Time:** 2ms | **Score:** 0%

**Error:** fetch failed

- ✗ no_crash: Crashed: fetch failed

---

### ✗ edge-22 — contradiction

**Input:** `I want a vegan dinner but also a big steak for the main course`
**Description:** Contradictory request — Remy should clarify
**Time:** 2ms | **Score:** 0%

**Error:** fetch failed

- ✗ no_crash: Crashed: fetch failed

---

### ✗ edge-23 — contradiction

**Input:** `I need dinner for 0 people`
**Description:** Zero guest count — should ask for clarification
**Time:** 2ms | **Score:** 0%

**Error:** fetch failed

- ✗ no_crash: Crashed: fetch failed

---

### ✗ edge-24 — contradiction

**Input:** `I want to book dinner for yesterday`
**Description:** Past date booking — should note the date issue
**Time:** 2ms | **Score:** 0%

**Error:** fetch failed

- ✗ no_crash: Crashed: fetch failed

---

### ✗ edge-25 — meta

**Input:** `Are you a real person or a bot?`
**Description:** Identity question — should acknowledge being AI concierge without robotic language
**Time:** 2ms | **Score:** 0%

**Error:** fetch failed

- ✗ no_crash: Crashed: fetch failed

---

