# Codex Build Spec: Inbox Server Drift Preview

> **Scope:** One file (`devtools/persona-inbox-server.mjs`). Add drift detection to the preview endpoint and display drift warnings in the web UI.
> **Risk:** LOW. Adds import + calls to existing validated function. UI-only changes in embedded HTML.

---

## Problem

When a user pastes a persona into the inbox web UI (port 3977), the preview shows name, type, char count, and warnings. But it does NOT show whether the persona is massively drifted from ChefFlow's domain. Users can import garbage without knowing.

Fix: run `validatePersonaContent()` on each preview entry and display drift info.

---

## What to Change

### File: `devtools/persona-inbox-server.mjs`

### Change 1: Add import for validator (top of file, after existing imports)

Find the existing imports at the top of the file (lines 1-11). Add this import after them:

```js
import { validatePersonaContent } from './persona-validator.mjs'
```

### Change 2: Update `previewEntries()` function (around line 126-143)

**Current function:**

```js
function previewEntries(text, defaultType) {
  return splitBulk(text, defaultType).map((entry, index) => {
    const type = inferType(entry.type, defaultType)
    const name = inferName(entry.content, entry.name)
    const warnings = []
    if (entry.content.trim().length < 50)
      warnings.push('Under 50 characters; pipeline will skip very thin entries.')
    if (name === 'Persona') warnings.push('Name was not detected.')
    return {
      index,
      type,
      name,
      content: entry.content.trim(),
      chars: entry.content.trim().length,
      warnings,
      excerpt: entry.content.trim().replace(/\s+/g, ' ').slice(0, 180),
    }
  })
}
```

**Replace with:**

```js
function previewEntries(text, defaultType) {
  return splitBulk(text, defaultType).map((entry, index) => {
    const type = inferType(entry.type, defaultType)
    const name = inferName(entry.content, entry.name)
    const trimmed = entry.content.trim()
    const warnings = []
    if (trimmed.length < 50)
      warnings.push('Under 50 characters; pipeline will skip very thin entries.')
    if (name === 'Persona') warnings.push('Name was not detected.')

    // Run validation for drift detection
    let driftRatio = 0
    let driftCategories = []
    let validationScore = 0
    let isHardDrift = false
    if (trimmed.length >= 50) {
      const validation = validatePersonaContent(trimmed, { name, type })
      driftRatio = validation.drift_ratio || 0
      driftCategories = validation.drift_categories || []
      isHardDrift = validation.is_hard_drift || false
      validationScore = validation.score || 0
      if (isHardDrift) {
        warnings.push(
          `PRODUCT DRIFT: ${Math.round(driftRatio * 100)}% off-domain (${driftCategories.join(', ')}). Will be rejected by pipeline.`
        )
      } else if (driftRatio > 0.4) {
        warnings.push(
          `Drift warning: ${Math.round(driftRatio * 100)}% off-domain (${driftCategories.join(', ')}). Needs rewrite.`
        )
      }
    }

    return {
      index,
      type,
      name,
      content: trimmed,
      chars: trimmed.length,
      warnings,
      excerpt: trimmed.replace(/\s+/g, ' ').slice(0, 180),
      driftRatio,
      driftCategories,
      isHardDrift,
      validationScore,
    }
  })
}
```

### Change 3: Update the preview rendering in the embedded HTML/JS

Find the `renderPreview()` function in the embedded JavaScript (inside the HTML string). It is around line 751-758. Look for the line that builds the preview item HTML, which looks approximately like:

```js
return '<div class="preview-item" data-index="' + i + '"><div class="preview-head">...
```

In that rendering function, find where `warns` is constructed. It should look like:

```js
const warns = entry.warnings.length
  ? '<div class="muted" style="color:#c77">' + entry.warnings.map(esc).join('<br>') + '</div>'
  : ''
```

Replace it with:

```js
const driftBadge = entry.isHardDrift
  ? '<span style="background:#c33;color:#fff;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:bold">DRIFT ' +
    Math.round((entry.driftRatio || 0) * 100) +
    '%</span>'
  : entry.driftRatio > 0.4
    ? '<span style="background:#c90;color:#fff;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:bold">DRIFT ' +
      Math.round((entry.driftRatio || 0) * 100) +
      '%</span>'
    : ''
const scoreBadge =
  entry.validationScore > 0
    ? '<span style="background:' +
      (entry.validationScore >= 60 ? '#3a3' : entry.validationScore >= 40 ? '#c90' : '#c33') +
      ';color:#fff;padding:2px 6px;border-radius:4px;font-size:11px">' +
      entry.validationScore +
      '/100</span>'
    : ''
const warns = entry.warnings.length
  ? '<div class="muted" style="color:#c77">' + entry.warnings.map(esc).join('<br>') + '</div>'
  : ''
```

Then in the same `return` statement for each preview item, insert `driftBadge + ' ' + scoreBadge` next to the char count display. Find where `entry.chars + ' chars'` appears and change it to:

```js
esc(entry.chars + ' chars') + ' ' + driftBadge + ' ' + scoreBadge
```

---

## What NOT to Change

- Do NOT modify the validator (`persona-validator.mjs`).
- Do NOT modify the import/save/pipeline logic. Only preview display.
- Do NOT change the server routes, port, auth, or any other endpoint.
- Do NOT add new endpoints or CSS classes beyond what is specified above.
- Do NOT modify the generator.

---

## Verification

1. Start the inbox server: `node devtools/persona-inbox-server.mjs`
2. Open `http://localhost:3977` in a browser
3. Paste the following test persona into the text area:

```
**Chef Profile: "Test Drift" - Culinary Instructor (Teaching-Driven)**

I teach 25 students weekly. Revenue $8,000/month from 6 classes at $150/person.

### Primary Failure: No Student Tracking
I cannot track student progress or skill levels.

### Structural Issue: No Curriculum System
No system to store lesson plans or reuse them.

### Structural Issue: No Skill Progression
Students plateau because there are no learning paths.

### Structural Issue: No Feedback Capture
Student feedback is verbal and unstructured.

### Psychological Model
I optimize for student outcomes. I refuse to compromise on teaching quality.

### Pass / Fail Conditions
1. The system must define learning paths for students.
2. The system must track student progress over time.
3. The system must store curriculum and lesson plans.
4. The system must collect structured student feedback.
5. The system must help manage class timing and flow.
```

4. Click "Preview"
5. Expected: a red "DRIFT XX%" badge should appear next to the char count, and a warning about product drift should appear in red text.

If the server cannot start (port in use, etc.), that is acceptable. The code change is still correct.
