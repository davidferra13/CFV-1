# ONE SURFACE, SLICE 1

Run this spec. Do not expand past its boundary. When done, list what is next; do not build it.

## Why

ChefFlow has 994 pages, 408 API routes, 2,219 components, 348 lib domains, and 608 nav links.
It is built for one private chef running roughly ten dinners. It is unusable by the person who built it.

The engine is real. The surface is the failure. Verified: `lib/remy/actions.ts` is conversation CRUD only
(create, save message, pin, archive, title). There is no tool registry, no intent router, no path from
"what the chef says" to "the server action that does it". Grepping `lib/` for `toolRegistry`,
`routeIntent`, `intentRouter`, `function_call`, or `tool_choice` returns zero files.

Remy can describe the building. Remy cannot open a door. That is the gap this slice closes.

## The shape

One screen. `app/(chef)/page.tsx` becomes the app:

1. **Today**: three to six lines. Next dinner, what is overdue, what is waiting on a client.
   Not a dashboard, not cards, no charts.
2. **One text box** underneath it. Every job the chef has enters here.

Everything else in the app stays on disk and stays reachable by URL. It stops being navigable.

## Scope boundary

**In this slice, and nothing else:**

- `app/(chef)/page.tsx`: the Today block plus the input.
- `lib/remy/verbs/`: the action layer (registry plus resolver plus six verbs).
- `components/navigation/nav-config.tsx`: collapse to five links.

**Explicitly out of this slice.** Do not touch, do not "while I am here":

- Deleting any route, page, component, or lib file. Nothing is deleted in this slice.
- Voice, mobile shell, client portal, admin, partner, vendor, staff portals.
- The other fourteen verbs.
- Any schema change or migration.
- Any redesign of pages that are not `app/(chef)/page.tsx`.

## Build order

### 1. The verb registry

`lib/remy/verbs/registry.ts`

A verb is a plain object:

```ts
type Verb = {
  name: string
  match: RegExp[] // literal phrasings, checked in order
  needs: ('client' | 'event' | 'date')[]
  run: (args: VerbArgs) => Promise<VerbResult>
}
```

`VerbResult` is either a short text answer, a short answer plus a deep link into an existing page,
or a confirmation request when the verb mutates. No verb mutates without confirmation in this slice.

### 2. Resolution, deterministic first

`lib/remy/verbs/resolve.ts`

Order of operations, and this order is the point:

1. Match the input against every verb's `match` patterns. Plain string and regex work, no model.
2. Resolve named entities (client name, event date, event title) against the database by direct lookup.
3. Only if step 1 finds nothing, call the Ollama endpoint and ask it to pick one verb name
   **from the registry**. It selects; it never invents, and it never composes arguments freely.
4. If the model is unreachable or returns a name not in the registry, say so plainly and show the
   six things the chef can type. Never fail silently, never guess.

This satisfies the standing rule that everything works without AI and AI is opt in.

### 3. The six verbs

Each one binds to code that already exists. Read the existing function before writing the binding.

| Verb    | Says                                            | Binds to                                                            |
| ------- | ----------------------------------------------- | ------------------------------------------------------------------- |
| `today` | what is next, what is overdue                   | `lib/briefing/get-morning-briefing.ts`                              |
| `quote` | draft a quote for a client and date             | `lib/quotes/actions.ts`                                             |
| `reply` | draft a reply to the last message from a client | `lib/communication/actions.ts`                                      |
| `cost`  | what a dinner costs to produce                  | `lib/pricing/` (use the existing cost path, do not write a new one) |
| `prep`  | the prep list for a dinner                      | `lib/prep/actions.ts`                                               |
| `paid?` | has this client paid, what is outstanding       | existing ledger or payment queries                                  |

If a binding needs a function that does not exist, stop and report it. Do not build a parallel engine.

### 4. Nav collapse

`components/navigation/nav-config.tsx` currently exports 608 `href` entries.

Reduce the chef nav to exactly five: Today, Dinners, Clients, Money, Settings.

Move every other entry into a single exported array named `hiddenNavItems`, still exported, still typed,
not rendered in the primary nav. Nothing is deleted. Routes stay live and reachable by URL.
The `all-features-collapse.tsx` component may render `hiddenNavItems` behind one disclosure.

## Verification, required before claiming done

State the exact URL verified. Normal app closeout verifies `http://localhost:3100`.

1. `npx tsc --noEmit --skipLibCheck` exits 0.
2. `npm run regression:firewall` passes.
3. Sign in with `.auth/agent.json` via `POST http://localhost:3100/api/e2e/auth`.
4. Playwright the loop end to end and screenshot each step:
   - Load `/`. Today renders real rows from the database, not placeholders and not zeros.
   - Type `today`. Answer matches what the Today block shows.
   - Type each of the other five verbs against a real seeded dinner. Each returns a real answer
     or an honest "I cannot do that yet" with the reason. No verb returns a fabricated success.
   - Stop Ollama. Repeat all six. All six still work.
5. Count nav links after the change and state the number. It must be 5.
6. Run `/wire-audit`.

## Rules

- Nothing is deleted. Hidden, unlinked, and still exported is the bar.
- No em dashes anywhere, in code, copy, or comments. Hook enforced.
- Never render a failed load as `$0.00` or an empty list. Failure states say they failed.
- No verb returns `{ success: true }` for work it did not do.
- Every mutating verb asks for confirmation before it writes.
- Same approach fails three times, stop and report. Forward progress is not a strike.

## Done when

The chef opens `/`, reads four lines, types `prep friday`, and gets the prep list, with Ollama switched off.

Then list the next slice. Do not start it.
