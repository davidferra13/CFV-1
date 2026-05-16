export function buildContextPack(options = {}) {
  const runId = options.runId || 'RUN-ID-MISSING'
  const generatedAt = options.generatedAt || new Date().toISOString()
  const items = Array.isArray(options.items) ? options.items : []
  const gitStatus = String(options.gitStatus || '').trim() || '(clean or unavailable)'
  const queueStatus = String(options.queueStatus || '').trim() || '(queue status unavailable)'
  const domainPlan = String(options.domainPlan || '').trim() || '(domain plan unavailable)'
  const workspace = String(options.workspace || '').trim() || '(workspace summary unavailable)'
  const firePlan = String(options.firePlan || '').trim() || '(fire plan missing or not provided)'

  const itemLines =
    items.length > 0
      ? items.map((item) => `- ${item.id || 'unknown'} (${item.status || 'unknown'}): ${item.path || 'path unavailable'}`)
      : ['- No queue item files were resolved. Stop and resolve IDs before coding.']

  const itemSections =
    items.length > 0
      ? items
          .map(
            (item) => `## Queue Item: ${item.id || 'unknown'}

Status: ${item.status || 'unknown'}
Path: ${item.path || 'path unavailable'}

~~~md
${String(item.content || '').trim() || '(empty item file)'}
~~~`,
          )
          .join('\n\n')
      : '## Queue Items\n\nNo queue item content was included.'

  return `# ChefFlow Run Context Pack

Run ID: ${runId}
Generated: ${generatedAt}

## Queue Items

${itemLines.join('\n')}

## Dirty Workspace Snapshot

\`\`\`text
${gitStatus}
\`\`\`

## Queue Status

\`\`\`text
${queueStatus}
\`\`\`

## Domain Plan

\`\`\`text
${domainPlan}
\`\`\`

## Workspace Summary

\`\`\`text
${workspace}
\`\`\`

## Fire Plan

~~~md
${firePlan}
~~~

## Canonical Context To Read

- AGENTS.md
- docs/.codex-workspace-brief.md
- .claude/skills/omninet/SKILL.md, if present
- .agents/skills/build-queue/references/QUEUE-FORMAT.md
- .agents/build-queue/run-lifecycle.md
- .agents/build-queue/context-freshness.md
- .agents/build-queue/role-domain-matrix.md
- .agents/build-queue/domain-orchestration.md
- .agents/build-queue/build-observability.md
- Relevant domain docs, route files, server actions, API routes, tests, and current implementation files discovered from the queue items.

## Execution Contract

- Preserve unrelated dirty work.
- Do not invent files or trust stale docs without inspecting current code.
- Define file ownership boundaries before parallel work.
- Do not let independent agents edit the same files in the same wave.
- Reuse existing architecture, route patterns, auth helpers, tenant scoping, and tests.
- Keep queue items in-flight until runtime proof, proof pack, and finish-check are complete.

## Security Defaults

- Server actions must call the appropriate require* guard before data access.
- API routes must be protected by middleware auth or approved route-level auth.
- Tenant data must be scoped by tenant_id or chef_id as appropriate.
- Protected pages must be registered in lib/auth/route-policy.ts.
- Admin pages and actions must call requireAdmin().

## Verification And Proof Expectations

- Run focused tests and type checks that match changed files.
- For UI changes, hard refresh affected routes and inspect browser console, network, server logs, and runtime errors.
- Capture visible proof for user-facing surfaces.
- Update the proof pack with acceptance evidence, wiring proof, runtime proof, verification output, and partial-work notes.
- Run build-queue.mjs finish-check before moving queue items to done.

${itemSections}
`
}
