# Spec: Chef Collab Spaces

> **Status:** verified
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** large (9+ files)
> **Created:** 2026-03-31
> **Built by:** Claude Opus 4.6 session 2026-03-31

---

## What This Does (Plain English)

Adds a chef-only collaboration workspace inside `Network > Collab` for ongoing private coordination with other chefs. A chef can have a canonical persistent direct space with another chef, create additional named private workspaces with one or more chefs, create default and custom threads inside those spaces, and use them as the persistent home for lead swaps, backup coverage discussions, recurring work-sharing, debriefs, references, and operational coordination. This is explicitly **not** a Dinner Circle. Dinner Circles stay dinner/client/guest facing. Chef Collab Spaces live under the chef network and are invite-only, chef-only, auth-gated workspaces.

---

## Why It Matters

The product already has structured handoffs, trusted-circle relationships, and chef network connections, but it does **not** have a persistent, organized chef-to-chef discussion layer. Today that ongoing coordination falls back to text messages or a dormant flat DM table. This spec fills that gap without corrupting the existing Dinner Circle concept or reusing the chef-client chat system.

---

## INTENT SOURCE / ORIGIN CONTEXT

This section is permanent. It exists so the builder understands what was said, what was meant, and why this feature exists.

### A. Clean Structured Transcript

1. The developer described `Dinner Circle` as an existing core product concept: a persistent dinner control surface that eliminates scattered texting, group chats, and email for an actual dinner.
2. The developer asked for the project agent to fully understand what a Dinner Circle is before extending it, and asked for a planner-first, spec-only treatment.
3. The developer then introduced a second real-world workflow: ongoing collaboration with another trusted chef who regularly exchanges work, availability checks, referrals, and handoffs.
4. The real examples included:
   - passing off dinners that have barely started and are not yet priced
   - passing off fully established dinners with guest communication and payment context
   - texting another chef to ask whether they can cover a specific dinner by date, headcount, minimum price, location, and time
   - asking follow-up questions like `did the client get back to you`, `how did that handoff go`, `how did that dinner go`, `do you have photos`, or `what did you say`
5. The developer questioned whether those chef-only interactions should be called a `Dinner Circle`, and explicitly suspected the answer was no because the conversation often stays private between chefs and is not always appropriate for clients or guests.
6. The developer described the desired feel as a private, persistent, Discord-like workspace where two or more chefs can organize collaboration into distinct threads instead of relying on one long message stream.
7. The developer then raised a broader product goal: stop relying on text messages, email chains, Google Docs, random screenshots, and external tools for chef-to-chef coordination.
8. The developer asked for the planner to read `docs/app-complete-audit.md` first, summarize the current state before writing the spec, and follow the planner gate in `CLAUDE.md`.
9. The developer insisted this thread stay spec-only, never build runtime behavior here, and queue the final spec for builders.
10. The developer then asked that the origin of the work be permanently preserved inside the spec itself:
    - clean transcript
    - valid signal extraction
    - developer-intent translation
    - requirements, constraints, and behaviors
    - missing or underdeveloped pieces identified and resolved
11. The developer clarified that the immediate problem is bigger than one handoff:
    - there needs to be a chef-only hub where recurring trusted collaborators can keep context over time
    - there also needs to be a clean way to meet new chefs, form relationships, and then graduate those relationships into more persistent spaces
12. The developer described a common handoff pattern where Chef A introduces Chef B to the client in a three-person thread, then one or more parties may leave or stay depending on the relationship.
13. The developer clarified that all of these containers are private by default, and that `public` can only happen through explicit opt-in by all relevant participants.
14. The developer also clarified a stronger platform rule: every real dinner should have a Dinner Circle, and all meaningful communication on the site should happen inside an explicit container rather than as free-floating messages.
15. The developer clarified that chef-only `Private Spaces` can be:
    - solo
    - direct with one other chef
    - group spaces with multiple chefs
    - persistent forever
    - duplicated intentionally as multiple named spaces with the same chef(s) when the user wants separate contexts
16. The developer asked for default threads inside Private Spaces, not just user-created custom threads, and gave examples like prospecting leads and travel planning.
17. The developer clarified that handoff flows need multiple outcomes, not one hard-coded path:
    - full sever / complete transfer
    - soft involvement / observer posture
    - continued shared involvement
    - any other outcome that fits the relationship
18. The developer required both a curated summary and a full raw version of handoff context. The curated summary is the low-friction entry point; the raw record must still exist underneath it.
19. The developer required import/export flexibility as a product direction: anything a chef can already do in the portal, and more future assets, should be transferable between collaborating chefs over time.
20. The developer explicitly called out quality-of-life requirements around timestamps, day separators, feed clarity, and exhaustive tracking so nothing gets lost when many containers are active at once.
21. The developer asked that no nuance be lost and that every meaningful point be addressed thoroughly before a builder ever sees the queued spec.

### B. Valid Signal Extraction

Only the durable signal is preserved here.

#### Intent

- Preserve Dinner Circle as the canonical dinner-facing container while formalizing chef-only collaboration as a separate first-class system.
- Give chefs a persistent private operating space for recurring trusted relationships, not just one-off chat.
- Support both lightweight conversation and structured collaboration moments like intros, handoffs, debriefs, and follow-up.
- Keep communication container-based and organized by thread/topic rather than letting it drift into flat, free-floating message streams.
- Replace fragmented off-platform behavior with a ChefFlow-native collaboration surface over time.

#### Decisions

- `Dinner Circle` remains dinner/client/guest facing and should not be overloaded for chef-only collaboration.
- Chef-only collaboration should live under the chef network / collab area.
- Existing `chef_handoffs` infrastructure remains first-class and should be complemented, not replaced.
- Private chef collaboration requires a space + thread model, not only flat DM.
- Every meaningful interaction should route through an explicit container.
- Everything is private by default; any future public visibility must be deliberate and unanimous.
- The spec itself must permanently preserve origin context so builders understand why the system exists.

#### Constraints

- Spec-only in this planning thread. No runtime build work here.
- Must preserve reasoning, not only outcomes.
- Builder must understand why the feature exists, not just the mechanical work list.
- Existing Dinner Circle, chat, and handoff systems must not be redefined accidentally.
- The spec must distinguish verified current-state facts from new product decisions.

### C. Developer Intent Layer

What the developer was actually trying to achieve beneath the surface wording:

1. **Protect the Dinner Circle concept from misuse.**
   The developer already has strong product language for Dinner Circles and does not want that concept diluted by applying it to chef-only backchannel collaboration.

2. **Make recurring chef relationships first-class product objects.**
   The real workflow is not one-off messaging. It is repeated collaboration between trusted chefs who exchange overflow work, backup coverage, referrals, full event handoffs, operational advice, and post-event debriefs.

3. **Preserve continuity across many dinners without flattening everything into one place.**
   The developer wants long-lived chef collaboration, but still wants separate containers for separate dinner/client contexts. Persistent relationships and dinner-scoped coordination both matter.

4. **Unify informal collaboration and formal transfer workflows.**
   Some moments are simple availability checks. Some are full structured transfers. The system needs everyday conversational context plus explicit bridges into handoff, intro, and dinner workflows.

5. **Keep communication container-first.**
   The developer does not want random, contextless messages. Communication should happen inside a Dinner Circle, Private Space, Introduction Bridge, or other explicit container. Any inbox/feed view is a routing layer over those containers.

6. **Default to privacy, then allow controlled sharing.**
   The developer wants strong privacy by default because chef-only spaces contain strategy, pricing, marketing talk, and internal execution details. Public visibility is an exception, not a baseline.

7. **Provide intelligent defaults without forcing one workflow.**
   The developer repeatedly asked for defaults plus options. The system should bias toward the common best path, but it should not hard-code one irreversible handoff or collaboration outcome.

8. **Create a durable chef operating system, not just another chat surface.**
   The underlying goal is to replace text messages, email, and loose documents with one product-native place that can eventually hold everything chefs need to share, reference, and track.

### D. Missing Pieces Identified + Resolved

These are the places where the developer's intent was implicit and is now made explicit for builders.

| Missing / Underdeveloped Point                             | Resolution in This Spec                                                                                                                                                                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Is this a Dinner Circle?                                   | No. `Dinner Circle` remains chef + guest/client. Chef-only collaboration becomes `Private Spaces` under `Network > Collab`.                                                                                                          |
| Are Dinner Circles optional for real dinners?              | No. The intended platform rule is that every real dinner gets a Dinner Circle. This spec preserves that rule instead of weakening it.                                                                                                |
| Is this just DM?                                           | No. V1 must include a **space + thread** model, not a flat one-thread inbox.                                                                                                                                                         |
| Does it replace structured handoffs?                       | No. Existing `chef_handoffs` remains the structured transfer system. Spaces are the persistent conversational layer around it.                                                                                                       |
| Does it need 1:1 only or groups too?                       | Both, plus solo named workspaces. V1 supports canonical direct spaces plus named private workspaces with one or more chefs.                                                                                                          |
| Is there only one space allowed per chef pair?             | No. V1 keeps one canonical direct space per pair and also allows additional named workspaces with the same chef(s) when the user wants separate contexts.                                                                            |
| Does communication happen outside a container?             | No. The product direction is container-first. Inbox views may aggregate activity, but the underlying messages belong to explicit containers.                                                                                         |
| Is there only one handoff outcome?                         | No. The broader system needs multiple handoff outcomes with a preferred default. This file preserves that requirement and does not collapse the workflow to one path.                                                                |
| Does a curated summary replace the raw record?             | No. Curated summary and full raw context are both required. Raw is the source of truth; curated is the lightweight entry point.                                                                                                      |
| Can a Private Space include clients or guest links?        | No. Private Spaces are chef-only. Mixed-party intros and dinners belong in separate containers.                                                                                                                                      |
| Does it need to be public/community-wide?                  | No. It is private by default and limited to authenticated chefs. Any future public/discoverable layer is explicit opt-in and outside this file's implementation scope.                                                               |
| Does it need lockability and membership control?           | Yes in the product model. This file stores lock intent and keeps membership static in V1 so later governance features can build on it safely.                                                                                        |
| Does it need starter organization, not just blank threads? | Yes. Every new space/workspace gets default starter threads plus unlimited custom topics.                                                                                                                                            |
| Does it need to be a full Discord clone?                   | No. V1 is the smallest complete chef-collab slice: private spaces, starter/custom threads, timestamps, text messages, and handoff references. Rich asset transfer, public surfaces, and advanced governance stay as follow-up specs. |
| How does it relate to handoffs?                            | Each space thread can create a handoff reference by launching the existing collab handoff flow with recipients preselected, then posting a `handoff_reference` message back into the originating thread.                             |

### E. Execution Translation

#### Requirements

- Add chef-only private spaces under `Network > Collab`.
- Support one canonical direct space per accepted chef pair.
- Support additional named private workspaces with one or more chefs, including solo workspaces.
- Support starter threads and custom topic threads inside each space.
- Support persistent text discussion inside each thread.
- Render clear timestamps and day separators inside thread history.
- Support linking existing structured handoffs back into a thread.
- Keep all communication rooted in explicit containers.
- Keep Dinner Circle naming and architecture untouched.

#### Constraints

- Use chef auth and chef identity only.
- Do not use `hub_groups`, `hub_guest_profiles`, `conversations`, or `community_messages`.
- Use accepted network connections as the creation gate whenever another chef is being added. Solo named workspaces are allowed without a second chef.
- Keep the first build focused and additive, but do not erase required future directions from the spec.
- Preserve default-private behavior. Do not invent public sharing here.

#### Behaviors

- Creating a direct space with the same chef pair twice returns the existing space.
- Creating a named workspace with the same chef pair is allowed and does **not** collapse into the canonical direct space.
- Creating a new space/workspace auto-creates starter threads: `General`, `Leads`, `Handoffs`, `Travel`, and `References`.
- Creating a new custom topic thread adds a separate persistent context inside the same space.
- Sending a message updates thread and space previews.
- Launching a handoff from a space thread preselects the other space members as recipients when they exist and writes a handoff reference back into that thread on success.
- Solo workspaces can still launch the handoff flow, but without seeded recipients.

### F. Working Taxonomy

This is the system model this spec is written against.

1. **Dinner Circle**
   - The canonical private container for a dinner, inquiry-to-event lifecycle, or client/guest dinner context.
   - Default private.
   - Can include actual account holders and guest/token participants.
   - The developer's stated product rule is that every real dinner should have one.

2. **Private Space**
   - The canonical private container for ongoing chef-to-chef collaboration.
   - Persistent across many dinners.
   - Relationship-scoped, not dinner-scoped.
   - Chef-only, auth-gated, no guest-token access.

3. **Canonical Direct Space**
   - A subtype of Private Space.
   - Exactly one active direct space per accepted chef pair.
   - Auto-created or returned when a chef starts the simplest ongoing 1:1 collaboration with another chef.

4. **Named Workspace**
   - A subtype of Private Space.
   - Can be solo or multi-chef.
   - Can coexist alongside a canonical direct space with the same chef(s).
   - Used when the user wants a named, intentional, separate context instead of collapsing everything into the default direct space.

5. **Structured Handoff**
   - A transfer object, not the place conversation lives.
   - Used for lead swaps, backup coverage, and client referrals.
   - Can be created from a Private Space thread and linked back into it.

6. **Introduction Bridge**
   - A temporary three-party introduction surface when Chef A introduces Chef B to the client.
   - This is a real workflow described by the developer.
   - It is not built in this spec, but it is the next adjacent missing system after Private Spaces.

7. **Container Feed / Inbox Layer**
   - An aggregation surface, not the source-of-truth container.
   - Lets users see recent activity across many Dinner Circles and Private Spaces without changing the rule that messages belong to explicit containers.

8. **Public Opt-In Layer**
   - Any public version of a circle or group is future-only and must be explicit opt-in.
   - Nothing becomes public by default.

### G. Product Survey With Recommended Defaults

These are the next questions to answer with the developer. Recommended defaults are included so a planner or builder understands the intended direction.

| Question                                                                                                         | Recommended Default                                                        | Why                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Should every real dinner have a Dinner Circle?                                                                   | Yes                                                                        | Matches the developer's explicit platform rule and current inquiry-circle flow.                              |
| Should a chef-to-chef workspace be called a Dinner Circle?                                                       | No                                                                         | It creates taxonomy drift because Dinner Circle already means dinner/client/guest context.                   |
| Should communication live inside explicit containers?                                                            | Yes                                                                        | This is the developer's stated infrastructure rule and prevents contextless messaging sprawl.                |
| Should two chefs share one persistent space or create a new chat per opportunity?                                | Both: one canonical direct space plus optional named workspaces            | Preserves continuity while still allowing intentionally separated contexts.                                  |
| Should chef workspaces support only 1:1?                                                                         | No                                                                         | The developer explicitly wants solo, direct, and multi-chef spaces.                                          |
| Should every new Private Space start blank?                                                                      | No                                                                         | Starter threads reduce setup friction and reflect recurring real-world categories immediately.               |
| Should a handoff replace the space?                                                                              | No                                                                         | The space is ongoing context; the handoff is the formal transfer object.                                     |
| When Chef A introduces Chef B to a client, should that live in the same chef-only space?                         | No                                                                         | That requires a temporary mixed-party surface. This is the missing `Introduction Bridge` workflow.           |
| After the introduction is made, where should the ongoing dinner communication live?                              | In the Dinner Circle for that dinner                                       | This matches the developer's statement that every dinner should have a Dinner Circle.                        |
| Should there be one hard-coded handoff outcome?                                                                  | No                                                                         | The developer explicitly wants multiple outcomes, with a preferred default rather than a forced single path. |
| What should the product-preferred handoff default be?                                                            | Shared until acknowledged, then prompt for sever / observe / stay involved | This is the safest default because it supports clean transfer without prematurely dropping context.          |
| Should guests without accounts still participate in dinner contexts?                                             | Yes                                                                        | This already matches the token-based hub model and the developer's expectation.                              |
| Should guests without accounts participate in chef-only spaces?                                                  | No                                                                         | Chef-only spaces are auth-gated workspaces between chefs.                                                    |
| Should chefs be able to keep photos, notes, pricing context, and outcome follow-up attached to the relationship? | Yes                                                                        | The developer explicitly wants one place for "how did it go", photos, advice, and debrief.                   |
| Should the handoff system expose both curated summary and raw source context?                                    | Yes                                                                        | The curated summary reduces overwhelm; the raw layer preserves completeness and auditability.                |
| Should full client communication history automatically pass to another chef?                                     | No automatic silent transfer                                               | Context transfer needs an explicit handoff-packet design so privacy and scope remain deliberate.             |
| Should there be an aggregate feed over many containers?                                                          | Yes: separate container feeds plus an `All` view                           | This fits the developer's desire for a usable messaging layer without breaking container-first architecture. |
| Should tracking be exhaustive by default?                                                                        | Yes, with toggles                                                          | The developer explicitly wants nothing lost, but also wants users able to dial complexity up or down.        |
| Should anything be public by default?                                                                            | No                                                                         | The developer explicitly said all these circles/hubs are inherently private unless everyone opts public.     |
| What should `public` mean first if it exists later?                                                              | Chef-visible directory surface, not open public browsing                   | This best matches the developer's description and avoids exposing private collaboration to unrelated users.  |

### H. Adjacent Missing Systems

This spec solves the persistent chef-only space. It does **not** solve the full collaboration stack by itself. The next missing systems, based on the developer transcript, are:

1. **Introduction Bridge spec**
   - Chef A introduces Chef B to client in a temporary three-party thread.
   - Chef A can gracefully exit after handoff is acknowledged.
   - Chef B + client continue in the canonical Dinner Circle.

2. **Handoff Packet spec**
   - Controlled transfer bundle for client contact, pricing context, inquiry summary, relevant media, communication snapshot, curated summary, and raw source context.
   - Prevents texting random screenshots, Google Docs, and ledger fragments.

3. **Universal Transfer Bus spec**
   - Defines how chefs export/import current and future portal assets to one another.
   - Covers menus, recipes, receipts, ledgers, market listings, recommended grocery lists, notes, media, and future transferable records.

4. **Unified Container Inbox + Timeline QoL spec**
   - Defines the aggregated `All` feed, per-container feeds, timestamp/day-separator rules, and message clustering behavior across the wider product.

5. **Dinner Circle Governance spec**
   - Covers client naming, group roles, co-host/admin controls, visibility, and unanimous public opt-in rules for Dinner Circles.

6. **Post-Handoff Debrief spec**
   - Structured way for chefs to ask "how did that go", share photos, close the loop, and learn from one another after the dinner.

These are outside the implementation scope of this file, but they are directly implied by the developer's intent and should be treated as follow-up planning targets.

---

## Files to Create

| File                                                         | Purpose                                                                                                                                          |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `database/migrations/20260401000145_chef_collab_spaces.sql`  | Add chef-only spaces, members, threads, and messages tables with RLS and indexes.                                                                |
| `lib/network/collab-space-actions.ts`                        | Chef-auth server actions for listing spaces, creating spaces, creating threads, sending messages, unread counts, and posting handoff references. |
| `app/(chef)/network/collabs/[spaceId]/page.tsx`              | Server page for a single collab space. Loads members, threads, active thread, and messages.                                                      |
| `app/(chef)/network/collabs/[spaceId]/space-view-client.tsx` | Client shell for thread switching, thread creation, message composer, and handoff launch action.                                                 |
| `app/(chef)/network/collabs/create-space-dialog.tsx`         | Reusable dialog for creating canonical direct spaces and named workspaces from accepted connections.                                             |

---

## Files to Modify

| File                                  | What to Change                                                                                                                                                                                                                                           |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(chef)/network/page.tsx`         | In the `collab` tab, add a `Private Spaces` section beneath the existing handoff UI. Fetch space previews and include space unread count in the collab badge total. Accept optional query params for seeded handoff creation coming from a collab space. |
| `app/(chef)/network/collabs/page.tsx` | Replace the current redirect with a real spaces index page listing existing spaces and exposing creation entry points.                                                                                                                                   |
| `app/(chef)/network/collab-inbox.tsx` | Accept optional seeded recipient IDs, `spaceId`, and `threadId` from the collab-space handoff launch flow. After successful handoff creation, optionally call `attachHandoffReferenceToThread()` and show a return link back to the space.               |
| `lib/db/migrations/schema.ts`         | Auto-generated after migration. Include the new collab-space tables in generated schema output.                                                                                                                                                          |
| `docs/app-complete-audit.md`          | Builder updates the Network & Community and route inventory sections after UI is built.                                                                                                                                                                  |

---

## Database Changes

### New Tables

```sql
-- ============================================================
-- Chef Collab Spaces
-- Private chef-only workspaces for ongoing collaboration.
-- Additive to existing chef_connections + chef_handoffs systems.
-- ============================================================

CREATE TABLE IF NOT EXISTS chef_collab_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  space_type TEXT NOT NULL
    CHECK (space_type IN ('direct', 'workspace')),
  name TEXT,
  description TEXT,
  direct_pair_key TEXT,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chef_collab_spaces_workspace_name_check CHECK (
    (space_type = 'workspace' AND name IS NOT NULL AND char_length(trim(name)) BETWEEN 1 AND 120)
    OR (space_type = 'direct' AND name IS NULL)
  ),
  CONSTRAINT chef_collab_spaces_direct_pair_check CHECK (
    (space_type = 'direct' AND direct_pair_key IS NOT NULL)
    OR (space_type = 'workspace' AND direct_pair_key IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chef_collab_spaces_direct_pair
  ON chef_collab_spaces(direct_pair_key)
  WHERE space_type = 'direct' AND is_archived = FALSE;

CREATE INDEX IF NOT EXISTS idx_chef_collab_spaces_last_message
  ON chef_collab_spaces(last_message_at DESC NULLS LAST, created_at DESC);

COMMENT ON TABLE chef_collab_spaces IS
  'Private chef-only workspaces used for recurring collaboration outside of client Dinner Circles.';

CREATE TABLE IF NOT EXISTS chef_collab_space_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES chef_collab_spaces(id) ON DELETE CASCADE,
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'member')),
  notifications_muted BOOLEAN NOT NULL DEFAULT FALSE,
  last_read_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chef_collab_space_members_unique UNIQUE (space_id, chef_id)
);

CREATE INDEX IF NOT EXISTS idx_chef_collab_space_members_space
  ON chef_collab_space_members(space_id, joined_at ASC);

CREATE INDEX IF NOT EXISTS idx_chef_collab_space_members_chef
  ON chef_collab_space_members(chef_id, joined_at DESC);

COMMENT ON TABLE chef_collab_space_members IS
  'Chef membership for private collab spaces. No clients or guest profiles allowed.';

CREATE TABLE IF NOT EXISTS chef_collab_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES chef_collab_spaces(id) ON DELETE CASCADE,
  created_by_chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  thread_type TEXT NOT NULL DEFAULT 'topic'
    CHECK (thread_type IN ('general', 'starter', 'topic')),
  starter_key TEXT
    CHECK (starter_key IS NULL OR starter_key IN ('general', 'leads', 'handoffs', 'travel', 'references')),
  title TEXT NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 120),
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chef_collab_threads_unique_title_per_space UNIQUE (space_id, title)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chef_collab_threads_one_general
  ON chef_collab_threads(space_id)
  WHERE thread_type = 'general';

CREATE UNIQUE INDEX IF NOT EXISTS idx_chef_collab_threads_starter_key
  ON chef_collab_threads(space_id, starter_key)
  WHERE starter_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chef_collab_threads_space_activity
  ON chef_collab_threads(space_id, last_message_at DESC NULLS LAST, created_at ASC);

COMMENT ON TABLE chef_collab_threads IS
  'Threads inside a private collab space. Each space gets starter threads plus unlimited custom topics.';

CREATE TABLE IF NOT EXISTS chef_collab_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES chef_collab_threads(id) ON DELETE CASCADE,
  sender_chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL DEFAULT 'text'
    CHECK (message_type IN ('text', 'system', 'handoff_reference')),
  body TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chef_collab_messages_content_check CHECK (
    (message_type = 'text' AND body IS NOT NULL AND char_length(trim(body)) BETWEEN 1 AND 5000)
    OR (message_type IN ('system', 'handoff_reference'))
  )
);

CREATE INDEX IF NOT EXISTS idx_chef_collab_messages_thread
  ON chef_collab_messages(thread_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_chef_collab_messages_sender
  ON chef_collab_messages(sender_chef_id, created_at DESC);

COMMENT ON TABLE chef_collab_messages IS
  'Messages inside chef collab threads. Supports text, system events, and handoff reference cards.';

DROP TRIGGER IF EXISTS trg_chef_collab_spaces_updated_at ON chef_collab_spaces;
CREATE TRIGGER trg_chef_collab_spaces_updated_at
  BEFORE UPDATE ON chef_collab_spaces
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_chef_collab_threads_updated_at ON chef_collab_threads;
CREATE TRIGGER trg_chef_collab_threads_updated_at
  BEFORE UPDATE ON chef_collab_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE chef_collab_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_collab_space_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_collab_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_collab_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chef_collab_spaces_select ON chef_collab_spaces;
CREATE POLICY chef_collab_spaces_select ON chef_collab_spaces
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT space_id
      FROM chef_collab_space_members
      WHERE chef_id = get_current_tenant_id()
    )
  );

DROP POLICY IF EXISTS chef_collab_spaces_insert ON chef_collab_spaces;
CREATE POLICY chef_collab_spaces_insert ON chef_collab_spaces
  FOR INSERT TO authenticated
  WITH CHECK (created_by_chef_id = get_current_tenant_id());

DROP POLICY IF EXISTS chef_collab_space_members_select ON chef_collab_space_members;
CREATE POLICY chef_collab_space_members_select ON chef_collab_space_members
  FOR SELECT TO authenticated
  USING (
    chef_id = get_current_tenant_id()
    OR space_id IN (
      SELECT space_id
      FROM chef_collab_space_members
      WHERE chef_id = get_current_tenant_id()
    )
  );

DROP POLICY IF EXISTS chef_collab_space_members_insert ON chef_collab_space_members;
CREATE POLICY chef_collab_space_members_insert ON chef_collab_space_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM chef_collab_spaces s
      WHERE s.id = chef_collab_space_members.space_id
        AND s.created_by_chef_id = get_current_tenant_id()
    )
  );

DROP POLICY IF EXISTS chef_collab_threads_select ON chef_collab_threads;
CREATE POLICY chef_collab_threads_select ON chef_collab_threads
  FOR SELECT TO authenticated
  USING (
    space_id IN (
      SELECT space_id
      FROM chef_collab_space_members
      WHERE chef_id = get_current_tenant_id()
    )
  );

DROP POLICY IF EXISTS chef_collab_threads_insert ON chef_collab_threads;
CREATE POLICY chef_collab_threads_insert ON chef_collab_threads
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by_chef_id = get_current_tenant_id()
    AND space_id IN (
      SELECT space_id
      FROM chef_collab_space_members
      WHERE chef_id = get_current_tenant_id()
    )
  );

DROP POLICY IF EXISTS chef_collab_messages_select ON chef_collab_messages;
CREATE POLICY chef_collab_messages_select ON chef_collab_messages
  FOR SELECT TO authenticated
  USING (
    thread_id IN (
      SELECT t.id
      FROM chef_collab_threads t
      JOIN chef_collab_space_members m ON m.space_id = t.space_id
      WHERE m.chef_id = get_current_tenant_id()
    )
  );

DROP POLICY IF EXISTS chef_collab_messages_insert ON chef_collab_messages;
CREATE POLICY chef_collab_messages_insert ON chef_collab_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_chef_id = get_current_tenant_id()
    AND thread_id IN (
      SELECT t.id
      FROM chef_collab_threads t
      JOIN chef_collab_space_members m ON m.space_id = t.space_id
      WHERE m.chef_id = get_current_tenant_id()
    )
  );
```

### New Columns on Existing Tables

None.

### Migration Notes

- Use timestamp `20260401000145` only if it is still higher than the current highest migration at build time. During planning, the highest existing file was `20260401000144_openclaw_upc_unique.sql`.
- All tables are additive and chef-only. No existing table is renamed, deleted, or repurposed.
- This is intentionally a new subsystem. Do **not** extend `hub_groups`, `conversations`, or `community_messages`.

---

## Data Model

### Core Entities

1. `chef_collab_spaces`
   - One private workspace.
   - `space_type = 'direct' | 'workspace'`
   - Direct spaces have `name = null` and a unique `direct_pair_key`.
   - Named workspaces require `name`.
   - Direct spaces are canonical per chef pair.
   - Named workspaces can be solo or multi-chef and are not deduped against the canonical direct space.
   - `is_locked` stores whether future membership changes should be blocked by default.
   - Stores the latest activity preview for space lists.

2. `chef_collab_space_members`
   - Membership rows keyed by `space_id + chef_id`.
   - Only chefs are valid members.
   - Membership is static after creation in this V1 slice.
   - `last_read_at` is space-level only in V1. No per-thread read receipts.

3. `chef_collab_threads`
   - Topic buckets inside a space.
   - Every space gets starter threads at creation time: `General`, `Leads`, `Handoffs`, `Travel`, and `References`.
   - Additional threads are user-created custom topics.
   - No nested threads in V1.

4. `chef_collab_messages`
   - Conversation items inside a thread.
   - `text` for normal messages.
   - `system` for creation/system events.
   - `handoff_reference` for linking a structured `chef_handoffs` record back into the thread.
   - UI renders them with explicit timestamps, relative time, and day separators so long-lived spaces stay readable.

### Important Constraints

- **Chef-only identity model.** Every row keys off `chefs.id`, not `clients.id`, `hub_guest_profiles.id`, or `auth_user_id`.
- **Creation gate.** Adding another chef to a new space requires an accepted connection in `chef_connections`. Solo named workspaces are allowed.
- **Persistence model.** Spaces persist across many dinners. They are not tied to one event, inquiry, or guest group.
- **Direct-space dedupe.** A chef pair gets one active direct space, not duplicates.
- **Named-workspace flexibility.** The same chef pair can still have multiple additional named workspaces when they want separated contexts.
- **Privacy default.** No guest links, no client visibility, no public discovery in this file.
- **Scope restraint.** Rich transfer assets, advanced governance, and public surfaces are follow-up specs, not reasons to flatten or weaken the core model here.

---

## Server Actions

| Action                                                                          | Auth            | Input                                                                                  | Output                                                                                                       | Side Effects                                                                                               |
| ------------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `getCollabSpaceSummaries(limit?)`                                               | `requireChef()` | `{ limit?: number }`                                                                   | `Array<{ id, spaceType, displayName, memberCount, lastMessageAt, lastMessagePreview, unread, threadCount }>` | None                                                                                                       |
| `getCollabSpacesUnreadCount()`                                                  | `requireChef()` | None                                                                                   | `number`                                                                                                     | None                                                                                                       |
| `getCollabSpaceDetail({ spaceId, threadId? })`                                  | `requireChef()` | `{ spaceId: string, threadId?: string }`                                               | `{ space, members, threads, activeThread, messages }`                                                        | Marks auth failures as not found / access denied                                                           |
| `getOrCreateDirectCollabSpace({ otherChefId })`                                 | `requireChef()` | `{ otherChefId: string }`                                                              | `{ success: boolean, spaceId: string, created: boolean }`                                                    | Creates canonical direct space, member rows, starter threads, system message                               |
| `createWorkspaceCollabSpace({ name, description?, memberChefIds?, isLocked? })` | `requireChef()` | `{ name: string, description?: string, memberChefIds?: string[], isLocked?: boolean }` | `{ success: boolean, spaceId?: string, error?: string }`                                                     | Creates named workspace, member rows, starter threads, system message                                      |
| `createCollabThread({ spaceId, title })`                                        | `requireChef()` | `{ spaceId: string, title: string }`                                                   | `{ success: boolean, threadId?: string, error?: string }`                                                    | Inserts thread, optional system message, revalidates space page                                            |
| `sendCollabThreadMessage({ threadId, body })`                                   | `requireChef()` | `{ threadId: string, body: string }`                                                   | `{ success: boolean, messageId?: string, error?: string }`                                                   | Inserts message, updates thread + space last-message fields, marks sender read, revalidates index + detail |
| `markCollabSpaceRead({ spaceId })`                                              | `requireChef()` | `{ spaceId: string }`                                                                  | `{ success: boolean }`                                                                                       | Updates member `last_read_at`                                                                              |
| `attachHandoffReferenceToThread({ threadId, handoffId })`                       | `requireChef()` | `{ threadId: string, handoffId: string }`                                              | `{ success: boolean }`                                                                                       | Inserts `handoff_reference` message after verifying caller owns the handoff and is a thread member         |

### Implementation Notes

- All actions in `lib/network/collab-space-actions.ts` should use `createServerClient({ admin: true })` internally because this system is cross-tenant like the rest of `lib/network/actions.ts`.
- Every mutating action must `revalidatePath('/network')`, `revalidatePath('/network/collabs')`, and `revalidatePath(\`/network/collabs/${spaceId}\`)` as appropriate.
- Do not build optimistic updates unless there is a rollback path. Standard submit -> await -> refresh is acceptable and preferred here.

---

## UI / Component Spec

### Product Naming

- **Dinner Circle** stays reserved for guest/client dinner groups.
- **Private Spaces** is the user-facing label inside the chef network.
- Route family stays `/network/collabs/*` so it remains clearly part of chef collaboration.

### Page Layout

#### 1. `/network?tab=collab`

Keep the existing handoff inbox intact. Add a second section under it titled `Private Spaces`.

This section shows:

- A short helper line: `Persistent chef-only spaces for ongoing collaboration. Not a Dinner Circle.`
- A `New Space` button that opens `create-space-dialog`.
- Up to 5 recent spaces sorted by `last_message_at`.
- Each row shows display name, member count, thread count, unread dot or count, last preview, and `Open`.
- The tab badge should equal `getCollabUnreadCount() + getCollabSpacesUnreadCount()`.

If query params `spaceId`, `threadId`, and `recipientIds` are present, the existing handoff panel should show a seeded banner like `Creating a handoff from [space name / thread title]`.

#### 2. `/network/collabs`

This becomes the full spaces index page, not a redirect.

Page sections:

- Header: `Private Spaces`
- Intro copy: chef-only, persistent, thread-based collaboration
- `Start Direct Space` card
  - single connection picker
  - CTA opens or creates the direct space and redirects to its page
- `Create Workspace` card
  - workspace name
  - optional description
  - optional lock toggle
  - optional multi-select from accepted connections
- `Your Spaces` list
  - direct spaces and named workspaces together, newest activity first
  - empty state explains this is where recurring chef partnerships live, unlike Dinner Circles

#### 3. `/network/collabs/[spaceId]`

Split layout:

- Header
  - computed space name
  - member chips
  - lock badge when `is_locked = true`
  - `New Thread` button
  - `New Handoff` button
  - `Back to Spaces`
- Left column
  - thread list
  - starter threads pinned first in this order: `General`, `Leads`, `Handoffs`, `Travel`, `References`
  - additional custom topic threads sorted by `last_message_at`
  - active-thread highlight
- Right column
  - message feed for active thread
  - text-message style day separators and timestamps
  - composer at bottom

### States

- **Loading:** skeleton rows for spaces list, thread list, and message feed.
- **Empty index:** explain that these are chef-only recurring workspaces, not guest circles. Show creation CTAs.
- **Empty space thread:** show thread title, helper copy, and message composer. No fake history.
- **Error:** inline `Alert` on creation/send failures. For access denial or missing space, redirect or `notFound()`.
- **Populated:** real members, threads, previews, timestamps, and message history only.

### Interactions

#### Create Direct Space

1. Chef selects one accepted connection.
2. Action computes sorted `direct_pair_key`.
3. If a direct space already exists, return it.
4. Otherwise create:
   - `chef_collab_spaces`
   - two `chef_collab_space_members`
   - starter threads
   - one `system` message noting space creation
5. Redirect to `/network/collabs/[spaceId]`.

#### Create Workspace

1. Chef enters workspace name and optionally picks accepted connections.
2. Action creates one named workspace, owner row, optional additional member rows, starter threads, and system message.
3. Workspace creation is allowed even if no additional chefs are selected.
4. Redirect to the new space.

#### Create Thread

1. On space detail, chef clicks `New Thread`.
2. Modal asks only for thread title.
3. Success adds the thread to the left rail and opens it immediately.
4. Duplicate title in the same space is blocked with inline error.

#### Send Message

1. Chef types into the active thread composer.
2. Submit calls `sendCollabThreadMessage`.
3. On success:
   - message appears in thread
   - thread `last_message_at` updates
   - space preview updates
   - sender `last_read_at` updates to `now`
4. No optimistic fake message should render before success.

#### Launch Structured Handoff From a Space

1. Space header has `New Handoff`.
2. This links to `/network?tab=collab&spaceId=...&threadId=...&recipientIds=...`.
3. `recipientIds` should be all other chefs in the space when they exist.
4. `CollabInboxPanel` reads those seeds and preloads:
   - `visibilityScope = 'selected_chefs'`
   - selected recipients = seeded recipients
5. If the workspace is solo, the handoff flow still opens, but recipients are not preselected.
6. After `createCollabHandoff()` succeeds, `CollabInboxPanel` calls `attachHandoffReferenceToThread({ threadId, handoffId })`.
7. The thread then shows a reference card with title, type, and a link back to `/network?tab=collab&handoff=[id]`.

### Handoff Reference Card

For `message_type = 'handoff_reference'`, render a compact card, not a plain text blob:

- Handoff title
- Handoff type badge
- Created by label
- Link to open the handoff in the existing Collab tab

No inline editing of the handoff from the thread in V1.

---

## Edge Cases and Error Handling

| Scenario                                                                    | Correct Behavior                                                                                                     |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Chef tries to create a direct space with themselves                         | Reject server-side with a clear error.                                                                               |
| Chef tries to create a space with someone who is not an accepted connection | Reject server-side. No row writes.                                                                                   |
| Direct space already exists for the chef pair                               | Return the existing space and redirect there. Do not create a duplicate.                                             |
| Named workspace has zero selected other chefs                               | Allow it. Create a solo workspace owned by the creator.                                                              |
| Named workspace uses the same chef combination as another named workspace   | Allow it. Named workspaces are intentionally non-deduped.                                                            |
| Duplicate thread title in the same space                                    | Reject with inline validation error.                                                                                 |
| Non-member opens `/network/collabs/[spaceId]`                               | Return 404 or redirect to `/network/collabs` with no data leak.                                                      |
| Connection is removed after the space already exists                        | Existing space remains accessible to current members. New space creation still requires current accepted connection. |
| `New Handoff` pressed with no active thread selected                        | Fallback to `General` thread automatically.                                                                          |
| `New Handoff` launched from a solo workspace                                | Open the handoff form with no seeded recipients.                                                                     |
| Handoff creation succeeds but handoff-reference attach fails                | Handoff remains created. Show warning and a return link to the space. Do not roll back the handoff.                  |
| No messages yet in a thread                                                 | Show empty state and composer only.                                                                                  |

---

## Verification Steps

1. Use the seeded chef accounts defined in `scripts/launcher/open-login.mjs` for `chef` and `chef-b`.
2. Sign in as Chef A and ensure Chef A and Chef B are accepted network connections. If needed, use the existing connection-request UI to connect both accounts first.
3. Navigate to `/network?tab=collab`.
4. Verify the new `Private Spaces` section appears beneath the structured handoff UI.
5. Create a direct space with Chef B. Verify redirect to `/network/collabs/[spaceId]`.
6. Verify the new direct space has starter threads `General`, `Leads`, `Handoffs`, `Travel`, and `References`, with no fake history.
7. Send a text message in `General`. Refresh. Verify persistence, updated preview, unread behavior, and visible timestamps/day separator handling.
8. Create a second custom topic thread. Verify it appears in the thread list and opens immediately.
9. Create a named workspace with no additional chefs selected. Verify solo workspace creation succeeds.
10. From the direct space, click `New Handoff`. Verify the Collab form opens with recipient(s) preselected from the space membership.
11. Complete a structured handoff. Verify the original thread now shows a `handoff_reference` card linking back to the handoff.
12. Sign in as Chef B. Verify the direct space is visible, the thread history is visible, and the handoff reference is visible.
13. Try to create the same direct space again from Chef A. Verify the existing space is returned instead of duplicating.
14. Create a named workspace that includes Chef B even though the direct space already exists. Verify the new workspace is created instead of collapsing into the direct space.
15. Try to open the space URL from a chef who is not a member. Verify no data leaks.
16. Re-open `/network?tab=collab` and verify the collab badge includes unread handoff + unread space counts.

---

## Out of Scope

- Rebranding or redefining Dinner Circles.
- Reusing `hub_groups` or any public token-based hub route.
- Reusing chef-client chat `conversations` / `chat_messages`.
- Building a public or discoverable community channel system.
- Rich asset transfer and import/export of menus, recipes, ledgers, media, grocery lists, or future records. Those belong to the follow-up `Universal Transfer Bus` spec.
- Reactions, typing indicators, message editing, message deletion, read receipts per thread, voice/video, or presence.
- Advanced membership governance after space creation (add/remove members, role upgrades, leave space, archive space UI). This file stores lock intent and static membership only.
- Building a second structured handoff system. Existing `chef_handoffs` remains the only structured handoff engine.
- Integrating this into event collaborator invites, client-visible event collaboration, or future public opt-in directories.

---

## Notes for Builder Agent

1. **This is not a Dinner Circle.** Do not touch `lib/hub/*`, `/circles`, `/hub/*`, or `/my-hub/*`.
2. **This is not chef-client chat.** Do not extend `conversations`, `conversation_participants`, or `chat_messages`.
3. **Do not build on `community_messages`.** That table is flat, unsurfaced, and requires raw recipient IDs. This spec intentionally replaces that usage path for ongoing chef collaboration.
4. **Keep structured handoffs separate.** Spaces add the conversational layer around `chef_handoffs`; they do not replace it.
5. **Follow network patterns.** This is cross-tenant like existing network features. Read `lib/network/actions.ts` and `lib/network/collab-actions.ts` before building.
6. **Starter threads are required.** Do not ship a blank-only space model in this slice.
7. **Keep V1 small but complete.** If you feel tempted to add rich transfer assets, reactions, nested threads, or advanced permissions here, stop and use the follow-up specs.

---

## Planner Validation

### 1. What exists today that this touches?

- Dinner Circles already exist as chef-side management for client circles at `/circles`, with guest-facing parity at `/hub/g/[groupToken]` in `docs/chefflow-product-definition.md:1721-1731`.
- The app audit lists Dinner Circles as a separate area and documents `/hub/g/[groupToken]` and `/my-hub` as guest/client hub routes in `docs/app-complete-audit.md:188-194` and `docs/app-complete-audit.md:1825-1834`.
- The chef circles page is `Dinner Circles` with copy `Every dinner, every guest, one place` in `app/(chef)/circles/page.tsx:5-17`.
- Dinner circle inbox copy says these are private channels with guests, auto-created from inquiries and events, in `components/hub/circles-inbox.tsx:84-88`.
- Inquiry-circle creation creates `hub_groups`, adds chef/member roles, and links inquiry circles to events in `lib/hub/inquiry-circle-actions.ts:114-152` and `lib/hub/inquiry-circle-actions.ts:175-196`.
- Hub group schema is token-based with `group_type = 'circle'` and guest-style memberships in `lib/db/migrations/schema.ts:14922-15005` and `lib/db/migrations/schema.ts:14774-14810`.
- Chef network already exists at `/network` with a dedicated `collab` tab in `app/(chef)/network/page.tsx:58-60` and `app/(chef)/network/page.tsx:175-210`.
- Existing collab UI already supports structured handoffs, trusted-circle visibility, and recipient selection in `app/(chef)/network/collab-inbox.tsx:122-140`, `app/(chef)/network/collab-inbox.tsx:314-321`, and `app/(chef)/network/collab-inbox.tsx:590-677`.
- Existing collab backend already has `chef_handoffs`, trusted circle, availability, and notification integration in `lib/network/collab-actions.ts:20-24`, `lib/network/collab-actions.ts:494-495`, `lib/network/collab-actions.ts:934-1004`, `database/migrations/20260330000026_chef_collaboration_network.sql:33-152`, and `database/migrations/20260330000027_collab_social_notifications.sql:4-45`.
- Accepted chef-to-chef connections already exist in `lib/network/actions.ts:53-63`, `lib/network/actions.ts:444-447`, and `database/migrations/20260221000002_chef_friends_network.sql:36-76`.
- There is a flat community DM layer at `lib/community/community-actions.ts:286-369` with a raw-ID UI in `components/community/peer-messaging.tsx:173-221`, but no surfaced `/community/messages` route under `app/(chef)/community`, which only contains templates at `app/(chef)/community/templates/page.tsx:14-20`.
- Chef-client chat is separate, requires `client_id`, and is scoped to clients in `app/(chef)/chat/page.tsx:22-27`, `components/chat/new-conversation-button.tsx:49-55`, and `lib/chat/actions.ts:59-75`, `lib/chat/actions.ts:104-179`.

### 2. What exactly changes?

- Add four new tables for chef-only spaces, members, threads, and thread messages.
- Add one new server-action module `lib/network/collab-space-actions.ts`.
- Replace the `/network/collabs` redirect with a real spaces index page.
- Add a new space detail route at `/network/collabs/[spaceId]`.
- Extend the existing collab tab page to preview spaces and combine unread counts.
- Extend `CollabInboxPanel` only enough to seed recipients from a space and attach a handoff reference after successful handoff creation.
- No existing table is repurposed. No Dinner Circle route, chat route, or public hub route is renamed or redefined.

### 3. What assumptions are you making?

- **Verified:** Dinner Circle is client/guest facing, not chef-only. Verified in `docs/chefflow-product-definition.md:1721-1731`, `app/(chef)/circles/page.tsx:5-17`, and `components/hub/circles-inbox.tsx:84-88`.
- **Verified:** Chef-to-chef collaboration already belongs under Network/Collab. Verified in `app/(chef)/network/page.tsx:58-60`, `app/(chef)/network/page.tsx:428-446`, and `lib/network/collab-actions.ts:934-1004`.
- **Verified:** Accepted network connections are the right access gate for new chef collaboration surfaces. Verified in `lib/network/actions.ts:444-447`, `lib/collaboration/actions.ts:37-54`, and `lib/network/actions.ts:1296-1317`.
- **Verified:** There are seeded dual-chef credentials available for builder verification in `scripts/launcher/open-login.mjs:87-124`.
- **Unverified, now resolved at spec level:** Whether the feature should be direct-message only or thread-based. The transcript makes the thread requirement explicit, so the spec now requires spaces + threads.
- **Unverified, now resolved at spec level:** Whether handoffs should be replaced by the new space. The transcript and current system suggest no, so the spec keeps handoffs separate and only links them into threads.

### 4. Where will this most likely break?

1. **Cross-tenant membership checks.** Network features span chefs across tenants, so any action that accidentally scopes by `tenant_id` instead of `chefs.id` or accepted `chef_connections` will silently break access. Existing network code uses admin clients specifically because of this in `lib/network/actions.ts:1-5` and `lib/network/collab-actions.ts:935-940`.
2. **Builder accidentally reuses the wrong messaging system.** Reusing `hub_groups` would mix guest tokens and chef-only auth. Reusing `conversations` would force a client model. Reusing `community_messages` would lose threads and keep a poor UX. Evidence: `lib/hub/group-actions.ts:8-10`, `lib/chat/actions.ts:104-179`, `lib/community/community-actions.ts:286-369`.
3. **Unread and preview drift.** Space lists depend on `last_message_at`, `last_message_preview`, and `last_read_at`. If send actions update the message row but not the thread and space summaries, the list UI will lie. This is the same class of problem the current chef circles summary solves explicitly in `lib/hub/chef-circle-actions.ts:29-134`.

### 5. What is underspecified?

These points were underspecified in the original discussion and are now fixed in the spec:

- Product name: now explicitly `Private Spaces`, not Dinner Circle.
- Scope: now explicitly space + threads + text messages + handoff references, not a flat DM.
- Access model: now explicitly accepted connections only.
- Relationship to handoffs: now explicitly additive, with thread references.
- Relationship to Dinner Circles and chef-client chat: now explicitly fenced off.
- Verification accounts: now explicitly use seeded `chef` and `chef-b` credentials from `scripts/launcher/open-login.mjs:87-124`.

### 6. What dependencies or prerequisites exist?

- Existing chef network connection system must remain working. Source: `database/migrations/20260221000002_chef_friends_network.sql:36-76`, `lib/network/actions.ts:444-447`.
- Existing collab handoff system must remain working because spaces link into it. Source: `database/migrations/20260330000026_chef_collaboration_network.sql:33-152`, `lib/network/collab-actions.ts:934-1004`.
- Migration timestamp must be higher than current highest migration. At planning time, highest was `20260401000144_openclaw_upc_unique.sql`, and the planner gate requires exact migration verification in `CLAUDE.md:441-448`.

### 7. What existing logic could this conflict with?

- `hub_groups` / Dinner Circle logic in `lib/hub/group-actions.ts:11-75` and `lib/hub/inquiry-circle-actions.ts:114-152`.
- Chef-client conversation logic in `lib/chat/actions.ts:104-179` and `components/chat/new-conversation-button.tsx:49-55`.
- Flat community messaging in `lib/community/community-actions.ts:286-369` and `components/community/peer-messaging.tsx:173-221`.
- Existing event-collaboration and recipe-sharing logic in `lib/collaboration/actions.ts:1-9`, `lib/collaboration/actions.ts:120-178`, and `lib/collaboration/actions.ts:488-575`.
- Existing network collab tab layout in `app/(chef)/network/page.tsx:428-446` and `app/(chef)/network/collab-inbox.tsx:590-677`.

### 8. What is the end-to-end data flow?

#### Direct space creation

Chef clicks `Start Direct Space` -> `getOrCreateDirectCollabSpace()` validates accepted connection via `chef_connections` -> inserts `chef_collab_spaces`, `chef_collab_space_members`, starter `chef_collab_threads`, and system message -> revalidates `/network` and `/network/collabs` -> redirects to `/network/collabs/[spaceId]` -> space detail loads from `getCollabSpaceDetail()`.

#### Named workspace creation

Chef clicks `Create Workspace` -> `createWorkspaceCollabSpace()` inserts `chef_collab_spaces`, creator membership, optional additional member rows, starter `chef_collab_threads`, and system message -> revalidates `/network` and `/network/collabs` -> redirects to `/network/collabs/[spaceId]`.

#### Message send

Chef submits composer in active thread -> `sendCollabThreadMessage()` validates thread membership -> inserts `chef_collab_messages` -> updates `chef_collab_threads.last_message_at` and `chef_collab_spaces.last_message_at/last_message_preview` -> updates sender `last_read_at` -> revalidates index + detail -> UI refresh shows new message and updated previews.

#### Handoff launch from thread

Chef clicks `New Handoff` in space header -> navigates to `/network?tab=collab` with seeded recipient and thread params -> existing `createCollabHandoff()` writes `chef_handoffs` and recipient rows -> on success `attachHandoffReferenceToThread()` inserts a `handoff_reference` message into the originating thread -> user can return to the space and see the structured handoff linked in context.

### 9. What is the correct implementation order?

1. Add migration for the four new tables.
2. Regenerate schema output.
3. Build `lib/network/collab-space-actions.ts`.
4. Replace `/network/collabs` redirect with real index page.
5. Build `/network/collabs/[spaceId]` detail route and client shell.
6. Modify `/network?tab=collab` to preview spaces and combine unread counts.
7. Extend `CollabInboxPanel` for seeded handoff creation and thread reference attachment.
8. Update `docs/app-complete-audit.md` after UI verification.

### 10. What are the exact success criteria?

- A chef can create a direct private space with an accepted connection.
- A chef can create a named private workspace with accepted connections.
- A chef can create a solo named private workspace with no additional chefs.
- Each new space automatically has starter threads `General`, `Leads`, `Handoffs`, `Travel`, and `References`.
- A chef can create additional custom topic threads inside a space.
- A chef can send and persist text messages inside a thread.
- A second chef member can open the same space and see the same thread history.
- Creating the same direct space twice returns the existing space.
- Creating an additional named workspace with the same chef pair still succeeds.
- Launching a handoff from a thread preselects the other space members and writes a handoff reference back into that thread.
- Nothing in `/circles`, `/hub/*`, `/my-hub/*`, or `/chat/*` changes behavior.

### 11. What are the non-negotiable constraints?

- **Auth:** Every new action starts with `requireChef()`. Pattern source: `lib/network/actions.ts:7-12`, `lib/network/collab-actions.ts:935-940`.
- **Identity model:** Use `chefs.id`, never `clients.id` or `hub_guest_profiles.id`. Contrast source: `lib/hub/inquiry-circle-actions.ts:130-149`, `lib/chat/actions.ts:113-123`.
- **Cross-tenant design:** Use admin DB client inside network actions because chef network is intentionally cross-tenant. Source: `lib/network/actions.ts:1-5`.
- **Privacy boundary:** No public tokens, no guest-link access, no client visibility. Dinner circles remain the public token system. Source: `docs/chefflow-product-definition.md:2667-2669`, `app/(public)/hub/g/[groupToken]/hub-group-view.tsx:317-340`.
- **No hallucinated UI state:** No fake optimistic messages, no fake unread counts. Source rule: `CLAUDE.md:166-214`.

### 12. What should NOT be touched?

- `app/(chef)/circles/*`
- `app/(public)/hub/*`
- `app/(client)/my-hub/*`
- `lib/hub/*`
- `app/(chef)/chat/*`
- `lib/chat/*`
- `lib/community/community-actions.ts`
- `components/community/peer-messaging.tsx`
- `lib/collaboration/actions.ts` except for reading patterns if needed

These are adjacent systems, not the target feature.

### 13. Is this the simplest complete version?

Yes. It is smaller than a Discord clone and larger than a flat DM because the transcript explicitly requires persistent organized threads. The kept scope is:

- private spaces
- canonical direct and named workspace modes
- starter + custom threads
- text messages
- handoff references

Everything else is cut as out of scope.

### 14. If implemented exactly as written, what would still be wrong?

- There will still be no uploads, message editing, reactions, or presence. That is intentional, but some users may still compare it to full chat apps.
- Membership is fixed at creation in V1. There is no add/remove/leave flow yet.
- Event-collaboration invites and recipe-sharing still live elsewhere. This spec does not unify every chef-to-chef workflow into one surface.

Those are acceptable V1 limits because they do not break the core intent: persistent private threaded chef collaboration that is separate from Dinner Circles and integrated enough to reference structured handoffs.

---

## Final Check

**Is this spec production-ready, or am I proceeding with uncertainty?**

This spec is production-ready for queueing as a builder target for the `Private Spaces` slice.

The key correctness questions were resolved during planning:

- the feature name and placement
- the separation from Dinner Circles
- the separation from chef-client chat
- the relationship to existing handoff infrastructure
- the requirement for threads rather than flat DM

What remains limited is product scope, not correctness. The missing items are intentionally deferred, not uncertain.
