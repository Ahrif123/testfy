import { BrowserRouter, Routes, Route } from 'react-router'
import Sidebar from './components/Sidebar'
import TestCasesPage from './pages/TestCasesPage'
import TestRunsPage from './pages/TestRunsPage'
import ReportsPage from './pages/ReportsPage'
import NotFoundPage from './pages/NotFoundPage'
import TestCaseFormPage from './pages/TestCaseFormPage'
import RunSetupPage from './pages/RunSetupPage'
import RunExecutePage from './pages/RunExecutePage'
import DashboardPage from './pages/DashboardPage'
import BackupPage from './pages/BackupPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen flex-col md:flex-row">
        <Sidebar />
        <main className="graph-paper min-w-0 flex-1 overflow-y-auto">
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/" element={<TestCasesPage />} />
            <Route path="/cases/new" element={<TestCaseFormPage />} />
            <Route path="/cases/:id/edit" element={<TestCaseFormPage />} />
            <Route path="/cases/:caseId/run" element={<RunSetupPage />} />
            <Route path="/runs" element={<TestRunsPage />} />
            <Route path="/runs/:runId" element={<RunExecutePage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/backup" element={<BackupPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}