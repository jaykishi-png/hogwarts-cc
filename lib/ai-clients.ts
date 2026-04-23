/**
 * ai-clients.ts
 * Unified model client factory for multi-model routing.
 *
 * Cost tiers (per 1M tokens in/out):
 *   gemini-flash      $0.10 / $0.40   → structured / operational tasks
 *   claude-haiku      $0.80 / $4.00   → quality creative, cost-effective
 *   claude-sonnet     $3.00 / $15.00  → complex reasoning & strategy
 *   perplexity-sonar  ~$3 + search    → real-time web search
 *   gpt-4o            $2.50 / $10.00  → vision only (images attached)
 */

import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ModelAlias =
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'claude-sonnet'
  | 'claude-haiku'
  | 'gemini-flash'
  | 'perplexity-sonar'

export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'perplexity'

export interface ResolvedModel {
  provider: AIProvider
  modelName: string
}

// ─── Model resolution ─────────────────────────────────────────────────────────

/**
 * Resolve a model alias to its concrete provider + model name.
 * When images are attached, always fall back to GPT-4o (best vision model).
 */
export function resolveModel(alias: string, hasImages = false): ResolvedModel {
  if (hasImages) return { provider: 'openai', modelName: 'gpt-4o' }

  switch (alias as ModelAlias) {
    case 'claude-sonnet':
      return { provider: 'anthropic', modelName: 'claude-3-5-sonnet-20241022' }
    case 'claude-haiku':
      return { provider: 'anthropic', modelName: 'claude-3-5-haiku-20241022' }
    case 'gemini-flash':
      return { provider: 'gemini', modelName: 'gemini-2.0-flash' }
    case 'perplexity-sonar':
      return { provider: 'perplexity', modelName: 'sonar-pro' }
    case 'gpt-4o-mini':
      return { provider: 'openai', modelName: 'gpt-4o-mini' }
    case 'gpt-4o':
    default:
      return { provider: 'openai', modelName: 'gpt-4o' }
  }
}

// ─── Client factories ─────────────────────────────────────────────────────────

/** OpenAI SDK client for OpenAI, Gemini (OpenAI-compat), or Perplexity (OpenAI-compat) */
export function getOpenAICompatClient(provider: AIProvider): OpenAI {
  switch (provider) {
    case 'gemini':
      if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured')
      return new OpenAI({
        apiKey: process.env.GEMINI_API_KEY,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      })
    case 'perplexity':
      if (!process.env.PERPLEXITY_API_KEY) throw new Error('PERPLEXITY_API_KEY not configured')
      return new OpenAI({
        apiKey: process.env.PERPLEXITY_API_KEY,
        baseURL: 'https://api.perplexity.ai',
      })
    default:
      if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not configured')
      return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
}

/** Anthropic SDK client for Claude models */
export function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured')
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

// ─── Provider label (for logging / UI) ───────────────────────────────────────

export function providerLabel(provider: AIProvider, modelName: string): string {
  switch (provider) {
    case 'anthropic':  return modelName.includes('sonnet') ? 'Claude Sonnet' : 'Claude Haiku'
    case 'gemini':     return 'Gemini Flash'
    case 'perplexity': return 'Perplexity'
    default:           return modelName
  }
}
