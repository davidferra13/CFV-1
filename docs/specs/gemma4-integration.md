# Gemma 4 Integration Spec

> Full Gemma 4 E4B integration across ChefFlow. Built 2026-04-18.

## What Changed

Google's Gemma 4 E4B replaces Qwen 3 as ChefFlow's AI runtime. This is a generational leap.

### Performance

| Metric             | Before (Qwen 3)     | After (Gemma 4)     |
| ------------------ | ------------------- | ------------------- |
| Response time      | ~120s               | ~1-6s               |
| Vision model       | Separate (llava:7b) | Native (same model) |
| Audio processing   | None                | Native              |
| Function calling   | Prompt-engineered   | Native              |
| JSON output        | Prompt-engineered   | Native format mode  |
| Thinking/reasoning | None                | Configurable        |
| Context window     | 32K                 | 128K                |
| Agentic tool use   | 6.6% benchmark      | 86.4% (+1,200%)     |

### Changes Made

#### 1. Model Configuration

- `lib/ai/providers.ts`: all fallback defaults updated to `gemma4`
- `.env.local`: OLLAMA_MODEL, OLLAMA_MODEL_FAST, OLLAMA_MODEL_COMPLEX all set to `gemma4:4b` (resolves to e4b)

#### 2. Vision Model Swap

- `lib/ai/remy-vision-actions.ts`: VISION_MODEL changed from `llava:7b` to `process.env.OLLAMA_MODEL || 'gemma4'`
- No separate vision model dependency. Gemma 4 E4B handles text, images, audio, video natively.
- Receipt scanning and dish photo analysis now use the same model as all other Remy tasks.

#### 3. Thinking Mode (Configurable Reasoning)

- `app/api/remy/stream/route-runtime-utils.ts`: added `shouldUseThinking(scope, message)` function
- `app/api/remy/stream/route.ts`: all 4 `think: false` calls replaced with dynamic `think: useThinking`
- Logic: `full` scope (complex queries) = always think. `focused` scope = think if pattern matches (financial, strategy, analysis). `minimal` scope = never think.
- ThinkingBlockFilter already existed to strip `<think>` blocks from streamed output.
- Token budget increased by 200 when thinking is enabled (thinking tokens don't count toward output but need headroom).

#### 4. Audio / Voice Memo Processing

- `lib/ai/remy-vision-actions.ts`: added `processVoiceMemo()` and `formatVoiceMemoResponse()`
- `app/api/remy/stream/route.ts`: added audio path (checks `audioBase64` field in request body)
- Extracts: transcription, action items, client names, event references, notes
- Client-side needs: UI for recording/uploading audio, sending `audioBase64` field in POST body

#### 5. Slow-Response UX Removal

- `lib/ai/privacy-narrative.ts`: removed all "slower than cloud" and "may take longer" messaging
- `lib/ai/remy-personality.ts`: REMY_SPEED_EXPLANATION reframed as strength. Added capabilities section.
- `lib/ai/privacy-narrative.ts`: REMY_SELF_KNOWLEDGE reframed from apologetic to confident
- `components/ai/remy-drawer.tsx`: removed SPEED_TRADEOFF footer
- `components/ui/task-loader.tsx`: removed "may take a moment"
- All surfaces importing SPEED_TRADEOFF / SPEED_TRADEOFF_SHORT auto-updated (constants changed at source)

#### 6. Claude Code Delegation (MCP Server)

- `.claude/mcp-servers/ollama-delegate/server.mjs`: MCP server routing Claude Code tasks to local Gemma 4
- `.claude/mcp.json`: registered as `ollama-delegate`
- `CLAUDE.md`: updated to 4-tier model hierarchy (Local > Haiku > Opus > Opus Advisor)
- Tools: `delegate`, `delegate_code`, `delegate_summarize`, `delegate_extract`, `list_models`
- Full spec: `docs/specs/ollama-delegate-mcp.md`

### Still Needs Client-Side Work

1. **Audio recording UI** - Remy drawer needs a mic button that records audio, converts to base64, and sends `audioBase64` in the POST body. Backend is ready.
2. **Handwritten recipe OCR** - Vision path works, but no dedicated UI for "scan my notebook page." The photo upload path handles it generically.
3. **Gemma 4 function calling format** - The command intent parser still uses prompt-engineered JSON. Migrating to Gemma 4's native function calling format would further improve tool dispatch reliability. Deferred; current approach works.

### AI Policy Unchanged

- AI never generates recipes. Period.
- Formula > AI when deterministic works.
- Chef approves all AI drafts.
- No PII through Gemini. Ollama only for private data.
