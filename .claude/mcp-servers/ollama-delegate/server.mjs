/**
 * Ollama Delegate MCP Server
 *
 * Bridges Claude Code to local Ollama models (Gemma 4, etc.) for
 * mechanical tasks that don't need Opus-level reasoning.
 * Saves Anthropic API tokens by offloading grunt work locally.
 *
 * Cost: $0 per delegated call.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const OLLAMA_URL = process.env.OLLAMA_DELEGATE_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_DELEGATE_MODEL || 'gemma4';
const TIMEOUT_MS = parseInt(process.env.OLLAMA_DELEGATE_TIMEOUT || '120000', 10);

// ---------------------------------------------------------------------------
// Ollama HTTP client
// ---------------------------------------------------------------------------

async function callOllama(messages, model = DEFAULT_MODEL) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: false }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Ollama ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = await res.json();
    return data.message?.content || '(empty response)';
  } finally {
    clearTimeout(timer);
  }
}

/** Quick health check - is Ollama reachable? */
async function ollamaAlive() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

/** List available models */
async function listModels() {
  const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Ollama ${res.status}`);
  const data = await res.json();
  return data.models || [];
}

// ---------------------------------------------------------------------------
// System prompts per task type
// ---------------------------------------------------------------------------

const SYSTEM_PROMPTS = {
  generate: `You are a helpful assistant delegated a text generation task. Produce exactly what is asked. Be direct, no preamble. Match the requested format precisely.`,

  code: `You are a code assistant. Produce clean, correct code or analysis. No unnecessary explanation unless asked. Use proper formatting. If analyzing code, be specific about line numbers and issues.`,

  summarize: `You are a summarization assistant. Produce concise, accurate summaries. Capture key points and decisions. Omit filler. Use bullet points when appropriate.`,

  extract: `You are a data extraction assistant. Extract the requested information from the provided content. Return structured data (JSON when appropriate). Be precise and complete. If information is missing, say so explicitly rather than guessing.`,
};

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    name: 'delegate',
    description: `Send a general-purpose task to a local Ollama model (FREE, $0 cost).

GOOD for: drafting text, generating boilerplate, templates, commit messages, doc sections, compliance scanning, reformatting, translation, simple Q&A, brainstorming lists.

BAD for (keep on Claude): multi-file reasoning, architecture decisions, complex debugging, tasks requiring tool access or codebase context, security-sensitive decisions, anything where quality regression would waste more time than tokens saved.

Rule of thumb: if the task is mechanical and you could verify the result in <10 seconds, delegate it.`,
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The task to perform. Be specific and complete - the local model has no conversation context.',
        },
        context: {
          type: 'string',
          description: 'Optional additional context (file contents, data, etc.)',
        },
        model: {
          type: 'string',
          description: `Model to use (default: ${DEFAULT_MODEL}). Use list_models to see options.`,
        },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'delegate_code',
    description: `Send a code-focused task to a local model (FREE, $0 cost).

GOOD for: generating boilerplate functions, writing simple tests, adding type annotations, formatting code, writing JSDoc comments, converting between formats, creating simple components from a template, regex generation.

BAD for (keep on Claude): debugging complex issues, refactoring across multiple files, architecture decisions, security-sensitive code, anything requiring knowledge of the full codebase.`,
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'What to do with the code. Be specific.',
        },
        code: {
          type: 'string',
          description: 'The code to work with.',
        },
        language: {
          type: 'string',
          description: 'Programming language (for context).',
        },
        model: {
          type: 'string',
          description: `Model to use (default: ${DEFAULT_MODEL}).`,
        },
      },
      required: ['prompt', 'code'],
    },
  },
  {
    name: 'delegate_summarize',
    description: `Summarize content using a local model (FREE, $0 cost).

GOOD for: summarizing file contents, log output, long error messages, documentation, meeting notes, git diffs, PR descriptions.

BAD for (keep on Claude): summarizing when you need to make judgment calls about what matters, or when the summary will drive an architectural decision.`,
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The content to summarize.',
        },
        focus: {
          type: 'string',
          description: 'What to focus on in the summary (optional).',
        },
        max_length: {
          type: 'string',
          description: 'Target length: "brief" (2-3 sentences), "medium" (paragraph), "detailed" (multiple paragraphs). Default: brief.',
        },
        model: {
          type: 'string',
          description: `Model to use (default: ${DEFAULT_MODEL}).`,
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'delegate_extract',
    description: `Extract structured data from unstructured text using a local model (FREE, $0 cost).

GOOD for: pulling names/dates/amounts from text, parsing semi-structured logs, converting prose to JSON, extracting TODO items, parsing natural language into fields.

BAD for (keep on Claude): extraction requiring domain expertise or judgment about ambiguous data, security-sensitive data parsing.`,
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The text to extract from.',
        },
        schema: {
          type: 'string',
          description: 'Description of what to extract and desired output format.',
        },
        model: {
          type: 'string',
          description: `Model to use (default: ${DEFAULT_MODEL}).`,
        },
      },
      required: ['content', 'schema'],
    },
  },
  {
    name: 'list_models',
    description: 'List all locally available Ollama models. Use this to see what models are installed before delegating.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

async function handleDelegate({ prompt, context, model }) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPTS.generate },
    {
      role: 'user',
      content: context ? `${prompt}\n\n---\nContext:\n${context}` : prompt,
    },
  ];
  return callOllama(messages, model || DEFAULT_MODEL);
}

async function handleDelegateCode({ prompt, code, language, model }) {
  const langHint = language ? ` (${language})` : '';
  const messages = [
    { role: 'system', content: SYSTEM_PROMPTS.code },
    {
      role: 'user',
      content: `${prompt}\n\n\`\`\`${language || ''}\n${code}\n\`\`\``,
    },
  ];
  return callOllama(messages, model || DEFAULT_MODEL);
}

async function handleDelegateSummarize({ content, focus, max_length, model }) {
  const lengthGuide = {
    brief: 'Summarize in 2-3 sentences.',
    medium: 'Summarize in one paragraph.',
    detailed: 'Provide a detailed summary with key points.',
  };
  const guide = lengthGuide[max_length] || lengthGuide.brief;
  const focusHint = focus ? ` Focus on: ${focus}.` : '';

  const messages = [
    { role: 'system', content: SYSTEM_PROMPTS.summarize },
    { role: 'user', content: `${guide}${focusHint}\n\n${content}` },
  ];
  return callOllama(messages, model || DEFAULT_MODEL);
}

async function handleDelegateExtract({ content, schema, model }) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPTS.extract },
    {
      role: 'user',
      content: `Extract the following from the text below:\n\n**What to extract:** ${schema}\n\n**Text:**\n${content}`,
    },
  ];
  return callOllama(messages, model || DEFAULT_MODEL);
}

async function handleListModels() {
  const models = await listModels();
  if (models.length === 0) return 'No models found. Run `ollama pull <model>` to install one.';

  const lines = models.map((m) => {
    const sizeGB = (m.size / 1e9).toFixed(1);
    return `- ${m.name} (${sizeGB} GB)`;
  });
  return `Available Ollama models:\n${lines.join('\n')}\n\nDefault: ${DEFAULT_MODEL}`;
}

const HANDLERS = {
  delegate: handleDelegate,
  delegate_code: handleDelegateCode,
  delegate_summarize: handleDelegateSummarize,
  delegate_extract: handleDelegateExtract,
  list_models: handleListModels,
};

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new Server(
  { name: 'ollama-delegate', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// List tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

// Call tool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const handler = HANDLERS[name];
  if (!handler) {
    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  // Health check before calling (skip for list_models which does its own check)
  if (name !== 'list_models') {
    const alive = await ollamaAlive();
    if (!alive) {
      return {
        content: [
          {
            type: 'text',
            text: `Ollama is not reachable at ${OLLAMA_URL}. Start it with \`ollama serve\` or check the URL.`,
          },
        ],
        isError: true,
      };
    }
  }

  try {
    const startTime = Date.now();
    const result = await handler(args || {});
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    return {
      content: [
        {
          type: 'text',
          text: `${result}\n\n---\n[Delegated to ${args?.model || DEFAULT_MODEL} | ${elapsed}s | $0.00]`,
        },
      ],
    };
  } catch (err) {
    return {
      content: [
        {
          type: 'text',
          text: `Delegation failed: ${err.message}`,
        },
      ],
      isError: true,
    };
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
