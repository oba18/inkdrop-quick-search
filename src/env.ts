import type { Environment } from '@inkdropapp/types'

/**
 * Captures the `Environment` handed to `activate()` so other modules can reach
 * it without the (discouraged) global `inkdrop`.
 */
let captured: Environment | undefined

export function setEnv(env: Environment | undefined): void {
  captured = env
}

export function getEnv(): Environment {
  if (!captured) throw new Error('[quick-search] env accessed before activate()')
  return captured
}

export interface QuickSearchConfig {
  /** Notebook names whose notes are left out of the results */
  excludeNotebooks: string[]
  maxResults: number
}

export function getConfig(): QuickSearchConfig {
  const { config } = getEnv()
  return {
    excludeNotebooks: String(config.get('quick-search.excludeNotebooks') ?? '')
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean),
    maxResults: config.get('quick-search.maxResults') ?? 50
  }
}
