function sanitizeSlug(value) {
  return String(value || 'prompt')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function markdownFenceFor(content) {
  const matches = String(content || '').match(/`{3,}/g) || []
  const longest = matches.reduce((max, match) => Math.max(max, match.length), 2)
  return '`'.repeat(longest + 1)
}

export function buildPromptArchive(options = {}) {
  const title = String(options.title || 'Generated ChefFlow Prompt').trim()
  const date = String(options.date || new Date().toISOString().slice(0, 10))
  const slug = sanitizeSlug(options.slug || title)
  const runId = options.runId ? String(options.runId) : ''
  const source = options.source ? String(options.source) : ''
  const prompt = String(options.prompt || '').trim()
  const fence = markdownFenceFor(prompt)

  const frontmatter = [
    '---',
    `title: ${JSON.stringify(title)}`,
    `generated: ${JSON.stringify(date)}`,
    runId ? `run_id: ${JSON.stringify(runId)}` : null,
    source ? `source: ${JSON.stringify(source)}` : null,
    '---',
  ].filter(Boolean)

  return {
    slug,
    docsPath: `docs/prompts/generated/${date}-${slug}.md`,
    runPath: runId ? `.agents/build-queue/runs/${runId}/prompt.md` : null,
    content: `${frontmatter.join('\n')}

# ${title}

${fence}text
${prompt || 'COPY-PASTE PROMPT\n'}
${fence}
`,
  }
}
