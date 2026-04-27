# Chef Event Briefing System

> Pre-event intelligence briefing that synthesizes everything a chef needs to know before walking into a dinner. One document, one read, zero surprises.

## Problem

A chef walks into a dinner holding fragments: a name they half-remember, a dietary restriction buried in a 3-month-old email, a menu they finalized two weeks ago and haven't looked at since. The data exists. The recall doesn't.

Client Memory captures facts. The Briefing _assembles_ those facts into a single, time-aware document that answers: "What do I need to know right now?"

## What This Is

An auto-generated, AI-synthesized briefing document per event. Produced on demand or auto-triggered 24 hours before event start. Contains:

1. **Client Recap** - who they are, what matters to them (from client memory)
2. **Event Vitals** - date, time, location, guest count, occasion, service style
3. **Dietary Risk Summary** - allergies, restrictions, conflicts with the menu
4. **Menu Intelligence** - what's being served, repeat dishes from prior events, complexity notes
5. **History with Client** - past event count, last event date, what went well/poorly, recurring patterns
6. **Logistics** - travel time, access instructions, site notes, weather
7. **Financial Context** - quoted price, payment status, outstanding balance
8. **Prep Status** - what's done, what's not, what's at risk
9. **Talking Points** - suggested conversation starters based on client context (kids, traditions, last event)
10. **Red Flags** - anything that needs attention before arriving

## Architecture

```
Data Sources                    Aggregator                    Generator
-----------                    ----------                    ---------
client_memory          -->  |                    |      |                    |
events (current)       -->  |  aggregateContext  | -->  |  generateBriefing  | --> BriefingDocument
events (past/client)   -->  |  (server action)   |      |  (parseWithOllama) |
menus + dishes         -->  |                    |      |                    |
messages               -->  |____________________|      |____________________|
weather data           -->
travel/location        -->
financial summary      -->
prep progress          -->
```

### Data Flow

1. **Aggregate** - `aggregateBriefingContext(eventId)` pulls from 8+ data sources in parallel, returns a structured `BriefingContext` object. Pure data, no AI.
2. **Generate** - `generateEventBriefing(eventId)` calls the aggregator, serializes context to text, runs through `parseWithOllama` with a Zod-validated output schema. AI synthesizes, formats, and identifies red flags.
3. **Cache** - Generated briefings are cached in `event_briefings` table. Re-generate on demand or when event data changes significantly.
4. **Display** - `ChefBriefingPanel` component on event detail page. Print-friendly. Copy-to-clipboard.

### No New Tables (v1)

v1 stores briefings in the existing event metadata pattern. If usage proves valuable, v2 adds a dedicated `event_briefings` table with versioning.

## AI Prompt Design

The generator prompt follows Formula > AI: the aggregator does all the data collection and structuring. The AI's job is narrow:

- Synthesize disparate facts into readable prose
- Identify conflicts and risks humans might miss (allergy vs menu mismatch)
- Generate talking points from client memory context
- Flag anything that looks wrong or incomplete

The AI does NOT:

- Make up facts not in the context
- Recommend menu changes (chef's creative domain)
- Generate financial advice
- Guess at missing data

## UI Surface

Single panel on the event detail overview tab. States:

1. **Not generated** - "Generate Briefing" button
2. **Loading** - spinner with progress hint
3. **Generated** - full briefing with sections, print button, copy button, regenerate button
4. **Stale** - warning badge if event data changed since last generation

## Trigger Points

- **Manual**: chef clicks "Generate Briefing" on event page
- **Future (v2)**: auto-generate 24h before event, push notification to chef

## Exit Criteria

- [ ] Briefing generates from real event data in < 15 seconds
- [ ] All 10 sections populated when data exists
- [ ] Print output is clean, single-page-friendly
- [ ] No hallucinated data (every fact traceable to a data source)
- [ ] Works when AI is offline (shows raw aggregated data as fallback)
- [ ] Context agent definition in `.claude/agents/`
