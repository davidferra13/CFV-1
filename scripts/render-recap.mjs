#!/usr/bin/env node
// Standalone Remotion render script for event recap videos.
// Called by lib/events/recap-renderer.ts as a child process.
//
// Usage:
//   node scripts/render-recap.mjs <eventId> <base64JsonProps>
//
// Exits 0 on success, 1 on failure. Logs progress to stdout.

import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition, ensureBrowser } from '@remotion/renderer'
import { createRequire } from 'module'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const eventId = process.argv[2]
const propsB64 = process.argv[3]

if (!eventId || !propsB64) {
  console.error('[render-recap] Missing args: eventId propsBase64')
  process.exit(1)
}

let inputProps
try {
  inputProps = JSON.parse(Buffer.from(propsB64, 'base64').toString('utf-8'))
} catch {
  console.error('[render-recap] Failed to parse props JSON')
  process.exit(1)
}

const outputDir = path.join(rootDir, 'storage', 'recaps')
const outputPath = path.join(outputDir, `${eventId}.mp4`)

try {
  fs.mkdirSync(outputDir, { recursive: true })
} catch {
  // ignore
}

console.log('[render-recap] Starting render for event:', eventId)

try {
  // Ensure headless browser is available
  await ensureBrowser()
  console.log('[render-recap] Browser ready')

  // Bundle the composition (entry point: lib/remotion/index.ts)
  console.log('[render-recap] Bundling composition...')
  const bundled = await bundle({
    entryPoint: path.resolve(rootDir, 'lib', 'remotion', 'index.tsx'),
    webpackOverride: (config) => config,
  })
  console.log('[render-recap] Bundle complete')

  // Select the composition with input props
  const composition = await selectComposition({
    serveUrl: bundled,
    id: 'EventRecap',
    inputProps,
  })

  // Render to MP4
  console.log('[render-recap] Rendering to MP4...')
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps,
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100)
      if (pct % 10 === 0) console.log(`[render-recap] ${pct}%`)
    },
  })

  console.log('[render-recap] Done:', outputPath)
  process.exit(0)
} catch (err) {
  console.error('[render-recap] Render failed:', err?.message || err)
  process.exit(1)
}
