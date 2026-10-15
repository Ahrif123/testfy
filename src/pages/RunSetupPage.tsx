import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import Field from '../components/Field'
import { inputClass } from '../utils/styles'

type Setup = {
  tester: string
  testDate: string
  buildVersion: string
  environment: string
  environmentUrl: string
  browser: string
  credentialsUsername: string
  credentialsPassword: string
}

// Uses your LOCAL date. toISOString() uses UTC, which would show
// yesterday's date if you test before 8 AM Philippine time.
const today = () => new Date().toLocaleDateString('en-CA')

export default function RunSetupPage() {
  const { caseId } = useParams()
  const id = Number(caseId)
  const navigate = useNavigate()

  // undefined = still loading, null = not found
  const testCase = useLiveQuery(async () => (await db.testCases.get(id)) ?? null, [id])

  const [setup, setSetup] = useState<Setup>({
    tester: '',
    testDate: today(),
    buildVersion: '',
    environment: 'SIT',
    environmentUrl: '',
    browser: 'Google Chrome',
    credentialsUsername: '',
    credentialsPassword: '',
  })
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)

  // Pre-fill from your most recent run (date always stays as today)
  useEffect(() => {
    db.testRuns.orderBy('createdAt').last().then((last) => {
      if (!last) return
      setSetup((s) => ({
        ...s,
        tester: last.tester,
        buildVersion: last.buildVersion,
        environment: last.environment,
        environmentUrl: last.environmentUrl,
        browser: last.browser,
        credentialsUsername: last.credentialsUsername,
        credentialsPassword: last.credentialsPassword,
      }))
    })
  }, [])

  function update(key: keyof Setup, value: string) {
    setSetup((s) => ({ ...s, [key]: value }))
    setError('')
  }

  async function startRun() {
    if (!testCase || testCase.id === undefined) return
    if (!setup.tester.trim()) {
      setError('Tester name is required.')
      return
    }

    setStarting(true)
    const runId = await db.testRuns.add({
      testCaseId: testCase.id,
      steps: testCase.steps,
      tester: setup.tester.trim(),
      testDate: setup.testDate,
      buildVersion: setup.buildVersion.trim(),
      environment: setup.environment.trim(),
      environmentUrl: setup.environmentUrl.trim(),
      browser: setup.browser.trim(),
      credentialsUsername: setup.credentialsUsername.trim(),
      credentialsPassword: setup.credentialsPassword,
      results: testCase.steps.map((s) => ({
        stepId: s.id,
        status: 'Untested' as const,
        actualResult: '',
        qaRemarks: '',
        screenshotIds: [],
      })),
      status: 'Untested',
      createdAt: Date.now(),
    })
    navigate(`/runs/${runId}`, { replace: true })
  }

  if (testCase === undefined) return <div className="p-8 text-slate-400">Loading…</div>
  if (testCase === null)
    return (
      <div className="p-8">
        <p className="text-slate-700">Test case not found.</p>
        <Link to="/" className="text-emerald-600 text-sm hover:underline">← Back to Test Cases</Link>
      </div>
    )

  return (
    <div className="p-8 max-w-3xl">
      <Link to="/" className="text-sm text-slate-500 hover:text-slate-800">← Back to Test Cases</Link>
      <h2 className="text-2xl font-bold text-slate-900 mt-2">Start Test Run</h2>
      <p className="text-sm text-slate-500 mb-6">
        <span className="font-mono">{testCase.tcId}</span> — {testCase.name} · {testCase.steps.length} step
        {testCase.steps.length !== 1 && 's'}
      </p>

      <section className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
        <h3 className="font-semibold text-slate-900 mb-4">Run Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Tester" required error={error || undefined}>
            <input className={inputClass} value={setup.tester} onChange={(e) => update('tester', e.target.value)} placeholder="e.g. Ahrif Cruz" />
          </Field>

          <Field label="Test Date">
            <input type="date" className={inputClass} value={setup.testDate} onChange={(e) => update('testDate', e.target.value)} />
          </Field>

          <Field label="Build Version">
            <input className={inputClass} value={setup.buildVersion} onChange={(e) => update('buildVersion', e.target.value)} placeholder="e.g. v2.4.1" />
          </Field>

          <Field label="Browser">
            <input list="browser-options" className={inputClass} value={setup.browser} onChange={(e) => update('browser', e.target.value)} />
            <datalist id="browser-options">
              <option value="Google Chrome" />
              <option value="Microsoft Edge" />
              <option value="Mozilla Firefox" />
              <option value="Safari" />
            </datalist>
          </Field>

          <Field label="Environment">
            <input list="env-options" className={inputClass} value={setup.environment} onChange={(e) => update('environment', e.target.value)} />
            <datalist id="env-options">
              <option value="SIT" />
              <option value="UAT" />
              <option value="Non Prod" />
              <option value="Production" />
            </datalist>
          </Field>

          <Field label="Environment URL">
            <input className={inputClass} value={setup.environmentUrl} onChange={(e) => update('environmentUrl', e.target.value)} placeholder="https://..." />
          </Field>

          <Field label="Test Username">
            <input className={inputClass} value={setup.credentialsUsername} onChange={(e) => update('credentialsUsername', e.target.value)} />
          </Field>

          <Field label="Test Password">
            <input type="password" className={inputClass} value={setup.credentialsPassword} onChange={(e) => update('credentialsPassword', e.target.value)} />
          </Field>
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <Link to="/" className="border border-slate-300 text-slate-600 text-sm px-4 py-2 rounded-md hover:bg-slate-100">
          Cancel
        </Link>
        <button
          type="button"
          onClick={startRun}
          disabled={starting}
          className="bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-emerald-700 disabled:opacity-50"
        >
          {starting ? 'Starting…' : '▶ Start Run'}
        </button>
      </div>
    </div>
  )
}