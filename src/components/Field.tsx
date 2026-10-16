import type { ReactNode } from 'react'

export default function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-semibold text-ink-soft">
        {label}
        {required && <span className="font-medium text-fail"> (required)</span>}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs font-medium text-fail">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-xs text-ink-faint">{hint}</span>
      )}
    </label>
  )
}