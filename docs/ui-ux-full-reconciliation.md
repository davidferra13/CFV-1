# UI/UX Full Reconciliation: Interrogation Answers + Verdicts

> Generated 2026-04-17 | Session: UUPM audit + 4-repo evaluation
> Methodology: Adversarial interrogation forcing total cohesion

---

## DOMAIN 1: Design System Integration (UUPM + ChefFlow)

### Q1. Which product type governs ChefFlow?

**Answer: None of them singularly. ChefFlow is a multi-category product.**

ChefFlow spans: Restaurant/Food Service (#34), SaaS (#1), CRM (#101), Invoice/Billing (#105), Booking/Appointment (#104), Financial Dashboard (#6). UUPM's generator assumes one product type per project. This is a limitation of the tool, not ChefFlow.

**Resolution:** Use UUPM as a reference library (search individual domains for specific pages), not as a holistic generator. The dashboard pages should query "financial dashboard," the booking pages should query "booking appointment," the recipe pages should query "recipe cooking app." Never apply one global recommendation.

**Status: RESOLVED. UUPM is a lookup tool, not an authority.**

---

### Q2. Should UUPM's MASTER.md be persisted and authoritative?

**Answer: No. Reference-only.**

ChefFlow's design authority is `docs/specs/universal-interface-philosophy.md` (governance), `app/globals.css` (tokens), `tailwind.config.ts` (scale), and `lib/themes/color-palettes.ts` (palettes). These are battle-tested over 6+ months.

UUPM's MASTER.md would be a third-party recommendation file. If persisted, it must live at `docs/reference/uupm-design-reference.md` (not `design-system/` which implies authority). It is never authoritative over existing files.

**Status: RESOLVED. Do not persist. The audit report at `docs/ui-ux-audit-report.md` captures all useful findings.**

---

### Q3. Are UUPM page-overrides useful at ChefFlow's scale?

**Answer: No. They create maintenance debt.**

ChefFlow has 100+ routes across 4 portals. Maintaining individual `design-system/pages/*.md` files for each would be 100+ files that drift from reality the moment any code changes. The anti-clutter rule applies to tooling files too.

ChefFlow already has contextual rendering rules in the interface philosophy (Section 3: context from location, state, temporal mode). This is more sophisticated than static page-override files.

**Status: RESOLVED. Do not use page-overrides. Skip.**

---

## DOMAIN 2: Raw Element Violations

### Q4. Heuristic for distinguishing violation from legitimate raw elements?

**Answer: Automatable rule.**

**LEGITIMATE raw `<button>`:**

- Inside `components/ui/` (the design system itself)
- Error boundary files (`error.tsx`) - these use minimal React, no imports
- Radix primitives that render as `<button>` internally
- File upload triggers (`<button>` wrapping hidden `<input type="file">`)
- Third-party component internals

**VIOLATION raw `<button>`:**

- Any file in `app/` or `components/` (outside `components/ui/`) where `<button` has `className=` with Tailwind classes like `bg-`, `rounded-`, `px-`, `py-`, `text-`
- This means someone styled a raw button instead of using `<Button>`

**Automatable grep:**

```bash
# Find violations: raw buttons with inline Tailwind styling outside UI components
grep -rn '<button' --include='*.tsx' app/ components/ \
  | grep -v 'components/ui/' \
  | grep -v 'error.tsx' \
  | grep 'className.*\(bg-\|rounded-\|px-\|py-\)'
```

Same logic applies to `<input` and `<select` - if they have Tailwind styling outside `components/ui/`, they're violations.

**Status: RESOLVED. Rule is automatable. Add to compliance-scan.sh when ready.**

---

### Q5. Does raw element migration violate the anti-clutter rule?

**Answer: No. Infrastructure maintenance is exempt.**

The anti-clutter rule says "no new features without validated user feedback." Migrating raw elements to design system components is not a new feature. It's consistency maintenance. Same category as fixing typos or updating dependencies.

However, the migration should be incremental (page-by-page when touching files for other reasons), not a single massive PR that touches 200 files.

**Status: RESOLVED. Migrate opportunistically, not as a dedicated sweep.**

---

### Q6. What breaks when migrating raw `<select>` to `<Select>`?

**Answer: Multiple things. Proceed with caution.**

- **DOM structure changes:** Native `<select>` renders as a single element. Radix `<Select>` renders trigger + portal + content. Playwright selectors targeting `select` elements will break.
- **Mobile behavior:** Native `<select>` opens the OS picker (iOS wheel, Android dropdown). Radix `<Select>` renders a custom dropdown that is worse on mobile.
- **Form autofill:** Browsers autofill native `<select>` elements. Custom selects do not receive autofill.
- **Keyboard behavior:** Native `<select>` allows type-ahead. Radix `<Select>` may or may not.
- **Form data:** If using native form submission (not React state), custom selects need hidden inputs.

**Resolution:** Do NOT blindly migrate all `<select>` elements. Only migrate selects that are visible in the main UI and currently look unstyled. Forms that work correctly with native selects should keep them. Add a CSS rule to style native selects consistently:

```css
select {
  /* Match Input component styling */
  background: rgb(var(--stone-900));
  border: 1px solid rgb(var(--stone-600));
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  color: rgb(var(--stone-200));
}
```

This gives visual consistency without breaking behavior.

**Status: RESOLVED. Style native selects via CSS, don't replace them.**

---

## DOMAIN 3: Accessibility Gaps

### Q7. Correct scope for prefers-reduced-motion?

**Answer: All non-essential animations must be disabled.**

**Essential (keep even with reduced-motion):**

- Route progress bar (user feedback, no alternative)
- Loading spinners/skeletons (already disabled, correct)
- Focus ring appearance (not animated, n/a)

**Non-essential (must disable):**

- `card-enter` stagger animation
- `slide-up-fade`, `fade-slide-up` entrance animations
- `dialog-enter`, `dialog-backdrop` animations
- `scale-in`, `slide-down` animations
- `attention-pulse`
- `success-draw`, `success-circle`, `success-flash`
- All Tailwind keyframes: `scale-in`, `shimmer`, `fade-in`, `slide-down`, `slide-up-out`

**Fix:** Expand the existing `@media (prefers-reduced-motion: reduce)` block in globals.css:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

This is the nuclear option but it's correct per WCAG 2.1 SC 2.3.3.

**Status: RESOLVED. One CSS block fixes everything.**

---

### Q8. Does brand-500 focus ring maintain contrast across all 8 palettes?

**Answer: Calculated manually.**

Focus ring is `outline: 3px solid rgb(var(--brand-500))` on dark mode surface-0 (`rgb(12, 10, 9)` - near black).

| Palette   | brand-500 RGB | Hex Approx | Luminance vs #0C0A09 | Passes 3:1? |
| --------- | ------------- | ---------- | -------------------- | ----------- |
| Copper    | 237,168,107   | #EDA86B    | High contrast        | YES         |
| Plum      | 167,139,250   | #A78BFA    | High contrast        | YES         |
| Indigo    | 59,130,246    | #3B82F6    | Moderate             | YES         |
| Sage      | 34,197,94     | #22C55E    | Good contrast        | YES         |
| Paprika   | 239,68,68     | #EF4444    | Good contrast        | YES         |
| Verdigris | 20,184,166    | #14B8A6    | Good contrast        | YES         |
| Rose      | 244,63,94     | #F43F5E    | Good contrast        | YES         |
| Saffron   | 245,158,11    | #F59E0B    | High contrast        | YES         |

All 8 palettes pass. The near-black surface-0 in dark mode provides sufficient contrast against any brand-500 value. Focus ring is safe.

**Light mode check:** Surface-0 in light mode is `rgb(255, 252, 247)` (near-white). brand-500 values like Saffron (#F59E0B - yellow) on near-white may FAIL contrast.

**Risk:** Saffron palette focus ring in light mode. Yellow-on-white is a known accessibility failure.

**Status: PARTIALLY RESOLVED. Dark mode is safe. Light mode needs a Saffron palette exception (darken focus ring to brand-600 in light mode).**

---

### Q9. Has anyone used light mode?

**Answer: Almost certainly not in production.**

Evidence:

- `defaultTheme="dark"` with `enableSystem={false}` - dark is forced default
- The developer uses dark mode (ADHD, visual learner, prefers dark interfaces)
- No bug reports about light mode in any session digest
- The inverted stone scale is clever engineering but adds edge-case risk
- Theme toggle exists but is buried in settings

**Resolution:** Light mode is a theoretical feature. Don't delete it, but don't spend tokens auditing it deeply. If/when a user reports a light mode issue, fix it then. The Saffron focus ring issue (Q8) should get a one-line fix proactively since it's trivial.

**Status: RESOLVED. Light mode is low-priority. One proactive fix for Saffron focus ring.**

---

## DOMAIN 4: The Downloaded Repos

### Q10. Superpowers: additive or redundant?

**Answer: Redundant with two cherry-pick ideas.**

Agent completed full analysis. Superpowers provides 14 skills. ChefFlow has 25+ that cover the same ground with domain-specific knowledge.

**Cherry-pick:**

1. **Two-stage subagent review pattern** (spec compliance then code quality) - fold into `/builder` skill
2. **Anti-sycophancy protocol for receiving code review** - new skill idea

**Conflicts if installed wholesale:**

- Writes to `docs/superpowers/` (pollutes doc structure)
- Forces itself as first skill loaded (fights CLAUDE.md session protocol)
- No Sonnet ban awareness (would violate model tiering)
- "Human partner" tone clashes with caveman mode

**Verdict: DO NOT INSTALL. Cherry-pick 2 ideas manually. Delete clone when done reviewing.**

**Status: RESOLVED.**

---

### Q11. Claude Mem: conflict with existing memory?

**Answer: Yes, significant overlap and conflict risk.**

Claude Mem does:

- Auto-captures session activity into SQLite + ChromaDB
- Compresses with AI (Claude Agent SDK)
- Injects relevant context into future sessions
- Knowledge graph relationships between memories

ChefFlow already has:

- MEMORY.md + 50 memory files (manual curation, high signal)
- MemPalace MCP (535 conversations indexed, semantic search)
- Session digests (structured close-out reports)
- Session briefing/close scripts

**Conflicts:**

- Both write to `.claude/` directory - potential file collision
- Auto-capture is noisy; ChefFlow's manual curation is deliberate
- Claude Mem uses Agent SDK for compression - burns tokens automatically
- AGPL license - viral copyleft, problematic for commercial project

**Unique capability Claude Mem has:** Automatic session capture (ChefFlow's is manual). But this was already identified as a design choice - manual curation produces higher signal memories.

**Verdict: DO NOT INSTALL. MemPalace + manual memory system is more sophisticated for this project. Delete clone.**

**Status: RESOLVED.**

---

### Q12. Awesome Claude Code: has it been read?

**Answer: Yes, agent extracted 9 actionable tools.**

**Worth investigating:**

1. **agnix** (`agent-sh/agnix`) - Linter for CLAUDE.md, skills, hooks, MCP configs. With 25+ skills, automated config validation has value.
2. **ccxray** (`lis186/ccxray`) - Token/cost tracking proxy. Useful given the Max plan budget awareness.
3. **claude-rules-doctor** (`nulone/claude-rules-doctor`) - Detects dead glob patterns in `.claude/rules/`. Prevents silent rule failures.

**Not worth it (already covered or low value):**

- Trail of Bits security skills (covered by existing compliance scan)
- TDD Guard hooks (covered by `/tdd` skill)
- TypeScript quality hooks (covered by build-guard.sh)
- cc-devops-skills (ChefFlow is self-hosted, no IaC needed)
- Container Use (overkill for current setup)
- Session Restore (covered by MemPalace + session digests)

**Verdict: Keep the clone as a reference list. Investigate agnix and ccxray in a future session. Delete nothing yet.**

**Status: RESOLVED.**

---

### Q13. Should UUPM be installed as a `.claude/skills/` skill?

**Answer: No.**

Installing UUPM as a skill means it injects design recommendations into every UI conversation. ChefFlow's design system is already stronger than UUPM's generic output. The skill would:

- Recommend Inter over DM Sans (downgrade)
- Recommend generic color palettes over the 8-palette system (downgrade)
- Add context window overhead on every UI task
- Potentially conflict with interface philosophy rules

UUPM's value is as a **lookup tool** (the Python search engine), not as a persistent skill. Keep the clone at `~/Documents/ui-ux-pro-max-skill/` and query it manually when exploring new page designs.

**Verdict: DO NOT INSTALL as skill. Keep as external reference tool.**

**Status: RESOLVED.**

---

## DOMAIN 5: Workflow Integration

### Q14. Should raw-element detection be added to compliance-scan.sh?

**Answer: Yes, but with a ceiling, not zero tolerance.**

Zero-tolerance on raw elements would flag 300+ files and make the scan useless. Instead:

```bash
# Count raw styled buttons outside UI components
RAW_BUTTONS=$(grep -rn '<button' --include='*.tsx' app/ components/ \
  | grep -v 'components/ui/' | grep -v 'error.tsx' \
  | grep -c 'className.*bg-')
echo "Raw styled buttons: $RAW_BUTTONS (ceiling: 50)"
```

Start with a count, set a ceiling, and ratchet down over time. Current baseline is ~100+. Set ceiling at 80, reduce by 10 per month.

**Status: RESOLVED. Add to compliance-scan.sh with ratcheting ceiling.**

---

### Q15. Should UUPM pre-delivery checklist merge into definition-of-done?

**Answer: Partially. Three items are additive.**

Already in definition-of-done:

- Five states (empty, loading, loaded, error, partial) - Section 7
- Primary button limit - Section 5
- Cognitive load constraints - Section 6

**Additive from UUPM (not currently in definition-of-done):**

1. `cursor-pointer` on all clickable elements
2. `prefers-reduced-motion` respected
3. Responsive verification at 375/768/1024/1440px

These three should be added to definition-of-done under "Interface Philosophy Compliance." Don't add the full UUPM checklist (it would be redundant).

**Status: RESOLVED. Add 3 items to definition-of-done.**

---

### Q16. Is the `--font-inter` rename worth the diff noise?

**Answer: No. Document it instead.**

The variable is referenced in `tailwind.config.ts` (1 place) and `app/layout.tsx` (1 place). Renaming it touches these 2 files plus potentially any CSS that references `var(--font-inter)` directly.

The rename is cosmetically correct but functionally irrelevant. A comment explains it:

```ts
// Legacy variable name. Actual font is DM Sans, not Inter.
const dmSans = DM_Sans({ ... variable: '--font-inter' })
```

**Status: RESOLVED. Add comment, don't rename.**

---

## DOMAIN 6: Financial Display Quality

### Q17. Which financial surfaces are missing tabular-nums?

**Answer: Requires per-page verification, but the fix is systemic.**

Create a single CSS utility:

```css
.financial-figure,
.tabular-nums {
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
}
```

Then apply it to these component classes that already exist:

- `.metric-display` and `.metric-display-sm` (globals.css)
- StatCard component (already uses tabular-nums - confirmed)
- AnimatedCounter component

The per-page surfaces to check:

- Quote form line items
- Invoice views
- Ledger/transaction lists
- P&L report columns
- Expense lists
- Food cost panels
- Payment history
- Dashboard KPI tiles (StatCard already covered)

**Status: PARTIALLY RESOLVED. CSS utility exists conceptually. Needs application to metric-display classes and verification on financial pages.**

---

### Q18. Should JetBrains Mono be added for financial figures?

**Answer: No. Use tabular-nums on DM Sans instead.**

Adding a third font family increases page weight (~50-100KB for JetBrains Mono). DM Sans supports `font-variant-numeric: tabular-nums` which gives fixed-width numerals without loading another font. This achieves the same visual alignment goal at zero cost.

**Status: RESOLVED. Use tabular-nums, not a new font.**

---

## DOMAIN 7: Ownership + Authority

### Q19. Do UUPM recommendations conflict with the interface philosophy?

**Answer: No material conflicts. One alignment gap.**

Checked universal-interface-philosophy.md against UUPM output:

- UUPM "one primary CTA per page" matches philosophy Section 5 (one primary action per screen)
- UUPM "max 7 items" matches philosophy Section 6 (Miller's Law)
- UUPM "skeleton screens" matches philosophy Section 7 (loading states)
- UUPM "no emojis as icons" is not in the philosophy but is in CLAUDE.md

**Alignment gap:** UUPM's "pre-delivery checklist" is a per-change verification. The interface philosophy is a design-time governance document. They operate at different phases. The philosophy prevents bad design. The checklist catches bad implementation. Both are needed; neither conflicts.

**Status: RESOLVED. No conflicts.**

---

### Q20. Are trust & authority signals a design task or product task?

**Answer: Product task. Needs a spec.**

"Display years of experience, client count, testimonials on public chef profile" is a feature decision, not a styling decision. It requires:

- Data model: where is "years of experience" stored? Does it exist in the DB?
- Business logic: how is "client count" calculated (all clients? active only?)
- Privacy: can the chef control what's shown?
- Content: testimonial source (manual entry? imported reviews?)

This is a product spec, not a CSS change. If pursued, it should go through the planner gate and get a spec in `docs/specs/`.

**Status: RESOLVED. Not a design task. Park it unless the developer prioritizes it.**

---

## FINAL STATUS MATRIX

| Surface                         | Validated                                                 | Ruled Out                                | Unverified                              |
| ------------------------------- | --------------------------------------------------------- | ---------------------------------------- | --------------------------------------- |
| UUPM as authority               | -                                                         | Ruled out (reference only)               | -                                       |
| UUPM page-overrides             | -                                                         | Ruled out (anti-clutter)                 | -                                       |
| UUPM as installed skill         | -                                                         | Ruled out (would downgrade)              | -                                       |
| UUPM search engine as reference | Validated                                                 | -                                        | -                                       |
| Superpowers repo                | -                                                         | Ruled out (install). Cherry-pick 2 ideas | -                                       |
| Claude Mem repo                 | -                                                         | Ruled out (conflict + AGPL)              | -                                       |
| Awesome Claude Code repo        | Validated (reference list)                                | -                                        | agnix, ccxray worth testing             |
| Focus rings (dark mode)         | Validated (all 8 palettes pass)                           | -                                        | -                                       |
| Focus rings (light mode)        | -                                                         | -                                        | Saffron palette risk                    |
| prefers-reduced-motion          | -                                                         | -                                        | Fix identified, not applied             |
| tabular-nums                    | -                                                         | -                                        | CSS utility needed, application pending |
| Raw button violations           | -                                                         | -                                        | Heuristic built, not applied to scan    |
| Raw select migration            | -                                                         | Ruled out (style native instead)         | -                                       |
| Raw input violations            | -                                                         | -                                        | Same heuristic as buttons               |
| Light mode overall              | -                                                         | Ruled out (low priority)                 | -                                       |
| Portal consistency (chef)       | Validated (primary design system)                         | -                                        | -                                       |
| Portal consistency (client)     | Validated (uses same base: `bg-stone-900 text-stone-100`) | -                                        | Different nav components                |
| Portal consistency (admin)      | Validated (reuses chef shell)                             | -                                        | -                                       |
| Portal consistency (public)     | Validated (different intentionally: light brand gradient) | -                                        | -                                       |
| Interface philosophy conflicts  | Validated (no conflicts with UUPM)                        | -                                        | -                                       |
| Definition of done updates      | -                                                         | -                                        | 3 items to add                          |
| Compliance scan updates         | -                                                         | -                                        | Raw element counting to add             |
| Trust signals on public pages   | -                                                         | -                                        | Product task, needs spec if prioritized |
| `--font-inter` rename           | -                                                         | Ruled out (comment instead)              | -                                       |
| JetBrains Mono addition         | -                                                         | Ruled out (use tabular-nums)             | -                                       |

---

## IMMEDIATE ACTIONS (Can execute now, <5 min each)

1. **Fix prefers-reduced-motion** - one CSS block in globals.css
2. **Add tabular-nums to metric-display classes** - 2 lines in globals.css
3. **Add comment to --font-inter** - 1 line in layout.tsx
4. **Add 3 items to definition-of-done** - 3 lines in docs/definition-of-done.md

## DEFERRED ACTIONS (Future sessions)

5. Raw element ratcheting in compliance-scan.sh
6. Style native `<select>` elements via CSS
7. Saffron palette focus ring fix for light mode
8. Investigate agnix and ccxray from awesome-claude-code
9. Cherry-pick Superpowers' two-stage review and anti-sycophancy ideas into skills
10. Trust/authority signals spec (if developer prioritizes)

## CLOSED (No action needed)

- UUPM installation (ruled out)
- Claude Mem installation (ruled out)
- Superpowers installation (ruled out)
- Page-override architecture (ruled out)
- MASTER.md persistence (ruled out)
- JetBrains Mono (ruled out)
- `--font-inter` rename (ruled out)
- Light mode deep audit (ruled out)
