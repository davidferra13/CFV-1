# Spec: Remy Advisor Pattern

> Remy becomes an advisor that delegates to specialist models. The fastest model (Gemma 4 E2B) classifies the task, then routes to the best model for execution. Two-phase inference: classify, then execute.

## Status: QUEUED

## Dependencies

- `docs/specs/remy-model-registry.md` must be built first
- `docs/specs/remy-model-discovery.md` must be built first
- `docs/specs/remy-smart-router.md` must be built first

## Context

Currently Remy's intent classifier (`lib/ai/remy-classifier.ts`) uses the SAME model as the response generator. With the smart router in place, we can now use a two-phase approach:

1. **Phase 1 (Classify):** Use the fastest, smallest model (e.g. `gemma4:e2b`) to classify the user's message intent and complexity
2. **Phase 2 (Execute):** Route to the best model for that specific task type

This is the "advisor pattern" from the research. The classifier acts as a lightweight router that costs almost nothing, and the heavy model only runs when needed.

## Changes to Remy Classifier

### File: `lib/ai/remy-classifier.ts`

The existing classifier already outputs `intent: 'question' | 'command' | 'mixed'`. Extend the schema to also output a `complexity` score and a `taskDomain`, which the smart router can use.

**Find the existing `ClassificationSchema` (around line 12-17):**

```typescript
const ClassificationSchema = z.object({
  intent: z.enum(['question', 'command', 'mixed']),
  confidence: z.number().min(0).max(1),
  commandPart: z.string().optional(),
  questionPart: z.string().optional(),
})
```

**Replace with:**

```typescript
const ClassificationSchema = z.object({
  intent: z.enum(['question', 'command', 'mixed']),
  confidence: z.number().min(0).max(1),
  commandPart: z.string().optional(),
  questionPart: z.string().optional(),
  complexity: z.enum(['simple', 'moderate', 'complex']).optional(),
  taskDomain: z
    .enum([
      'chat', // General conversation, greetings, small talk
      'lookup', // Find data: events, clients, recipes, finances
      'draft', // Write content: emails, captions, contracts
      'analysis', // Reason about data: costs, scheduling, planning
      'action', // Execute something: create event, update client
    ])
    .optional(),
})
```

**Add to the `CLASSIFIER_SYSTEM_PROMPT` (append before the closing backtick):**

```
Also classify:
- complexity: "simple" (one-step lookup or greeting), "moderate" (needs context or light reasoning), "complex" (multi-step analysis, planning, or creative work)
- taskDomain: "chat" (conversation), "lookup" (find/retrieve data), "draft" (write content), "analysis" (reason/calculate), "action" (create/update/delete)
```

**Find the `classifyIntent` function call to `parseWithOllama` and add the modelTier and dispatchHint:**

Find where `parseWithOllama` is called inside `classifyIntent` (the function should have a call like):

```typescript
const result = await parseWithOllama(CLASSIFIER_SYSTEM_PROMPT, message, ClassificationSchema)
```

Replace with:

```typescript
const result = await parseWithOllama(CLASSIFIER_SYSTEM_PROMPT, message, ClassificationSchema, {
  modelTier: 'fast',
  dispatchHint: {
    taskType: 'remy.classify',
    source: 'remy-classifier',
    surface: 'server.classify',
    latencySensitive: true,
  },
})
```

This tells the smart router to use the fastest available model for classification.

### File: `lib/ai/remy-types.ts`

**Find the `MessageIntent` type and extend it.** Add `complexity` and `taskDomain` if they are not already there:

```typescript
// Add to MessageIntent (keep all existing fields):
complexity?: 'simple' | 'moderate' | 'complex'
taskDomain?: 'chat' | 'lookup' | 'draft' | 'analysis' | 'action'
```

### File: `lib/ai/remy-actions.ts`

**In the main `sendRemyMessage` function (or equivalent),** after calling `classifyIntent`, use the classification result to set the model tier for the response generation call.

Find where the response `parseWithOllama` call happens (the one that generates Remy's actual response). Add model tier based on classification:

```typescript
// Map classification complexity to dispatch tier
function complexityToTier(complexity?: string): 'fast' | 'standard' | 'complex' {
  switch (complexity) {
    case 'simple':
      return 'fast'
    case 'complex':
      return 'complex'
    default:
      return 'standard'
  }
}

// Map taskDomain to dispatch taskType
function domainToTaskType(domain?: string): string {
  switch (domain) {
    case 'chat':
      return 'remy.chat'
    case 'lookup':
      return 'remy.command.lookup'
    case 'draft':
      return 'remy.draft'
    case 'analysis':
      return 'remy.analysis'
    case 'action':
      return 'remy.command.action'
    default:
      return 'remy.chat'
  }
}
```

Then pass these to the parseWithOllama options for the response call:

```typescript
{
  modelTier: complexityToTier(classification.complexity),
  dispatchHint: {
    taskType: domainToTaskType(classification.taskDomain),
    source: 'remy-actions',
    surface: 'server.remy',
  },
}
```

**IMPORTANT:** The `sendRemyMessage` function is large and complex. Only add the two helper functions above (at module scope, outside the function) and the options object to the existing `parseWithOllama` call. Do NOT restructure the function. Do NOT move code around. Do NOT change any other logic.

## How It Works End-to-End

```
User: "How much did I spend on the Henderson event?"

Phase 1 (Classify) - uses gemma4:e2b (fastest, ~60 t/s)
  -> intent: "question"
  -> complexity: "moderate" (needs data lookup + calculation)
  -> taskDomain: "analysis"

Phase 2 (Route) - smart router picks best model for "analysis" + "standard" tier
  -> picks qwen3.5:4b (best reasoning in 6GB budget)
  -> generates response with financial context

User: "Hey Remy, good morning!"

Phase 1 (Classify) - uses gemma4:e2b
  -> intent: "question"
  -> complexity: "simple"
  -> taskDomain: "chat"

Phase 2 (Route) - smart router picks best for "chat" + "fast" tier
  -> picks gemma4:e2b itself (fast enough for greetings)
  -> instant response
```

## Testing

1. **No regression:** Send "hello" to Remy. Should still get a normal response.
2. **Speed test:** Send a simple greeting. Check server logs - classifier should use `gemma4:e2b` (if installed) and response should also use a fast model.
3. **Complex test:** Ask "analyze my revenue trend for the last 3 months." Classifier should tag as `complexity: complex`, `taskDomain: analysis`. Response should use a larger model.
4. **Fallback:** If only `gemma4:e4b` is installed, everything should still work (falls back to env var model).

## DO NOT

- Do NOT restructure `remy-actions.ts` - only add the two small helper functions and modify the parseWithOllama options
- Do NOT change the classifier's behavior for existing fields (intent, confidence, commandPart, questionPart)
- Do NOT remove the existing `classifyIntent` function or its exports
- Do NOT change how Remy's personality, context, or memory works
- Do NOT modify the streaming route (`app/api/remy/stream/`)
- Do NOT add new API routes or UI components
- Do NOT use em dashes anywhere
- Do NOT make the complexity/taskDomain fields required - they must be optional for backward compat
- Do NOT modify more than 3 files total (remy-classifier.ts, remy-types.ts, remy-actions.ts)
