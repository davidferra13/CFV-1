# Remy Mega Upgrade — Session Doc

**Date:** 2026-02-21
**Branch:** `feature/risk-gap-closure`

---

## Summary

Complete overhaul of Remy from a basic chatbot to a modern, fully-featured AI companion. 17 improvements implemented in a single session.

---

## What Changed

### 1. Markdown Rendering

- **Before:** Raw `<pre>` text — `**bold**` showed as literal asterisks
- **After:** Full GitHub-flavored Markdown via `react-markdown` + `remark-gfm`
- Custom component overrides for consistent styling inside chat bubbles
- Supports bold, italic, lists, code blocks, links, headings, blockquotes, tables

### 2. Streaming Responses (SSE)

- **Before:** Entire response loaded at once after 15-30s of "thinking..."
- **After:** Token-by-token streaming via Server-Sent Events at `POST /api/remy/stream`
- Animated cursor blinks while tokens arrive
- Markdown renders incrementally as tokens stream in
- All non-conversational paths (commands, memory) return instant complete responses

### 3. Web Search & URL Reading (Internet Access)

- **New task types:** `web.search` and `web.read` added to command system
- **Search providers:** Tavily API (if `TAVILY_API_KEY` configured) with DuckDuckGo fallback (free, no key needed)
- **URL reading:** Fetches and extracts text from any public URL
- **Task card rendering:** Web results display with clickable titles, snippets, and source URLs
- **Personality updated:** Remy now knows it can search the web and will proactively offer to do so

### 4. Keyboard Shortcut

- `Ctrl+K` / `Cmd+K` toggles Remy drawer open/closed
- `Escape` closes the drawer
- Shown in trigger button tooltip and welcome message

### 5. Message Deletion (Server-Side)

- **Before:** Delete button only removed from React state — messages came back on reload
- **After:** `deleteConversationMessage()` server action deletes from `remy_messages` table
- Optimistic UI update (instant local removal) + non-blocking server delete

### 6. Copy Button on Responses

- Hover over any Remy message to reveal a copy icon
- Copies full message text to clipboard
- Green checkmark feedback for 2 seconds after copy
- Email draft approval also auto-copies draft text to clipboard

### 7. Context-Aware Starter Prompts

- **Before:** Same 4 static starters on every page
- **After:** Dynamic starters based on `pathname`:
  - `/events/[id]` → event-specific starters (prep tips, follow-up, menu inspiration)
  - `/clients` → client-focused starters (recent clients, follow-ups, engagement tips)
  - `/financials` → finance starters (revenue, snapshots, pricing benchmarks)
  - `/recipes` / `/menus` → culinary starters (search recipes, seasonal ideas)
  - `/inquiries` → inquiry starters (open inquiries, availability, response templates)
  - Default → general business starters

### 8. Task Approval Actions (Real Mutations)

- **Before:** `approveTask()` was a no-op that returned confirmation text
- **After:**
  - **Email drafts:** Auto-copies draft text to clipboard on approval
  - **Event drafts:** Creates a real `draft` event in the database, redirects to event page
  - Returns `redirectUrl` for navigation after approval

### 9. Memory Decay Auto-Trigger

- `decayStaleMemories()` now runs automatically once per session when the drawer first opens
- Deactivates memories not accessed in 90 days with importance < 5 and access_count < 3
- Non-blocking — runs in background, never interrupts chat

### 10. Conversation Summarization

- New `summarizeConversationHistory()` function for long threads
- Uses fast Ollama model to condense older messages into 2-4 sentence summary
- Keeps last 10 messages intact, summarizes everything before
- Graceful fallback to manual truncation if Ollama is offline

### 11. Export/Share Conversations

- Download button in drawer header exports current conversation as Markdown file
- `exportConversation()` server action generates formatted output
- Supports both Markdown and plain text formats
- Filename auto-generated from conversation title

### 12. Sound Notification

- Plays a gentle 800Hz sine tone when Remy finishes responding
- Mute/unmute toggle in drawer header (Volume2 / VolumeX icons)
- Uses Web Audio API — no audio files needed
- Graceful fallback if AudioContext unavailable

### 13. Image/File Attachment

- Paperclip button inside the text input
- Supports: `.txt`, `.md`, `.csv`, `.json` (reads content), `.png`, `.jpg`, `.webp` (filename only)
- Text files are read and prepended to the input message (truncated at 1500 chars)
- Images attach filename/size with a note about vision model requirements

### 14. Smarter Thinking Messages

- **Before:** "Remy is thinking... 15s" for every request
- **After:** Context-aware messages based on elapsed time and intent:
  - Commands: "Running your tasks..." → "This one's taking a bit..."
  - Mixed: "Working on your question and tasks..." → "Hang tight, almost there..."
  - Questions: "Remy is thinking..." → "Thinking hard on this one..." → "Complex question, another moment..."

### 15. Culinary Identity & Deep Food Understanding

- Personality guide expanded with culinary artistry section
- Remy now understands: flavor profiles, cuisine styles, plating aesthetics, food philosophy
- Recognizes the chef's culinary influences and favorite techniques from memory
- Positions Remy as: sous chef, business advisor, best friend, accountant, marketing partner
- Food-forward first, business second — always lead with the culinary perspective

### 16. Web Search Awareness in Classifier

- Intent classifier updated with web search command examples
- "Search the web for...", "Google...", "Look up online...", "Read this article..." → classified as commands
- Routes to `web.search` and `web.read` task executors

### 17. Web Result Task Card Rendering

- `web.search` results: clickable titles, snippets, source URLs with brand-colored links
- `web.read` results: page title link + content summary with line clamping

---

## Files Changed

### New Files

| File                           | Purpose                                         |
| ------------------------------ | ----------------------------------------------- |
| `app/api/remy/stream/route.ts` | SSE streaming endpoint for Remy conversations   |
| `lib/ai/remy-web-actions.ts`   | Web search (Tavily/DDG) and URL reading actions |

### Modified Files

| File                                  | Changes                                                                                 |
| ------------------------------------- | --------------------------------------------------------------------------------------- |
| `components/ai/remy-drawer.tsx`       | Complete rewrite — streaming, markdown, all UI features                                 |
| `components/ai/remy-task-card.tsx`    | Added `web.search` and `web.read` result renderers                                      |
| `lib/ai/remy-personality.ts`          | Culinary identity, web search awareness, updated privacy note                           |
| `lib/ai/remy-classifier.ts`           | Web search command examples in classifier prompt                                        |
| `lib/ai/command-task-descriptions.ts` | Added `web.search` and `web.read` task definitions                                      |
| `lib/ai/command-orchestrator.ts`      | Added web executors, real approval mutations, web import                                |
| `lib/ai/remy-conversation-actions.ts` | Added `deleteConversationMessage`, `summarizeConversationHistory`, `exportConversation` |
| `package.json`                        | Added `react-markdown`, `remark-gfm`, `rehype-raw`                                      |

---

## New Dependencies

- `react-markdown` — Markdown rendering in React
- `remark-gfm` — GitHub Flavored Markdown support (tables, strikethrough, etc.)
- `rehype-raw` — Allow raw HTML passthrough in markdown

---

## Environment Variables (Optional)

- `TAVILY_API_KEY` — For higher-quality web search results (free tier: 1000 queries/month). Falls back to DuckDuckGo if not set.

---

## Future Enhancements (Noted from User Feedback)

1. **Chef Q&A / Culinary Profile** — A questionnaire the chef fills out about their food philosophy, favorite cuisines, hero chefs, signature dishes, cooking style. Remy reads and internalizes this to deeply understand the chef's identity.

2. **Document/Folder Management** — Remy creates, organizes, and manages documents and folders on the chef's behalf. "Hey Remy, create a prep checklist folder and add a note for Saturday's event."

3. **Favorite Chefs Database** — Track culinary inspirations and influences. "I love what Thomas Keller does with butter" → Remy remembers and references when suggesting techniques.

4. **Vision Model Support** — When a multimodal Ollama model is available, analyze images directly: menu photos, plating shots, ingredient lists.

5. **Real Email Integration** — Connect to the chef's email (Gmail/Outlook API) so approved drafts can be sent directly from Remy without copy-paste.
