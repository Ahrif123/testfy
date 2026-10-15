import Dexie, { type EntityTable } from 'dexie'
import type { TestCase, TestRun, Screenshot } from './types'

const db = new Dexie('TestfyDB') as Dexie & {
  testCases: EntityTable<TestCase, 'id'>
  testRuns: EntityTable<TestRun, 'id'>
  screenshots: EntityTable<Screenshot, 'id'>
}

// ++id = auto-increment key
// &tcId = must be unique (no two test cases can share an ID)
db.version(1).stores({
  testCases: '++id, &tcId, module, subModule, updatedAt',
  testRuns: '++id, testCaseId, status, createdAt',
  screenshots: '++id, runId, stepId',
})

export { db }