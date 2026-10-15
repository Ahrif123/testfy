import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { db } from '../db'
import type { Priority, TestCase, TestStep } from '../types'
import { generateTcId } from '../utils/tcId'
import { inputClass } from '../utils/styles'
import Field from '../components/Field'

type FormState = Omit<TestCase, 'id' | 'createdAt' | 'updatedAt'>
type Errors = Partial<Record<string, string>>

const newStep = (): TestStep => ({ id: crypto.randomUUID(), action: '', testData: '', expectedResult: '' })

const emptyForm = (): FormState => ({
    tcId: '',
    name: '',
    project: '',
    module: '',
    subModule: '',
    scenario: '',
    preconditions: '',
    priority: 'Medium',
    steps: [newStep()],
})


const iconBtn =
    'w-7 h-7 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent'

export default function TestCaseFormPage() {
    const { id } = useParams()
    const caseId = id ? Number(id) : undefined
    const isEdit = caseId !== undefined
    const navigate = useNavigate()

    const [form, setForm] = useState<FormState>(emptyForm)
    const [tcIdTouched, setTcIdTouched] = useState(false)
    const [errors, setErrors] = useState<Errors>({})
    const [loading, setLoading] = useState(isEdit)
    const [saving, setSaving] = useState(false)

    // Load the test case when editing, or pre-fill Project when creating
    useEffect(() => {
        if (caseId !== undefined) {
            db.testCases.get(caseId).then((tc) => {
                if (!tc) {
                    navigate('/', { replace: true })
                    return
                }
                setForm({
                    tcId: tc.tcId,
                    name: tc.name,
                    project: tc.project,
                    module: tc.module,
                    subModule: tc.subModule,
                    scenario: tc.scenario,
                    preconditions: tc.preconditions,
                    priority: tc.priority,
                    steps: tc.steps.length > 0 ? tc.steps : [newStep()],
                })
                setTcIdTouched(true)
                setLoading(false)
            })
        } else {
            db.testCases.orderBy('updatedAt').last().then((last) => {
                if (last) setForm((f) => ({ ...f, project: last.project }))
            })
        }
    }, [caseId, navigate])

    function update<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((f) => ({ ...f, [key]: value }))
        if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
    }

    async function handleModuleBlur() {
        if (!isEdit && !tcIdTouched && form.module.trim()) {
            update('tcId', await generateTcId(form.module))
        }
    }

    // ---------- Steps ----------
    function updateStep(index: number, key: 'action' | 'testData' | 'expectedResult', value: string) {
        setForm((f) => ({
            ...f,
            steps: f.steps.map((s, i) => (i === index ? { ...s, [key]: value } : s)),
        }))
        if (errors.steps) setErrors((e) => ({ ...e, steps: undefined }))
    }

    function addStep() {
        setForm((f) => ({ ...f, steps: [...f.steps, newStep()] }))
    }

    function removeStep(index: number) {
        setForm((f) => ({
            ...f,
            steps: f.steps.length === 1 ? [newStep()] : f.steps.filter((_, i) => i !== index),
        }))
    }

    function moveStep(index: number, direction: -1 | 1) {
        setForm((f) => {
            const target = index + direction
            if (target < 0 || target >= f.steps.length) return f
            const steps = [...f.steps]
                ;[steps[index], steps[target]] = [steps[target], steps[index]]
            return { ...f, steps }
        })
    }

    // ---------- Save / Delete ----------
    function validate(steps: TestStep[]): Errors {
        const e: Errors = {}
        if (!form.tcId.trim()) e.tcId = 'TC ID is required.'
        if (!form.name.trim()) e.name = 'TC Name is required.'
        if (!form.module.trim()) e.module = 'Module is required.'
        if (!form.scenario.trim()) e.scenario = 'Test Scenario is required.'
        if (steps.length === 0) e.steps = 'Add at least one step.'
        else if (steps.some((s) => !s.action.trim() || !s.expectedResult.trim()))
            e.steps = 'Every step needs an Action and an Expected Result.'
        return e
    }

    async function handleSave() {
        // Completely empty steps are ignored instead of blocking the save
        const steps = form.steps.filter((s) => s.action.trim() || s.testData.trim() || s.expectedResult.trim())
        const tcId = form.tcId.trim().toUpperCase()
        const e = validate(steps)

        if (!e.tcId) {
            const clash = await db.testCases.where('tcId').equals(tcId).first()
            if (clash && clash.id !== caseId) e.tcId = `${tcId} is already used by another test case.`
        }

        if (Object.keys(e).length > 0) {
            setErrors(e)
            return
        }

        setSaving(true)
        const data: FormState = {
            ...form,
            tcId,
            steps,
            name: form.name.trim(),
            project: form.project.trim(),
            module: form.module.trim(),
            subModule: form.subModule.trim(),
            scenario: form.scenario.trim(),
            preconditions: form.preconditions.trim(),
        }
        const now = Date.now()

        try {
            if (caseId !== undefined) {
                await db.testCases.update(caseId, { ...data, updatedAt: now })
            } else {
                await db.testCases.add({ ...data, createdAt: now, updatedAt: now })
            }
            navigate('/')
        } catch (err) {
            console.error(err)
            setErrors({ form: 'Could not save the test case. Please try again.' })
            setSaving(false)
        }
    }

    async function handleDelete() {
        if (caseId === undefined) return
        if (!confirm(`Delete ${form.tcId} and all of its test runs? This cannot be undone.`)) return
        await db.transaction('rw', db.testCases, db.testRuns, async () => {
            await db.testRuns.where('testCaseId').equals(caseId).delete()
            await db.testCases.delete(caseId)
        })
        navigate('/')
    }

    if (loading) return <div className="p-8 text-slate-400">Loading…</div>

    return (
        <div className="p-8 max-w-5xl">
            <Link to="/" className="text-sm text-slate-500 hover:text-slate-800">
                ← Back to Test Cases
            </Link>
            <h2 className="text-2xl font-bold text-slate-900 mt-2 mb-6">
                {isEdit ? `Edit ${form.tcId}` : 'New Test Case'}
            </h2>

            {/* ---------- Details ---------- */}
            <section className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-slate-900 mb-4">Test Case Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Project">
                        <input
                            className={inputClass}
                            value={form.project}
                            onChange={(e) => update('project', e.target.value)}
                            placeholder="e.g. Client HRIS"
                        />
                    </Field>

                    <Field label="Priority">
                        <select
                            className={inputClass}
                            value={form.priority}
                            onChange={(e) => update('priority', e.target.value as Priority)}
                        >
                            <option>High</option>
                            <option>Medium</option>
                            <option>Low</option>
                        </select>
                    </Field>

                    <Field label="Module" required error={errors.module}>
                        <input
                            className={inputClass}
                            value={form.module}
                            onChange={(e) => update('module', e.target.value)}
                            onBlur={handleModuleBlur}
                            placeholder="e.g. System Settings"
                        />
                    </Field>

                    <Field label="Sub Module">
                        <input
                            className={inputClass}
                            value={form.subModule}
                            onChange={(e) => update('subModule', e.target.value)}
                            placeholder="e.g. Competency Rating Sheet"
                        />
                    </Field>

                    <Field
                        label="TC ID"
                        required
                        error={errors.tcId}
                        hint={!isEdit && !tcIdTouched ? 'Auto-generated from Module. You can edit it.' : undefined}
                    >
                        <input
                            className={`${inputClass} font-mono`}
                            value={form.tcId}
                            onChange={(e) => {
                                setTcIdTouched(true)
                                update('tcId', e.target.value)
                            }}
                            placeholder="TC-SYS-001"
                        />
                    </Field>

                    <Field label="TC Name" required error={errors.name}>
                        <input
                            className={inputClass}
                            value={form.name}
                            onChange={(e) => update('name', e.target.value)}
                            placeholder="e.g. Log out from System Settings page"
                        />
                    </Field>

                    <div className="md:col-span-2">
                        <Field label="Test Scenario" required error={errors.scenario}>
                            <textarea
                                rows={2}
                                className={inputClass}
                                value={form.scenario}
                                onChange={(e) => update('scenario', e.target.value)}
                                placeholder="e.g. Verify that the user can log out successfully from the System Settings page."
                            />
                        </Field>
                    </div>

                    <div className="md:col-span-2">
                        <Field label="Preconditions">
                            <textarea
                                rows={2}
                                className={inputClass}
                                value={form.preconditions}
                                onChange={(e) => update('preconditions', e.target.value)}
                                placeholder="e.g. User is logged in as HR"
                            />
                        </Field>
                    </div>
                </div>
            </section>

            {/* ---------- Steps ---------- */}
            <section className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-900">Test Steps</h3>
                    <span className="text-xs text-slate-500">
                        {form.steps.length} step{form.steps.length !== 1 && 's'}
                    </span>
                </div>

                {errors.steps && <p className="text-sm text-red-600 mb-3">{errors.steps}</p>}

                <div className="hidden md:grid grid-cols-3 gap-3 pl-11 pr-10 mb-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    <span>Action</span>
                    <span>Test Data</span>
                    <span>Expected Result</span>
                </div>

                <div className="space-y-3">
                    {form.steps.map((step, i) => (
                        <div key={step.id} className="flex gap-3 border border-slate-200 rounded-md p-3">
                            <div className="w-8 h-8 shrink-0 rounded-full bg-slate-900 text-white text-sm font-semibold flex items-center justify-center">
                                {i + 1}
                            </div>

                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                                <textarea
                                    rows={2}
                                    aria-label={`Step ${i + 1} action`}
                                    className={inputClass}
                                    value={step.action}
                                    onChange={(e) => updateStep(i, 'action', e.target.value)}
                                    placeholder="e.g. Click Log Out button"
                                />
                                <textarea
                                    rows={2}
                                    aria-label={`Step ${i + 1} test data`}
                                    className={inputClass}
                                    value={step.testData}
                                    onChange={(e) => updateStep(i, 'testData', e.target.value)}
                                    placeholder="Optional"
                                />
                                <textarea
                                    rows={2}
                                    aria-label={`Step ${i + 1} expected result`}
                                    className={inputClass}
                                    value={step.expectedResult}
                                    onChange={(e) => updateStep(i, 'expectedResult', e.target.value)}
                                    placeholder="e.g. User is redirected to the login page"
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <button type="button" title="Move up" disabled={i === 0} onClick={() => moveStep(i, -1)} className={iconBtn}>
                                    ↑
                                </button>
                                <button
                                    type="button"
                                    title="Move down"
                                    disabled={i === form.steps.length - 1}
                                    onClick={() => moveStep(i, 1)}
                                    className={iconBtn}
                                >
                                    ↓
                                </button>
                                <button type="button" title="Delete step" onClick={() => removeStep(i)} className={`${iconBtn} hover:text-red-600`}>
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={addStep}
                    className="mt-4 w-full border-2 border-dashed border-slate-300 text-slate-500 text-sm py-2 rounded-md hover:border-emerald-500 hover:text-emerald-600"
                >
                    + Add Step
                </button>
            </section>

            {/* ---------- Actions ---------- */}
            {errors.form && <p className="text-sm text-red-600 mb-3">{errors.form}</p>}
            <div className="flex items-center justify-between">
                <div>
                    {isEdit && (
                        <button type="button" onClick={handleDelete} className="text-sm text-red-600 hover:underline">
                            Delete test case
                        </button>
                    )}
                </div>
                <div className="flex gap-2">
                    <Link to="/" className="border border-slate-300 text-slate-600 text-sm px-4 py-2 rounded-md hover:bg-slate-100">
                        Cancel
                    </Link>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-emerald-700 disabled:opacity-50"
                    >
                        {saving ? 'Saving…' : 'Save Test Case'}
                    </button>
                </div>
            </div>
        </div>
    )
}

