import Link from 'next/link'
import SignOutButton from '@/components/SignOutButton'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-gray-200 flex flex-col">
        <div className="p-6 text-2xl font-bold">MailForge</div>
        <nav className="flex-1 space-y-1 px-4">
          <Link href="/dashboard" className="block px-4 py-2 rounded hover:bg-gray-800">Dashboard</Link>
          <Link href="/lists" className="block px-4 py-2 rounded hover:bg-gray-800">Lists</Link>
          <Link href="/campaigns" className="block px-4 py-2 rounded hover:bg-gray-800">Campaigns</Link>
          <Link href="/sequences" className="block px-4 py-2 rounded hover:bg-gray-800">Sequences</Link>
        </nav>
        <div className="p-4">
          <SignOutButton />
        </div>
      </aside>
      {/* Main content */}
      <main className="flex-1 bg-gray-100 p-8 text-gray-900">
        {children}
      </main>
    </div>
  )
}