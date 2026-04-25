# Spec: Model Puller Script

> CLI script to install all recommended models. Run once to populate Ollama. No app code changes.

## Status: QUEUED

## Dependencies

None. This is standalone.

## Context

The developer needs these models installed on Ollama for the smart router to work. This script pulls them all, removes outdated ones (with confirmation), and reports status.

## Files to Create

### 1. `scripts/pull-ai-models.mjs`

```javascript
#!/usr/bin/env node

/**
 * Pull all recommended AI models for ChefFlow's smart router.
 * Run: node scripts/pull-ai-models.mjs
 *
 * Options:
 *   --gpu-only    Only pull models that fit in 6GB VRAM
 *   --all         Pull GPU + CPU models (default)
 *   --cleanup     Remove outdated models after pulling
 *   --dry-run     Show what would be pulled without doing it
 */

const OLLAMA_BASE = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/+$/, '')

// Models to install, ordered by priority
const GPU_MODELS = [
  { id: 'gemma4:e2b', reason: 'Ultra-fast classifier and router (2.3B, ~3GB VRAM)' },
  { id: 'gemma4:e4b', reason: 'Daily driver, best quality-per-VRAM (4.5B, ~5GB VRAM)' },
  { id: 'qwen3.5:4b', reason: 'Best pure-text reasoning per byte (4B, ~2.5GB VRAM)' },
  {
    id: 'phi4-mini',
    reason: 'Microsoft reasoning model, great structured output (3.8B, ~2.2GB VRAM)',
  },
]

const CPU_MODELS = [
  {
    id: 'qwen3.6',
    reason: 'Bleeding-edge coding/reasoning (27B, ~17GB RAM). Released April 22 2026',
  },
  { id: 'phi4', reason: 'Microsoft reasoning, compact CPU model (14B, ~9GB RAM)' },
  { id: 'deepseek-r1:8b', reason: 'Pure reasoning chains (8B distill, ~5GB)' },
]

const OUTDATED = [
  { id: 'llama3.2:latest', reason: 'Llama 4 exists. Two generations old.' },
  { id: 'qwen2.5vl:latest', reason: 'Qwen 3.5 has vision now.' },
]

// Keep these - still useful
// gemma4:latest (27B MoE, great CPU model)
// qwen3:4b (still good, but qwen3.5:4b is better)
// qwen3:30b (still good)
// qwen3-coder:30b (code specialist)
// hermes3:8b (tool-use specialist)
// nomic-embed-text (embedding model, needed for semantic routing)

const args = process.argv.slice(2)
const gpuOnly = args.includes('--gpu-only')
const cleanup = args.includes('--cleanup')
const dryRun = args.includes('--dry-run')

async function checkOllama() {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return data.models?.map((m) => m.name) || []
  } catch (err) {
    console.error(`\nOllama not reachable at ${OLLAMA_BASE}`)
    console.error('Make sure Ollama is running: ollama serve')
    process.exit(1)
  }
}

async function pullModel(id) {
  console.log(`  Pulling ${id}...`)
  if (dryRun) {
    console.log(`  [DRY RUN] Would pull ${id}`)
    return true
  }

  try {
    const res = await fetch(`${OLLAMA_BASE}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: id, stream: false }),
      signal: AbortSignal.timeout(600000), // 10 min timeout per model
    })
    if (!res.ok) {
      const body = await res.text()
      console.error(`  FAILED: ${body}`)
      return false
    }
    console.log(`  OK: ${id}`)
    return true
  } catch (err) {
    console.error(`  FAILED: ${err.message}`)
    return false
  }
}

async function removeModel(id) {
  console.log(`  Removing ${id}...`)
  if (dryRun) {
    console.log(`  [DRY RUN] Would remove ${id}`)
    return true
  }

  try {
    const res = await fetch(`${OLLAMA_BASE}/api/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: id }),
    })
    if (!res.ok) {
      console.error(`  FAILED to remove ${id}`)
      return false
    }
    console.log(`  Removed: ${id}`)
    return true
  } catch (err) {
    console.error(`  FAILED: ${err.message}`)
    return false
  }
}

async function main() {
  console.log('\n=== ChefFlow AI Model Puller ===\n')
  if (dryRun) console.log('[DRY RUN MODE]\n')

  const installed = await checkOllama()
  console.log(`Ollama online. ${installed.length} models installed.\n`)
  console.log('Currently installed:')
  installed.forEach((m) => console.log(`  - ${m}`))

  const toPull = gpuOnly ? GPU_MODELS : [...GPU_MODELS, ...CPU_MODELS]
  const needed = toPull.filter((m) => !installed.includes(m.id))

  if (needed.length === 0) {
    console.log('\nAll recommended models already installed!')
  } else {
    console.log(`\nPulling ${needed.length} new models:\n`)
    let pulled = 0
    let failed = 0
    for (const m of needed) {
      console.log(`[${pulled + failed + 1}/${needed.length}] ${m.id}`)
      console.log(`  Reason: ${m.reason}`)
      const ok = await pullModel(m.id)
      if (ok) pulled++
      else failed++
      console.log()
    }
    console.log(`\nDone. Pulled: ${pulled}, Failed: ${failed}`)
  }

  if (cleanup) {
    const toRemove = OUTDATED.filter((m) => installed.includes(m.id))
    if (toRemove.length > 0) {
      console.log('\nCleaning up outdated models:\n')
      for (const m of toRemove) {
        console.log(`  ${m.id}: ${m.reason}`)
        await removeModel(m.id)
      }
    } else {
      console.log('\nNo outdated models to clean up.')
    }
  }

  // Final status
  const finalInstalled = dryRun ? installed : await checkOllama().catch(() => installed)
  console.log(`\nFinal model count: ${finalInstalled.length}`)
  console.log('\nDone.\n')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
```

## Files to Modify

**NONE.** This is a standalone script.

## Usage

```bash
# Pull GPU-friendly models only (fast, small downloads)
node scripts/pull-ai-models.mjs --gpu-only

# Pull everything (GPU + CPU models, bigger downloads)
node scripts/pull-ai-models.mjs --all

# See what would happen without doing it
node scripts/pull-ai-models.mjs --dry-run

# Pull everything and remove outdated models
node scripts/pull-ai-models.mjs --all --cleanup
```

## DO NOT

- Do NOT modify any application source code
- Do NOT import from any ChefFlow module - this is standalone
- Do NOT pull models that are not on Ollama's public library
- Do NOT remove models without the `--cleanup` flag
- Do NOT use em dashes anywhere
- Do NOT add this to package.json scripts (developer will do that if desired)
- Do NOT auto-run on build or start
