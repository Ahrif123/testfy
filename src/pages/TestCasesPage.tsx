import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { Link, useNavigate } from 'react-router'
import type { TestRun } from '../types'
import StatusBadge, { RunStatusBadge } from '../components/StatusBadge'

export default function TestCasesPage() {
    // Re-runs automatically whenever the testCases table changes
    const testCases = useLiveQuery(() => db.testCases.orderBy('updatedAt').reverse().toArray())

    // Latest run for each test case (later runs overwrite earlier ones in the map)
    const latestRuns = useLiveQuery(async () => {
        const runs = await db.testRuns.orderBy('createdAt').toArray()
        const map = new Map<number, TestRun>()
        for (const run of runs) map.set(run.testCaseId, run)
        return map
    })

    function renderLastStatus(caseId?: number) {
        const last = caseId !== undefined ? latestRuns?.get(caseId) : undefined
        return last ? <RunStatusBadge run={last} /> : <StatusBadge status="Untested" label="Not run" />
    }

    const navigate = useNavigate()

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Test Cases</h2>
                    <p className="text-sm text-slate-500">Write and manage your test cases.</p>
                </div>
                <Link
                    to="/cases/new"
                    className="bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-emerald-700"
                >
                    + New Test Case
                </Link>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-900 text-white">
                        <tr>
                            <th className="text-left px-4 py-3 font-medium">TC ID</th>
                            <th className="text-left px-4 py-3 font-medium">TC Name</th>
                            <th className="text-left px-4 py-3 font-medium">Module</th>
                            <th className="text-left px-4 py-3 font-medium">Sub Module</th>
                            <th className="text-left px-4 py-3 font-medium">Last Status</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {testCases === undefined ? (
                            <tr>
                                <td colSpan={6} className="text-center text-slate-400 py-12">Loading…</td>
                            </tr>
                        ) : testCases.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center text-slate-400 py-12">
                                    No test cases yet. Click <strong>+ New Test Case</strong> to create one.
                                </td>
                            </tr>
                        ) : (
                            testCases.map((tc) => (
                                <tr
                                    key={tc.id}
                                    onClick={() => navigate(`/cases/${tc.id}/edit`)}
                                    className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer">
                                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{tc.tcId}</td>
                                    <td className="px-4 py-3 text-slate-900">{tc.name}</td>
                                    <td className="px-4 py-3 text-slate-600">{tc.module}</td>
                                    <td className="px-4 py-3 text-slate-600">{tc.subModule}</td>
                                    <td className="px-4 py-3">{renderLastStatus(tc.id)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation() // don't also open the edit page
                                                navigate(`/cases/${tc.id}/run`)
                                            }}
                                            className="text-xs font-medium text-emerald-700 border border-emerald-600 px-3 py-1 rounded-md hover:bg-emerald-50"
                                        >
                                            ▶ Run
                                        </button>
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