import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router'
import { db } from '../db'
import { RunStatusBadge } from '../components/StatusBadge'

export default function TestRunsPage() {
  const navigate = useNavigate()

  const rows = useLiveQuery(async () => {
    const runs = await db.testRuns.orderBy('createdAt').reverse().toArray()
    const cases = await db.testCases.toArray()
    const casesById = new Map(cases.map((c) => [c.id, c]))
    return runs.map((run) => ({ run, testCase: casesById.get(run.testCaseId) }))
  })

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-slate-900">Test Runs</h2>
      <p className="text-sm text-slate-500 mb-6">
        Start a run with the <strong>▶ Run</strong> button on the Test Cases page.
      </p>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Date</th>
              <th className="text-left px-4 py-3 font-medium">TC ID</th>
              <th className="text-left px-4 py-3 font-medium">TC Name</th>
              <th className="text-left px-4 py-3 font-medium">Build</th>
              <th className="text-left px-4 py-3 font-medium">Environment</th>
              <th className="text-left px-4 py-3 font-medium">Tester</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows === undefined ? (
              <tr>
                <td colSpan={7} className="text-center text-slate-400 py-12">Loading…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-slate-400 py-12">No test runs yet.</td>
              </tr>
            ) : (
              rows.map(({ run, testCase }) => (
                <tr
                  key={run.id}
                  onClick={() => navigate(`/runs/${run.id}`)}
                  className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                >
                  <td className="px-4 py-3 text-slate-600">{run.testDate}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{testCase?.tcId ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-900">{testCase?.name ?? 'Deleted test case'}</td>
                  <td className="px-4 py-3 text-slate-600">{run.buildVersion || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{run.environment || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{run.tester}</td>
                  <td className="px-4 py-3">
                    <RunStatusBadge run={run} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}