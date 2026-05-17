// AI Provider Registry.
// Manages available AI providers, provides lookup by name, and exposes the default provider.
// Default configuration points to local Ollama at localhost:11434.

import type { AIProvider, AIProviderConfig, ProviderHealth } from './provider-types'
import { OllamaAdapter } from './ollama-adapter'

/**
 * Registry that manages available AI providers.
 * Singleton pattern; use getProviderRegistry() to access.
 */
class ProviderRegistry {
  private providers = new Map<string, AIProvider>()

  /**
   * Register a provider. Overwrites any existing provider with the same name.
   */
  registerProvider(provider: AIProvider): void {
    this.providers.set(provider.config.name, provider)
  }

  /**
   * Get a provider by name. Returns undefined if not found.
   */
  getProvider(name: string): AIProvider | undefined {
    return this.providers.get(name)
  }

  /**
   * Get the default provider (Ollama).
   * Creates and registers the default Ollama adapter on first access if not yet registered.
   */
  getDefaultProvider(): AIProvider {
    let provider = this.providers.get('ollama')
    if (!provider) {
      provider = new OllamaAdapter()
      this.registerProvider(provider)
    }
    return provider
  }

  /**
   * List all registered providers and their configs.
   */
  listProviders(): AIProviderConfig[] {
    return Array.from(this.providers.values()).map((p) => ({ ...p.config }))
  }

  /**
   * Check health of all registered providers in parallel.
   */
  async checkAllHealth(): Promise<ProviderHealth[]> {
    const providers = Array.from(this.providers.values())
    return Promise.all(providers.map((p) => p.checkHealth()))
  }

  /**
   * Remove a provider by name.
   */
  removeProvider(name: string): boolean {
    return this.providers.delete(name)
  }

  /**
   * Check if a provider is registered.
   */
  hasProvider(name: string): boolean {
    return this.providers.has(name)
  }
}

// Singleton instance
let _registry: ProviderRegistry | null = null

/**
 * Get the global provider registry. Creates it on first call.
 */
export function getProviderRegistry(): ProviderRegistry {
  if (!_registry) {
    _registry = new ProviderRegistry()
    // Auto-register the default Ollama provider
    _registry.registerProvider(new OllamaAdapter())
  }
  return _registry
}

/**
 * Convenience: get the default AI provider directly.
 */
export function getDefaultAIProvider(): AIProvider {
  return getProviderRegistry().getDefaultProvider()
}
