import { Packer } from 'docx'
import { db } from '../../db'
import { buildReport, type ReportItem, type ReportOptions } from './buildReport'

// Loads everything one report needs: the run, its test case and its screenshots
export async function loadReportItem(runId: number): Promise<ReportItem> {
  const run = await db.testRuns.get(runId)
  if (!run) throw new Error(`Test run ${runId} not found`)

  const testCase = await db.testCases.get(run.testCaseId)
  const shots = await db.screenshots.where('runId').equals(runId).sortBy('createdAt')
  const screenshots = await Promise.all(
    shots.map(async (s) => ({
      stepId: s.stepId,
      data: await s.blob.arrayBuffer(),
      width: s.width || 800,
      height: s.height || 450,
    })),
  )
  return { run, testCase, screenshots }
}

// Makes the browser download a file
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Removes characters Windows doesn't allow in file names
export const safeFileName = (name: string) => name.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '_')

// Single test case report, e.g. TC-SYS-005_2026-10-16_Passed.docx
export async function exportRunToWord(runId: number, options: ReportOptions) {
  const item = await loadReportItem(runId)
  const blob = await Packer.toBlob(buildReport([item], options))
  const status = item.run.status === 'Untested' ? 'InProgress' : item.run.status
  downloadBlob(blob, safeFileName(`${item.testCase?.tcId ?? 'TestRun'}_${item.run.testDate}_${status}.docx`))
}


// Several test cases in one file, with a Summary page (Reports page)
export async function exportRunsToWord(runIds: number[], options: ReportOptions, fileName: string) {
  const items = await Promise.all(runIds.map((id) => loadReportItem(id)))
  const blob = await Packer.toBlob(buildReport(items, options))
  downloadBlob(blob, safeFileName(fileName))
}