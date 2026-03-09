# Fix: Remy Client Creation Misroute + Brain Dump Timeout

**Date:** 2026-03-09
**Branch:** feature/risk-gap-closure

## Problem

When a user asked "Please make me a client named Debbie, whose birthday is in August and hates black Pepper":

1. **P&L Report ran instead of client creation** (intent misclassification)
2. **agent.intake_brain_dump timed out after 20s** (timeout too short)
3. **Both wrong task (P&L) and recovery task (brain_dump) ran simultaneously**

## Root Cause Analysis

### 1. Brain Dump Timeout (20s default)

`DEFAULT_TASK_TIMEOUT_MS` in the orchestrator is 20s. Brain dump uses `modelTier: 'complex'` with 1536 max tokens, which routinely needs 30-45s on local Ollama. The Ollama-level timeout is 60s, but the task-level timeout fires first at 20s.

### 2. Recovery Guard Kept Wrong Tasks

When the orchestrator's recovery guard detected a missed client creation, it injected `agent.intake_brain_dump` but only removed `dietary.check` tasks. The wrong task (e.g. `finance.pnl`, Tier 1) remained and ran immediately, dominating the response.

### 3. Intent Parser Fallthrough

Despite a static deterministic pattern existing for "create/make/add ... client" (line 215 of command-intent-parser.ts), the input somehow reached the Ollama fallback in production. Ollama then misclassified the request as `finance.pnl`.

Regex testing confirms the pattern SHOULD match the input. Possible causes: voice-to-text encoding artifacts, invisible characters, or whitespace differences.

## Fixes Applied

### Fix 1: Task Timeout Overrides (command-orchestrator.ts)

Added explicit timeouts for agent intake tasks:

- `agent.intake_brain_dump`: 45s (was 20s default)
- `agent.create_client`: 45s
- `agent.intake_transcript`: 45s
- `agent.intake_bulk_clients`: 45s

### Fix 2: Recovery Guard Strips Wrong Tasks (command-orchestrator.ts)

When the recovery guard detects a missed client creation, it now **replaces the entire task list** with just `agent.intake_brain_dump` instead of appending alongside wrong tasks.

Before: P&L (Tier 1, auto-runs) + brain_dump (Tier 2, needs approval) = wrong output
After: brain_dump only (Tier 2, needs approval) = correct behavior

### Fix 3: Broad Client Creation Fallback Pattern (command-intent-parser.ts)

Added a broad fallback pattern at the END of the deterministic patterns array that matches any message containing a create-verb + "client" within 40 chars. Lower confidence (0.90) than the specific pattern (0.95), catches edge cases the strict `^`-anchored pattern misses.

## Files Changed

- `lib/ai/command-orchestrator.ts` - timeout overrides + recovery guard fix
- `lib/ai/command-intent-parser.ts` - broad fallback pattern
