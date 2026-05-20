import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch counts
  const { count: totalContacts } = await supabase.from('contacts').select('*', { count: 'exact', head: true })
  const { count: totalCampaigns } = await supabase.from('campaigns').select('*', { count: 'exact', head: true })
  const { count: activeSequences } = await supabase.from('sequences').select('*', { count: 'exact', head: true }).eq('active', true)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p className="text-gray-600 mb-8">Welcome, {user.email}</p>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow">
          <h3 className="text-lg font-semibold text-gray-900">Total Contacts</h3>
          <p className="mt-2 text-4xl font-bold text-indigo-600">{totalContacts || 0}</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow">
          <h3 className="text-lg font-semibold text-gray-900">Campaigns</h3>
          <p className="mt-2 text-4xl font-bold text-indigo-600">{totalCampaigns || 0}</p>
        </div>
        <div className="rounded-xl bg-white p-6 shadow">
          <h3 className="text-lg font-semibold text-gray-900">Active Sequences</h3>
          <p className="mt-2 text-4xl font-bold text-indigo-600">{activeSequences || 0}</p>
        </div>
      </div>
    </div>
  )
}