import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { TestCase, TestRun } from '../types'
import StatusBadge, { RunStatusBadge } from '../components/StatusBadge'
import { inputClass } from '../utils/styles'
import { exportRunsToWord } from '../utils/report/exportReport'
import { formatDate } from '../utils/report/buildReport'

type Row = { testCase: TestCase; lastRun: TestRun | undefined }

const ALL = '__all__'
const idOf = (row: Row) => row.testCase.id ?? -1
const uniqueSorted = (values: string[]) => [...new Set(values.filter(Boolean))].sort()

export default function ReportsPage() {
  // Every test case + its most recent run, sorted by TC ID (TC-SYS-2 before TC-SYS-10)
  const data = useLiveQuery(async () => {
    const [cases, runs] = await Promise.all([db.testCases.toArray(), db.testRuns.orderBy('createdAt').toArray()])
    const latest = new Map<number, TestRun>()
    for (const run of runs) latest.set(run.testCaseId, run)
    return cases
      .map((testCase) => ({ testCase, lastRun: testCase.id !== undefined ? latest.get(testCase.id) : undefined }))
      .sort((a, b) => a.testCase.tcId.localeCompare(b.testCase.tcId, undefined, { numeric: true }))
  })

  const [project, setProject] = useState(ALL)
  const [module, setModule] = useState(ALL)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [includePassword, setIncludePassword] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  const rows: Row[] = data ?? []
  const projects = uniqueSorted(rows.map((r) => r.testCase.project))
  const inProject = rows.filter((r) => project === ALL || r.testCase.project === project)
  const modules = uniqueSorted(inProject.map((r) => r.testCase.module))
  const visible = inProject.filter((r) => module === ALL || r.testCase.module === module)
  const selectable = visible.filter((r) => r.lastRun) // only cases that have been run
  const chosen = selectable.filter((r) => selected.has(idOf(r)))
  const allSelected = selectable.length > 0 && chosen.length === selectable.length

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectable.map(idOf)))
  }

  function changeProject(value: string) {
    setProject(value)
    setModule(ALL)
    setSelected(new Set())
  }

  function changeModule(value: string) {
    setModule(value)
    setSelected(new Set())
  }

  async function handleExport() {
    const runIds = chosen.map((r) => r.lastRun?.id).filter((id): id is number => id !== undefined)
    if (runIds.length === 0) return

    const today = new Date().toLocaleDateString('en-CA')
    const projectName = project === ALL ? '' : project
    const moduleName = module === ALL ? 'All Modules' : module
    const subtitle = [projectName, `Module: ${moduleName}`, `Exported ${formatDate(today)}`].filter(Boolean).join('  •  ')

    setExporting(true)
    setError('')
    try {
      await exportRunsToWord(runIds, { includePassword, subtitle }, `${projectName || 'Testfy'}_${moduleName}_${today}.docx`)
    } catch (err) {
      console.error(err)
      setError('Could not export the report. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-slate-900">Reports</h2>
      <p className="text-sm text-slate-500 mb-6">
        Export several test cases into one Word file. Each test case uses its most recent run.
      </p>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1">Project</span>
          <select className={inputClass} value={project} onChange={(e) => changeProject(e.target.value)}>
            <option value={ALL}>All projects</option>
            {projects.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 mb-1">Module</span>
          <select className={inputClass} value={module} onChange={(e) => changeModule(e.target.value)}>
            <option value={ALL}>All modules</option>
            {modules.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Export bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <span className="text-sm text-slate-600">
          <strong>{chosen.length}</strong> of {selectable.length} selected
          {visible.length > selectable.length && (
            <span className="text-slate-400"> · {visible.length - selectable.length} not run yet</span>
          )}
        </span>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includePassword}
              onChange={(e) => setIncludePassword(e.target.checked)}
              className="accent-emerald-600"
            />
            Include password
          </label>
          <button
            type="button"
            onClick={handleExport}
            disabled={chosen.length === 0 || exporting}
            className="bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? 'Generating…' : `📄 Export ${chosen.length || ''} to Word`}
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={allSelected}
                  disabled={selectable.length === 0}
                  onChange={toggleAll}
                  className="accent-emerald-500"
                />
              </th>
              <th className="text-left px-4 py-3 font-medium">TC ID</th>
              <th className="text-left px-4 py-3 font-medium">TC Name</th>
              <th className="text-left px-4 py-3 font-medium">Module</th>
              <th className="text-left px-4 py-3 font-medium">Sub Module</th>
              <th className="text-left px-4 py-3 font-medium">Last Run</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {data === undefined ? (
              <tr>
                <td colSpan={7} className="text-center text-slate-400 py-12">Loading…</td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-slate-400 py-12">
                  {rows.length === 0 ? 'No test cases yet.' : 'No test cases match these filters.'}
                </td>
              </tr>
            ) : (
              visible.map((row) => {
                const id = idOf(row)
                const canSelect = row.lastRun !== undefined
                return (
                  <tr
                    key={id}
                    onClick={() => canSelect && toggle(id)}
                    className={`border-t border-slate-100 ${
                      canSelect ? 'cursor-pointer hover:bg-slate-50' : 'opacity-50'
                    } ${selected.has(id) && canSelect ? 'bg-emerald-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${row.testCase.tcId}`}
                        checked={canSelect && selected.has(id)}
                        disabled={!canSelect}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggle(id)}
                        className="accent-emerald-600"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{row.testCase.tcId}</td>
                    <td className="px-4 py-3 text-slate-900">{row.testCase.name}</td>
                    <td className="px-4 py-3 text-slate-600">{row.testCase.module}</td>
                    <td className="px-4 py-3 text-slate-600">{row.testCase.subModule || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{row.lastRun ? formatDate(row.lastRun.testDate) : '—'}</td>
                    <td className="px-4 py-3">
                      {row.lastRun ? <RunStatusBadge run={row.lastRun} /> : <StatusBadge status="Untested" label="Not run" />}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}