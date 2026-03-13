// AI Provider Error Classes
// Extracted from 'use server' files since class exports are not allowed in server action modules.
// Same pattern as ollama-errors.ts.

import type { ModelTier } from './providers'

/** Shared error code type for all AI provider errors. */
export type AIProviderErrorCode =
  | 'not_configured'
  | 'unreachable'
  | 'timeout'
  | 'rate_limited'
  | 'invalid_json'
  | 'validation_failed'
  | 'empty_response'

/** Shared options type for all OpenAI-compatible parsers. */
export interface ParseProviderOptions {
  modelTier?: ModelTier
  timeoutMs?: number
  maxTokens?: number
  model?: string
  temperature?: number
}

/** Extended options for Mistral (adds Codestral toggle). */
export interface ParseMistralOptions extends ParseProviderOptions {
  useCodestral?: boolean
}

/** Options for Gemini (no modelTier since it uses a single model). */
export interface ParseGeminiOptions {
  timeoutMs?: number
  maxTokens?: number
  model?: string
  temperature?: number
}

export class GeminiParseError extends Error {
  constructor(
    message: string,
    public code: AIProviderErrorCode
  ) {
    super(message)
    this.name = 'GeminiParseError'
  }
}

export class GroqError extends Error {
  constructor(
    message: string,
    public code: AIProviderErrorCode
  ) {
    super(message)
    this.name = 'GroqError'
  }
}

export class GitHubModelsError extends Error {
  constructor(
    message: string,
    public code: AIProviderErrorCode
  ) {
    super(message)
    this.name = 'GitHubModelsError'
  }
}

export class WorkersAiError extends Error {
  constructor(
    message: string,
    public code: AIProviderErrorCode
  ) {
    super(message)
    this.name = 'WorkersAiError'
  }
}

export class CerebrasError extends Error {
  constructor(
    message: string,
    public code: AIProviderErrorCode
  ) {
    super(message)
    this.name = 'CerebrasError'
  }
}

export class MistralError extends Error {
  constructor(
    message: string,
    public code: AIProviderErrorCode
  ) {
    super(message)
    this.name = 'MistralError'
  }
}

export class SambaNovaError extends Error {
  constructor(
    message: string,
    public code: AIProviderErrorCode
  ) {
    super(message)
    this.name = 'SambaNovaError'
  }
}

export class OpenAiError extends Error {
  constructor(
    message: string,
    public code: AIProviderErrorCode
  ) {
    super(message)
    this.name = 'OpenAiError'
  }
}
