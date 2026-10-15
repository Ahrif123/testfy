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
      <span className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
      {error ? (
        <span className="block text-xs text-red-600 mt-1">{error}</span>
      ) : (
        hint && <span className="block text-xs text-slate-400 mt-1">{hint}</span>
      )}
    </label>
  )
}