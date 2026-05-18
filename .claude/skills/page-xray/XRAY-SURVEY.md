# Page X-Ray: The Exhaustive Survey (v2)

> 1261 questions across 27 dimensions + meta.
> Every question tagged by model tier: `[CODEX]` `[CLAUDE]` `[OPUS]` `[BOTH]`
> Answer ALL questions. "N/A" is valid data (tells Rail what to exclude).
> See [SCHEMAS.md](SCHEMAS.md) for answer classification, finding lifecycle, and scoring.

---

## Priority Tiers

Every question is tagged with a priority tier in addition to its model tier.

| Tier     | Tag    | When It Runs                         | Purpose                                                      |
| -------- | ------ | ------------------------------------ | ------------------------------------------------------------ |
| Core     | `[P1]` | Every scan (including --quick)       | High-signal questions that produce most actionable findings  |
| Standard | `[P2]` | Full and deep scans                  | Standard analysis, important but lower signal density        |
| Deep     | `[P3]` | Deep scans only (--deep or scan 10+) | Strategic vision, competitive analysis, future opportunities |

---

## Dimension 0: PAGE IDENTITY + DOMAIN WIRING [P1]

The page's birth certificate. Everything else comes after. Before asking what a page contains, what journey it supports, or what the Rail should show, the skill must know what this page IS and where it belongs.

1. [P1] `[CODEX]` What is the exact URL pattern for this page?
2. [P1] `[CODEX]` Is this a static route or dynamic route (contains `[param]`)?
3. [P1] `[CODEX]` What dynamic segments exist in the URL? List each with its entity type.
4. [P1] `[CODEX]` What file path owns this route? (e.g., `app/(chef)/events/[id]/page.tsx`)
5. [P1] `[CODEX]` What route group does this page belong to? (`(chef)`, `(public)`, `(client)`, `(admin)`)
6. [P1] `[CODEX]` What `layout.tsx` wraps this page? List the full layout chain from root.
7. [P1] `[CODEX]` Does this page have a co-located `loading.tsx`?
8. [P1] `[CODEX]` Does this page have a co-located `error.tsx`?
9. [P1] `[CODEX]` Does this page have a co-located `not-found.tsx`?
10. [P1] `[BOTH]` What is the PRIMARY ChefFlow domain that owns this page?
11. [P1] `[BOTH]` What SECONDARY domains does this page touch? List each with evidence (imports, data fetches).
12. [P1] `[CODEX]` How many distinct `lib/` domains are imported? List them.
13. [P1] `[CODEX]` Are all domain imports going through the domain's public interface (`index.ts` / barrel export)?
14. [P1] `[CODEX]` Is the page reaching around a domain layer? (importing from domain internals instead of interface)
15. [P1] `[CODEX]` Does the page import directly from `database/` instead of going through a domain?
16. [P1] `[CODEX]` Does the page contain raw SQL or direct drizzle queries instead of using domain functions?
17. [P1] `[BOTH]` Is this page's domain correctly reflected in the URL structure? (e.g., `/events/*` for events domain)
18. [P1] `[CLAUDE]` Is this page in the correct route group for its purpose?
19. [P1] `[CLAUDE]` Should this page exist in a different route group? Why?
20. [P1] `[CODEX]` Is this page duplicated elsewhere under a different route?
21. [P1] `[CLAUDE]` If duplicated, which is canonical and which should be removed?
22. [P1] `[BOTH]` Is this page orphaned? (no navigation path leads to it)
23. [P1] `[CODEX]` How many inbound links point to this page from other pages?
24. [P1] `[CLAUDE]` How many inbound links SHOULD point to this page?
25. [P1] `[CODEX]` Is this page referenced in any navigation component (sidebar, navbar, action bar)?
26. [P1] `[CODEX]` Is this page referenced in the dashboard?
27. [P1] `[CODEX]` Is this page in `docs/app-complete-audit.md`?
28. [P1] `[CODEX]` Is this page in `docs/test-coverage-blueprint.md`?
29. [P1] `[CLAUDE]` Does this page use the correct domain-specific UI patterns?
30. [P1] `[BOTH]` Does the page's H1/title match its domain identity?
31. [P1] `[BOTH]` Does the page use domain-specific terminology from `CONTEXT.md`?
32. [P1] `[CODEX]` Is the page's breadcrumb trail domain-consistent?
33. [P1] `[CODEX]` Does the page's metadata (title tag, og:tags) reflect the correct domain?
34. [P1] `[CODEX]` What domain-specific components does this page use?
35. [P1] `[CODEX]` What generic (non-domain) components does this page use?
36. [P1] `[CLAUDE]` Should any generic component usage be replaced with domain-specific variants?
37. [P1] `[CODEX]` Does this page's domain have a corresponding entry in `CLAUDE-DOMAINS.md`?
38. [P1] `[CODEX]` Is the page listed in the domain's section of `CLAUDE-DOMAINS.md`?
39. [P1] `[CODEX]` What domain-level actions does this page expose?
40. [P1] `[CODEX]` Are all exposed actions wired to the correct domain's server actions?
41. [P1] `[BOTH]` Does this page cross domain boundaries in its mutations? If so, is that justified?
42. [P1] `[CODEX]` Does this page aggregate data from multiple domains? If so, does it use a composition layer or inline fetches?
43. [P1] `[BOTH]` Is this page a domain entry point (the "home" page of a domain)?
44. [P1] `[CLAUDE]` If domain entry point: does it provide adequate overview and navigation to sub-pages?
45. [P1] `[BOTH]` If NOT domain entry point: is its parent page obvious and reachable?
46. [P1] `[CODEX]` Does the page's data loading follow the domain's established patterns?
47. [P1] `[CODEX]` Does the page's error handling follow the domain's established patterns?
48. [P1] `[CODEX]` What domain events or state transitions does this page trigger?
49. [P1] `[CLAUDE]` What domain events should this page react to?
50. [P1] `[CLAUDE]` Is the page's visual theme/styling consistent with other pages in the same domain?
51. [P1] `[CODEX]` Does the page use the surface grammar governance correctly? What mode is declared?
52. [P1] `[CLAUDE]` Is the declared mode appropriate for this page's purpose?
53. [P1] `[CLAUDE]` Is this page a "status page" disguised as a real page? (just shows a status, no real functionality)
54. [P1] `[CLAUDE]` Could this page be folded into its parent page as a tab or section?
55. [P1] `[OPUS]` What is this page's unique value that no other page provides?

---

## Dimension 1: CONTENT INVENTORY [P1]

What physically exists on this page right now.

56. [P1] `[CODEX]` What is the page title / H1?
57. [P1] `[CLAUDE]` Is the H1 descriptive, domain-specific, and free of generic labels?
58. [P1] `[CODEX]` What metadata does this page set? (title, description, og:title, og:description, og:image)
59. [P1] `[BOTH]` Is metadata present and meaningful (not generic or template-default)?
60. [P1] `[CODEX]` List every UI section visible on initial load, top to bottom.
61. [P1] `[CODEX]` List every UI section that appears only after user interaction (tabs, accordions, reveals).
62. [P1] `[CODEX]` List every interactive element: buttons, links, forms, toggles, tabs, dropdowns.
63. [P1] `[CODEX]` List every data display: tables, cards, lists, metrics, charts, badges, indicators.
64. [P1] `[CODEX]` List every form with its fields, types, validations, and submit action.
65. [P1] `[CODEX]` List every navigation element: breadcrumbs, back links, tabs, sidebar highlights.
66. [P1] `[CODEX]` What is the empty state? (zero data scenario)
67. [P1] `[CLAUDE]` Is the empty state helpful or just blank? Does it guide the user to their first action?
68. [P1] `[CODEX]` What is the loading state? (skeleton, spinner, Suspense boundary, progressive)
69. [P1] `[CODEX]` Does the loading state prevent layout shift?
70. [P1] `[CODEX]` What is the error state for network failure?
71. [P1] `[CODEX]` What is the error state for auth failure?
72. [P1] `[CODEX]` What is the error state for not-found (entity deleted or invalid ID)?
73. [P1] `[CODEX]` What is the error state for server error (500)?
74. [P1] `[CLAUDE]` Are error states specific and actionable, or generic "something went wrong"?
75. [P1] `[CODEX]` What modals, dialogs, drawers, or sheets can be triggered from this page?
76. [P1] `[CODEX]` What toasts or notifications can appear?
77. [P1] `[CODEX]` What keyboard shortcuts work on this page?
78. [P1] `[CLAUDE]` What keyboard shortcuts SHOULD work on this page?
79. [P1] `[CODEX]` Is there search or filter functionality? What does it operate on?
80. [P1] `[CODEX]` Is there pagination, infinite scroll, or "load more"? What are the limits?
81. [P1] `[CODEX]` What is the primary CTA?
82. [P1] `[CLAUDE]` Is the primary CTA obvious, prominent, and correctly placed?
83. [P1] `[CODEX]` What are secondary CTAs?
84. [P1] `[CLAUDE]` Are secondary CTAs clearly differentiated from the primary CTA?
85. [P1] `[CODEX]` What background operations happen invisibly? (prefetches, SSE, polling, preloads)
86. [P1] `[CODEX]` What third-party scripts or embeds exist?
87. [P1] `[CODEX]` Are there any console warnings or errors on this page?
88. [P1] `[CODEX]` What static text/copy exists on this page?
89. [P1] `[CLAUDE]` Is any static text stale, misleading, or using wrong terminology?
90. [P1] `[CODEX]` What images, icons, or visual assets does this page display?
91. [P1] `[CODEX]` Are all images properly sized, lazy-loaded where appropriate?
92. [P1] `[CODEX]` What colors are used beyond the design system palette?
93. [P1] `[CODEX]` How many pixels tall is the above-the-fold content?
94. [P1] `[CLAUDE]` Is the most important content above the fold?
95. [P1] `[CLAUDE]` What is hidden behind "show more" or "see all" links? Should it be more prominent?
96. [P1] `[CLAUDE]` Are there any decorative-only elements that serve no function?
97. [P1] `[CODEX]` What data on this page is real-time vs static?
98. [P1] `[CLAUDE]` What data on this page could become stale between loads?
99. [P1] `[CODEX]` Is there a refresh or reload mechanism for stale data?
100.  [P1] `[BOTH]` What print layout does this page have? Is printing useful here?
101.  [P1] `[CODEX]` What export options exist? (PDF, CSV, email, share link)
102.  [P1] `[CLAUDE]` What export options should exist?
103.  [P1] `[CODEX]` Does the page use any animations or transitions?
104.  [P1] `[CODEX]` Do animations respect `prefers-reduced-motion`?
105.  [P1] `[CODEX]` What conditional rendering exists? (if/else in JSX based on data state)
106.  [P1] `[CODEX]` Are all conditional branches handled, or are there states that render nothing?
107.  [P1] `[CODEX]` How many React components does this page compose?
108.  [P1] `[CODEX]` Is component composition clean or deeply nested?
109.  [P1] `[CODEX]` What client components (`"use client"`) exist on this page?
110.  [P1] `[CLAUDE]` Could any client components be converted to server components?

---

## Dimension 2: ROUTE & FILE STRUCTURE [P2]

Technical anatomy of the route and its files.

111. [P2] `[CODEX]` What is the full file path of `page.tsx`?
112. [P2] `[CODEX]` How many lines is `page.tsx`?
113. [P2] `[CODEX]` Does `page.tsx` export a default function component?
114. [P2] `[CODEX]` Does `page.tsx` use async (server component) or client hooks?
115. [P2] `[CODEX]` What are ALL files co-located with `page.tsx` in the same directory?
116. [P2] `[CODEX]` Are there any co-located files that are unused (dead code)?
117. [P2] `[CODEX]` What is the layout chain? (list every `layout.tsx` from root to this page)
118. [P2] `[BOTH]` Does any layout in the chain add significant visual or functional elements?
119. [P2] `[CODEX]` Does this route have parallel routes (`@` directories)?
120. [P2] `[CODEX]` Does this route use intercepting routes?
121. [P2] `[CODEX]` Does this route have a route handler (`route.ts`) alongside or nearby?
122. [P2] `[CODEX]` Is `generateMetadata` or `generateStaticParams` defined?
123. [P2] `[CODEX]` Is this page statically generated or dynamically rendered?
124. [P2] `[CODEX]` What is the revalidation strategy? (static, ISR timer, on-demand)
125. [P2] `[CODEX]` Are there middleware rules that apply to this route?
126. [P2] `[CODEX]` What auth checks happen before this page renders?
127. [P2] `[CODEX]` Is the auth check at the layout level, page level, or both?
128. [P2] `[CODEX]` Are there redirect rules that affect this route?
129. [P2] `[CODEX]` How many imports does `page.tsx` have? List them by category (lib, components, types, external).
130. [P2] `[CODEX]` Are any imports unused?
131. [P2] `[CODEX]` Does this page use any `@ts-ignore` or `@ts-expect-error`?
132. [P2] `[CODEX]` Does this page use any `as any` type assertions?
133. [P2] `[CODEX]` What TypeScript types does this page reference? Are they from shared `types/` or inline?
134. [P2] `[CODEX]` How many data-fetching calls does `page.tsx` make? List each with source.
135. [P2] `[CODEX]` Are data-fetching calls parallelized (`Promise.all`) or sequential (waterfall)?
136. [P2] `[CODEX]` Does this page use Suspense boundaries? How many?
137. [P2] `[CODEX]` Does this page use streaming (`loading.tsx` Suspense pattern)?
138. [P2] `[CODEX]` What is the estimated server-side render time?
139. [P2] `[CODEX]` Are there any TODO/FIXME/HACK comments in the page or its components?
140. [P2] `[CODEX]` Does this page follow the project's file naming conventions?
141. [P2] `[CODEX]` Is this page exported from any barrel file or module index?
142. [P2] `[CODEX]` How recently was this page file last modified? (git log)
143. [P2] `[CODEX]` How many commits have touched this page?
144. [P2] `[CODEX]` Is there a corresponding test file for this page?
145. [P2] `[CODEX]` Is this page referenced in any spec document in `docs/specs/`?

---

## Dimension 3: USER JOURNEY (BACKWARD) [P2]

Where did the user come from?

146. [P2] `[CLAUDE]` What is the most likely previous page? (1 step back)
147. [P2] `[CLAUDE]` What is the second most likely previous page?
148. [P2] `[CLAUDE]` What is the third most likely previous page?
149. [P2] `[CLAUDE]` Trace back 5 steps: most common path ending here.
150. [P3] `[OPUS]` Trace back 10 steps: full workflow leading to this page.
151. [P3] `[OPUS]` How long does the user likely spend on each previous step?
152. [P2] `[CLAUDE]` What data did the user create or modify on their way here?
153. [P2] `[CLAUDE]` What decisions did the user make before arriving? (selected client, chose date, etc.)
154. [P2] `[CODEX]` Is there a "return to previous" affordance? Does it work?
155. [P2] `[BOTH]` Can the user arrive via deep link (email, notification, bookmark, shared URL)?
156. [P2] `[CLAUDE]` If deep-linked, does the page have enough context without the journey?
157. [P2] `[BOTH]` What state does the user carry from the previous page? (selections, form progress, filters)
158. [P2] `[CLAUDE]` Can the user arrive here by accident? What is the recovery path?
159. [P2] `[CODEX]` What notifications or emails link to this page?
160. [P2] `[CODEX]` Is there a breadcrumb trail? Is it accurate?
161. [P2] `[CODEX]` What search results lead to this page?
162. [P2] `[CODEX]` What dashboard widgets or cards link to this page?
163. [P2] `[CODEX]` What Rail cards or actions link to this page?
164. [P2] `[BOTH]` Can the user arrive from a Remy suggestion?
165. [P2] `[CODEX]` What URL query parameters affect initial page state?
166. [P2] `[CODEX]` If the page expects prior context and none exists, what happens?
167. [P2] `[CODEX]` Is there a redirect if prerequisites are not met?
168. [P2] `[CLAUDE]` What does the user EXPECT to see based on where they came from?
169. [P2] `[CLAUDE]` Does the page meet that expectation or create cognitive dissonance?
170. [P3] `[OPUS]` What emotional state does the user arrive in? (planning, urgency, curiosity, frustration)
171. [P2] `[CODEX]` What browser back-button behavior exists? Is it correct?
172. [P2] `[CODEX]` Does the page handle `history.pushState` or `replaceState`?
173. [P2] `[CODEX]` If the user hits back after a mutation, do they see stale data?
174. [P2] `[CLAUDE]` Can this page be the FIRST page of a session? (user opens app directly here)
175. [P2] `[CLAUDE]` If first-page entry, is the experience coherent without prior navigation?
176. [P2] `[CODEX]` What onboarding or first-time affordances exist for first-visit users?
177. [P2] `[CODEX]` Are there wizard/stepper flows that lead here as a step?
178. [P2] `[CLAUDE]` If part of a stepper, can the user skip ahead to this step? Should they?
179. [P3] `[OPUS]` What percentage of visits are intentional vs navigational pass-through?
180. [P2] `[CLAUDE]` Is this page sometimes used as a "checking in" page (quick glance, no action)?

---

## Dimension 4: USER JOURNEY (FORWARD) [P2]

Where is the user going next?

181. [P2] `[CLAUDE]` What is the most likely next page? (1 step forward)
182. [P2] `[CLAUDE]` Second most likely next page?
183. [P2] `[CLAUDE]` Third most likely next page?
184. [P2] `[CLAUDE]` Trace forward 5 steps: what does the user do after this page?
185. [P3] `[OPUS]` Trace forward 10 steps: full workflow that starts here.
186. [P2] `[CLAUDE]` What are the parallel next moves? (independent actions user could take simultaneously)
187. [P2] `[CLAUDE]` What are the conditional next moves? (if X, go here; if Y, go there)
188. [P2] `[CLAUDE]` What are the dead ends from this page? (actions that lead nowhere productive)
189. [P2] `[CLAUDE]` Where does the user go when done with this page?
190. [P2] `[BOTH]` Is there a clear "done" signal? (save confirmation, completion indicator)
191. [P2] `[CLAUDE]` What would make the user leave prematurely? (confusion, missing data, error)
192. [P2] `[CLAUDE]` What page does the user visit if something goes wrong?
193. [P2] `[BOTH]` Can the user bookmark this page and return meaningfully later?
194. [P2] `[BOTH]` Does this page suggest a next step? Should it?
195. [P2] `[CODEX]` What external destinations does this page link to? (email, maps, payment, external tools)
196. [P2] `[CODEX]` Does this page create entities that have their own detail pages?
197. [P2] `[CODEX]` After creating an entity, does the user get redirected to the new entity's page?
198. [P2] `[CLAUDE]` After mutation, is the user returned to a sensible location?
199. [P2] `[CODEX]` Can actions on this page trigger navigation to a different domain's page?
200. [P2] `[CLAUDE]` If cross-domain navigation occurs, is context preserved?
201. [P2] `[CLAUDE]` What "quick actions" could prevent users from leaving this page unnecessarily?
202. [P2] `[CLAUDE]` Are there downstream workflows that DEPEND on this page being completed?
203. [P2] `[CLAUDE]` If this page is abandoned mid-task, what breaks downstream?
204. [P2] `[CODEX]` Does this page have a "save draft" or auto-save mechanism?
205. [P2] `[CODEX]` What happens to unsaved work if the user navigates away?
206. [P2] `[CODEX]` Does the page warn before navigation if there are unsaved changes?
207. [P2] `[CODEX]` What email or notification is sent after key actions on this page?
208. [P2] `[CODEX]` Do sent notifications link back to this page or forward to the next?
209. [P2] `[CLAUDE]` What prints or exports from this page does the user take to a real-world task?
210. [P2] `[CODEX]` Does this page feed data into any reports or analytics pages?
211. [P3] `[OPUS]` After completing all tasks on this page, does the user feel done or anxious?
212. [P2] `[CLAUDE]` What is the "exit velocity"? How quickly can the user complete and leave?
213. [P3] `[OPUS]` Is exit velocity appropriate, or should the page slow the user down for quality?
214. [P2] `[CODEX]` What micro-interactions or confirmations happen before the user leaves?
215. [P2] `[CLAUDE]` Could this page auto-advance to the next step in a workflow? Should it?

---

## Dimension 5: TEMPORAL CONTEXT [P2]

Time-awareness of this page.

216. [P2] `[CODEX]` When was the user last on this page? (can the system detect this?)
217. [P2] `[BOTH]` Can the page show what changed since the user's last visit?
218. [P2] `[BOTH]` How stale is each piece of displayed data? (real-time, minutes, hours, days)
219. [P2] `[CODEX]` When was the primary entity last modified?
220. [P2] `[CODEX]` When was the primary entity created?
221. [P2] `[CODEX]` Is there a "last updated" indicator visible to the user?
222. [P2] `[CODEX]` Does this page auto-refresh? How often? What triggers it?
223. [P2] `[CLAUDE]` Is the page about the PAST, PRESENT, or FUTURE?
224. [P2] `[CODEX]` Does this page show a timeline or history? How far back?
225. [P2] `[CODEX]` Are there countdown elements? (days until event, deadline, expiry)
226. [P2] `[CODEX]` Are there "ago" elements? (last contact 3 days ago, sent 2 weeks ago)
227. [P2] `[BOTH]` What is time-sensitive on this page? (offers, deadlines, seasonal data, expiring quotes)
228. [P2] `[CLAUDE]` Does time of day matter? (morning prep vs evening review vs late-night planning)
229. [P2] `[CLAUDE]` Does day of week matter? (weekday planning vs weekend events)
230. [P2] `[CLAUDE]` Does season matter? (ingredient availability, pricing, event frequency, demand)
231. [P3] `[OPUS]` What happens to this page in 30 days? 90 days? 1 year? (does it age well or rot?)
232. [P2] `[CODEX]` Is historical data accessible from this page? How far back?
233. [P2] `[CODEX]` Does this page distinguish between "not yet" and "overdue"?
234. [P2] `[CODEX]` Does this page show urgency indicators for approaching deadlines?
235. [P2] `[CLAUDE]` What is the natural frequency of visiting this page? (daily, weekly, per-event, one-time)
236. [P2] `[CLAUDE]` Does the page's value change based on visit frequency?
237. [P2] `[CODEX]` Are there time-based automations that affect this page's data?
238. [P2] `[CODEX]` Does CIL scanner touch this page's entities? What signals?
239. [P2] `[BOTH]` What calendar context is relevant? (upcoming events, prep schedules, delivery windows)
240. [P2] `[BOTH]` Does the page reflect the current lifecycle stage of its entity?
241. [P2] `[CODEX]` Are lifecycle transitions time-gated? (can't confirm until 48h before event)
242. [P2] `[BOTH]` Does the page show prep-time estimates? Are they computed from real data?
243. [P2] `[BOTH]` Does the page show travel-time estimates? Are they current?
244. [P2] `[CODEX]` What date/time formatting is used? Is it consistent with other pages?
245. [P2] `[CODEX]` Does the page handle timezone correctly for multi-timezone scenarios?
246. [P2] `[CODEX]` Are date pickers or time inputs used? Do they default to sensible values?
247. [P2] `[CODEX]` What happens when date-sensitive data crosses midnight?
248. [P2] `[CODEX]` Does the page display fiscal/accounting periods correctly?
249. [P2] `[CLAUDE]` What recurring patterns exist? (weekly menus, monthly invoices)
250. [P2] `[CODEX]` Does the page support viewing different time ranges? (this week, this month, custom)
251. [P2] `[CLAUDE]` Is the page useful during service (while cooking/serving) or only for planning?
252. [P2] `[CLAUDE]` What weather data should be visible given this page's temporal context?
253. [P2] `[BOTH]` What pricing data is time-sensitive? (seasonal pricing, market fluctuations)
254. [P2] `[CLAUDE]` Does the page expire or become irrelevant after a certain date?
255. [P2] `[BOTH]` What happens to links pointing to this page after its entity expires?

---

## Dimension 6: SEQUENTIAL NEXT MOVES [P2]

Ordered actions the user should take.

256. [P2] `[CLAUDE]` What is the single most important action the user should take on this page?
257. [P2] `[CLAUDE]` Second most important action?
258. [P2] `[CLAUDE]` Third most important action?
259. [P2] `[CLAUDE]` List all actions in priority order.
260. [P2] `[BOTH]` Which actions block other actions? (must do X before Y)
261. [P2] `[BOTH]` Which actions have deadlines?
262. [P2] `[CODEX]` Which actions are one-click? Which require multi-step flows?
263. [P2] `[CODEX]` Which actions can be done in bulk? (select multiple, batch action)
264. [P2] `[BOTH]` Which actions are reversible? Which are permanent?
265. [P2] `[BOTH]` Which actions require confirmation? Which should but don't?
266. [P2] `[CLAUDE]` What is the "happy path"? (minimum clicks to primary goal)
267. [P2] `[CODEX]` How many clicks is the happy path?
268. [P2] `[BOTH]` What is the "power user" path? (keyboard shortcuts, bulk ops)
269. [P2] `[CLAUDE]` What is the "confused user" path? (someone who doesn't know the domain)
270. [P2] `[CODEX]` What inline validation exists? Does it fire at the right moment?
271. [P2] `[CODEX]` What server-side validation exists? Does it return useful errors?
272. [P2] `[CODEX]` Are mandatory vs optional fields clearly distinguished?
273. [P2] `[CODEX]` What smart defaults are set? (pre-filled dates, auto-selected options)
274. [P2] `[CLAUDE]` What smart defaults should be set but aren't?
275. [P2] `[CLAUDE]` Are there progressive disclosure patterns? (start simple, reveal complexity)
276. [P2] `[CLAUDE]` What actions require leaving this page? Could any be done inline instead?
277. [P2] `[CODEX]` What actions create a new browser tab or window?
278. [P2] `[CODEX]` What undo/redo support exists?
279. [P2] `[CODEX]` What draft/auto-save support exists?
280. [P2] `[CODEX]` What optimistic UI updates exist? Do they roll back on failure?
281. [P2] `[CODEX]` What loading indicators appear during actions? Are they all present?
282. [P2] `[CODEX]` What success indicators appear after actions?
283. [P2] `[CODEX]` What failure indicators appear after failed actions?
284. [P2] `[CODEX]` Are action results persistent or ephemeral? (toast disappears, state persists)
285. [P2] `[CLAUDE]` What is the cost of the user doing nothing? (what degrades if no action taken?)

---

## Dimension 7: PARALLEL NEXT MOVES & DELEGATION [P2]

Independent actions and automation potential.

286. [P2] `[CLAUDE]` What actions can the user take simultaneously? (new tab, delegate, queue)
287. [P2] `[CLAUDE]` What actions could be automated instead of manual?
288. [P2] `[CLAUDE]` What actions could be delegated to staff from this page?
289. [P2] `[CLAUDE]` What actions could be scheduled for later?
290. [P2] `[CLAUDE]` What actions could Remy do autonomously?
291. [P2] `[CLAUDE]` What actions could Remy suggest or pre-draft?
292. [P2] `[CLAUDE]` What actions could be batched across multiple entities?
293. [P2] `[CLAUDE]` Are any forced-sequential actions that should be parallel?
294. [P2] `[CODEX]` What notification rules fire from actions on this page?
295. [P2] `[CLAUDE]` What follow-up tasks should auto-create from actions here?
296. [P2] `[CODEX]` What downstream entities auto-update from actions here?
297. [P2] `[CLAUDE]` Could a Dinner Circle broadcast be triggered from this page? When?
298. [P2] `[CLAUDE]` Could an invoice or payment request be triggered from this page?
299. [P2] `[CLAUDE]` Could a contract be generated from this page?
300. [P2] `[CLAUDE]` Could a menu or recipe be generated from this page's data?
301. [P2] `[CLAUDE]` What copy/duplicate actions make sense? (copy event, clone menu, reuse recipe)
302. [P2] `[CLAUDE]` What template actions make sense? (save as template, apply template)
303. [P2] `[CLAUDE]` What share actions make sense? (share with client, staff, co-host)
304. [P2] `[CLAUDE]` Could this page's content be emailed to someone? What format?
305. [P2] `[CLAUDE]` Could this page's content be printed? What layout?
306. [P2] `[CLAUDE]` What integrations could fire from this page? (calendar sync, email, SMS)
307. [P2] `[CLAUDE]` What data from this page should appear in the morning briefing?
308. [P2] `[CLAUDE]` What data from this page should trigger Hermes intelligence?
309. [P2] `[CLAUDE]` What CIL signals should be generated from actions on this page?
310. [P2] `[BOTH]` What data from this page feeds into reports or analytics?

---

## Dimension 8: ENVIRONMENTAL CONTEXT [P2]

Real-world factors that affect this page.

311. [P2] `[CLAUDE]` Does weather matter for this page's context? How?
312. [P2] `[CLAUDE]` What weather data should surface? (forecast, alerts, historical)
313. [P2] `[BOTH]` Does location matter? (venue, client address, store proximity)
314. [P2] `[CLAUDE]` What location data should surface? (map, distance, travel time)
315. [P2] `[CODEX]` What is travel time from chef's home to relevant location?
316. [P2] `[CLAUDE]` Does traffic or transit matter? (delivery windows, arrival planning)
317. [P2] `[CLAUDE]` Are there local regulations affecting this page? (food safety, permits, cannabis laws)
318. [P2] `[CLAUDE]` Are there local events that affect context? (holidays, festivals, farmers markets)
319. [P2] `[CLAUDE]` What seasonal context is relevant? (ingredient availability, pricing, demand)
320. [P2] `[CODEX]` What timezone considerations exist?
321. [P2] `[CLAUDE]` Does physical environment matter? (kitchen size, equipment, venue constraints)
322. [P2] `[CLAUDE]` Are there supply chain factors? (vendor hours, delivery schedules, market days)
323. [P2] `[BOTH]` What local pricing context is relevant? (PIE regional data)
324. [P2] `[CLAUDE]` Does the chef's current capacity (booked events this week) affect this page?
325. [P2] `[CLAUDE]` Does the chef's equipment inventory affect this page?
326. [P2] `[CLAUDE]` Does staff availability affect this page?
327. [P2] `[CLAUDE]` Does vendor availability affect this page?
328. [P2] `[CLAUDE]` Are there dietary/allergy constraints from the environment? (guest preferences, venue restrictions)
329. [P2] `[CLAUDE]` What real-world documents relate to this page? (permits, licenses, insurance)
330. [P2] `[CLAUDE]` What physical items relate to this page? (equipment, ingredients, supplies, uniforms)
331. [P2] `[CLAUDE]` Does parking or access matter for the venue/client?
332. [P2] `[CLAUDE]` Does kitchen access or prep space availability matter?
333. [P2] `[CLAUDE]` What utility constraints exist? (power, water, gas at venue)
334. [P2] `[CLAUDE]` Are there noise or time restrictions at the venue?
335. [P2] `[CLAUDE]` What waste disposal or cleanup requirements exist?
336. [P2] `[CLAUDE]` Does the page account for multi-day events or overnight prep?
337. [P2] `[CLAUDE]` Does the page account for simultaneous events at different locations?
338. [P2] `[CLAUDE]` What backup or contingency planning is relevant?
339. [P2] `[CLAUDE]` Does altitude, humidity, or climate affect recipes/cooking on this page?
340. [P2] `[CLAUDE]` What "day of" vs "advance planning" context should the page distinguish?

---

## Dimension 9: ROLE ANALYSIS [P1]

How every role experiences this page.

341. [P1] `[CODEX]` What does the CHEF (owner) see on this page?
342. [P1] `[CLAUDE]` What does the chef need that isn't shown?
343. [P1] `[CLAUDE]` What should the chef never see here? (client-facing details meant for portal)
344. [P1] `[CODEX]` What does a CLIENT see on this page? (if accessible via portal)
345. [P1] `[BOTH]` What should a client never see? (costs, margins, internal notes, other clients)
346. [P1] `[CLAUDE]` What does a client EXPECT to see that is missing?
347. [P1] `[CLAUDE]` Does the client view feel professional or like an admin screen?
348. [P1] `[CODEX]` What does STAFF see? (sous chef, server, assistant)
349. [P1] `[CLAUDE]` What does staff need that isn't shown?
350. [P1] `[BOTH]` What should staff never see? (financial data, client personal info)
351. [P1] `[CODEX]` What does a GUEST see? (event attendee, not the booking client)
352. [P1] `[BOTH]` What should a guest never see? (other guests' details, pricing, chef internal)
353. [P1] `[CODEX]` What does a CO-HOST see? (farm dinner partner, venue owner)
354. [P1] `[CLAUDE]` What does a co-host need? (shared prep lists, guest counts, timing)
355. [P1] `[BOTH]` What should a co-host never see? (chef margins, other client data)
356. [P1] `[CODEX]` What does a VENDOR see? (supplier, farmer)
357. [P1] `[CLAUDE]` What does a vendor need? (order details, delivery windows, quantities)
358. [P1] `[BOTH]` What should a vendor never see? (client names, event details beyond their supply)
359. [P1] `[CODEX]` What does an ADMIN see? (multi-chef platform admin, future role)
360. [P1] `[BOTH]` What does a first-time user see vs a returning user?
361. [P1] `[CODEX]` What does a free-tier user see vs a paid user?
362. [P1] `[BOTH]` What does a user with zero data see vs heavy data?
363. [P1] `[CLAUDE]` What does a user in an EMERGENCY see? (injured chef, last-minute cancellation)
364. [P1] `[CODEX]` What permissions gate page access?
365. [P1] `[CODEX]` What middleware or layout-level auth checks apply?
366. [P1] `[CODEX]` What permissions gate specific actions on this page?
367. [P1] `[BOTH]` Is there content that should be role-gated but isn't?
368. [P1] `[BOTH]` Does the page gracefully degrade for lower-permission roles?
369. [P1] `[CODEX]` Does the page show/hide elements based on role, or render entirely different views?
370. [P1] `[CODEX]` Are role-based conditionals in the component or in the data layer?
371. [P1] `[CODEX]` Is role data fetched from auth session correctly?
372. [P1] `[BOTH]` Are there role-escalation paths from this page? (staff -> chef, free -> paid)
373. [P1] `[CODEX]` What happens if a user's role changes while viewing this page?
374. [P1] `[CODEX]` What happens if a user accesses via URL manipulation with wrong role?
375. [P1] `[CODEX]` Does the page use `requirePro()` or equivalent tier gating?
376. [P1] `[BOTH]` Are pro features clearly marked as pro?
377. [P1] `[BOTH]` Does the page handle delegation scenarios? (chef delegated event to staff)
378. [P1] `[BOTH]` Can the chef grant temporary access for a specific event?
379. [P1] `[CODEX]` What data is per-user vs per-tenant?
380. [P1] `[CODEX]` Is tenant isolation properly enforced in all queries?
381. [P1] `[CODEX]` Could a user see another tenant's data via parameter manipulation?
382. [P1] `[CODEX]` What user-generated content appears? Is it sanitized?
383. [P1] `[BOTH]` What PII is displayed? Is it necessary?
384. [P1] `[BOTH]` What financial data is displayed? Is it role-appropriate?
385. [P1] `[BOTH]` What contact information is displayed? Who should see it?
386. [P1] `[CODEX]` Is there an audit trail of who viewed or modified data?
387. [P1] `[CLAUDE]` Should there be an audit trail?
388. [P1] `[CODEX]` What happens when a role-restricted action fails silently? (button does nothing)
389. [P1] `[CLAUDE]` Are role-restricted actions hidden or shown-but-disabled? Which is correct here?
390. [P1] `[BOTH]` Does the page handle "chef is also a client" edge case?
391. [P1] `[BOTH]` Does the page handle "staff is also a client" edge case?
392. [P1] `[CODEX]` What role-based notification preferences affect this page?
393. [P1] `[CODEX]` What role-based email templates relate to actions here?
394. [P1] `[CODEX]` Are there data fields visible only in print/export but not screen?
395. [P1] `[CODEX]` Are there data fields visible on screen but excluded from export?
396. [P1] `[BOTH]` Does the page handle cannabis-specific role requirements? (age verification, compliance)
397. [P1] `[CODEX]` What happens if subscription lapses while user has data on this page?
398. [P1] `[CODEX]` Does the page respect user preferences? (currency, date format, units)
399. [P1] `[CODEX]` What accessibility role attributes (`aria-role`) are set?
400. [P1] `[CODEX]` Does the page have different mobile vs desktop role-based layouts?
401. [P1] `[CODEX]` What read-only vs edit modes exist per role?
402. [P1] `[CODEX]` Can a role switch between read-only and edit mode?
403. [P1] `[CODEX]` What collaboration features exist? (shared editing, comments, mentions)
404. [P1] `[CLAUDE]` What collaboration features should exist?
405. [P1] `[BOTH]` Does the page handle "viewing as" feature? (chef previewing client portal)
406. [P1] `[CODEX]` If "viewing as" exists, are write actions properly disabled?
407. [P1] `[BOTH]` What onboarding differs by role?
408. [P1] `[BOTH]` What help text or documentation links differ by role?
409. [P1] `[CODEX]` Does the page show different empty states by role?
410. [P1] `[CODEX]` Does the page show different error messages by role?
411. [P1] `[CODEX]` What notification badges or unread indicators are role-specific?
412. [P1] `[CODEX]` What quick actions are role-specific?
413. [P1] `[CODEX]` Are there any role-based feature flags?
414. [P1] `[BOTH]` What is the most dangerous action each role can take?
415. [P1] `[BOTH]` What safeguards exist for each role's most dangerous action?

---

## Dimension 10: ENTITY RELATIONSHIPS [P2]

Data objects and their connections.

416. [P2] `[CODEX]` What is the PRIMARY entity on this page? (event, client, menu, recipe, etc.)
417. [P2] `[CODEX]` What is the entity's database table?
418. [P2] `[CODEX]` What columns from the primary entity are displayed?
419. [P2] `[CODEX]` What columns exist but are NOT displayed?
420. [P2] `[CODEX]` What secondary entities are displayed? List each with table and displayed fields.
421. [P2] `[CODEX]` What entities are referenced but not displayed? (foreign keys, IDs in URLs)
422. [P2] `[CLAUDE]` What entities SHOULD be on this page but aren't wired?
423. [P2] `[BOTH]` Draw the entity relationship graph (primary -> related entities).
424. [P2] `[CODEX]` What is the upstream entity? (what contains/owns this entity)
425. [P2] `[CODEX]` What are downstream entities? (what this entity contains/feeds into)
426. [P2] `[CODEX]` Are there orphaned references? (links to entities that may not exist)
427. [P2] `[CODEX]` Are there circular references? (A links B links A)
428. [P2] `[CODEX]` What entities can be CREATED from this page?
429. [P2] `[CODEX]` What entities can be MODIFIED from this page?
430. [P2] `[CODEX]` What entities can be DELETED? Are deletes soft or hard?
431. [P2] `[CODEX]` What entities are READ-ONLY on this page?
432. [P2] `[BOTH]` What is the entity's lifecycle stage? How does this page fit in?
433. [P2] `[CODEX]` What other pages show the same primary entity differently?
434. [P2] `[CODEX]` If the primary entity is deleted, what happens to this page?
435. [P2] `[CODEX]` If a related entity is deleted, what happens to this page?
436. [P2] `[CODEX]` What denormalized data is displayed? (copied vs live reference)
437. [P2] `[BOTH]` Is denormalized data fresh or potentially stale?
438. [P2] `[CODEX]` What computed/derived fields are displayed? (margins, totals, scores)
439. [P2] `[CODEX]` Are computed fields recalculated on each load or cached?
440. [P2] `[CODEX]` What aggregations are shown? (count of guests, total cost, average rating)
441. [P2] `[CODEX]` What entity state transitions can be triggered from this page?
442. [P2] `[CODEX]` What FSM (finite state machine) governs the primary entity?
443. [P2] `[CODEX]` Is the current FSM state displayed?
444. [P2] `[CODEX]` What transitions are available from the current state?
445. [P2] `[CODEX]` Are unavailable transitions hidden or shown-but-disabled?
446. [P2] `[CODEX]` What entity version history exists? Can the user see it?
447. [P2] `[CODEX]` What immutable entities does this page reference? (ledger, state transitions)
448. [P2] `[CODEX]` Does the page properly treat immutable entities as read-only?
449. [P2] `[CODEX]` What polymorphic entities exist? (events: dinner, cannabis, tasting)
450. [P2] `[BOTH]` Does the page handle all entity subtypes correctly?
451. [P2] `[CODEX]` What entity count limits exist? (max guests, max menu items)
452. [P2] `[BOTH]` Does the page enforce limits with clear messaging?
453. [P2] `[CODEX]` What entity ordering is applied? (sort by date, name, status)
454. [P2] `[CODEX]` Can the user change entity ordering?
455. [P2] `[CODEX]` What entity grouping is applied? (group by status, date, client)
456. [P2] `[CODEX]` Can the user change entity grouping?
457. [P2] `[CODEX]` What entity search/filter is available?
458. [P2] `[CODEX]` What entity relationship creates (join operations) happen?
459. [P2] `[CODEX]` What entity relationship destroys (unlink operations) happen?
460. [P2] `[CODEX]` What cascade effects occur from entity modifications?
461. [P2] `[CODEX]` Does the completion contract track this entity? What status?
462. [P2] `[CODEX]` What entity tags or labels exist? Can users manage them?
463. [P2] `[CODEX]` What entity attachments exist? (photos, files, documents)
464. [P2] `[CODEX]` What entity notes or comments exist?
465. [P2] `[CODEX]` What entity history/activity feed exists?

---

## Dimension 11: CLIENT INTELLIGENCE [P1]

What client intelligence is necessary, visible, talkable, or dangerous on this page. Client intelligence means any information that helps the chef understand, serve, communicate with, price, protect, or retain the client better.

### Client Identity

466. [P1] `[CODEX]` Is a client connected to this page?
467. [P1] `[CODEX]` Is the client a primary entity or secondary entity on this page?
468. [P1] `[CODEX]` Where does the client ID come from? URL, event, invoice, message, Dinner Circle, or lookup?
469. [P1] `[CODEX]` Is the client name visible?
470. [P1] `[CODEX]` Is the client contact info visible?
471. [P1] `[CODEX]` Is the client's household, company, assistant, or booking party connected?
472. [P1] `[CODEX]` Are co-hosts or related client contacts connected?
473. [P1] `[CODEX]` Does the page distinguish between booking client, paying client, guest, assistant, and host?
474. [P1] `[OPUS]` Does this page need client identity visible, or should it stay collapsed/background?
475. [P1] `[OPUS]` Would showing client identity here reduce confusion or create clutter?

### Client History

476. [P1] `[CODEX]` Has this client booked before?
477. [P1] `[CODEX]` How many events has this client booked?
478. [P1] `[CODEX]` When was their first event?
479. [P1] `[CODEX]` When was their most recent event?
480. [P1] `[CODEX]` When is their next event?
481. [P1] `[CODEX]` What events are linked to this client?
482. [P1] `[CODEX]` What menus are linked to this client?
483. [P1] `[CODEX]` What invoices/payments are linked to this client?
484. [P1] `[CODEX]` What messages are linked to this client?
485. [P1] `[CODEX]` What Dinner Circles are linked to this client?
486. [P1] `[OPUS]` What history matters on this specific page?
487. [P1] `[OPUS]` What history should be visible immediately?
488. [P1] `[OPUS]` What history should be talkable only if the user asks?
489. [P1] `[OPUS]` What old history is irrelevant noise?

### Client Preferences

490. [P1] `[CODEX]` Are cuisine preferences stored for this client?
491. [P1] `[CODEX]` Are disliked ingredients stored?
492. [P1] `[CODEX]` Are favorite dishes stored?
493. [P1] `[CODEX]` Are favorite menus stored?
494. [P1] `[CODEX]` Are allergies stored?
495. [P1] `[CODEX]` Are dietary restrictions stored?
496. [P1] `[CODEX]` Are beverage preferences stored?
497. [P1] `[CODEX]` Are wine preferences stored?
498. [P1] `[CODEX]` Are service-style preferences stored?
499. [P1] `[CODEX]` Are plating/presentation preferences stored?
500. [P1] `[CODEX]` Are timing preferences stored?
501. [P1] `[CODEX]` Are communication preferences stored?
502. [P1] `[CODEX]` Are budget preferences stored?
503. [P1] `[CODEX]` Are cannabis preferences or restrictions stored where legally/applicably relevant?
504. [P1] `[OPUS]` Which preferences are essential for this page?
505. [P1] `[OPUS]` Which preferences should appear in the Rail?
506. [P1] `[OPUS]` Which preferences should be visible only during menu planning?
507. [P1] `[OPUS]` Which preferences should be visible only during event execution?
508. [P1] `[OPUS]` Which preferences should be hidden unless directly requested?
509. [P1] `[OPUS]` Which preferences are sensitive enough to require role gating?

### Client Communication Intelligence

510. [P1] `[CODEX]` When was the last client message?
511. [P1] `[CODEX]` Who sent the last message?
512. [P1] `[CODEX]` What channel was used? Email, SMS, portal, Dinner Circle, phone, third-party inquiry?
513. [P1] `[CODEX]` Is there an unanswered client message?
514. [P1] `[CODEX]` Is there a pending follow-up?
515. [P1] `[CODEX]` Is there a scheduled message?
516. [P1] `[CODEX]` Is there a draft message waiting for approval?
517. [P1] `[CODEX]` Is there a communication timeline?
518. [P1] `[CODEX]` Is the client currently waiting on the chef?
519. [P1] `[CODEX]` Is the chef currently waiting on the client?
520. [P1] `[OPUS]` What does the client probably need to hear next?
521. [P1] `[OPUS]` What should the chef say next?
522. [P1] `[OPUS]` Should the system draft a message?
523. [P1] `[OPUS]` Should the Rail surface the communication gap?
524. [P1] `[OPUS]` Is the client "in the dark"?
525. [P1] `[OPUS]` Is this a relationship-risk moment?
526. [P1] `[OPUS]` Is the chef procrastinating a communication step?
527. [P1] `[OPUS]` Should this page create a one-click follow-up action?

### Client Value / Business Intelligence

528. [P1] `[CODEX]` What is this client's lifetime spend?
529. [P1] `[CODEX]` What is this client's average booking value?
530. [P1] `[CODEX]` How many diners has this client brought in?
531. [P1] `[CODEX]` How many referrals came from this client?
532. [P1] `[CODEX]` How often does this client book?
533. [P1] `[CODEX]` What is their average lead time?
534. [P1] `[CODEX]` What is their payment reliability?
535. [P1] `[CODEX]` Do they tip?
536. [P1] `[CODEX]` Do they rebook?
537. [P1] `[CODEX]` Do they cancel?
538. [P1] `[CODEX]` Do they negotiate heavily?
539. [P1] `[CODEX]` Are they high-maintenance, low-maintenance, or unknown?
540. [P1] `[OPUS]` Is this a high-value client?
541. [P1] `[OPUS]` Is this a retention-priority client?
542. [P1] `[OPUS]` Is this client worth special handling?
543. [P1] `[OPUS]` Should business intelligence be visible here, or system-only?
544. [P1] `[OPUS]` Would showing revenue data help the chef make a better decision?
545. [P1] `[OPUS]` Would showing revenue data create clutter or weirdness?

### Client Risk Intelligence

546. [P1] `[CODEX]` Has this client cancelled before?
547. [P1] `[CODEX]` Has this client paid late before?
548. [P1] `[CODEX]` Has this client disputed anything before?
549. [P1] `[CODEX]` Has this client ignored messages before?
550. [P1] `[CODEX]` Has this client changed scope late before?
551. [P1] `[CODEX]` Has this client had allergy/dietary complexity before?
552. [P1] `[CODEX]` Has this client requested cannabis service before?
553. [P1] `[CODEX]` Has this client created compliance-sensitive requirements before?
554. [P1] `[CODEX]` Are there notes about difficult service conditions?
555. [P1] `[CODEX]` Are there venue/kitchen constraints connected to this client?
556. [P1] `[OPUS]` What risk matters right now?
557. [P1] `[OPUS]` Is this risk user-visible, Rail-visible, or system-only?
558. [P1] `[OPUS]` Should the risk be phrased gently?
559. [P1] `[OPUS]` Should the risk trigger an action?
560. [P1] `[OPUS]` Should this page show a warning, reminder, or checklist item?
561. [P1] `[OPUS]` Is this client relationship at risk?

### Client Context for Menus

562. [P1] `[CODEX]` Does this page need client menu history?
563. [P1] `[CODEX]` Has the client had this dish before?
564. [P1] `[CODEX]` Has the client rejected this dish before?
565. [P1] `[CODEX]` Has the client approved similar dishes before?
566. [P1] `[CODEX]` Does the current menu conflict with known preferences?
567. [P1] `[CODEX]` Does the current menu repeat too much from past events?
568. [P1] `[CODEX]` Does the current menu match the client's known style?
569. [P1] `[CODEX]` Are guest preferences connected to this client's event?
570. [P1] `[OPUS]` What should the chef know before proposing this menu?
571. [P1] `[OPUS]` Should the Rail surface "client loved this before"?
572. [P1] `[OPUS]` Should the Rail surface "avoid repeating this"?
573. [P1] `[OPUS]` Should the page suggest safer alternatives?
574. [P1] `[OPUS]` Should the page warn about conflicts with preferences/allergies?
575. [P1] `[OPUS]` Should this become a future menu-intelligence build?

### Client Context for Events

576. [P1] `[CODEX]` Does this event page show client expectations?
577. [P1] `[CODEX]` Does it show event history with this client?
578. [P1] `[CODEX]` Does it show special service notes?
579. [P1] `[CODEX]` Does it show arrival/setup preferences?
580. [P1] `[CODEX]` Does it show prior event issues?
581. [P1] `[CODEX]` Does it show the client's preferred communication cadence?
582. [P1] `[CODEX]` Does it show who makes final decisions?
583. [P1] `[CODEX]` Does it show who pays?
584. [P1] `[CODEX]` Does it show who attends?
585. [P1] `[OPUS]` What client context would prevent mistakes at this event?
586. [P1] `[OPUS]` What client context would make the chef look more prepared?
587. [P1] `[OPUS]` What client context belongs in the event Rail?
588. [P1] `[OPUS]` What client context belongs in the prep packet?
589. [P1] `[OPUS]` What client context should be hidden from staff?
590. [P1] `[OPUS]` What client context should staff absolutely see?

### Client Context for Pricing / Proposals

591. [P1] `[CODEX]` Is client budget known?
592. [P1] `[CODEX]` Is prior accepted pricing known?
593. [P1] `[CODEX]` Is prior declined pricing known?
594. [P1] `[CODEX]` Is average spend known?
595. [P1] `[CODEX]` Is the client price-sensitive?
596. [P1] `[CODEX]` Is the client scope-sensitive?
597. [P1] `[CODEX]` Is the client margin-positive historically?
598. [P1] `[CODEX]` Are discounts or special rates connected?
599. [P1] `[CODEX]` Are travel/setup fees connected to this client?
600. [P1] `[OPUS]` Should this page surface pricing confidence?
601. [P1] `[OPUS]` Should this page warn if proposal is underpriced for this client/event?
602. [P1] `[OPUS]` Should this page show prior accepted pricing?
603. [P1] `[OPUS]` Should this page avoid exposing pricing intelligence to clients?
604. [P1] `[OPUS]` Should this become a PIE/client-pricing intelligence build?

### Client Visibility Rules

605. [P1] `[CODEX]` Can the client access this page?
606. [P1] `[CODEX]` Can a guest access this page?
607. [P1] `[CODEX]` Can staff access this page?
608. [P1] `[CODEX]` Can an admin access this page?
609. [P1] `[CODEX]` Are client notes visible to the client?
610. [P1] `[CODEX]` Are internal notes separated from client-facing notes?
611. [P1] `[CODEX]` Are sensitive preferences separated from general preferences?
612. [P1] `[CODEX]` Are financial notes hidden from non-chef roles?
613. [P1] `[CODEX]` Are risk notes hidden from clients?
614. [P1] `[OPUS]` What client intelligence must never be client-visible?
615. [P1] `[OPUS]` What client intelligence should be staff-visible?
616. [P1] `[OPUS]` What client intelligence should be chef-only?
617. [P1] `[OPUS]` What client intelligence should be admin-only?
618. [P1] `[OPUS]` What client intelligence is safe to summarize but not quote directly?
619. [P1] `[OPUS]` What client intelligence should only appear when the user asks?

### Talkable Client Intelligence

Data that does not need to display all the time, but must be conversationally available when the user asks.

620. [P1] `[BOTH]` What client intelligence should be talkable from this page?
621. [P1] `[BOTH]` What should the assistant answer if chef asks "What do I need to know about this client?"
622. [P1] `[BOTH]` What should the assistant answer if chef asks "Have I cooked for them before?"
623. [P1] `[BOTH]` What should the assistant answer if chef asks "What did they like last time?"
624. [P1] `[BOTH]` What should the assistant answer if chef asks "What should I avoid?"
625. [P1] `[BOTH]` What should the assistant answer if chef asks "Are they waiting on me?"
626. [P1] `[BOTH]` What should the assistant answer if chef asks "Are they high value?"
627. [P1] `[BOTH]` What should the assistant answer if chef asks "What's the next move with them?"
628. [P1] `[BOTH]` What should the assistant answer if chef asks "What should I send them?"
629. [P1] `[BOTH]` What should the assistant answer if chef asks "What do they usually spend?"
630. [P1] `[BOTH]` What should the assistant answer if chef asks "Are there any red flags?"
631. [P1] `[BOTH]` What should the assistant answer if chef asks "What does staff need to know?"
632. [P1] `[BOTH]` What should the assistant answer if chef asks "What should not be shown to the client?"

Talkable intelligence classification: safe to answer directly, answer only with summary, answer only to chef/admin, answer only with source citation, answer only if role permission allows, do not answer (sensitive), not enough data.

### Client Intelligence Rail Decision

633. [P1] `[OPUS]` Does client intelligence belong in the Rail here?
634. [P1] `[OPUS]` If yes, what is the most important client intelligence card?
635. [P1] `[OPUS]` Should the Rail show client history?
636. [P1] `[OPUS]` Should the Rail show client preferences?
637. [P1] `[OPUS]` Should the Rail show communication status?
638. [P1] `[OPUS]` Should the Rail show client risk?
639. [P1] `[OPUS]` Should the Rail show client value?
640. [P1] `[OPUS]` Should the Rail show next best action?
641. [P1] `[OPUS]` Should the Rail show "changed since last event"?
642. [P1] `[OPUS]` Should the Rail show "what they liked last time"?
643. [P1] `[OPUS]` Should the Rail show "waiting on client" or "client waiting on you"?
644. [P1] `[OPUS]` Should the Rail show nothing unless there is a client-specific signal?
645. [P1] `[OPUS]` Should client intelligence be collapsed by default?
646. [P1] `[OPUS]` Should client intelligence be hidden unless page is event/client/menu related?

**Output**: Client Intelligence Map per page: visible, Rail-visible, talkable, system-only, missing, risky/sensitive, role-gated, future builds, required resolvers, required schema, required UI, developer notes.

---

## Dimension 12: INTELLIGENCE CATEGORIES (RAIL MAPPING) [P2]

Which of the 8 Rail intelligence categories apply.

647. [P2] `[CODEX]` **READINESS**: Does this page have a completion/readiness score?
648. [P2] `[BOTH]` **READINESS**: What is missing to reach 100% completion?
649. [P2] `[CLAUDE]` **READINESS**: What is blocking progress?
650. [P2] `[CODEX]` **READINESS**: Does the completion contract cover this entity?
651. [P2] `[CODEX]` **READINESS**: Are all required fields filled?
652. [P2] `[CODEX]` **READINESS**: Are all required relationships established? (event->menu, menu->recipes)
653. [P2] `[CODEX]` **READINESS**: What checklist items exist? What are unchecked?
654. [P2] `[CODEX]` **MONEY**: Is there financial data? What types?
655. [P2] `[CODEX]` **MONEY**: Are costs, margins, or prices displayed?
656. [P2] `[CODEX]` **MONEY**: Are payments or invoices linked?
657. [P2] `[BOTH]` **MONEY**: Does PIE data apply? What categories?
658. [P2] `[BOTH]` **MONEY**: Are there financial alerts or anomalies?
659. [P2] `[CODEX]` **MONEY**: Is there budget vs actual comparison?
660. [P2] `[CLAUDE]` **MONEY**: What financial projections could be shown?
661. [P2] `[CODEX]` **PEOPLE**: Who is involved? (clients, guests, staff, vendors, co-hosts)
662. [P2] `[CODEX]` **PEOPLE**: Are dietary preferences surfaced?
663. [P2] `[CODEX]` **PEOPLE**: Is contact history shown?
664. [P2] `[BOTH]` **PEOPLE**: What relationship quality signals exist? (frequency, satisfaction, recency)
665. [P2] `[BOTH]` **PEOPLE**: What Dinner Circle context applies?
666. [P2] `[CLAUDE]` **PEOPLE**: What people-related actions should appear in Rail?
667. [P2] `[BOTH]` **TIME**: What deadlines apply?
668. [P2] `[CLAUDE]` **TIME**: What countdowns should display?
669. [P2] `[BOTH]` **TIME**: What scheduling conflicts exist?
670. [P2] `[CODEX]` **TIME**: What milestones are visible?
671. [P2] `[CLAUDE]` **TIME**: What timeline data should appear in Rail?
672. [P2] `[CLAUDE]` **RISK**: What could go wrong? List specific risks.
673. [P2] `[CODEX]` **RISK**: What overdue items exist?
674. [P2] `[BOTH]` **RISK**: What declining metrics are detectable?
675. [P2] `[BOTH]` **RISK**: What weather threats apply?
676. [P2] `[CLAUDE]` **RISK**: What risk alerts should appear in Rail?
677. [P2] `[CODEX]` **INTELLIGENCE**: What CIL signals apply?
678. [P2] `[CLAUDE]` **INTELLIGENCE**: What patterns are detectable from this page's data?
679. [P2] `[BOTH]` **INTELLIGENCE**: What PIE insights apply?
680. [P2] `[CLAUDE]` **INTELLIGENCE**: What seasonal trends are relevant?
681. [P3] `[OPUS]` **INTELLIGENCE**: What predictive insights could be shown?
682. [P2] `[CODEX]` **COMMUNICATION**: Are there unanswered messages?
683. [P2] `[BOTH]` **COMMUNICATION**: What follow-ups are due?
684. [P2] `[BOTH]` **COMMUNICATION**: What cadence items apply?
685. [P2] `[CLAUDE]` **COMMUNICATION**: What communication gaps exist?
686. [P2] `[CLAUDE]` **ACTIONS**: What should the user do RIGHT NOW from this page?
687. [P2] `[CLAUDE]` **ACTIONS**: What quick actions belong in Rail?
688. [P2] `[CLAUDE]` Which categories are PRIMARY for this page? (1-2 defining purpose)
689. [P2] `[CLAUDE]` Which categories are SECONDARY? (useful context, not main point)
690. [P2] `[CLAUDE]` Which categories should be EXCLUDED? (would be noise)
691. [P2] `[BOTH]` What resolvers feed each active category? What resolvers are missing?

---

## Dimension 13: DATA FLOW & PERFORMANCE [P1]

Where data comes from and goes to.

692. [P1] `[CODEX]` What database tables does this page read from? List each.
693. [P1] `[CODEX]` What specific columns are queried from each table?
694. [P1] `[CODEX]` What JOIN operations occur?
695. [P1] `[CODEX]` What WHERE clauses filter data?
696. [P1] `[CODEX]` What indexes support the queries? Are any missing?
697. [P1] `[CODEX]` What server actions does this page call? List each with file path.
698. [P1] `[CODEX]` What API routes does this page hit?
699. [P1] `[CODEX]` What data is fetched server-side (RSC/SSR)?
700. [P1] `[CODEX]` What data is fetched client-side? (useEffect, SWR, React Query, fetch)
701. [P1] `[CODEX]` What data is streamed? (SSE, WebSocket, polling)
702. [P1] `[CODEX]` What data is cached? At what layer? (Next.js data cache, unstable_cache, browser)
703. [P1] `[CODEX]` What cache tags are used?
704. [P1] `[CODEX]` What invalidates each cache?
705. [P1] `[BOTH]` Are cache invalidation paths complete? (mutation X invalidates all relevant caches)
706. [P1] `[CODEX]` When the user acts, what mutations fire? List each with table and operation.
707. [P1] `[CODEX]` What tables are written to?
708. [P1] `[CODEX]` What revalidation happens after each mutation?
709. [P1] `[CODEX]` What optimistic updates exist?
710. [P1] `[CODEX]` Do optimistic updates have rollback on failure?
711. [P1] `[CODEX]` What data comes from external sources? (PIE, weather, CIL, Ollama)
712. [P1] `[CODEX]` What data is derived/computed? (margins, scores, aggregates, readiness)
713. [P1] `[BOTH]` What data could be precomputed but is calculated on every load?
714. [P1] `[CODEX]` Is there a data waterfall? (fetch A, then B depends on A, then C depends on B)
715. [P1] `[BOTH]` Could any waterfall fetches be parallelized?
716. [P1] `[CODEX]` What is the total query count for a full page load?
717. [P1] `[CODEX]` What is the estimated data payload size?
718. [P1] `[CODEX]` What is the estimated page load time (server + client)?
719. [P1] `[CODEX]` What is the Time to First Byte (TTFB)?
720. [P1] `[CODEX]` What is the Largest Contentful Paint (LCP) element?
721. [P1] `[CODEX]` What is the Cumulative Layout Shift (CLS) risk?
722. [P1] `[CODEX]` What data transformations happen server-side before rendering?
723. [P1] `[CODEX]` What data transformations happen client-side?
724. [P1] `[CODEX]` Are there N+1 query patterns?
725. [P1] `[CODEX]` What data subscriptions exist for real-time updates?
726. [P1] `[BOTH]` Does the page use React Server Components effectively?
727. [P1] `[CODEX]` What client-side state management exists? (useState, useReducer, context, zustand)
728. [P1] `[BOTH]` Is client state duplicating server state unnecessarily?
729. [P1] `[CODEX]` What form state management exists? (react-hook-form, controlled, uncontrolled)
730. [P1] `[CODEX]` What data validation happens client-side vs server-side?
731. [P1] `[CODEX]` Is validation consistent between client and server?
732. [P1] `[CODEX]` What data serialization/deserialization boundaries exist?
733. [P1] `[CODEX]` Are dates properly serialized across server/client boundary?
734. [P1] `[CODEX]` What data is passed via URL params vs fetched?
735. [P1] `[CODEX]` What data is passed via React context?
736. [P1] `[CODEX]` What data is passed via props drilling? How deep?
737. [P1] `[CLAUDE]` Could any prop drilling be replaced with context or composition?
738. [P1] `[CODEX]` What data is stored in localStorage or sessionStorage?
739. [P1] `[CODEX]` What cookies does this page read or write?
740. [P1] `[CODEX]` Does the page handle offline scenarios?
741. [P1] `[CLAUDE]` What data prefetching opportunities exist? (next likely page, related entities)

---

## Dimension 14: COMPLETION & GAPS [P2]

What's missing or incomplete.

742. [P2] `[CLAUDE]` What is the page's estimated completion score? (% of intended functionality built)
743. [P2] `[CODEX]` What features are stubbed but not implemented?
744. [P2] `[BOTH]` What features are planned (in specs) but not started?
745. [P2] `[BOTH]` What features are partially built? What is done vs remaining?
746. [P2] `[CODEX]` What data fields exist in schema but aren't displayed?
747. [P2] `[CODEX]` What server actions exist but aren't exposed on this page?
748. [P2] `[CODEX]` What UI components exist in the domain but aren't used here?
749. [P2] `[CODEX]` What error states are unhandled?
750. [P2] `[CODEX]` What empty states are unhandled?
751. [P2] `[CODEX]` What loading states are missing?
752. [P2] `[BOTH]` Is there inline help, tooltips, or info icons? Should there be?
753. [P2] `[CODEX]` Is there onboarding for first-time visitors?
754. [P2] `[CODEX]` What documentation exists for this page's functionality?
755. [P2] `[BOTH]` Is the documentation current and accurate?
756. [P2] `[CODEX]` What tests exist? List by type (unit, integration, e2e).
757. [P2] `[BOTH]` What tests are missing?
758. [P2] `[CODEX]` Does the page have a test-coverage-blueprint entry? What status?
759. [P2] `[CODEX]` What resolver functions exist but aren't connected to this page?
760. [P2] `[CODEX]` What domain functions exist but aren't used by this page?
761. [P2] `[BOTH]` What spec documents reference this page? Are specs implemented?
762. [P2] `[CODEX]` What build queue items reference this page? What status?
763. [P2] `[BOTH]` What nav audit findings reference this page? Are they resolved?
764. [P2] `[BOTH]` What domain audit findings reference this page? Are they resolved?
765. [P2] `[BOTH]` What accessibility gaps exist? (WCAG compliance)
766. [P2] `[CODEX]` What internationalization gaps exist? (hardcoded strings, locale)
767. [P2] `[BOTH]` What print/export gaps exist?
768. [P2] `[BOTH]` What mobile-specific gaps exist?
769. [P2] `[BOTH]` What performance gaps exist? (slow queries, large payloads, waterfalls)
770. [P2] `[BOTH]` What SEO gaps exist? (missing meta, no structured data, no sitemap entry)
771. [P2] `[BOTH]` What analytics/tracking gaps exist?
772. [P2] `[BOTH]` What monitoring gaps exist? (no error tracking, no performance metrics)
773. [P2] `[CODEX]` What logging gaps exist?
774. [P2] `[BOTH]` What API contract gaps exist? (undocumented endpoints, missing types)
775. [P2] `[CLAUDE]` What visual design gaps exist compared to design system?
776. [P2] `[CODEX]` What copy/text gaps exist? (placeholder text, lorem ipsum, generic labels)
777. [P2] `[CODEX]` What feature flag dependencies exist?
778. [P2] `[CODEX]` What environment-specific behavior exists? (dev vs prod differences)
779. [P2] `[CODEX]` What deprecated features or APIs are still used?
780. [P2] `[BOTH]` What hardcoded values should be configurable?
781. [P2] `[CLAUDE]` What is the single biggest gap on this page right now?

---

## Dimension 15: FAILURE MODES [P2]

What can break and how.

782. [P2] `[CODEX]` What happens with ZERO data? (no events, no clients, no items)
783. [P2] `[CODEX]` What happens with ONE item? (single event, single client)
784. [P2] `[CODEX]` What happens with 100 items?
785. [P2] `[CODEX]` What happens with 1000 items? (performance, rendering, pagination)
786. [P2] `[CODEX]` What happens with 10,000 items?
787. [P2] `[BOTH]` What happens with stale data? (cached data changed elsewhere)
788. [P2] `[CODEX]` What happens if network drops mid-action?
789. [P2] `[CODEX]` What happens if network drops mid-page-load?
790. [P2] `[CODEX]` What happens if server action returns 500?
791. [P2] `[CODEX]` What happens if server action returns validation error?
792. [P2] `[CODEX]` What happens if auth expires while on this page?
793. [P2] `[CODEX]` What happens if auth token is revoked by admin?
794. [P2] `[BOTH]` What happens if another user modifies the same entity simultaneously?
795. [P2] `[BOTH]` What happens if a required related entity is deleted by another user?
796. [P2] `[CODEX]` What happens if PIE API is down?
797. [P2] `[CODEX]` What happens if CIL data is unavailable?
798. [P2] `[CODEX]` What happens if weather API is down?
799. [P2] `[CODEX]` What happens if Ollama is down?
800. [P2] `[BOTH]` What happens on a slow connection? (3G, spotty wifi at venue)
801. [P2] `[CODEX]` What happens if JavaScript fails to load? (progressive enhancement)
802. [P2] `[CODEX]` What happens if the user double-clicks a submit button?
803. [P2] `[CODEX]` What happens if the user triple-submits via network retry?
804. [P2] `[CODEX]` What happens if the user navigates away mid-form?
805. [P2] `[CODEX]` What happens if the user opens this page in two tabs?
806. [P2] `[BOTH]` What happens if the user opens this page while another user has it open?
807. [P2] `[CODEX]` What happens if a required field is null in the database?
808. [P2] `[CODEX]` What happens if a foreign key reference is broken?
809. [P2] `[CODEX]` What happens if a date field contains an invalid date?
810. [P2] `[CODEX]` What happens if a numeric field contains a negative value?
811. [P2] `[CODEX]` What happens if a text field contains HTML or script tags?
812. [P2] `[CODEX]` What happens if a URL parameter is tampered with?
813. [P2] `[CODEX]` What happens if a very long string is entered in a text field?
814. [P2] `[CODEX]` What happens if special characters are in entity names?
815. [P2] `[CODEX]` What happens if the database connection drops during a transaction?
816. [P2] `[BOTH]` What happens if a migration is applied but code isn't deployed?
817. [P2] `[CODEX]` What happens if the page is accessed from a very old browser?
818. [P2] `[CODEX]` What happens if browser cookies are disabled?
819. [P2] `[CODEX]` What happens if localStorage is full?
820. [P2] `[CODEX]` What happens if the user's session data is corrupted?
821. [P2] `[BOTH]` What happens if a scheduled job modifies data while user is viewing?
822. [P2] `[CODEX]` What happens if the page receives a malformed server response?
823. [P2] `[CODEX]` What happens if React hydration fails?
824. [P2] `[CODEX]` What happens if a third-party dependency fails to load?
825. [P2] `[CODEX]` What error boundaries exist on this page?
826. [P2] `[CODEX]` What errors are caught vs unhandled?

---

## Dimension 16: SECURITY & DATA SAFETY [P1]

Attack vectors, data protection, and compliance.

827. [P1] `[CODEX]` What XSS vectors exist? (user input rendered without sanitization)
828. [P1] `[CODEX]` What CSRF protections exist?
829. [P1] `[CODEX]` What SQL injection vectors exist? (raw queries, string interpolation)
830. [P1] `[CODEX]` What command injection vectors exist?
831. [P1] `[CODEX]` What path traversal vectors exist?
832. [P1] `[CODEX]` Are all server actions authenticated?
833. [P1] `[CODEX]` Are all server actions tenant-scoped?
834. [P1] `[CODEX]` Are all server actions input-validated?
835. [P1] `[CODEX]` Are all server actions idempotent? (safe to retry)
836. [P1] `[CODEX]` Does the page expose internal system information? (stack traces, DB names, file paths)
837. [P1] `[BOTH]` Does the page expose user PII unnecessarily?
838. [P1] `[BOTH]` Does the page expose financial data to wrong roles?
839. [P1] `[CODEX]` Could URL parameter manipulation reveal other users' data?
840. [P1] `[CODEX]` Could URL parameter manipulation trigger unauthorized actions?
841. [P1] `[CODEX]` Are file uploads handled securely? (type validation, size limits, storage)
842. [P1] `[CODEX]` Are external links sanitized? (no `javascript:` URLs, no open redirects)
843. [P1] `[CODEX]` Does the page use `dangerouslySetInnerHTML`? Is input sanitized?
844. [P1] `[CODEX]` What secrets or API keys could accidentally leak?
845. [P1] `[CODEX]` Are error messages generic enough to not reveal system internals?
846. [P1] `[CODEX]` Does the page respect Content Security Policy (CSP)?
847. [P1] `[CODEX]` Does the page set appropriate security headers?
848. [P1] `[CODEX]` What data leaves the browser? (analytics, external fetches, third-party scripts)
849. [P1] `[CODEX]` Is sensitive data transmitted over HTTPS only?
850. [P1] `[CODEX]` Are auth tokens stored securely? (httpOnly cookies, not localStorage)
851. [P1] `[CODEX]` Does the page properly handle session expiry?
852. [P1] `[CODEX]` Can a logged-out user see any flash of protected content?
853. [P1] `[CODEX]` Are immutable entities (ledger, transitions) protected from modification?
854. [P1] `[CODEX]` Does the page enforce soft-delete over hard-delete?
855. [P1] `[BOTH]` What destructive actions exist? Are they confirmation-gated?
856. [P1] `[BOTH]` What data could be leaked through browser history?
857. [P1] `[CODEX]` What data could be leaked through browser autocomplete?
858. [P1] `[CLAUDE]` What data could be leaked if the user screenshots this page?
859. [P1] `[CODEX]` What data could be leaked through the page's URL?
860. [P1] `[CODEX]` Is there rate limiting on actions from this page?
861. [P1] `[CODEX]` Is there rate limiting on data fetches?
862. [P1] `[CODEX]` Could this page be used for enumeration attacks? (guessing valid IDs)
863. [P1] `[CODEX]` Does the page use predictable IDs in URLs? (sequential integers vs UUIDs)
864. [P1] `[CODEX]` What happens if a user tries to access another user's entity via URL?
865. [P1] `[BOTH]` What cannabis-specific compliance requirements apply?
866. [P1] `[BOTH]` What financial data protection requirements apply?
867. [P1] `[BOTH]` What COPPA/child safety considerations apply? (guest minors at events)
868. [P1] `[CODEX]` Does the page log sensitive actions for audit?
869. [P1] `[CODEX]` Are audit logs tamper-proof?
870. [P1] `[BOTH]` What backup/recovery implications does this page's data have?
871. [P1] `[BOTH]` What data retention policies apply?
872. [P1] `[BOTH]` Does the page handle "right to deletion" requests?
873. [P1] `[BOTH]` What happens if database is restored from backup while user has newer data?
874. [P1] `[CODEX]` Are there open CVEs in dependencies used by this page?
875. [P1] `[CODEX]` Does this page's code pass linting with security rules enabled?
876. [P1] `[CLAUDE]` What is the overall security risk rating? (critical/high/medium/low)

---

## Dimension 17: ACCESSIBILITY & RESPONSIVENESS [P2]

Can everyone use this page?

877. [P2] `[CODEX]` Is every interactive element keyboard accessible?
878. [P2] `[CODEX]` Is there a logical tab order?
879. [P2] `[CODEX]` Do all images have meaningful alt text?
880. [P2] `[CODEX]` Do all form fields have labels (visible or `aria-label`)?
881. [P2] `[CODEX]` Are error messages associated with their fields (`aria-describedby`)?
882. [P2] `[BOTH]` Does the page work with a screen reader?
883. [P2] `[BOTH]` Are color-coded elements distinguishable without color? (icons, patterns, text)
884. [P2] `[CODEX]` Does the page work at 200% zoom?
885. [P2] `[CODEX]` Does the page work at 320px width? (mobile minimum)
886. [P2] `[CODEX]` Does the page work at 2560px width? (ultrawide)
887. [P2] `[CODEX]` Are touch targets at least 44px on mobile?
888. [P2] `[CODEX]` Is text readable without horizontal scroll on mobile?
889. [P2] `[CODEX]` Do modals/sheets work and dismiss on mobile?
890. [P2] `[CODEX]` Is body text at least 14px?
891. [P2] `[CODEX]` Does the page respect `prefers-reduced-motion`?
892. [P2] `[CODEX]` Does the page respect `prefers-color-scheme`?
893. [P2] `[CODEX]` Does the page respect `prefers-contrast`?
894. [P2] `[CODEX]` What ARIA roles are used? Are they correct?
895. [P2] `[CODEX]` What ARIA live regions exist for dynamic content?
896. [P2] `[CODEX]` Is focus management correct after modals open/close?
897. [P2] `[CODEX]` Is focus management correct after route changes?
898. [P2] `[CODEX]` Are skip links present?
899. [P2] `[CODEX]` Does the page have landmark regions? (main, nav, aside, footer)
900. [P2] `[CODEX]` What heading hierarchy exists? Is it correct? (h1 > h2 > h3)
901. [P2] `[CODEX]` Do data tables have proper `thead`/`th`/`scope` attributes?
902. [P2] `[CODEX]` Are loading states announced to screen readers?
903. [P2] `[CODEX]` Are toast notifications announced to screen readers?
904. [P2] `[CODEX]` Does the page work in landscape and portrait on mobile?
905. [P2] `[BOTH]` What is the minimum viable viewport for this page to be usable?
906. [P2] `[BOTH]` Overall WCAG 2.1 AA compliance assessment.

---

## Dimension 18: DOMAIN INTERFACE COMPLIANCE [P2]

Is this page respecting domain boundaries and patterns?

907. [P2] `[CODEX]` Does this page import from its own domain's `index.ts`/barrel export?
908. [P2] `[CODEX]` Does this page import from other domains' barrel exports only?
909. [P2] `[CODEX]` Does any import bypass a domain interface (reaching into internal files)?
910. [P2] `[CODEX]` Does this page import directly from `database/` layer?
911. [P2] `[CODEX]` Does this page contain inline database queries?
912. [P2] `[CODEX]` Does this page call other domains' server actions directly or via its own domain?
913. [P2] `[CODEX]` Are cross-domain data joins handled in a composition layer or inline?
914. [P2] `[CODEX]` Does this page use shared types from `types/` directory?
915. [P2] `[CODEX]` Does this page define inline types that should be in `types/`?
916. [P2] `[CODEX]` Does this page use shared components from `components/`?
917. [P2] `[BOTH]` Does this page define inline components that should be extracted?
918. [P2] `[BOTH]` Are shared component variants used correctly for this domain?
919. [P2] `[CODEX]` Does this page follow its domain's established data loading pattern?
920. [P2] `[CODEX]` Does this page follow its domain's established mutation pattern?
921. [P2] `[CODEX]` Does this page follow its domain's established error handling pattern?
922. [P2] `[CODEX]` Does this page follow the surface grammar governance rules?
923. [P2] `[CLAUDE]` Is the declared surface mode correct?
924. [P2] `[CODEX]` Does this page use the PostActionFooter pattern where appropriate?
925. [P2] `[CODEX]` Does this page use the domain's standard list/detail/edit layout pattern?
926. [P2] `[CODEX]` Does this page use the domain's standard form pattern?
927. [P2] `[CODEX]` Are server actions in a separate actions file or inline in `page.tsx`?
928. [P2] `[CODEX]` Are data fetching functions in a separate queries/loaders file?
929. [P2] `[CODEX]` Does this page use the domain's standard nav integration?
930. [P2] `[CODEX]` Does this page contribute to the domain's search index?
931. [P2] `[CODEX]` Does this page register with the command palette?
932. [P2] `[CODEX]` Does this page follow the domain's URL convention?
933. [P2] `[CODEX]` Are API contracts documented for external-facing endpoints?
934. [P2] `[CODEX]` Does this page use the domain's standard cache invalidation patterns?
935. [P2] `[CODEX]` Does the page follow the domain's standard Suspense/streaming pattern?
936. [P2] `[CODEX]` What domain utilities/helpers does this page use?
937. [P2] `[BOTH]` What domain utilities exist but aren't used that could simplify this page?
938. [P2] `[CODEX]` Does this page follow the domain's standard permission checking pattern?
939. [P2] `[CODEX]` Does this page's data model align with the domain's canonical schema?
940. [P2] `[BOTH]` Are there any anti-patterns specific to this domain that this page violates?
941. [P2] `[CLAUDE]` Overall domain compliance score.

---

## Dimension 19: COMPETITIVE POSITIONING [P2]

What do the best apps show on equivalent pages?

942. [P2] `[CLAUDE]` What does Uber's equivalent page look like? (driver dashboard, trip detail)
943. [P2] `[CLAUDE]` What does DoorDash's merchant equivalent look like? (order detail, menu editor)
944. [P2] `[CLAUDE]` What does Airbnb's host equivalent look like? (listing detail, reservation)
945. [P2] `[CLAUDE]` What does Square's dashboard equivalent look like? (transaction, item, customer)
946. [P2] `[CLAUDE]` What does Toast's restaurant equivalent look like? (order, menu, kitchen display)
947. [P2] `[CLAUDE]` What does HoneyBook's freelancer equivalent look like? (project, invoice, client)
948. [P2] `[CLAUDE]` What does Caterease or similar catering software show?
949. [P2] `[CLAUDE]` What do competitors show that ChefFlow doesn't?
950. [P2] `[CLAUDE]` What does ChefFlow show that competitors don't? (differentiation)
951. [P2] `[CLAUDE]` What UX patterns from competitors should ChefFlow adopt?
952. [P2] `[CLAUDE]` What UX patterns from competitors should ChefFlow avoid?
953. [P2] `[CLAUDE]` What data density do competitors achieve on equivalent pages?
954. [P2] `[CLAUDE]` How do competitors handle the empty state for this page type?
955. [P2] `[CLAUDE]` How do competitors handle mobile for this page type?
956. [P2] `[CLAUDE]` What notification or alert patterns do competitors use?
957. [P2] `[CLAUDE]` What automation or AI features do competitors offer on equivalent pages?
958. [P2] `[CLAUDE]` What reporting or analytics do competitors show?
959. [P2] `[CLAUDE]` How do competitors handle multi-role access?
960. [P3] `[OPUS]` What is ChefFlow's "unfair advantage" on this page?
961. [P3] `[OPUS]` What would a chef switching FROM another platform miss on this page?
962. [P3] `[OPUS]` What would a chef switching TO another platform miss from this page?
963. [P2] `[CLAUDE]` What non-software competitors exist? (paper, spreadsheets, phone)
964. [P2] `[CLAUDE]` What is this page replacing in the chef's current workflow?
965. [P2] `[CLAUDE]` Is the page faster than the manual alternative? By how much?
966. [P3] `[OPUS]` What competitive threat would make this page irrelevant?

---

## Dimension 20: MONETIZATION & BUSINESS VALUE [P2]

Does this page drive business value?

967. [P2] `[CLAUDE]` Does this page directly contribute to revenue? How?
968. [P2] `[CLAUDE]` Does this page indirectly contribute to revenue? (retention, upsell, referral)
969. [P2] `[BOTH]` Is there a conversion path from this page to a paid action?
970. [P2] `[CLAUDE]` Could this page be gated behind a paid tier? Should it?
971. [P2] `[CLAUDE]` What premium features could enhance this page?
972. [P2] `[CLAUDE]` Does this page reduce churn? (makes product stickier)
973. [P2] `[CLAUDE]` Does this page save the user time? Estimate time per use.
974. [P2] `[CLAUDE]` Does this page prevent errors that cost money? Estimate savings.
975. [P2] `[CODEX]` What is the business cost if this page is DOWN for 1 hour?
976. [P2] `[CLAUDE]` What is the business cost if this page has a BUG for 1 week?
977. [P2] `[CLAUDE]` Does this page showcase ChefFlow's value to potential users?
978. [P2] `[CLAUDE]` Could this page's data be packaged as a report?
979. [P2] `[CLAUDE]` Does this page create switching costs? (data lock-in, workflow dependency)
980. [P2] `[CLAUDE]` What referral or sharing opportunities exist?
981. [P2] `[BOTH]` Does this page support the pricing model (free vs paid tiers)?
982. [P2] `[CLAUDE]` What upsell moment exists on this page?
983. [P2] `[CLAUDE]` Is the upsell natural or forced?
984. [P2] `[CLAUDE]` What data would impress a prospective user in a demo?
985. [P2] `[CLAUDE]` What data would embarrass in a demo? (empty, broken, ugly)
986. [P2] `[BOTH]` Does this page contribute to onboarding completion?
987. [P3] `[OPUS]` Does this page contribute to the "aha moment"?
988. [P2] `[CLAUDE]` What is this page's contribution to Monthly Active Usage?
989. [P2] `[CLAUDE]` What is this page's contribution to daily workflow stickiness?
990. [P2] `[CLAUDE]` If this page were removed, would any user notice? Which users?
991. [P3] `[OPUS]` What is the ROI of the next improvement to this page?

---

## Dimension 21: EMOTIONAL & PROFESSIONAL CONTEXT [P2]

How the user FEELS on this page.

992. [P2] `[CLAUDE]` Is this a "WIN" page or a "WORK" page?
993. [P2] `[CLAUDE]` What is the user's stress level on arrival?
994. [P2] `[CLAUDE]` Does this page increase or decrease stress?
995. [P2] `[BOTH]` Is there a sense of progress? (bars, checkmarks, completion indicators)
996. [P2] `[CLAUDE]` Is there a sense of control? (user can act, not just observe)
997. [P2] `[CLAUDE]` Is there a sense of overwhelm? (too many items, choices, data)
998. [P2] `[CODEX]` Does the page celebrate accomplishments?
999. [P2] `[CLAUDE]` Does the page surface bad news gently?
1000. [P3] `[OPUS]` What is the user's confidence level after using this page?
1001. [P2] `[CLAUDE]` Would the user show this page to a client? A partner? An investor?
1002. [P2] `[CLAUDE]` Does this page make the user feel professional or amateur?
1003. [P2] `[CLAUDE]` What would make the user say "wow"?
1004. [P2] `[CLAUDE]` What would make the user say "ugh"?
1005. [P2] `[CLAUDE]` Does the page convey competence and trustworthiness?
1006. [P2] `[CLAUDE]` Does the page feel like a premium product or a free tool?
1007. [P2] `[BOTH]` What micro-interactions create delight?
1008. [P2] `[BOTH]` What micro-interactions create frustration?
1009. [P2] `[CODEX]` Is feedback immediate for every action?
1010. [P2] `[CODEX]` Are wait times communicated clearly?
1011. [P2] `[CLAUDE]` Does the page feel fast or sluggish?
1012. [P2] `[CLAUDE]` Does the page feel organized or chaotic?
1013. [P2] `[CLAUDE]` Does the page feel focused or cluttered?
1014. [P2] `[CLAUDE]` Does the page have clear visual hierarchy?
1015. [P2] `[CLAUDE]` Does the page use whitespace effectively?
1016. [P2] `[CLAUDE]` Does the page typography feel intentional?
1017. [P2] `[CLAUDE]` What is the page's "personality"? (clinical, warm, playful, serious)
1018. [P2] `[CLAUDE]` Is the personality consistent with ChefFlow's brand?
1019. [P3] `[OPUS]` Does the page make the user want to return?
1020. [P3] `[OPUS]` Does the page make the user want to explore more of ChefFlow?
1021. [P3] `[OPUS]` What emotional trigger would make a user upgrade to paid?
1022. [P3] `[OPUS]` What emotional trigger would make a user cancel?
1023. [P2] `[CLAUDE]` Does the page handle "I have 5 minutes between events"?
1024. [P2] `[CLAUDE]` Does the page handle "I'm reviewing at midnight after service"?
1025. [P2] `[CLAUDE]` Does the page handle "I'm showing this to my client right now"?
1026. [P2] `[CLAUDE]` Does the page handle "I'm panicking about tomorrow's event"?

---

## Dimension 22: CROSS-PAGE COHESION [P2]

How this page relates to the whole app.

1027. [P2] `[BOTH]` Does this page use the same design language as similar pages?
1028. [P2] `[CODEX]` Does this page use shared components or one-off components?
1029. [P2] `[BOTH]` Is the navigation consistent with other pages at this depth?
1030. [P2] `[BOTH]` Can the user get back to this page easily from related pages?
1031. [P2] `[CODEX]` Does this page appear in in-app search results?
1032. [P2] `[CODEX]` Does this page appear in the command palette?
1033. [P2] `[BOTH]` Is this page referenced from the dashboard? Should it be?
1034. [P2] `[BOTH]` Is this page referenced from the Rail? Should it be?
1035. [P2] `[CODEX]` Is this page in the sitemap? Should it be?
1036. [P2] `[CODEX]` Does this page share data-fetching patterns with similar pages?
1037. [P2] `[CLAUDE]` Could this page be merged with another page? Should it?
1038. [P2] `[CLAUDE]` Could this page be split into multiple pages? Should it?
1039. [P2] `[CLAUDE]` What other pages become more useful because this page exists?
1040. [P2] `[CLAUDE]` What other pages become less useful because this page exists? (duplication)
1041. [P2] `[CLAUDE]` If this page were deleted, what would break? What would nobody notice?
1042. [P2] `[BOTH]` Does this page follow the same CRUD pattern as similar entity pages?
1043. [P2] `[BOTH]` Does this page follow the same list/detail pattern as similar pages?
1044. [P2] `[CODEX]` Does this page use the same table/card rendering as similar lists?
1045. [P2] `[CODEX]` Does this page use the same form layout as similar edit pages?
1046. [P2] `[CODEX]` Does this page use the same action bar pattern as related pages?
1047. [P2] `[BOTH]` Are transitions to/from this page consistent with app-wide patterns?
1048. [P2] `[CODEX]` Does this page maintain scroll position correctly?
1049. [P2] `[CODEX]` Does this page preserve filter/sort state across navigation?
1050. [P2] `[CODEX]` Does this page respect URL-based state (shareable URLs)?
1051. [P2] `[CODEX]` Is the page's loading skeleton consistent with other pages?
1052. [P2] `[CODEX]` Is the page's error boundary consistent with other pages?
1053. [P2] `[CODEX]` Does this page use the same toast/notification patterns?
1054. [P2] `[CODEX]` Does this page use the same confirmation dialog patterns?
1055. [P2] `[CODEX]` Does this page use the same empty state illustration style?
1056. [P2] `[BOTH]` What data displayed here is also displayed on other pages? Is it consistent?
1057. [P2] `[CODEX]` If same data shown on multiple pages, does updating on one update all?
1058. [P2] `[CODEX]` Does this page contribute to or consume the global activity feed?
1059. [P2] `[CODEX]` Does this page contribute to or consume dashboard widgets?
1060. [P2] `[CODEX]` Does this page contribute to or consume reports?
1061. [P2] `[CODEX]` Does this page's entity appear in global search?
1062. [P2] `[CODEX]` Does this page follow the same print stylesheet as similar pages?
1063. [P2] `[CODEX]` Does this page follow the same mobile navigation pattern?
1064. [P2] `[CODEX]` Is this page's menu/sidebar position consistent?
1065. [P2] `[CODEX]` Does this page use the same icon set as related pages?
1066. [P2] `[CLAUDE]` Overall cross-page consistency rating.

---

## Dimension 23: RAIL PROFILE DESIGN [P3]

Designing the contextual Rail for this page.

1067. [P3] `[CODEX]` Does a Rail Profile exist for this route?
1068. [P3] `[CODEX]` If yes, what categories are configured?
1069. [P3] `[CLAUDE]` If no, what categories SHOULD be configured?
1070. [P3] `[BOTH]` What entity scoping do resolvers need? (global, per-event, per-client)
1071. [P3] `[CODEX]` What resolvers currently feed this route's Rail? List each.
1072. [P3] `[CLAUDE]` What resolvers should feed this route but don't?
1073. [P3] `[CLAUDE]` What collapsed metrics should appear?
1074. [P3] `[CLAUDE]` What expanded details should appear?
1075. [P3] `[CLAUDE]` What quick actions should the Rail expose?
1076. [P3] `[CLAUDE]` What contextual links should appear?
1077. [P3] `[CLAUDE]` Should the Rail show readiness/completion? How?
1078. [P3] `[CLAUDE]` Should the Rail show financial context? What specifically?
1079. [P3] `[CLAUDE]` Should the Rail show people context? Who specifically?
1080. [P3] `[CLAUDE]` Should the Rail show time/deadline context? What specifically?
1081. [P3] `[CLAUDE]` Should the Rail show risk alerts? What specifically?
1082. [P3] `[CLAUDE]` Should the Rail show intelligence/patterns? What specifically?
1083. [P3] `[CLAUDE]` Should the Rail show communication status? What specifically?
1084. [P3] `[CLAUDE]` Should the Rail show suggested actions? What specifically?
1085. [P3] `[CLAUDE]` What should the Rail explicitly NOT show on this page?
1086. [P3] `[CLAUDE]` What density level should the Rail use? (compact, standard, expanded)
1087. [P3] `[CLAUDE]` Should the Rail auto-expand or stay collapsed?
1088. [P3] `[CLAUDE]` What Rail layout is appropriate? (sidebar, bottom bar, floating panel)
1089. [P3] `[BOTH]` Should Rail content differ by role on this page?
1090. [P3] `[BOTH]` What Rail data requires real-time updates?
1091. [P3] `[BOTH]` What Rail data can be cached? For how long?
1092. [P3] `[CODEX]` What Rail resolvers require database queries?
1093. [P3] `[CODEX]` What Rail resolvers require external API calls?
1094. [P3] `[BOTH]` What Rail resolvers can use precomputed/cached data?
1095. [P3] `[CODEX]` What is the estimated load time for all Rail resolvers?
1096. [P3] `[BOTH]` Should any Rail sections stream (load progressively)?
1097. [P3] `[BOTH]` What happens to the Rail if the page entity doesn't exist?
1098. [P3] `[BOTH]` What happens to the Rail if external data sources are down?
1099. [P3] `[CLAUDE]` Should the Rail persist across sub-routes of this route group?
1100. [P3] `[CLAUDE]` What Rail categories should animate or highlight on data change?
1101. [P3] `[CLAUDE]` What Rails from other routes should deep-link to this page?
1102. [P3] `[CODEX]` What semantic HTML structure should the Rail use for accessibility?
1103. [P3] `[CLAUDE]` How should the Rail render on mobile?
1104. [P3] `[CLAUDE]` Should the Rail be printable with this page?
1105. [P3] `[CLAUDE]` What developer notes should accompany this Rail Profile?
1106. [P3] `[BOTH]` What resolver functions need to be created?
1107. [P3] `[BOTH]` What resolver functions exist but need modification?
1108. [P3] `[BOTH]` What data sources need new queries for this Rail?
1109. [P3] `[CODEX]` What cache tags should Rail resolvers use?
1110. [P3] `[BOTH]` Generate the TypeScript Rail Profile for this route.
1111. [P3] `[CLAUDE]` What is the Rail readiness score for this page?

---

## Dimension 24: TESTING & VERIFICATION [P3]

Test coverage and verification status.

1112. [P3] `[CODEX]` Does a test file exist for this page? Path?
1113. [P3] `[CODEX]` What unit tests exist? List each with what they verify.
1114. [P3] `[CODEX]` What integration tests exist?
1115. [P3] `[CODEX]` What end-to-end (Playwright) tests exist?
1116. [P3] `[CODEX]` What visual regression tests exist?
1117. [P3] `[CODEX]` What accessibility tests exist? (axe, lighthouse)
1118. [P3] `[CODEX]` What performance tests exist? (lighthouse, web-vitals)
1119. [P3] `[CODEX]` What test coverage percentage does this page have?
1120. [P3] `[BOTH]` What critical paths are untested?
1121. [P3] `[BOTH]` What edge cases are untested?
1122. [P3] `[BOTH]` What failure modes are untested?
1123. [P3] `[BOTH]` What role-based scenarios are untested?
1124. [P3] `[CODEX]` Does the test suite test empty states?
1125. [P3] `[CODEX]` Does the test suite test error states?
1126. [P3] `[CODEX]` Does the test suite test loading states?
1127. [P3] `[CODEX]` Does the test suite test mobile viewport?
1128. [P3] `[CODEX]` Does the test suite test keyboard navigation?
1129. [P3] `[CODEX]` Does the test suite test form validation?
1130. [P3] `[CODEX]` Does the test suite test server action failures?
1131. [P3] `[CODEX]` Does the test suite test concurrent modifications?
1132. [P3] `[CODEX]` Does the test suite test auth/permission gating?
1133. [P3] `[CODEX]` Does the test suite test the happy path end-to-end?
1134. [P3] `[CODEX]` Does the test suite test the sad path end-to-end?
1135. [P3] `[BOTH]` Are test fixtures/mocks realistic?
1136. [P3] `[CODEX]` Do tests use the agent testing infrastructure?
1137. [P3] `[CODEX]` Do tests verify server-side rendering correctly?
1138. [P3] `[CODEX]` Do tests verify client-side hydration?
1139. [P3] `[CODEX]` Do tests verify cache invalidation?
1140. [P3] `[CODEX]` Do tests verify optimistic updates + rollback?
1141. [P3] `[CODEX]` Do tests run in CI?
1142. [P3] `[CODEX]` What is the test execution time?
1143. [P3] `[CODEX]` Are there flaky tests?
1144. [P3] `[CODEX]` Are there skipped/disabled tests? Why?
1145. [P3] `[CODEX]` What test-coverage-blueprint status does this page have?
1146. [P3] `[CLAUDE]` What tests should be written first? (priority order)
1147. [P3] `[CLAUDE]` What test would catch the most likely real-world bug?
1148. [P3] `[CLAUDE]` What test would catch the most dangerous real-world bug?
1149. [P3] `[CLAUDE]` What stress/load test would be valuable?
1150. [P3] `[CLAUDE]` What manual test checklist should QA use?
1151. [P3] `[CLAUDE]` Overall test coverage assessment.

---

## Dimension 25: BUILD OPPORTUNITY MINING [P3]

What should be built, wired, fixed, or automated on this page?

1152. [P3] `[CLAUDE]` What buttons should exist but don't?
1153. [P3] `[CLAUDE]` What links should exist but don't?
1154. [P3] `[CLAUDE]` What data should display but doesn't?
1155. [P3] `[CLAUDE]` What actions should be possible but aren't?
1156. [P3] `[CLAUDE]` What automations should exist but don't?
1157. [P3] `[CLAUDE]` What Remy integrations should exist but don't?
1158. [P3] `[CLAUDE]` What Rail cards should exist but don't?
1159. [P3] `[CLAUDE]` What notifications should trigger but don't?
1160. [P3] `[CLAUDE]` What email templates should exist for this page?
1161. [P3] `[CLAUDE]` What print/export options should exist?
1162. [P3] `[CLAUDE]` What bulk operations should exist?
1163. [P3] `[CLAUDE]` What templates/presets should exist?
1164. [P3] `[CLAUDE]` What copy/clone operations should exist?
1165. [P3] `[CLAUDE]` What inline editing should exist?
1166. [P3] `[CLAUDE]` What drag-and-drop should exist?
1167. [P3] `[CLAUDE]` What keyboard shortcuts should exist?
1168. [P3] `[CLAUDE]` What search/filter capabilities should exist?
1169. [P3] `[CLAUDE]` What sort/group capabilities should exist?
1170. [P3] `[CLAUDE]` What aggregation/summary views should exist?
1171. [P3] `[CLAUDE]` What comparison views should exist? (before/after, side-by-side)
1172. [P3] `[CLAUDE]` What timeline/history views should exist?
1173. [P3] `[CLAUDE]` What calendar integration should exist?
1174. [P3] `[CLAUDE]` What map/location integration should exist?
1175. [P3] `[CLAUDE]` What pricing/cost integration should exist? (PIE)
1176. [P3] `[CLAUDE]` What weather integration should exist?
1177. [P3] `[CLAUDE]` What CIL integration should exist?
1178. [P3] `[CLAUDE]` What Dinner Circle integration should exist?
1179. [P3] `[CLAUDE]` What staff delegation features should exist?
1180. [P3] `[CLAUDE]` What client-facing portal features should exist?
1181. [P3] `[CLAUDE]` What co-host features should exist?
1182. [P3] `[CLAUDE]` What mobile-specific features should exist?
1183. [P3] `[CLAUDE]` What offline capabilities should exist?
1184. [P3] `[CLAUDE]` What progressive enhancement features should exist?
1185. [P3] `[OPUS]` What A/B testable variants could improve this page?
1186. [P3] `[CLAUDE]` What data visualization opportunities exist? (charts, graphs, heatmaps)
1187. [P3] `[CLAUDE]` What gamification opportunities exist? (streaks, achievements, progress)
1188. [P3] `[CLAUDE]` What social proof opportunities exist? (usage stats, community)
1189. [P3] `[OPUS]` Rank all opportunities by impact/effort ratio.
1190. [P3] `[BOTH]` Which opportunities are Codex-dispatchable right now?
1191. [P3] `[CLAUDE]` Which opportunities require a spec before building?

---

## Dimension 26: DEVELOPER NOTES & AGENT BRIEFING [P3]

Technical briefing for future agents.

1192. [P3] `[CLAUDE]` One-paragraph summary: what this page does and why it exists.
1193. [P3] `[CLAUDE]` What domains must an agent understand before modifying this page?
1194. [P3] `[CODEX]` What files must an agent read before modifying this page?
1195. [P3] `[BOTH]` What files are most likely to need modification?
1196. [P3] `[BOTH]` What patterns must an agent follow when modifying this page?
1197. [P3] `[CLAUDE]` What pitfalls should an agent avoid?
1198. [P3] `[BOTH]` What test should an agent run after modification?
1199. [P3] `[CLAUDE]` What visual verification should an agent do after modification?
1200. [P3] `[CODEX]` What cache invalidation is required after modification?
1201. [P3] `[BOTH]` What other pages might break from changes to this page?
1202. [P3] `[BOTH]` What other pages should be checked after modifying this page?
1203. [P3] `[BOTH]` What domain interfaces might need updating?
1204. [P3] `[CODEX]` What types might need updating?
1205. [P3] `[BOTH]` What specs/docs might need updating?
1206. [P3] `[CODEX]` What build queue items relate to this page?
1207. [P3] `[CLAUDE]` What unresolved product decisions affect this page?
1208. [P3] `[BOTH]` What technical debt exists on this page?
1209. [P3] `[BOTH]` What refactoring opportunities exist?
1210. [P3] `[BOTH]` What performance optimization opportunities exist?
1211. [P3] `[CLAUDE]` What is the risk level of modifying this page? (low/medium/high/critical)
1212. [P3] `[CLAUDE]` What is the blast radius of a bug on this page?
1213. [P3] `[CLAUDE]` What is the rollback plan if a change breaks this page?
1214. [P3] `[CLAUDE]` What monitoring should be watched after deploying changes?
1215. [P3] `[CLAUDE]` What is the ideal order of modifications if multiple changes needed?
1216. [P3] `[OPUS]` Summary: top 3 most valuable things to build on this page next.

---

## META-QUESTIONS

Asked after all dimensions are complete.

1217. [P2] `[CLAUDE]` One-sentence summary of this page's purpose.
1218. [P2] `[CLAUDE]` Who is the primary user of this page?
1219. [P2] `[CLAUDE]` What is the primary success metric? (task completion, time, conversions)
1220. [P3] `[OPUS]` What would make this page a 10/10?
1221. [P2] `[CLAUDE]` What is this page's biggest weakness right now?
1222. [P2] `[CLAUDE]` What is the cheapest improvement with biggest impact?
1223. [P3] `[OPUS]` What is the most ambitious improvement possible?
1224. [P2] `[CLAUDE]` Does this page justify its existence? (or fold into another page)
1225. [P2] `[CLAUDE]` Rate: Void (0), Island (1), Facade (2), Functional (3), Intelligent (4), Anticipatory (5).
1226. [P3] `[OPUS]` What ChefFlow philosophy does this page best embody?
1227. [P3] `[OPUS]` What ChefFlow philosophy does this page most violate?
1228. [P3] `[OPUS]` Does this page contribute to the "God-Tier Chef OS" vision? How?
1229. [P2] `[CLAUDE]` Does this page reduce what the chef has to think about?
1230. [P2] `[CLAUDE]` Does this page make something DISAPPEAR from the chef's plate?
1231. [P2] `[CLAUDE]` What manual process does this page eliminate?
1232. [P2] `[CLAUDE]` What manual process should this page eliminate but doesn't yet?
1233. [P2] `[CLAUDE]` Is this page proactive or reactive? Should it be the other?
1234. [P3] `[OPUS]` Does this page learn from usage over time? Could it?
1235. [P2] `[CLAUDE]` What would the Failure Rubric score this page? (A-F)
1236. [P2] `[CLAUDE]` What failure type is most present? (Void, Island, Facade)
1237. [P2] `[CLAUDE]` What domain mirrors are relevant? Which score highest?
1238. [P2] `[BOTH]` Generate the TypeScript Rail Profile for this page.
1239. [P2] `[CLAUDE]` What single build would move this page up one tier?
1240. [P3] `[OPUS]` What accumulation of small improvements would transform this page?
1241. [P3] `[OPUS]` Final verdict: keep, merge, split, rebuild, or delete?

---

## QUESTION COUNT BY DIMENSION

| Dim       | Name                          | Questions | CODEX | CLAUDE | OPUS | BOTH |
| --------- | ----------------------------- | --------- | ----- | ------ | ---- | ---- |
| 0         | Page Identity + Domain Wiring | 55        | 32    | 12     | 1    | 10   |
| 1         | Content Inventory             | 55        | 37    | 11     | 0    | 7    |
| 2         | Route & File Structure        | 35        | 33    | 0      | 0    | 2    |
| 3         | User Journey (Backward)       | 35        | 13    | 12     | 4    | 6    |
| 4         | User Journey (Forward)        | 35        | 12    | 14     | 3    | 6    |
| 5         | Temporal Context              | 40        | 18    | 11     | 1    | 10   |
| 6         | Sequential Next Moves         | 30        | 15    | 9      | 0    | 6    |
| 7         | Parallel Next Moves           | 25        | 2     | 20     | 0    | 3    |
| 8         | Environmental Context         | 30        | 2     | 26     | 0    | 2    |
| 9         | Role Analysis                 | 75        | 37    | 11     | 0    | 27   |
| 10        | Entity Relationships          | 50        | 41    | 1      | 0    | 8    |
| 11        | Client Intelligence           | 181       | 88    | 0      | 80   | 13   |
| 12        | Intelligence Categories       | 45        | 13    | 14     | 1    | 17   |
| 13        | Data Flow & Performance       | 50        | 40    | 2      | 0    | 8    |
| 14        | Completion & Gaps             | 40        | 17    | 4      | 0    | 19   |
| 15        | Failure Modes                 | 45        | 35    | 0      | 0    | 10   |
| 16        | Security & Data Safety        | 50        | 35    | 2      | 0    | 13   |
| 17        | Accessibility                 | 30        | 26    | 0      | 0    | 4    |
| 18        | Domain Interface Compliance   | 35        | 27    | 2      | 0    | 6    |
| 19        | Competitive Positioning       | 25        | 0     | 18     | 7    | 0    |
| 20        | Monetization & Business       | 25        | 1     | 17     | 3    | 4    |
| 21        | Emotional & Professional      | 35        | 3     | 22     | 6    | 4    |
| 22        | Cross-Page Cohesion           | 40        | 22    | 7      | 0    | 11   |
| 23        | Rail Profile Design           | 45        | 6     | 21     | 0    | 18   |
| 24        | Testing & Verification        | 40        | 28    | 6      | 0    | 6    |
| 25        | Build Opportunity Mining      | 40        | 0     | 33     | 3    | 4    |
| 26        | Developer Notes               | 25        | 4     | 11     | 1    | 9    |
| Meta      | Meta-Questions                | 25        | 0     | 14     | 8    | 3    |
| **TOTAL** |                               | **1261**  |       |        |      |      |

---

## QUESTION COUNT BY MODEL TIER

| Tier       | Approx Count | Cost Profile | Use                              |
| ---------- | ------------ | ------------ | -------------------------------- |
| `[CODEX]`  | ~530         | Cheap        | Mechanical code analysis         |
| `[CLAUDE]` | ~340         | Standard     | Product judgment, UX, gaps       |
| `[OPUS]`   | ~120         | Expensive    | Deep synthesis, strategy, vision |
| `[BOTH]`   | ~270         | Mixed        | Mechanical + judgment overlay    |

---

## SCAN MODE QUESTION MAPPING

| Mode          | Dimensions              | Approx Questions |
| ------------- | ----------------------- | ---------------- |
| Full          | All 27 + Meta           | 1261             |
| Rail-only     | 0, 11, 12, 23           | ~326             |
| Security-only | 0, 9, 11, 16            | ~361             |
| Domain-only   | 0, 2, 18, 22            | ~165             |
| Codex-only    | All (CODEX tagged only) | ~530             |
| Delta         | Open findings only      | Varies           |
