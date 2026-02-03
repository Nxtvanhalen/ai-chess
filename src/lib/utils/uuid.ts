import { loadUuid } from './dynamicImports';

/**
 * Dynamically imported UUID v4 generator
 * Reduces bundle size by loading UUID library only when needed
 */
export async function generateId(): Promise<string> {
  const { v4: uuidv4 } = await loadUuid();
  return uuidv4();
}

// Simple ID generator fallback for when we don't need cryptographically secure IDs
// This is much smaller than UUID and sufficient for component keys
export function generateSimpleId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
