# OpenClaw Model Hierarchy and Job Definitions

> Complete reference for how OpenClaw operates, who reports to who, how every
> model earns its place, and how the entire AI infrastructure fits together
> across ChefFlow. This is the definitive document. If it's not in here, it
> doesn't exist.

Last updated: 2026-03-13

---

## The Big Picture: Who Is In Charge

```
DEVELOPER (David)
  The human. Final authority on everything. Every system exists to serve him.
  He talks to two AI leads directly. Everyone else reports up through them.
  |
  +-- CLAUDE CODE (Anthropic subscription, VS Code)
  |     Lead engineer. Rank 1. Builds ChefFlow directly.
  |     Has full codebase access on the PC.
  |     Uses the developer's Anthropic subscription (OAuth).
  |     Manages the ChefFlow App AI system.
  |     Reviews and approves all code from any source.
  |     DOES NOT report to OpenClaw. OpenClaw DOES NOT give Claude Code orders.
  |
  +-- OPENCLAW (Anthropic API credits, Raspberry Pi)
        Autonomous coding/ops agent team. Rank 2.
        Runs on the Pi, reads the ChefFlow codebase, builds features, runs QA.
        Uses a SEPARATE Anthropic API key ($50 prepaid credits).
        Has its own internal hierarchy of 5 agents (described below).
        OpenClaw's work is ALWAYS subject to Claude Code's review.
```

**The developer is the boss of both. Claude Code and OpenClaw are peers that
serve the developer, but Claude Code outranks OpenClaw on all code decisions.**

OpenClaw is like having a second engineering team working in a separate office.
They can build things, test things, and propose changes. But nothing they
produce is final until Claude Code (or the developer) reviews it.

---

## The Three AI Systems (Completely Separate)

ChefFlow has THREE separate AI systems. They have different jobs, different
hardware, different billing, and different trust levels. They never overlap
except where noted.

### System 1: Claude Code (the lead, this conversation)

- **What it is:** The primary AI engineer. The one reading this file right now.
- **Where it runs:** Developer's PC, inside VS Code
- **Billing:** Developer's Anthropic subscription (monthly, OAuth-based)
- **Trust level:** HIGHEST. Full read/write access to the codebase, database
  migrations, server actions, auth, security, everything.
- **What it does:** All primary development work. Feature implementation, bug
  fixes, architecture decisions, code review, agent coordination, testing,
  deployment to beta.
- **What it controls:** The ChefFlow App AI system (System 2). Claude Code
  configures providers.ts, the dispatch layer, and all routing decisions.
- **Relationship to OpenClaw:** Peer with seniority. Claude Code reviews
  OpenClaw's output. OpenClaw does not give Claude Code instructions.

### System 2: ChefFlow App AI (powers the web app)

- **What it is:** The AI that runs INSIDE the ChefFlow application. It powers
  Remy (the in-app concierge), recipe parsing, lead scoring, email intelligence,
  and every AI feature that end users interact with.
- **Where it runs:** Inside the Next.js app on the developer's PC
- **Config:** `lib/ai/providers.ts` + `lib/ai/dispatch/routing-table.ts`
- **Trust level:** MEDIUM. Can read/write app data but has hard privacy
  boundaries. Private data NEVER leaves the PC.
- **Billing:** Mix of free (Ollama, Groq, Cerebras, SambaNova, Mistral, GitHub
  Models, Workers AI) and paid (Gemini, OpenAI)
- **Who controls it:** Claude Code configures it. The dispatch layer
  (`lib/ai/dispatch/`) makes all routing decisions automatically at runtime.
- **Relationship to OpenClaw:** NONE. These two systems do not talk to each
  other. They share the Ollama server on the PC, but they don't coordinate,
  don't share context, and don't know about each other.

### System 3: OpenClaw (autonomous agent team on the Pi)

- **What it is:** An autonomous coding/ops agent team that reads the ChefFlow
  codebase, builds features, runs QA, and handles development tasks.
- **Where it runs:** Raspberry Pi (10.0.0.177), gateway on port 18789
- **Config:** `/home/openclawcf/.openclaw-chefflow/openclaw.json`
- **Trust level:** LOWER than Claude Code. Its output must be reviewed.
  It works in a sandbox workspace, not the live dev directory.
- **Billing:** Anthropic API prepaid credits ($50 loaded Mar 13, 2026) for
  Opus/Sonnet. Groq free tier for build/QA/runner. Ollama free (PC GPU).
- **Access:** Via the OpenClaw web dashboard (Cloudflare Tunnel or LAN)
- **Who controls it:** The developer gives it tasks through the dashboard.
  Its internal orchestration is handled by the `main` agent (Opus).

**These three systems share Ollama on the PC (10.0.0.153:11434) but nothing else.**

---

## System 3 Deep Dive: OpenClaw's Internal Hierarchy

This is the part that matters most. OpenClaw is not one model. It's a team of
5 agents with a strict chain of command, like a kitchen brigade.

### The Chain of Command

```
DEVELOPER
  |
  | (gives tasks via dashboard)
  |
  v
MAIN (Opus 4.6) -------- THE BOSS OF THE OPENCLAW TEAM
  |                       Receives every message. Makes every decision.
  |                       Delegates down. Reviews up. Never does grunt work.
  |
  +-- SONNET (Sonnet 4.6) -------- SENIOR ENGINEER
  |     Reports to: main
  |     Gets work from: main only
  |     Does: Feature implementation, complex refactors, multi-file changes
  |     Does NOT: Make architectural decisions, choose what to build next
  |     When done: Reports back to main for review
  |
  +-- BUILD (Groq Llama 3.3 70B) -------- BUILD VALIDATOR
  |     Reports to: main (or whoever requested the build check)
  |     Gets work from: main, sonnet
  |     Does: Runs tsc, runs next build, reports pass/fail
  |     Does NOT: Write code, fix errors, make decisions
  |     When done: Reports pass/fail + error details back to requester
  |
  +-- QA (Groq Llama 3.3 70B) -------- QUALITY ASSURANCE
  |     Reports to: main
  |     Gets work from: main
  |     Does: Runs tests, checks regressions, reviews diffs for bugs
  |     Does NOT: Fix issues, write code, make decisions
  |     When done: Reports findings back to main
  |
  +-- RUNNER (Groq Llama 3.1 8B) -------- TASK RUNNER / GRUNT
        Reports to: main, sonnet, build, qa (anyone can use runner)
        Gets work from: any agent
        Does: List files, read configs, run scripts, file operations
        Does NOT: Think, decide, write code, review anything
        When done: Returns raw output to requester
```

### How Work Flows Through OpenClaw (Step by Step)

Here's exactly what happens when the developer sends a message to OpenClaw:

**Step 1: Developer sends message**
The developer types something in the OpenClaw dashboard. Example: "Add a dark
mode toggle to the settings page."

**Step 2: main receives the message**
Opus 4.6 (the `main` agent) receives it FIRST. Always. No other agent ever
sees the developer's raw message. main is the gatekeeper.

**Step 3: main makes a plan**
main thinks about what needs to happen:

- What files need to change?
- Is this a simple change or complex?
- Does it touch security, auth, or database? (If yes, main handles it directly)
- What's the right order of operations?

**Step 4: main delegates**
main sends specific, scoped tasks to the right agents:

- "sonnet: implement dark mode toggle in settings/page.tsx and create the
  theme context provider" (implementation work)
- "runner: list all files in app/(chef)/settings/ so I can see the current
  structure" (quick lookup, done before delegating to sonnet)

**Step 5: Agents execute and report back**

- runner returns the file listing to main
- sonnet implements the feature and reports what it changed
- main may send the changes to build: "build: run tsc and next build"
- build reports pass/fail
- If it fails, main reads the errors and either fixes them itself or sends
  specific fix instructions to sonnet

**Step 6: main reviews and finalizes**
main reviews sonnet's work, checks build results, optionally sends to qa for
testing. Only when main is satisfied does the work get committed.

**Step 7: main reports to developer**
main tells the developer what was done, what files changed, and the result.

### The Rules of the Hierarchy

1. **main ALWAYS receives user messages first.** No agent skips main.

2. **main NEVER does grunt work.** If it needs a file listing, a config read,
   or a simple command run, it delegates to runner. Opus tokens are expensive.
   Don't waste them on `ls`.

3. **main writes code ONLY for critical/sensitive work.** Auth changes,
   security fixes, database migrations, architectural decisions. Everything
   else goes to sonnet.

4. **sonnet is the primary code writer.** It handles 80%+ of actual
   implementation. It's fast, capable, and cheaper than Opus.

5. **sonnet does NOT make architectural decisions.** If sonnet encounters
   something ambiguous (should this be a server action or an API route?
   should this table use chef_id or tenant_id?), it asks main.

6. **build and qa NEVER write code.** They are read-only validators. They run
   commands, read output, and report results. That's it. If something fails,
   they tell main (or whoever asked). They don't attempt fixes.

7. **runner is the cheapest model for a reason.** It handles high-volume,
   low-complexity tasks. File listings, git status, reading configs, running
   scripts. Any agent can delegate to runner. runner doesn't think; it
   executes.

8. **Every agent reports back to whoever gave it the task.** sonnet reports to
   main. build reports to whoever requested the build (usually main). qa
   reports to main. runner reports to whoever asked.

9. **Only main commits code.** Agents propose changes; main approves and
   commits. This prevents conflicting commits from multiple agents.

10. **When the fallback chain activates, the agent's JOB doesn't change.**
    If Opus is rate-limited and main falls back to Groq, main is still the
    orchestrator. It still makes decisions. The model is dumber, but the role
    is the same. (In practice, Groq as orchestrator is a degraded experience,
    which is why the fallback chain exists as a safety net, not a strategy.)

---

## OpenClaw Agents: Complete Job Definitions

### main (Claude Opus 4.6)

**Identity:** The orchestrator. The boss. The decision-maker.

**Model:** `claude/claude-opus-4-6` (Anthropic API, paid)

**Workspace:** `CFv1-openclaw-sandbox`

**What main does:**

- Receives every single user message before anyone else
- Reads the message, understands the intent, makes a plan
- Decides which agents to involve and in what order
- Delegates implementation tasks to sonnet with clear, specific instructions
- Delegates lookups and grunt work to runner
- Sends completed work to build for compilation checks
- Sends completed work to qa for regression testing
- Reviews all code before it's committed
- Makes all architectural decisions (naming, file structure, patterns, approach)
- Writes code directly ONLY for: auth, security, database migrations,
  sensitive business logic, or when the task is too nuanced for sonnet
- Resolves conflicts between agents (if sonnet and qa disagree)
- Reports final results to the developer

**What main does NOT do:**

- List files (runner does that)
- Run builds (build does that)
- Run tests (qa does that)
- Write boilerplate code (sonnet does that)
- Repeat work an agent already did (read their output instead)

**Why Opus:** Opus is the smartest model available. It understands complex
multi-step plans, makes good architectural decisions, catches subtle bugs in
code review, and handles ambiguity well. It's expensive, so we only use it
for decision-making, not for execution.

**Cost discipline:** Every token main uses costs real money. main should be
concise, delegate aggressively, and never waste tokens on tasks a cheaper
model can handle. A 500-token delegation message to sonnet that results in
sonnet writing 5,000 tokens of code is far cheaper than main writing those
5,000 tokens directly.

---

### sonnet (Claude Sonnet 4.6)

**Identity:** The senior engineer. The hands. The one who actually builds.

**Model:** `claude/claude-sonnet-4-6` (Anthropic API, paid)

**Workspace:** `CFv1-openclaw-sandbox`

**What sonnet does:**

- Implements features delegated by main
- Writes new components, pages, server actions, utilities
- Multi-file refactors (rename a function across 20 files)
- Complex bug fixes that require understanding multiple files
- Documentation writing (follow-up .md docs, code comments)
- Handles the bulk (80%+) of actual code writing
- Reports back to main: "Here's what I changed, here's why, here's anything
  I wasn't sure about"

**What sonnet does NOT do:**

- Decide what to build (main decides)
- Choose between architectural approaches (main decides)
- Commit code (main commits after review)
- Overrule main's instructions
- Touch auth, security, or database schema (main handles those)

**Why Sonnet:** Sonnet is fast, capable, and significantly cheaper than Opus.
It writes clean code, follows patterns, and handles multi-file changes well.
It doesn't need to be the smartest; it needs to be reliable and efficient.

**Relationship with main:** sonnet is main's hands. main thinks; sonnet
builds. When sonnet encounters ambiguity, it asks main rather than guessing.
This prevents architectural drift and wasted work.

---

### build (Groq Llama 3.3 70B)

**Identity:** The build validator. The compiler check. Pass or fail.

**Model:** `groq/llama-3.3-70b-versatile` (Groq cloud, free)

**Workspace:** `CFv1-openclaw-build` (separate workspace to avoid conflicts)

**What build does:**

- Runs `npx tsc --noEmit --skipLibCheck` and reports the output
- Runs `npx next build --no-lint` and reports the output
- Reports PASS or FAIL with the exact error messages
- That's it. Nothing else.

**What build does NOT do:**

- Write code
- Fix errors
- Suggest fixes
- Make any decisions
- Touch files
- Run anything besides build/compile commands

**Why Groq 70B:** Build validation doesn't require intelligence. It requires
running two commands and parsing the output. Groq is free, fast (~800 tok/s),
and more than capable of reading compiler output. Using Opus or Sonnet for
this would be a waste of money.

**How it's used:** After sonnet finishes implementing a feature, main says
"build: check if this compiles." build runs the commands and reports back.
If it fails, main reads the errors and decides how to fix them (either
fixing directly or sending instructions to sonnet).

---

### qa (Groq Llama 3.3 70B)

**Identity:** Quality assurance. The tester. Find bugs, don't fix them.

**Model:** `groq/llama-3.3-70b-versatile` (Groq cloud, free)

**Workspace:** `CFv1-openclaw-qa` (separate workspace)

**What qa does:**

- Runs test suites (`npm run test`, specific test files)
- Checks for regressions (did this change break something that worked before?)
- Reviews code diffs for obvious issues (missing null checks, wrong variable
  names, security holes)
- Validates that feature behavior matches requirements
- Reports findings: "Test X failed because Y. Line Z has a potential null
  reference. The import on line W doesn't exist."

**What qa does NOT do:**

- Fix bugs
- Write code
- Write tests
- Make architectural decisions
- Approve or reject code (main makes that call)

**Why Groq 70B:** Same reasoning as build. QA is about running commands and
reading output. It doesn't need creativity or architectural understanding.
Groq is fast and free.

**How it's used:** After build passes, main may say "qa: run the test suite
and review the diff for issues." qa reports back with a list of findings.
main decides which findings matter and how to address them.

---

### runner (Groq Llama 3.1 8B)

**Identity:** The grunt. The errand runner. The fastest, cheapest, dumbest.

**Model:** `groq/llama-3.1-8b-instant` (Groq cloud, free)

**Workspace:** `CFv1-openclaw-sandbox`

**What runner does:**

- Lists files and directories
- Reads file contents
- Reads configs
- Runs simple scripts
- Checks git status, current branch, recent commits
- Copies, moves, creates files/directories
- Any simple, repetitive task that doesn't require thinking

**What runner does NOT do:**

- Think
- Decide
- Write code
- Review code
- Make any choices whatsoever

**Why Groq 8B:** runner handles the highest volume of tasks but the simplest
ones. An 8B model is perfect: it understands "list files in this directory"
and returns the output. Using a bigger model would be waste. Using a smaller
model would risk not understanding the instruction.

**Who can use runner:** Any agent. main, sonnet, build, qa can all delegate
to runner. It's a shared utility.

---

## The Fallback Chain (When Models Fail)

When a model is unavailable (API error, rate limit, credits exhausted),
OpenClaw automatically tries the next model in the chain:

```
claude/claude-opus-4-6           BEST: Smartest, most capable, most expensive
  |
  v (if Opus fails)
claude/claude-sonnet-4-6         GOOD: Fast, capable, cheaper than Opus
  |
  v (if Sonnet fails)
groq/llama-3.3-70b-versatile     DEGRADED: Free, fast, but much less capable
  |
  v (if Groq fails)
ollama/qwen3:4b                  LAST RESORT: Free, local, slowest, least capable
```

**Critical point:** When fallback activates, the agent's JOB stays the same
but the QUALITY degrades. main on Groq is still trying to orchestrate, but
it's a 70B open-source model trying to do a job designed for Opus. It will
make worse decisions, miss nuance, and produce lower-quality plans. This is
acceptable as a temporary measure (Groq rate limits clear in ~1 minute,
Anthropic outages are rare). It is NOT a long-term strategy.

**Ollama qwen3:4b is the absolute last resort.** A 4B model running at 40-60
tok/s on local GPU. It can barely follow complex instructions. If the system
falls this far, it's in survival mode. The developer should be aware that
responses will be poor quality.

**30B models are NOT in the fallback chain.** qwen3:30b and qwen3-coder:30b
are 18GB. The RTX 3050 has 6GB VRAM. These models offload to CPU RAM and run
at 12-15 tok/s. Under concurrent load from multiple OpenClaw agents, they
time out. Only qwen3:4b is safe for fallback.

---

## Concurrency Limits

- Max 2 agents running simultaneously
- Max 3 subagents per agent

These limits exist because:

1. The PC's Ollama server can only handle so much concurrent inference
2. Groq's free tier rate-limits at ~30 req/min
3. More agents = more Anthropic API spend = burn through the $50 faster

In practice, a typical flow is: main + sonnet running together, then main +
build, then main + qa. Never all 5 at once.

---

## System 2 Deep Dive: ChefFlow App AI

This is the AI that end users interact with. It has no agents, no hierarchy.
It's a routing layer that picks the right model for each task.

### The Privacy Wall (Non-Negotiable)

```
+------------------------------------------+
|           PRIVACY BOUNDARY               |
|                                          |
|  INSIDE (LOCAL_ONLY, Ollama only):       |
|   - Client names, emails, phones         |
|   - Dietary restrictions, allergies      |
|   - Financial data (quotes, invoices)    |
|   - Messages, conversations             |
|   - Contracts, staff data, pricing       |
|   - Business analytics, lead scores     |
|                                          |
|  This data NEVER leaves the PC.          |
|  If Ollama is down, features HARD FAIL.  |
|  No fallback to cloud. Ever.            |
+------------------------------------------+

+------------------------------------------+
|  OUTSIDE (CLOUD_SAFE, any provider):     |
|   - Technique lists, kitchen specs       |
|   - Campaign themes (no client names)    |
|   - Code generation, generic content     |
|   - Culinary domain knowledge            |
+------------------------------------------+
```

### Models Available (ChefFlow App)

| Provider          | Model                          | Tier     | Cost         | Speed       | Primary Use                                      |
| ----------------- | ------------------------------ | -------- | ------------ | ----------- | ------------------------------------------------ |
| **Ollama**        | qwen3:4b                       | fast     | Free (local) | 40-60 tok/s | Classification, intent parsing, quick extraction |
| **Ollama**        | qwen3-coder:30b                | standard | Free (local) | 12-15 tok/s | Structured JSON extraction from private data     |
| **Ollama**        | qwen3:30b                      | complex  | Free (local) | 12-15 tok/s | Conversational AI (Remy), prose generation       |
| **Groq**          | llama-3.1-8b-instant           | fast     | Free         | ~800 tok/s  | Fast cloud extraction for generic tasks          |
| **Groq**          | llama-3.3-70b-versatile        | standard | Free         | ~800 tok/s  | Structured output for generic tasks              |
| **Cerebras**      | llama3.1-8b                    | fast     | Free         | ~2000 tok/s | Backup fast extraction                           |
| **Cerebras**      | llama3.3-70b                   | standard | Free         | ~2000 tok/s | Backup structured output                         |
| **Cerebras**      | llama-4-scout-17b-16e          | complex  | Free         | ~2000 tok/s | Backup reasoning                                 |
| **Mistral**       | mistral-small-latest           | fast     | Free         | Cloud       | General-purpose small                            |
| **Mistral**       | mistral-medium-latest          | standard | Free         | Cloud       | General-purpose medium                           |
| **Mistral**       | mistral-large-latest           | complex  | Free         | Cloud       | General-purpose large                            |
| **Mistral**       | codestral-latest               | standard | Free         | Cloud       | Code-specialized (Codestral endpoint)            |
| **SambaNova**     | Meta-Llama-3.1-8B-Instruct     | fast     | Free         | Cloud       | Fast Llama inference                             |
| **SambaNova**     | Meta-Llama-3.3-70B-Instruct    | standard | Free         | Cloud       | Standard Llama inference                         |
| **SambaNova**     | DeepSeek-R1-Distill-Llama-70B  | complex  | Free         | Cloud       | Reasoning tasks                                  |
| **Gemini**        | gemini-2.0-flash               | standard | Paid         | Cloud       | Culinary domain content, technique lists         |
| **GitHub Models** | meta/Llama-3.1-8B-Instruct     | fast     | Free         | Cloud       | Code-adjacent tasks                              |
| **GitHub Models** | openai/gpt-4.1-mini            | standard | Free         | Cloud       | Code review, implementation                      |
| **GitHub Models** | openai/gpt-4.1                 | complex  | Free         | Cloud       | Complex code tasks                               |
| **Workers AI**    | @cf/meta/llama-3.1-8b-instruct | fast     | Free         | Edge        | Edge inference                                   |
| **OpenAI**        | gpt-4.1-nano                   | fast     | Paid         | Cloud       | Not active (available via GitHub Models)         |

### Routing Table (what model handles what)

| Task                                                  | Primary       | Fallback 1      | Fallback 2    | If all fail             |
| ----------------------------------------------------- | ------------- | --------------- | ------------- | ----------------------- |
| **Private data parsing** (allergies, PII, financials) | Ollama fast   | Ollama standard | HARD FAIL     | HARD FAIL (never cloud) |
| **Private structured extraction**                     | Ollama fast   | Ollama standard | HARD FAIL     | HARD FAIL (never cloud) |
| **Generic structured extraction**                     | Groq          | Cerebras        | SambaNova     | Ask developer           |
| **Code writing**                                      | Codestral     | GitHub Models   | Groq          | Ask developer           |
| **Code review**                                       | GitHub Models | Mistral         | Groq          | Ask developer           |
| **Research/exploration**                              | Groq          | Cerebras        | GitHub Models | Ask developer           |
| **Culinary content generation**                       | Gemini        | Mistral         | Groq          | Ask developer           |
| **Code/docs generation**                              | Codestral     | GitHub Models   | Groq          | Ask developer           |
| **Deterministic** (math, regex)                       | No LLM        | N/A             | N/A           | Ask developer           |
| **Escalation** (ambiguous)                            | Groq          | Cerebras        | N/A           | Ask developer           |
| **Orchestration** (routing)                           | Groq          | Cerebras        | N/A           | Ask developer           |

### Strict Job Definitions (ChefFlow App Models)

**qwen3:4b (Ollama, local) - The Classifier**

- Classification and intent parsing for Remy
- Quick structured extraction from private data (small payloads)
- Remy's streaming intent detection
- MUST be the default for any task that touches private data and needs speed
- Think of it as the triage nurse: it reads the incoming request and decides
  what kind of task it is, fast

**qwen3-coder:30b (Ollama, local) - The Private Data Extractor**

- Primary model for all private data structured extraction
- Recipe parsing, brain dump parsing, client data extraction
- Any task that needs structured JSON from private content
- Fallback for qwen3:4b when it can't handle complexity
- Slower (12-15 tok/s) but more accurate on complex extraction

**qwen3:30b (Ollama, local) - The Voice of Remy**

- Remy conversational responses (the personality, the tone, the warmth)
- Chef bio generation, contract text generation
- Any private task that needs prose/natural language output
- Campaign personalized outreach (touches client names/history)
- This is Remy's brain. When a chef talks to Remy, this model is thinking

**Groq llama-3.3-70b-versatile (cloud, free) - The Cloud Workhorse**

- Primary for ALL non-private structured tasks
- Campaign concept drafting (generic themes, no client data)
- Technique lists, kitchen spec suggestions
- Any cloud-safe extraction that needs reliability
- The default "send it to the cloud" model

**Groq llama-3.1-8b-instant (cloud, free) - The Quick Decider**

- Fast classification for cloud-safe tasks
- Simple yes/no decisions, category assignments
- Lightweight extraction from generic content

**Codestral (cloud, free) - The Code Writer**

- All code writing and modification tasks
- Code generation for docs/templates
- Primary for IMPLEMENTATION and PUBLIC_GENERATE_CODE
- Mistral's code-specialized model; better at code than general Mistral

**GitHub Models gpt-4.1-mini (cloud, free) - The Code Reviewer**

- Code review and evaluation
- Secondary for code implementation
- Architecture analysis

**Gemini gemini-2.0-flash (cloud, paid) - The Culinary Expert**

- Culinary domain content (technique lists, kitchen specs)
- Food-adjacent content generation
- Primary for PUBLIC_GENERATE_FOOD only
- The only paid cloud model in regular use

**Cerebras, SambaNova, Mistral, Workers AI - The Insurance Policies**

- Backup/fallback providers
- Step in when primary providers are rate-limited or down
- Never primary for any task
- They're insurance, not first-string

---

## How All Three Systems Connect

```
                        DEVELOPER (David)
                            |
              +-------------+-------------+
              |                           |
         CLAUDE CODE                 OPENCLAW
         (VS Code, PC)              (Pi dashboard)
         Lead engineer              Autonomous team
         Rank 1                     Rank 2
              |                           |
              |                     +-----+------+
              |                     |            |
              |                   main         (4 sub-agents)
              |                  (Opus)        sonnet, build,
              |                     |          qa, runner
              |                     |
         CHEFFLOW APP AI            |
         (Next.js runtime)          |
              |                     |
         +----+----+          +-----+-----+
         |         |          |           |
       Ollama    Cloud      Claude      Groq
       (local)   providers  (API key)   (free)
         |                     |
         +--------shared-------+
                  Ollama
             (PC GPU, LAN)
```

### Communication Between Systems

| From        | To          | How                                    | When                             |
| ----------- | ----------- | -------------------------------------- | -------------------------------- |
| Developer   | Claude Code | VS Code chat (this conversation)       | Primary development work         |
| Developer   | OpenClaw    | OpenClaw web dashboard                 | Delegated tasks, autonomous work |
| Claude Code | OpenClaw    | SSH to Pi (read logs, restart, config) | Debugging, maintenance           |
| OpenClaw    | Claude Code | NEVER (no direct communication)        | N/A                              |
| ChefFlow AI | OpenClaw    | NEVER (completely separate)            | N/A                              |
| ChefFlow AI | Claude Code | NEVER (runtime vs development)         | N/A                              |

### What Each System Costs

| System       | Component                          | Cost                                | Who pays          |
| ------------ | ---------------------------------- | ----------------------------------- | ----------------- |
| Claude Code  | Anthropic subscription             | Monthly plan                        | Developer (OAuth) |
| OpenClaw     | Opus/Sonnet via API                | $50 prepaid credits (loaded Mar 13) | Developer (API)   |
| OpenClaw     | Groq agents (build, qa, runner)    | Free (rate-limited)                 | Nobody            |
| OpenClaw     | Ollama fallback                    | Free (PC GPU electricity)           | Nobody            |
| ChefFlow App | Ollama (all private tasks)         | Free (PC GPU electricity)           | Nobody            |
| ChefFlow App | Groq, Cerebras, SambaNova, Mistral | Free (rate-limited)                 | Nobody            |
| ChefFlow App | Gemini                             | Paid (Google, small usage)          | Developer         |
| ChefFlow App | GitHub Models                      | Free                                | Nobody            |

**Billing is completely separate between Claude Code and OpenClaw.**
Claude Code uses the developer's Anthropic subscription (OAuth, monthly).
OpenClaw uses a separate API key with prepaid credits. They never share
billing. Running Claude Code does not spend OpenClaw's $50, and vice versa.

---

## OpenClaw Infrastructure

### Hardware

```
Raspberry Pi (10.0.0.177)
  - OpenClaw v2026.3.12
  - Service: openclaw-chefflow.service (systemd, auto-restart)
  - User: openclawcf (isolated, hardened, dedicated system user)
  - Gateway: ws://127.0.0.1:18789
  - Browser control: http://127.0.0.1:18791/ (auth=token)
  - Profile: --profile chefflow (uses .openclaw-chefflow/ dir)
  - Config: /home/openclawcf/.openclaw-chefflow/openclaw.json
  - Always on, auto-restarts on failure

Developer PC (10.0.0.153)
  - Ollama v0.17.0 (bound to 0.0.0.0:11434, OLLAMA_ORIGINS=*)
  - GPU: RTX 3050 (6GB VRAM, CUDA 8.6)
  - Serves inference to Pi over LAN
  - Also serves ChefFlow App AI (Remy, etc.)
```

### Providers Configured in OpenClaw

| Provider      | Name in Config | API                  | Models                  | Cost                   |
| ------------- | -------------- | -------------------- | ----------------------- | ---------------------- |
| **Anthropic** | `claude`       | `anthropic-messages` | Opus 4.6, Sonnet 4.6    | Paid ($50 API credits) |
| **Groq**      | `groq`         | `openai-completions` | Llama 3.3 70B, Llama 8B | Free                   |
| **Ollama**    | `ollama`       | `ollama`             | qwen3:4b + others       | Free (local)           |

### Agent-to-Model Mapping

| Agent ID   | Model                        | Provider | Workspace             |
| ---------- | ---------------------------- | -------- | --------------------- |
| **main**   | claude/claude-opus-4-6       | claude   | CFv1-openclaw-sandbox |
| **sonnet** | claude/claude-sonnet-4-6     | claude   | CFv1-openclaw-sandbox |
| **build**  | groq/llama-3.3-70b-versatile | groq     | CFv1-openclaw-build   |
| **qa**     | groq/llama-3.3-70b-versatile | groq     | CFv1-openclaw-qa      |
| **runner** | groq/llama-3.1-8b-instant    | groq     | CFv1-openclaw-sandbox |

---

## Known Issues and Workarounds

### OpenClaw v2026.3.12 Anthropic Provider Bug

The `normalizeAnthropicModelId` function crashes when parsing config if a
provider is named `anthropic`. This was discovered during this session when
adding Haiku to the model list triggered `ReferenceError: Cannot access
'ANTHROPIC_MODEL_ALIASES' before initialization`.

**Root cause:** A circular reference or initialization order bug in OpenClaw's
model ID normalizer. Triggered specifically when:

1. A provider is named `anthropic` (the auto-detection path), OR
2. The model `claude-haiku-4-5-20251001` is in the model list

**Workaround:** Name the provider `claude` instead of `anthropic`. This
bypasses the buggy `normalizeAnthropicModelId` code path entirely. The API
still works because `api: "anthropic-messages"` is set explicitly.

**Side effect of the workaround:** When the provider is not named `anthropic`,
OpenClaw doesn't auto-resolve environment variables. So instead of
`"apiKey": "ANTHROPIC_API_KEY"` (which would resolve to `$ANTHROPIC_API_KEY`),
the actual API key must be embedded directly in the config JSON.

**Do NOT:**

- Rename the provider back to `anthropic`
- Add `claude-haiku-4-5-20251001` to the model list
- Set `lastTouchedVersion` higher than the installed version

**Do:**

- Keep provider named `claude`
- Only use `claude-opus-4-6` and `claude-sonnet-4-6` model IDs
- Embed the actual API key in the config (not an env var reference)
- Check `openclaw --version` before making any config changes

### Ollama 30B Model Limitation

qwen3:30b and qwen3-coder:30b are 18GB models. The RTX 3050 has 6GB VRAM.
These models offload to CPU RAM and run at 12-15 tok/s. Under concurrent load
from multiple OpenClaw agents, they will time out. Only qwen3:4b should be
used as an OpenClaw fallback.

### Groq Rate Limits

Free tier: ~30 requests/minute, ~14,400/day. OpenClaw's build and QA agents
can hit this during intensive work. When rate-limited, the fallback chain
drops to Ollama qwen3:4b. Rate limits clear after ~1 minute.

### Port Conflict on Pi

Two gateway services exist:

- `openclaw-chefflow.service` (system, `openclawcf` user) - THE ONE TO USE
- `openclaw-gateway.service` (user, `davidferra` user) - DISABLED

If gateway crashes with "port already in use": `sudo ss -tlnp | grep 18789`

---

## SSH Quick Reference

```bash
# Check service status
ssh pi "sudo systemctl status openclaw-chefflow.service --no-pager"

# View logs (last 20 lines)
ssh pi "sudo journalctl -u openclaw-chefflow.service -n 20 --no-pager"

# Restart the service
ssh pi "sudo systemctl restart openclaw-chefflow.service"

# Read config file
ssh pi "sudo -u openclawcf cat /home/openclawcf/.openclaw-chefflow/openclaw.json"

# Check OpenClaw version
ssh pi 'sudo -u openclawcf env HOME=/home/openclawcf PATH=/home/openclawcf/.npm-global/bin:/usr/bin:/bin openclaw --version'

# Check for errors since last restart
ssh pi "sudo journalctl -u openclaw-chefflow.service --no-pager | grep -i error"

# Test Anthropic API key directly
ssh pi 'curl -s https://api.anthropic.com/v1/models -H "x-api-key: YOUR_KEY" -H "anthropic-version: 2023-06-01" | grep id'
```

---

## What We Fixed in This Session (Mar 13, 2026)

For the record, here's exactly what happened and what was changed:

1. **Next.js build was broken** because 8 AI parser files (`parse-groq.ts`,
   `parse-gemini.ts`, `parse-github-models.ts`, `parse-workers-ai.ts`,
   `parse-cerebras.ts`, `parse-mistral.ts`, `parse-sambanova.ts`,
   `parse-openai.ts`) exported error classes from `'use server'` files.
   Next.js doesn't allow class exports from server action files.
   **Fix:** Created `lib/ai/provider-errors.ts` with all error classes and
   interfaces extracted. All 8 parsers now import from there.

2. **OpenClaw gateway was crashing** with `ReferenceError: Cannot access
'ANTHROPIC_MODEL_ALIASES' before initialization`. This was caused by
   adding `claude-haiku-4-5-20251001` to the config.
   **Fix:** Removed Haiku. Renamed provider from `anthropic` to `claude`.
   Embedded actual API key in config (env var resolution doesn't work when
   provider isn't named `anthropic`).

3. **Anthropic API key was returning "credit balance too low"** despite $49.76
   showing in billing.
   **Fix:** Propagation delay. The $50 credit grant took time to activate.
   Confirmed working after ~30 minutes. API key now successfully calls both
   Opus and Sonnet.

4. **Created this document** to be the definitive reference for how all AI
   systems in ChefFlow work together, who reports to who, and what every
   model's job is.
