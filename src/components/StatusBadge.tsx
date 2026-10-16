import type { StepStatus, TestRun } from '../types'

const styles: Record<StepStatus, string> = {
  Passed: 'bg-pass-bg text-pass',
  Failed: 'bg-fail-bg text-fail',
  Blocked: 'bg-block-bg text-block',
  Skipped: 'bg-skip-bg text-skip',
  Untested: 'border border-rule bg-sheet text-ink-faint',
}

export default function StatusBadge({ status, label }: { status: StepStatus; label?: string }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}>
      {label ?? status}
    </span>
  )
}

// Shows the result once every step has one; "In progress" while steps are still untested
export function RunStatusBadge({ run }: { run: TestRun }) {
  return run.status === 'Untested' ? (
    <StatusBadge status="Untested" label="In progress" />
  ) : (
    <StatusBadge status={run.status} />
  )
}