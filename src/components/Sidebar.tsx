import { NavLink } from 'react-router'

const links = [
  { to: '/', label: 'Test Cases', icon: '📋' },
  { to: '/runs', label: 'Test Runs', icon: '▶️' },
  { to: '/reports', label: 'Reports', icon: '📄' },
]

export default function Sidebar() {
  return (
    <aside className="w-60 shrink-0 bg-slate-900 text-slate-300 flex flex-col">
      <div className="px-6 py-5 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white">
          Test<span className="text-emerald-400">fy</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">Manual test case manager</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-slate-800 text-white font-medium'
                  : 'hover:bg-slate-800/60 hover:text-white'
              }`
            }
          >
            <span>{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 text-xs text-slate-600 border-t border-slate-800">v0.1.0</div>
    </aside>
  )
}