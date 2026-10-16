// Shared Tailwind class strings, so every page looks the same

export const inputClass =
  'w-full rounded-lg border border-rule bg-sheet px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-action'

const btnBase =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

export const btnPrimary = `${btnBase} bg-action text-on-action hover:brightness-110`
export const btnSecondary = `${btnBase} border border-rule bg-sheet text-ink hover:bg-paper`
export const btnDanger = 'text-sm font-semibold text-fail hover:underline'

export const panelClass = 'rounded-[10px] border border-rule bg-sheet'