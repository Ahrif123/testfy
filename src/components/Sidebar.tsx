import { NavLink, useLocation } from 'react-router'
import ThemeToggle from './ThemeToggle'
import { IconBackup, IconCases, IconDashboard, IconReports, IconRuns } from './Icons'

const links = [
  { to: '/dashboard', label: 'Dashboard', Icon: IconDashboard },
  { to: '/', label: 'Test cases', Icon: IconCases },
  { to: '/runs', label: 'Test runs', Icon: IconRuns },
  { to: '/reports', label: 'Reports', Icon: IconReports },
  { to: '/backup', label: 'Backup', Icon: IconBackup },
]

function readLastBackup(): string | null {
  try {
    return localStorage.getItem('testfy:lastBackup')
  } catch {
    return null
  }
}

export default function Sidebar() {
  useLocation() // re-reads "Last backup" every time you change page
  const lastBackup = readLastBackup()

  return (
    <aside className="flex flex-wrap items-center gap-3 bg-side px-4 py-3 text-side-ink md:w-60 md:shrink-0 md:flex-col md:flex-nowrap md:items-stretch md:gap-7 md:px-3.5 md:py-6">
      {/* Logo: a tilted "T" like an inspection stamp */}
      <div className="flex items-center gap-2.5 px-2">
        <span
          aria-hidden="true"
          className="grid h-[30px] w-[30px] -rotate-6 place-items-center rounded-[7px] border-2 border-pen font-display text-[15px] font-bold text-pen"
        >
          T
        </span>
        <span className="font-display text-[21px] leading-none font-bold tracking-tight text-side-ink-strong">
          Testfy
        </span>
      </div>

      <nav aria-label="Main" className="flex w-full gap-0.5 overflow-x-auto md:flex-col md:overflow-visible">
        {links.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-2.5 rounded-[7px] px-2.5 py-2 font-medium transition-colors ${
                isActive
                  ? 'bg-side-hover text-side-ink-strong shadow-[inset_3px_0_0_var(--pen)]'
                  : 'hover:bg-side-hover hover:text-side-ink-strong'
              }`
            }
          >
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="grid w-full gap-3 md:mt-auto md:px-1">
        <p className="hidden px-1.5 text-[13px] leading-snug md:block">
          Last backup <strong className="font-semibold text-side-ink-strong">{lastBackup ?? 'never'}</strong>
          <br />
          Your data stays in this browser.
        </p>
        <ThemeToggle />
      </div>
    </aside>
  )
}