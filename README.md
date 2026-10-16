# Testfy

A test case manager for manual QA testers. Write test cases, run them step by step, attach screenshots, and export a Word test report in the format QA teams already use.

**Live demo:** https://YOUR-VERCEL-URL.vercel.app

## Why I built it

At my last QA job, test cases lived in an Excel sheet with macros, and every execution meant copying screenshots into Word by hand. Testfy replaces that whole workflow: the app is the source of truth, and the Word report is generated from it.

## Features

- **Test cases** with Module, Sub Module, Scenario, Preconditions, Priority, and numbered steps (reorder, add, delete)
- **Auto-generated TC IDs** from the module (e.g. `TC-SYS-004`), with duplicate-ID protection
- **Step-by-step execution:** Passed / Failed / Blocked / Skipped, Actual Result, and QA Remarks per step
- **Auto-block:** when a step fails, offers to mark the remaining steps as Blocked
- **Screenshots per step:** paste with Ctrl + V, upload, or drag and drop; compressed automatically
- **Word export:** a single test case, or several with a summary page; the password is masked by default
- **Dashboard:** pass rate, results per module, and a "Needs attention" list of failed and blocked cases
- **Run history:** each run keeps a snapshot of the steps it executed, so old reports stay accurate after a test case is edited
- **Backup and restore** to a single file

## Privacy

There's no account and no server. All data is stored in your own browser (IndexedDB) and never leaves your computer. Use **Backup** to move data between browsers or computers.

## Tech stack

React · TypeScript · Vite · Tailwind CSS · React Router · Dexie (IndexedDB) · docx · Vercel

## Run locally

    npm install
    npm run dev

Then open http://localhost:5173

## About

Built by Ahrif Hajjie Cruz, a QA tester who also builds front ends.
[Portfolio](https://ahrif-portfolio.vercel.app) · [LinkedIn](https://www.linkedin.com/in/ahrif-hajjie-cruz-018540334/)