# CHEFFLOW — COMPLETE ACTION INVENTORY

## Every Action from First Contact to Months After Service

### Version 1.0 — February 19, 2026

This document enumerates every single action and micro-action the chef performs from the moment an inquiry arrives through complete service closure and the long-tail relationship maintenance that follows months later. It is organized by the 18-stage lifecycle model from the Master Document, expanded to capture the real human granularity observed across the February 14–16 dinner window.

Each action is tagged:
- **[CHEF]** = Human action by the chef
- **[SYSTEM]** = ChefFlow performs autonomously
- **[DRAFT]** = ChefFlow drafts, chef approves
- **[PHYSICAL]** = Real-world physical action (not digital)
- **[MENTAL]** = Cognitive/decision action
- **[FINANCIAL]** = Money-related action

Running count provided at the end of each stage.

---

## PHASE 1: INTAKE & QUALIFICATION (Stages 1–2)

### Stage 1 — Inquiry Intake

**1.1 — Message Arrives**
1. [SYSTEM] Detect inbound message (email, intake form, or manual capture trigger)
2. [SYSTEM] Identify source channel (text, email, Instagram DM, Take a Chef, website form, phone, referral, word of mouth)
3. [SYSTEM] Timestamp the message
4. [SYSTEM] Log raw message verbatim (full text, screenshots, voice transcription — whatever arrived)
5. [CHEF] If non-integrated channel (text, Instagram, Take a Chef, phone): manually log via Quick-Capture
6. [CHEF] If phone call: mentally note or voice-capture the key details before they fade
7. [CHEF] If mid-service when inquiry arrives: consciously decide to defer (do not respond now)

**1.2 — Client Identification**
8. [SYSTEM] Check if sender matches an existing client record
9. [SYSTEM] If known client: link inquiry to existing client record, pull history
10. [SYSTEM] If unknown client: create client stub (name, contact method, source channel)
11. [SYSTEM] If referral mentioned: create referral record, link referring client
12. [MENTAL] Chef recognizes the person (or doesn't) — "Oh, that's Murr" vs "Who is this?"
13. [CHEF] If the name is ambiguous or a nickname: note the real name for the record

**1.3 — Fact Extraction**
14. [SYSTEM] Extract confirmed facts from message: date, guest count, location, occasion, budget, dietary restrictions, service style, time preference
15. [SYSTEM] Mark everything NOT explicitly stated as "unknown"
16. [SYSTEM] Flag any dietary restrictions or allergies found (permanent prominence)
17. [SYSTEM] If repeat client: pull established rate, past menus, known preferences, site notes, household info
18. [SYSTEM] If repeat client: pre-populate event shell from client history
19. [MENTAL] Chef mentally assesses: Is this real? Do I want this gig? Can I do this date?

**1.4 — Blocking Questions**
20. [SYSTEM] Generate list of blocking questions — what must be known before quoting
21. [SYSTEM] Determine which lifecycle stage the inquiry is at based on confirmed facts
22. [SYSTEM] Calculate: how many unknowns remain before qualification is possible

**1.5 — Record Creation**
23. [SYSTEM] Create Inquiry record with status "new"
24. [SYSTEM] Link inquiry to client record
25. [SYSTEM] Add to unified inbox
26. [SYSTEM] Set priority ranking (repeat client > new client, higher value > lower value, sooner date > later date)

**1.6 — First Response**
27. [DRAFT] Draft first response in chef's voice using voice profile + stage-specific manifesto rules
28. [CHEF] Review draft in approval queue
29. [CHEF] Edit draft if needed (tone, wording, add personal touch)
30. [CHEF] Approve and send
31. [SYSTEM] Log sent message, attach to inquiry record
32. [SYSTEM] Set inquiry status to "awaiting_client"
33. [SYSTEM] Start follow-up timer (default 24 hours)

**1.7 — Availability Check**
34. [MENTAL] Chef checks mental calendar (before ChefFlow: scroll through texts/memory)
35. [SYSTEM] Check calendar for conflicts on requested date
36. [SYSTEM] If conflict exists: flag it, surface both inquiries with context
37. [MENTAL] If conflict: chef decides which to prioritize (or whether both are possible)

**Stage 1 subtotal: 37 actions**

---
### Stage 2 — Qualification

**2.1 — Client Reply Processing**
38. [SYSTEM] Detect client reply
39. [SYSTEM] Match reply to existing inquiry record
40. [SYSTEM] Extract new confirmed facts from reply
41. [SYSTEM] Update inquiry record — confirmed facts only, never assumptions
42. [SYSTEM] Remove answered blocking questions from the list
43. [SYSTEM] Add any new unknowns surfaced by the reply
44. [SYSTEM] Log the reply verbatim

**2.2 — Fact Confirmation Loop** (may repeat multiple times)
45. [SYSTEM] Check: Is date confirmed? (Y/N)
46. [SYSTEM] Check: Is guest count confirmed? (Y/N)
47. [SYSTEM] Check: Is location confirmed? (Y/N)
48. [SYSTEM] Check: Are dietary restrictions/allergies confirmed? (Y/N)
49. [SYSTEM] Check: Is service style confirmed? (sit-down, buffet, cocktail, etc.) (Y/N)
50. [SYSTEM] Check: Is serve time confirmed or estimable? (Y/N)
51. [SYSTEM] Check: Is budget discussed or implied? (Y/N)
52. [SYSTEM] Check: Is occasion known? (Y/N)

**2.3 — Follow-Up Management**
53. [SYSTEM] If follow-up timer expires (no client reply): flag as overdue
54. [DRAFT] Draft follow-up message for approval
55. [CHEF] Review and approve follow-up (or dismiss if not needed yet)
56. [SYSTEM] If chef doesn't respond to overdue flag: escalate in daily briefing
57. [MENTAL] Chef decides: Am I chasing this or letting it go?

**2.4 — Qualification Decision**
58. [SYSTEM] Assess: Are all blocking questions answered? Are minimum qualification facts confirmed?
59. [MENTAL] Chef decides: Am I ready to quote? Do I have enough to build a menu?
60. [SYSTEM] Mark inquiry as "qualified"
61. [SYSTEM] If anti-time-waster guardrails triggered (below minimum guest count, spend, lead time, or radius): surface flag to chef
62. [MENTAL] Chef decides whether to proceed despite guardrail flag or decline

**Stage 2 subtotal: 25 actions (cumulative: 62)**

---

## PHASE 2: MENU & PRICING (Stages 3–5)

### Stage 3 — Menu Development

**3.1 — Creative Concepting**
63. [MENTAL] Chef considers the client: Who are they? What do they like? What have they had before?
64. [SYSTEM] Surface past menus for this client (if repeat) — avoid repeats, offer to bring back favorites
65. [SYSTEM] Surface client preferences: favorite cuisines, flavor profiles, specific compliments from past events
66. [SYSTEM] Surface dietary restrictions and allergies — these constrain the menu
67. [MENTAL] Chef considers occasion: Valentine's Day calls for romance, birthday calls for celebration, casual calls for comfort
68. [MENTAL] Chef considers guest count: 2 guests = intimate plating, 12 guests = family-style possible
69. [MENTAL] Chef considers season/market: what's good right now? What's available?
70. [MENTAL] Chef decides course count (typically 3–4 for dinner)
71. [MENTAL] Chef identifies the "gravity center" of each course — the anchor protein/concept

**3.2 — Internal Menu Drafting**
72. [CHEF] Draft internal menu v1 — this is the full version with every component
73. [CHEF] For each dish: break down into components (the production view, not the pretty name)
74. [MENTAL] Flag high-risk components (things that can go wrong: soufflés, tempering chocolate, live-fire)
75. [MENTAL] Flag flexible/market components (things that depend on what looks good at the store)
76. [MENTAL] Flag time-intensive components (things that need early prep: doughs, marinades, ice cream bases, stocks)
77. [CHEF] For each component: mentally assess — do I have a recipe for this or am I winging it?
78. [SYSTEM] Flag components with no saved recipe in the Recipe Bible

**3.3 — Client-Facing Menu**
79. [CHEF] Draft client-facing version — the pretty names, no production detail
80. [MENTAL] Decide what level of detail the client sees (some clients want ingredients listed, some want just dish names)
81. [MENTAL] Decide whether to offer options or present a fixed menu
82. [DRAFT] Format the client-facing menu proposal
83. [CHEF] Review formatted proposal
84. [CHEF] Approve and send to client

**3.4 — Client Feedback Loop** (may repeat 1–5 times)
85. [SYSTEM] Detect client response to menu proposal
86. [SYSTEM] Log client feedback (edits, approvals, questions, concerns)
87. [MENTAL] Chef assesses feedback: Is this a minor tweak or a fundamental change?
88. [CHEF] Revise menu based on feedback
89. [CHEF] If substitution required: decide replacement component
90. [SYSTEM] Track menu revision (version log: what changed, when, why)
91. [CHEF] Send revised menu for approval
92. [SYSTEM] Repeat until client confirms

**3.5 — Menu Lock**
93. [SYSTEM] Client confirms menu — lock structure
94. [SYSTEM] Create finalized menu record (locked version — the agreed-upon menu)
95. [SYSTEM] Generate component breakdown per course with component counts
96. [SYSTEM] Confirm headcount deadline (if guest count might still change)
97. [SYSTEM] Confirm serve time anchor
98. [SYSTEM] Trigger downstream document generation: grocery list skeleton unlocks

**Stage 3 subtotal: 36 actions (cumulative: 98)**

---
### Stage 4 — Pricing & Quote

**4.1 — Price Calculation**
99. [SYSTEM] Pull client's established rate (if repeat client)
100. [SYSTEM] If new client: pull chef's pricing configuration (per person, flat rate, tiered)
101. [MENTAL] Chef considers: standard rate or adjusted? Discount for small party? Premium for complexity?
102. [SYSTEM] Calculate total based on guest count × rate (or flat rate)
103. [MENTAL] Chef decides deposit structure: deposit + balance, full upfront, or pay at service
104. [SYSTEM] If recipe bible has entries for these components: calculate projected food cost
105. [SYSTEM] Surface budget guardrail: "At your target margin, this dinner supports $X in groceries"

**4.2 — Quote Delivery**
106. [DRAFT] Draft quote/proposal message including: price, what's included, payment terms, deposit amount (if applicable), cancellation policy reference
107. [CHEF] Review quote draft
108. [CHEF] Approve and send
109. [SYSTEM] Set inquiry status to "quoted"
110. [SYSTEM] Start quote expiration timer (configurable, e.g., 7 days)
111. [SYSTEM] Snapshot pricing at time of quote (frozen for audit)

**4.3 — Quote Response**
112. [SYSTEM] Detect client response to quote
113. [MENTAL] Chef assesses: Accepted? Wants to negotiate? Declined?
114. [SYSTEM] If accepted: convert inquiry to event
115. [SYSTEM] Create Event record from Inquiry
116. [SYSTEM] Snapshot all pricing as locked (ledger entry)
117. [SYSTEM] Lock calendar date
118. [DRAFT] Draft booking confirmation message
119. [CHEF] Review and approve confirmation
120. [SYSTEM] Send confirmation, set status to "booked"
121. [SYSTEM] If rejected: mark inquiry as declined, log reason if provided
122. [SYSTEM] If no response and timer expires: mark as expired, flag for follow-up

**Stage 4 subtotal: 24 actions (cumulative: 122)**

---

### Stage 5 — Financial Commitment

**5.1 — Payment Collection (if deposit required)**
123. [CHEF] Send payment request (Venmo, invoice, or verbal request for cash)
124. [SYSTEM] Track that payment request was sent
125. [CHEF] Receive payment (Venmo notification, cash handoff, bank transfer)
126. [SYSTEM] Create payment ledger entry (append-only): amount, method, date, type (deposit)
127. [SYSTEM] Attach payment to event record
128. [SYSTEM] Update event payment status: unpaid → deposit_paid
129. [DRAFT] Draft payment acknowledgment message
130. [CHEF] Approve and send acknowledgment
131. [SYSTEM] Mark event as financially committed
132. [SYSTEM] Unlock execution planning documents

**5.2 — No Deposit Scenario**
133. [SYSTEM] If payment is due at service (no deposit): note payment expectation on event
134. [SYSTEM] Surface reminder in day-of briefing: "Payment of $X expected. Preferred method: [cash/Venmo]"

**Stage 5 subtotal: 12 actions (cumulative: 134)**

---

## PHASE 3: PLANNING & PRODUCTION (Stages 6–10)

### Stage 6 — Grocery List Creation

**6.1 — Skeleton Generation**
135. [SYSTEM] Menu confirmed → generate grocery list skeleton from component breakdown
136. [SYSTEM] For each component: break into shoppable ingredient units
137. [SYSTEM] Categorize: proteins, produce, dairy/fats, pantry, specialty items
138. [SYSTEM] Separate already-owned staples (salt, oil, pepper, flour, etc.) from must-buy
139. [SYSTEM] Check carry-forward inventory from recent events: "You have leftover burrata, brie from 2 days ago"

**6.2 — Quantity Population**
140. [SYSTEM] Guest count confirmed → populate quantities per ingredient
141. [SYSTEM] If recipe bible has entries: pull exact quantities, scale by guest count
142. [SYSTEM] If no recipe entry: estimate quantities (chef refines)
143. [CHEF] Review quantities — adjust based on experience and judgment

**6.3 — Refinement**
144. [SYSTEM] Add insurance items (extras of critical ingredients, backups)
145. [SYSTEM] Mark flexible/market items (things that depend on what looks good)
146. [SYSTEM] Add "if unavailable" substitution suggestions for critical items
147. [CHEF] Review full grocery list — add, remove, adjust
148. [CHEF] Confirm which items are truly on hand vs assumed on hand
149. [MENTAL] Chef considers: Do I need anything from a specialty store? Liquor store? Bakery?

**6.4 — Store Assignment**
150. [SYSTEM] Group items by store (grocery store, liquor store, specialty)
151. [SYSTEM] Pull chef's default store preferences with addresses
152. [SYSTEM] Generate store route (optimized stop order with addresses)
153. [CHEF] Confirm or adjust store plan

**6.5 — Finalization**
154. [SYSTEM] Mark grocery list as finalized
155. [SYSTEM] Trigger: prep list generation now available
156. [SYSTEM] Surface budget guardrail: "Projected grocery spend for this dinner: $X"

**Stage 6 subtotal: 22 actions (cumulative: 156)**

---
### Stage 7 — Prep List Creation

**7.1 — Task Generation**
157. [SYSTEM] Generate prep tasks from every component in the menu
158. [SYSTEM] Write prep outcomes, not instructions ("Potatoes: boiled, riced, mixed with infused milk, in casserole dish" — not step-by-step)
159. [SYSTEM] For each task: determine if early-prep safe (24-48h ahead) or day-of only

**7.2 — Dependency Analysis**
160. [SYSTEM] Split into PREP NOW (on-hand ingredients) vs PREP AFTER SHOPPING (grocery-dependent)
161. [SYSTEM] Within each section: organize by course order
162. [SYSTEM] Within each course: priority order — longest cook time first, pack-only tasks last
163. [SYSTEM] Add texture-sensitive exclusions (things that degrade: dressed salads, fried items, cut avocado)
164. [SYSTEM] Add storage notes for prepped items (fridge, freezer, room temp, covered vs uncovered)

**7.3 — Chef Review**
165. [CHEF] Review prep list — reorder, add notes, flag anything the system got wrong
166. [MENTAL] Chef mentally walks through the prep sequence: Does this flow make sense? What am I missing?
167. [SYSTEM] Define 80% calm threshold: "If you complete these items, you're 80% prepared"
168. [SYSTEM] Mark prep list as ready

**Stage 7 subtotal: 12 actions (cumulative: 168)**

---

### Stage 8 — Equipment Planning

169. [SYSTEM] Generate equipment list from menu components and prep methods
170. [SYSTEM] Categorize: must-bring (items the chef always carries)
171. [SYSTEM] Categorize: assume-exists at client (basic pots, pans, oven — confirmed from site profile)
172. [SYSTEM] Categorize: confirm-required (items the chef isn't sure about at this location)
173. [SYSTEM] Add plating tools specific to this menu (squeeze bottles, ring molds, offset spatula)
174. [SYSTEM] Add specialty tools (ice cream machine, sous vide circulator, torch, vacuum sealer)
175. [SYSTEM] Add redundancy items (backup tongs, extra towels)
176. [SYSTEM] If repeat client: pull site profile — "Last time at this address, they had butter but no parchment paper"
177. [CHEF] Review and confirm equipment list
178. [SYSTEM] Mark equipment list as ready

**Stage 8 subtotal: 10 actions (cumulative: 178)**

---

### Stage 9 — Packing / Car Load

**9.1 — Packing Plan**
179. [SYSTEM] Generate packing list grouped by transport category: cold bin, dry bin, tools bin, fragile items
180. [SYSTEM] Include component count per course for packing verification
181. [SYSTEM] Generate Non-Negotiables Checklist (permanent items + event-specific items)

**9.2 — Physical Packing**
182. [PHYSICAL] Pack cold items into cooler (proteins first, dairy, prepped components in labeled containers)
183. [PHYSICAL] Pack dry items (pantry ingredients, parchment paper, trash bags)
184. [PHYSICAL] Pack tools (knives, tongs, spatulas, squeeze bottles, plating tools)
185. [PHYSICAL] Protect fragile items (cake in separate bag/container, mousse containers upright)
186. [PHYSICAL] Secure liquids (sauces, oils, stocks — upright, sealed, no leak risk)
187. [PHYSICAL] Pack specialty equipment (ice cream machine, sous vide, etc.)
188. [PHYSICAL] Pack chef uniform, apron, clean shoes — hang or bag separately
189. [PHYSICAL] Final frozen items loaded last (ice cream base, frozen cake portions)

**9.3 — Verification**
190. [CHEF] Walk the Non-Negotiables Checklist: gloves ✓, gum ✓, uniform ✓, shoes ✓, towels ✓, trash bags ✓, parchment ✓, salt ✓, oil ✓, pepper ✓, butter ✓
191. [CHEF] Verify component count per course against packing list: "Course 2 has 5 components — do I have 5 things for Course 2?"
192. [PHYSICAL] Load car in correct order (heavy/stable items first, fragile on top, cold together)
193. [SYSTEM] Mark car as packed and ready

**Stage 9 subtotal: 15 actions (cumulative: 193)**

---

### Stage 10 — Timeline Creation

**10.1 — Schedule Generation**
194. [SYSTEM] Anchor serve time (e.g., 7:00 PM)
195. [SYSTEM] Calculate arrival time (serve time minus setup/preheat buffer, typically 60-90 min)
196. [SYSTEM] Calculate departure time (arrival time minus travel time minus buffer)
197. [SYSTEM] Calculate: car must be packed by [departure - 30 min]
198. [SYSTEM] Calculate: prep must be finished by [car pack time]
199. [SYSTEM] Calculate: shopping must be done by [prep start time]
200. [SYSTEM] Calculate: wake up / start day by [shopping time - morning buffer]
201. [SYSTEM] Generate day-of route plan: home → store 1 → store 2 (if needed) → client, with addresses and drive times

**10.2 — Course Sequencing**
202. [SYSTEM] Sequence courses with timing: when does each course fire? What's the gap between courses?
203. [SYSTEM] Identify overlap tasks (things that run simultaneously: oven items + stovetop items)
204. [SYSTEM] Identify non-rush moments (natural pauses between courses where cleanup happens)
205. [SYSTEM] Factor in on-site tasks that happen before first course (sous vide start, oven preheat, setup)

**10.3 — Three Printed Documents**
206. [SYSTEM] Generate Printed Sheet #1 — Prep Sheet (at-home tasks by course, dependency split, priority order)
207. [SYSTEM] Generate Printed Sheet #2 — Service Execution Sheet (on-site only, clean menu reference, component counts, dietary flags, allergy warnings)
208. [SYSTEM] Generate Printed Sheet #3 — Non-Negotiables Checklist
209. [SYSTEM] Ensure each sheet fits on ONE page (adapt font size/spacing as needed)
210. [CHEF] Review all three printed sheets
211. [CHEF] Print all three sheets

**Stage 10 subtotal: 18 actions (cumulative: 211)**

---
## PHASE 4: THE DAY BEFORE (DOP Window)

### Interstitial: Day-Before Actions (Standard Lead Time)

These happen outside any single stage — they're DOP-driven behaviors.

**Shopping**
212. [PHYSICAL] Drive to grocery store
213. [PHYSICAL] Walk the store — follow the grocery list, check items off
214. [MENTAL] At each item: assess quality, freshness, size — make selection
215. [MENTAL] If item unavailable: decide on substitution (use pre-planned substitution if available)
216. [CHEF] If substitution made: note it mentally (capture formally post-shopping)
217. [PHYSICAL] If liquor/specialty store needed: drive to second stop
218. [PHYSICAL] Purchase at second stop
219. [FINANCIAL] Pay — note which card/method (business Amex for cash-back optimization)
220. [PHYSICAL] Get receipt(s)
221. [CHEF] Photograph receipt immediately (DOP — mandatory)
222. [PHYSICAL] Drive home
223. [PHYSICAL] Unload groceries — separate business items from personal items if mixed trip
224. [PHYSICAL] Put away items that need refrigeration immediately
225. [CHEF] Log any substitutions: what was planned vs what was bought

**Early Prep (Day Before)**
226. [PHYSICAL] Pull out prepped-now items and begin early-prep tasks
227. [PHYSICAL] Make doughs, marinades, bases, purees, sauces (anything that holds overnight)
228. [PHYSICAL] Vacuum seal proteins (if sous vide planned)
229. [PHYSICAL] Make ice cream base (if churning on-site tomorrow)
230. [PHYSICAL] Portion and freeze items for transport (cake slices, mousse portions)
231. [PHYSICAL] Label all containers (component name, course number)
232. [PHYSICAL] Store prepped items properly (fridge, freezer, counter — per storage notes)
233. [PHYSICAL] Clean up kitchen after early prep

**Receipt Processing**
234. [CHEF] Upload receipt photo(s) to ChefFlow
235. [SYSTEM] OCR/AI extracts line items, prices, totals, store info
236. [SYSTEM] Present dual view: original photo + clean extracted version
237. [CHEF] Review and approve extraction accuracy
238. [CHEF] Tag each line item: business or personal, which event, ingredient category
239. [SYSTEM] Disperse approved data into: event financial record, ingredient price database, costing engine

**Day-before subtotal: 28 actions (cumulative: 239)**

---

## PHASE 5: DAY OF SERVICE (Stages 11–13)

### Interstitial: Morning-Of Actions

240. [CHEF] Wake up (ideally at system-suggested time)
241. [CHEF] Open ChefFlow — review daily briefing
242. [SYSTEM] Present daily briefing: today's event, preparation status, any overdue items, approval queue, upcoming events
243. [MENTAL] Chef mentally confirms the plan: "I know what I'm cooking, I have everything I need"

**Remaining Prep (Day-Of)**
244. [PHYSICAL] Execute day-of prep tasks (portioning, assembly, texture-sensitive items)
245. [PHYSICAL] Shape pasta (if handmade)
246. [PHYSICAL] Final seasoning, tasting, adjusting
247. [PHYSICAL] Arrange components for packing: group by course, label everything
248. [MENTAL] Walk through the menu one more time: "Course 1 is... Course 2 is... Course 3 is..."

**Packing**
249. [PHYSICAL] Execute packing sequence (see Stage 9 physical actions)
250. [PHYSICAL] Walk the Non-Negotiables Checklist one final time
251. [PHYSICAL] Verify component count per course
252. [PHYSICAL] Load car
253. [PHYSICAL] Put on clean uniform / chef jacket
254. [PHYSICAL] Grab printed sheets (all three)
255. [PHYSICAL] Final walk-through of house: anything left behind?

**Morning-of subtotal: 16 actions (cumulative: 255)**

---

### Stage 11 — Travel & Arrival

**11.1 — Travel**
256. [SYSTEM] Confirm client address (surface it — no searching)
257. [SYSTEM] Surface access instructions ("enter through garage," "alarm is off")
258. [PHYSICAL] Depart house at scheduled time
259. [PHYSICAL] Drive to client's home
260. [MENTAL] During drive: mentally rehearse the cook — Course 1 fires first, what needs to happen immediately upon arrival
261. [CHEF] If running late: notify client (pre-drafted message option in approval queue)

**11.2 — Arrival & Setup**
262. [PHYSICAL] Park, unload car, bring everything inside (multiple trips usually)
263. [PHYSICAL] Find the kitchen, set down equipment
264. [PHYSICAL] Conduct kitchen scan: Where's the oven? Stove burners? Counter space? Sink access?
265. [PHYSICAL] Confirm house rules (shoes off? Specific areas off-limits?)
266. [PHYSICAL] Establish workspace: claim counter space, set up cutting board, organize tools
267. [PHYSICAL] Tape Service Execution Sheet to cabinet/wall where you can see it
268. [PHYSICAL] Preheat oven (if needed for first tasks)
269. [PHYSICAL] Start any long-running items immediately (sous vide on, slow oven items in, water boiling)
270. [PHYSICAL] Unpack cold items into client's fridge or keep in cooler strategically
271. [PHYSICAL] Greet client, brief social interaction ("How are you? The house looks great.")
272. [MENTAL] Read the room: what's the energy? Are they dressed up? Are they relaxed? Adjust your demeanor.

**Stage 11 subtotal: 17 actions (cumulative: 272)**

---
### Stage 12 — Execution

**12.1 — Pre-Service**
273. [PHYSICAL] Stage all plating tools within arm's reach
274. [PHYSICAL] Stage all components for Course 1 (pull from fridge, set on counter)
275. [PHYSICAL] Confirm timing with client: "I'm planning to serve the first course around [time], does that work?"
276. [MENTAL] Assess: Am I calm? Am I on schedule? Anything feel off?

**12.2 — Course Execution** (repeats for each course)

*Course 1:*
277. [PHYSICAL] Execute Course 1 — all cooking actions (sear, sauté, boil, plate)
278. [PHYSICAL] Plate Course 1 with care and intention
279. [PHYSICAL] Deliver Course 1 to table, brief description to clients
280. [PHYSICAL] Return to kitchen — immediate station reset (wash pans, clear counter, wipe down)
281. [MENTAL] Read the clients: Are they eating? Enjoying? How fast?
282. [MENTAL] Time the gap: When should Course 2 fire?

*Course 2:*
283. [PHYSICAL] Stage components for Course 2
284. [PHYSICAL] Execute Course 2 — all cooking actions
285. [PHYSICAL] Adapt to any in-service changes (sous vide bags forgotten → straight sear, client requests modification)
286. [PHYSICAL] Plate Course 2
287. [PHYSICAL] Deliver Course 2, description
288. [PHYSICAL] Station reset

*Course 3 (and any additional courses):*
289. [PHYSICAL] Stage components for Course 3
290. [PHYSICAL] Execute Course 3 — all cooking/assembly actions
291. [PHYSICAL] If on-site production (churning ice cream, torching crème brûlée): execute now
292. [PHYSICAL] Plate Course 3
293. [PHYSICAL] Deliver Course 3, description

**12.3 — Throughout Execution**
294. [PHYSICAL] Clean as you go — every pause between tasks, wash something
295. [PHYSICAL] Monitor pacing — don't rush courses, don't let gaps get too long
296. [MENTAL] Adapt to constraints in real-time (small oven, broken burner, missing ingredient, client delay)
297. [MENTAL] Monitor guest satisfaction — are they happy? Any issues?
298. [PHYSICAL] Kitchen substantially clean before dessert is served (DOP/standard)

**12.4 — Inbound Inquiries During Service**
299. [SYSTEM] New inquiries arrive (texts, DMs, calls) — agent handles classification and record creation autonomously
300. [SYSTEM] If auto-acknowledgment enabled: system sends "chef is in service" message (NOT chef voice)
301. [SYSTEM] Queue proper first responses for chef approval post-service
302. [MENTAL] Chef may notice phone buzz — consciously decides NOT to engage (no phone during service)

**Stage 12 subtotal: 30 actions (cumulative: 302)**

---

### Stage 13 — Breakdown

**13.1 — Kitchen Cleanup**
303. [PHYSICAL] Wash all remaining dishes, pots, pans
304. [PHYSICAL] Wipe all counters to baseline (cleaner than when you arrived)
305. [PHYSICAL] Clean stovetop
306. [PHYSICAL] Clean oven (if used and anything spilled)
307. [PHYSICAL] Sweep/wipe floor in work area
308. [PHYSICAL] Take out trash (your trash — food scraps, packaging, parchment paper)
309. [PHYSICAL] Return client's kitchen items to where they were

**13.2 — Pack Out**
310. [PHYSICAL] Pack all tools and equipment back into bags/bins
311. [PHYSICAL] Pack any leftover food (label for client or take home)
312. [PHYSICAL] Pack cooler with items going home
313. [PHYSICAL] Do a sweep of the kitchen: anything left behind? A spatula in a drawer? A squeeze bottle on the counter?
314. [PHYSICAL] Load car (everything out in one or two trips)

**13.3 — Departure**
315. [PHYSICAL] Change out of chef jacket if appropriate
316. [CHEF] Social interaction with clients — this is relationship time (may last 5 minutes or 40+ minutes)
317. [FINANCIAL] Collect payment if settling on-site (cash handoff, Venmo request confirmed)
318. [MENTAL] Read the room: do they want you to stay and chat or are they ready for the evening?
319. [PHYSICAL] Say goodbye warmly, thank them
320. [PHYSICAL] Leave the location
321. [PHYSICAL] Drive home

**Stage 13 subtotal: 19 actions (cumulative: 321)**

---

## PHASE 6: POST-EVENT (Stages 14–18)

### Stage 14 — Post-Event Capture

**14.1 — Immediate Capture (Drive Home / Evening Of)**
322. [CHEF] Mentally review the evening while it's fresh — what happened, what landed, what didn't
323. [SYSTEM] Prompt: "How was tonight's service? Quick capture while it's fresh."
324. [CHEF] Log menu performance notes: which dishes the client specifically loved, which were just okay
325. [CHEF] Log client behavior notes: mood, conversation topics, tipping behavior, how they said goodbye
326. [CHEF] Log site notes: anything new about the kitchen, the location, the access
327. [CHEF] Log any modifications made during service (proposed menu vs actually served)
328. [SYSTEM] Create event completion record
329. [SYSTEM] Update event status: in_progress → completed

**14.2 — Recipe Capture Prompt**
330. [SYSTEM] Check: which components served tonight don't have recipe bible entries?
331. [SYSTEM] Prompt: "You made [Sherry Pan Sauce] tonight but there's no recipe for it. Want to record it?"
332. [CHEF] Record recipe via voice, text, or structured form (ingredients, method, yield, notes)
333. [CHEF] Or dismiss — system notes it, may re-surface once later
334. [SYSTEM] Save recipe, link to component, link to event

**Stage 14 subtotal: 13 actions (cumulative: 334)**

---

### Stage 15 — Follow-Up

335. [SYSTEM] Next day: prompt chef to send follow-up message
336. [DRAFT] Draft follow-up in chef's voice: thank-you, reference specific moments from the dinner ("Justin, that sherry sauce was something special — glad you loved it"), warm closing
337. [DRAFT] Include review link (Google, Yelp, Take a Chef — whichever is most appropriate)
338. [CHEF] Review follow-up draft
339. [CHEF] Edit if needed — add personal touches, correct any details
340. [CHEF] Approve and send
341. [SYSTEM] Mark follow-up as sent
342. [SYSTEM] Start review response timer: if client posts a review, prompt chef to respond

**Stage 15 subtotal: 8 actions (cumulative: 342)**

---
### Stage 16 — Financial Closure

**16.1 — Payment Settlement**
343. [SYSTEM] Check: has payment been received for this event?
344. [CHEF] If not paid on-site: send payment request (Venmo, invoice) — DOP: within 24 hours
345. [SYSTEM] If payment not received at 24 hours: flag as overdue
346. [SYSTEM] If payment not received at 48 hours: escalate flag
347. [CHEF] Receive payment
348. [SYSTEM] Create payment ledger entry: amount, method, date, type (final payment)
349. [SYSTEM] If tip received: create separate ledger entry for tip amount
350. [FINANCIAL] Record payment method used (cash, Venmo, PayPal, card)

**16.2 — Cost Capture**
351. [CHEF] Upload receipt photo(s) if not already done (DOP — mandatory for financial closure)
352. [SYSTEM] Process receipt(s) through digitization pipeline
353. [CHEF] Approve extracted data
354. [CHEF] Tag line items (business/personal, event assignment, category)
355. [SYSTEM] Calculate actual food cost for this event
356. [SYSTEM] Calculate actual profit margin
357. [SYSTEM] Calculate effective hourly rate (revenue / total hours invested)
358. [SYSTEM] Log mileage/gas for this event
359. [SYSTEM] Log time invested per phase (shopping, prep, travel, service, reset)

**16.3 — Leftover Accounting**
360. [CHEF] Flag any bought-but-unused items (berry sorbet never served, etc.)
361. [SYSTEM] Log unused items: leftover inventory (transfers to next dinner) or wasted cost (stays on this event)
362. [SYSTEM] Update carry-forward inventory for next event

**16.4 — Closure**
363. [SYSTEM] Generate event financial summary: revenue, expenses, food cost %, margin, hourly rate
364. [SYSTEM] Record any add-ons (extra course, additional guests, etc.)
365. [SYSTEM] Mark event as financially closed
366. [SYSTEM] Feed data into monthly revenue tracking vs $10K target

**Stage 16 subtotal: 24 actions (cumulative: 366)**

---

### Stage 17 — Inquiry Closure

367. [SYSTEM] Verify: all closure requirements met? (payment ✓, follow-up ✓, receipts ✓, AAR filed ✓, reset complete ✓)
368. [SYSTEM] Mark original inquiry as closed
369. [SYSTEM] Update client status: repeat-ready (or VIP, or dormant — based on history)
370. [SYSTEM] Update client lifetime value
371. [SYSTEM] Update loyalty points (guests served × point rate)
372. [SYSTEM] Archive the event with full documentation

**Stage 17 subtotal: 6 actions (cumulative: 372)**

---

### Stage 18 — Post-Service Reset + Retrospective

**18.1 — Physical Reset (Night of service or by noon next day)**
373. [PHYSICAL] Bring everything inside from the car
374. [PHYSICAL] Break down cooler — empty, wash, dry, store
375. [PHYSICAL] Put away leftover food — fridge or toss, label leftovers with date
376. [PHYSICAL] Dishes in dishwasher or hand wash
377. [PHYSICAL] Towels and chef uniform in the washing machine
378. [PHYSICAL] Equipment bags emptied, cleaned, collapsed, stored
379. [PHYSICAL] Car cleared completely — nothing left in the vehicle
380. [PHYSICAL] Wipe down any home kitchen surfaces used during prep
381. [PHYSICAL] Take out home trash if full from prep
382. [SYSTEM] If previous event's reset is incomplete: surface compounding warning — "Michel's cooler from Feb 14 is still on the deck"

**18.2 — After Action Review (Retrospective)**
383. [SYSTEM] Prompt for AAR
384. [CHEF] Rate: How calm was the service? (1–5)
385. [CHEF] Rate: How prepared were you? (1–5)
386. [CHEF] Answer: Could anything have been done earlier? (free text)
387. [CHEF] Answer: Did you forget anything? (checklist + free text)
388. [CHEF] Answer: What went well? (free text)
389. [CHEF] Answer: What went wrong? (free text)
390. [CHEF] Log: Menu performance notes (which dishes landed, which didn't)
391. [CHEF] Log: Client behavior notes (for relationship record)
392. [CHEF] Log: Site notes (anything new about the location)

**18.3 — System Learning from AAR**
393. [SYSTEM] If items were forgotten: check against Non-Negotiables Checklist
394. [SYSTEM] If an item was forgotten more than once across events: auto-promote to permanent checklist
395. [SYSTEM] Update client record with any new preferences, relationship notes, site notes
396. [SYSTEM] If menu modifications occurred: log proposed vs served for this event

**18.4 — Terminal State Verification**
397. [SYSTEM] Verify terminal state checklist:
  - ☐ Kitchen cleaned on-site
  - ☐ Equipment packed and brought home
  - ☐ Cooler broken down and cleaned
  - ☐ Leftovers stored or disposed
  - ☐ Dishes done
  - ☐ Laundry started
  - ☐ Equipment bags emptied and stored
  - ☐ Car cleared
  - ☐ Follow-up message sent
  - ☐ Payment received and recorded
  - ☐ Receipt(s) uploaded and approved
  - ☐ Tip recorded (if applicable)
  - ☐ Food cost calculated
  - ☐ After Action Review filed
  - ☐ Client record updated
  - ☐ No open loops remain
398. [SYSTEM] If all verified: mark event as TERMINAL — fully closed, no open loops
399. [SYSTEM] If any item missing: surface what's incomplete, prevent terminal state

**Stage 18 subtotal: 27 actions (cumulative: 399)**

---

## PHASE 7: THE LONG TAIL (Weeks to Months After Service)

These actions happen outside the 18-stage lifecycle of any single event. They represent the ongoing relationship, business intelligence, and institutional knowledge that accumulates between events.

### Ongoing — Client Relationship Maintenance

**Week 1–2 Post-Event**
400. [SYSTEM] Monitor: did the client post a review? (Google, Yelp, Take a Chef)
401. [SYSTEM] If review posted: notify chef, surface for response
402. [DRAFT] Draft review response in chef's voice
403. [CHEF] Approve and post review response
404. [SYSTEM] If client shared photos/tagged chef on social media: note in client record

**Month 1–3 Post-Event**
405. [SYSTEM] Monitor client status: are they dormant? Have they booked again?
406. [SYSTEM] If client milestone approaching (birthday, anniversary): surface outreach suggestion in daily briefing
407. [DRAFT] Draft milestone outreach message ("Happy birthday, Murr! If you and Justin want to celebrate with a dinner, I'd love to cook for you.")
408. [CHEF] Approve and send (or dismiss)
409. [SYSTEM] If holiday approaching (Valentine's Day, Mother's Day, Thanksgiving): surface proactive outreach for past clients who've booked for that holiday
410. [DRAFT] Draft holiday outreach: "Valentine's Day is coming up — want me to hold a date for you and Kelly?"
411. [CHEF] Approve and send

**Month 3–6 Post-Event**
412. [SYSTEM] Detect dormant repeat client (no booking in X months, configurable)
413. [SYSTEM] Surface re-engagement suggestion in daily briefing
414. [DRAFT] Draft re-engagement message (warm, not pushy, in chef's voice)
415. [CHEF] Approve and send (or dismiss)
416. [SYSTEM] If client referred someone who booked: note referral in both client records
417. [SYSTEM] Update referral source tracking

**Month 6+ Post-Event**
418. [SYSTEM] Annual booking anniversary detection: "It's been a year since Michel's Valentine's dinner"
419. [SYSTEM] Loyalty tier check: has this client crossed a loyalty threshold?
420. [SYSTEM] If loyalty reward eligible: surface to chef with suggested reward
421. [DRAFT] Draft loyalty notification to client
422. [CHEF] Approve and send

**Long-tail subtotal: 23 actions (cumulative: 422)**

---
### Ongoing — Business Intelligence

**Weekly**
423. [SYSTEM] Generate weekly summary: events completed, revenue booked vs received, pipeline status
424. [SYSTEM] Surface: which days next week have events? Which are prep days? Which are admin days?
425. [SYSTEM] Burnout threshold check: too many events stacked without rest days?
426. [SYSTEM] Slack detection: light week? Prompt to respond to old inquiries, check Take a Chef, reach out to dormant clients

**Monthly**
427. [SYSTEM] Monthly revenue report: actual vs $10K target
428. [SYSTEM] Monthly food cost average across all events
429. [SYSTEM] Monthly profit margin average
430. [SYSTEM] Revenue booked vs revenue received reconciliation
431. [SYSTEM] Ingredient price trend alerts: "Ribeyes averaged $18/lb this month, up from $14/lb last month"
432. [SYSTEM] Client acquisition channel performance: how many bookings from each source?
433. [SYSTEM] Conversion rate: inquiries → booked events

**Quarterly / Annually**
434. [SYSTEM] Recipe bible growth: how many new recipes captured this quarter?
435. [SYSTEM] Client retention rate: what % of clients rebooked?
436. [SYSTEM] Top clients by lifetime value
437. [SYSTEM] Busiest months / seasonal patterns
438. [SYSTEM] Average event profitability trend

**Business intelligence subtotal: 16 actions (cumulative: 438)**

---

### Ongoing — Institutional Knowledge Building

**Recipe Bible Growth**
439. [SYSTEM] Periodic prompt: "You've cooked [X] events this month. [Y] components still have no recipe entry. Want to capture some?"
440. [CHEF] Batch recipe capture (when feeling motivated — not forced)
441. [SYSTEM] Track recipe evolution: if chef modifies a recipe, preserve both versions
442. [SYSTEM] Link recipes to events — build usage history per recipe

**Template Refinement**
443. [CHEF] Create or refine reusable templates (cheese board for 4, dessert trio, etc.)
444. [SYSTEM] Templates auto-scale by guest count
445. [SYSTEM] Templates auto-respect allergy flags

**Non-Negotiables Refinement**
446. [SYSTEM] Analyze forgotten items across all events — detect patterns
447. [SYSTEM] Auto-promote frequently forgotten items to permanent checklist
448. [CHEF] Manually add items to permanent checklist based on experience

**Substitution Knowledge**
449. [SYSTEM] Build substitution database from post-shopping captures across all events
450. [SYSTEM] Over time: suggest substitutions based on history ("Last time parchment was unavailable, you used a greased and floured pan")

**Ingredient Price Intelligence**
451. [SYSTEM] Build price history per ingredient per store from all digitized receipts
452. [SYSTEM] Calculate average cost, cheapest source, seasonal patterns
453. [SYSTEM] Surface anomalies: "Shrimp is 30% cheaper this week at Market Basket"
454. [SYSTEM] Improve budget guardrail accuracy over time using real data

**Institutional knowledge subtotal: 16 actions (cumulative: 454)**

---

### Ongoing — Pipeline Management (Between Events)

**Daily**
455. [SYSTEM] Daily briefing on open: today's events, overdue items, approval queue, pipeline, preparable actions
456. [CHEF] Process approval queue: review and send pending messages
457. [CHEF] Respond to new inquiries (lifecycle restarts at Stage 1 for each)
458. [SYSTEM] Follow-up timer management: flag stale inquiries

**As Needed**
459. [CHEF] Decline inquiries that don't fit (date conflict, below minimum, outside radius)
460. [DRAFT] Draft decline message
461. [CHEF] Approve decline message
462. [SYSTEM] Mark inquiry as declined, log reason
463. [CHEF] Handle reschedules / cancellations
464. [SYSTEM] Update event status, process any refunds (ledger entries), update calendar
465. [SYSTEM] If cancellation: check cancellation policy, calculate any fees
466. [CHEF] If Take a Chef inquiry: log via Quick-Capture, manage conversation on platform, track in ChefFlow
467. [SYSTEM] Maintain unified inbox priority ranking across all active inquiries and events

**Pipeline management subtotal: 13 actions (cumulative: 467)**

---

## GRAND TOTAL

| Phase | Stages | Actions |
|-------|--------|---------|
| 1. Intake & Qualification | 1–2 | 62 |
| 2. Menu & Pricing | 3–5 | 72 |
| 3. Planning & Production | 6–10 | 77 |
| 4. Day Before (DOP) | Interstitial | 28 |
| 5. Day of Service | 11–13 | 82 |
| 6. Post-Event | 14–18 | 78 |
| 7. Long Tail | Ongoing | 68 |
| **TOTAL** | | **467** |

---

## ACTION TYPE DISTRIBUTION

| Tag | Description | Approximate Count |
|-----|-------------|------------------|
| [SYSTEM] | ChefFlow autonomous | ~195 |
| [CHEF] | Human action (digital) | ~95 |
| [PHYSICAL] | Real-world physical | ~85 |
| [MENTAL] | Cognitive/decision | ~45 |
| [DRAFT] | System drafts, chef approves | ~22 |
| [FINANCIAL] | Money-related | ~25 |

*Note: Some actions carry multiple tags. Totals exceed 467 because of overlap.*

---

## KEY INSIGHT

Of 467 total actions:
- **~195 are automatable by ChefFlow** (system-level, no human required)
- **~22 are draft-and-approve** (system does the work, chef just reviews)
- **That's ~217 actions (46%) where ChefFlow either does the work or does most of the work**

The chef's irreducible actions are:
- Creative decisions (menu concepting, adaptation)
- Physical cooking and transport
- Relationship moments (greetings, conversation, reading the room)
- Final approval on all client-facing communication
- Quality judgment (tasting, plating, assessing freshness)

Everything else is admin that the brigade handles.

---

END OF DOCUMENT
