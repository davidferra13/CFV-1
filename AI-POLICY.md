# ChefFlow Strict AI Policy (Mandatory for All Agents)

This policy governs every AI system, model, and agent that touches ChefFlow. Claude Code, OpenClaw, Remy, Gustav, every LLM in the dispatch layer. No exceptions. No workarounds. No "just this once."

If it's not in this document, it's not allowed.

---

## 1. AI Must NEVER Generate Recipes (Absolute, Zero Exceptions)

AI must never create, generate, fabricate, hallucinate, draft, suggest, or pull recipes from anywhere. Not from the internet, not from training data, not as a suggestion, not as a draft, not with chef approval, not in any tier, not ever.

Recipes are the chef's creative work and intellectual property. AI has zero role in telling a chef what to cook or how to cook it.

**The ONLY thing AI can do with recipes:**

- Search the chef's own recipe book (`recipe.search`). Read-only lookup of recipes the chef already entered manually. That's it.

**Everything else is banned:**

- Generate or fabricate a recipe from scratch
- Pull or suggest recipes from the internet or training data
- Create recipe instructions, methods, or ingredient lists
- Draft recipe content for chef review
- Add or modify ingredients via AI
- Suggest "what to make" or "what to cook"
- Auto-fill recipe fields from natural language descriptions

**Enforcement:**

- `agent.create_recipe`, `agent.update_recipe`, and `agent.add_ingredient` are permanently restricted in `lib/ai/agent-actions/restricted-actions.ts`
- The input validation layer (`lib/ai/remy-input-validation.ts`) blocks recipe generation intent before it reaches the LLM
- Recipes are entered manually on the recipe form. Period.

---

## 2. Formula Over AI, Always

If deterministic code (math, logic, regex, database queries, conditional checks) can produce the correct result, always use it over AI. No exceptions.

A formula returns the same correct answer every single time, instantly, for free. AI returns a probably correct answer, slower, using compute resources, and might hallucinate. There is no contest when both can do the job.

| Use deterministic code when...                 | Use AI only when...                                |
| ---------------------------------------------- | -------------------------------------------------- |
| The calculation is math                        | Unstructured text needs to become structured data  |
| The logic is a simple condition                | A human would need judgment to interpret the input |
| Data is already structured (DB columns, forms) | The input format is unpredictable                  |
| Correctness matters more than convenience      | Convenience matters and a wrong answer is harmless |
| It needs to work offline, instantly, zero cost | The feature already requires Ollama to be running  |

This applies retroactively. If any existing feature uses an LLM for something a formula could handle, swap it out. AI stays where it genuinely earns its place: understanding natural language, generating draft text, interpreting unstructured input. Everywhere else, math and logic win.

---

## 3. Private Data Never Leaves the PC

Any function that handles client PII, financials, allergies, messages, or internal business data must use Ollama (local inference) only. Never Gemini, never Groq, never any cloud LLM. If Ollama is offline, the feature hard-fails with a clear error. No fallback to cloud. Ever.

**Private data categories that must stay local:**

- Client names, contact info, dietary restrictions, allergies, messages
- Budget amounts, quotes, payment history, revenue, expenses
- Business analytics, insights, lead scores, pricing history
- Temperature logs, staff data, event operational details
- Chef names, business names, event history
- Contracts, invoices, any client-facing documents

If a new AI function handles ANY of the above, it MUST use `parseWithOllama`. No exceptions, no "just this once." Cloud providers are for generic, non-private tasks only.

---

## 4. AI Assists Drafting. AI Never Owns Truth.

All AI output is a suggestion. The chef confirms before it becomes canonical. AI never mutates canonical state directly.

**AI may:**

- Draft proposals, email templates, follow-up messages
- Suggest pricing ranges, prep timelines, shopping lists
- Summarize revenue trends, highlight patterns
- Parse unstructured text into structured fields

**Rules for all of the above:**

- Output is editable
- Nothing auto-sends
- Nothing auto-saves without chef confirmation
- AI produces suggestions. Chef commits.
- Suggestions must be visually distinct from canonical data, clearly labeled

---

## 5. AI Is Banned From These Operations

### Lifecycle Transitions

AI cannot move inquiry to proposal, confirm events, close events, cancel events, mark as paid, or issue refunds. Only explicit human actions change state.

### Financial Ledger

AI cannot create, modify, or delete ledger entries. Cannot adjust totals. Cannot issue refunds. Cannot mark invoices paid. AI may suggest. It cannot write. The ledger is deterministic, not probabilistic.

### Identity and Access

AI cannot merge client accounts, modify tenant isolation, alter roles, override RLS logic, or resolve identity conflicts automatically. Identity changes must be deterministic and logged.

### Silent Automation

AI cannot auto-send messages, auto-confirm menus, auto-generate invoices, auto-approve proposals, auto-apply discounts, or auto-trigger loyalty rewards. Nothing happens without an explicit commit action from the chef.

---

## 6. Zero Hallucination Rule

The app must never display information that isn't true. Every piece of data a user sees must be real, current, and verified, or explicitly marked as unavailable. Silent lies are worse than visible errors.

**Three laws:**

1. **Never show success without confirmation.** Every UI update that assumes a server action succeeded must have error handling and rollback. No exceptions.

2. **Never hide failure as zero.** If data fails to load, show an error state. Never substitute zeros, empty arrays, or default values that look like real data. A chef seeing "$0.00 revenue" when the database is unreachable will make wrong business decisions. A chef seeing "Could not load data" will refresh the page.

3. **Never render a non-functional feature as functional.** If a button doesn't work, a route isn't implemented, or a feature isn't finished, it must be visibly gated, not silently broken.

---

## 7. No Em Dashes in Any AI Output

Never use em dashes anywhere. Not in code, not in UI text, not in emails, not in AI responses, not in comments, not in docs that users see. Nowhere.

Em dashes are the number one tell that text was written by AI. Using them destroys credibility instantly.

Use instead: commas, periods, semicolons, parentheses, colons, two separate sentences, or a hyphen with spaces ( - ) if you absolutely need a break.

---

## 8. The Hard Boundary

If you unplug AI tomorrow, ChefFlow must:

- Still function completely
- Still preserve financial truth
- Still enforce lifecycle rules
- Still protect tenants
- Still be production-grade

If removing AI breaks the system, the architecture is wrong.

AI is never:

- A replacement for business logic
- A shortcut around lifecycle modeling
- A patch for bad architecture
- A way to avoid writing proper schema
- A justification for vague states

If AI is compensating for unclear modeling, the modeling is wrong.

---

**This policy is non-negotiable. Every agent, every model, every system that touches ChefFlow follows it exactly as written.**
