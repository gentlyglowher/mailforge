import Link from 'next/link'
import SignOutButton from '@/components/SignOutButton'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar – ne défilera pas */}
      <aside className="w-64 bg-gradient-to-b from-indigo-700 to-indigo-900 text-white flex flex-col shadow-xl">
        <div className="p-6 text-2xl font-bold tracking-tight">MailForge</div>
        <nav className="flex-1 space-y-1 px-4">
          <Link href="/dashboard" className="flex items-center px-4 py-3 rounded-lg hover:bg-indigo-600 transition-colors">
            <span className="mr-3">📊</span> Dashboard
          </Link>
          <Link href="/lists" className="flex items-center px-4 py-3 rounded-lg hover:bg-indigo-600 transition-colors">
            <span className="mr-3">📋</span> Lists
          </Link>
          <Link href="/campaigns" className="flex items-center px-4 py-3 rounded-lg hover:bg-indigo-600 transition-colors">
            <span className="mr-3">✉️</span> Campaigns
          </Link>
          <Link href="/sequences" className="flex items-center px-4 py-3 rounded-lg hover:bg-indigo-600 transition-colors">
            <span className="mr-3">🔄</span> Sequences
          </Link>
          <Link href="/funnels" className="flex items-center px-4 py-3 rounded-lg hover:bg-indigo-600 transition-colors">
            <span className="mr-3">🔀</span> Funnels
          </Link>
          <Link href="/settings" className="flex items-center px-4 py-3 rounded-lg hover:bg-indigo-600 transition-colors">
            <span className="mr-3">⚙️</span> Settings
        </Link>
        </nav>
        <div className="p-4 border-t border-indigo-600">
          <SignOutButton />
        </div>
      </aside>

      {/* Main – seul cet élément défilera si le contenu est long */}
      <main className="flex-1 overflow-y-auto bg-gray-50 p-8 text-gray-900">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}