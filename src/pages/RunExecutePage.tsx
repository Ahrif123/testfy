import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { db } from '../db'
import type { StepResult, StepStatus, TestCase, TestRun } from '../types'
import { computeRunStatus } from '../utils/runStatus'
import { inputClass } from '../utils/styles'
import { RunStatusBadge } from '../components/StatusBadge'

const STATUS_BUTTONS: StepStatus[] = ['Passed', 'Failed', 'Blocked', 'Skipped']

const activeButton: Record<StepStatus, string> = {
  Passed: 'bg-emerald-600 border-emerald-600 text-white',
  Failed: 'bg-red-600 border-red-600 text-white',
  Blocked: 'bg-orange-500 border-orange-500 text-white',
  Skipped: 'bg-slate-500 border-slate-500 text-white',
  Untested: '',
}

const cardBorder: Record<StepStatus, string> = {
  Passed: 'border-emerald-300',
  Failed: 'border-red-300',
  Blocked: 'border-orange-300',
  Skipped: 'border-slate-300',
  Untested: 'border-slate-200',
}

export default function RunExecutePage() {
  const { runId } = useParams()
  const id = Number(runId)
  const navigate = useNavigate()

  const [run, setRun] = useState<TestRun | null>(null)
  const [testCase, setTestCase] = useState<TestCase | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [blockPromptFrom, setBlockPromptFrom] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    db.testRuns.get(id).then(async (r) => {
      if (!r) {
        setNotFound(true)
        return
      }
      setRun(r)
      setTestCase((await db.testCases.get(r.testCaseId)) ?? null)
    })
  }, [id])

  if (notFound)
    return (
      <div className="p-8">
        <p className="text-slate-700">Test run not found.</p>
        <Link to="/runs" className="text-emerald-600 text-sm hover:underline">← Back to Test Runs</Link>
      </div>
    )
  if (!run) return <div className="p-8 text-slate-400">Loading…</div>

  // ---------- Saving (autosaves on every change) ----------
  const save = (results: StepResult[]) => {
    const status = computeRunStatus(results)
    setRun({ ...run, results, status })
    setError('')
    db.testRuns.update(id, { results, status })
  }

  const updateResult = (index: number, patch: Partial<StepResult>) => {
    save(run.results.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  const setStatus = (index: number, status: StepStatus) => {
    // Clicking the same status again resets the step to Untested
    const next = run.results[index].status === status ? 'Untested' : status
    updateResult(index, { status: next })

    const hasUntestedAfter = run.results.slice(index + 1).some((r) => r.status === 'Untested')
    setBlockPromptFrom(next === 'Failed' && hasUntestedAfter ? index : null)
  }

  const blockRemaining = () => {
    if (blockPromptFrom === null) return
    const from = blockPromptFrom
    save(
      run.results.map((r, i) =>
        i > from && r.status === 'Untested'
          ? { ...r, status: 'Blocked' as const, actualResult: r.actualResult || `Not executed — blocked by Step ${from + 1}.` }
          : r,
      ),
    )
    setBlockPromptFrom(null)
  }

  const completeRun = async () => {
    const untested = run.results.findIndex((r) => r.status === 'Untested')
    if (untested !== -1) return setError(`Step ${untested + 1} has no result yet.`)

    const missingActual = run.results.findIndex((r) => r.status === 'Failed' && !r.actualResult.trim())
    if (missingActual !== -1) return setError(`Step ${missingActual + 1} failed — enter the Actual Result before completing.`)

    await db.testRuns.update(id, { completedAt: run.completedAt ?? Date.now() })
    navigate('/runs')
  }

  const deleteRun = async () => {
    if (!confirm('Delete this test run? This cannot be undone.')) return
    await db.testRuns.delete(id)
    navigate('/runs')
  }

  const done = run.results.filter((r) => r.status !== 'Untested').length
  const total = run.results.length

  return (
    <div className="p-8 max-w-4xl">
      <Link to="/runs" className="text-sm text-slate-500 hover:text-slate-800">← Back to Test Runs</Link>

      <div className="flex items-start justify-between gap-4 mt-2 mb-1">
        <h2 className="text-2xl font-bold text-slate-900">
          <span className="font-mono">{testCase?.tcId ?? 'Deleted test case'}</span>
          {testCase && <span className="text-slate-500 font-normal"> — {testCase.name}</span>}
        </h2>
        <RunStatusBadge run={run} />
      </div>

      <p className="text-sm text-slate-500 mb-4">
        {[run.tester, run.testDate, run.buildVersion && `Build ${run.buildVersion}`, run.environment, run.browser]
          .filter(Boolean)
          .join(' · ')}
      </p>

      {testCase?.preconditions && (
        <p className="text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-md px-3 py-2 mb-4">
          <strong>Preconditions:</strong> {testCase.preconditions}
        </p>
      )}

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Progress · results save automatically</span>
          <span>{done} / {total} steps</span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {run.steps.map((step, i) => {
          const result = run.results[i]
          return (
            <div key={step.id} className={`bg-white border-2 rounded-lg p-5 ${cardBorder[result.status]}`}>
              <div className="flex gap-4">
                <div className="w-8 h-8 shrink-0 rounded-full bg-slate-900 text-white text-sm font-semibold flex items-center justify-center">
                  {i + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900">{step.action}</p>
                  {step.testData && (
                    <p className="text-xs text-slate-500 mt-1">
                      <span className="font-semibold">Test data:</span> {step.testData}
                    </p>
                  )}
                  <p className="text-sm text-slate-600 mt-2">
                    <span className="font-semibold text-slate-700">Expected Result:</span> {step.expectedResult}
                  </p>

                  <div className="flex flex-wrap gap-2 mt-4">
                    {STATUS_BUTTONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatus(i, s)}
                        className={`text-sm font-medium px-3 py-1.5 rounded-md border transition-colors ${
                          result.status === s ? activeButton[s] : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  {blockPromptFrom === i && (
                    <div className="mt-3 flex flex-wrap items-center gap-3 bg-orange-50 border border-orange-200 rounded-md px-3 py-2 text-sm text-orange-800">
                      <span>
                        Mark the remaining untested steps as <strong>Blocked</strong>?
                      </span>
                      <button type="button" onClick={blockRemaining} className="font-semibold underline">
                        Yes, block them
                      </button>
                      <button type="button" onClick={() => setBlockPromptFrom(null)} className="text-orange-600">
                        No
                      </button>
                    </div>
                  )}

                  {result.status !== 'Untested' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                      <label className="block">
                        <span className="block text-xs font-medium text-slate-600 mb-1">
                          Actual Result
                          {result.status === 'Failed' && <span className="text-red-500"> *</span>}
                        </span>
                        <textarea
                          rows={3}
                          className={inputClass}
                          value={result.actualResult}
                          onChange={(e) => updateResult(i, { actualResult: e.target.value })}
                          placeholder={result.status === 'Passed' ? 'Optional. Blank = "As expected."' : 'What actually happened?'}
                        />
                      </label>
                      <label className="block">
                        <span className="block text-xs font-medium text-slate-600 mb-1">QA Remarks</span>
                        <textarea
                          rows={3}
                          className={inputClass}
                          value={result.qaRemarks}
                          onChange={(e) => updateResult(i, { qaRemarks: e.target.value })}
                          placeholder="Optional notes, observations, bug ID…"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

      <div className="flex items-center justify-between mt-6">
        <button type="button" onClick={deleteRun} className="text-sm text-red-600 hover:underline">
          Delete run
        </button>
        <button
          type="button"
          onClick={completeRun}
          className="bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-emerald-700"
        >
          {run.completedAt ? 'Save & Close' : 'Complete Run'}
        </button>
      </div>
    </div>
  )
}