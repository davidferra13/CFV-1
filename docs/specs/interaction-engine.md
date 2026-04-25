# ChefFlow Interaction Engine Spec

## 1. Executive Summary

ChefFlow has many interaction systems, but no universal interaction engine.

Audited source evidence:

- Source-bearing scan: 7,069 files across `app`, `components`, `hooks`, `lib`, `database`, `tests`, and `docs/specs`.
- API routes: 340 route files under `app/api`, including 151 `v2` route files, 37 `scheduled` route files, 18 `cron` route files, 17 document routes, realtime, push, booking, webhooks, kiosk, calling, and hub-public routes.
- Server actions/mutation handlers: 1,648 exported interaction-like functions in `lib`, led by `ai` (176), `hub` (84), `clients` (61), `events` (60), `finance` (56), `commerce` (48), `staff` (43), `sharing` (41), `menus` (40), `scheduling` (37), `communication` (36), and `social` (36).
- UI interaction markers: 5,049 `onClick`, `onSubmit`, `formAction`, `useActionState`, `useFormState`, and submit markers; 2,377 UI imports from action modules; 64 direct `/api` fetches.
- Database: 682 Drizzle `pgTable` declarations in `lib/db/schema/schema.ts`.

Current canonical interaction support is partial:

- `lib/clients/interaction-ledger.ts` builds a client relationship ledger from events, inquiries, messages, notes, quotes, ledger entries, reviews, activity events, menus, menu revisions, and document versions.
- `lib/clients/interaction-ledger-core.ts:113` defines `ClientInteractionLedgerEntry`; `lib/clients/interaction-ledger-core.ts:632` builds entries.
- This ledger is client-scoped only. It does not cover hub, chef network, notifications, automations, commerce, staff, discovery, public bookings, AI, or operational execution as one registry.

Build target:

Create a universal `interaction_events` system where every UI, API, webhook, cron, server action, realtime signal, and AI/automation action resolves to:

```ts
{
  ;(id,
    action_type,
    actor_id,
    target_type,
    target_id,
    context_type,
    context_id,
    state,
    visibility,
    permissions,
    created_at,
    updated_at)
}
```

The existing systems must be bridged, not replaced in one step.

## 2. Audit Evidence

Primary source anchors:

| Surface                   | Evidence                                                                                                                                                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema tables             | `lib/db/schema/schema.ts:861`, `1593`, `1716`, `2319`, `2551`, `3755`, `4229`, `4432`, `11893`, `14021`, `14078`, `14931`, `16129`, `18450`, `22671`, `22786`, `22977`, `23453`, `23705`, `23745`, `24811`, `25035`           |
| Client interaction ledger | `lib/clients/interaction-ledger.ts:1`, `lib/clients/interaction-ledger.ts:97`, `lib/clients/interaction-ledger-core.ts:113`, `lib/clients/interaction-ledger-core.ts:632`                                                     |
| Activity API              | `app/api/activity/track/route.ts:32`, `app/api/activity/feed/route.ts:24`, `app/api/activity/breadcrumbs/route.ts:12`                                                                                                         |
| Realtime APIs             | `app/api/realtime/[channel]/route.ts:27`, `app/api/realtime/presence/route.ts:28`, `app/api/realtime/typing/route.ts:7`                                                                                                       |
| Messaging/chat            | `lib/messages/actions.ts:66`, `lib/chat/actions.ts:108`, `lib/chat/actions.ts:452`, `lib/chat/actions.ts:922`, `lib/hub/message-actions.ts:39`, `lib/hub/message-actions.ts:491`                                              |
| Hub/circles               | `lib/hub/group-actions.ts:33`, `lib/hub/group-actions.ts:158`, `lib/hub/group-actions.ts:378`, `lib/hub/group-actions.ts:714`                                                                                                 |
| Events                    | `lib/events/actions.ts:124`, `lib/events/actions.ts:422`, `lib/events/actions.ts:752`, `lib/events/transitions.ts:56`, `lib/events/transitions.ts:1547`                                                                       |
| Quotes                    | `lib/quotes/actions.ts:102`, `lib/quotes/actions.ts:362`, `lib/quotes/actions.ts:518`, `lib/quotes/client-actions.ts:281`, `lib/quotes/client-actions.ts:408`                                                                 |
| Menus                     | `lib/menus/actions.ts:173`, `lib/menus/actions.ts:449`, `lib/menus/actions.ts:808`, `lib/menus/approval-portal.ts:13`, `lib/menus/approval-portal.ts:306`                                                                     |
| Notifications             | `lib/notifications/actions.ts:38`, `lib/notifications/actions.ts:314`, `lib/notifications/actions.ts:333`, `lib/notifications/actions.ts:354`, `lib/notifications/send.ts:69`, `lib/notifications/channel-router.ts:45`       |
| Public booking            | `components/booking/booking-form.tsx:8`, `app/api/book/route.ts:74`, `lib/inquiries/public-actions.ts:117`, `lib/booking/instant-book-actions.ts:189`                                                                         |
| Automation/cron           | `app/api/cron/event-progression/route.ts:32`, `app/api/cron/booking-escalation/route.ts:118`, `app/api/cron/circle-digest/route.ts:12`, `app/api/scheduled/sequences/route.ts:10`, `lib/automations/automation-actions.ts:65` |
| Permissions               | `middleware.ts:74`, `middleware.ts:197`, `lib/auth/permissions.ts:199`, `lib/auth/permissions.ts:235`, `lib/db/schema/schema.ts:24818`                                                                                        |

Existing test/catalog support:

- `docs/specs/bob-and-joy-action-catalog.md` states an exhaustive test surface of about 1,400 user actions.
- `tests/interactions/*` contains interaction browser tests by domain.
- These are supporting artifacts, not the source of truth for this spec. Code files above are the source of truth.

## 3. Full Interaction Inventory

Each row is a code-traced interaction family. A family can contain many UI buttons, API endpoints, and server actions.

### Layer 1: Content Interactions

| Interaction                        | action_type                                             | target_type | Trigger                     | Data flow                                                                         | Permissions and visibility                                     | Sources                                                                                                                                  |
| ---------------------------------- | ------------------------------------------------------- | ----------- | --------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Create/update/delete menu          | `menu.create`, `menu.update`, `menu.delete`             | `menu`      | UI/server action/API        | UI imports menu actions; actions write `menus`, `menu_items`, revisions           | Chef tenant scope; menu status controls sharing                | `lib/menus/actions.ts:173`, `449`, `612`; `lib/db/schema/schema.ts:11893`                                                                |
| Transition menu state              | `menu.transition`                                       | `menu`      | UI/server action            | `transitionMenu` changes menu state and logs transitions                          | Chef tenant scope; states include draft/shared/locked/archived | `lib/menus/actions.ts:808`; `lib/db/schema/schema.ts:4432`                                                                               |
| Send/approve menu proposal         | `menu.proposal.send`, `menu.approve`                    | `menu`      | Client portal / chef action | Proposal creates approval request; client approval/revision updates menu approval | Client token/session or chef session                           | `lib/menus/approval-portal.ts:13`, `198`, `306`; `app/(client)/my-events/[id]/approve-menu/menu-approval-client.tsx:55`                  |
| Menu preferences and dish feedback | `menu.feedback.submit`                                  | `menu`      | Client UI                   | Preference action writes menu preference/feedback records                         | Client access to event/menu                                    | `lib/menus/preference-actions.ts:40`, `142`; `lib/db/schema/schema.ts:23453`                                                             |
| Document generation/download       | `document.generate`, `document.download`                | `system`    | API/UI                      | Route validates event/context and generates PDF/snapshot                          | Chef/client route-specific auth                                | `app/api/documents/[eventId]/route.ts:301`, `app/api/documents/[eventId]/bulk-generate/route.ts:89`, `lib/documents/auto-generate.ts:95` |
| Upload/import media                | `media.upload`, `photo.upload`                          | `content`   | UI/server action            | Upload action writes media/photo table and storage URL                            | Chef/client/hub role dependent                                 | `lib/hub/media-actions.ts:26`, `66`; `lib/clients/photo-actions.ts:65`                                                                   |
| Notes and pinned notes             | `note.create`, `note.update`, `note.pin`, `note.delete` | `content`   | UI/server action            | Notes actions write client/inquiry/workflow/hub note tables                       | Tenant or group membership                                     | `lib/notes/actions.ts:56`, `153`; `lib/hub/message-actions.ts:708`, `774`; `lib/db/schema/schema.ts:1654`                                |

### Layer 2: Social Interactions

| Interaction                               | action_type                                                                                          | target_type | Trigger               | Data flow                                             | Permissions and visibility                          | Sources                                                                                        |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------- | --------------------- | ----------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Create/join/update/leave hub group        | `hub.create`, `hub.join`, `hub.update`, `hub.leave`                                                  | `system`    | Public/client/chef UI | Group actions write `hub_groups`, `hub_group_members` | Public/private group visibility; member permissions | `lib/hub/group-actions.ts:33`, `158`, `378`, `714`; `lib/db/schema/schema.ts:14931`, `14078`   |
| Hub message/reaction/read                 | `hub.message.post`, `hub.message.pin`, `hub.read`                                                    | `message`   | Group UI/API          | Writes `hub_messages`, reads, reactions               | Group profile token or member role                  | `lib/hub/message-actions.ts:39`, `254`, `491`, `520`; `lib/db/schema/schema.ts:14021`, `13909` |
| Friend requests and dinner circle invites | `friend.request`, `friend.accept`, `friend.decline`, `circle.invite.request`                         | `user`      | Client hub UI         | Friend action writes hub friend/request state         | Profile-token/member access                         | `lib/hub/friend-actions.ts:75`, `110`, `146`, `186`                                            |
| Chef network connection                   | `network.connection.request`, `network.connection.respond`, `network.profile.update`                 | `user`      | Chef network UI       | Network actions write chef connection/profile rows    | Chef role required                                  | `lib/network/actions.ts:910`, `978`, `1044`, `1079`; `lib/db/schema/schema.ts:1593`            |
| Collaboration handoff                     | `collab.handoff.create`, `collab.handoff.respond`, `collab.handoff.cancel`, `collab.handoff.convert` | `event`     | Chef network UI       | Writes handoff rows, notifications, conversion data   | Connected chef and recipient checks                 | `lib/network/collab-actions.ts:939`, `1202`, `1267`, `1314`                                    |
| Opportunity/social posts                  | `network.post.create`, `opportunity.interest`                                                        | `content`   | Chef network UI       | Writes network/community post and interest records    | Chef/member scoped                                  | `lib/network/opportunity-actions.ts:104`, `242`; `lib/network/actions.ts:1192`                 |

### Layer 3: Communication

| Interaction                         | action_type                                                                                        | target_type | Trigger                       | Data flow                                                | Permissions and visibility                    | Sources                                                                                                                                                        |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- | ----------- | ----------------------------- | -------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create/update/delete legacy message | `message.create`, `message.update`, `message.delete`                                               | `message`   | Chef UI/server action         | Writes `messages` table                                  | Tenant scope                                  | `lib/messages/actions.ts:66`, `269`, `294`; `lib/db/schema/schema.ts:18450`                                                                                    |
| Chat conversation/message/read      | `chat.conversation.create`, `chat.message.send`, `chat.read`                                       | `message`   | Chef/client chat UI           | Writes `conversations`, `chat_messages`; broadcasts SSE  | Conversation participant membership           | `lib/chat/actions.ts:108`, `452`, `922`; `lib/db/schema/schema.ts:2551`                                                                                        |
| Scheduled message                   | `message.schedule`, `message.cancel`                                                               | `message`   | UI/server action/cron         | Writes `scheduled_messages`; scheduled route sends later | Tenant and context checks                     | `lib/communication/scheduled-message-actions.ts:76`, `123`; `lib/db/schema/schema.ts:23705`                                                                    |
| Email/SMS notification dispatch     | `notification.route`, `notification.email.send`, `notification.sms.send`, `notification.push.send` | `system`    | Server action/automation/cron | Router selects channel; delivery log records result      | Notification preferences and off-hours checks | `lib/notifications/channel-router.ts:45`, `lib/notifications/email-service.ts:125`, `lib/notifications/sms-service.ts:54`, `lib/notifications/onesignal.ts:45` |
| Twilio calling and voicemail        | `call.inbound`, `call.gather`, `call.recording`, `call.voicemail`                                  | `message`   | Webhook/API                   | Twilio routes verify webhook and update call records     | Twilio signature/feature flag                 | `app/api/calling/inbound/route.ts:49`, `app/api/calling/gather/route.ts:249`, `app/api/calling/recording/route.ts:12`, `app/api/calling/voicemail/route.ts:14` |
| Managed channel message             | `communication.managed.send`                                                                       | `message`   | Server action                 | Sends via managed Twilio/channel logic                   | Channel config and tenant checks              | `lib/communication/managed-channels.ts:532`                                                                                                                    |

### Layer 4: Discovery

| Interaction                        | action_type                                                   | target_type | Trigger                 | Data flow                                                         | Permissions and visibility                       | Sources                                                                                                                |
| ---------------------------------- | ------------------------------------------------------------- | ----------- | ----------------------- | ----------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Public chef/directory browse       | `discovery.browse`, `chef.profile.view`                       | `user`      | Public UI               | Public profile/directory actions read approved public records     | Public visibility flags                          | `app/(public)/chef/[slug]/page.tsx:25`, `app/(public)/chefs/page.tsx:14`, `lib/directory/actions.ts`                   |
| Nearby search, alerts, nominations | `discovery.search`, `waitlist.alert.save`, `listing.nominate` | `system`    | Public UI               | Waitlist/discover actions write directory intent                  | Public form validation                           | `app/(public)/nearby/_components/unmet-demand-capture.tsx:10`, `app/(public)/nearby/_components/nomination-form.tsx:5` |
| Global/API search                  | `search.query`                                                | `system`    | UI/API                  | Search routes/actions query content and entities                  | Role or API scope                                | `app/api/v2/search/route.ts`; `app/api/help/search/route.ts`                                                           |
| Public booking discovery           | `booking.intent.submit`, `booking.parse`                      | `event`     | Public booking form/API | Booking route creates inquiry/booking intent, may create checkout | Public guard, rate limits, tenant lookup         | `components/booking/booking-form.tsx:8`, `app/api/book/route.ts:74`, `app/api/book/parse/route.ts:10`                  |
| Public/event share token views     | `share.view`, `event.public.view`                             | `event`     | Public token route      | Token lookups expose limited event/portal data                    | Token visibility; no index for private hub pages | `app/(public)/e/[shareToken]/public-event-view.tsx:4`, `app/(public)/hub/g/[groupToken]/page.tsx:177`                  |

### Layer 5: Creation

| Interaction                   | action_type                                                        | target_type | Trigger                      | Data flow                                                                  | Permissions and visibility                        | Sources                                                                                |
| ----------------------------- | ------------------------------------------------------------------ | ----------- | ---------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Create/update/delete event    | `event.create`, `event.update`, `event.delete`                     | `event`     | Chef UI/server action/v2 API | Writes `events`; related docs, staff, menu, finance systems read it        | Chef tenant scope                                 | `lib/events/actions.ts:124`, `422`, `752`; `lib/db/schema/schema.ts:22977`             |
| Create/update/convert inquiry | `inquiry.create`, `inquiry.update`, `inquiry.convert`              | `event`     | Public/chef UI/API           | Inquiry actions write `inquiries`; conversion creates event/client context | Public or chef tenant scope                       | `lib/inquiries/actions.ts:443`, `805`, `1922`, `2267`; `lib/db/schema/schema.ts:22671` |
| Create/update/delete client   | `client.create`, `client.update`, `client.delete`, `client.invite` | `user`      | Chef UI/API                  | Client actions write `clients`, invitations, household                     | Chef tenant scope; client portal separate         | `lib/clients/actions.ts:209`, `327`, `662`, `896`; `lib/db/schema/schema.ts:22786`     |
| Create/update/delete quote    | `quote.create`, `quote.update`, `quote.delete`                     | `event`     | Chef UI/API                  | Quote actions write `quotes`, line items, transitions                      | Chef tenant; client can accept/reject sent quotes | `lib/quotes/actions.ts:102`, `362`, `937`; `lib/db/schema/schema.ts:16129`             |
| Create todo/task              | `todo.create`, `todo.toggle`, `task.create`                        | `system`    | Dashboard/task UI            | Writes todos/tasks and dependencies                                        | Chef/staff scope                                  | `lib/todos/actions.ts:174`, `306`, `341`; `lib/tasks/actions.ts`                       |
| AI-assisted creation          | `ai.generate.*`, `remy.command.run`                                | `system`    | Remy/UI/API                  | AI actions generate drafts, documents, menus, summaries, commands          | AI privacy gates and restricted actions           | `lib/ai/command-orchestrator.ts:2823`, `3009`; `lib/ai/draft-actions.ts:127`           |

### Layer 6: Moderation

| Interaction                    | action_type                                           | target_type | Trigger                | Data flow                                                          | Permissions and visibility    | Sources                                                                                                |
| ------------------------------ | ----------------------------------------------------- | ----------- | ---------------------- | ------------------------------------------------------------------ | ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| Admin directory review         | `admin.directory.approve`, `admin.directory.revoke`   | `content`   | Admin UI/API           | Admin actions update directory/listing state                       | Admin role                    | `app/(admin)/admin/directory/_components/directory-toggle-row.tsx:7`, `lib/directory/admin-actions.ts` |
| Owner moderation               | `admin.moderation.*`                                  | `content`   | Admin UI/server action | Owner moderation actions update flagged content                    | Platform admin                | `lib/admin/owner-moderation-actions.ts`                                                                |
| Feature flags                  | `flag.toggle`, `feature.enable`                       | `system`    | Admin/settings UI      | Writes `chef_feature_flags` or billing modules                     | Admin/chef permissions        | `components/admin/flag-toggle-panel.tsx:8`, `lib/db/schema/schema.ts:25035`                            |
| Location change review         | `partner.location.review`                             | `system`    | API/admin              | Review endpoint applies approve/reject to partner location request | Review route and admin action | `app/api/partners/location-change-requests/[requestId]/review/route.ts:3`                              |
| Abuse/failure dismissal/repair | `failure.dismiss`, `failure.repair`, `remy.abuse.log` | `system`    | Admin UI/API           | Monitoring/remy actions log abuse or repair failed side effects    | Admin/system                  | `app/(admin)/admin/silent-failures/silent-failures-client.tsx:5`, `lib/monitoring/failure-actions.ts`  |

### Layer 7: Engagement

| Interaction                           | action_type                                                                                                    | target_type | Trigger                | Data flow                                                  | Permissions and visibility           | Sources                                                                                            |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------- | ---------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Activity tracking                     | `activity.track`                                                                                               | `system`    | Browser/API            | Writes `activity_events` with event/entity metadata        | Authenticated role; rate-limited API | `app/api/activity/track/route.ts:32`; `lib/db/schema/schema.ts:2319`                               |
| Breadcrumb tracking                   | `breadcrumb.track`                                                                                             | `system`    | Browser/API            | Writes `chef_breadcrumbs`; retrace actions read sessions   | Chef role                            | `app/api/activity/breadcrumbs/route.ts:12`; `lib/activity/breadcrumb-actions.ts`                   |
| Notification read/archive/preferences | `notification.read`, `notification.archive`, `notification.preference.update`                                  | `system`    | Bell/UI/settings       | Mutates notification rows/preferences                      | Recipient-only                       | `lib/notifications/actions.ts:314`, `333`, `354`, `447`; `lib/db/schema/schema.ts:1716`, `4229`    |
| Loyalty reward/redemption             | `loyalty.award`, `loyalty.redeem`, `raffle.draw`                                                               | `user`      | Client/chef/scheduled  | Loyalty actions write transactions, rewards, raffles       | Tenant/client scope                  | `lib/loyalty/actions.ts:770`, `1172`, `1193`; `lib/loyalty/raffle-actions.ts:215`                  |
| Survey/review/testimonial             | `survey.submit`, `review.submit`, `testimonial.approve`                                                        | `content`   | Public/client/admin UI | Survey/review actions write feedback records and approvals | Token/client/admin dependent         | `lib/communication/survey-actions.ts:182`, `lib/reviews/actions.ts`, `lib/testimonials/actions.ts` |
| Client quick actions                  | `client.quick.guest_count`, `client.quick.dietary`, `client.quick.running_late`, `client.quick.repeat_booking` | `event`     | Client hub UI          | Posts structured hub messages and quick request state      | Profile token/group member           | `lib/hub/client-quick-actions.ts:26`, `157`, `276`, `354`                                          |

### Layer 8: Presence

| Interaction                | action_type          | target_type | Trigger           | Data flow                                                           | Permissions and visibility               | Sources                                                                  |
| -------------------------- | -------------------- | ----------- | ----------------- | ------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------ |
| Realtime channel subscribe | `realtime.subscribe` | `system`    | SSE/browser       | Channel route streams messages/events                               | Session authorization and channel checks | `app/api/realtime/[channel]/route.ts:27`                                 |
| Presence heartbeat         | `presence.update`    | `system`    | Browser/API       | Presence route validates session/channel and updates presence state | Participant membership                   | `app/api/realtime/presence/route.ts:28`                                  |
| Typing signal              | `typing.update`      | `message`   | Browser/API       | Typing endpoint validates session/channel and broadcasts            | Participant membership                   | `app/api/realtime/typing/route.ts:7`                                     |
| Client portal heartbeat    | `session.heartbeat`  | `system`    | Browser component | Session heartbeat posts activity events                             | Client portal auth/token                 | `components/activity/session-heartbeat.tsx:31`                           |
| Hub read receipts          | `hub.read`           | `message`   | Group UI          | Hub read actions write `hub_message_reads`                          | Profile token/group member               | `lib/hub/message-actions.ts:491`, `520`; `lib/db/schema/schema.ts:13909` |

### Layer 9: Personalization

| Interaction                         | action_type                                                  | target_type | Trigger               | Data flow                                                                      | Permissions and visibility                  | Sources                                                                                                   |
| ----------------------------------- | ------------------------------------------------------------ | ----------- | --------------------- | ------------------------------------------------------------------------------ | ------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Client preferences/profile          | `client.profile.update`, `preference.record`                 | `user`      | Client/chef UI        | Profile/preference actions update client profile, meal favorites, dietary data | Client self or chef tenant                  | `lib/clients/client-profile-actions.ts:165`, `386`, `504`, `686`; `lib/clients/preference-actions.ts:206` |
| Dietary dashboard and alerts        | `dietary.update`, `dietary.alert.log`                        | `user`      | UI/server action      | Dietary actions write allergy/preference/alert records                         | Tenant/client scoped                        | `lib/clients/dietary-dashboard-actions.ts:247`; `lib/clients/dietary-alert-actions.ts:133`                |
| Notification settings               | `notification.preference.update`, `notification.tier.update` | `system`    | Settings UI/API       | Updates preferences, SMS settings, tier configs                                | Recipient/chef/admin scope                  | `lib/notifications/settings-actions.ts:112`, `178`; `lib/notifications/tier-actions.ts:69`                |
| Dashboard/nav/layout preference     | `preference.ui.update`, `archetype.select`                   | `system`    | Settings/dashboard UI | Writes chef/client dashboard prefs and archetype state                         | Authenticated role                          | `lib/dashboard/widget-actions.ts`, `lib/archetypes/actions.ts`                                            |
| Feature/billing module settings     | `module.toggle`, `billing.preference.update`                 | `system`    | Settings UI           | Writes module or billing config state                                          | Chef/admin; Pro gates                       | `lib/billing/module-actions.ts`, `lib/billing/require-pro.ts`                                             |
| Availability/public signal settings | `availability.signal.toggle`                                 | `system`    | Calendar/settings UI  | Signal settings expose target dates publicly                                   | Chef setting plus public profile visibility | `components/calendar/availability-signal-toggle.tsx:8`; `lib/calendar/signal-settings-actions.ts`         |

### Layer 10: Structure

| Interaction                    | action_type                                                                            | target_type | Trigger               | Data flow                                                                      | Permissions and visibility           | Sources                                                                                            |
| ------------------------------ | -------------------------------------------------------------------------------------- | ----------- | --------------------- | ------------------------------------------------------------------------------ | ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Event FSM transition           | `event.transition`, `event.propose`, `event.confirm`, `event.complete`, `event.cancel` | `event`     | UI/server action/cron | `transitionEvent` changes `events.status` and writes `event_state_transitions` | Chef/client/system depending wrapper | `lib/events/transitions.ts:56`, `1547`, `1573`, `1600`, `1613`; `lib/db/schema/schema.ts:861`      |
| Quote transition               | `quote.transition`, `quote.accept`, `quote.reject`                                     | `event`     | Chef/client UI        | Quote status changes and quote transition records                              | Chef or client on sent quote         | `lib/quotes/actions.ts:518`; `lib/quotes/client-actions.ts:281`, `408`                             |
| Hub member role/permissions    | `hub.member.role.update`, `hub.member.permission.update`                               | `user`      | Group settings UI     | Updates member role/permissions                                                | Group owner/chef                     | `lib/hub/group-actions.ts:566`, `612`                                                              |
| Event collaborator permissions | `event.collaborator.update`                                                            | `user`      | Collaboration UI      | Updates collaborator role and JSONB permissions                                | Event owner/collaborator gates       | `lib/collaboration/actions.ts:279`; `lib/db/schema/schema.ts:24811`, `24818`                       |
| Taxonomy/custom fields         | `taxonomy.create`, `taxonomy.update`, `field.update`                                   | `system`    | Settings/API          | Writes taxonomy/custom field rows                                              | Tenant scope                         | `app/api/v2/settings/taxonomy/route.ts`, `lib/taxonomy/actions.ts`, `lib/custom-fields/actions.ts` |
| Task dependencies/order        | `task.dependency.update`                                                               | `system`    | Task UI               | Writes task dependency/order records                                           | Chef/staff scoped                    | `lib/tasks/dependency-actions.ts`; `lib/db/schema/schema.ts:24959`                                 |

### Layer 11: Transactional

| Interaction                     | action_type                                                                                      | target_type | Trigger                       | Data flow                                                          | Permissions and visibility | Sources                                                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------ | ----------- | ----------------------------- | ------------------------------------------------------------------ | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stripe checkout/payment webhook | `payment.checkout`, `payment.succeeded`, `payment.failed`, `refund.created`, `dispute.created`   | `event`     | Client UI/webhook             | Checkout creates Stripe session; webhook updates ledger/payments   | Stripe signature/admin DB  | `app/api/webhooks/stripe/route.ts:25`, `471`, `1046`, `1217`, `1411`; `lib/stripe/actions.ts`                                                        |
| Client payment intent           | `payment.intent.create`                                                                          | `event`     | Client portal                 | Creates Stripe payment intent                                      | Client event access        | `app/(client)/my-events/[id]/pay/payment-section.tsx:8`; `lib/stripe/actions.ts`                                                                     |
| Commerce sale/payment/refund    | `commerce.sale.create`, `commerce.payment.record`, `commerce.refund.create`, `commerce.checkout` | `event`     | POS/kiosk/API                 | Commerce routes/actions write sales/payments/refunds               | Chef/kiosk session         | `app/api/v2/commerce/checkout/route.ts:7`, `app/api/v2/commerce/sales/[id]/payments/route.ts:8`, `app/api/v2/commerce/sales/[id]/refunds/route.ts:8` |
| Ticket purchase/comp/walk-in    | `ticket.purchase`, `ticket.comp.create`, `ticket.walkin.create`                                  | `event`     | Public/chef UI                | Ticket actions write ticket purchase/type state                    | Public share token or chef | `app/(public)/e/[shareToken]/public-event-view.tsx:4`; `lib/tickets/actions.ts:36`, `207`, `283`, `419`                                              |
| Gift card/voucher               | `gift_card.purchase`, `voucher.send`, `voucher.redeem`                                           | `system`    | Public/client/chef UI/webhook | Writes incentives, redemption, Stripe session state                | Token/client/tenant checks | `lib/loyalty/gift-card-purchase-actions.ts:54`; `lib/loyalty/voucher-actions.ts:211`, `440`; `lib/loyalty/redemption-actions.ts:173`                 |
| Refund/cancellation             | `refund.initiate`, `event.cancel.client`                                                         | `event`     | Client/chef UI                | Cancellation/refund actions update events and ledger/payment state | Event owner/client access  | `lib/cancellation/refund-actions.ts`; `lib/events/client-actions.ts:195`, `238`                                                                      |

### Layer 12: Chef-Native

| Interaction                         | action_type                                                    | target_type | Trigger                 | Data flow                                                   | Permissions and visibility   | Sources                                                                                                       |
| ----------------------------------- | -------------------------------------------------------------- | ----------- | ----------------------- | ----------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Prep timeline/block/task completion | `prep.block.create`, `prep.block.complete`, `dop.task.toggle`  | `event`     | Chef UI                 | Writes prep blocks/DOP completions                          | Chef tenant/staff assignment | `lib/scheduling/prep-block-actions.ts:426`, `634`; `lib/scheduling/dop-completions.ts:34`                     |
| Grocery/list/document generation    | `grocery.list.generate`, `shopping.list.generate`              | `event`     | Chef UI/API             | Generates grocery list docs/snapshots                       | Chef tenant                  | `lib/documents/generate-grocery-list.ts:712`, `lib/hub/meal-board-shopping-list.ts:42`                        |
| Gear/equipment/service readiness    | `gear.check`, `equipment.assign`, `service.readiness.update`   | `event`     | Chef UI                 | Gear/service actions write assignments/checklists/readiness | Chef tenant/staff            | `lib/gear/actions.ts`, `lib/events/equipment-checklist-actions.ts`, `lib/service-execution/actions.ts`        |
| Live service execution              | `service.start`, `service.update`, `course.fire`, `time.track` | `event`     | Chef/staff UI           | Writes live status/time tracking/course progress            | Chef/staff event access      | `lib/events/time-tracking.ts`, `lib/events/fire-order.ts`, `lib/service-execution/actions.ts`                 |
| AAR/debrief/post-event learning     | `aar.create`, `debrief.update`, `learning.record`              | `event`     | Chef UI/AI              | Writes AAR/debrief/learning records                         | Chef tenant                  | `lib/aar/actions.ts`, `lib/events/debrief-actions.ts`, `lib/post-event/learning-actions.ts`                   |
| Ingredient/recipe costing           | `recipe.update`, `ingredient.price.refresh`, `costing.refresh` | `content`   | Chef UI/sync/automation | Writes recipes, ingredients, pricing tables                 | Chef tenant/OpenClaw sync    | `lib/recipes/actions.ts`, `lib/pricing/cost-refresh-actions.ts`, `lib/openclaw/price-intelligence-actions.ts` |

### Layer 13: Automation

| Interaction                            | action_type                                                                   | target_type | Trigger          | Data flow                                                   | Permissions and visibility | Sources                                                                                                                                                        |
| -------------------------------------- | ----------------------------------------------------------------------------- | ----------- | ---------------- | ----------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cron event progression                 | `cron.event_progression.run`                                                  | `system`    | Cron API         | Scans events and transitions state                          | `CRON_SECRET`/cron auth    | `app/api/cron/event-progression/route.ts:32`                                                                                                                   |
| Booking escalation                     | `cron.booking_escalation.run`                                                 | `system`    | Cron API         | Escalates stale booking/inquiry state                       | Cron auth                  | `app/api/cron/booking-escalation/route.ts:118`                                                                                                                 |
| Circle digest                          | `cron.circle_digest.run`                                                      | `message`   | Cron API         | Builds/sends circle digest notifications                    | Cron auth                  | `app/api/cron/circle-digest/route.ts:12`                                                                                                                       |
| Scheduled sequence/campaign processing | `scheduled.sequence.process`, `scheduled.campaign.process`                    | `system`    | Scheduled API    | Processes marketing/sequences/campaigns                     | `CRON_SECRET`              | `app/api/scheduled/sequences/route.ts:10`, `app/api/scheduled/campaigns/route.ts:8`                                                                            |
| Automation rule execution              | `automation.rule.create`, `automation.rule.execute`, `automation.rule.toggle` | `system`    | UI/cron/API      | Writes rules/execution logs and performs side effects       | Tenant scope               | `lib/communication/automation-actions.ts:65`, `155`, `193`; `lib/db/schema/schema.ts:23745`                                                                    |
| AI queue/scheduled jobs                | `ai.queue.enqueue`, `ai.queue.drain`, `ai.job.run`                            | `system`    | UI/API/scheduled | Queue registry/worker runs AI work                          | Policy/tenant scope        | `lib/ai/queue/registry.ts`, `lib/ai/scheduled/job-definitions.ts`, `app/api/scheduled/ai-queue-drain/route.ts`                                                 |
| Webhook ingestion                      | `webhook.receive`                                                             | `system`    | External POST    | Webhooks validate signatures/secrets and update local state | Provider secret/signature  | `app/api/webhooks/stripe/route.ts:25`, `app/api/webhooks/resend/route.ts:26`, `app/api/webhooks/twilio/route.ts:82`, `app/api/webhooks/[provider]/route.ts:15` |

## 4. System Mapping

### Messaging

Current message stores:

- `messages` for legacy/client communication (`lib/db/schema/schema.ts:18450`).
- `conversations`, `conversation_participants`, and `chat_messages` for realtime chat (`lib/db/schema/schema.ts:2551` and related tables).
- `hub_messages`, `hub_message_reads`, reactions, pinned notes, media for hub/dinner-circle communication (`lib/db/schema/schema.ts:14021`, `13909`).
- `communication_events`, `scheduled_messages`, `sms_messages`, and notification delivery logs for channel history and scheduled outreach.

Flow today:

`UI/server action/API/webhook -> domain-specific message table -> optional notification -> optional activity event`.

Required engine flow:

`UI/API/system trigger -> interaction registry -> permission/visibility resolution -> domain write -> interaction_events row -> notification/log fanout`.

### Menus

Current flow:

`chef menu actions -> menus/menu_items/menu_revisions -> menu approval request -> client approval/feedback -> event/hub circle lifecycle posts`.

Sources: `lib/menus/actions.ts`, `lib/menus/approval-portal.ts`, `lib/hub/circle-lifecycle-hooks.ts`.

Gap:

Menu interactions are split across menu actions, approval actions, client preference actions, hub lifecycle hooks, and document versions.

### Bookings

Current flow:

`public booking form/API -> inquiry -> optional instant checkout -> event conversion -> quote/event/payment/documents`.

Sources: `components/booking/booking-form.tsx`, `app/api/book/route.ts`, `lib/inquiries/actions.ts`, `lib/booking/instant-book-actions.ts`.

Gap:

Booking intent, inquiry state, event state, quote state, payment state, and activity state are not normalized as one interaction lineage.

### Notifications

Current flow:

`domain action -> createNotification/createClientNotification/createChefNotification -> channel-router -> email/SMS/push -> delivery log`.

Sources: `lib/notifications/actions.ts`, `lib/notifications/store.ts`, `lib/notifications/channel-router.ts`, `lib/notifications/send.ts`.

Gap:

Notifications are interactions and side effects, but the canonical client ledger only sees selected `activity_events`, not notification read/archive/delivery state.

### Pricing

Current flow:

Pricing spans quote actions, event pricing intelligence, OpenClaw price sync, grocery quotes, plate cost, ingredient price health, and commerce.

Sources: `lib/quotes/actions.ts`, `lib/finance/event-pricing-intelligence.ts`, `lib/openclaw/*`, `lib/pricing/*`.

Gap:

Price intelligence events are not represented in the client interaction ledger except as derived quote/payment state.

### Clients

Current flow:

`clients -> events/inquiries/messages/notes/quotes/ledger/reviews/activity -> client interaction ledger -> interaction signals -> next best action`.

Sources: `lib/clients/interaction-ledger.ts`, `lib/clients/interaction-signals.ts`, `lib/clients/action-vocabulary.ts`.

Gap:

This is the closest existing model, but it is not universal and is read-projection first, not write-path first.

## 5. Gap Analysis

### Missing

| Gap                                                              | Evidence                                                                                                         | Required build                                                                                |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| No universal `interaction_events` table                          | No `pgTable("interaction_events")` found in `lib/db/schema/schema.ts`; existing tables are domain-specific       | Add `interaction_events` and optional `interaction_event_effects`                             |
| No global `action_type` registry                                 | Action names are spread across 1,648 server actions and 340 route files                                          | Add `lib/interactions/registry.ts` with typed action definitions                              |
| No canonical permission/visibility resolver for all interactions | Middleware, RLS, server actions, collaborator permissions, hub member permissions, and token access are separate | Add interaction permission service that composes these checks                                 |
| No universal actor model                                         | Existing actors include auth users, clients, hub profiles, guests, staff, system, cron, webhook providers, AI    | Add `actor_type` internally even if final required shape keeps `actor_id`                     |
| No universal interaction lineage                                 | Client ledger builds lineage for quotes/menu/document revisions only                                             | Add `parent_interaction_id`, `correlation_id`, and `idempotency_key` as build-time extensions |
| No write-path logging requirement                                | Current logging is optional/domain-specific                                                                      | Wrap new writes with interaction executor                                                     |

### Partial

| Partial system            | Evidence                                                                     | Issue                                                                           |
| ------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Client interaction ledger | `lib/clients/interaction-ledger.ts` and core tests                           | Covers client relationship projection, not all systems                          |
| Activity events           | `app/api/activity/track/route.ts`; `activity_events` table                   | Tracks selected browser/client events but not all server mutations              |
| Notifications             | Multiple notification action modules                                         | Unified delivery exists, but not unified as interaction records                 |
| Permissions               | `middleware.ts`, `lib/auth/permissions.ts`, RLS policies, collaborator JSONB | Enforcement is real but scattered                                               |
| Automations               | `automation_rules`, scheduled/cron routes, AI queue                          | Execution exists but action taxonomy is not shared                              |
| UI trigger inventory      | 5,049 markers and 2,377 action imports found                                 | No generated registry connects UI triggers to server action and database target |

### Duplicate

| Duplicate area          | Evidence                                                                            | Risk                                                             |
| ----------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Message stores          | `messages`, `chat_messages`, `hub_messages`, `communication_events`, `sms_messages` | Same user-visible concept has different schemas and state fields |
| Notification APIs       | `actions.ts`, `store.ts`, `send.ts`, `channel-router.ts`, provider-specific modules | Delivery and read state can drift                                |
| Cron/scheduled split    | `app/api/cron/*` and `app/api/scheduled/*`                                          | Same system-trigger concept has two route conventions            |
| Menu/document revisions | `menu_revisions`, `document_versions`, quote lineage                                | Revision semantics are normalized only in client ledger          |
| Activity logging        | `activity_events`, `chef_activity_log`, breadcrumbs, notification delivery logs     | Multiple logs cannot answer "what happened" universally          |

### Broken / UNVERIFIED

Confirmed broken universal system:

- The universal Interaction Engine requested here does not exist. This is confirmed by absence of a universal interaction table/registry and by the presence of many domain-specific action systems.

Code-proven duplicate migration risk:

- Two migrations reference chat file sharing enum extension: `database/migrations/20260220000001_chat_file_sharing.sql` and `database/migrations/20260220000003_chat_file_sharing.sql`. This is a duplicate migration surface and must be reviewed before any schema migration is generated.

UNVERIFIED:

- Runtime reachability of all 5,049 UI markers was not tested in this audit.
- v2 route behavior was not manually checked route-by-route.
- Generated `.next`, logs, screenshots, and ingestion datasets were not treated as authoritative source for interaction definitions.

## 6. System Architecture

### Core Components

1. `interaction_registry`
   - Static TypeScript registry.
   - One entry per canonical `action_type`.
   - Defines layer, target type, context types, permission policy, visibility policy, state machine policy, side effects, and audit requirements.

2. `interaction_executor`
   - Server-only execution wrapper.
   - Accepts actor, action type, target, context, input, and domain handler.
   - Resolves permission and visibility before domain mutation.
   - Writes `interaction_events` after successful mutation.
   - Writes failed attempts only when policy requires security/audit logging.

3. `interaction_resolver`
   - Read-side projection service.
   - Replaces one-off timeline queries over time.
   - Can project by actor, target, context, layer, client, event, menu, message, system job, or notification.

4. `interaction_bridge`
   - Backfill/projection bridge for legacy tables.
   - Converts `activity_events`, `messages`, `hub_messages`, `notifications`, `event_state_transitions`, `quote_state_transitions`, `menu_revisions`, `document_versions`, and `ledger_entries` into interaction rows.

5. `interaction_effects`
   - Optional side-effect log for notification sends, AI runs, webhooks, cron executions, and external provider calls.

### Execution Flow

```text
UI/API/webhook/cron
  -> resolve actor
  -> lookup action_type in registry
  -> validate target/context shape
  -> permission check
  -> visibility check
  -> execute domain mutation
  -> persist interaction_events row
  -> emit side effects: notification, activity feed, SSE, AI queue, webhook
  -> return domain response
```

## 7. Data Model

### Required Table

```sql
CREATE TABLE interaction_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,
  actor_id uuid,
  target_type text NOT NULL CHECK (target_type IN ('content', 'user', 'event', 'menu', 'system')),
  target_id uuid,
  context_type text CHECK (context_type IN ('event', 'menu', 'client', 'message')),
  context_id uuid,
  state text NOT NULL DEFAULT 'completed',
  visibility text NOT NULL DEFAULT 'private',
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### Build-Recommended Columns

These are not in the user-required shape but are required to avoid ambiguity:

```sql
ALTER TABLE interaction_events
  ADD COLUMN actor_type text NOT NULL DEFAULT 'auth_user',
  ADD COLUMN tenant_id uuid,
  ADD COLUMN layer text NOT NULL,
  ADD COLUMN source_type text NOT NULL DEFAULT 'server_action',
  ADD COLUMN source_ref text,
  ADD COLUMN status text NOT NULL DEFAULT 'succeeded',
  ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN parent_interaction_id uuid REFERENCES interaction_events(id),
  ADD COLUMN correlation_id uuid,
  ADD COLUMN idempotency_key text;
```

### Indexes

```sql
CREATE INDEX idx_interactions_actor_time ON interaction_events(actor_id, created_at DESC);
CREATE INDEX idx_interactions_target_time ON interaction_events(target_type, target_id, created_at DESC);
CREATE INDEX idx_interactions_context_time ON interaction_events(context_type, context_id, created_at DESC);
CREATE INDEX idx_interactions_action_time ON interaction_events(action_type, created_at DESC);
CREATE INDEX idx_interactions_tenant_time ON interaction_events(tenant_id, created_at DESC);
CREATE UNIQUE INDEX idx_interactions_idempotency
  ON interaction_events(idempotency_key)
  WHERE idempotency_key IS NOT NULL;
```

### Registry Type

```ts
type InteractionLayer =
  | 'content'
  | 'social'
  | 'communication'
  | 'discovery'
  | 'creation'
  | 'moderation'
  | 'engagement'
  | 'presence'
  | 'personalization'
  | 'structure'
  | 'transactional'
  | 'chef_native'
  | 'automation'

type InteractionDefinition = {
  actionType: string
  layer: InteractionLayer
  targetType: 'content' | 'user' | 'event' | 'menu' | 'system'
  allowedContextTypes: Array<'event' | 'menu' | 'client' | 'message'>
  actorTypes: Array<
    'auth_user' | 'client' | 'hub_profile' | 'guest' | 'staff' | 'system' | 'webhook' | 'ai'
  >
  visibility: 'private' | 'tenant' | 'group' | 'token' | 'public'
  permissionPolicy: string
  statePolicy?: string
  sideEffects?: string[]
}
```

## 8. API Design

### Internal Server API

```ts
await executeInteraction({
  actionType: 'quote.accept',
  actor: await resolveCurrentActor(),
  target: { type: 'event', id: quote.event_id },
  context: { type: 'client', id: quote.client_id },
  input,
  handler: () => acceptQuoteDomainMutation(input),
})
```

### Read APIs

| Endpoint                                             | Purpose                        |
| ---------------------------------------------------- | ------------------------------ |
| `GET /api/v2/interactions?context_type=&context_id=` | Context timeline               |
| `GET /api/v2/interactions?target_type=&target_id=`   | Target history                 |
| `GET /api/v2/interactions?actor_id=`                 | Actor activity                 |
| `POST /api/v2/interactions/query`                    | Filtered admin/analytics query |

### Write Policy

Do not expose raw public writes to `interaction_events`.

All writes must come through:

- domain server actions,
- authenticated API handlers,
- verified webhooks,
- verified cron/scheduled handlers,
- controlled migration/backfill jobs.

## 9. UI Integration Strategy

1. Do not rewrite all UI triggers.
2. Wrap domain actions first.
3. Start with high-value domains:
   - quotes,
   - events,
   - menus,
   - hub messages,
   - notifications,
   - public booking,
   - payments.
4. Add lightweight UI metadata only where missing:
   - `source_ref`,
   - visible label,
   - route/path,
   - optimistic state key.
5. Preserve existing UX state management.
6. Replace read projections after write capture is stable.

Required first wrappers:

| Existing action                                           | New action_type                                                    |
| --------------------------------------------------------- | ------------------------------------------------------------------ |
| `acceptQuote`, `rejectQuote`                              | `quote.accept`, `quote.reject`                                     |
| `transitionEvent` wrappers                                | `event.transition.*`                                               |
| `postHubMessage`                                          | `hub.message.post`                                                 |
| `createNotification`, `markAsRead`, `archiveNotification` | `notification.create`, `notification.read`, `notification.archive` |
| `submitPublicInquiry` / `/api/book`                       | `booking.intent.submit`                                            |
| Stripe webhook handlers                                   | `payment.webhook.*`                                                |

## 10. Migration Plan

### Phase 0: No-Risk Registry

- Add `lib/interactions/registry.ts`.
- Add typed definitions only.
- No database writes.
- Add unit test that all registry keys are unique and each of the 13 layers has entries.

### Phase 1: Schema

- Add `interaction_events`.
- Add indexes.
- Add RLS:
  - tenant members can read tenant-visible rows,
  - group members can read group-visible rows through context,
  - token rows are never broadly selectable,
  - service role can write automation/webhook rows.

### Phase 2: Executor

- Add `executeInteraction`.
- Add permission resolver adapters for:
  - `requireChef`,
  - `requireClient`,
  - hub profile token,
  - event collaborator permissions,
  - cron/webhook/system.

### Phase 3: First Domain Wrap

Wrap:

- quote accept/reject/send/create,
- event transitions,
- hub message post/read,
- notification create/read/archive,
- public booking submission,
- Stripe webhook payment success/failure/refund.

### Phase 4: Backfill

Backfill from:

- `activity_events`,
- `event_state_transitions`,
- `quote_state_transitions`,
- `menu_revisions`,
- `document_versions`,
- `ledger_entries`,
- `notifications`,
- `hub_messages`,
- `messages`,
- `chat_messages`.

Backfill must use idempotency keys:

```text
legacy:{table}:{id}
```

### Phase 5: Read Projection

- Rebuild client interaction ledger on top of `interaction_events`.
- Keep old ledger code as comparison until tests pass.
- Add system timelines for event, menu, hub group, notification, and automation.

### Phase 6: Enforcement

- Require new interaction registry entries for new mutation actions.
- Add lint/test guard that exported `create/update/delete/send/approve/accept/reject/transition` actions either call `executeInteraction` or are explicitly marked `readOnly`/`internal`.

## 11. Edge Cases

| Edge case                         | Required behavior                                                                                   |
| --------------------------------- | --------------------------------------------------------------------------------------------------- |
| Anonymous public booking          | `actor_id = null`, `actor_type = 'guest'` or `system`; context is inferred from chef/booking config |
| Token pages                       | Visibility `token`; never list token rows without exact token-authorized context                    |
| Webhook retries                   | Use idempotency key from provider event id                                                          |
| Cron duplicate runs               | Use job id/date window idempotency                                                                  |
| AI tool approval                  | Log proposed action and executed action separately                                                  |
| Optimistic UI rollback            | Interaction row is written only after successful domain mutation unless policy logs failed attempts |
| Multi-tenant collaborator         | `tenant_id` is owner tenant; permissions JSON records collaborator tenant/role                      |
| Hub group with `tenant_id = null` | Read visibility must resolve through `hub_group_members`                                            |
| Client self-service               | Actor can be auth user client or token profile; registry must distinguish                           |
| Deleted target                    | Keep interaction row; target resolver returns tombstone label                                       |
| Notification fanout               | Parent interaction is domain action; each delivery is an effect row                                 |
| Payment failure                   | Log status `failed` with provider metadata; do not mark target state complete                       |

## 12. Risks

| Risk                                           | Mitigation                                                                  |
| ---------------------------------------------- | --------------------------------------------------------------------------- |
| Overwriting existing domain state behavior     | Executor wraps domain mutations; it does not replace them                   |
| Security regression on token/public routes     | Implement visibility resolver before public read APIs                       |
| Double logging from backfill and live writes   | Idempotency keys and migration cutoff timestamp                             |
| Performance regression on high-volume activity | Index by context/target/action/time and partition later if needed           |
| Registry drift                                 | Unit test registry coverage and add lint guard for mutation exports         |
| Message store confusion                        | Treat message stores as sources, not immediately merged tables              |
| Incomplete actor model                         | Add internal `actor_type` even if required public shape only has `actor_id` |

## 13. Completion Criteria

- `interaction_events` exists with required columns and indexes.
- Registry includes entries for all 13 canonical layers.
- First wrapped domains produce interaction rows:
  - quote accept/reject/send/create,
  - event transitions,
  - hub message post/read,
  - notification create/read/archive,
  - public booking submit,
  - Stripe payment success/failure/refund.
- Backfill creates idempotent rows for at least:
  - `activity_events`,
  - `event_state_transitions`,
  - `quote_state_transitions`,
  - `menu_revisions`,
  - `document_versions`,
  - `ledger_entries`,
  - `notifications`,
  - `hub_messages`.
- Client relationship ledger can be projected from `interaction_events` with parity tests against current `lib/clients/interaction-ledger-core.ts`.
- API read endpoints enforce tenant, group, client, token, and admin visibility.
- No public endpoint can enumerate token-scoped interactions.
- Tests cover every layer with at least one registry entry and one resolver case.

## 14. Handoff Prompt

You are the build agent for ChefFlow's unified Interaction Engine. Read `docs/specs/interaction-engine.md` first and do not implement beyond that spec. Build the system in phases: add a typed interaction registry covering all 13 layers, add the `interaction_events` schema and indexes, implement a server-only `executeInteraction` wrapper with permission and visibility resolvers, wrap the first domains listed in the spec, add idempotent backfill from legacy tables, then migrate the client interaction ledger projection to read from `interaction_events` with parity tests. Do not delete existing domain tables or rewrite UI flows. Preserve current behavior, add tests for registry coverage, permissions, visibility, idempotency, token-scope non-enumeration, and client ledger parity. Mark any unclear interaction as `UNVERIFIED` in code comments or tests rather than guessing.
