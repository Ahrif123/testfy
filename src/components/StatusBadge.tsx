import type { StepStatus, TestRun } from '../types'

const styles: Record<StepStatus, string> = {
  Passed: 'bg-emerald-100 text-emerald-700',
  Failed: 'bg-red-100 text-red-700',
  Blocked: 'bg-orange-100 text-orange-700',
  Skipped: 'bg-slate-200 text-slate-600',
  Untested: 'bg-slate-100 text-slate-500',
}

export default function StatusBadge({ status, label }: { status: StepStatus; label?: string }) {
  return (
    <span className={`inline-block text-xs font-medium px-2 py-1 rounded-full ${styles[status]}`}>
      {label ?? status}
    </span>
  )
}

// Shows "In progress" until the run is completed
export function RunStatusBadge({ run }: { run: TestRun }) {
  return run.completedAt ? <StatusBadge status={run.status} /> : <StatusBadge status="Untested" label="In progress" />
}