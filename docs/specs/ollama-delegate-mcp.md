# Ollama Delegate MCP Server

> Local model delegation to cut Anthropic API token costs ~50%.

## Problem

Max plan ($200/mo) burns through tokens fast. Most of that spend is on mechanical tasks: drafting text, generating boilerplate, summarizing files, extracting data. These don't need Opus-level reasoning.

## Solution

MCP server that bridges Claude Code to local Ollama models (Gemma 4). Claude stays the orchestrator and judge. Gemma does the labor. Cost per delegated call: $0.

## Architecture

```
User prompt
    |
    v
Claude Code (Opus) -- orchestrates, reasons, decides
    |
    |-- [needs judgment] --> does it itself (Anthropic API)
    |-- [mechanical task] --> delegate tool --> Ollama MCP Server
                                                    |
                                                    v
                                              Local Ollama (Gemma 4)
                                                    |
                                                    v
                                              Result back to Claude
                                              Claude verifies & uses
```

## 4-Tier Model Hierarchy

| Tier         | Model         | Cost      | Use When                             |
| ------------ | ------------- | --------- | ------------------------------------ |
| **Local**    | Gemma 4 (e4b) | $0        | Mechanical, bulk, no judgment needed |
| **Worker**   | Haiku 4.5     | Cheap     | Light judgment, Claude agent tasks   |
| **Executor** | Opus 4.6      | Standard  | Normal development work              |
| **Advisor**  | Opus 4.6      | Expensive | Hard architecture decisions          |

## Tools Exposed

### `delegate`

General-purpose text tasks. Drafts, templates, brainstorming, reformatting, translation, simple Q&A.

### `delegate_code`

Code-focused tasks. Boilerplate functions, simple tests, type annotations, JSDoc, regex, format conversion.

### `delegate_summarize`

Content summarization. File contents, logs, errors, docs, diffs, PR descriptions.

### `delegate_extract`

Structured data extraction. Names/dates/amounts from text, log parsing, prose-to-JSON, field extraction.

### `list_models`

Show available local models. Helps Claude pick the right model for the task.

## Delegation Decision Matrix

### DELEGATE (Gemma does it, Claude verifies)

- Generating boilerplate code from a clear template
- Writing commit messages from a diff
- Summarizing file contents or logs
- Drafting doc sections from bullet points
- Reformatting or converting data
- Simple regex generation
- Compliance scanning (pattern matching)
- Extracting structured data from text

### DON'T DELEGATE (Claude does it)

- Multi-file reasoning
- Architecture or security decisions
- Complex debugging
- Anything requiring tool orchestration (read/edit/grep)
- Tasks where bad output costs more time than tokens saved
- Context-dependent decisions
- Anything the user asked Claude specifically to do

### Rule of Thumb

> If the task is mechanical and Claude could verify the result in <10 seconds, delegate it.

## Quality Gate

Claude ALWAYS reviews delegated output before using it. The local model is a draft generator, not a decision maker. If the output is wrong, Claude fixes it or redoes it. No diminished returns.

## Config

In `.claude/mcp.json`:

```json
"ollama-delegate": {
  "type": "stdio",
  "command": "node",
  "args": [".claude/mcp-servers/ollama-delegate/server.mjs"],
  "env": {
    "OLLAMA_DELEGATE_URL": "http://localhost:11434",
    "OLLAMA_DELEGATE_MODEL": "gemma4",
    "OLLAMA_DELEGATE_TIMEOUT": "120000"
  }
}
```

## Requirements

- Ollama running locally (`ollama serve`)
- Gemma 4 pulled (`ollama pull gemma4`)
- Node.js (already installed)

## Files

- `.claude/mcp-servers/ollama-delegate/server.mjs` - MCP server
- `.claude/mcp-servers/ollama-delegate/package.json` - Dependencies
- `.claude/mcp.json` - Registration

## Future Improvements

- Token tracking: log estimated tokens saved per session
- Model routing: use smaller model (e2b) for trivial tasks, larger (26b) for harder ones
- Batch delegation: process multiple items in parallel
- Gemma 4 multimodal: delegate image analysis tasks (screenshot verification)
