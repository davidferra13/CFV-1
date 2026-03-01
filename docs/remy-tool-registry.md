# Remy Tool Registry — Complete Master List

> **The single source of truth for every action Remy can and should be able to perform.**
> Chef portal only. Updated: 2026-03-01.

---

## How This Document Works

This registry lists **every single thing a chef can do in ChefFlow** and whether Remy can do it too. The developer's vision: **"Anything the user can manually do on the website, Remy should be able to do. There's no difference."**

Each action is categorized into one of three tiers:

| Tier       | Label              | What Happens                                                                | Example                                    |
| ---------- | ------------------ | --------------------------------------------------------------------------- | ------------------------------------------ |
| **Tier 1** | Auto-execute       | Remy does it immediately, no confirmation needed                            | "Show me my upcoming events"               |
| **Tier 2** | Preview + Approve  | Remy prepares a preview card, chef clicks Approve to commit                 | "Create a new client named Alex"           |
| **Tier 3** | Permanently Banned | Remy explains why it can't do this and tells the chef how to do it manually | "Delete this client" / "Generate a recipe" |

### Tier 2 Approval Flow (How It Works)

1. Chef says something like "Create a new event for the Henderson family on March 15"
2. Remy's intent classifier detects `agent.create_event`
3. The **executor** runs — it validates inputs, resolves entities (finds Henderson in DB), and builds a **preview card**
4. The preview card appears in chat showing what will happen: "Create Event: Henderson Spring Garden Party, March 15, 14 guests"
5. Chef reviews and clicks **Approve** or **Reject**
6. If approved, the **commitAction** runs — it calls the real server action and writes to the database
7. Remy confirms: "Done! Event created. Want me to start on the menu?"

### Tier 2 Safety Levels

Within Tier 2, actions have a safety level that affects how the preview card looks:

| Safety Level  | Meaning                                                                           | Card Style          |
| ------------- | --------------------------------------------------------------------------------- | ------------------- |
| `reversible`  | Can be undone easily (edit a name, add a note)                                    | Standard blue card  |
| `significant` | Harder to undo, has downstream effects (state transitions, sending notifications) | Yellow warning card |

### Tier 3 Behavior

Tier 3 actions are registered in the system so the LLM knows they exist. When the chef asks for one, Remy:

1. Acknowledges the request warmly
2. Explains _why_ it can't do it
3. Tells the chef exactly where to do it manually (page + button)

---

## Important Vocabulary Clarification

Remy's "tools" are **not** the same thing as agent tools in the MCP/Claude Code sense. They are **route handlers** — TypeScript functions that connect a user's intent ("check if March 15 is free") to a server action (`checkAvailability()`). The intelligence lives in the codebase routing, not in the model doing complex tool-calling.

---

## Status Legend

| Symbol      | Meaning                                                     |
| ----------- | ----------------------------------------------------------- |
| **EXISTS**  | Fully implemented and working today                         |
| **MISSING** | The app supports this action, but Remy can't trigger it yet |
| **BANNED**  | Permanently restricted (Tier 3) — Remy will never do this   |

---

## 1. CLIENTS

### Read Operations (Tier 1 — Auto-Execute)

| #   | Action                  | Task Type                 | Status     | Description                             |
| --- | ----------------------- | ------------------------- | ---------- | --------------------------------------- |
| 1   | Search clients          | `client.search`           | **EXISTS** | Search by name or partial name          |
| 2   | List recent clients     | `client.list_recent`      | **EXISTS** | 5 most recently added clients           |
| 3   | Client details          | `client.details`          | **EXISTS** | Full profile + event history            |
| 4   | Client event recap      | `client.event_recap`      | **EXISTS** | Comprehensive recap of a client's event |
| 5   | Client health score     | `client.health_score`     | MISSING    | Churn risk / engagement scoring         |
| 6   | Find duplicate clients  | `client.find_duplicates`  | MISSING    | Detect potential duplicates             |
| 7   | Client referral tree    | `client.referral_tree`    | MISSING    | Who referred whom                       |
| 8   | Client profitability    | `client.profitability`    | MISSING    | Revenue history per client              |
| 9   | Client next best action | `client.next_best_action` | MISSING    | AI-recommended next step for a client   |
| 10  | List client segments    | `client.segment.list`     | MISSING    | List all client segments                |

### Write Operations (Tier 2 — Preview + Approve)

| #   | Action                      | Task Type                    | Safety      | Status     | Description                    |
| --- | --------------------------- | ---------------------------- | ----------- | ---------- | ------------------------------ |
| 11  | Create client               | `agent.create_client`        | reversible  | **EXISTS** | Create from NL description     |
| 12  | Update client               | `agent.update_client`        | reversible  | **EXISTS** | Update profile fields          |
| 13  | Invite client               | `agent.invite_client`        | significant | **EXISTS** | Send portal invitation email   |
| 14  | Add client note             | `agent.add_client_note`      | reversible  | **EXISTS** | Add a note to profile          |
| 15  | Tag client                  | `agent.add_client_tag`       | reversible  | **EXISTS** | Add a tag (VIP, repeat, etc.)  |
| 16  | Remove client tag           | `agent.remove_client_tag`    | reversible  | **EXISTS** | Remove a tag                   |
| 17  | Update client status        | `client.status.update`       | reversible  | MISSING    | Set active/inactive/VIP        |
| 18  | Mark intentionally inactive | `client.mark_inactive`       | significant | MISSING    | Mark as intentionally dormant  |
| 19  | Archive client              | `client.archive`             | significant | MISSING    | Archive (soft delete)          |
| 20  | Restore client              | `client.restore`             | reversible  | MISSING    | Unarchive                      |
| 21  | Cancel invitation           | `client.cancel_invitation`   | reversible  | MISSING    | Cancel pending invite          |
| 22  | Update milestones           | `client.milestones.update`   | reversible  | MISSING    | Update client milestones       |
| 23  | Update household info       | `client.household.update`    | reversible  | MISSING    | Update household details       |
| 24  | Update NDA                  | `client.nda.update`          | significant | MISSING    | Update NDA status              |
| 25  | Toggle automated emails     | `client.automated_emails`    | significant | MISSING    | Opt in/out of automated emails |
| 26  | Award loyalty bonus         | `client.award_loyalty_bonus` | significant | MISSING    | Award bonus loyalty points     |
| 27  | Redeem loyalty reward       | `client.redeem_loyalty`      | significant | MISSING    | Redeem accumulated points      |
| 28  | Create segment              | `client.segment.create`      | reversible  | MISSING    | Create client segment          |
| 29  | Upload client photo         | `client.photo.upload`        | reversible  | MISSING    | Upload profile photo           |

### Banned (Tier 3)

| #   | Action              | Task Type               | Status     | Why Banned                                      |
| --- | ------------------- | ----------------------- | ---------- | ----------------------------------------------- |
| 30  | Delete client       | `agent.delete_data`     | **BANNED** | Permanent deletion requires manual confirmation |
| 31  | Delete client photo | `client.photo.delete`   | **BANNED** | Permanent deletion                              |
| 32  | Delete segment      | `client.segment.delete` | **BANNED** | Permanent deletion                              |

---

## 2. EVENTS

### Read Operations (Tier 1)

| #   | Action                  | Task Type                 | Status     | Description                           |
| --- | ----------------------- | ------------------------- | ---------- | ------------------------------------- |
| 33  | List upcoming events    | `event.list_upcoming`     | **EXISTS** | Next events with status + client      |
| 34  | Event details           | `event.details`           | **EXISTS** | Full event details                    |
| 35  | Events by status        | `event.list_by_status`    | **EXISTS** | Filter by FSM state                   |
| 36  | Event readiness         | `event.readiness`         | MISSING    | Full readiness gate status            |
| 37  | Detect scope drift      | `event.scope_check`       | MISSING    | Detect if scope changed from original |
| 38  | Check dietary conflicts | `event.dietary_conflicts` | MISSING    | Check menu vs guest allergies         |

### Write Operations (Tier 2)

| #   | Action                       | Task Type                         | Safety      | Status     | Description                          |
| --- | ---------------------------- | --------------------------------- | ----------- | ---------- | ------------------------------------ |
| 39  | Create event                 | `agent.create_event`              | reversible  | **EXISTS** | Parse NL event description           |
| 40  | Update event                 | `agent.update_event`              | reversible  | **EXISTS** | Update event fields                  |
| 41  | Transition event             | `agent.transition_event`          | significant | **EXISTS** | Move through FSM states              |
| 42  | Clone event                  | `agent.clone_event`               | reversible  | **EXISTS** | Copy to new date                     |
| 43  | Save debrief                 | `agent.save_debrief`              | reversible  | **EXISTS** | Save chef reflections post-event     |
| 44  | Complete safety checklist    | `agent.complete_safety_checklist` | significant | **EXISTS** | Initialize/complete safety checklist |
| 45  | Record tip                   | `agent.record_tip`                | significant | **EXISTS** | Record gratuity received             |
| 46  | Log mileage                  | `agent.log_mileage`               | reversible  | **EXISTS** | Record travel mileage                |
| 47  | Log alcohol                  | `agent.log_alcohol`               | reversible  | **EXISTS** | Record alcohol served                |
| 48  | Generate prep timeline       | `agent.generate_prep_timeline`    | reversible  | **EXISTS** | AI-generated prep timeline           |
| 49  | Acknowledge scope drift      | `agent.acknowledge_scope_drift`   | significant | **EXISTS** | Acknowledge scope change             |
| 50  | Create event draft (legacy)  | `event.create_draft`              | reversible  | **EXISTS** | Legacy NL event creation             |
| 51  | Prep timeline (legacy)       | `prep.timeline`                   | reversible  | **EXISTS** | Legacy prep timeline                 |
| 52  | Reschedule event             | `event.reschedule`                | significant | MISSING    | Move event to new date               |
| 53  | Archive event                | `event.archive`                   | significant | MISSING    | Archive (soft delete)                |
| 54  | Restore event                | `event.restore`                   | reversible  | MISSING    | Unarchive                            |
| 55  | Set food cost budget         | `event.food_cost_budget`          | reversible  | MISSING    | Set target food cost                 |
| 56  | Mark financial closed        | `event.financial_close`           | significant | MISSING    | Close financials                     |
| 57  | Mark follow-up sent          | `event.followup_sent`             | reversible  | MISSING    | Flag follow-up as sent               |
| 58  | Assign invoice number        | `event.invoice_number`            | reversible  | MISSING    | Assign invoice #                     |
| 59  | Update travel time           | `event.travel_time`               | reversible  | MISSING    | Set travel time estimate             |
| 60  | Log charity hours            | `event.charity_hours`             | reversible  | MISSING    | Log charity event hours              |
| 61  | Acknowledge dietary conflict | `event.allergy.acknowledge`       | significant | MISSING    | Acknowledge known conflict           |
| 62  | Confirm pre-event checklist  | `event.pre_event_checklist`       | significant | MISSING    | Confirm pre-event checks             |
| 63  | Override readiness gate      | `event.gate.override`             | significant | MISSING    | Override a gate                      |
| 64  | Toggle countdown             | `event.countdown.toggle`          | reversible  | MISSING    | Toggle countdown display             |
| 65  | Import historical event      | `event.import_historical`         | reversible  | MISSING    | Import past events                   |
| 66  | Start time tracking          | `event.time.start_activity`       | reversible  | MISSING    | Start activity timer                 |
| 67  | Stop time tracking           | `event.time.stop_activity`        | reversible  | MISSING    | Stop activity timer                  |
| 68  | Update payment splits        | `event.payment_splits`            | significant | MISSING    | Configure payment splits             |
| 69  | Upload event photo           | `event.photo.upload`              | reversible  | MISSING    | Upload event photo                   |
| 70  | Geocode event address        | `event.geocode`                   | reversible  | MISSING    | Geocode address                      |

### Banned (Tier 3)

| #   | Action             | Task Type                  | Status     | Why Banned              |
| --- | ------------------ | -------------------------- | ---------- | ----------------------- |
| 71  | Delete event       | `agent.delete_data`        | **BANNED** | Permanent deletion      |
| 72  | Delete event photo | `event.photo.delete`       | **BANNED** | Permanent deletion      |
| 73  | Bulk delete drafts | `event.bulk_delete_drafts` | **BANNED** | Bulk permanent deletion |

---

## 3. INQUIRIES

### Read Operations (Tier 1)

| #   | Action                   | Task Type                  | Status     | Description                        |
| --- | ------------------------ | -------------------------- | ---------- | ---------------------------------- |
| 74  | List open inquiries      | `inquiry.list_open`        | **EXISTS** | Active inquiries needing attention |
| 75  | Inquiry details          | `inquiry.details`          | **EXISTS** | Specific inquiry details           |
| 76  | List inquiry notes       | `inquiry.note.list`        | MISSING    | All notes for an inquiry           |
| 77  | Inquiry stats            | `inquiry.stats`            | MISSING    | Pipeline conversion stats          |
| 78  | Check inquiry duplicates | `inquiry.check_duplicates` | MISSING    | Detect duplicate inquiries         |

### Write Operations (Tier 2)

| #   | Action                 | Task Type                  | Safety      | Status     | Description                |
| --- | ---------------------- | -------------------------- | ----------- | ---------- | -------------------------- |
| 79  | Create inquiry         | `agent.create_inquiry`     | reversible  | **EXISTS** | Log new lead               |
| 80  | Transition inquiry     | `agent.transition_inquiry` | significant | **EXISTS** | Move through statuses      |
| 81  | Convert to event       | `agent.convert_inquiry`    | significant | **EXISTS** | Convert to draft event     |
| 82  | Decline inquiry        | `agent.decline_inquiry`    | significant | **EXISTS** | Decline/pass               |
| 83  | Update inquiry         | `agent.update_inquiry`     | reversible  | **EXISTS** | Update details             |
| 84  | Add inquiry note       | `agent.add_inquiry_note`   | reversible  | **EXISTS** | Add note                   |
| 85  | Set booking likelihood | `inquiry.set_likelihood`   | reversible  | MISSING    | Set conversion probability |
| 86  | Update inquiry note    | `inquiry.update_note`      | reversible  | MISSING    | Edit existing note         |
| 87  | Toggle note pin        | `inquiry.toggle_note_pin`  | reversible  | MISSING    | Pin/unpin a note           |
| 88  | Link recipe to inquiry | `inquiry.link_recipe`      | reversible  | MISSING    | Link recipe                |
| 89  | Unlink recipe          | `inquiry.unlink_recipe`    | reversible  | MISSING    | Unlink recipe              |
| 90  | Restore inquiry        | `inquiry.restore`          | reversible  | MISSING    | Unarchive                  |
| 91  | Bulk archive inquiries | `inquiry.bulk_archive`     | significant | MISSING    | Archive multiple           |
| 92  | Bulk decline inquiries | `inquiry.bulk_decline`     | significant | MISSING    | Decline multiple           |

### Banned (Tier 3)

| #   | Action              | Task Type             | Status     | Why Banned         |
| --- | ------------------- | --------------------- | ---------- | ------------------ |
| 93  | Delete inquiry      | `agent.delete_data`   | **BANNED** | Permanent deletion |
| 94  | Delete inquiry note | `inquiry.delete_note` | **BANNED** | Permanent deletion |

---

## 4. QUOTES

### Read Operations (Tier 1)

| #   | Action                 | Task Type               | Status     | Description                     |
| --- | ---------------------- | ----------------------- | ---------- | ------------------------------- |
| 95  | Compare quotes         | `quote.compare`         | **EXISTS** | Side-by-side version comparison |
| 96  | List quotes            | `quote.list`            | MISSING    | List all quotes                 |
| 97  | Quote details          | `quote.details`         | MISSING    | Single quote detail view        |
| 98  | Quote version history  | `quote.version_history` | MISSING    | Version timeline                |
| 99  | Client pricing history | `quote.pricing_history` | MISSING    | Per-client pricing trends       |

### Write Operations (Tier 2)

| #   | Action             | Task Type                  | Safety      | Status     | Description                       |
| --- | ------------------ | -------------------------- | ----------- | ---------- | --------------------------------- |
| 100 | Create quote       | `agent.create_quote`       | reversible  | **EXISTS** | Create pricing quote              |
| 101 | Transition quote   | `agent.transition_quote`   | significant | **EXISTS** | Move status (draft→sent→accepted) |
| 102 | Update quote       | `quote.update`             | reversible  | MISSING    | Edit quote details                |
| 103 | Revise quote       | `quote.revise`             | reversible  | MISSING    | Create new version                |
| 104 | Reject quote       | `quote.reject`             | significant | MISSING    | Chef-side rejection               |
| 105 | Accept quote       | `quote.accept`             | significant | MISSING    | Client-side acceptance            |
| 106 | Record lost reason | `quote.record_lost_reason` | reversible  | MISSING    | Log why quote was lost            |

### Banned (Tier 3)

| #   | Action       | Task Type           | Status     | Why Banned         |
| --- | ------------ | ------------------- | ---------- | ------------------ |
| 107 | Delete quote | `agent.delete_data` | **BANNED** | Permanent deletion |

---

## 5. MENUS

### Read Operations (Tier 1)

| #   | Action               | Task Type                 | Status     | Description                     |
| --- | -------------------- | ------------------------- | ---------- | ------------------------------- |
| 108 | List menus           | `menu.list`               | **EXISTS** | All menus, filterable by status |
| 109 | Menu explanation     | `client.menu_explanation` | **EXISTS** | Course breakdown + dietary tags |
| 110 | List menu templates  | `menu.template.list`      | MISSING    | List saved templates            |
| 111 | Get menu preferences | `menu.preferences.get`    | MISSING    | Client menu preferences         |

### Write Operations (Tier 2)

| #   | Action                  | Task Type                        | Safety      | Status     | Description                      |
| --- | ----------------------- | -------------------------------- | ----------- | ---------- | -------------------------------- |
| 112 | Create menu             | `agent.create_menu`              | reversible  | **EXISTS** | Create new menu                  |
| 113 | Link menu to event      | `agent.link_menu_event`          | reversible  | **EXISTS** | Link existing menu to event      |
| 114 | Update menu             | `agent.update_menu`              | reversible  | **EXISTS** | Update name/description/style    |
| 115 | Add dish                | `agent.add_dish`                 | reversible  | **EXISTS** | Add dish/course                  |
| 116 | Update dish             | `agent.update_dish`              | reversible  | **EXISTS** | Update dish details              |
| 117 | Add component           | `agent.add_component`            | reversible  | **EXISTS** | Add sauce/garnish/base           |
| 118 | Duplicate menu          | `agent.duplicate_menu`           | reversible  | **EXISTS** | Copy with all dishes             |
| 119 | Save as template        | `agent.save_menu_template`       | reversible  | **EXISTS** | Save as reusable template        |
| 120 | Send for approval       | `agent.send_menu_approval`       | significant | **EXISTS** | Send to client for approval      |
| 121 | Transition menu         | `agent.transition_menu`          | significant | **EXISTS** | Change status                    |
| 122 | Detach from event       | `menu.detach`                    | reversible  | MISSING    | Detach menu from event           |
| 123 | Update component        | `menu.component.update`          | reversible  | MISSING    | Edit component details           |
| 124 | Link recipe to dish     | `menu.dish.link_recipe`          | reversible  | MISSING    | Link recipe to dish              |
| 125 | Unlink recipe from dish | `menu.dish.unlink_recipe`        | reversible  | MISSING    | Unlink recipe                    |
| 126 | Archive dish            | `menu.dish.archive`              | reversible  | MISSING    | Archive a dish                   |
| 127 | Restore dish            | `menu.dish.restore`              | reversible  | MISSING    | Unarchive a dish                 |
| 128 | Add dish feedback       | `menu.dish.feedback`             | reversible  | MISSING    | Record dish feedback             |
| 129 | Merge dishes            | `menu.dish.merge`                | significant | MISSING    | Merge duplicate dishes           |
| 130 | Request revision        | `menu.approval.request_revision` | significant | MISSING    | Ask client to revise preferences |
| 131 | Log modification        | `menu.modification.log`          | reversible  | MISSING    | Log a menu modification          |
| 132 | Toggle showcase         | `menu.showcase.toggle`           | reversible  | MISSING    | Toggle showcase status           |
| 133 | Clone menu              | `menu.clone`                     | reversible  | MISSING    | Clone (separate from duplicate)  |
| 134 | Parse menu text         | `menu.upload.parse`              | reversible  | MISSING    | Parse menu from text/file        |
| 135 | Reorder courses         | `menu.course.reorder`            | reversible  | MISSING    | Reorder course order             |

### Banned (Tier 3)

| #   | Action              | Task Type                  | Status     | Why Banned         |
| --- | ------------------- | -------------------------- | ---------- | ------------------ |
| 136 | Delete menu         | `agent.delete_data`        | **BANNED** | Permanent deletion |
| 137 | Delete dish         | `menu.dish.delete`         | **BANNED** | Permanent deletion |
| 138 | Delete component    | `menu.component.delete`    | **BANNED** | Permanent deletion |
| 139 | Delete course       | `menu.course.delete`       | **BANNED** | Permanent deletion |
| 140 | Delete modification | `menu.modification.delete` | **BANNED** | Permanent deletion |

---

## 6. CALENDAR & SCHEDULING

### Read Operations (Tier 1)

| #   | Action              | Task Type                   | Status     | Description                       |
| --- | ------------------- | --------------------------- | ---------- | --------------------------------- |
| 141 | Check availability  | `calendar.availability`     | **EXISTS** | Is a date free?                   |
| 142 | Next available date | `scheduling.next_available` | **EXISTS** | Find next open date               |
| 143 | View waitlist       | `waitlist.list`             | **EXISTS** | All waitlisted clients            |
| 144 | Today's schedule    | `scheduling.today`          | MISSING    | What's on today                   |
| 145 | Week schedule       | `scheduling.week_schedule`  | MISSING    | Full week view                    |
| 146 | Year density        | `calendar.year_density`     | MISSING    | Year-level booking density        |
| 147 | Unified calendar    | `calendar.unified`          | MISSING    | Combined calendar data            |
| 148 | Scheduling gaps     | `scheduling.gaps`           | MISSING    | Find gaps in schedule             |
| 149 | Waitlist for date   | `waitlist.for_date`         | MISSING    | Who's waiting for a specific date |

### Write Operations (Tier 2)

| #   | Action                   | Task Type                        | Safety      | Status               | Description                                 |
| --- | ------------------------ | -------------------------------- | ----------- | -------------------- | ------------------------------------------- |
| 150 | Create calendar entry    | `agent.create_calendar_entry`    | reversible  | **EXISTS**           | Block dates, personal events                |
| 151 | Update calendar entry    | `agent.update_calendar_entry`    | reversible  | **EXISTS** (partial) | Update entry (commit not fully implemented) |
| 152 | Hold date                | `agent.hold_date`                | reversible  | **EXISTS**           | Tentatively block date                      |
| 153 | Block date               | `scheduling.block.create`        | reversible  | MISSING              | Hard block a date                           |
| 154 | Unblock date             | `scheduling.block.delete`        | reversible  | MISSING              | Remove date block                           |
| 155 | Create prep block        | `scheduling.prep_block.create`   | reversible  | MISSING              | Schedule prep time                          |
| 156 | Update prep block        | `scheduling.prep_block.update`   | reversible  | MISSING              | Edit prep block                             |
| 157 | Complete prep block      | `scheduling.prep_block.complete` | reversible  | MISSING              | Mark prep done                              |
| 158 | Mark entry complete      | `calendar.entry.mark_complete`   | reversible  | MISSING              | Mark calendar entry done                    |
| 159 | Add to waitlist          | `waitlist.add`                   | reversible  | MISSING              | Add client to waitlist                      |
| 160 | Contact waitlist entry   | `waitlist.contact`               | significant | MISSING              | Mark as contacted                           |
| 161 | Convert waitlist entry   | `waitlist.convert`               | significant | MISSING              | Convert to event                            |
| 162 | Expire waitlist entry    | `waitlist.expire`                | reversible  | MISSING              | Mark as expired                             |
| 163 | Update scheduling rules  | `scheduling.rules.update`        | significant | MISSING              | Set booking rules                           |
| 164 | Update capacity          | `scheduling.capacity.update`     | significant | MISSING              | Set capacity limits                         |
| 165 | Update off-hours         | `scheduling.off_hours.update`    | significant | MISSING              | Set off-hours                               |
| 166 | Generate share link      | `scheduling.share_token.create`  | reversible  | MISSING              | Availability share URL                      |
| 167 | Set availability signal  | `calendar.signal.set`            | significant | MISSING              | Enable/disable signals                      |
| 168 | Notify clients of signal | `calendar.notify_clients`        | significant | MISSING              | Send availability notification              |

### Banned (Tier 3)

| #   | Action                | Task Type                       | Status     | Why Banned         |
| --- | --------------------- | ------------------------------- | ---------- | ------------------ |
| 169 | Delete calendar entry | `calendar.entry.delete`         | **BANNED** | Permanent deletion |
| 170 | Delete prep block     | `scheduling.prep_block.delete`  | **BANNED** | Permanent deletion |
| 171 | Revoke share token    | `scheduling.share_token.revoke` | **BANNED** | Irreversible       |

---

## 7. RECIPES

### Read Operations (Tier 1)

| #   | Action           | Task Type                | Status     | Description                   |
| --- | ---------------- | ------------------------ | ---------- | ----------------------------- |
| 172 | Search recipes   | `recipe.search`          | **EXISTS** | Search chef's recipe book     |
| 173 | Recipe details   | `recipe.details`         | MISSING    | Full recipe with ingredients  |
| 174 | List recipes     | `recipe.list`            | MISSING    | List all recipes with filters |
| 175 | Recipe nutrition | `recipe.nutrition`       | MISSING    | Nutritional info              |
| 176 | Detect allergens | `recipe.allergens`       | MISSING    | Flag allergens in a recipe    |
| 177 | Recipe cost      | `analytics.recipe_cost`  | **EXISTS** | Cost analysis + substitutions |
| 178 | Scale recipe     | `ops.portion_calc`       | **EXISTS** | Scale to guest count          |
| 179 | Recipe debt      | `recipe.debt`            | MISSING    | Recipes missing cost data     |
| 180 | Production log   | `recipe.production.list` | MISSING    | Production history            |
| 181 | List ingredients | `recipe.ingredient.list` | MISSING    | All ingredients in system     |

### Write Operations (Tier 2)

| #   | Action            | Task Type                  | Safety     | Status  | Description                                     |
| --- | ----------------- | -------------------------- | ---------- | ------- | ----------------------------------------------- |
| 182 | Log production    | `recipe.production.log`    | reversible | MISSING | Record recipe was produced                      |
| 183 | Create ingredient | `recipe.ingredient.create` | reversible | MISSING | Add ingredient to master list (NOT to a recipe) |
| 184 | Update ingredient | `recipe.ingredient.update` | reversible | MISSING | Edit ingredient details                         |

### Banned (Tier 3 — PERMANENT, NO EXCEPTIONS)

| #   | Action                   | Task Type              | Status     | Why Banned                                              |
| --- | ------------------------ | ---------------------- | ---------- | ------------------------------------------------------- |
| 185 | Create recipe            | `agent.create_recipe`  | **BANNED** | Chef's creative work — AI never generates recipes       |
| 186 | Update recipe            | `agent.update_recipe`  | **BANNED** | Chef's creative work — AI never modifies recipes        |
| 187 | Add ingredient to recipe | `agent.add_ingredient` | **BANNED** | Chef's creative work — AI never modifies recipe content |

---

## 8. FINANCE & PAYMENTS

### Read Operations (Tier 1)

| #   | Action                 | Task Type                         | Status     | Description                  |
| --- | ---------------------- | --------------------------------- | ---------- | ---------------------------- |
| 188 | Revenue summary        | `finance.summary`                 | **EXISTS** | Overall business performance |
| 189 | Monthly snapshot       | `finance.monthly_snapshot`        | **EXISTS** | Revenue, refunds, tips, net  |
| 190 | Break-even analysis    | `analytics.break_even`            | **EXISTS** | Per-event break-even         |
| 191 | Client LTV             | `analytics.client_ltv`            | **EXISTS** | Lifetime value per client    |
| 192 | Outstanding balances   | `finance.outstanding_balances`    | MISSING    | Who owes what                |
| 193 | Profit & loss report   | `finance.p&l`                     | MISSING    | P&L for period               |
| 194 | Cash flow forecast     | `finance.cash_flow`               | MISSING    | Projected cash flow          |
| 195 | Tax year summary       | `finance.tax.summary`             | MISSING    | Annual tax summary           |
| 196 | Quarterly tax estimate | `finance.tax.quarterly`           | MISSING    | Quarterly estimate           |
| 197 | Sales tax settings     | `finance.tax.settings`            | MISSING    | Tax config                   |
| 198 | Get expense details    | `finance.expense.get`             | MISSING    | Single expense detail        |
| 199 | Mileage logs           | `finance.mileage.list`            | MISSING    | List mileage entries         |
| 200 | YTD mileage summary    | `finance.mileage.ytd`             | MISSING    | Year-to-date mileage         |
| 201 | YTD tip summary        | `finance.tip.ytd`                 | MISSING    | Year-to-date tips            |
| 202 | Payment plan list      | `finance.payment_plan.list`       | MISSING    | Active payment plans         |
| 203 | Budget guardrail       | `finance.budget_guardrail`        | MISSING    | Budget check                 |
| 204 | Bank transactions      | `finance.bank.transactions`       | MISSING    | Linked bank transactions     |
| 205 | Payout summary         | `billing.payout_summary`          | MISSING    | Stripe payout info           |
| 206 | Revenue by source      | `analytics.revenue_by_source`     | MISSING    | Revenue breakdown by source  |
| 207 | Revenue by day of week | `analytics.revenue_by_day`        | MISSING    | Day-of-week patterns         |
| 208 | Effective hourly rate  | `analytics.effective_hourly_rate` | MISSING    | Hourly rate by month         |

### Write Operations (Tier 2)

| #   | Action                      | Task Type                         | Safety      | Status     | Description                            |
| --- | --------------------------- | --------------------------------- | ----------- | ---------- | -------------------------------------- |
| 209 | Log expense                 | `agent.log_expense`               | reversible  | **EXISTS** | Record business expense                |
| 210 | Update expense              | `agent.update_expense`            | reversible  | **EXISTS** | Fix expense details                    |
| 211 | Record tip                  | `agent.record_tip`                | significant | **EXISTS** | Record gratuity (also in Events)       |
| 212 | Log mileage                 | `agent.log_mileage`               | reversible  | **EXISTS** | Record travel mileage (also in Events) |
| 213 | Run grocery quote           | `agent.run_grocery_quote`         | reversible  | **EXISTS** | Price-check via APIs                   |
| 214 | Log grocery actual          | `agent.log_grocery_actual`        | reversible  | **EXISTS** | Record actual spend                    |
| 215 | Export expenses CSV         | `finance.expense.export`          | reversible  | MISSING    | Export expenses                        |
| 216 | Scan receipt                | `finance.expense.scan_receipt`    | reversible  | MISSING    | OCR receipt scan                       |
| 217 | Upload receipt              | `finance.expense.upload_receipt`  | reversible  | MISSING    | Upload receipt image                   |
| 218 | Create payment plan         | `finance.payment_plan.create`     | significant | MISSING    | Set up installment plan                |
| 219 | Add installment             | `finance.installment.add`         | reversible  | MISSING    | Add installment to plan                |
| 220 | Mark installment paid       | `finance.installment.paid`        | significant | MISSING    | Mark as paid                           |
| 221 | Record sales tax remittance | `finance.tax.sales_remit`         | significant | MISSING    | Record tax payment                     |
| 222 | Create retainer             | `finance.retainer.create`         | significant | MISSING    | Create retainer agreement              |
| 223 | Activate retainer           | `finance.retainer.activate`       | significant | MISSING    | Activate retainer                      |
| 224 | Pause retainer              | `finance.retainer.pause`          | significant | MISSING    | Pause retainer                         |
| 225 | Complete retainer           | `finance.retainer.complete`       | significant | MISSING    | Complete retainer                      |
| 226 | Link event to retainer      | `finance.retainer.link_event`     | reversible  | MISSING    | Link event                             |
| 227 | Record retainer payment     | `finance.retainer.record_payment` | significant | MISSING    | Record payment                         |
| 228 | Create dispute              | `finance.dispute.create`          | significant | MISSING    | Create payment dispute                 |
| 229 | Resolve dispute             | `finance.dispute.resolve`         | significant | MISSING    | Resolve dispute                        |
| 230 | Create employee             | `finance.employee.create`         | reversible  | MISSING    | Add employee record                    |
| 231 | Record payroll              | `finance.payroll.record`          | significant | MISSING    | Record payroll                         |
| 232 | Record contractor payment   | `finance.contractor.payment`      | significant | MISSING    | Pay contractor                         |
| 233 | Export ledger CSV           | `finance.data.export_ledger`      | reversible  | MISSING    | Export ledger entries                  |
| 234 | Export revenue CSV          | `finance.data.export_revenue`     | reversible  | MISSING    | Export revenue by client               |

### Banned (Tier 3)

| #   | Action                  | Task Type                    | Status     | Why Banned                       |
| --- | ----------------------- | ---------------------------- | ---------- | -------------------------------- |
| 235 | Record payment (ledger) | `agent.ledger_write`         | **BANNED** | Immutable ledger — manual only   |
| 236 | Issue refund            | `agent.refund`               | **BANNED** | Financial ledger — manual only   |
| 237 | Delete expense          | `finance.expense.delete`     | **BANNED** | Permanent deletion               |
| 238 | Delete mileage entry    | `finance.mileage.delete`     | **BANNED** | Permanent deletion               |
| 239 | Delete tip              | `finance.tip.delete`         | **BANNED** | Permanent deletion               |
| 240 | Delete installment      | `finance.installment.delete` | **BANNED** | Permanent deletion               |
| 241 | Cancel retainer         | `finance.retainer.cancel`    | **BANNED** | Irreversible financial operation |
| 242 | Connect bank            | `finance.bank.connect`       | **BANNED** | Security — requires OAuth        |
| 243 | Disconnect bank         | `finance.bank.disconnect`    | **BANNED** | Security — manual only           |
| 244 | Generate 1099           | `finance.1099.generate`      | **BANNED** | Tax document — manual only       |

---

## 9. STAFF

### Read Operations (Tier 1)

| #   | Action                  | Task Type                 | Status  | Description                  |
| --- | ----------------------- | ------------------------- | ------- | ---------------------------- |
| 245 | Search staff            | `staff.search`            | MISSING | Search staff members         |
| 246 | Staff performance board | `staff.performance`       | MISSING | Performance metrics          |
| 247 | Staff onboarding status | `staff.onboarding.status` | MISSING | Onboarding progress          |
| 248 | Code of conduct status  | `staff.coc.status`        | MISSING | COC acknowledgment status    |
| 249 | Compute labor cost      | `staff.labor_cost`        | MISSING | Event labor cost calculation |

### Write Operations (Tier 2)

| #   | Action                | Task Type                  | Safety      | Status     | Description                 |
| --- | --------------------- | -------------------------- | ----------- | ---------- | --------------------------- |
| 250 | Create staff          | `agent.create_staff`       | reversible  | **EXISTS** | Add staff member            |
| 251 | Assign to event       | `agent.assign_staff`       | reversible  | **EXISTS** | Assign staff to event       |
| 252 | Record hours          | `agent.record_staff_hours` | reversible  | **EXISTS** | Log hours worked            |
| 253 | Update staff          | `staff.update`             | reversible  | MISSING    | Edit staff details          |
| 254 | Remove from event     | `staff.remove_from_event`  | reversible  | MISSING    | Unassign from event         |
| 255 | Set availability      | `staff.availability.set`   | reversible  | MISSING    | Set individual availability |
| 256 | Bulk set availability | `staff.availability.bulk`  | reversible  | MISSING    | Set for multiple staff      |
| 257 | Clock in              | `staff.clock_in`           | reversible  | MISSING    | Clock in to event           |
| 258 | Clock out             | `staff.clock_out`          | reversible  | MISSING    | Clock out of event          |
| 259 | Generate briefing     | `staff.briefing.generate`  | reversible  | MISSING    | AI staff briefing           |
| 260 | Create staff login    | `staff.login.create`       | significant | MISSING    | Create portal login         |
| 261 | Acknowledge COC       | `staff.coc.acknowledge`    | significant | MISSING    | Acknowledge code of conduct |
| 262 | Add agreement         | `staff.agreement.add`      | significant | MISSING    | Add employment agreement    |
| 263 | Shift check-in        | `staff.shift.check_in`     | reversible  | MISSING    | Check in to shift           |
| 264 | Shift check-out       | `staff.shift.check_out`    | reversible  | MISSING    | Check out of shift          |

### Banned (Tier 3)

| #   | Action           | Task Type          | Status     | Why Banned                     |
| --- | ---------------- | ------------------ | ---------- | ------------------------------ |
| 265 | Deactivate staff | `staff.deactivate` | **BANNED** | Personnel action — manual only |

---

## 10. DOCUMENTS

### Read Operations (Tier 1)

| #   | Action             | Task Type               | Status     | Description                       |
| --- | ------------------ | ----------------------- | ---------- | --------------------------------- |
| 266 | Search documents   | `document.search`       | **EXISTS** | Search by title                   |
| 267 | List folders       | `document.list_folders` | **EXISTS** | All document folders              |
| 268 | Document readiness | `document.readiness`    | MISSING    | Which docs are ready for an event |

### Write Operations (Tier 2)

| #   | Action                     | Task Type                             | Safety     | Status     | Description                      |
| --- | -------------------------- | ------------------------------------- | ---------- | ---------- | -------------------------------- |
| 269 | Create folder              | `document.create_folder`              | reversible | **EXISTS** | Create document folder           |
| 270 | Upload document            | `document.upload`                     | reversible | MISSING    | Upload a document                |
| 271 | Move document              | `document.move`                       | reversible | MISSING    | Move to different folder         |
| 272 | Generate invoice PDF       | `document.generate.invoice`           | reversible | MISSING    | Generate invoice                 |
| 273 | Generate receipt           | `document.generate.receipt`           | reversible | MISSING    | Generate receipt                 |
| 274 | Generate contract          | `document.generate.contract`          | reversible | MISSING    | Generate contract                |
| 275 | Generate quote PDF         | `document.generate.quote`             | reversible | MISSING    | Generate quote PDF               |
| 276 | Generate prep sheet        | `document.generate.prep_sheet`        | reversible | MISSING    | Generate prep sheet              |
| 277 | Generate packing list PDF  | `document.generate.packing_list`      | reversible | MISSING    | Generate packing list document   |
| 278 | Generate checklist         | `document.generate.checklist`         | reversible | MISSING    | Generate checklist               |
| 279 | Generate execution sheet   | `document.generate.execution_sheet`   | reversible | MISSING    | Generate execution sheet         |
| 280 | Generate grocery list PDF  | `document.generate.grocery_list`      | reversible | MISSING    | Generate grocery list document   |
| 281 | Generate travel route      | `document.generate.travel_route`      | reversible | MISSING    | Generate travel route            |
| 282 | Generate FOH menu          | `document.generate.foh_menu`          | reversible | MISSING    | Generate front-of-house menu     |
| 283 | Generate content shot list | `document.generate.content_shot_list` | reversible | MISSING    | Generate content/photo shot list |

### Banned (Tier 3)

| #   | Action          | Task Type           | Status     | Why Banned         |
| --- | --------------- | ------------------- | ---------- | ------------------ |
| 284 | Delete document | `agent.delete_data` | **BANNED** | Permanent deletion |

---

## 11. EMAIL & COMMUNICATIONS

### Read Operations (Tier 1)

| #   | Action        | Task Type             | Status     | Description                      |
| --- | ------------- | --------------------- | ---------- | -------------------------------- |
| 285 | Recent emails | `email.recent`        | **EXISTS** | Latest emails                    |
| 286 | Search emails | `email.search`        | **EXISTS** | Search by sender/subject/keyword |
| 287 | Email thread  | `email.thread`        | **EXISTS** | Full conversation thread         |
| 288 | Inbox summary | `email.inbox_summary` | **EXISTS** | Inbox overview                   |

### Write Operations (Tier 2 — ALL drafts, NEVER auto-sent)

| #   | Action                      | Task Type                     | Safety     | Status     | Description                      |
| --- | --------------------------- | ----------------------------- | ---------- | ---------- | -------------------------------- |
| 289 | Draft follow-up             | `email.followup`              | reversible | **EXISTS** | Follow-up email draft            |
| 290 | Draft generic email         | `email.generic`               | reversible | **EXISTS** | General email draft              |
| 291 | Draft reply                 | `email.draft_reply`           | reversible | **EXISTS** | Reply to specific email          |
| 292 | Draft thank-you             | `draft.thank_you`             | reversible | **EXISTS** | Thank-you note                   |
| 293 | Draft referral request      | `draft.referral_request`      | reversible | **EXISTS** | Referral ask                     |
| 294 | Draft testimonial request   | `draft.testimonial_request`   | reversible | **EXISTS** | Testimonial ask                  |
| 295 | Draft quote cover letter    | `draft.quote_cover_letter`    | reversible | **EXISTS** | Quote cover letter               |
| 296 | Draft decline response      | `draft.decline_response`      | reversible | **EXISTS** | Gracious decline                 |
| 297 | Draft cancellation response | `draft.cancellation_response` | reversible | **EXISTS** | Cancellation empathy             |
| 298 | Draft payment reminder      | `draft.payment_reminder`      | reversible | **EXISTS** | Payment reminder                 |
| 299 | Draft re-engagement         | `draft.re_engagement`         | reversible | **EXISTS** | Dormant client outreach          |
| 300 | Draft milestone recognition | `draft.milestone_recognition` | reversible | **EXISTS** | Milestone celebration            |
| 301 | Draft food safety incident  | `draft.food_safety_incident`  | reversible | **EXISTS** | Incident report                  |
| 302 | Unified draft email         | `agent.draft_email`           | reversible | **EXISTS** | Unified draft action (all types) |
| 303 | Draft campaign outreach     | `campaign.outreach.draft`     | reversible | MISSING    | Personalized campaign email      |
| 304 | Draft review request        | `reviews.request.draft`       | reversible | MISSING    | Ask for review                   |

### Banned (Tier 3)

| #   | Action               | Task Type                   | Status     | Why Banned               |
| --- | -------------------- | --------------------------- | ---------- | ------------------------ |
| 305 | Send email           | `agent.send_email`          | **BANNED** | Remy drafts, never sends |
| 306 | Send campaign        | `campaign.send`             | **BANNED** | Remy drafts, never sends |
| 307 | Send direct outreach | `marketing.direct_outreach` | **BANNED** | Remy drafts, never sends |

---

## 12. SAFETY & COMPLIANCE

### Read Operations (Tier 1)

| #   | Action                   | Task Type                   | Status     | Description                    |
| --- | ------------------------ | --------------------------- | ---------- | ------------------------------ |
| 308 | Dietary/allergy check    | `dietary.check`             | **EXISTS** | Cross-check client vs menu     |
| 309 | Event allergen check     | `safety.event_allergens`    | **EXISTS** | All guests vs menu             |
| 310 | Cross-contamination risk | `ops.cross_contamination`   | **EXISTS** | Contamination risk analysis    |
| 311 | Get temp log             | `safety.temp_log.get`       | MISSING    | Temperature readings for event |
| 312 | Analyze temp log         | `safety.temp_log.analyze`   | MISSING    | AI anomaly detection           |
| 313 | List incidents           | `safety.incident.list`      | MISSING    | All safety incidents           |
| 314 | Get incident             | `safety.incident.get`       | MISSING    | Specific incident detail       |
| 315 | List certifications      | `safety.certification.list` | MISSING    | All certifications             |
| 316 | Active food recalls      | `safety.recall.list`        | MISSING    | Current recall alerts          |
| 317 | HACCP plan               | `safety.haccp.get`          | MISSING    | HACCP plan details             |

### Write Operations (Tier 2)

| #   | Action               | Task Type                     | Safety      | Status  | Description             |
| --- | -------------------- | ----------------------------- | ----------- | ------- | ----------------------- |
| 318 | Log temperature      | `safety.temp_log`             | reversible  | MISSING | Record temp reading     |
| 319 | Create incident      | `safety.incident.create`      | significant | MISSING | Report safety incident  |
| 320 | Update incident      | `safety.incident.update`      | reversible  | MISSING | Update incident details |
| 321 | Create certification | `safety.certification.create` | reversible  | MISSING | Add certification       |
| 322 | Update certification | `safety.certification.update` | reversible  | MISSING | Edit certification      |
| 323 | Dismiss recall       | `safety.recall.dismiss`       | significant | MISSING | Dismiss recall alert    |
| 324 | Toggle HACCP section | `safety.haccp.toggle_section` | reversible  | MISSING | Toggle HACCP section    |

### Banned (Tier 3)

| #   | Action               | Task Type                     | Status     | Why Banned        |
| --- | -------------------- | ----------------------------- | ---------- | ----------------- |
| 325 | Delete temp log      | `safety.temp_log.delete`      | **BANNED** | Compliance record |
| 326 | Delete certification | `safety.certification.delete` | **BANNED** | Compliance record |

---

## 13. ANALYTICS & REPORTING

### Read Operations (Tier 1)

| #   | Action                 | Task Type                        | Status  | Description                |
| --- | ---------------------- | -------------------------------- | ------- | -------------------------- |
| 327 | Revenue forecast       | `analytics.revenue_forecast`     | MISSING | Projected revenue          |
| 328 | Pipeline forecast      | `analytics.pipeline_forecast`    | MISSING | Pipeline revenue forecast  |
| 329 | Conversion funnel      | `analytics.conversion_funnel`    | MISSING | Inquiry → event conversion |
| 330 | Referral analytics     | `analytics.referral`             | MISSING | Referral source analysis   |
| 331 | Retention stats        | `analytics.retention`            | MISSING | Client retention rates     |
| 332 | Seasonal performance   | `analytics.seasonal`             | MISSING | Seasonal trends            |
| 333 | Top clients            | `analytics.top_clients`          | MISSING | Highest-value clients      |
| 334 | Food cost trend        | `analytics.food_cost_trend`      | MISSING | Food cost over time        |
| 335 | Quote acceptance stats | `analytics.quote_acceptance`     | MISSING | Quote win/loss rates       |
| 336 | Dish performance       | `analytics.dish_performance`     | MISSING | Which dishes perform best  |
| 337 | NPS stats              | `analytics.nps`                  | MISSING | Net promoter score         |
| 338 | Benchmarks             | `analytics.benchmarks`           | MISSING | Business benchmarks        |
| 339 | Demand forecast        | `analytics.demand_forecast`      | MISSING | AI demand prediction       |
| 340 | Pricing suggestion     | `analytics.pricing_suggestion`   | MISSING | AI pricing recommendations |
| 341 | Menu recommendations   | `analytics.menu_recommendations` | MISSING | AI menu suggestions        |
| 342 | Open date suggestions  | `analytics.open_dates`           | MISSING | Optimal open dates         |
| 343 | Revenue gap analysis   | `analytics.revenue_gap`          | MISSING | Revenue closure analysis   |
| 344 | Daily report           | `analytics.daily_report`         | MISSING | Auto daily report          |

### Write Operations (Tier 2)

| #   | Action                  | Task Type              | Safety     | Status  | Description       |
| --- | ----------------------- | ---------------------- | ---------- | ------- | ----------------- |
| 345 | Export events CSV       | `report.export.events` | reversible | MISSING | Export all events |
| 346 | Export single event CSV | `report.export.event`  | reversible | MISSING | Export one event  |
| 347 | Run custom report       | `report.custom`        | reversible | MISSING | Custom report     |

---

## 14. AFTER-ACTION REVIEWS (AAR)

### Read Operations (Tier 1)

| #   | Action                    | Task Type             | Status  | Description                 |
| --- | ------------------------- | --------------------- | ------- | --------------------------- |
| 348 | List recent AARs          | `aar.list`            | MISSING | Recent after-action reviews |
| 349 | Get AAR                   | `aar.get`             | MISSING | Specific AAR detail         |
| 350 | Get AAR by event          | `aar.get_by_event`    | MISSING | AAR for a specific event    |
| 351 | Events without AAR        | `aar.events_without`  | MISSING | Events needing review       |
| 352 | AAR stats                 | `aar.stats`           | MISSING | AAR overview stats          |
| 353 | Forgotten items frequency | `aar.forgotten_items` | MISSING | Most-forgotten items        |

### Write Operations (Tier 2)

| #   | Action              | Task Type            | Safety     | Status  | Description         |
| --- | ------------------- | -------------------- | ---------- | ------- | ------------------- |
| 354 | Create AAR          | `aar.create`         | reversible | MISSING | Create manually     |
| 355 | Update AAR          | `aar.update`         | reversible | MISSING | Edit AAR            |
| 356 | Generate AAR draft  | `aar.generate_draft` | reversible | MISSING | AI-generate AAR     |
| 357 | Save recipe debrief | `aar.recipe_debrief` | reversible | MISSING | Debrief on a recipe |

---

## 15. CONTINGENCY PLANNING

### Read Operations (Tier 1)

| #   | Action                | Task Type                         | Status  | Description             |
| --- | --------------------- | --------------------------------- | ------- | ----------------------- |
| 358 | Get contingency notes | `contingency.get`                 | MISSING | Event contingency plans |
| 359 | List backup contacts  | `contingency.backup_contact.list` | MISSING | Emergency contacts      |

### Write Operations (Tier 2)

| #   | Action                     | Task Type                           | Safety     | Status     | Description               |
| --- | -------------------------- | ----------------------------------- | ---------- | ---------- | ------------------------- |
| 360 | Upsert contingency note    | `contingency.upsert`                | reversible | MISSING    | Create/update contingency |
| 361 | Generate contingency plans | `contingency.generate`              | reversible | MISSING    | AI-generate plans         |
| 362 | Create backup contact      | `contingency.backup_contact.create` | reversible | MISSING    | Add emergency contact     |
| 363 | Update backup contact      | `contingency.backup_contact.update` | reversible | MISSING    | Edit contact              |
| 364 | Add emergency contact      | `agent.add_emergency_contact`       | reversible | **EXISTS** | Add emergency contact     |

### Banned (Tier 3)

| #   | Action                    | Task Type                               | Status     | Why Banned    |
| --- | ------------------------- | --------------------------------------- | ---------- | ------------- |
| 365 | Delete contingency note   | `contingency.note.delete`               | **BANNED** | Safety record |
| 366 | Deactivate backup contact | `contingency.backup_contact.deactivate` | **BANNED** | Safety record |

---

## 16. EQUIPMENT & CONTRACTS

### Read Operations (Tier 1)

| #   | Action                    | Task Type                        | Status  | Description             |
| --- | ------------------------- | -------------------------------- | ------- | ----------------------- |
| 367 | List equipment            | `equipment.list`                 | MISSING | All equipment items     |
| 368 | Equipment depreciation    | `equipment.depreciation`         | MISSING | Depreciation values     |
| 369 | Explain depreciation (AI) | `equipment.depreciation.explain` | MISSING | AI-explain depreciation |
| 370 | Get event contract        | `contract.get`                   | MISSING | Contract for an event   |
| 371 | Contract versions         | `contract.versions`              | MISSING | Version history         |
| 372 | List contract templates   | `contract.template.list`         | MISSING | Available templates     |

### Write Operations (Tier 2)

| #   | Action                   | Task Type                   | Safety      | Status  | Description             |
| --- | ------------------------ | --------------------------- | ----------- | ------- | ----------------------- |
| 373 | Create equipment         | `equipment.create`          | reversible  | MISSING | Add equipment item      |
| 374 | Update equipment         | `equipment.update`          | reversible  | MISSING | Edit equipment          |
| 375 | Log maintenance          | `equipment.maintenance.log` | reversible  | MISSING | Record maintenance      |
| 376 | Log rental               | `equipment.rental.log`      | reversible  | MISSING | Record rental           |
| 377 | Generate contract        | `contract.generate`         | significant | MISSING | Generate event contract |
| 378 | Send contract            | `contract.send`             | significant | MISSING | Send contract to client |
| 379 | Sign contract            | `contract.sign`             | significant | MISSING | Sign contract           |
| 380 | Create contract template | `contract.template.create`  | reversible  | MISSING | Create template         |
| 381 | Update contract template | `contract.template.update`  | reversible  | MISSING | Edit template           |

### Banned (Tier 3)

| #   | Action                   | Task Type                  | Status     | Why Banned                   |
| --- | ------------------------ | -------------------------- | ---------- | ---------------------------- |
| 382 | Retire equipment         | `equipment.retire`         | **BANNED** | Irreversible                 |
| 383 | Void contract            | `contract.void`            | **BANNED** | Legal document — manual only |
| 384 | Delete contract template | `contract.template.delete` | **BANNED** | Permanent deletion           |

---

## 17. GOALS & TESTIMONIALS

### Read Operations (Tier 1)

| #   | Action              | Task Type              | Status  | Description          |
| --- | ------------------- | ---------------------- | ------- | -------------------- |
| 385 | Active goals        | `goals.list`           | MISSING | Current goals        |
| 386 | Goals dashboard     | `goals.dashboard`      | MISSING | Goals overview       |
| 387 | Revenue path        | `goals.revenue_path`   | MISSING | Path to revenue goal |
| 388 | List testimonials   | `testimonials.list`    | MISSING | All testimonials     |
| 389 | Review stats        | `reviews.stats`        | MISSING | Review metrics       |
| 390 | Unified review feed | `reviews.unified_feed` | MISSING | All reviews combined |

### Write Operations (Tier 2)

| #   | Action              | Task Type                   | Safety      | Status  | Description         |
| --- | ------------------- | --------------------------- | ----------- | ------- | ------------------- |
| 391 | Create goal         | `goals.create`              | reversible  | MISSING | Set a business goal |
| 392 | Update goal         | `goals.update`              | reversible  | MISSING | Edit goal           |
| 393 | Log goal check-in   | `goals.check_in`            | reversible  | MISSING | Record progress     |
| 394 | Create service type | `goals.service_type.create` | reversible  | MISSING | Add service type    |
| 395 | Approve testimonial | `testimonials.approve`      | significant | MISSING | Approve for display |
| 396 | Feature testimonial | `testimonials.feature`      | reversible  | MISSING | Feature/unfeature   |

### Banned (Tier 3)

| #   | Action       | Task Type       | Status     | Why Banned   |
| --- | ------------ | --------------- | ---------- | ------------ |
| 397 | Archive goal | `goals.archive` | **BANNED** | Irreversible |

---

## 18. NOTIFICATIONS & TASKS

### Read Operations (Tier 1)

| #   | Action                   | Task Type                       | Status  | Description             |
| --- | ------------------------ | ------------------------------- | ------- | ----------------------- |
| 398 | List notifications       | `notifications.list`            | MISSING | All notifications       |
| 399 | Notification preferences | `notifications.preferences.get` | MISSING | Current preferences     |
| 400 | List tasks               | `task.list`                     | MISSING | All tasks/todos         |
| 401 | List task templates      | `task.template.list`            | MISSING | Reusable task templates |

### Write Operations (Tier 2)

| #   | Action                    | Task Type                          | Safety      | Status     | Description                  |
| --- | ------------------------- | ---------------------------------- | ----------- | ---------- | ---------------------------- |
| 402 | Create todo               | `agent.create_todo`                | reversible  | **EXISTS** | Create task item             |
| 403 | Mark notifications read   | `notifications.mark_read`          | reversible  | MISSING    | Mark as read                 |
| 404 | Mark all read             | `notifications.mark_all_read`      | reversible  | MISSING    | Mark all read                |
| 405 | Update notification prefs | `notifications.preferences.update` | significant | MISSING    | Change notification settings |
| 406 | Update task               | `task.update`                      | reversible  | MISSING    | Edit task                    |
| 407 | Complete task             | `task.complete`                    | reversible  | MISSING    | Mark task done               |
| 408 | Create task template      | `task.template.create`             | reversible  | MISSING    | Create reusable template     |

### Banned (Tier 3)

| #   | Action      | Task Type     | Status     | Why Banned         |
| --- | ----------- | ------------- | ---------- | ------------------ |
| 409 | Delete task | `task.delete` | **BANNED** | Permanent deletion |

---

## 19. LOYALTY PROGRAM

### Read Operations (Tier 1)

| #   | Action                      | Task Type                     | Status     | Description              |
| --- | --------------------------- | ----------------------------- | ---------- | ------------------------ |
| 410 | Client loyalty status       | `loyalty.status`              | **EXISTS** | Tier, points, rewards    |
| 411 | Loyalty overview            | `loyalty.overview`            | MISSING    | Program-wide overview    |
| 412 | Loyalty transactions        | `loyalty.transactions`        | MISSING    | Transaction history      |
| 413 | Clients approaching rewards | `loyalty.approaching_rewards` | MISSING    | Who's close to next tier |
| 414 | Client loyalty profile      | `loyalty.client_profile`      | MISSING    | Full loyalty profile     |
| 415 | Loyalty config              | `loyalty.config.get`          | MISSING    | Program configuration    |
| 416 | List rewards                | `loyalty.reward.list`         | MISSING    | Available rewards        |
| 417 | Pending reward deliveries   | `loyalty.pending_deliveries`  | MISSING    | Undelivered rewards      |

### Write Operations (Tier 2)

| #   | Action                | Task Type                    | Safety      | Status  | Description              |
| --- | --------------------- | ---------------------------- | ----------- | ------- | ------------------------ |
| 418 | Update loyalty config | `loyalty.config.update`      | significant | MISSING | Change program settings  |
| 419 | Create reward         | `loyalty.reward.create`      | reversible  | MISSING | Create new reward        |
| 420 | Update reward         | `loyalty.reward.update`      | reversible  | MISSING | Edit reward              |
| 421 | Redeem reward         | `loyalty.reward.redeem`      | significant | MISSING | Redeem client reward     |
| 422 | Award bonus points    | `loyalty.award_points`       | significant | MISSING | Award extra points       |
| 423 | Award event points    | `loyalty.award_event_points` | significant | MISSING | Award points for event   |
| 424 | Create gift card      | `loyalty.gift_card.create`   | significant | MISSING | Create voucher/gift card |
| 425 | Send gift card        | `loyalty.gift_card.send`     | significant | MISSING | Send to client           |
| 426 | Mark reward delivered | `loyalty.delivery.mark`      | reversible  | MISSING | Mark as delivered        |

### Banned (Tier 3)

| #   | Action            | Task Type                   | Status     | Why Banned   |
| --- | ----------------- | --------------------------- | ---------- | ------------ |
| 427 | Deactivate reward | `loyalty.reward.deactivate` | **BANNED** | Irreversible |

---

## 20. CAMPAIGNS & MARKETING

### Read Operations (Tier 1)

| #   | Action               | Task Type                       | Status  | Description           |
| --- | -------------------- | ------------------------------- | ------- | --------------------- |
| 428 | List campaigns       | `campaign.list`                 | MISSING | All campaigns         |
| 429 | Campaign details     | `campaign.get`                  | MISSING | Specific campaign     |
| 430 | Campaign stats       | `campaign.stats`                | MISSING | Campaign performance  |
| 431 | List push dinners    | `campaign.push_dinner.list`     | MISSING | Push dinner campaigns |
| 432 | List email templates | `marketing.email_template.list` | MISSING | Saved email templates |

### Write Operations (Tier 2)

| #   | Action              | Task Type                         | Safety      | Status  | Description              |
| --- | ------------------- | --------------------------------- | ----------- | ------- | ------------------------ |
| 433 | Create campaign     | `campaign.create`                 | reversible  | MISSING | Create new campaign      |
| 434 | Create push dinner  | `campaign.push_dinner.create`     | reversible  | MISSING | Create push dinner event |
| 435 | Save email template | `marketing.email_template.create` | reversible  | MISSING | Save email template      |
| 436 | Create sequence     | `marketing.sequence.create`       | significant | MISSING | Create email sequence    |

### Banned (Tier 3)

| #   | Action            | Task Type       | Status     | Why Banned                       |
| --- | ----------------- | --------------- | ---------- | -------------------------------- |
| 437 | Send campaign now | `campaign.send` | **BANNED** | Remy never sends emails directly |

---

## 21. VENDORS & INVENTORY

### Read Operations (Tier 1)

| #   | Action              | Task Type                   | Status  | Description              |
| --- | ------------------- | --------------------------- | ------- | ------------------------ |
| 438 | List vendors        | `vendor.list`               | MISSING | All vendors              |
| 439 | Current stock       | `inventory.stock`           | MISSING | Current inventory levels |
| 440 | Expiry alerts       | `inventory.expiry_alerts`   | MISSING | Items expiring soon      |
| 441 | Par alerts          | `inventory.par_alerts`      | MISSING | Items below par level    |
| 442 | Reorder suggestions | `inventory.reorder`         | MISSING | What to reorder          |
| 443 | Waste dashboard     | `inventory.waste.dashboard` | MISSING | Waste tracking overview  |

### Write Operations (Tier 2)

| #   | Action                 | Task Type                | Safety      | Status  | Description         |
| --- | ---------------------- | ------------------------ | ----------- | ------- | ------------------- |
| 444 | Create vendor          | `vendor.create`          | reversible  | MISSING | Add vendor          |
| 445 | Update vendor          | `vendor.update`          | reversible  | MISSING | Edit vendor         |
| 446 | Upload vendor invoice  | `vendor.invoice.upload`  | reversible  | MISSING | Upload invoice      |
| 447 | Create purchase order  | `vendor.po.create`       | significant | MISSING | Create PO           |
| 448 | Submit PO              | `vendor.po.submit`       | significant | MISSING | Submit PO to vendor |
| 449 | Receive PO items       | `vendor.po.receive`      | reversible  | MISSING | Mark items received |
| 450 | Create inventory audit | `inventory.audit.create` | reversible  | MISSING | Start audit         |
| 451 | Log waste              | `inventory.waste.log`    | reversible  | MISSING | Record waste        |

### Banned (Tier 3)

| #   | Action            | Task Type           | Status     | Why Banned   |
| --- | ----------------- | ------------------- | ---------- | ------------ |
| 452 | Deactivate vendor | `vendor.deactivate` | **BANNED** | Irreversible |

---

## 22. CALLS & SCHEDULING

### Read Operations (Tier 1)

| #   | Action           | Task Type   | Status  | Description         |
| --- | ---------------- | ----------- | ------- | ------------------- |
| 453 | List calls       | `call.list` | MISSING | All scheduled calls |
| 454 | Get call details | `call.get`  | MISSING | Specific call info  |

### Write Operations (Tier 2)

| #   | Action             | Task Type                | Safety     | Status     | Description               |
| --- | ------------------ | ------------------------ | ---------- | ---------- | ------------------------- |
| 455 | Schedule call      | `agent.schedule_call`    | reversible | **EXISTS** | Schedule a call           |
| 456 | Log call outcome   | `agent.log_call_outcome` | reversible | **EXISTS** | Record what happened      |
| 457 | Cancel call        | `agent.cancel_call`      | reversible | **EXISTS** | Cancel scheduled call     |
| 458 | Update call        | `call.update`            | reversible | MISSING    | Edit call details         |
| 459 | Add agenda item    | `call.agenda.add`        | reversible | MISSING    | Add to call agenda        |
| 460 | Toggle agenda item | `call.agenda.toggle`     | reversible | MISSING    | Check/uncheck agenda item |
| 461 | Remove agenda item | `call.agenda.remove`     | reversible | MISSING    | Remove agenda item        |

---

## 23. SURVEYS & FEEDBACK

### Read Operations (Tier 1)

| #   | Action       | Task Type     | Status  | Description |
| --- | ------------ | ------------- | ------- | ----------- |
| 462 | List surveys | `survey.list` | MISSING | All surveys |

### Write Operations (Tier 2)

| #   | Action                      | Task Type                | Safety      | Status  | Description              |
| --- | --------------------------- | ------------------------ | ----------- | ------- | ------------------------ |
| 463 | Create survey               | `survey.create`          | reversible  | MISSING | Create post-event survey |
| 464 | Send survey                 | `survey.send`            | significant | MISSING | Send survey to client    |
| 465 | Extract survey answers (AI) | `survey.extract_answers` | reversible  | MISSING | AI-extract answers       |

---

## 24. SOCIAL MEDIA & PORTFOLIO

### Read Operations (Tier 1)

| #   | Action             | Task Type            | Status  | Description         |
| --- | ------------------ | -------------------- | ------- | ------------------- |
| 466 | List social posts  | `social.post.list`   | MISSING | All scheduled posts |
| 467 | Social connections | `social.connections` | MISSING | Connected platforms |
| 468 | List portfolio     | `portfolio.list`     | MISSING | Portfolio items     |

### Write Operations (Tier 2)

| #   | Action                 | Task Type                  | Safety     | Status  | Description          |
| --- | ---------------------- | -------------------------- | ---------- | ------- | -------------------- |
| 469 | Create social post     | `social.post.create`       | reversible | MISSING | Create draft post    |
| 470 | Update social post     | `social.post.update`       | reversible | MISSING | Edit post            |
| 471 | Generate captions (AI) | `social.captions.generate` | reversible | MISSING | AI-generate captions |
| 472 | Upload social asset    | `social.asset.upload`      | reversible | MISSING | Upload media         |
| 473 | Add portfolio item     | `portfolio.add`            | reversible | MISSING | Add to portfolio     |
| 474 | Reorder portfolio      | `portfolio.reorder`        | reversible | MISSING | Reorder items        |

### Banned (Tier 3)

| #   | Action                | Task Type            | Status     | Why Banned         |
| --- | --------------------- | -------------------- | ---------- | ------------------ |
| 475 | Delete social post    | `social.post.delete` | **BANNED** | Permanent deletion |
| 476 | Remove portfolio item | `portfolio.remove`   | **BANNED** | Permanent deletion |

---

## 25. OPERATIONS (Live Service)

### Read Operations (Tier 1)

| #   | Action        | Task Type          | Status     | Description           |
| --- | ------------- | ------------------ | ---------- | --------------------- |
| 477 | List stations | `station.list`     | MISSING    | All kitchen stations  |
| 478 | Packing list  | `ops.packing_list` | **EXISTS** | Generate packing list |

### Write Operations (Tier 2)

| #   | Action                  | Task Type                    | Safety      | Status  | Description             |
| --- | ----------------------- | ---------------------------- | ----------- | ------- | ----------------------- |
| 479 | Create station          | `station.create`             | reversible  | MISSING | Add kitchen station     |
| 480 | Update station          | `station.update`             | reversible  | MISSING | Edit station            |
| 481 | Fire course             | `ops.course.fire`            | significant | MISSING | Fire a service course   |
| 482 | Mark plated             | `ops.course.plated`          | reversible  | MISSING | Mark course plated      |
| 483 | Mark served             | `ops.course.served`          | reversible  | MISSING | Mark course served      |
| 484 | Mark 86'd               | `ops.course.86`              | significant | MISSING | 86 an item              |
| 485 | Set split billing       | `ops.split_billing`          | significant | MISSING | Configure split billing |
| 486 | Generate split invoices | `ops.split_invoice.generate` | significant | MISSING | Generate split invoices |
| 487 | Append ops log          | `ops.ops_log.append`         | reversible  | MISSING | Add to operations log   |
| 488 | Log station waste       | `ops.waste.log`              | reversible  | MISSING | Record station waste    |
| 489 | Create order request    | `ops.order.create`           | reversible  | MISSING | Create order request    |

### Banned (Tier 3)

| #   | Action         | Task Type        | Status     | Why Banned         |
| --- | -------------- | ---------------- | ---------- | ------------------ |
| 490 | Delete station | `station.delete` | **BANNED** | Permanent deletion |

---

## 26. PROSPECTING (Admin-Only)

> Per CLAUDE.md: "Prospecting is exclusively an admin feature." Remy must gate all prospecting behind `isAdmin()`.

### Read Operations (Tier 1)

| #   | Action            | Task Type                | Status  | Description              |
| --- | ----------------- | ------------------------ | ------- | ------------------------ |
| 491 | List prospects    | `prospect.list`          | MISSING | All prospects            |
| 492 | Prospect details  | `prospect.details`       | MISSING | Specific prospect        |
| 493 | Prospect stats    | `prospect.stats`         | MISSING | Pipeline statistics      |
| 494 | Pipeline by stage | `prospect.pipeline`      | MISSING | Prospects by stage       |
| 495 | Stage history     | `prospect.stage_history` | MISSING | Stage transition history |
| 496 | Outreach log      | `prospect.outreach_log`  | MISSING | All outreach history     |
| 497 | Daily queue       | `prospect.daily_queue`   | MISSING | Today's prospect tasks   |

### Write Operations (Tier 2)

| #   | Action                | Task Type                     | Safety      | Status  | Description            |
| --- | --------------------- | ----------------------------- | ----------- | ------- | ---------------------- |
| 498 | Add prospect          | `prospect.add`                | reversible  | MISSING | Add manually           |
| 499 | Update prospect       | `prospect.update`             | reversible  | MISSING | Edit prospect          |
| 500 | Update pipeline stage | `prospect.stage.update`       | significant | MISSING | Move through pipeline  |
| 501 | Add prospect note     | `prospect.note.add`           | reversible  | MISSING | Add note               |
| 502 | Log outreach          | `prospect.outreach.log`       | reversible  | MISSING | Log outreach attempt   |
| 503 | Log prospect call     | `prospect.call.log`           | reversible  | MISSING | Log call               |
| 504 | Convert to inquiry    | `prospect.convert_to_inquiry` | significant | MISSING | Convert to inquiry     |
| 505 | Re-enrich prospect    | `prospect.enrich`             | reversible  | MISSING | AI research            |
| 506 | Geocode prospect      | `prospect.geocode`            | reversible  | MISSING | Geocode address        |
| 507 | Merge prospects       | `prospect.merge`              | significant | MISSING | Merge duplicates       |
| 508 | Find similar          | `prospect.find_similar`       | reversible  | MISSING | Find similar prospects |
| 509 | Lookalike search      | `prospect.lookalike`          | reversible  | MISSING | Lookalike targeting    |
| 510 | Create call script    | `prospect.call_script.create` | reversible  | MISSING | Generate call script   |
| 511 | Scrub prospects (AI)  | `prospect.scrub`              | reversible  | MISSING | AI research/enrich     |
| 512 | Import CSV            | `prospect.import`             | significant | MISSING | Import from CSV        |
| 513 | Export CSV            | `prospect.export`             | reversible  | MISSING | Export to CSV          |

### Banned (Tier 3)

| #   | Action                | Task Type              | Status     | Why Banned              |
| --- | --------------------- | ---------------------- | ---------- | ----------------------- |
| 514 | Delete prospect       | `prospect.delete`      | **BANNED** | Permanent deletion      |
| 515 | Bulk delete prospects | `prospect.bulk_delete` | **BANNED** | Bulk permanent deletion |
| 516 | Send prospect email   | `prospect.email.send`  | **BANNED** | Remy never sends emails |

---

## 27. SETTINGS & PROFILE

### Read Operations (Tier 1)

| #   | Action                | Task Type                     | Status     | Description             |
| --- | --------------------- | ----------------------------- | ---------- | ----------------------- |
| 517 | Chef culinary profile | `chef.culinary_profile`       | **EXISTS** | Cooking philosophy etc. |
| 518 | Favorite chefs        | `chef.favorite_chefs`         | **EXISTS** | Culinary heroes         |
| 519 | Gratuity settings     | `settings.gratuity.get`       | MISSING    | Current gratuity config |
| 520 | Subscription status   | `billing.subscription.status` | MISSING    | Current plan            |
| 521 | Enabled modules       | `billing.modules.enabled`     | MISSING    | Active modules          |
| 522 | Stripe Connect status | `billing.connect.status`      | MISSING    | Connect account status  |

### Write Operations (Tier 2)

| #   | Action                   | Task Type                     | Safety      | Status  | Description                |
| --- | ------------------------ | ----------------------------- | ----------- | ------- | -------------------------- |
| 523 | Update profile           | `settings.profile.update`     | reversible  | MISSING | Edit chef profile          |
| 524 | Update preferences       | `settings.preferences.update` | reversible  | MISSING | Edit preferences           |
| 525 | Update slug              | `settings.slug.update`        | significant | MISSING | Change public URL slug     |
| 526 | Update tagline           | `settings.tagline.update`     | reversible  | MISSING | Change tagline             |
| 527 | Update gratuity settings | `settings.gratuity.update`    | significant | MISSING | Change gratuity config     |
| 528 | Update portal theme      | `settings.portal_theme`       | reversible  | MISSING | Change client portal theme |
| 529 | Upload logo              | `settings.logo.upload`        | reversible  | MISSING | Upload business logo       |
| 530 | Set business mode        | `settings.business_mode`      | significant | MISSING | Change business mode       |
| 531 | Toggle module            | `billing.module.toggle`       | significant | MISSING | Enable/disable module      |

### Banned (Tier 3)

| #   | Action                     | Task Type                      | Status     | Why Banned                              |
| --- | -------------------------- | ------------------------------ | ---------- | --------------------------------------- |
| 532 | Modify user roles          | `agent.modify_roles`           | **BANNED** | Security — manual only                  |
| 533 | Open billing portal        | `billing.portal.open`          | **BANNED** | Security — Stripe redirect, manual only |
| 534 | Connect Google Calendar    | `scheduling.google.connect`    | **BANNED** | OAuth — manual only                     |
| 535 | Disconnect Google Calendar | `scheduling.google.disconnect` | **BANNED** | Irreversible — manual only              |

---

## 28. GROCERY & INGREDIENTS

### Read Operations (Tier 1)

| #   | Action                  | Task Type           | Status     | Description           |
| --- | ----------------------- | ------------------- | ---------- | --------------------- |
| 536 | Quick-add grocery items | `grocery.quick_add` | **EXISTS** | Parse NL grocery list |

### Write Operations (Tier 2)

| #   | Action             | Task Type                  | Safety     | Status     | Description          |
| --- | ------------------ | -------------------------- | ---------- | ---------- | -------------------- |
| 537 | Run grocery quote  | `agent.run_grocery_quote`  | reversible | **EXISTS** | Price-check via APIs |
| 538 | Log grocery actual | `agent.log_grocery_actual` | reversible | **EXISTS** | Record actual spend  |

---

## 29. INTAKE & PARSING

### Write Operations (Tier 2)

| #   | Action              | Task Type                   | Safety     | Status     | Description                    |
| --- | ------------------- | --------------------------- | ---------- | ---------- | ------------------------------ |
| 539 | Parse transcript    | `agent.intake_transcript`   | reversible | **EXISTS** | Extract data from conversation |
| 540 | Import bulk clients | `agent.intake_bulk_clients` | reversible | **EXISTS** | Import from pasted list/CSV    |
| 541 | Parse brain dump    | `agent.intake_brain_dump`   | reversible | **EXISTS** | Parse freeform notes           |

---

## 30. PROACTIVE & INTELLIGENCE

### Read Operations (Tier 1)

| #   | Action           | Task Type    | Status     | Description              |
| --- | ---------------- | ------------ | ---------- | ------------------------ |
| 542 | Proactive nudges | `nudge.list` | **EXISTS** | Things needing attention |
| 543 | Navigation       | `nav.go`     | **EXISTS** | Navigate to app page     |
| 544 | Web search       | `web.search` | **EXISTS** | Internet search          |
| 545 | Web page read    | `web.read`   | **EXISTS** | Read a URL               |

### Write Operations (Tier 2)

| #   | Action                    | Task Type                 | Safety     | Status     | Description                   |
| --- | ------------------------- | ------------------------- | ---------- | ---------- | ----------------------------- |
| 546 | Daily briefing            | `agent.daily_briefing`    | reversible | **EXISTS** | Morning briefing              |
| 547 | What's next               | `agent.whats_next`        | reversible | **EXISTS** | Next best action              |
| 548 | Search documents (agent)  | `agent.search_documents`  | reversible | **EXISTS** | Search docs (agent version)   |
| 549 | Create doc folder (agent) | `agent.create_doc_folder` | reversible | **EXISTS** | Create folder (agent version) |

---

## 31. DATA EXPORT & COMPLIANCE

### Write Operations (Tier 2)

| #   | Action               | Task Type                | Safety      | Status  | Description      |
| --- | -------------------- | ------------------------ | ----------- | ------- | ---------------- |
| 550 | Export all chef data | `compliance.export_data` | significant | MISSING | GDPR data export |

---

## 32. ADMIN TIME & CHARITY

### Read Operations (Tier 1)

| #   | Action               | Task Type            | Status  | Description               |
| --- | -------------------- | -------------------- | ------- | ------------------------- |
| 551 | Admin time for event | `admin_time.get`     | MISSING | Non-billable time logged  |
| 552 | Charity hours list   | `charity.hours.list` | MISSING | Charity hours history     |
| 553 | Charity financials   | `charity.financials` | MISSING | Charity financial summary |

### Write Operations (Tier 2)

| #   | Action            | Task Type           | Safety     | Status  | Description           |
| --- | ----------------- | ------------------- | ---------- | ------- | --------------------- |
| 554 | Log admin time    | `admin_time.log`    | reversible | MISSING | Log non-billable time |
| 555 | Log charity hours | `charity.hours.log` | reversible | MISSING | Log charity hours     |

---

## SUMMARY

| Category                  | EXISTS | MISSING | BANNED | Total   |
| ------------------------- | ------ | ------- | ------ | ------- |
| Clients                   | 6      | 13      | 3      | 22      |
| Events                    | 14     | 19      | 3      | 36      |
| Inquiries                 | 6      | 9       | 2      | 17      |
| Quotes                    | 2      | 8       | 1      | 11      |
| Menus                     | 11     | 14      | 5      | 30      |
| Calendar & Scheduling     | 3      | 16      | 3      | 22      |
| Recipes                   | 3      | 6       | 3      | 12      |
| Finance & Payments        | 6      | 20      | 10     | 36      |
| Staff                     | 3      | 15      | 1      | 19      |
| Documents                 | 3      | 15      | 1      | 19      |
| Email & Comms             | 16     | 2       | 3      | 21      |
| Safety & Compliance       | 3      | 10      | 2      | 15      |
| Analytics & Reporting     | 0      | 21      | 0      | 21      |
| AAR                       | 0      | 10      | 0      | 10      |
| Contingency               | 1      | 4       | 2      | 7       |
| Equipment & Contracts     | 0      | 9       | 3      | 12      |
| Goals & Testimonials      | 0      | 8       | 1      | 9       |
| Notifications & Tasks     | 1      | 7       | 1      | 9       |
| Loyalty                   | 1      | 16      | 1      | 18      |
| Campaigns & Marketing     | 0      | 4       | 1      | 5       |
| Vendors & Inventory       | 0      | 11      | 1      | 12      |
| Calls                     | 3      | 5       | 0      | 8       |
| Surveys & Feedback        | 0      | 3       | 0      | 3       |
| Social & Portfolio        | 0      | 6       | 2      | 8       |
| Operations (Live Service) | 1      | 11      | 1      | 13      |
| Prospecting (Admin)       | 0      | 16      | 3      | 19      |
| Settings & Profile        | 2      | 9       | 4      | 15      |
| Grocery & Ingredients     | 3      | 0       | 0      | 3       |
| Intake & Parsing          | 3      | 0       | 0      | 3       |
| Proactive & Intelligence  | 6      | 0       | 0      | 6       |
| Data Export & Compliance  | 0      | 1       | 0      | 1       |
| Admin Time & Charity      | 0      | 5       | 0      | 5       |
| **TOTAL**                 | **97** | **307** | **57** | **461** |

### By Status

- **EXISTS:** 97 actions Remy can already do
- **MISSING:** 307 actions that need to be built
- **BANNED:** 57 actions that are permanently restricted

### By Tier

- **Tier 1 (Auto-Execute):** 152 read-only operations
- **Tier 2 (Preview + Approve):** 252 write operations
- **Tier 3 (Banned):** 57 permanently restricted
