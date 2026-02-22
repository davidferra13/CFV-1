# Integration Health Audit — February 2026

## Summary

Full audit of all 32 integrations in ChefFlow. Fixes applied:

1. Google OAuth connect — better error diagnostics and setup guidance
2. ACE email drafting — migrated from Gemini (cloud) to Ollama (local) for privacy
3. Document parsing — migrated from Gemini to Ollama for privacy
4. Unconfigured integrations — graceful degradation with setup instructions

---

## Integration Status Matrix

### Working (14 active)

| Integration     | What It Does                                         | Key Files                                                  |
| --------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| Supabase        | DB, auth, file storage, realtime                     | `lib/supabase/server.ts`, `lib/supabase/client.ts`         |
| Resend          | Transactional email (45+ templates)                  | `lib/email/resend-client.ts`, `lib/email/notifications.ts` |
| Gemini AI       | Cloud AI for non-private tasks (recipes, techniques) | `lib/ai/parse.ts`, `lib/ai/gemini-service.ts`              |
| Ollama          | Local AI for private data + Remy + ACE drafting      | `lib/ai/parse-ollama.ts`, `lib/ai/ace-ollama.ts`           |
| Google OAuth    | Gmail + Calendar API access                          | `lib/google/auth.ts`                                       |
| Gmail API       | Email sync, send, classify                           | `lib/gmail/client.ts`                                      |
| Google Calendar | Event sync, availability                             | `lib/scheduling/calendar-sync.ts`                          |
| Spoonacular     | Ingredient pricing                                   | `lib/grocery/pricing-actions.ts`                           |
| Kroger          | Grocery pricing (OAuth)                              | `lib/grocery/pricing-actions.ts`                           |
| USDA ERS        | Static NE food prices                                | `lib/grocery/usda-prices.ts`                               |
| Wix Webhooks    | Form → inquiry conversion                            | `lib/wix/actions.ts`                                       |
| Website JSON-LD | Review scraping                                      | `lib/reviews/external-sync.ts`                             |
| PWA             | Offline support, install                             | `public/sw.js`                                             |
| Tauri           | Optional desktop shell                               | `lib/notifications/desktop-notify.ts`                      |

### Built but Awaiting Keys (1)

| Integration | Missing                                                                            | Status                                                                                         |
| ----------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Stripe      | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Full code complete including 1,142-line webhook handler. Ready to go live when keys are added. |

### Code Complete, Not Configured (7)

| Integration        | Missing Env Var(s)                                              |
| ------------------ | --------------------------------------------------------------- |
| Google Maps/Places | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `GOOGLE_PLACES_API_KEY`      |
| Twilio (SMS)       | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` |
| Meta (FB/IG)       | `META_APP_ID`, `META_APP_SECRET`                                |
| MealMe             | `MEALME_API_KEY` (requires sales contact)                       |
| Instacart          | `INSTACART_API_KEY`                                             |
| Upstash Redis      | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`            |
| Sentry             | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`                   |
| Web Push (VAPID)   | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CONTACT_EMAIL`  |

### Scaffolded Only (5)

TikTok, LinkedIn, X/Twitter, Pinterest, YouTube Shorts — OAuth config exists in `lib/social/oauth/config.ts`, no posting adapters built yet.

---

## Changes Made This Session

### 1. Google OAuth Connect — Diagnostics

**Problem:** When Google OAuth fails, the user gets a generic "Failed to exchange authorization code" error with no way to diagnose what went wrong.

**Fix:**

- Added `checkGoogleOAuthHealth()` and `isGoogleOAuthConfigured()` to `lib/google/auth.ts`
- Callback route now parses Google's error response and shows specific messages for `redirect_uri_mismatch`, `invalid_grant`, `invalid_client`
- Settings page now shows the required redirect URI that must be registered in Google Cloud Console
- Shows a diagnostic panel with clickable link to Google Cloud Console credentials page

**Action Required (David):**

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Find the OAuth 2.0 Client ID for ChefFlow
3. Under "Authorized redirect URIs", add: `http://localhost:3100/api/auth/google/connect/callback`
4. For production, also add: `https://app.cheflowhq.com/api/auth/google/connect/callback`
5. Ensure both Gmail API and Google Calendar API are enabled in the Google Cloud project

### 2. ACE Email Drafting — Privacy Migration

**Problem:** The ACE Correspondence Engine was sending private client data (names, emails, phones, budgets, dietary restrictions, conversation threads) to Google Gemini. This violates the privacy policy.

**Fix:**

- Created `lib/ai/ace-ollama.ts` — Ollama-powered versions of `generateACEDraft()`, `draftChefResponse()`, and `extractTasksFromChat()`
- Switched `lib/ai/correspondence.ts` to import from `ace-ollama` instead of `gemini-service`
- All client correspondence drafting now stays local via Ollama
- If Ollama is offline, throws `OllamaOfflineError` (never falls back to Gemini)

**What stays on Gemini:**

- Recipe parsing (`parse-recipe.ts`) — recipes aren't PII
- Technique extraction, equipment inference, kitchen spec extraction — not PII

### 3. Document Parsing — Privacy Migration

**Problem:** Document parsing (`parse-document-text.ts`) used Gemini. Documents can contain contracts with client names, payment terms, and other PII.

**Fix:**

- Switched from `parseWithAI` (Gemini) to `parseWithOllama` (local)
- Increased maxTokens to 2048 and timeout to 90s for large documents

### 4. Unconfigured Integration Guards

- Settings page shows clear "not configured" message when Google OAuth env vars are missing
- Social media connect routes already had a guard (line 44 of connect route) — no change needed

---

## AI Routing Summary (After This Session)

| Task                      | Router           | Why                                   |
| ------------------------- | ---------------- | ------------------------------------- |
| Inquiry parsing           | Ollama           | Client PII (names, phones, budgets)   |
| Client import             | Ollama           | Client PII                            |
| Bulk client import        | Ollama           | Client PII                            |
| Brain dump parsing        | Ollama           | Internal business notes               |
| ACE email drafting        | **Ollama (NEW)** | Client conversations, budgets, PII    |
| Simple response drafting  | **Ollama (NEW)** | Client context                        |
| Task extraction from chat | **Ollama (NEW)** | Private messages                      |
| Document parsing          | **Ollama (NEW)** | Contracts with PII                    |
| Recipe parsing            | Gemini           | No PII — just ingredients and methods |
| Technique extraction      | Gemini           | Equipment descriptions — no PII       |
| Equipment inference       | Gemini           | Technical cooking data — no PII       |
| Kitchen spec extraction   | Gemini           | Kitchen descriptions — no PII         |
| Remy assistant            | Ollama           | Full business context                 |

---

## Files Modified

| File                                            | Change                                                        |
| ----------------------------------------------- | ------------------------------------------------------------- |
| `lib/google/auth.ts`                            | Added `checkGoogleOAuthHealth()`, `isGoogleOAuthConfigured()` |
| `app/api/auth/google/connect/callback/route.ts` | Better error parsing from Google token exchange               |
| `components/settings/google-integrations.tsx`   | Diagnostic panel, unconfigured guard                          |
| `lib/ai/ace-ollama.ts`                          | **NEW** — Ollama-powered ACE drafting                         |
| `lib/ai/correspondence.ts`                      | Import switched from `gemini-service` → `ace-ollama`          |
| `lib/ai/parse-document-text.ts`                 | Switched from `parseWithAI` → `parseWithOllama`               |
| `docs/integration-health-audit.md`              | This file                                                     |
