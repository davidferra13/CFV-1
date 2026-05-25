# Mid-Cook Reference System

> **Status:** SPEC-READY
> **Exit Scenario:** #94 (reclassified: Permanent Exit -> Reducible via Print + Voice)
> **Source:** Developer stress-test evaluation, 2026-05-25
> **Principle:** Paper is the chef's interface during service. Digital is for planning. Voice bridges the gap.

---

## Problem

Chef's hands are dirty mid-cook and needs to confirm a ratio, temperature, or step. The tech instinct is "build a better phone UI." The chef instinct (from a 10+ year working chef) is: "You shouldn't be touching your phone. Print it out."

## The Real Chef Workflow (Respect It)

Chefs print prep lists, recipes, and menus. They work off paper during active cooking. This is the correct workflow because:

1. Paper is bigger than a phone. Easier to read at arm's length.
2. Paper can get messy. Coffee stains, puree splatters, chocolate dust. That's character.
3. No screen lock, no battery, no squinting.
4. Dual-pamphlet system: one working copy (gets destroyed), one clean master.
5. When done: retire the messy copy, transfer any notes to the clean master.

**ChefFlow's job is NOT to replace paper. It's to make printing perfect and encourage this workflow.**

## Design

### 1. Print System (PRIMARY solution)

Every printable surface in ChefFlow produces a clean, chef-optimized PDF:

**What's printable:**

- Individual recipes (with scaling applied)
- Prep lists (full or by-day)
- Shopping lists
- Menu overviews
- Event briefs (venue access + timeline + weather)
- Day-of runsheets

**Print customization:**

- With photos / without photos (ink savings)
- Color / black-and-white
- Font size: normal / large (arm's-length readable)
- Include notes field (blank space for handwritten additions)
- Compact (dense, multi-recipe per page) vs. spacious (one recipe per page, big text)

**Dual-pamphlet encouragement:**

- "Print 2 copies" button with explanation: "One to work with, one to keep clean"
- After event completion: prompt to digitize any handwritten notes from the working copy
- Recipe annotation feature: "Anything to add from today's cook?" captures learnings back into digital

### 2. Voice / Remy + Progressive UI (DIGITAL COMPANION)

Not a fallback. Works WITH the phone UI. They compound each other.

**The compounding principle:** Chef checks off step 4 on screen -> Remy now KNOWS they're on step 5. "Next step" requires zero context. Better UI state = smarter voice. Better voice = less phone touching. They're one system, not two alternatives.

**How it works:**

- Remy button on recipe/prep view (always accessible)
- Voice command: "Hey Remy, read step 5" or "What temp for the chicken?"
- Remy reads the step out loud (text-to-speech)
- Screen auto-scrolls to that step simultaneously (visual + audio)
- Smart context: chef's checked-off progress tells Remy exactly where they are. No need to specify step numbers if working sequentially.

**Step tracking UI:**

- Each recipe step has a checkbox. Tap to mark done.
- Current step highlighted (large, bold). Completed steps dimmed.
- Remy reads from current step by default. "Next" advances both voice AND checkbox.
- Chef can check off via voice ("done") or tap. Either input updates both systems.

**Voice interaction patterns:**

- "Read step [number]"
- "What's the ratio for [component]?"
- "How long for [item]?"
- "Next step" / "Previous step" / "Done"
- "Read the whole recipe" (reads all steps sequentially)
- "Set a timer for [duration]" (see Timers below)
- "What should I be doing right now?" (see Multi-Recipe Coordination below)
- "I'm out of [ingredient]" (triggers substitution from existing data)
- "How many grams in [measurement]?" (inline unit conversion, no Google exit)

**What Remy does NOT do here:**

- Improvise or suggest alternatives (chef is mid-cook, not planning)
- Ask clarifying questions (just answer, the chef's hands are full)
- Require wake words or complex commands

### 3. Cooking Mode (FOCUS STATE)

When chef enters a recipe for active cooking, a dedicated screen state:

- **Screen stays awake.** No auto-lock. No dimming. Non-negotiable.
- **Big text.** Current step fills the screen. Arm's-length readable.
- **Minimal UI.** Step text, checkbox, timer (if active), Remy button. Nothing else.
- **High contrast.** Works in bright kitchen lighting and dim evening prep.
- **One-thumb navigation.** Swipe or tap to advance steps. Designed for a single clean knuckle if needed.

Cooking Mode is the phone equivalent of propping a printed recipe on the counter. Glanceable, not interactive.

### 4. Timers Tied to Steps

When a step says "simmer for 20 minutes" or "brine overnight":

- Remy auto-detects duration in step text.
- Offers: "Start 20-minute timer?" (one tap or "yes")
- Timer runs in status bar / notification. Visible even if phone locked.
- Timer completion triggers: audible alert + "Step 3 timer done. Ready for step 4?"
- Multiple concurrent timers: braise (45 min), bread (60 min), custard (12 min). Each labeled by dish/step.
- Timer state feeds back into step tracking. Timer done = step auto-prompts completion.

**Compounding:** Timer + step checkbox + Remy = three systems sharing state. Timer finishes -> Remy announces -> UI advances -> chef says "done" -> next step loads. One loop.

### 5. Multi-Recipe Coordination (The Event Conductor)

A chef cooking a 5-course dinner is not working one recipe. They're juggling all of them simultaneously. Braising protein while prepping salad while monitoring dessert in the oven.

**Unified cook view:**

- All recipes for today's event shown as parallel swim lanes.
- Each lane: recipe name + current step + active timer (if any).
- Color-coded by status: active (cooking now), waiting (timer running), next up, done.
- Remy knows the full picture. "What should I be doing right now?" gets an intelligent answer: "Protein braise has 20 minutes left. Start the vinaigrette now, you need it tempered before plating."

**The magic question: "What should I be doing right now?"**

- Remy evaluates: all active timers, all unchecked steps, all time-sensitive items, event service time.
- Returns the highest-priority action. Not a list. ONE thing.
- This is the killer feature. No other recipe app does this across multiple dishes.

### 6. Mise en Place Checklist (Pre-Cook Gate)

Before cooking mode starts, show:

- All ingredients needed across all recipes for the event.
- Checkbox per ingredient. "Do you have everything?"
- Missing items flagged: "No shallots. Substitute: yellow onion (milder, use 1.5x)." (Pulls from existing substitutions.json)
- This catches "oh shit I forgot to buy X" BEFORE cooking starts, not mid-sear.

### 7. Mid-Cook Quick Answers (No Exit)

Voice commands that eliminate specific Google exits during cooking:

| Chef says                            | Remy answers                            | Exit eliminated      |
| ------------------------------------ | --------------------------------------- | -------------------- |
| "How many grams in 3/4 cup flour?"   | "90 grams."                             | #75 Unit conversion  |
| "What's safe hold temp for chicken?" | "165F internal, hold above 140F."       | #23 Food safety      |
| "I'm out of shallots"                | "Use yellow onion, 1.5x the amount."    | #24 Substitutions    |
| "How long to temper chocolate?"      | (Knowledge from recipe notes/reference) | #19 Technique lookup |

Every answer is instant, spoken aloud. No searching, no typing, no leaving the app.

### 8. Printed QR Bridge (Paper <-> Digital)

The printed PDF includes a small QR code per recipe that:

- Opens the recipe on the chef's phone at the exact step view.
- If chef has been working on paper and needs to switch to digital mid-cook, one scan gets them there.
- Also works in reverse: chef working digitally, needs to print mid-session. "Print from here" generates PDF starting at current step.

Paper and digital are not separate workflows. They're two views of the same state with a bridge between them.

### 9. Post-Cook Intelligence Capture (EXPANDED)

After all steps checked off (or event marked complete):

1. "How did it go?" prompt. Voice or text.
2. Structured capture: timing adjustments, scaling notes, substitutions that worked/failed, temperature tweaks.
3. Photo prompt: "Snap the final plate?" One photo, stored on recipe.
4. Rating: chef rates their own execution (1-5). Private. Tracks improvement over time.
5. Anomaly capture: "Anything unexpected?" Free-text for edge cases ("oven ran 25 degrees hot at this venue").
6. All captured data feeds back into the recipe. Next print is the improved version.
7. Over time: recipe evolves from draft to battle-tested. Each cook makes it better.

### 10. What We Do NOT Build

- Gesture-based controls (gimmicky)
- "Hands-free mode" with camera-based page turning (over-engineered)
- Smart watch integration (too small to read)
- Camera-based ingredient recognition
- AR overlays on food

The "messy hands on phone" scenario is still bad practice. But when the chef IS at their phone (clean hands, between steps, checking progress), Cooking Mode should be dead simple: big text, checkboxes, current step obvious. That UI state feeds Remy. They're one loop.

## The Retirement Workflow (Pamphlet Lifecycle)

1. Chef prints 2 copies before prep day
2. Working copy gets used, marked up, stained during active cooking
3. Clean master stays untouched
4. After event: chef reviews working copy for learnings
5. ChefFlow prompts: "Anything to capture from today's cook?"
6. Chef dictates or types notes (scaling adjustments, timing changes, substitutions that worked)
7. Digital recipe updated with learnings
8. Next time: print reflects the improved version
9. Paper copies recycled. Knowledge lives in ChefFlow forever.

## Integration with other systems

- **Recipe scaling (#74):** Scale BEFORE printing. PDF reflects the scaled version. Cooking Mode shows scaled quantities.
- **Unit conversion (#75):** Show both units on printed version if chef prefers. Remy answers conversions mid-cook by voice.
- **Food safety (#23):** Safe temps printed inline on recipe near proteins. Remy answers "what temp?" questions instantly.
- **Substitutions (#24):** "I'm out of X" triggers substitution lookup from existing data. Works voice and on-screen.
- **Weather (#58):** Day-of runsheet includes weather summary. Cooking Mode shows outdoor event alerts (wind, rain timing).
- **Venue access (#90):** Day-of runsheet includes parking/access at top. Printed in event brief.
- **Nearby stores (#45):** Mise en place checklist flags missing items + nearest store to venue for emergency runs.
- **Dinner Circles:** Client sees "Chef is cooking your dinner" status. Timer completions and step progress feed into event lifecycle (future: "Your chef has started plating" notification to client).

## How systems compound (the full loop)

```
Print prep pack (paper) -> Chef works from paper during active cook
    |
    v
Need digital? -> QR code on paper -> opens Cooking Mode at current step
    |
    v
Cooking Mode (phone) -> Big text, step checkboxes, timers, Remy button
    |                         |                         |
    v                         v                         v
Chef taps "done"     Timer finishes           Chef says "next step"
    |                         |                         |
    +----------> ALL UPDATE SAME STATE <----------------+
                              |
                              v
              Remy knows exactly where chef is
                              |
                              v
          "What should I be doing?" -> ONE intelligent answer
                              |
                              v
                    Event complete
                              |
                              v
              "How did it go?" -> Capture learnings
                              |
                              v
                Recipe improves for next time
                              |
                              v
                Next print is the better version
```

## Chef-facing language

- "Print your prep pack" not "Generate PDF document"
- "Working copy" and "clean copy" not "draft" and "master"
- "Capture learnings" not "Digitize annotations"
- "Read it to me" not "Activate voice assistant mode"
- "Cooking Mode" not "Hands-free recipe view"
- "What should I do next?" not "Multi-recipe priority queue"
- "Do I have everything?" not "Mise en place validation"

## Done when

**Print:**

1. Any recipe/prep list/menu prints as a clean, arm's-length readable PDF
2. Print customization (photos, font size, density, notes field) works
3. "Print 2 copies" encouraged with explanation
4. QR code on printed PDF opens recipe at correct step on phone

**Cooking Mode:** 5. Dedicated focus screen: big text, no distractions, screen stays awake 6. Step checkboxes: tap or voice to advance 7. Current step highlighted, completed steps dimmed

**Remy voice:** 8. Remy reads any step out loud on command 9. Screen auto-scrolls when Remy reads 10. "Done" / "Next" via voice advances step state 11. Mid-cook answers: unit conversion, food safety, substitutions, all by voice

**Timers:** 12. Auto-detected from step text ("simmer 20 minutes") 13. Multiple concurrent timers, labeled by dish/step 14. Timer completion triggers Remy announcement + step advance prompt

**Multi-recipe:** 15. Unified cook view showing all event recipes as parallel lanes 16. "What should I be doing right now?" returns ONE prioritized action

**Mise en place:** 17. Pre-cook ingredient checklist across all event recipes 18. Missing items flagged with substitution suggestions

**Post-cook:** 19. "How did it go?" structured capture prompt after event 20. Timing, scaling, substitution, and anomaly notes saved to recipe 21. Chef self-rating (private, tracks improvement) 22. Next print reflects all captured learnings

**The test:** Chef cooks a 5-course dinner using only ChefFlow (paper + phone + voice). At no point do they open Google, a calculator, a timer app, or another recipe app. Everything they need is in the loop.
