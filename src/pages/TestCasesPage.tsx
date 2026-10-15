import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

export default function TestCasesPage() {
  // Re-runs automatically whenever the testCases table changes
  const testCases = useLiveQuery(() => db.testCases.orderBy('updatedAt').reverse().toArray())

  // TEMPORARY: adds a sample test case so we can verify saving works.
  // We'll remove this in Step 5.
  async function addSample() {
    const count = await db.testCases.count()
    const now = Date.now()
    await db.testCases.add({
      tcId: `TC-SYS-${String(count + 1).padStart(3, '0')}`,
      name: 'Log out from System Settings page',
      project: 'Client HRIS',
      module: 'System Settings',
      subModule: 'Logout',
      scenario: 'Verify that the user can log out successfully from the System Settings page.',
      preconditions: 'User is logged in as HR',
      priority: 'High',
      steps: [
        { id: crypto.randomUUID(), action: 'Click Log Out button', testData: '', expectedResult: 'User is redirected to the login page' },
      ],
      createdAt: now,
      updatedAt: now,
    })
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Test Cases</h2>
          <p className="text-sm text-slate-500">Write and manage your test cases.</p>
        </div>
        <div className="flex gap-2">
          {import.meta.env.DEV && (
            <button
              onClick={addSample}
              className="border border-slate-300 text-slate-600 text-sm px-4 py-2 rounded-md hover:bg-slate-100"
            >
              Add sample (dev)
            </button>
          )}
          <button
            disabled
            className="bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-md opacity-50 cursor-not-allowed"
          >
            + New Test Case
          </button>
        </div>
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
            </tr>
          </thead>
          <tbody>
            {testCases === undefined ? (
              <tr>
                <td colSpan={5} className="text-center text-slate-400 py-12">Loading…</td>
              </tr>
            ) : testCases.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-slate-400 py-12">
                  No test cases yet. Click <strong>+ New Test Case</strong> to create one.
                </td>
              </tr>
            ) : (
              testCases.map((tc) => (
                <tr key={tc.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{tc.tcId}</td>
                  <td className="px-4 py-3 text-slate-900">{tc.name}</td>
                  <td className="px-4 py-3 text-slate-600">{tc.module}</td>
                  <td className="px-4 py-3 text-slate-600">{tc.subModule}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-500">Not run</span>
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