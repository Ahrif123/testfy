import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { exportDB, importInto, peakImportFile } from 'dexie-export-import'
import { db } from '../db'
import { downloadBlob } from '../utils/report/exportReport'

const LAST_BACKUP_KEY = 'testfy:lastBackup'

function readLastBackup(): string | null {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY)
  } catch {
    return null
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

type Message = { type: 'success' | 'error'; text: string }

export default function BackupPage() {
  const counts = useLiveQuery(async () => ({
    testCases: await db.testCases.count(),
    testRuns: await db.testRuns.count(),
    screenshots: await db.screenshots.count(),
  }))

  const [usage, setUsage] = useState<string | null>(null)
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [lastBackup, setLastBackup] = useState<string | null>(readLastBackup)
  const [busy, setBusy] = useState<'export' | 'import' | null>(null)
  const [message, setMessage] = useState<Message | null>(null)

  // Storage usage and protection status (refreshes when the data changes)
  useEffect(() => {
    navigator.storage?.estimate?.().then((estimate) => {
      if (estimate.usage !== undefined) setUsage(formatBytes(estimate.usage))
    })
    navigator.storage?.persisted?.().then(setPersisted)
  }, [counts])

  async function handleExport() {
    setBusy('export')
    setMessage(null)
    try {
      const blob = await exportDB(db, { prettyJson: false })
      const today = new Date().toLocaleDateString('en-CA')
      downloadBlob(blob, `Testfy_Backup_${today}.json`)

      const now = new Date().toLocaleString()
      try {
        localStorage.setItem(LAST_BACKUP_KEY, now)
      } catch {
        /* storage unavailable: the backup still downloaded */
      }
      setLastBackup(now)
      setMessage({ type: 'success', text: 'Backup downloaded. Keep a copy somewhere safe, like Google Drive or a USB drive.' })
    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: 'Could not create the backup. Please try again.' })
    } finally {
      setBusy(null)
    }
  }

  async function handleImport(file: File) {
    setMessage(null)
    try {
      // Read only the file's summary first, so we can check it before replacing anything
      const meta = await peakImportFile(file)
      if (meta.formatName !== 'dexie' || meta.data.databaseName !== 'TestfyDB') {
        setMessage({ type: 'error', text: 'This file is not a Testfy backup.' })
        return
      }

      const rowCount = (name: string) => meta.data.tables.find((t) => t.name === name)?.rowCount ?? 0
      const confirmed = confirm(
        `Restore this backup?\n\n` +
          `It contains ${rowCount('testCases')} test cases, ${rowCount('testRuns')} runs and ${rowCount('screenshots')} screenshots.\n\n` +
          `This REPLACES everything currently in Testfy. If you're not sure, download a backup of your current data first.`,
      )
      if (!confirmed) return

      setBusy('import')
      await importInto(db, file, { clearTablesBeforeImport: true, acceptVersionDiff: true })
      setMessage({ type: 'success', text: 'Backup restored successfully.' })
    } catch (err) {
      console.error(err)
      setMessage({ type: 'error', text: 'Could not read this file. Make sure it is a Testfy backup (.json).' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <h2 className="text-2xl font-bold text-slate-900">Backup</h2>
      <p className="text-sm text-slate-500 mb-6">
        Testfy saves your data in this browser only. Download a backup regularly so you never lose your work.
      </p>

      {message && (
        <p
          className={`text-sm rounded-md px-4 py-3 mb-6 border ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {message.text}
        </p>
      )}

      {/* Storage */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
        <h3 className="font-semibold text-slate-900 mb-4">Your Data</h3>
        <dl className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <dt className="text-xs text-slate-500 uppercase tracking-wide">Test Cases</dt>
            <dd className="text-2xl font-bold text-slate-900">{counts?.testCases ?? '…'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 uppercase tracking-wide">Test Runs</dt>
            <dd className="text-2xl font-bold text-slate-900">{counts?.testRuns ?? '…'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 uppercase tracking-wide">Screenshots</dt>
            <dd className="text-2xl font-bold text-slate-900">{counts?.screenshots ?? '…'}</dd>
          </div>
        </dl>
        <p className="text-sm text-slate-600">
          Storage used: <strong>{usage ?? '…'}</strong>
        </p>
        <p className="text-sm text-slate-600 mt-1">
          Browser protection:{' '}
          {persisted === null ? (
            '…'
          ) : persisted ? (
            <strong className="text-emerald-700">On</strong>
          ) : (
            <>
              <strong className="text-amber-700">Off</strong>
              <span className="text-slate-500">
                {' '}
                (the browser may clear data if your disk gets full; bookmarking Testfy usually turns this on)
              </span>
            </>
          )}
        </p>
      </section>

      {/* Backup */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
        <h3 className="font-semibold text-slate-900">Download Backup</h3>
        <p className="text-sm text-slate-500 mt-1 mb-4">
          Saves all test cases, runs and screenshots into one file.
          <br />
          Last backup: <strong className="text-slate-700">{lastBackup ?? 'Never'}</strong>
        </p>
        <button
          type="button"
          onClick={handleExport}
          disabled={busy !== null}
          className="bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy === 'export' ? 'Preparing…' : '⬇ Download Backup'}
        </button>
      </section>

      {/* Restore */}
      <section className="bg-white border border-red-200 rounded-lg p-6">
        <h3 className="font-semibold text-slate-900">Restore from Backup</h3>
        <p className="text-sm text-slate-500 mt-1 mb-4">
          <strong className="text-red-600">Replaces all current data</strong> with the contents of a backup file. You'll be
          asked to confirm first.
        </p>
        <label
          className={`inline-block border border-slate-300 text-slate-700 text-sm font-medium px-4 py-2 rounded-md ${
            busy ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100 cursor-pointer'
          }`}
        >
          {busy === 'import' ? 'Restoring…' : '⬆ Choose Backup File'}
          <input
            type="file"
            accept=".json,application/json"
            className="hidden"
            disabled={busy !== null}
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = '' // allows choosing the same file again
              if (file) handleImport(file)
            }}
          />
        </label>
      </section>
    </div>
  )
}