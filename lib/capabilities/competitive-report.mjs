export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
const h = escapeHtml
const label = (value) =>
  String(value ?? '')
    .replaceAll('_', ' ')
    .toLowerCase()
const badge = (value) => `<span class="badge">${h(label(value))}</span>`

export function renderCompetitiveMarkdown(audit) {
  const s = audit.summary
  const clean = (value) => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ')
  return [
    '# ChefFlow competitive capability audit',
    '',
    `As of ${audit.asOf}. Repository revision: ${audit.revision?.commit ?? 'unavailable'}.`,
    '',
    audit.scope,
    '',
    `Candidates: ${s.candidates}. Vendor sources: ${s.documentedSources}. Atomic benchmarks: ${s.atomicBenchmarks}. Acceptance criteria: ${s.acceptanceCriteria}.`,
    `Canonical capabilities: ${s.canonicalCapabilities}; referenced by benchmarks: ${s.mappedCanonicalCapabilities}.`,
    `Narrow competitive workflows proven by this audit: ${s.narrowWorkflowsProven}.`,
    '',
    '## Evidence boundaries',
    ...audit.limitations.map((item) => `- ${item}`),
    '',
    '## Research coverage',
    '',
    ...Object.entries(s.productResearch).map(([state, count]) => `- ${state}: ${count}`),
    '',
    '## Proposed work order, not an executing job queue',
    '',
    '| Order | Priority | Workflow | Evidence-directed next action |',
    '| --- | --- | --- | --- |',
    ...audit.proposedWorkQueue.map(
      (row) => `| ${row.order} | ${row.priority} | ${clean(row.title)} | ${label(row.work)} |`
    ),
    '',
    '## Vendor sources, documentation only',
    '',
    ...audit.sources.map(
      (source) =>
        `- ${source.productId}: ${source.url} (reviewed ${source.reviewedAt}; ${source.locator}).`
    ),
    '',
    '## Categories awaiting atomic benchmarks',
    ...s.categoriesAwaitingBenchmarks.map((item) => `- ${item}`),
    '',
    'The accompanying JSON retains acceptance criteria, canonical mappings, source claims and exact observed references. The HTML is a read-only searchable view of that same snapshot.',
    '',
  ].join('\n')
}

export function renderCompetitiveHtml(audit) {
  const s = audit.summary
  const categoryLabels = new Map(audit.categories.map((item) => [item.id, item.label]))
  const sourceMap = new Map(audit.sources.map((source) => [source.id, source]))
  const searchKey = (item) => h(JSON.stringify(item).toLowerCase())
  const products = audit.products
    .map(
      (
        product
      ) => `<article class="product searchable" data-kind="products" data-search="${searchKey([product.name, product.aliases, product.categoryIds, product.currentResearchStatus])}" data-categories="${h(product.categoryIds.join(' '))}">
    <h3>${h(product.name)}</h3>${badge(product.currentResearchStatus)}
    <p>${product.categoryIds.map((id) => h(categoryLabels.get(id))).join(' / ')}</p>
    ${product.aliases.length ? `<p class="muted">Includes named surfaces: ${h(product.aliases.join(', '))}</p>` : ''}
    ${product.sourceIds
      .map((id) => {
        const source = sourceMap.get(id)
        return `<p><a href="${h(source.url)}" target="_blank" rel="noopener noreferrer">Vendor documentation</a> <span class="muted">Reviewed ${h(source.reviewedAt)}</span></p>`
      })
      .join('')}
    ${product.lifecycle.announcedEndDate ? `<p class="notice">Announced end: ${h(product.lifecycle.announcedEndDate)}. Recheck actual availability; this is not observed closure.</p>` : ''}
    ${product.notes.map((note) => `<p class="muted">${h(note)}</p>`).join('')}
  </article>`
    )
    .join('')
  const rows = audit.benchmarks
    .map(
      (
        row
      ) => `<details class="benchmark searchable" data-kind="benchmarks" data-search="${searchKey([row.id, row.title, row.persona, row.competitorClaims.map((item) => item.productName), row.priority])}" data-categories="${h(row.categoryId)}">
    <summary><span class="priority">${h(row.priority)}</span><span><strong>${h(row.title)}</strong><span class="subline">${h(categoryLabels.get(row.categoryId))} / ${h(label(row.persona))}</span></span><span class="status">${h(label(row.codeSignal))}</span></summary>
    <div class="detail-body"><div class="detail-grid"><section><h4>Documented competitor feature</h4>${row.competitorClaims.map((claim) => `<p><a href="${h(claim.url)}" target="_blank" rel="noopener noreferrer">${h(claim.productName)}</a>: ${h(claim.statement)}<br><small>Reviewed ${h(claim.reviewedAt)}. ${h(label(claim.sourceStatus))}. ${h(label(claim.productStatus))}.</small></p>`).join('')}
      <h4>ChefFlow acceptance bar</h4><ol>${row.acceptance.map((item) => `<li>${h(item)}</li>`).join('')}</ol></section>
      <section><h4>Proof, not inferred parity</h4><p>${badge(row.workflowVerdict)} ${badge(row.strategy)}</p><p>Existing references are investigation leads. Neither a file nor a broad capability receipt proves the workflow above.</p>
      ${row.canonicalEvidence.map((item) => `<p><code>${h(item.id)}</code> ${badge(item.proofState)}</p>`).join('')}
      <h4>Mapped source references</h4><ul class="references">${row.references.map((item) => `<li>${item.exists ? 'Found' : 'Not found'}: <code>${h(item.path)}</code>${item.kind ? ` (${h(item.kind)})` : ''}${item.error ? ` (${h(item.error)})` : ''}</li>`).join('')}</ul>
      <h4>Predecessors</h4><p>${row.dependsOn.length ? row.dependsOn.map(h).join(', ') : 'No registry dependencies'}</p></section></div></div>
  </details>`
    )
    .join('')
  const queue = audit.proposedWorkQueue
    .map(
      (item) =>
        `<li><span class="queue-number">${item.order}</span><div><strong>${h(item.title)}</strong><p>${h(item.priority)} / ${h(label(item.work))}</p></div></li>`
    )
    .join('')
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ChefFlow / Competitive capability registry</title>
<style>
:root{color-scheme:dark;--bg:#0c1420;--panel:#142131;--line:#304052;--muted:#abbacf;--text:#f3f5fa;--accent:#85dfc8}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.55 system-ui,sans-serif}main{max-width:1340px;margin:auto;padding:36px 24px 80px}a{color:var(--accent);text-underline-offset:3px}a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:3px solid #f8cf79;outline-offset:4px}.eyebrow{color:var(--accent);font-size:.8rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase}h1{font-size:clamp(2rem,4.8vw,3.7rem);line-height:1.1;margin:12px 0 18px;max-width:950px}h2{font-size:1.5rem;margin-top:30px}h3{margin:0 0 9px;font-size:1.15rem}h4{margin:16px 0 7px}p{margin:9px 0}.intro{max-width:910px;color:var(--muted)}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:28px 0}.metric{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:18px}.metric strong{display:block;font-size:2rem}.metric span,.muted,small,.subline{color:var(--muted)}.notice{padding:12px 16px;border-left:3px solid #f8cf79;background:#24283a}.toolbar{display:flex;flex-wrap:wrap;gap:12px;align-items:end;padding:20px 0}.toolbar label{display:flex;flex-direction:column;gap:5px;font-size:.85rem;flex:1;min-width:200px}input,select,button{font:inherit;border:1px solid var(--line);color:var(--text);background:var(--panel);border-radius:8px;padding:11px}button{cursor:pointer}.tabs{display:flex;gap:8px;flex-wrap:wrap}.tabs button[aria-pressed=true]{background:var(--accent);color:#0c1420;border-color:var(--accent);font-weight:700}.badge{display:inline-block;border:1px solid #53677f;padding:3px 8px;border-radius:5px;font-size:.72rem;line-height:1.4;margin:3px 4px 3px 0;color:#d6e7f8}.benchmark{background:var(--panel);border:1px solid var(--line);border-radius:10px;margin:10px 0;overflow:hidden}.benchmark summary{cursor:pointer;display:flex;align-items:center;gap:14px;padding:19px;list-style:none}.benchmark summary:before{content:'+';color:var(--accent);font-size:1.25rem}.benchmark[open] summary:before{content:'−'}.priority{font-size:.8rem;padding:3px 7px;border:1px solid var(--line);border-radius:5px}.subline{display:block;font-size:.78rem;margin-top:4px}.status{margin-left:auto;font-size:.74rem;color:var(--muted);text-align:right;max-width:150px}.detail-body{border-top:1px solid var(--line);padding:6px 24px 24px}.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:32px}li{margin:7px 0}code{font-size:.78rem;overflow-wrap:anywhere}.references{padding-left:16px;max-height:220px;overflow:auto}.products{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.product{padding:19px;background:var(--panel);border:1px solid var(--line);border-radius:10px}.product p{font-size:.82rem}.queue{padding:0;list-style:none}.queue li{display:flex;align-items:center;gap:20px;border-bottom:1px solid var(--line);padding:14px 0}.queue p{font-size:.85rem;color:var(--muted)}.queue-number{color:var(--accent);font-weight:700;min-width:28px}.coverage{font-size:.87rem;color:var(--muted);margin-top:34px;border-top:1px solid var(--line);padding-top:16px}[hidden]{display:none!important}.count{margin:8px 0 18px;color:var(--muted)}footer{margin-top:38px;font-size:.78rem;color:var(--muted)}@media(max-width:760px){main{padding:24px 14px}.metrics{grid-template-columns:repeat(2,1fr)}.products,.detail-grid{grid-template-columns:1fr}.status{display:none}.benchmark summary{padding:15px;gap:10px}.detail-body{padding:6px 16px 20px}.toolbar label{min-width:100%}.detail-grid{gap:8px}}
</style></head><body><main><div class="eyebrow">ChefFlow / Product intelligence</div><h1>Know the competition.<br>Prove the capability.</h1><p class="intro">One sourced, read-only benchmark layer linked to the existing ChefFlow capability registry. This is an investigation and work-order snapshot, not a claim that every competitor is active or every feature works.</p>
<div class="metrics"><div class="metric"><strong>${s.candidates}</strong><span>Named product candidates</span></div><div class="metric"><strong>${s.documentedSources}</strong><span>Vendor sources reviewed</span></div><div class="metric"><strong>${s.atomicBenchmarks}</strong><span>Atomic workflow benchmarks</span></div><div class="metric"><strong>${s.acceptanceCriteria}</strong><span>Explicit acceptance criteria</span></div></div>
<p class="notice"><strong>${s.narrowWorkflowsProven} narrow workflows proven by this audit.</strong> Existing code references and broad capability proof are shown separately. Do not read either as competitive parity.</p>
<nav class="tabs" aria-label="Registry views"><button type="button" data-view="benchmarks" aria-pressed="true">Workflow benchmarks</button><button type="button" data-view="products" aria-pressed="false">Product universe</button><button type="button" data-view="queue" aria-pressed="false">Proposed work order</button></nav>
<div class="toolbar" id="filters"><label>Search<input id="search" type="search" placeholder="Try Paprika, booking, invoices..." autocomplete="off"></label><label>Category<select id="category"><option value="">All categories</option>${audit.categories.map((item) => `<option value="${h(item.id)}">${h(item.label)}</option>`).join('')}</select></label></div>
<p class="count" id="count" role="status" aria-live="polite">${s.atomicBenchmarks} workflow benchmarks</p>
<section id="benchmarks" aria-label="Workflow benchmarks">${rows}</section><section id="products" class="products" aria-label="Product candidates" hidden>${products}</section><section id="queue" aria-label="Proposed work order" hidden><p class="notice">Dependency-ordered proposals only. No jobs have been dispatched by this report. Priority is an editorial decision, not a market-share or superiority score.</p><ol class="queue">${queue}</ol></section>
<p id="empty" class="notice" hidden>No entries match. Clear the search or choose another category.</p>
<section class="coverage"><h2>Coverage and limits</h2><p>${s.canonicalCapabilities} existing canonical capabilities; ${s.mappedCanonicalCapabilities} referenced by these benchmarks. ${s.benchmarkCategories} of ${s.categories} editorial categories have atomic benchmarks so far.</p><p>Research states: ${Object.entries(
    s.productResearch
  )
    .map(([key, value]) => `${h(label(key))}: ${value}`)
    .join(
      ' / '
    )}.</p><p>Still awaiting atomic benchmarks: ${s.categoriesAwaitingBenchmarks.map(h).join(', ')}.</p><ul>${audit.limitations.map((item) => `<li>${h(item)}</li>`).join('')}</ul></section>
<footer>Snapshot ${h(audit.asOf)} / Source revision ${h(audit.revision?.commit ?? 'unavailable')} / Working tree ${audit.revision?.dirty === true ? 'contained uncommitted changes at audit time' : audit.revision?.dirty === false ? 'clean at audit time' : 'status unavailable'}. The report is not a live monitoring service.</footer>
</main><script>
'use strict';
let view='benchmarks';
const search=document.getElementById('search');const category=document.getElementById('category');
function apply(){const query=search.value.trim().toLowerCase();let count=0;document.querySelectorAll('.searchable').forEach(item=>{const match=(!query||item.dataset.search.includes(query))&&(!category.value||item.dataset.categories.split(' ').includes(category.value));item.hidden=!match;if(item.dataset.kind===view&&match)count++;});document.getElementById('count').textContent=view==='queue'?'${audit.proposedWorkQueue.length} proposed steps; not executing':count+' matching '+(view==='products'?'product candidates':'workflow benchmarks');document.getElementById('empty').hidden=view==='queue'||count>0;}
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{view=button.dataset.view;['benchmarks','products','queue'].forEach(id=>document.getElementById(id).hidden=id!==view);document.querySelectorAll('[data-view]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));document.getElementById('filters').hidden=view==='queue';apply();}));search.addEventListener('input',apply);category.addEventListener('change',apply);apply();
</script></body></html>`
}
