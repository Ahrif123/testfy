export default function TestCasesPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Test Cases</h2>
          <p className="text-sm text-slate-500">Write and manage your test cases.</p>
        </div>
        <button
          disabled
          className="bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-md opacity-50 cursor-not-allowed"
        >
          + New Test Case
        </button>
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
            <tr>
              <td colSpan={5} className="text-center text-slate-400 py-12">
                No test cases yet. Click <strong>+ New Test Case</strong> to create one.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}