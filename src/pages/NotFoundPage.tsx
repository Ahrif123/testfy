import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-slate-900">404 – Page not found</h2>
      <Link to="/" className="text-emerald-600 text-sm hover:underline">
        ← Back to Test Cases
      </Link>
    </div>
  )
}