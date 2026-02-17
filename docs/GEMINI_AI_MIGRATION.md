# Smart Import: Anthropic to Google Gemini Migration

## Date: 2026-02-17

## What Changed

Replaced the Anthropic Claude SDK with Google Gemini 2.0 Flash for all AI-powered Smart Import features. This eliminates the paid API requirement and replaces it with a free-tier alternative.

### Files Modified

| File | Change |
|------|--------|
| `lib/ai/parse.ts` | Core parser — swapped Anthropic SDK for `@google/generative-ai`, model changed to `gemini-2.0-flash` |
| `lib/ai/parse-receipt.ts` | Receipt vision parser — swapped to Gemini `inlineData` format for image input |
| `lib/ai/parse-document-vision.ts` | Document vision parser — same swap, supports images and PDFs |
| `.env.local.example` | `ANTHROPIC_API_KEY` replaced with `GEMINI_API_KEY` |
| `app/(chef)/import/page.tsx` | Warning banner updated to reference `GEMINI_API_KEY` + link to Google AI Studio |
| `components/inquiries/inquiry-form.tsx` | Error messages updated to reference `GEMINI_API_KEY` |
| `app/(chef)/recipes/new/create-recipe-client.tsx` | Warning message updated to reference `GEMINI_API_KEY` |
| `package.json` | Removed `@anthropic-ai/sdk`, added `@google/generative-ai` |

### Files NOT Modified (unchanged)

All text parser files that call `parseWithAI()` from `lib/ai/parse.ts` required zero changes because they only import the generic function — the SDK swap is fully encapsulated:

- `lib/ai/parse-client.ts`
- `lib/ai/parse-clients-bulk.ts`
- `lib/ai/parse-recipe.ts`
- `lib/ai/parse-brain-dump.ts`
- `lib/ai/parse-inquiry.ts`
- `lib/ai/parse-document-text.ts`
- `lib/ai/import-actions.ts`
- `lib/ai/import-receipt-action.ts`
- `components/import/smart-import-hub.tsx`

## Why

The Anthropic API requires a paid API key. Google Gemini 2.0 Flash offers:
- **Free tier**: 15 requests/minute, 1,000,000 tokens/day
- **Vision support**: critical for receipt and document photo parsing
- **No credit card**: free API key from Google AI Studio
- **Comparable quality**: strong at structured JSON extraction with explicit schemas

For a single-chef operation, the free tier is more than sufficient.

## How It Connects

The Smart Import system has a clean architecture with a single choke point:
- **Text parsing**: all flows go through `parseWithAI()` in `lib/ai/parse.ts`
- **Vision parsing**: `parse-receipt.ts` and `parse-document-vision.ts` have their own direct SDK calls

By swapping only these 3 files, all 8 import modes (brain dump, clients, recipes, receipts, documents, inquiries, file upload, smart fill) now use Gemini. The Zod validation layer is unchanged — it still validates AI output against strict schemas before any data reaches the database.

## Setup

1. Go to https://aistudio.google.com/apikey
2. Create a free API key
3. Add to `.env.local`:
   ```
   GEMINI_API_KEY=AIza...
   ```
4. Restart the dev server

## Trade-offs

| Aspect | Before (Claude Sonnet) | After (Gemini 2.0 Flash) |
|--------|----------------------|--------------------------|
| Cost | ~$3/1M input tokens | Free (1M tokens/day) |
| Vision quality | Excellent | Very good |
| JSON adherence | Excellent | Very good (explicit schemas help) |
| Speed | ~2-4s per parse | ~1-3s per parse |
| Rate limits | Pay-as-you-go | 15 RPM free tier |

The existing Zod validation layer catches any schema deviations, so if Gemini returns malformed JSON on rare edge cases, the user gets a clear error and can retry.
