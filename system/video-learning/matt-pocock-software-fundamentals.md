# Matt Pocock Software Fundamentals Learning Ledger

Source: `https://www.youtube.com/watch?v=v4F1gFy-hqg&t=330s`

Video: `Software Fundamentals Matter More Than Ever`, Matt Pocock, AI Engineer, uploaded 2026-04-23, duration 18:26.

Coverage: auto captions plus sampled frames from the lecture at the linked section and later slide transitions. Auto captions are not exact. Slide observations are visual evidence, not full-video playback.

## Standing Lesson

The durable lesson is that AI raises the value of software fundamentals. ChefFlow should get better by improving shared design concepts, domain language, feedback loops, test boundaries, and deep modules before asking agents to generate more code.

## Learning Ledger

| Timestamp | Evidence | Concept | ChefFlow Adoption Action | Drill |
| --- | --- | --- | --- | --- |
| 00:05:30 | Slide about the design concept, attributed to Frederick P. Brooks | A system needs a coherent shared design concept before implementation | Start ambiguous tasks by restating the design concept and unresolved branches | What are we building, what must stay true, and which decision branch blocks the next move? |
| 00:08:45 | Slide quoting Domain-Driven Design on ubiquitous language | The team and code should use the same domain terms | Before coding, extract the existing ChefFlow terms and reuse them in plans, tests, and final answers | Which term in the request conflicts with the repo's existing language? |
| 00:10:50 | Slide naming the failure mode "Doing way too much" | AI work drifts when the implementation slice is too broad | Keep changes small, owned, and validated before expanding scope | What is the smallest coherent step that proves this direction? |
| 00:12:50 | Slide quoting John Ousterhout on deep modules | Good modules expose simple interfaces while hiding meaningful complexity | Prefer deep modules with stable contracts over shallow helper sprawl | Which interface can hide the complexity we are about to spread around? |
| 00:14:05 | Module diagram comparing grouped behavior | Better structure reduces review load and agent confusion | Review feature work for fragmented modules and leaky boundaries | What would a future agent need to know to modify this without reading every file? |
| 00:16:25 | Slide reading "Deep Modules = Grey Boxes" | Humans should inspect strategic boundaries while trusting tested internals | Define interface, invariants, and tests first, then allow tactical implementation behind the boundary | What must remain transparent to the human reviewer, and what can stay behind tests? |
| 00:17:15 | Slide quoting Kent Beck about investing in system design daily | Design is not a one-time planning phase | End substantial tasks with one design investment note | Did this task make the next change easier, faster to verify, or safer to delegate? |

## Reuse Protocol

For future work derived from this video:

1. Use `youtube-watch` to preserve source coverage, visual evidence, source confidence, and referenced assets.
2. Use `software-fundamentals` before any implementation inspired by the lecture.
3. Ask one grill-me question when the shared design concept is unclear.
4. Identify the fastest feedback loop before editing code.
5. Record one design investment in the final answer when a code or skill change ships.

## Next Drills

- Audit one active ChefFlow module for shallow helper sprawl and propose a deep-module boundary.
- Convert one vague feature request into the software fundamentals planning template.
- Take one old AI-generated spec and extract the missing ubiquitous language.
- Pick one risky workflow and define the interface-first contract before implementation.
