# Research: Auth Security Stakeholder Workflows

> **Date:** 2026-04-08
> **Question:** How do the major stakeholder groups around a business platform actually handle account security, password lifecycle, access control, and integration trust today?
> **Status:** complete

---

## Origin Context

This report supports the current ChefFlow auth hardening work, specifically the password and account-security sprint planned for April 10. The active implementation brief is [docs/specs/auth-password-security-hardening-2026-04-10.md](c:/Users/david/Documents/CFv1/docs/specs/auth-password-security-hardening-2026-04-10.md). The purpose of this research is not to build a full IAM roadmap. It is to ground the current work in how real operators, admins, finance teams, auditors, and integration owners actually manage this problem today.

---

## Method

This report uses three methods and cross-checks them against each other:

1. **Official platform and standards documentation**
   - Google Workspace Admin Help and Knowledge Center
   - Microsoft Entra / Microsoft Learn
   - Okta admin documentation
   - Intuit QuickBooks security documentation
   - Stripe and Square developer/admin documentation
   - FTC, NIST, and PCI SSC guidance
2. **ChefFlow code and current spec review**
   - current auth implementation
   - current security audit
   - current password hardening spec
   - existing webhook/integration and audit-log surfaces
3. **Existing repo research**
   - finance/accounting workflows
   - compliance/legal workflows
   - dev/IT/sysadmin workflows
   - back-office/procurement workflows

The result below focuses only on high-value findings relevant to ChefFlow's current auth hardening work.

---

## Summary

The real market does **not** solve this problem with password rules alone.

Across business owners, finance teams, IT admins, and regulators, the common operating model is:

- one identity control plane
- individual logins, not shared credentials
- MFA for sensitive access
- role-based access
- self-service or admin-mediated recovery
- auditable events for sensitive actions
- least-privilege integration credentials

That matters for ChefFlow because the current April 10 sprint is correctly focused on app-managed password hardening, but the research shows two adjacent truths:

1. **Password storage is only one layer.**
2. **If ChefFlow wants to satisfy business, finance, compliance, or integration-heavy operators, the immediate next controls after password hardening are MFA for sensitive users, auditable auth events, and tighter integration-secret management.**

---

## Business / Organization

### Real workflow

For employers, owners, managers, and admins, the real workflow is usually:

1. Create or sync the user from a central directory.
2. Assign the user to one or more groups or roles.
3. Provision access into downstream apps using SSO or autoprovisioning.
4. Require MFA for sensitive apps or all workforce users.
5. Let users reset passwords through self-service recovery if possible.
6. If an account is compromised or a person leaves, suspend first, reset sessions, then deprovision or delete later.
7. Periodically review privileged access, especially admin roles.

This is visible across Google Workspace, Microsoft Entra, and Okta:

- Google Admin supports admin password reset, password recovery settings, SSO, and autoprovisioning flows tied to app integrations.
- Microsoft Entra pushes staged SSPR rollout, MFA enforcement, and group-based deployment rather than instant tenant-wide flips.
- Okta's governance model centers around access reviews, admin-role review campaigns, and phishing-resistant auth for high-risk apps.

### Where it breaks

- A business app has its own local password system that is outside the directory/SSO boundary.
- Only one owner or super admin exists, so recovery becomes a business-continuity risk.
- Shared office logins persist because role management is weak or tedious.
- Password resets work, but sessions, OAuth tokens, or device access are left stale.
- The org can grant access, but cannot review or certify it later.

### Current workarounds

- Manual onboarding and offboarding checklists in spreadsheets or ticket systems.
- Backup super admins and spare hardware keys.
- Suspension instead of deletion while data transfer happens.
- Admin-driven resets when self-service recovery is too weak or unavailable.
- Directory-first discipline even when downstream apps are less mature.

### What is missing or poorly solved

- Small-business apps often support passwords and invites but not the rest of the lifecycle.
- Many products expose roles but not meaningful review or recertification flows.
- Recovery is often treated as a helpdesk action, not a control surface.

### What to apply to ChefFlow

High-value, relevant now:

- Keep individual accounts mandatory.
- Add explicit password-change audit events and password-changed notification emails.
- Add a documented owner/admin recovery posture so one account loss does not become a tenant lockout.

Not for the April 10 core sprint:

- full SSO/SCIM rollout
- full access certification campaigns

Those are real needs, but not the highest-leverage move for the current sprint.

---

## Operations / Support

### Real workflow

Back-office, ops, finance, and support teams usually handle access through the lens of sensitive actions:

1. Invite each finance or support user with a distinct login.
2. Assign a limited role tied to what they actually need to touch.
3. Use MFA or step-up prompts for payment-adjacent or admin tasks.
4. Rely on audit history to answer "who changed this?" after disputes or accounting surprises.
5. Use support-approved reset paths rather than direct database edits.
6. Expect downstream sessions and tokens to be invalidated or refreshed after password events.

QuickBooks is a strong example of the norm:

- unique logins per person
- multiple permission levels
- audit trail tied to user actions
- MFA used for sensitive operations such as resets and payments

Google Workspace shows a similar pattern operationally: password reset is treated as an admin-controlled event with downstream access implications, especially when account credentials are synchronized across systems or tied to other application access.

### Where it breaks

- Shared owner credentials get handed to bookkeepers or assistants.
- Password resets fix the primary login but leave old sessions and app-specific credentials alive.
- Finance can see balances and payments but cannot independently inspect the audit trail.
- Support teams become the bottleneck because recovery is not self-service enough, but also not safe enough.

### Current workarounds

- Separate "bookkeeper" and "owner" accounts even in weak systems.
- Shared inboxes instead of shared product credentials.
- Manual support playbooks for resets and suspected compromise.
- CSV exports and screen captures when the audit surface is too thin.

### What is missing or poorly solved

- Many SMB tools still conflate "admin" with "can do everything."
- Audit trails often exist, but are too hidden or too platform-admin-centric.
- Password reset side effects are inconsistent across apps and integrations.

### What to apply to ChefFlow

High-value, relevant now:

- add auth event logging for password reset requested, password reset completed, password changed, and repeated throttling
- sign out the current session after password change
- require normal login after password reset
- send password-changed notifications

This is exactly the kind of evidence and containment that ops/support users actually rely on.

---

## Technical / System

### Real workflow

IT and system admins treat auth hardening as a staged rollout problem, not a single setting:

1. Start with a test group.
2. Turn on self-service reset or MFA for a limited scope.
3. Validate access policies against real users and apps.
4. Expand from pilot to broader groups.
5. Monitor sign-in logs, failure patterns, and recovery load.
6. Tighten privileged access first, then wider user access later.
7. Push toward phishing-resistant authenticators for higher-risk roles.

Microsoft Entra explicitly documents staged SSPR rollout and MFA enforcement. Okta provides policy simulation/testing tools and pushes phishing-resistant authenticators like FIDO2/WebAuthn and FastPass for stronger protection. Both vendors make it clear that password resets, MFA, provisioning, logs, and reviews are one operating system, not disconnected features.

### Where it breaks

- Password handling happens outside the identity platform, so central policy is bypassed.
- Rate limiting is local to one process and disappears on restart.
- Recovery, password policy, session invalidation, and logs are split across unrelated code paths.
- Teams assume a provider config file is the source of truth when app code is actually doing the critical work.

### Current workarounds

- Compensating controls at the reverse proxy or WAF.
- External identity provider in front of weaker apps.
- Manual runbooks for resets, recovery, and deprovisioning.
- Short-term exceptions during rollout, with later cleanup.

### What is missing or poorly solved

- Many custom apps underestimate the boundary problem between provider-managed auth and app-managed auth.
- In-memory throttling is still common in early-stage products even though it is not operationally real.
- Password policy duplication across forms and actions creates drift fast.

### What to apply to ChefFlow

This research directly validates the current spec direction:

- centralize password policy in app code
- replace in-memory rate limiting with durable storage
- document the auth boundary so nobody assumes Supabase config is the main enforcement layer
- benchmark bcrypt cost on the real host instead of guessing

This is the strongest alignment between outside research and the current build plan.

---

## Regulatory / Compliance

### Real workflow

Government, compliance, audit, tax, and legal stakeholders usually do not care about the password UI as a product feature. They care about whether the organization can show evidence that sensitive access is controlled.

The real pattern is:

1. Define who can access sensitive data.
2. Require individual accounts.
3. Require stronger authentication for sensitive systems.
4. Maintain logs of privileged and sensitive changes.
5. Review service providers and connected systems.
6. Document incident response and breach reporting obligations.
7. Produce evidence on request.

This pattern is reflected in:

- NIST SP 800-63B
- FTC Safeguards Rule guidance
- PCI DSS v4.x Requirement 8 and related guidance

The details vary, but the direction is consistent:

- strong but usable passwords
- MFA for higher-risk access
- secure storage of authentication factors
- reauthentication for unattended or sensitive contexts
- vendor/service-provider oversight
- evidence and reviewability

### Where it breaks

- Shared credentials make attribution impossible.
- Password changes happen but are not logged.
- Customer or financial data can be accessed without MFA or compensating controls.
- Service providers and third-party integrations are trusted without review.
- Security is done ad hoc and cannot be evidenced later.

### Current workarounds

- Manual evidence packs from logs, spreadsheets, screenshots, and exported histories.
- Written compensating controls when a product lacks native enforcement.
- Third-party attestations or vendor questionnaires to fill gaps.

### What is missing or poorly solved

- Small-business products often implement security controls but not evidence trails.
- Audit logs are frequently platform-only, not customer-visible.
- Vendor-risk handling around connected systems is inconsistent.

### What to apply to ChefFlow

High-value, relevant now:

- record auth-change audit events
- keep unique-account discipline
- queue MFA for admins and finance-sensitive roles as the next security milestone after password hardening

Not high-value for this sprint:

- legal-document generation around auth policy
- compliance badge work without underlying evidence surfaces

The regulators care more about actual control evidence than polished policy copy.

---

## External Systems / Integrations

### Real workflow

Integration owners usually follow a different security workflow than human login owners:

1. Use a sandbox or test account first.
2. Connect via OAuth or a restricted API key.
3. Request the smallest scope set that still works.
4. Store secrets server-side only.
5. Validate inbound webhook signatures.
6. Track delivery failures and token expiry.
7. Refresh, rotate, revoke, or deauthorize when access is stale or a user disconnects.

Stripe and Square are clear examples:

- Stripe documents restricted keys, SSO/SCIM for teams, and webhook signature verification.
- Square requires OAuth access tokens and location IDs for seller-scoped mobile payments, tracks token expiration, and expects refresh and deauthorization flows.

Google and Google Workspace add another real-world wrinkle:

- account and password changes can create downstream reauthorization work across connected clients and tools
- older client and sync models still create credential-state drift that operators need to resolve

### Where it breaks

- Live and test credentials get mixed.
- Scopes are broader than necessary.
- Webhooks are trusted based on a shared secret in the wrong place, or not verified at all.
- Refresh and revoke flows are treated as afterthoughts.
- Device and POS integrations keep long-lived stale authorizations around.

### Current workarounds

- Restricted keys instead of full-account keys.
- Separate test and production tenants.
- Manual key rotation calendars.
- Dedicated service accounts or dedicated devices.
- CSV export/import when the API trust model is too risky or too immature.

### What is missing or poorly solved

- Many products treat integrations as setup screens, not as security surfaces.
- Delivery logs and reauthorization guidance are often too thin for operators.

### What to apply to ChefFlow

High-value, relevant now:

- keep the April 10 sprint focused on human auth
- immediately after that, run an integration credential review across Google, Stripe, Square, DocuSign, Wix, and generic webhooks
- check least-privilege scopes, token revocation, secret rotation, and audit visibility

This is relevant because ChefFlow already has real OAuth and webhook surfaces, and some of them are payment- or communications-adjacent.

Hardware devices, barcode scanners, and POS devices matter here only where they inherit seller or staff identity. They do not change the priority of the April 10 password sprint.

---

## Cross-Checked Reality Against ChefFlow

The repo already contains several foundations that map to what the outside world expects:

- role-aware routing and staff permission surfaces
- admin audit-log infrastructure
- webhook signature verification for major providers
- API key and webhook management surfaces
- OAuth-based integrations

The gap is not "ChefFlow has no security model." The gap is narrower:

- human password hardening is still incomplete
- auth event evidence is thin
- business-grade controls expected by IT/compliance users sit just outside the current sprint
- integration credential security needs its own follow-up pass

This matches the current finding in [docs/specs/auth-password-security-hardening-2026-04-10.md](c:/Users/david/Documents/CFv1/docs/specs/auth-password-security-hardening-2026-04-10.md): ChefFlow is not catastrophically unsafe, but the surrounding controls are not yet at a hardening-complete bar for a public production system.

---

## High-Value Refinements To Apply Now

These are the research-backed changes that should directly shape the current work:

1. **Add auth audit events to the April 10 sprint.**
   - Password reset requested
   - Password reset completed
   - Password changed
   - repeated throttling / abuse lockout

2. **Treat password-change side effects as first-class behavior.**
   - notify the user
   - sign out the current session
   - require normal login after reset

3. **Keep the sprint focused on app-managed password security, not enterprise IAM replacement.**
   - That keeps the work realistic.
   - The research supports this sequencing.

4. **Queue the next milestone clearly.**
   - MFA for admin/finance-sensitive users
   - user-visible audit evidence
   - integration secret and scope review

5. **Do not assume provider config is enforcement when app code owns the flow.**
   - This is the single most important technical reality check from the IT/admin research.

---

## What Not To Pull Into This Sprint

Research surfaced real adjacent needs that are not the best use of the April 10 token budget:

- full SSO/SAML/SCIM rollout
- complete governance review workflows
- broad compliance document generation
- end-to-end integration security rewrites
- hardware/POS identity redesign

These are valid future tracks, but they are not the highest-leverage move for the current auth hardening work.

---

## Sources

### Official External Sources

- NIST SP 800-63B: https://pages.nist.gov/800-63-4/sp800-63b.html
- OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- OWASP Forgot Password Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
- FTC Safeguards Rule overview: https://www.ftc.gov/business-guidance/resources/ftc-safeguards-rule-what-your-business-needs-know
- FTC vendor security guidance: https://www.ftc.gov/business-guidance/small-businesses/cybersecurity/vendor-security
- Google Workspace SSO setup: https://support.google.com/a/answer/12032922?hl=en-eu
- Google Workspace password sync and admin reset behavior: https://support.google.com/a/answer/9543613?hl=en-CA
- Google Workspace 2-step verification guidance: https://knowledge.workspace.google.com/business-continuity/security-and-monitoring/protect-your-business-with-2-step-verification?hl=ja
- Microsoft Entra mandatory MFA planning: https://learn.microsoft.com/en-us/entra/identity/authentication/concept-mandatory-multifactor-authentication
- Okta admin MFA enforcement: https://help.okta.com/en-us/Content/Topics/Security/mfa/mfa-enable-admins.htm
- Okta passkeys / WebAuthn: https://help.okta.com/oie/en-us/content/topics/identity-engine/authenticators/configure-passkeys.htm
- Okta security access reviews: https://help.okta.com/en-us/content/topics/identity-governance/access-certification/sec-access-review/manage.htm
- Okta self-service account recovery: https://help.okta.com/oie/en-us/Content/Topics/identity-engine/authenticators/configure-sspr.htm
- Intuit QuickBooks Online Security White Paper: https://quickbooks.intuit.com/content/dam/intuit/quickbooks/accountants/QBOwhitepaper/QBO%20Security%20White%20Paper%20March%202018.pdf
- Stripe SCIM provisioning: https://docs.stripe.com/get-started/account/sso/scim
- Square credentials and access tokens: https://developer.squareup.com/docs/build-basics/access-tokens
- Square Mobile Payments SDK authorization: https://developer.squareup.com/docs/mobile-payments-sdk/ios/configure-authorize
- PCI SSC Requirement 8 FAQ: https://www.pcisecuritystandards.org/faq/articles/Frequently_Asked_Question/can-organizations-use-alternative-password-management-methods-to-meet-pci-dss-requirement-8-2/

### Internal Cross-Checks

- [docs/specs/auth-password-security-hardening-2026-04-10.md](c:/Users/david/Documents/CFv1/docs/specs/auth-password-security-hardening-2026-04-10.md)
- [docs/security-audit-2026-04-04.md](c:/Users/david/Documents/CFv1/docs/security-audit-2026-04-04.md)
- [docs/research/2026-04-04-dev-it-sysadmin-workflows.md](c:/Users/david/Documents/CFv1/docs/research/2026-04-04-dev-it-sysadmin-workflows.md)
- [docs/research/2026-04-04-finance-accounting-and-integration-workflows.md](c:/Users/david/Documents/CFv1/docs/research/2026-04-04-finance-accounting-and-integration-workflows.md)
- [docs/research/2026-04-04-compliance-regulatory-and-legal-workflows.md](c:/Users/david/Documents/CFv1/docs/research/2026-04-04-compliance-regulatory-and-legal-workflows.md)
- [docs/research/2026-04-04-staff-backoffice-procurement-workflows.md](c:/Users/david/Documents/CFv1/docs/research/2026-04-04-staff-backoffice-procurement-workflows.md)
