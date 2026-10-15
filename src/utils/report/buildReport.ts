import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import type { StepStatus, TestCase, TestRun } from '../../types'

// ---------- Types ----------
export interface ReportScreenshot {
  stepId: string
  data: ArrayBuffer
  width: number
  height: number
}

export interface ReportItem {
  run: TestRun
  testCase: TestCase | undefined
  screenshots: ReportScreenshot[]
}

export interface ReportOptions {
  includePassword: boolean
}

// ---------- Layout constants ----------
const FONT = 'Calibri'
const PAGE_WIDTH = 9360 // usable width in DXA (Letter size, 1" margins). 1440 DXA = 1 inch
const MAX_IMG_WIDTH = 560 // pixels
const MAX_IMG_HEIGHT = 380

const STATUS_COLOR: Record<StepStatus, string> = {
  Passed: '2E7D32',
  Failed: 'C62828',
  Blocked: 'E65100',
  Skipped: '616161',
  Untested: '9E9E9E',
}

const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' }
const BORDERS = { top: border, bottom: border, left: border, right: border }

// ---------- Small helpers ----------
const text = (value: string, opts: { bold?: boolean; color?: string; size?: number; italics?: boolean } = {}) =>
  new TextRun({ text: value, font: FONT, size: opts.size ?? 20, bold: opts.bold, color: opts.color, italics: opts.italics })

const para = (children: TextRun | ImageRun | (TextRun | ImageRun)[], opts: { center?: boolean; keepNext?: boolean } = {}) =>
  new Paragraph({
    children: Array.isArray(children) ? children : [children],
    spacing: { before: 40, after: 40 },
    alignment: opts.center ? AlignmentType.CENTER : undefined,
    keepNext: opts.keepNext,
  })

// A cell can hold several paragraphs (e.g. multi-line text)
const multiline = (value: string, opts: { keepNext?: boolean } = {}) =>
  (value || '').split('\n').map((line) => para(text(line), opts))

const cell = (
  children: Paragraph | Paragraph[],
  width: number,
  opts: { span?: number; fill?: string } = {},
) =>
  new TableCell({
    children: Array.isArray(children) ? children : [children],
    width: { size: width, type: WidthType.DXA },
    borders: BORDERS,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    columnSpan: opts.span,
    shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
  })

const blackHeader = (label: string, width: number, span = 1) =>
  cell(para(text(label, { bold: true, color: 'FFFFFF' }), { center: true }), width, { span, fill: '000000' })

const sectionTitle = (label: string) =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    keepNext: true, // never leave the title alone at the bottom of a page
    spacing: { before: 300, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '999999', space: 4 } },
    children: [text(label, { bold: true, size: 24 })],
  })

// "2026-10-16" -> "16-Oct-26" (same style as the old Excel reports)
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${String(d).padStart(2, '0')}-${months[m - 1]}-${String(y).slice(-2)}`
}

// The status comes from the step results, not from "Complete Run".
// run.status is already Failed if any step failed, and Untested only if
// steps are still missing a result (and none failed)
function runStatusLabel(run: TestRun): { label: string; color: string } {
  if (run.status === 'Untested') return { label: 'In Progress', color: STATUS_COLOR.Untested }
  return { label: run.status, color: STATUS_COLOR[run.status] }
}

function stepStatusLabel(status: StepStatus): string {
  return status === 'Untested' ? 'Not Executed' : status
}

function actualResultText(status: StepStatus, actual: string): string {
  if (actual.trim()) return actual
  if (status === 'Passed') return 'As expected.'
  if (status === 'Untested') return 'Not executed.'
  return '—'
}

// Keeps the screenshot's proportions while fitting inside the page
function fitImage(width: number, height: number) {
  const scale = Math.min(1, MAX_IMG_WIDTH / width, MAX_IMG_HEIGHT / height)
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

// ---------- Overview table ----------
function overviewTable({ run, testCase }: ReportItem, options: ReportOptions): Table {
  const LABEL = 2600
  const VALUE = PAGE_WIDTH - LABEL
  const status = runStatusLabel(run)

  const row = (label: string, value: Paragraph | Paragraph[]) =>
    new TableRow({
      cantSplit: true,
      children: [cell(para(text(label, { bold: true })), LABEL, { fill: 'D9D9D9' }), cell(value, VALUE)],
    })

  const credentials: Paragraph[] = []
  if (run.credentialsUsername) credentials.push(para(text(`Username: ${run.credentialsUsername}`)))
  if (run.credentialsPassword)
    credentials.push(para(text(`Password: ${options.includePassword ? run.credentialsPassword : '••••••••'}`)))
  if (credentials.length === 0) credentials.push(para(text('—')))

  const environment = [para(text(run.environment || '—'))]
  if (run.environmentUrl) environment.push(para(text(run.environmentUrl)))

  return new Table({
    width: { size: PAGE_WIDTH, type: WidthType.DXA },
    columnWidths: [LABEL, VALUE],
    rows: [
      new TableRow({ children: [blackHeader('Overview', PAGE_WIDTH, 2)] }),
      row('Project Name', para(text(testCase?.project || '—'))),
      row('Test Case ID', para(text(testCase?.tcId ?? 'Deleted test case'))),
      row('TC Name', para(text(testCase?.name ?? '—'))),
      row('Module', para(text(testCase?.module || '—'))),
      row('Sub Module', para(text(testCase?.subModule || '—'))),
      row('Test Scenario', multiline(testCase?.scenario ?? '—')),
      ...(testCase?.preconditions ? [row('Preconditions', multiline(testCase.preconditions))] : []),
      row('Test Date', para(text(formatDate(run.testDate)))),
      row('QA Assigned', para(text(run.tester))),
      row('Build Version', para(text(run.buildVersion || '—'))),
      row('Environment', environment),
      row('Browser', para(text(run.browser || '—'))),
      row('Test Credentials', credentials),
      row('Status', para(text(status.label, { bold: true, color: status.color }))),
    ],
  })
}

// ---------- Steps table ----------
function stepsTable({ run, screenshots }: ReportItem): Table {
  const W = [700, 2600, 2700, 2200, 1160] // Step | Action | Expected | Actual | Status
  const rows: TableRow[] = [
    new TableRow({
      tableHeader: true, // repeats the header on every page
      children: ['Step', 'Action', 'Expected Result', 'Actual Result', 'Status'].map((h, i) => blackHeader(h, W[i])),
    }),
  ]

  run.steps.forEach((step, i) => {
    const result = run.results[i]
    const status = result?.status ?? 'Untested'
    const shots = screenshots.filter((s) => s.stepId === step.id)
    const remarks = result?.qaRemarks?.trim() ?? ''
    // keepNext keeps the step row on the same page as its screenshot / remarks
    const hasMoreRows = shots.length > 0 || remarks.length > 0

    const actionParas = multiline(step.action, { keepNext: hasMoreRows })
    if (step.testData.trim()) {
      actionParas.push(para([text('Test data: ', { bold: true, size: 18 }), text(step.testData, { size: 18 })], { keepNext: hasMoreRows }))
    }

    rows.push(
      new TableRow({
        cantSplit: true,
        children: [
          cell(para(text(String(i + 1), { bold: true }), { center: true, keepNext: hasMoreRows }), W[0]),
          cell(actionParas, W[1]),
          cell(multiline(step.expectedResult, { keepNext: hasMoreRows }), W[2]),
          cell(multiline(actualResultText(status, result?.actualResult ?? ''), { keepNext: hasMoreRows }), W[3]),
          cell(
            para(text(stepStatusLabel(status), { bold: true, color: STATUS_COLOR[status] }), {
              center: true,
              keepNext: hasMoreRows,
            }),
            W[4],
          ),
        ],
      }),
    )

    // One row per screenshot, spanning all 5 columns
    shots.forEach((shot, j) => {
      const size = fitImage(shot.width, shot.height)
      const isLastBeforeRemarks = j < shots.length - 1 || remarks.length > 0
      rows.push(
        new TableRow({
          cantSplit: true,
          children: [
            cell(
              para(new ImageRun({ type: 'jpg', data: shot.data, transformation: size }), {
                center: true,
                keepNext: isLastBeforeRemarks,
              }),
              PAGE_WIDTH,
              { span: 5 },
            ),
          ],
        }),
      )
    })

    if (remarks) {
      const isFail = status === 'Failed'
      rows.push(
        new TableRow({
          cantSplit: true,
          children: [
            cell(
              remarks.split('\n').map((line, k) =>
                para(k === 0 ? [text('QA Remarks: ', { bold: true, color: isFail ? STATUS_COLOR.Failed : '333333' }), text(line)] : text(line)),
              ),
              PAGE_WIDTH,
              { span: 5, fill: isFail ? 'FDECEC' : 'F2F2F2' },
            ),
          ],
        }),
      )
    }
  })

  return new Table({ width: { size: PAGE_WIDTH, type: WidthType.DXA }, columnWidths: W, rows })
}

// ---------- Summary (used when a report has more than one test case) ----------
function summarySection(items: ReportItem[]): (Paragraph | Table)[] {
  const W = [1500, 3460, 1900, 1300, 1200]
  const count = (s: StepStatus) => items.filter((it) => it.run.status === s).length

  const rows = [
    new TableRow({
      tableHeader: true,
      children: ['TC ID', 'TC Name', 'Sub Module', 'Steps', 'Status'].map((h, i) => blackHeader(h, W[i])),
    }),
    ...items.map(({ run, testCase }) => {
      const passed = run.results.filter((r) => r.status === 'Passed').length
      const status = runStatusLabel(run)
      return new TableRow({
        cantSplit: true,
        children: [
          cell(para(text(testCase?.tcId ?? '—')), W[0]),
          cell(para(text(testCase?.name ?? 'Deleted test case')), W[1]),
          cell(para(text(testCase?.subModule || '—')), W[2]),
          cell(para(text(`${passed}/${run.results.length} passed`)), W[3]),
          cell(para(text(status.label, { bold: true, color: status.color })), W[4]),
        ],
      })
    }),
  ]

  return [
    sectionTitle('SUMMARY'),
    new Paragraph({
      spacing: { after: 160 },
      children: [
        text('Total test cases: ', { bold: true }),
        text(`${items.length}     `),
        text('Passed: ', { bold: true, color: STATUS_COLOR.Passed }),
        text(`${count('Passed')}     `),
        text('Failed: ', { bold: true, color: STATUS_COLOR.Failed }),
        text(`${count('Failed')}     `),
        text('Blocked: ', { bold: true, color: STATUS_COLOR.Blocked }),
        text(String(count('Blocked'))),
      ],
    }),
    new Table({ width: { size: PAGE_WIDTH, type: WidthType.DXA }, columnWidths: W, rows }),
  ]
}

// ---------- Main builder ----------
// One item  -> single test case report
// Many items -> title + summary page, then each test case on its own page (Step 9)
export function buildReport(items: ReportItem[], options: ReportOptions): Document {
  const children: (Paragraph | Table)[] = []

  if (items.length > 1) {
    const first = items[0]
    const subtitle = [first.testCase?.project, first.testCase?.module && `Module: ${first.testCase.module}`, formatDate(first.run.testDate)]
      .filter(Boolean)
      .join('  •  ')
    children.push(
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [text('TEST EXECUTION REPORT', { bold: true, size: 32 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [text(subtitle, { color: '555555' })] }),
      ...summarySection(items),
    )
  }

  items.forEach((item, i) => {
    if (items.length > 1 || i > 0) children.push(new Paragraph({ children: [new PageBreak()] }))
    children.push(overviewTable(item, options), sectionTitle('TEST EXECUTION'), stepsTable(item))
  })

  return new Document({
    creator: 'Testfy',
    title: 'Test Execution Report',
    styles: { default: { document: { run: { font: FONT, size: 20 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 }, // Letter
            margin: { top: 1080, bottom: 1080, left: 1440, right: 1440 },
          },
        },
        headers: {
          default: new Header({
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [text('Generated by Testfy', { size: 16, color: '888888', italics: true })] })],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  text('Page ', { size: 16, color: '888888' }),
                  new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: '888888' }),
                  text(' of ', { size: 16, color: '888888' }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: '888888' }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  })
}