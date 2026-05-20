export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      {children}
    </main>
  )
}