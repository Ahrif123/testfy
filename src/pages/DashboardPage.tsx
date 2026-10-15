import { Link, useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { TestCase, TestRun } from '../types'
import { RunStatusBadge } from '../components/StatusBadge'
import { formatDate } from '../utils/report/buildReport'

type Bucket = 'Passed' | 'Failed' | 'Blocked' | 'Skipped' | 'In progress' | 'Not run'
const BUCKETS: Bucket[] = ['Passed', 'Failed', 'Blocked', 'Skipped', 'In progress', 'Not run']

// Status colors were checked for colorblind safety.
// They always appear with a legend and written counts, never color alone.
const BUCKET_COLOR: Record<Bucket, string> = {
  Passed: 'bg-emerald-600',
  Failed: 'bg-red-600',
  Blocked: 'bg-amber-500',
  Skipped: 'bg-slate-400',
  'In progress': 'bg-slate-300',
  'Not run': 'bg-slate-200',
}

type CaseRow = { testCase: TestCase; lastRun?: TestRun; bucket: Bucket }

const emptyCounts = (): Record<Bucket, number> => ({
  Passed: 0,
  Failed: 0,
  Blocked: 0,
  Skipped: 0,
  'In progress': 0,
  'Not run': 0,
})

function bucketOf(run?: TestRun): Bucket {
  if (!run) return 'Not run'
  if (run.status === 'Untested') return 'In progress'
  return run.status
}

export default function DashboardPage() {
  const navigate = useNavigate()

  const data = useLiveQuery(async () => {
    const [cases, runs] = await Promise.all([db.testCases.toArray(), db.testRuns.orderBy('createdAt').toArray()])

    // Latest run per test case (later runs overwrite earlier ones)
    const latest = new Map<number, TestRun>()
    for (const run of runs) latest.set(run.testCaseId, run)

    const rows: CaseRow[] = cases.map((testCase) => {
      const lastRun = testCase.id !== undefined ? latest.get(testCase.id) : undefined
      return { testCase, lastRun, bucket: bucketOf(lastRun) }
    })

    const casesById = new Map(cases.map((c) => [c.id, c]))
    const recent = runs
      .slice(-5)
      .reverse()
      .map((run) => ({ run, testCase: casesById.get(run.testCaseId) }))

    return { rows, recent }
  })

  if (!data) return <div className="p-8 text-slate-400">Loading…</div>
  const { rows, recent } = data

  // ---------- Empty state ----------
  if (rows.length === 0) {
    return (
      <div className="p-8">
        <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
        <div className="mt-6 bg-white border border-slate-200 rounded-lg p-10 text-center max-w-xl">
          <p className="text-slate-700 font-medium">No test cases yet</p>
          <p className="text-sm text-slate-500 mt-1">Create your first test case to see your testing progress here.</p>
          <Link
            to="/cases/new"
            className="inline-block mt-4 bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-emerald-700"
          >
            + New Test Case
          </Link>
        </div>
      </div>
    )
  }

  // ---------- Totals ----------
  const totals = emptyCounts()
  for (const r of rows) totals[r.bucket]++
  const finished = totals.Passed + totals.Failed + totals.Blocked + totals.Skipped
  const executed = rows.length - totals['Not run']
  const passRate = finished > 0 ? Math.round((totals.Passed / finished) * 100) : null

  // ---------- Per module ----------
  const byModule = new Map<string, Record<Bucket, number>>()
  for (const r of rows) {
    const key = r.testCase.module || '(No module)'
    const counts = byModule.get(key) ?? emptyCounts()
    counts[r.bucket]++
    byModule.set(key, counts)
  }
  const modules = [...byModule.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  const bucketsInUse = BUCKETS.filter((b) => totals[b] > 0)

  // ---------- Needs attention ----------
  const attention = rows
    .filter((r) => r.bucket === 'Failed' || r.bucket === 'Blocked')
    .sort((a, b) => a.testCase.tcId.localeCompare(b.testCase.tcId, undefined, { numeric: true }))

  return (
    <div className="p-8 max-w-6xl">
      <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
      <p className="text-sm text-slate-500 mb-6">Based on each test case's most recent run.</p>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Stat label="Test Cases" value={rows.length} />
        <Stat label="Executed" value={executed} sub={`of ${rows.length} test cases`} />
        <Stat
          label="Pass Rate"
          value={passRate === null ? '—' : `${passRate}%`}
          sub={finished > 0 ? `${totals.Passed} of ${finished} finished` : 'No finished runs yet'}
        />
        <Stat label="Failed" value={totals.Failed} dot={BUCKET_COLOR.Failed} />
        <Stat label="Blocked" value={totals.Blocked} dot={BUCKET_COLOR.Blocked} />
      </div>

      {/* Results by module */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 mb-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-5">
          <h3 className="font-semibold text-slate-900">Results by Module</h3>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {bucketsInUse.map((b) => (
              <li key={b} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className={`w-2.5 h-2.5 rounded-sm ${BUCKET_COLOR[b]}`} />
                {b}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-5">
          {modules.map(([name, counts]) => {
            const total = BUCKETS.reduce((sum, b) => sum + counts[b], 0)
            const present = BUCKETS.filter((b) => counts[b] > 0)
            return (
              <div key={name}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-slate-800">{name}</span>
                  <span className="text-slate-500">
                    {counts.Passed}/{total} passed
                  </span>
                </div>
                <div
                  className="flex h-3 gap-0.5"
                  role="img"
                  aria-label={`${name}: ${present.map((b) => `${counts[b]} ${b}`).join(', ')}`}
                >
                  {present.map((b) => (
                    <div
                      key={b}
                      title={`${b}: ${counts[b]}`}
                      className={`${BUCKET_COLOR[b]} basis-0 min-w-1 first:rounded-l last:rounded-r hover:opacity-80`}
                      style={{ flexGrow: counts[b] }}
                    />
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  {present.map((b) => `${counts[b]} ${b.toLowerCase()}`).join(' · ')}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Needs attention */}
        <section className="bg-white border border-slate-200 rounded-lg p-6">
          <h3 className="font-semibold text-slate-900 mb-3">
            Needs Attention{attention.length > 0 && <span className="text-slate-400 font-normal"> ({attention.length})</span>}
          </h3>
          {attention.length === 0 ? (
            <p className="text-sm text-slate-500">No failed or blocked test cases. 🎉</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {attention.map(({ testCase, lastRun, bucket }) => {
                const stepIndex = lastRun ? lastRun.results.findIndex((r) => r.status === bucket) : -1
                const stepResult = lastRun && stepIndex >= 0 ? lastRun.results[stepIndex] : undefined
                const note = stepResult ? stepResult.qaRemarks || stepResult.actualResult : ''
                return (
                  <li key={testCase.id}>
                    <button
                      type="button"
                      onClick={() => lastRun && navigate(`/runs/${lastRun.id}`)}
                      className="w-full text-left py-3 px-2 -mx-2 rounded hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-700 shrink-0">{testCase.tcId}</span>
                        <span className="text-sm text-slate-900 truncate">{testCase.name}</span>
                        <span className="ml-auto shrink-0">{lastRun && <RunStatusBadge run={lastRun} />}</span>
                      </div>
                      {stepIndex >= 0 && (
                        <p className="text-xs text-slate-500 mt-1 truncate">
                          <strong className="text-slate-600">Step {stepIndex + 1}</strong>
                          {note && `: ${note}`}
                        </p>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Recent runs */}
        <section className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="font-semibold text-slate-900">Recent Runs</h3>
            <Link to="/runs" className="text-xs text-emerald-700 hover:underline">
              View all →
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-500">No runs yet. Use ▶ Run on the Test Cases page.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map(({ run, testCase }) => (
                <li key={run.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/runs/${run.id}`)}
                    className="w-full text-left py-3 px-2 -mx-2 rounded hover:bg-slate-50 flex items-center gap-3"
                  >
                    <span className="text-xs text-slate-500 w-16 shrink-0">{formatDate(run.testDate)}</span>
                    <span className="font-mono text-xs text-slate-700 shrink-0">{testCase?.tcId ?? '—'}</span>
                    <span className="text-sm text-slate-900 truncate">{testCase?.name ?? 'Deleted test case'}</span>
                    <span className="ml-auto shrink-0">
                      <RunStatusBadge run={run} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function Stat({ label, value, sub, dot }: { label: string; value: number | string; sub?: string; dot?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500 uppercase tracking-wide">
        {dot && <span className={`w-2 h-2 rounded-full ${dot}`} />}
        {label}
      </p>
      <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  )
}