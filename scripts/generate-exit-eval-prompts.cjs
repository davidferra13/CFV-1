const fs = require('fs');
const path = require('path');

const roles = ['chef','client','admin','guest','partner','vendor','staff'];
const MAX = 10;
const batches = [];
let bid = 0;

for (const role of roles) {
  const c = fs.readFileSync(path.join('docs/research', role + '-exit-points-analysis.md'), 'utf8');
  const lines = c.split('\n');
  let cat = 'unknown';
  const cats = {};
  const titles = {};
  for (const l of lines) {
    const cm = l.match(/^## Category \d+: (.+)/);
    if (cm) { cat = cm[1].trim(); if (!cats[cat]) cats[cat] = []; }
    const sm = l.match(/^\| (\d+)\s+\| (.+?) \|/);
    if (sm && cats[cat]) { const n = parseInt(sm[1]); cats[cat].push(n); titles[role+'-'+n] = sm[2].trim(); }
  }
  for (const [cn, sc] of Object.entries(cats)) {
    if (!sc.length) continue;
    if (sc.length > MAX) {
      const mid = Math.ceil(sc.length/2);
      batches.push({id:++bid,role,cat:cn,part:1,sc:sc.slice(0,mid),ti:sc.slice(0,mid).map(n=>titles[role+'-'+n]||'?')});
      batches.push({id:++bid,role,cat:cn,part:2,sc:sc.slice(mid),ti:sc.slice(mid).map(n=>titles[role+'-'+n]||'?')});
    } else {
      batches.push({id:++bid,role,cat:cn,part:0,sc,ti:sc.map(n=>titles[role+'-'+n]||'?')});
    }
  }
}

const promptDir = path.join('docs/exit-evals/prompts');
fs.mkdirSync(promptDir, { recursive: true });
for (const role of roles) {
  fs.mkdirSync(path.join('docs/exit-evals', role), { recursive: true });
}

for (const b of batches) {
  const pad = String(b.id).padStart(2,'0');
  const slug = b.cat.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const partSuffix = b.part > 0 ? '-part'+b.part : '';
  const fname = pad + '-' + b.role + '-' + slug.slice(0,40) + partSuffix + '.md';
  const outFile = 'docs/exit-evals/' + b.role + '/' + slug + partSuffix + '.md';

  let p = '';
  p += '# Prompt ' + b.id + ': ' + b.role[0].toUpperCase()+b.role.slice(1) + ' / ' + b.cat + (b.part>0?' (Part '+b.part+')':'') + '\n\n';
  p += '> Wave ' + (roles.indexOf(b.role)+1) + ' | ' + b.sc.length + ' scenarios | Output: `' + outFile + '`\n\n';
  p += '---\n\n';
  p += 'You are evaluating exit scenarios for the **' + b.role.toUpperCase() + '** role in ChefFlow.\n\n';
  p += '## Source Files\n\n';
  p += '- **Scenarios:** `docs/research/' + b.role + '-exit-points-analysis.md`\n';
  p += '- **Rubric:** `.claude/skills/exit-eval/SKILL.md` (read the full 7-question rubric)\n';
  p += '- **Companion:** `docs/research/' + b.role + '-never-leaves-analysis.md` (what already stays in-app)\n';
  p += '- **Codebase:** Read `lib/` and `app/` directories relevant to each scenario\n\n';
  p += '## Scenarios to Evaluate\n\n';
  p += 'Category: **' + b.cat + '**\n\n';
  for (let i=0; i<b.sc.length; i++) {
    p += '- **#' + b.sc[i] + ':** ' + b.ti[i] + '\n';
  }
  p += '\n## Rubric (Apply to Each Scenario IN ORDER)\n\n';
  p += '1. **Why does the ' + b.role + ' leave?** Operational reason, not surface. What decision or action requires the external tool?\n';
  p += '2. **What context does ChefFlow already have?** Event date/time/location, client data, menu items, recipes, ingredients, past events, financial data, region info.\n';
  p += '3. **Is the external tool just a data source?** If yes (API, database, static reference), ChefFlow should drink from that source. The ' + b.role + ' never visits it.\n';
  p += '4. **Client-collaborative angle?** Does the client/guest/partner know something the ' + b.role + ' would otherwise hunt for? Can Dinner Circle collect it?\n';
  p += '5. **Physical/analog reality?** Would print solve this? Is voice (Remy) the natural interface? Messy hands? Loud kitchen? Large text for glance moments?\n';
  p += '6. **Does knowledge compound?** High: venue profiles, client preferences, seasonal patterns (capture once, serve forever). Low: one-off calculations.\n';
  p += '7. **Reclassify:** One of: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent\n\n';
  p += '## Output Format (Per Scenario)\n\n';
  p += 'Write this exact structure for each of the ' + b.sc.length + ' scenarios:\n\n';
  p += '```markdown\n';
  p += '## Scenario #[N]: [Title]\n\n';
  p += '**Original classification:** [from source file]\n';
  p += '**Reclassified to:** [your assessment]\n\n';
  p += '**Why ' + b.role + ' leaves:** [operational reason]\n';
  p += '**Context ChefFlow has:** [bullet list]\n';
  p += '**Data source?** [yes/no + which API/database]\n';
  p += '**Client-collaborative angle:** [what Circle can collect]\n';
  p += '**Physical reality:** [print/voice/screen/hands-free needs]\n';
  p += '**Compounding:** [high/medium/low + why]\n\n';
  p += '**Solution design:**\n';
  p += '- [2-5 bullets of what to build]\n\n';
  p += '**Where it appears:**\n';
  p += '- [surface 1]\n';
  p += '- [surface 2]\n\n';
  p += '**What remains as permanent exit:**\n';
  p += '[What the ' + b.role + ' still leaves for even after we build this]\n\n';
  p += '**Priority:** [pain frequency] x [effort] = [rank signal]\n';
  p += '**Spec needed?** [yes/no]\n';
  p += '```\n\n';
  p += '## Post-Evaluation Checklist\n\n';
  p += '1. Write ALL output to: `' + outFile + '`\n';
  p += '2. Mark every scenario as `NEEDS-DEVELOPER-REVIEW` (solo mode, no chef input)\n';
  p += '3. At the bottom of the output file, add a summary table:\n\n';
  p += '```markdown\n';
  p += '## Batch Summary\n\n';
  p += '| # | Title | Reclassified To | Spec Needed? |\n';
  p += '|---|-------|----------------|-------------|\n';
  p += '| N | Title | Classification | yes/no |\n';
  p += '```\n\n';
  p += '4. Update `docs/exit-system-roadmap.md`: increment the evaluated count for ' + b.role + ' by ' + b.sc.length + '\n';
  p += '5. If any scenario is Reducible and complex enough for a standalone spec, write it to `docs/specs/` and note the filename in the summary\n';

  fs.writeFileSync(path.join(promptDir, fname), p, 'utf8');
}

let runner = '';
runner += '# Exit-Eval Codex Runner\n\n';
runner += '> **Generated:** 2026-05-25\n';
runner += '> **Total:** ' + batches.length + ' prompts | ' + batches.reduce((a,b)=>a+b.sc.length,0) + ' scenarios | 7 roles\n\n';
runner += '## How to Use\n\n';
runner += '### Run All (Sequential)\n\n';
runner += '```\n';
runner += 'Read docs/exit-evals/RUNNER.md for context. Then execute each prompt file in\n';
runner += 'docs/exit-evals/prompts/ sequentially, starting from prompt 01. For each prompt:\n';
runner += '1. Read the prompt file\n';
runner += '2. Read the source files it references\n';
runner += '3. Execute the evaluation per the rubric\n';
runner += '4. Write output to the specified file\n';
runner += '5. Update docs/exit-system-roadmap.md\n';
runner += '6. Move to the next prompt\n';
runner += '```\n\n';
runner += '### Run One Wave\n\n';
runner += '```\n';
runner += 'Read docs/exit-evals/RUNNER.md. Execute only Wave [N] (prompts [XX]-[YY], [Role] role).\n';
runner += 'For each prompt file, read it, execute the evaluation, write output, update roadmap.\n';
runner += '```\n\n';
runner += '### Run Single Prompt\n\n';
runner += '```\n';
runner += 'Read and execute docs/exit-evals/prompts/[NN]-[role]-[category].md\n';
runner += '```\n\n';
runner += '## Wave Structure\n\n';
runner += '| Wave | Role | Prompts | Scenarios | Files |\n';
runner += '|------|------|---------|-----------|-------|\n';
for (const role of roles) {
  const bs = batches.filter(b=>b.role===role);
  const wi = roles.indexOf(role)+1;
  const first = String(bs[0].id).padStart(2,'0');
  const last = String(bs[bs.length-1].id).padStart(2,'0');
  runner += '| ' + wi + ' | ' + role[0].toUpperCase()+role.slice(1) + ' | ' + bs.length + ' | ' + bs.reduce((a,b)=>a+b.sc.length,0) + ' | ' + first + '-' + last + ' |\n';
}
runner += '| | **TOTAL** | **' + batches.length + '** | **' + batches.reduce((a,b)=>a+b.sc.length,0) + '** | |\n\n';

runner += '## Prompt Index\n\n';
runner += '| # | File | Role | Category | Scenarios | Status |\n';
runner += '|---|------|------|----------|-----------|--------|\n';
for (const b of batches) {
  const pad = String(b.id).padStart(2,'0');
  const slug = b.cat.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const partSuffix = b.part > 0 ? '-part'+b.part : '';
  const fname = pad + '-' + b.role + '-' + slug.slice(0,40) + partSuffix + '.md';
  runner += '| ' + pad + ' | `' + fname + '` | ' + b.role[0].toUpperCase()+b.role.slice(1) + ' | ' + b.cat + (b.part>0?' (Pt '+b.part+')':'') + ' | ' + b.sc.join(', ') + ' | PENDING |\n';
}

runner += '\n## Progress Tracking\n\n';
runner += 'After completing each prompt, update the Status column above from PENDING to DONE.\n\n';
runner += 'When a full wave is complete, update `docs/exit-system-roadmap.md` role status from NOT STARTED/IN PROGRESS to DONE.\n\n';
runner += '## Quality Contract\n\n';
runner += '- Every scenario gets all 7 rubric questions answered\n';
runner += '- Classifications must be one of: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent\n';
runner += '- Solution designs grounded in what ChefFlow actually has today (check the codebase)\n';
runner += '- All output marked NEEDS-DEVELOPER-REVIEW (solo mode)\n';
runner += '- Specs written only for Reducible scenarios complex enough to warrant standalone docs\n';
runner += '- Each output file ends with a Batch Summary table\n';

fs.writeFileSync('docs/exit-evals/RUNNER.md', runner, 'utf8');

console.log('DONE');
console.log('  ' + batches.length + ' prompt files in docs/exit-evals/prompts/');
console.log('  RUNNER.md at docs/exit-evals/RUNNER.md');
