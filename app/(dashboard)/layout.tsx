import { getCurrentUser } from '@/actions/auth'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { getStoreSettings } from '@/actions/settings'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch store settings for branding
  const storeSettingsResult = await getStoreSettings()
  const storeName = storeSettingsResult.success && storeSettingsResult.data
    ? storeSettingsResult.data.storeName
    : 'CidPOS'

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - Hidden on mobile, visible on desktop */}
      <aside className="hidden md:flex">
        <Sidebar storeName={storeName} />
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} storeName={storeName} />
        <main className="flex-1 overflow-y-auto bg-muted/50 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

