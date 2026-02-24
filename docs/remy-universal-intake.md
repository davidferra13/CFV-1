# Remy Universal Intake

> Feed Remy a transcript, a client list, or a brain dump — it parses everything and puts it where it belongs.

## Overview

Remy can now act as a **universal intake agent**. Instead of manually filling out forms, the chef can paste unstructured text into Remy's chat, and Remy extracts structured data (clients, events, inquiries, notes) and creates the records after chef approval.

## Three Intake Modes

### 1. Transcript Parsing (`agent.intake_transcript`)

Parse a conversation transcript (call notes, texts, emails, meeting notes) into structured entities.

**Example input:**

> "Just spoke with Sarah Johnson about her daughter's graduation party June 15. 40 guests, budget around $3000, outdoor venue. Sarah's number is 555-0123. Her daughter Emma is gluten-free and one guest has a severe nut allergy."

**What gets extracted:**

- 1 client (Sarah Johnson, phone, dietary info)
- 1 event (graduation party, June 15, 40 guests, $3000)
- Allergy warnings flagged

### 2. Bulk Client Import (`agent.intake_bulk_clients`)

Import multiple clients from a pasted list, CSV, or freeform text.

**Example input:**

> "Sarah Johnson - sarah@email.com - vegetarian, nut allergy
> Mike Davis - 555-0456 - no restrictions
> Lisa Chen - lisa@chen.com - vegan, gluten-free"

### 3. Brain Dump (`agent.intake_brain_dump`)

Parse a freeform brain dump containing any mix of clients, recipes, notes, and event ideas.

**Example input:**

> "John lives on the Upper East Side, always does Valentine's Day dinner for 4, his wife is lactose intolerant. Also need to remember my pan sauce recipe — shallots, red wine, butter, stock, thyme. Oh and I should follow up with the Hendersons about their anniversary party next month."

## How It Works

1. **Chef sends text** — paste directly (up to 2000 chars) or attach a file (up to 10K chars)
2. **Remy classifies** the message as a command and routes to the appropriate intake action
3. **Parser extracts** structured data using local Ollama (privacy preserved)
4. **Preview card** shows everything extracted with field-by-field review
5. **Chef approves** — one click for single records, "Approve All" for batches
6. **Records created** — clients, inquiries, and notes written to Supabase

## Approval Flow

All intake actions are **Tier 2** — nothing is written to the database until the chef clicks Approve.

For bulk operations (10+ fields), the preview card:

- Shows a compact summary with the first 6 fields
- "Show X more fields" expands to a scrollable list (max 256px)
- "Approve All" button for batch confirmation
- "Dismiss" to cancel the entire operation

## Duplicate Detection

When clients are extracted, Remy searches for existing clients by name. If a potential duplicate is found, a warning appears:

> "Sarah Johnson" may already exist as "Sarah M. Johnson" — will create new record unless dismissed.

## Input Limits

| Input Method                             | Limit             |
| ---------------------------------------- | ----------------- |
| Text input (typed/pasted)                | 2,000 characters  |
| File attachment (.txt, .md, .csv, .json) | 10,000 characters |

## Privacy

All parsing uses `parseWithOllama` — data stays on the local machine. No cloud LLMs, no external APIs. If Ollama is offline, the feature fails gracefully with a clear error.

## Heuristic Fallback

If Ollama fails (timeout, model error), the transcript parser falls back to heuristic client extraction — regex-based name/email/phone detection. This produces lower-confidence results with a warning, but still works without the LLM.

## Files

| File                                        | Purpose                                      |
| ------------------------------------------- | -------------------------------------------- |
| `lib/ai/parse-transcript.ts`                | Transcript-to-entities parser                |
| `lib/ai/agent-actions/intake-actions.ts`    | Three intake agent action definitions        |
| `lib/ai/agent-actions/index.ts`             | Registration barrel file                     |
| `lib/ai/remy-classifier.ts`                 | Intake command examples in classifier prompt |
| `components/ai/remy-drawer.tsx`             | Raised input limits                          |
| `components/ai/agent-confirmation-card.tsx` | Batch approval mode                          |

## Trigger Phrases

These phrases (and variations) trigger intake actions:

- "Here's a transcript from a client call..."
- "Parse this conversation..."
- "Import these clients..."
- "Bulk import my client list"
- "Here's a brain dump..."
- "I just got off the phone with someone about..."
- "Process these notes from today's calls"
