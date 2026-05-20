import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-2 text-gray-600">Welcome, {user.email}</p>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Placeholder cards – we'll add real data in Phase 1 */}
        <div className="rounded-xl bg-white p-6 shadow">
          <h3 className="text-lg font-semibold text-gray-900">Total Contacts</h3>
          <p className="mt-2 text-4xl font-bold text-indigo-600">0</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow">
          <h3 className="text-lg font-semibold text-gray-900">Recent Campaigns</h3>
          <p className="mt-2 text-4xl font-bold text-indigo-600">0</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow">
          <h3 className="text-lg font-semibold text-gray-900">Active Sequences</h3>
          <p className="mt-2 text-4xl font-bold text-indigo-600">0</p>
        </div>
      </div>
    </div>
  )
}