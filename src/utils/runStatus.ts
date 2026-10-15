import type { StepResult, StepStatus } from '../types'

// Overall run status, based on each step:
// any Failed -> Failed, else any Blocked -> Blocked, else any Untested -> Untested,
// all Skipped -> Skipped, otherwise Passed
export function computeRunStatus(results: StepResult[]): StepStatus {
  const statuses = results.map((r) => r.status)
  if (statuses.includes('Failed')) return 'Failed'
  if (statuses.includes('Blocked')) return 'Blocked'
  if (statuses.includes('Untested')) return 'Untested'
  if (statuses.length > 0 && statuses.every((s) => s === 'Skipped')) return 'Skipped'
  return 'Passed'
}