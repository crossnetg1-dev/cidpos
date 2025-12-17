// Force dynamic rendering to ensure fresh data on every view
export const dynamic = 'force-dynamic'

import { SettingsClient } from '@/components/settings/settings-client'
import { getStoreSettings, getUsers } from '@/actions/settings'
import { getRoles } from '@/actions/roles'

export default async function SettingsPage() {
  const [settingsResult, usersResult, rolesResult] = await Promise.all([
    getStoreSettings(),
    getUsers(),
    getRoles(),
  ])

  const settings = settingsResult.success ? settingsResult.data : null
  const users = usersResult.success ? usersResult.data : []
  const roles = rolesResult.success ? rolesResult.data : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage store configuration and user accounts</p>
      </div>

      <SettingsClient initialSettings={settings} initialUsers={users} initialRoles={roles} />
    </div>
  )
}

