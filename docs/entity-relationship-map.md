# ChefFlow Entity Relationship Map

> Complete inventory of every entity-to-entity relationship in the database.
> Generated 2026-03-06 from all 90+ migration files.

---

## The Core Entities (Nodes in the Graph)

| Entity               | Table               | What It Represents                                    |
| -------------------- | ------------------- | ----------------------------------------------------- |
| **Auth User**        | `auth.users`        | Supabase auth identity (email + password)             |
| **Chef**             | `chefs`             | A private chef business (also the tenant)             |
| **Client**           | `clients`           | A chef's client (may or may not have an auth account) |
| **Staff Member**     | `staff_members`     | A chef's hired staff (sous chef, server, etc.)        |
| **Event Guest**      | `event_guests`      | A guest RSVP'd to a client's event                    |
| **Referral Partner** | `referral_partners` | A venue/planner that sends the chef leads             |
| **Vendor**           | `vendors`           | A supplier the chef buys from                         |

These are the "people" in the system. Everything else (events, quotes, messages, etc.) is a **relationship** or **interaction** between them.

---

## CATEGORY 1: Identity & Access (Who Are You?)

These connect a real person to their role in the system.

| Relationship                | Table                | FK Columns                                                          | Type | Notes                                                       |
| --------------------------- | -------------------- | ------------------------------------------------------------------- | ---- | ----------------------------------------------------------- |
| Auth User IS a Chef         | `chefs`              | `auth_user_id` -> `auth.users(id)`                                  | 1:1  | Unique constraint                                           |
| Auth User IS a Client       | `clients`            | `auth_user_id` -> `auth.users(id)`                                  | 1:1  | Nullable (clients can exist as leads without accounts)      |
| Auth User HAS a Role        | `user_roles`         | `auth_user_id` -> `auth.users(id)`, `entity_id` -> chefs or clients | 1:1  | Single source of truth for role. `entity_id` is polymorphic |
| Chef INVITES Client to join | `client_invitations` | `tenant_id` -> `chefs(id)`, `created_by` -> `auth.users(id)`        | N:1  | Chef sends invite, client accepts and gets an auth account  |

---

## CATEGORY 2: Tenant Ownership (Chef Owns Everything)

The chef is the tenant. Almost every table in the system has `tenant_id REFERENCES chefs(id) ON DELETE CASCADE`. This is multi-tenancy: a chef's data is completely isolated from other chefs.

**This is NOT a "relationship" in the social sense.** It's ownership/scoping. But it's the most common FK in the database (~120+ occurrences).

| Pattern                        | Meaning                                                   |
| ------------------------------ | --------------------------------------------------------- |
| `table.tenant_id -> chefs(id)` | "This record belongs to this chef's business"             |
| `ON DELETE CASCADE`            | "If the chef account is deleted, all their data goes too" |

**Tables with tenant scoping (non-exhaustive):** clients, events, inquiries, quotes, messages, ledger_entries, expenses, recipes, menus, ingredients, dishes, components, notifications, conversations, chat_messages, loyalty_transactions, loyalty_rewards, chef_documents, client_notes, chef_feedback, automation_rules, scheduled_calls, contracts, equipment, certifications, todos, campaigns, and 60+ more.

---

## CATEGORY 3: Chef-to-Client Relationships (The Core Business)

These are the primary business relationships: a chef serves clients.

| Relationship                              | Table                        | FK Columns                                                                                         | Type         | Notes                                              |
| ----------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------- | ------------ | -------------------------------------------------- |
| Client BELONGS TO Chef                    | `clients`                    | `tenant_id` -> `chefs(id)`                                                                         | N:1          | A chef has many clients                            |
| Client IS IN Household                    | `household_members`          | `household_id` -> `households(id)`, `client_id` -> `clients(id)`                                   | N:N junction | Groups clients into families                       |
| Household HAS Primary Contact             | `households`                 | `primary_client_id` -> `clients(id)`                                                               | N:1          | Lead contact for the household                     |
| Client CONNECTED TO Client                | `client_connections`         | `client_a_id` -> `clients(id)`, `client_b_id` -> `clients(id)`                                     | N:N junction | Chef tracks which of their clients know each other |
| Chef SENDS Inquiry Response TO Client     | `messages`                   | `from_user_id` -> `auth.users(id)`, `to_user_id` -> `auth.users(id)`, `client_id` -> `clients(id)` | N:N through  | Messages between chef and client                   |
| Chef HAS Conversation WITH Client         | `conversation_participants`  | `conversation_id` -> `conversations(id)`, `auth_user_id` -> `auth.users(id)`                       | N:N junction | Real-time chat participants                        |
| Chef LOGS Note ABOUT Client               | `client_notes`               | `client_id` -> `clients(id)`, `tenant_id` -> `chefs(id)`                                           | N:1          | Private chef notes about a client                  |
| Chef LOGS Feedback ABOUT Client           | `chef_feedback`              | `client_id` -> `clients(id)`, `tenant_id` -> `chefs(id)`                                           | N:1          | Post-event feedback                                |
| Chef REVIEWS Client                       | `client_reviews`             | `client_id` -> `clients(id)`, `event_id` -> `events(id)`                                           | N:1          | Client review after event                          |
| Chef TRACKS Client Activity               | `activity_events`            | `client_id` -> `clients(id)`                                                                       | N:1          | CRM activity timeline                              |
| Chef TRACKS Client Activity (v2)          | `chef_activity_log`          | `client_id` -> `clients(id)`                                                                       | N:1          | Detailed activity log                              |
| Chef HAS Communication Thread WITH Client | `conversation_threads`       | `client_id` -> `clients(id)`                                                                       | N:1          | Unified inbox threads                              |
| Chef SENDS Notification TO Client         | `notifications`              | `recipient_id` -> `auth.users(id)`, `client_id` -> `clients(id)`                                   | N:1          | Push/email/in-app notifications                    |
| Chef SENDS Campaign TO Client             | `campaign_recipients`        | `client_id` -> `clients(id)`, `campaign_id` -> `marketing_campaigns(id)`                           | N:N junction | Marketing campaign recipients                      |
| Chef DOES Direct Outreach TO Client       | `direct_outreach_log`        | `client_id` -> `clients(id)`                                                                       | N:1          | 1:1 outreach tracking                              |
| Chef GIVES Incentive TO Client            | `client_incentives`          | `target_client_id` -> `clients(id)`                                                                | N:1          | Vouchers, gift cards                               |
| Client REDEEMS Incentive                  | `incentive_redemptions`      | `client_id` -> `clients(id)`, `incentive_id` -> `client_incentives(id)`                            | N:1          | Gift card/voucher usage                            |
| Chef TRACKS Client Loyalty                | `loyalty_transactions`       | `client_id` -> `clients(id)`                                                                       | N:1          | Points earned/redeemed                             |
| Client REDEEMS Loyalty Reward             | `loyalty_reward_redemptions` | `client_id` -> `clients(id)`, `reward_id` -> `loyalty_rewards(id)`                                 | N:1          | Specific reward redemption                         |
| Chef RECORDS Client Allergies             | `client_allergy_records`     | `client_id` -> `clients(id)`                                                                       | N:1          | Structured allergy data                            |
| Chef SEGMENTS Clients                     | `client_segments`            | `tenant_id` -> `chefs(id)`                                                                         | N:1          | Client grouping/tagging                            |
| Chef SUGGESTS Client for Goal             | `goal_client_suggestions`    | `client_id` -> `clients(id)`, `goal_id` -> `chef_goals(id)`                                        | N:N junction | "Contact these clients to hit revenue goal"        |
| Chef SCHEDULES Call WITH Client           | `scheduled_calls`            | `client_id` -> `clients(id)`                                                                       | N:1          | Meeting/call scheduling                            |
| Chef CREATES Contract FOR Client          | `event_contracts`            | `client_id` -> `clients(id)`, `chef_id` -> `chefs(id)`                                             | N:1          | Legal agreement                                    |
| Chef REQUESTS Menu Approval FROM Client   | `menu_approval_requests`     | `client_id` -> `clients(id)`, `chef_id` -> `chefs(id)`                                             | N:1          | Client approves menu                               |
| Chef HAS Recurring Service FOR Client     | `recurring_services`         | `client_id` -> `clients(id)`, `chef_id` -> `chefs(id)`                                             | N:1          | Weekly meal prep, etc.                             |
| Chef TRACKS Dish History FOR Client       | `served_dish_history`        | `client_id` -> `clients(id)`                                                                       | N:1          | What was served when                               |
| Chef CREATES Invoice FOR Client           | `recurring_invoices`         | `client_id` -> `clients(id)`                                                                       | N:1          | Recurring billing                                  |
| Client CREATES Event Share Link           | `event_shares`               | `created_by_client_id` -> `clients(id)`                                                            | N:1          | Client shares event with guests                    |
| Client ON Waitlist                        | `waitlist_entries`           | `client_id` -> `clients(id)`                                                                       | N:1          | Date-based waitlist                                |

---

## CATEGORY 4: Chef-to-Chef Relationships (The Network)

These are peer-to-peer connections between chefs. They span across tenants.

| Relationship                      | Table                         | FK Columns                                                            | Type         | Notes                                                                 |
| --------------------------------- | ----------------------------- | --------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------- |
| Chef CONNECTS WITH Chef           | `chef_connections`            | `requester_id` -> `chefs(id)`, `addressee_id` -> `chefs(id)`          | N:N junction | Friend request with status (pending/accepted/declined). Cross-tenant. |
| Chef SHARES Contact WITH Chef     | `chef_network_contact_shares` | `sender_chef_id` -> `chefs(id)`, `recipient_chef_id` -> `chefs(id)`   | N:N junction | "Here's a great client for you"                                       |
| Chef POSTS to Network             | `chef_network_posts`          | `author_chef_id` -> `chefs(id)`                                       | N:1          | Network feed posts                                                    |
| Chef FOLLOWS Chef                 | `chef_follows`                | `follower_chef_id` -> `chefs(id)`, `following_chef_id` -> `chefs(id)` | N:N junction | Social follow                                                         |
| Chef POSTS to Social              | `chef_social_posts`           | `chef_id` -> `chefs(id)`                                              | N:1          | Social platform posts                                                 |
| Chef REPOSTS Chef's Post          | `chef_social_posts`           | `original_post_id` -> `chef_social_posts(id)`                         | Self-ref     | Repost/share                                                          |
| Chef REACTS to Chef's Post        | `chef_post_reactions`         | `chef_id` -> `chefs(id)`, `post_id` -> `chef_social_posts(id)`        | N:N junction | Like/love/etc.                                                        |
| Chef COMMENTS on Chef's Post      | `chef_post_comments`          | `chef_id` -> `chefs(id)`, `post_id` -> `chef_social_posts(id)`        | N:N junction | Discussion                                                            |
| Chef REPLIES to Chef's Comment    | `chef_post_comments`          | `parent_comment_id` -> `chef_post_comments(id)`                       | Self-ref     | Threaded replies                                                      |
| Chef REACTS to Chef's Comment     | `chef_comment_reactions`      | `chef_id` -> `chefs(id)`, `comment_id` -> `chef_post_comments(id)`    | N:N junction | Reaction on comment                                                   |
| Chef SAVES Chef's Post            | `chef_post_saves`             | `chef_id` -> `chefs(id)`, `post_id` -> `chef_social_posts(id)`        | N:N junction | Bookmarking                                                           |
| Chef MENTIONS Chef in Post        | `chef_post_mentions`          | `mentioned_chef_id` -> `chefs(id)`, `post_id` / `comment_id`          | N:N junction | @mentions                                                             |
| Chef JOINS Channel                | `chef_channel_memberships`    | `chef_id` -> `chefs(id)`, `channel_id` -> `chef_social_channels(id)`  | N:N junction | Group membership                                                      |
| Chef CREATES Channel              | `chef_social_channels`        | `created_by_chef_id` -> `chefs(id)`                                   | N:1          | Channel ownership                                                     |
| Chef POSTS Story                  | `chef_stories`                | `chef_id` -> `chefs(id)`                                              | N:1          | Ephemeral content                                                     |
| Chef VIEWS Chef's Story           | `chef_story_views`            | `viewer_chef_id` -> `chefs(id)`, `story_id` -> `chef_stories(id)`     | N:N junction | View tracking                                                         |
| Chef REACTS to Chef's Story       | `chef_story_reactions`        | `chef_id` -> `chefs(id)`, `story_id` -> `chef_stories(id)`            | N:N junction | Story reaction                                                        |
| Chef RECEIVES Social Notification | `chef_social_notifications`   | `recipient_chef_id`, `actor_chef_id` -> `chefs(id)`                   | N:1          | "Chef X liked your post"                                              |

---

## CATEGORY 5: Chef-to-Staff Relationships

| Relationship                | Table                     | FK Columns                                                           | Type         | Notes                                                                    |
| --------------------------- | ------------------------- | -------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------ |
| Chef EMPLOYS Staff          | `staff_members`           | `chef_id` -> `chefs(id)`                                             | N:1          | Chef's team roster                                                       |
| Chef ASSIGNS Staff TO Event | `event_staff_assignments` | `staff_member_id` -> `staff_members(id)`, `event_id` -> `events(id)` | N:N junction | Staff working an event. ON DELETE RESTRICT (can't delete assigned staff) |
| Chef PAYS Staff             | `contractor_payments`     | `staff_member_id` -> `staff_members(id)`, `chef_id` -> `chefs(id)`   | N:1          | Payment records. ON DELETE RESTRICT                                      |

---

## CATEGORY 6: Chef-to-Vendor Relationships

| Relationship            | Table                 | FK Columns                                                         | Type         | Notes                                    |
| ----------------------- | --------------------- | ------------------------------------------------------------------ | ------------ | ---------------------------------------- |
| Chef USES Vendor        | `vendors`             | `chef_id` -> `chefs(id)`                                           | N:1          | Supplier roster                          |
| Vendor HAS Price Points | `vendor_price_points` | `vendor_id` -> `vendors(id)`, `ingredient_id` -> `ingredients(id)` | N:N junction | What this vendor charges for ingredients |

---

## CATEGORY 7: Chef-to-Referral Partner Relationships

| Relationship              | Table               | FK Columns                                       | Type | Notes                   |
| ------------------------- | ------------------- | ------------------------------------------------ | ---- | ----------------------- |
| Chef HAS Referral Partner | `referral_partners` | `tenant_id` -> `chefs(id)`                       | N:1  | Venues, planners, etc.  |
| Partner HAS Locations     | `partner_locations` | `partner_id` -> `referral_partners(id)`          | N:1  | Multi-location partners |
| Partner REFERRED Inquiry  | `inquiries`         | `referral_partner_id` -> `referral_partners(id)` | N:1  | Lead source tracking    |
| Partner REFERRED Event    | `events`            | `referral_partner_id` -> `referral_partners(id)` | N:1  | Event attribution       |

---

## CATEGORY 8: Event as a Relationship Hub

An event is where chef, client, staff, guests, vendors, and partners all converge. It's the central relationship node.

| Relationship                     | Table                     | FK Columns                                       | Type |
| -------------------------------- | ------------------------- | ------------------------------------------------ | ---- |
| Event IS FOR Client              | `events`                  | `client_id` -> `clients(id)`                     | N:1  |
| Event OWNED BY Chef              | `events`                  | `tenant_id` -> `chefs(id)`                       | N:1  |
| Event CAME FROM Inquiry          | `events`                  | `inquiry_id` -> `inquiries(id)`                  | N:1  |
| Event REFERRED BY Partner        | `events`                  | `referral_partner_id` -> `referral_partners(id)` | N:1  |
| Event AT Partner Location        | `events`                  | `partner_location_id` -> `partner_locations(id)` | N:1  |
| Event SERVES Household           | `events`                  | `household_id` -> `households(id)`               | N:1  |
| Event HAS Menu                   | `events`                  | `menu_id` -> `menus(id)`                         | N:1  |
| Event HAS Quote                  | `quotes`                  | `event_id` -> `events(id)`                       | N:1  |
| Event HAS Contract               | `event_contracts`         | `event_id` -> `events(id)`                       | 1:1  |
| Event HAS Staff Assignments      | `event_staff_assignments` | `event_id` -> `events(id)`                       | 1:N  |
| Event HAS Guest RSVPs            | `event_guests`            | `event_id` -> `events(id)`                       | 1:N  |
| Event HAS Share Links            | `event_shares`            | `event_id` -> `events(id)`                       | 1:N  |
| Event HAS Ledger Entries         | `ledger_entries`          | `event_id` -> `events(id)`                       | 1:N  |
| Event HAS Expenses               | `expenses`                | `event_id` -> `events(id)`                       | 1:N  |
| Event HAS Messages               | `messages`                | `event_id` -> `events(id)`                       | 1:N  |
| Event HAS Photos                 | `event_photos`            | `event_id` -> `events(id)`                       | 1:N  |
| Event HAS Temp Logs              | `event_temp_logs`         | `event_id` -> `events(id)`                       | 1:N  |
| Event HAS Contingency Notes      | `event_contingency_notes` | `event_id` -> `events(id)`                       | 1:N  |
| Event HAS Prep Blocks            | `event_prep_blocks`       | `event_id` -> `events(id)`                       | 1:N  |
| Event HAS Readiness Gates        | `event_readiness_gates`   | `event_id` -> `events(id)`                       | 1:N  |
| Event HAS Receipt Photos         | `receipt_photos`          | `event_id` -> `events(id)`                       | 1:N  |
| Event HAS AAR                    | `after_action_reviews`    | `event_id` -> `events(id)`                       | 1:1  |
| Event HAS Menu Approval          | `menu_approval_requests`  | `event_id` -> `events(id)`                       | 1:1  |
| Event HAS Menu Modifications     | `menu_modifications`      | `event_id` -> `events(id)`                       | 1:N  |
| Event HAS Unused Ingredients     | `unused_ingredients`      | `event_id` -> `events(id)`                       | 1:N  |
| Event HAS Shopping Substitutions | `shopping_substitutions`  | `event_id` -> `events(id)`                       | 1:N  |
| Event HAS State Transitions      | `event_state_transitions` | `event_id` -> `events(id)`                       | 1:N  |
| Event HAS Loyalty Transactions   | `loyalty_transactions`    | `event_id` -> `events(id)`                       | 1:N  |
| Event HAS Payment Disputes       | `payment_disputes`        | `event_id` -> `events(id)`                       | 1:N  |
| Event HAS Notifications          | `notifications`           | `event_id` -> `events(id)`                       | 1:N  |

---

## CATEGORY 9: Audit Trail Relationships (Who Did What?)

Almost every write operation records who performed it via `auth.users(id)`.

| Pattern                                 | Tables                                                                                                                   | Meaning                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| `created_by -> auth.users(id)`          | events, quotes, expenses, ledger_entries, documents, recipes, menus, dishes, components, todos, incentives, photos, etc. | Who created this record           |
| `updated_by -> auth.users(id)`          | events, quotes, expenses, documents, recipes, menus, dishes, components, loyalty_rewards, etc.                           | Who last modified this record     |
| `transitioned_by -> auth.users(id)`     | event_state_transitions, inquiry_state_transitions, quote_state_transitions, menu_state_transitions                      | Who triggered this state change   |
| `approved_by -> auth.users(id)`         | messages                                                                                                                 | Who approved an outbound message  |
| `logged_by -> auth.users(id)`           | chef_feedback                                                                                                            | Who logged the feedback           |
| `overridden_by -> auth.users(id)`       | event_readiness_gates                                                                                                    | Who overrode a gate check         |
| `actor_auth_user_id -> auth.users(id)`  | copilot_actions                                                                                                          | Who executed an AI recommendation |
| `redeemed_by_user_id -> auth.users(id)` | incentive_redemptions                                                                                                    | Who redeemed a gift card          |

---

## CATEGORY 10: Self-Referential Relationships

| Relationship                           | Table                | FK Columns                                      | Notes                                          |
| -------------------------------------- | -------------------- | ----------------------------------------------- | ---------------------------------------------- |
| Refund LINKS TO Original Payment       | `ledger_entries`     | `refunded_entry_id` -> `ledger_entries(id)`     | Append-only ledger, refund references original |
| Ingredient TRANSFERRED TO Future Event | `unused_ingredients` | `transferred_to_event_id` -> `events(id)`       | Leftover reuse tracking                        |
| Comment REPLIES TO Comment             | `chef_post_comments` | `parent_comment_id` -> `chef_post_comments(id)` | Threaded discussion                            |
| Post IS Repost OF Post                 | `chef_social_posts`  | `original_post_id` -> `chef_social_posts(id)`   | Social sharing                                 |

---

## CATEGORY 11: External System Integrations

| Relationship                        | Table                        | FK Columns                                       | Notes                  |
| ----------------------------------- | ---------------------------- | ------------------------------------------------ | ---------------------- |
| Chef HAS Integration Connection     | `integration_connections`    | `chef_id` -> `chefs(id)`                         | Wix, Gmail, etc.       |
| Connection PRODUCES Events          | `integration_events`         | `connection_id` -> `integration_connections(id)` | Sync events            |
| Connection HAS Sync Jobs            | `integration_sync_jobs`      | `connection_id` -> `integration_connections(id)` | Import/export runs     |
| Connection HAS Field Mappings       | `integration_field_mappings` | `connection_id` -> `integration_connections(id)` | Schema mapping         |
| Chef HAS API Keys                   | `chef_api_keys`              | `tenant_id` -> `chefs(id)`                       | Developer API access   |
| Chef HAS Webhook Endpoints          | `webhook_endpoints`          | `tenant_id` -> `chefs(id)`                       | Outbound webhooks      |
| Chef HAS Bank Connections           | `bank_connections`           | `chef_id` -> `chefs(id)`                         | Financial integrations |
| Bank Transaction MATCHED TO Expense | `bank_transactions`          | `matched_expense_id` -> `expenses(id)`           | Reconciliation         |
| Chef HAS Push Subscriptions         | `push_subscriptions`         | `auth_user_id` -> `auth.users(id)`               | Web push               |

---

## Summary Statistics

| Metric                                                      | Count |
| ----------------------------------------------------------- | ----- |
| **Total tables with FKs**                                   | ~130  |
| **Total FK constraints**                                    | ~350+ |
| **True entity-to-entity (people-to-people) relationships**  | ~55   |
| **Tenant scoping FKs (`tenant_id -> chefs`)**               | ~120  |
| **Audit trail FKs (`created_by/updated_by -> auth.users`)** | ~80   |
| **Event hub FKs (X -> `events`)**                           | ~30   |
| **Cross-tenant relationships (chef-to-chef)**               | ~18   |
| **Junction/association tables**                             | ~20   |

---

## The Relationship Hierarchy

```
                    auth.users (identity layer)
                    /         \
                   /           \
              chefs             clients
           (tenant)           (per-tenant)
              |                    |
    +---------+---------+    +----+----+
    |         |         |    |         |
  staff    vendors   partners  households
    |                   |         |
    +-------+-----------+---------+
            |
         EVENTS  (the convergence point)
            |
    +---+---+---+---+---+---+
    |   |   |   |   |   |   |
  menus quotes payments guests photos contracts ...
```

**Chef-to-Chef relationships (cross-tenant):**

```
  Chef A  <------>  Chef B
           connections
           follows
           contact shares
           social interactions (posts, reactions, comments, mentions, stories)
           channel memberships
```

**Client-to-Client relationships (within tenant):**

```
  Client A  <---->  Client B
              client_connections (chef tracks who knows who)
              household_members (family grouping)
```
