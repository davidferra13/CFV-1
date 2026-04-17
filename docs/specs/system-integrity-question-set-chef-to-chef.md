# Chef-to-Chef Systems: System Integrity Question Set

> **Purpose:** Expose every failure point across the full spectrum of chef-to-chef interaction. Force every cross-system boundary into a fully specified, verifiable state. Every question frames a real scenario a chef would encounter.
>
> **Relationship spectrum tested:**
>
> - **Strangers:** Two chefs who've never met, discovering each other on the platform
> - **Acquaintances:** Connected but haven't worked together yet
> - **Collaborators:** Actively sharing leads, covering events, working side by side
> - **Partners:** Deep interdependence, separate companies, full transparency needed
>
> **How to use:** Answer each question with a concrete decision. No "it depends." Every answer must be implementable and testable. Verdicts cite `file:line`.

---

## A. Discovery & Trust Ladder (Stranger to Partner)

**Q1. What does a chef see about another chef BEFORE connecting?**
Chef A searches for chefs in Boston. Chef B shows up. What information is visible pre-connection? Display name? Cuisines? Location? Bio? Event history? Pricing? The social platform has public profiles, the community has directory listings, and the chef table itself has fields. Which system controls the "first impression" and what's the minimum viable profile that makes a chef want to connect?

**Q2. What is the complete trust escalation path, and does each step unlock new capabilities?**
Today there are at least 4 relationship tiers: no connection -> connected -> trusted circle (partner/preferred/inner_circle) -> event collaborator. Does each tier unlock specific features? Can a connected-but-not-trusted chef see your availability signals? Can they send you a handoff? Is there a clear UI that shows "connect with this chef to unlock X"? Or is it all-or-nothing after connection?

**Q3. When Chef A views Chef B's profile, does the profile reflect Chef B's actual activity or is it a static card?**
The social platform has posts, the network has insights, the community has profiles. When you land on `/network/[chefId]`, do you see their recent posts? Their cuisine specialties? Their availability status? Or just a name and a connect button? What makes a chef profile feel alive vs. feeling like an empty LinkedIn page?

**Q4. Can a chef build reputation through the platform, and is that reputation portable across systems?**
Chef B has accepted 5 handoffs, completed 3 subcontracts, been a mentee, shared 2 templates, and posted helpful sourcing intel. Is any of this visible to Chef A when deciding whether to connect or trust them? Or does every interaction start from zero context?

---

## B. Lead & Opportunity Flow (The Handoff Economy)

**Q5. Chef A gets an inquiry she can't take. What is her complete journey to get it to the right chef?**
She has a $3,000 dinner inquiry for a date she's already booked. She wants to hand it to someone in her trusted circle. Walk through every screen: where does she start? How does she create the handoff? Does the inquiry data (client name, date, budget, dietary needs) transfer? Does the receiving chef see the full context or just "someone needs a chef on March 15"?

**Q6. When a handoff converts to a booked event, does the original chef get credit?**
Chef A handed off the lead. Chef B booked it for $3,000. Does Chef A see this in her metrics? Does the referral chain mapping pick it up? Is there a conversion record that connects the original inquiry to the final event? Or does the trail go cold after the handoff is accepted?

**Q7. How does the Opportunity Network interact with the Handoff system?**
Chef A posts a structured opportunity ("Need a sous chef for a 50-person wedding, June 14, Boston, $400 flat rate"). Chef B expresses interest. Now what? Does this become a handoff? An event collaboration invite? A subcontract? Or is it a dead end where they exchange messages and figure it out off-platform? What's the conversion path from "expressed interest" to "working together on this event"?

**Q8. If three chefs express interest in the same opportunity, how does the posting chef compare and choose?**
The opportunity interest system tracks expressions with optional messages. But when Chef A opens her opportunity and sees 3 interested chefs, can she compare their profiles, see their availability, check past collaboration history, or read reviews? Or does she just see names and messages with no decision support?

---

## C. Working Together (Event-Level Collaboration)

**Q9. Chef A invites Chef B to co-host a 6-course farm dinner. What does Chef B's experience look like?**
Chef B gets the invitation. Where does it appear? Dashboard alerts? Network notifications? Email? All three? When she accepts, what does she gain access to? Can she see the menu? The guest list? The budget? The prep timeline? The shopping list? Or does she land on the event page and see a wall of "permission denied" panels?

**Q10. When two chefs collaborate on an event, whose recipes are used and who owns the derivative work?**
Chef A shares her risotto recipe with Chef B via the recipe sharing system. Chef B modifies it for the event. Who owns the modified version? Does it appear in both recipe libraries? If Chef B later uses it for a solo event, does Chef A know? Is there provenance tracking, or does the recipe lose its origin once shared?

**Q11. How do two collaborating chefs coordinate prep timelines without stepping on each other?**
The prep timeline system generates a reverse-engineered schedule per event. If Chef A is handling courses 1-3 and Chef B is handling courses 4-6, does the timeline show both chefs' work? Can they see each other's prep blocks? What happens when Chef A's prep for the risotto (course 2) conflicts with Chef B needing the same kitchen time slot? Is there any collision detection?

**Q12. After the event, how is revenue split and who sees what financially?**
The event collaboration system has roles with permissions (can_view_financials). The settlement system computes splits. But is any of this actually wired into the ledger? If Chef A is primary and Chef B is sous_chef, does Chef B see her portion on her own dashboard? Does a ledger entry get created for each chef's share? Or is the split purely informational with no financial trail?

---

## D. Persistent Spaces (Beyond Single Events)

**Q13. Two chefs work together regularly. Where do they maintain their ongoing relationship?**
They have a 1:1 Collab Space, they're in each other's trusted circles, they have a connection, and they might be in a shared Dinner Circle. That's 4 separate contexts for one relationship. When Chef A wants to message Chef B about a lead, does she go to the Collab Space? When she wants to discuss an upcoming event, does she go to the Dinner Circle? Is there any unified view of "everything between me and Chef B"?

**Q14. Can a Collab Space thread reference specific events, handoffs, or shared resources?**
The system has `attachHandoffReferenceToThread`. But can you reference an event? A shared recipe? A client? If Chef A says "let's discuss the Johnson wedding" in a Collab Space, is there a way to link to that event so both chefs can jump to it? Or is it just free-text messaging with no structured links?

**Q15. When a chef leaves a Collab Space or removes a connection, what happens to shared history?**
Chef A and Chef B had a falling out. Chef A removes the connection. Do their Collab Space messages disappear? Do shared recipes get revoked? Do handoff records get deleted? What about events they co-hosted, are those records intact? What's the "breakup" experience and does it destroy any data?

---

## E. Community & Growth (The Broader Network)

**Q16. A brand-new chef joins ChefFlow with zero connections. What is their path to a functioning network?**
They create an account. They go to `/network`. What do they see? An empty connections list? A feed with no posts? A discover tab with suggested chefs? Can they search by location and cuisine? Is there onboarding that guides them to make their first connection? Or is it a blank page that tells them nothing?

**Q17. Does the mentorship system bridge into any operational feature, or is it purely social?**
Chef A signs up as a mentor. Chef B becomes her mentee. They're matched. Now what? Can the mentor see the mentee's events (with permission)? Can she review their menus? Can she access their prep timelines to give feedback? Or is mentorship just messaging with a label on it?

**Q18. When a chef shares a template (menu, recipe, message), does the recipient's copy stay linked or fork completely?**
Chef A shares a holiday menu template. Chef B downloads it. Chef A later improves the template. Does Chef B see the update? Is there versioning? Or does it fork on download and become completely independent? What if 50 chefs download it and Chef A finds a food safety issue; can she notify them?

**Q19. The subcontracting system has COI (Certificate of Insurance) tracking. How does this interact with event collaboration?**
If Chef B is subcontracted for an event, does the event collaboration system check for a valid COI? Can the event owner see the subcontract agreement details? Or are these two completely separate workflows where a chef can be an event collaborator without any subcontract, and vice versa?

---

## F. Cross-System Data Flow (Does Information Travel?)

**Q20. When Chef A shares a client lead via contact shares, does that client appear in Chef B's client list?**
The contact share system (`chef_network_contact_shares`) lets Chef A share a client's name, phone, email, event date, and details. When Chef B accepts the share, does a client record get created in Chef B's tenant? Or does Chef B get the information but have to manually create the client? What happens to the referral chain tracking?

**Q21. Does the social feed surface relevant operational data, or is it purely content?**
Chef A posts that she's available for backup work in Boston next week. Chef B has an event next week and needs backup. Does the system connect these two signals? The availability signal system exists in the Collab tab. The social feed has an "availability" post category. Are these the same data, or two separate systems that don't talk to each other?

**Q22. When an Introduction Bridge creates a hub group for two chefs and a client, does the resulting circle connect to an event?**
Chef A hands off a lead to Chef B via the handoff system. Chef B accepts. Chef A creates an Introduction Bridge. The bridge creates a hub group. The client joins. Now Chef B wants to create an event for this client. Does the event auto-link to the circle? Does the client record get created from the hub guest profile? Or does Chef B have to start fresh as if the bridge conversation never happened?

**Q23. Are notification preferences consistent across all chef-to-chef systems?**
A chef can get notifications from: social platform (reactions, comments, follows), collaboration (handoff received/accepted/rejected), collab spaces (new messages), introduction bridges (new messages), event collaboration (invitations), opportunity network (interest expressed), dinner circles (messages, updates). Are all of these controllable from one settings page? Or does each system have its own notification logic with no unified preference?

---

## G. Transparency & Trust (For Deeply Interdependent Partners)

**Q24. Can two partner-level chefs see each other's availability calendars?**
Chef A and Chef B are in each other's trusted circles as "partners" (highest trust level). They regularly cover for each other. Can Chef A see when Chef B has events booked? Can she see open dates? The scheduling system exists. The availability signal system exists. But is there a "partner view" that shows another chef's calendar without exposing client details?

**Q25. When two chefs co-host regularly, is there a shared financial history across events?**
They've done 10 farm dinners together over a year. Can either chef see: total revenue generated together, average split, number of events, trend over time? Or does each event's financial data exist in isolation with no aggregate view of the partnership?

**Q26. Can a chef grant another chef limited access to their operations for mentoring or partnership purposes?**
The team management system (`chef_team_members`) exists. The event collaboration system has per-event permissions. But is there a way to say "Chef B can view my recipes, my ingredient catalog, and my upcoming events, but not my financials or client list"? A persistent permission set, not per-event.

---

## H. Edge Cases & Conflict Resolution

**Q27. What happens when two chefs both claim they referred the same client?**
Chef A says she referred Client X to Chef B. Chef B says Client X found him through Google. The referral chain mapping has a record from Chef A. The inquiry has `referral_source: google`. Which wins? Is there a dispute mechanism? Does the system even detect the conflict?

**Q28. Chef A shares a lead with Chef B via handoff. Chef B ghosts the lead. What recourse does Chef A have?**
The handoff was accepted but Chef B never contacted the client. The lead goes cold. Can Chef A see the handoff status? Can she reclaim the lead? Does the system track "accepted but never acted on"? Does this affect Chef B's collaboration metrics?

**Q29. Two chefs are event collaborators. One wants to cancel, one doesn't. What happens?**
Chef A (primary) wants to cancel the event. Chef B (co_host) has already prepped and sourced ingredients. Does the collaboration system have any safeguard here? Does Chef B get notified before cancellation? Can she block it? Or does the primary chef have unilateral control?

**Q30. A chef is removed from the platform (banned, deactivated). What happens to their collaboration history?**
Chef B had 5 active handoffs, 3 collab spaces, 2 event collaborations, and was in 4 trusted circles. When her account is deactivated, do all of these cascade-delete? Go to a "removed user" state? Orphan in place? What does Chef A see in her trusted circle where Chef B used to be?

---

## Scorecard

| Domain                  | Questions | PASS | PARTIAL | FAIL | UNTESTED |
| ----------------------- | --------- | ---- | ------- | ---- | -------- |
| A. Discovery & Trust    | Q1-Q4     |      |         |      |          |
| B. Lead & Opportunity   | Q5-Q8     |      |         |      |          |
| C. Event Collaboration  | Q9-Q12    |      |         |      |          |
| D. Persistent Spaces    | Q13-Q15   |      |         |      |          |
| E. Community & Growth   | Q16-Q19   |      |         |      |          |
| F. Cross-System Data    | Q20-Q23   |      |         |      |          |
| G. Partner Transparency | Q24-Q26   |      |         |      |          |
| H. Edge Cases           | Q27-Q30   |      |         |      |          |
| **Total**               | **30**    |      |         |      |          |

---

## Gap Inventory

> Populated after investigation. Ranked by severity.

| #   | Gap | Severity | Domain | Fix Approach |
| --- | --- | -------- | ------ | ------------ |
|     |     |          |        |              |
