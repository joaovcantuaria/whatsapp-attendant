export const dynamic = 'force-dynamic'

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b h-14 flex items-center px-6">
        <h1 className="font-bold text-lg">Super Admin</h1>
      </header>
      <main className="p-6">
        {children}
      </main>
    </div>
  )
}
