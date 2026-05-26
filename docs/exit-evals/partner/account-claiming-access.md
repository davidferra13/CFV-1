# Exit Eval: Partner / ACCOUNT CLAIMING & ACCESS

> Wave 5 | Scenarios #1-#5 | Evaluated 2026-05-26
> Mode: Solo (NEEDS-DEVELOPER-REVIEW)

---

## Scenario #1: Receive the partner invite link

**Original classification:** Permanent
**Reclassified to:** Bridgeable
**Review status:** NEEDS-DEVELOPER-REVIEW

**Why partner leaves:** The partner is not in ChefFlow yet, so the chef has to deliver the first access artifact through an external channel the partner already checks: email, SMS, WhatsApp, Slack, or a direct conversation. The operational job is not "send a link"; it is "get the right partner from a trusted channel into a one-time claim flow without confusion, spoofing anxiety, or lost context."

**Context ChefFlow has:**

- The partner record: `referral_partners.id`, name, contact name, email, phone, website, booking URL, partner type, status, and claimed state
- The chef tenant that owns the partner record, enforced in `generatePartnerInvite()` with `.eq('tenant_id', chef.tenantId!)`
- One-time invite token, `invite_sent_at`, `claimed_at`, and `auth_user_id` columns on `referral_partners`
- Chef-side partner detail page with the `PartnerInviteButton`
- Claim destination at `/auth/partner-signup?token=...`
- Partner portal home at `/partner/dashboard` after successful claim

**Data source?** No. Email/SMS/WhatsApp/Slack are communication channels, not data sources. ChefFlow should not try to replace them; it should make the outbound link and return path trustworthy.

**Client-collaborative angle:** No Dinner Circle angle. This is chef-to-partner onboarding. The useful collaboration input is the partner's preferred invite channel, which could be captured on the partner record so the chef does not guess where to send access.

**Physical reality:** Screen-based and often mobile. The link must survive copy/paste, mobile email clients, messaging previews, and a partner opening it later from the same device where they manage passwords.

**Compounding:** Medium. Each partner only receives the invite once, but every new partner relationship passes through this trust gate. Invite metadata also compounds into support/debug context: who was invited, when, whether the link was claimed, and whether a resend is needed.

**Solution design:**

- Keep the external channel as the first mile, but make ChefFlow generate a branded invite packet: clean claim URL, chef name, partner name, portal purpose, expiration/one-time-use language, and support fallback.
- Add copy, native share, and "send via email" affordances on the chef-side partner detail page rather than only exposing a raw URL.
- Record invite delivery intent on the partner record: channel selected, timestamp, and optional note.
- On the claim page, validate the token before form submission and display partner/chef context so the partner knows the link is legitimate.
- Preserve a clean return path into `/partner/dashboard` after account creation.

**Where it appears:**

- `app/(chef)/partners/[id]/page.tsx`
- `components/partners/partner-invite-button.tsx`
- `lib/partners/invite-actions.ts`
- `app/auth/partner-signup/page.tsx`

**What remains as permanent exit:**
The initial delivery channel remains external because an unclaimed partner has no ChefFlow inbox yet. Email, SMS, WhatsApp, Slack, and personal contact are still the destination for first contact.

**Priority:** Medium frequency x Low effort = Medium priority
**Spec needed?** no

---

## Scenario #2: Ask the chef for a new invite

**Original classification:** Bridgeable
**Reclassified to:** Reducible
**Review status:** NEEDS-DEVELOPER-REVIEW

**Why partner leaves:** The partner is blocked by an invalid, missing, expired, already-claimed, or lost token and has no self-service recovery path. The operational job is "prove I am the intended partner and get a fresh claim path" without texting the chef or waiting for manual troubleshooting.

**Context ChefFlow has:**

- Token validation in `claimPartnerInvite()` and missing-token handling in `app/auth/partner-signup/page.tsx`
- Partner claimed state via `claimed_at`
- Partner email/contact data stored on `referral_partners`
- Chef ownership of the partner record and tenant scoping in `generatePartnerInvite()`
- Existing sign-in path for already-claimed partners: `/auth/signin?portal=partner`
- Existing password reset flow for users who have an account but lost credentials

**Data source?** No. This is an account recovery and authorization workflow, not a source lookup.

**Client-collaborative angle:** No client/Dinner Circle angle. The partner can provide the recovery input ChefFlow needs: email address, partner/business name, and optional message. ChefFlow can route that to the owning chef or auto-issue a safe replacement when the email matches the unclaimed partner record.

**Physical reality:** Screen-based. The partner is likely on the invalid invite page or searching the original message. Recovery should fit into the same surface with minimal typing.

**Compounding:** Medium. It is a one-time issue per partner, but every failed invite otherwise creates a direct chef interruption or support request. A structured recovery trail also improves future account-support diagnosis.

**Solution design:**

- Add "Request a new invite" to missing, invalid, and already-used token states.
- Let the partner submit the email/business name tied to the invite; if it matches an unclaimed partner record, create a chef-visible resend request or safely rotate the token.
- If `claimed_at` is present, route the user to partner sign-in and password reset instead of inviting a duplicate account.
- Add chef-side notification/actions for pending partner invite recovery requests.
- Store resend/request history on the partner record or a lightweight invite-events table.

**Where it appears:**

- `app/auth/partner-signup/page.tsx`
- `lib/partners/invite-actions.ts`
- `app/(chef)/partners/[id]/page.tsx`
- `app/auth/forgot-password/page.tsx`

**What remains as permanent exit:**
If the partner cannot prove identity, the chef may still need to verify the relationship through a trusted external channel. Suspicious or disputed account claims should remain human-reviewed.

**Priority:** Medium frequency x Medium effort = High priority
**Spec needed?** yes (note only: partner invite recovery/resend flow)

---

## Scenario #3: Retrieve password from a password manager

**Original classification:** Permanent
**Reclassified to:** Permanent
**Review status:** NEEDS-DEVELOPER-REVIEW

**Why partner leaves:** The partner needs their stored credential from 1Password, iCloud Keychain, Chrome Password Manager, Bitwarden, or another vault. The operational job is "authenticate safely without memorizing or reusing a weak password."

**Context ChefFlow has:**

- Partner claim form uses email plus password fields at `/auth/partner-signup`
- Sign-in page supports `autoComplete="email"` and `autoComplete="current-password"`
- Partner claim password field uses `autoComplete="new-password"`
- Central password policy in `lib/auth/password-policy.ts`
- Forgot/reset password pages for recovery
- Partner portal routes redirect to `/auth/signin?portal=partner` when `requirePartner()` fails

**Data source?** No. A password manager is a personally controlled security tool/credential vault. ChefFlow should integrate with browser conventions, not ingest or replace the vault.

**Client-collaborative angle:** None. This is personal account security for the partner.

**Physical reality:** Screen-based, often cross-device. The user may approve Face ID/Touch ID, unlock a browser vault, or copy from a desktop password manager. ChefFlow should keep fields password-manager-friendly and avoid custom UI that breaks autofill.

**Compounding:** Low. The exit happens when signing in or creating the account, but the knowledge does not become ChefFlow business intelligence. Good autofill support reduces repeated friction but does not create durable partner data.

**Solution design:**

- Preserve native `email`, `current-password`, and `new-password` autocomplete semantics.
- Keep password reset available from the sign-in flow.
- Consider passkeys or OAuth later as an auth roadmap item, but do not build a password manager inside ChefFlow.
- Avoid masking/styling decisions that interfere with browser password-manager overlays.

**Where it appears:**

- `app/auth/partner-signup/page.tsx`
- `app/auth/signin/page.tsx`
- `app/auth/forgot-password/page.tsx`
- `app/auth/reset-password/page.tsx`
- `components/ui/input.tsx`

**What remains as permanent exit:**
Unlocking, searching, approving, or copying from the partner's password manager remains external and should remain external.

**Priority:** Medium frequency x Low effort = Low priority
**Spec needed?** no

---

## Scenario #4: Check email for account or chef context

**Original classification:** Bridgeable
**Reclassified to:** Partially Reducible
**Review status:** NEEDS-DEVELOPER-REVIEW

**Why partner leaves:** The partner opened a claim link but does not remember which chef sent it, what the portal is for, whether the invite is legitimate, or what business relationship it relates to. They leave to inspect the original email/message thread for identity and purpose. The operational job is "confirm this account claim belongs to a real chef/partner relationship before creating credentials."

**Context ChefFlow has:**

- Invite token maps to `referral_partners`
- Partner record contains name, contact info, partner type, website, booking URL, description, notes, claimed state, and tenant ID
- Chef tenant can be resolved from `partner.tenant_id`
- Claim page already explains partner account purpose at a generic level
- Partner portal dashboard later shows partner name, locations, event history, stats, and origin story when available
- Public partner terms/privacy pages are reachable from the claim form

**Data source?** Partly. Email is not just a data source; it is the trusted communication thread. But the narrow slice the partner needs at claim time, chef identity plus partner relationship context plus portal purpose, can be displayed from ChefFlow data.

**Client-collaborative angle:** No Dinner Circle angle. The chef and partner are the collaborators. The chef already knows why the invite exists; ChefFlow should package that explanation into the invite and claim page instead of forcing the partner to hunt through email.

**Physical reality:** Screen-based. The partner may be on mobile, toggling between mail and browser. The claim page should answer the trust question without requiring app switching.

**Compounding:** Medium. Better claim context reduces confusion for every new partner and creates a reusable pattern for staff/vendor invite claiming. The partner relationship details then compound inside the portal after claim.

**Solution design:**

- Add a pre-claim token lookup that displays chef/business name, partner name, partner type, and portal purpose before the password form.
- Include a short chef-authored invite note when generating the link.
- Show a clear already-claimed state that routes to sign-in/password reset.
- Add a "Need context?" fallback that lets the partner request clarification inside the claim page rather than replying externally.
- Keep sensitive partner/internal notes hidden; show only safe identity and purpose metadata.

**Where it appears:**

- `app/auth/partner-signup/page.tsx`
- `lib/partners/invite-actions.ts`
- `lib/partners/portal-actions.ts`
- `app/(partner)/partner/dashboard/page.tsx`
- `app/(partner)/partner/layout.tsx`

**What remains as permanent exit:**
The original email/message thread remains the source of nuanced relationship history, prior negotiation, and human trust signals. ChefFlow can eliminate most claim-page confusion but cannot replace all prior context.

**Priority:** Medium frequency x Low effort = Medium priority
**Spec needed?** no

---

## Scenario #5: Review partner terms with counsel

**Original classification:** Permanent
**Reclassified to:** Permanent
**Review status:** NEEDS-DEVELOPER-REVIEW

**Why partner leaves:** A venue owner, host, concierge, or business partner may need a lawyer, internal owner, compliance lead, or PDF review workflow before accepting partner terms. The operational job is "understand legal/business risk before binding the partner relationship."

**Context ChefFlow has:**

- Partner claim form requires acceptance of Privacy Policy and Partner Terms
- Partner-required policies are defined as `privacy_policy` and `partner_terms` in `lib/legal/readiness.ts`
- `recordPolicyAcceptancesForSubject()` persists policy acceptance by role, subject, tenant, version, IP hash, user agent, accepted timestamp, and source
- Legal policy version and acceptance tables exist in the legal readiness migration
- `/partner-terms` exists as a draft legal policy placeholder and explicitly says it is not attorney-reviewed
- `/privacy` has a full public privacy policy page

**Data source?** No. Counsel/legal review is an external authority and professional judgment workflow, not a data feed ChefFlow can source.

**Client-collaborative angle:** No Dinner Circle angle. The useful collaborative surfaces are partner/counsel/internal-owner review and chef/platform legal readiness. ChefFlow can supply a review packet and acceptance ledger, but counsel remains outside.

**Physical reality:** PDF/print matters here. Counsel may annotate a PDF, forward it internally, compare versions, or store it in a document system. A printable/exportable copy and stable policy version are more useful than an interactive screen.

**Compounding:** High. Once terms are versioned and acceptance is recorded, that legal state supports every future report, payout, partner portal action, privacy request, and dispute audit. Policy changes also require version-aware reacceptance.

**Solution design:**

- Keep legal review external, but make `/partner-terms` exportable/printable with policy version, effective date, and review status.
- Surface acceptance timestamp and accepted policy versions in the partner account/admin legal ledger.
- Do not mark draft partner terms as legally approved until counsel-reviewed policy versions exist.
- Add a "download terms for review" link from the claim page before acceptance.
- If terms change materially, require partner reacceptance based on legal policy version metadata.

**Where it appears:**

- `app/auth/partner-signup/page.tsx`
- `app/(public)/partner-terms/page.tsx`
- `app/(public)/privacy/page.tsx`
- `lib/legal/readiness.ts`
- `lib/legal/persistence.ts`
- `database/migrations/20260516000409_legal_readiness_infrastructure.sql`

**What remains as permanent exit:**
Attorney review, internal business approval, redline negotiation, and formal legal storage remain outside ChefFlow.

**Priority:** Low frequency x Medium effort = Medium priority
**Spec needed?** no

---

## Batch Summary

| #   | Title                                     | Reclassified To     | Spec Needed? |
| --- | ----------------------------------------- | ------------------- | ------------ |
| 1   | Receive the partner invite link           | Bridgeable          | no           |
| 2   | Ask the chef for a new invite             | Reducible           | yes          |
| 3   | Retrieve password from a password manager | Permanent           | no           |
| 4   | Check email for account or chef context   | Partially Reducible | no           |
| 5   | Review partner terms with counsel         | Permanent           | no           |

---

## Evidence Summary

**Source/rubric files read:**

- `docs/exit-evals/prompts/51-partner-account-claiming-access.md`
- `.claude/skills/exit-eval/SKILL.md`
- `.agents/skills/exit-scenario-round-trip/SKILL.md`
- `docs/research/partner-exit-points-analysis.md`
- `docs/research/partner-never-leaves-analysis.md`
- `.planning/exit-eval-swarm-handoff.md`

**Code evidence examined:**

- `lib/partners/invite-actions.ts` - `generatePartnerInvite()` and `claimPartnerInvite()`
- `components/partners/partner-invite-button.tsx` - chef-side invite URL generation/copy flow
- `app/(chef)/partners/[id]/page.tsx` - partner detail page and invite surface
- `app/auth/partner-signup/page.tsx` - token claim, email/password form, legal acceptance links
- `app/auth/signin/page.tsx` - current-password autofill and partner sign-in route behavior
- `app/auth/forgot-password/page.tsx` and `app/auth/reset-password/page.tsx` - credential recovery
- `components/ui/input.tsx` - password input behavior
- `lib/auth/get-user.ts` - `requirePartner()` guard and partner tenant context
- `lib/auth/route-policy.ts` - `/partner` protected route policy and public `/partner-terms`
- `lib/partners/portal-actions.ts` - partner portal data and privacy-scoped event context
- `app/(partner)/partner/layout.tsx` and `app/(partner)/partner/dashboard/page.tsx` - post-claim portal context
- `app/(public)/partner-terms/page.tsx` and `app/(public)/_components/legal-policy-placeholder.tsx` - draft partner terms surface
- `app/(public)/privacy/page.tsx` - privacy policy linked from claim form
- `lib/legal/readiness.ts` and `lib/legal/persistence.ts` - required partner policies and acceptance ledger
- `database/migrations/20260516000409_legal_readiness_infrastructure.sql` - legal policy version/acceptance tables
- `lib/db/schema/schema.ts` - `referral_partners` invite/claim fields

**Solo-mode notes:**

- No roadmap, RUNNER, or standalone spec files were updated per handoff override.
- Scenario #2 appears spec-worthy, but the spec was only noted in this summary.
