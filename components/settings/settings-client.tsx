'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GeneralSettings } from '@/components/settings/general-settings'
import { ReceiptSettings } from '@/components/settings/receipt-settings'
import { StaffManagement } from '@/components/settings/staff-management'
import { SystemSettings } from '@/components/settings/system-settings'
import { RolesPermissions } from '@/components/settings/roles-permissions'
import { Store, Receipt, Users, AlertTriangle, Shield } from 'lucide-react'
import type { StoreSettingsData } from '@/actions/settings'

interface SettingsClientProps {
  initialSettings: {
    id: string
    storeName: string
    address: string | null
    phone: string | null
    currency: string
    taxRate: number
    receiptFooter: string | null
  } | null
  initialUsers: Array<{
    id: string
    username: string
    fullName: string
    email: string | null
    phone: string | null
    role: string
    status: string
    createdAt: Date
    lastLoginAt: Date | null
  }>
  initialRoles: Array<{
    id: string
    name: string
    permissions: any
    isSystem: boolean
    userCount: number
  }>
}

export function SettingsClient({ initialSettings, initialUsers, initialRoles }: SettingsClientProps) {
  const [settings, setSettings] = useState(initialSettings)
  const [users, setUsers] = useState(initialUsers)

  const handleSettingsUpdate = (newSettings: typeof settings) => {
    setSettings(newSettings)
  }

  const handleUsersUpdate = (newUsers: typeof users) => {
    setUsers(newUsers)
  }

  return (
    <Tabs defaultValue="general" className="space-y-4">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="general">
          <Store className="h-4 w-4 mr-2" />
          General
        </TabsTrigger>
        <TabsTrigger value="receipt">
          <Receipt className="h-4 w-4 mr-2" />
          Receipt
        </TabsTrigger>
        <TabsTrigger value="roles">
          <Shield className="h-4 w-4 mr-2" />
          Roles
        </TabsTrigger>
        <TabsTrigger value="staff">
          <Users className="h-4 w-4 mr-2" />
          Staff
        </TabsTrigger>
        <TabsTrigger value="system">
          <AlertTriangle className="h-4 w-4 mr-2" />
          System
        </TabsTrigger>
      </TabsList>

      <TabsContent value="general" className="space-y-4">
        <GeneralSettings
          settings={settings}
          onUpdate={handleSettingsUpdate}
        />
      </TabsContent>

      <TabsContent value="receipt" className="space-y-4">
        <ReceiptSettings
          settings={settings}
          onUpdate={handleSettingsUpdate}
        />
      </TabsContent>

      <TabsContent value="roles" className="space-y-4">
        <RolesPermissions initialRoles={initialRoles} />
      </TabsContent>

      <TabsContent value="staff" className="space-y-4">
        <StaffManagement
          users={users}
          onUpdate={handleUsersUpdate}
        />
      </TabsContent>

      <TabsContent value="system" className="space-y-4">
        <SystemSettings />
      </TabsContent>
    </Tabs>
  )
}

