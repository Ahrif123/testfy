export type StepStatus = 'Untested' | 'Passed' | 'Failed' | 'Blocked' | 'Skipped'
export type Priority = 'High' | 'Medium' | 'Low'

// ---------- TEST CASE (the reusable script) ----------
export interface TestStep {
  id: string
  action: string
  testData: string
  expectedResult: string
}

export interface TestCase {
  id?: number // auto-generated database key
  tcId: string // e.g. TC-SYS-001
  name: string
  project: string
  module: string
  subModule: string
  scenario: string
  preconditions: string
  priority: Priority
  steps: TestStep[]
  createdAt: number
  updatedAt: number
}

// ---------- TEST RUN (one execution of a test case) ----------
export interface StepResult {
  stepId: string
  status: StepStatus
  actualResult: string
  qaRemarks: string
  screenshotIds: number[]
}

export interface TestRun {
  id?: number
  testCaseId: number
  steps: TestStep[] // snapshot of the steps when the run started
  tester: string
  testDate: string
  buildVersion: string
  environment: string
  environmentUrl: string
  browser: string
  credentialsUsername: string
  credentialsPassword: string
  results: StepResult[]
  status: StepStatus
  createdAt: number
  completedAt?: number
}

// ---------- SCREENSHOT (stored separately so runs stay light) ----------
export interface Screenshot {
  id?: number
  runId: number
  stepId: string
  blob: Blob
  createdAt: number
}