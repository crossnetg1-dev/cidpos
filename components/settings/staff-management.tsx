'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { UserFormDialog } from '@/components/settings/user-form-dialog'
import { deleteUser } from '@/actions/settings'
import { MoreVertical, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface StaffManagementProps {
  users: Array<{
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
  onUpdate: (users: typeof users) => void
}

export function StaffManagement({ users, onUpdate }: StaffManagementProps) {
  const router = useRouter()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)

  const handleDelete = async (userId: string) => {
    try {
      const result = await deleteUser(userId)
      if (result.success) {
        toast.success(result.message || 'User deleted successfully')
        setDeletingUserId(null)
        // Force refresh to update UI
        router.refresh()
        // Update local state
        onUpdate(users.filter((u) => u.id !== userId))
      } else {
        toast.error(result.error || 'Failed to delete user')
      }
    } catch (error) {
      toast.error('An error occurred')
    }
  }

  const handleAddSuccess = () => {
    setShowAddDialog(false)
    router.refresh()
  }

  const getRoleBadge = (role: string) => {
    if (role === 'OWNER' || role === 'ADMIN') {
      return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Admin</Badge>
    }
    if (role === 'MANAGER') {
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Manager</Badge>
    }
    return <Badge variant="secondary">Cashier</Badge>
  }

  const getStatusBadge = (status: string) => {
    if (status === 'ACTIVE') {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
    }
    return <Badge variant="destructive">Inactive</Badge>
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Staff Management</CardTitle>
              <CardDescription>
                Manage user accounts and permissions
              </CardDescription>
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.fullName}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.email || '-'}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>
                        {user.lastLoginAt
                          ? format(new Date(user.lastLoginAt), 'MMM dd, yyyy')
                          : 'Never'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setDeletingUserId(user.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      {showAddDialog && (
        <UserFormDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onSuccess={handleAddSuccess}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingUserId} onOpenChange={(open) => !open && setDeletingUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user account? This action cannot be undone.
              Users with transaction history will be deactivated instead of deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingUserId && handleDelete(deletingUserId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

