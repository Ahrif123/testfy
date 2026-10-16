import { useEffect, useState } from 'react'
import { IconMoon, IconSun } from './Icons'

type Theme = 'light' | 'dark'
const STORAGE_KEY = 'testfy:theme'

// The chosen theme, or the computer's setting if nothing was chosen yet
function currentTheme(): Theme {
  const chosen = document.documentElement.dataset.theme
  if (chosen === 'light' || chosen === 'dark') return chosen
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(currentTheme)

  // While no choice is saved, follow the computer if its setting changes
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (!document.documentElement.dataset.theme) setTheme(currentTheme())
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // storage blocked: the theme still changes for this visit
    }
    setTheme(next)
  }

  const isDark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex items-center gap-2.5 rounded-[7px] border border-side-hover px-2.5 py-2 text-sm font-medium text-side-ink transition-colors hover:bg-side-hover hover:text-side-ink-strong"
    >
      {isDark ? <IconSun /> : <IconMoon />}
      {isDark ? 'Light mode' : 'Dark mode'}
    </button>
  )
}