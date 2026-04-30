#!/usr/bin/env node
import { createBuilderContext, ensureBuilderStore } from './core.mjs'

const context = createBuilderContext()
ensureBuilderStore(context)

console.log(JSON.stringify({
  status: 'initialized',
  builderDir: context.builderDir,
}, null, 2))
