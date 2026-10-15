import { db } from '../db'

// "System Settings" -> "SYS", "Authentication" -> "AUT"
export function modulePrefix(module: string): string {
  const firstWord = module.trim().toUpperCase().replace(/[^A-Z0-9 ]/g, '').split(/\s+/)[0]
  return firstWord ? firstWord.slice(0, 3) : 'GEN'
}

// Finds the highest existing number for this prefix and adds 1.
// Uses the highest number (not the count) so deleting a case never causes a duplicate ID.
export async function generateTcId(module: string): Promise<string> {
  const prefix = `TC-${modulePrefix(module)}-`
  const existing = await db.testCases.where('tcId').startsWith(prefix).toArray()
  const max = existing.reduce((highest, tc) => {
    const n = parseInt(tc.tcId.slice(prefix.length), 10)
    return isNaN(n) ? highest : Math.max(highest, n)
  }, 0)
  return `${prefix}${String(max + 1).padStart(3, '0')}`
}