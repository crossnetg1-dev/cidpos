'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { getRoles, createRole, updateRole, deleteRole, type PermissionStructure } from '@/actions/roles'
import { getDefaultPermissions, getSuperAdminPermissions, getCashierPermissions } from '@/lib/permission-helpers'
import { MoreVertical, Plus, Edit, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface RolesPermissionsProps {
  initialRoles: Array<{
    id: string
    name: string
    permissions: any
    isSystem: boolean
    userCount: number
  }>
}

export function RolesPermissions({ initialRoles }: RolesPermissionsProps) {
  const router = useRouter()
  const [roles, setRoles] = useState<Array<{
    id: string
    name: string
    permissions: PermissionStructure
    isSystem: boolean
    userCount: number
  }>>(initialRoles.map(r => ({ ...r, permissions: r.permissions as PermissionStructure })))
  const [isLoading, setIsLoading] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [editingRole, setEditingRole] = useState<typeof roles[0] | null>(null)
  const [deletingRole, setDeletingRole] = useState<typeof roles[0] | null>(null)
  const [roleName, setRoleName] = useState('')
  const [permissions, setPermissions] = useState<PermissionStructure>(getDefaultPermissions())

  useEffect(() => {
    // Initial roles are passed as props, but we can reload if needed
  }, [])

  const loadRoles = async () => {
    setIsLoading(true)
    try {
      const result = await getRoles()
      if (result.success && result.data) {
        setRoles(result.data)
      } else {
        toast.error(result.error || 'Failed to load roles')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenDialog = (role?: typeof roles[0]) => {
    if (role) {
      setEditingRole(role)
      setRoleName(role.name)
      setPermissions(role.permissions)
    } else {
      setEditingRole(null)
      setRoleName('')
      setPermissions(getDefaultPermissions())
    }
    setShowDialog(true)
  }

  const handleCloseDialog = () => {
    setShowDialog(false)
    setEditingRole(null)
    setRoleName('')
    setPermissions(getDefaultPermissions())
  }

  const handlePermissionChange = (
    module: keyof PermissionStructure,
    action: string,
    value: boolean
  ) => {
    setPermissions((prev) => ({
      ...prev,
      [module]: {
        ...(prev[module] as any),
        [action]: value,
      },
    }))
  }

  const handleSelectAllModule = (module: keyof PermissionStructure, value: boolean) => {
    const modulePerms = permissions[module] as any
    const updated = { ...permissions }
    updated[module] = Object.keys(modulePerms).reduce((acc, key) => {
      acc[key] = value
      return acc
    }, {} as any)
    setPermissions(updated)
  }

  const handleSubmit = async () => {
    if (!roleName.trim()) {
      toast.error('Role name is required')
      return
    }

    setIsLoading(true)
    try {
      let result
      if (editingRole) {
        result = await updateRole(editingRole.id, {
          name: roleName,
          permissions,
        })
      } else {
        result = await createRole({
          name: roleName,
          permissions,
        })
      }

      if (result.success) {
        toast.success(editingRole ? 'Role updated successfully' : 'Role created successfully')
        handleCloseDialog()
        router.refresh()
        loadRoles()
      } else {
        toast.error(result.error || 'Failed to save role')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingRole) return

    setIsLoading(true)
    try {
      const result = await deleteRole(deletingRole.id)
      if (result.success) {
        toast.success('Role deleted successfully')
        setDeletingRole(null)
        router.refresh()
        loadRoles()
      } else {
        toast.error(result.error || 'Failed to delete role')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const modules: Array<{ key: keyof PermissionStructure; label: string }> = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'pos', label: 'POS' },
    { key: 'products', label: 'Products' },
    { key: 'categories', label: 'Categories' },
    { key: 'purchases', label: 'Purchases' },
    { key: 'sales', label: 'Sales' },
    { key: 'stock', label: 'Stock' },
    { key: 'customers', label: 'Customers' },
    { key: 'reports', label: 'Reports' },
    { key: 'settings', label: 'Settings' },
  ]

  const getModuleActions = (module: keyof PermissionStructure): string[] => {
    const modulePerms = permissions[module] as any
    return Object.keys(modulePerms || {})
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Roles & Permissions</CardTitle>
              <CardDescription>
                Manage user roles and their access permissions
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Role
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && roles.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Users</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No roles found
                      </TableCell>
                    </TableRow>
                  ) : (
                    roles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium">{role.name}</TableCell>
                        <TableCell>
                          {role.isSystem ? (
                            <Badge variant="secondary">System</Badge>
                          ) : (
                            <Badge variant="outline">Custom</Badge>
                          )}
                        </TableCell>
                        <TableCell>{role.userCount} user(s)</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenDialog(role)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              {!role.isSystem && (
                                <DropdownMenuItem
                                  onClick={() => setDeletingRole(role)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Role Dialog */}
      <Dialog open={showDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Role' : 'Create Role'}</DialogTitle>
            <DialogDescription>
              Configure role name and permissions for each module
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="roleName">Role Name *</Label>
              <Input
                id="roleName"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="e.g., Manager, Cashier"
              />
            </div>

            {/* Quick Templates */}
            {!editingRole && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPermissions(getSuperAdminPermissions())}
                >
                  Super Admin (All)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPermissions(getCashierPermissions())}
                >
                  Cashier (Limited)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPermissions(getDefaultPermissions())}
                >
                  Clear All
                </Button>
              </div>
            )}

            {/* Permissions Table */}
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48">Module</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <span>View</span>
                        <Checkbox
                          checked={modules.every((m) => {
                            const actions = getModuleActions(m.key)
                            return actions.includes('view') && (permissions[m.key] as any)?.view === true
                          })}
                          onCheckedChange={(checked) => {
                            modules.forEach((m) => {
                              if (getModuleActions(m.key).includes('view')) {
                                handlePermissionChange(m.key, 'view', checked as boolean)
                              }
                            })
                          }}
                        />
                      </div>
                    </TableHead>
                    <TableHead>Create</TableHead>
                    <TableHead>Edit</TableHead>
                    <TableHead>Delete</TableHead>
                    <TableHead>Other</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modules.map((module) => {
                    const actions = getModuleActions(module.key)
                    const modulePerms = permissions[module.key] as any

                    return (
                      <TableRow key={module.key}>
                        <TableCell className="font-medium">{module.label}</TableCell>
                        <TableCell>
                          {actions.includes('view') && (
                            <Checkbox
                              checked={modulePerms?.view === true}
                              onCheckedChange={(checked) =>
                                handlePermissionChange(module.key, 'view', checked as boolean)
                              }
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {actions.includes('create') && (
                            <Checkbox
                              checked={modulePerms?.create === true}
                              onCheckedChange={(checked) =>
                                handlePermissionChange(module.key, 'create', checked as boolean)
                              }
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {actions.includes('edit') && (
                            <Checkbox
                              checked={modulePerms?.edit === true}
                              onCheckedChange={(checked) =>
                                handlePermissionChange(module.key, 'edit', checked as boolean)
                              }
                            />
                          )}
                          {actions.includes('access') && (
                            <Checkbox
                              checked={modulePerms?.access === true}
                              onCheckedChange={(checked) =>
                                handlePermissionChange(module.key, 'access', checked as boolean)
                              }
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {actions.includes('delete') && (
                            <Checkbox
                              checked={modulePerms?.delete === true}
                              onCheckedChange={(checked) =>
                                handlePermissionChange(module.key, 'delete', checked as boolean)
                              }
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {actions.includes('discount') && (
                              <div className="flex items-center gap-1">
                                <Checkbox
                                  checked={modulePerms?.discount === true}
                                  onCheckedChange={(checked) =>
                                    handlePermissionChange(module.key, 'discount', checked as boolean)
                                  }
                                />
                                <span className="text-xs">Discount</span>
                              </div>
                            )}
                            {actions.includes('void') && (
                              <div className="flex items-center gap-1">
                                <Checkbox
                                  checked={modulePerms?.void === true}
                                  onCheckedChange={(checked) =>
                                    handlePermissionChange(module.key, 'void', checked as boolean)
                                  }
                                />
                                <span className="text-xs">Void</span>
                              </div>
                            )}
                            {actions.includes('refund') && (
                              <div className="flex items-center gap-1">
                                <Checkbox
                                  checked={modulePerms?.refund === true}
                                  onCheckedChange={(checked) =>
                                    handlePermissionChange(module.key, 'refund', checked as boolean)
                                  }
                                />
                                <span className="text-xs">Refund</span>
                              </div>
                            )}
                            {actions.includes('adjust') && (
                              <div className="flex items-center gap-1">
                                <Checkbox
                                  checked={modulePerms?.adjust === true}
                                  onCheckedChange={(checked) =>
                                    handlePermissionChange(module.key, 'adjust', checked as boolean)
                                  }
                                />
                                <span className="text-xs">Adjust</span>
                              </div>
                            )}
                            {actions.includes('export') && (
                              <div className="flex items-center gap-1">
                                <Checkbox
                                  checked={modulePerms?.export === true}
                                  onCheckedChange={(checked) =>
                                    handlePermissionChange(module.key, 'export', checked as boolean)
                                  }
                                />
                                <span className="text-xs">Export</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseDialog}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                editingRole ? 'Update Role' : 'Create Role'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingRole} onOpenChange={(open) => !open && setDeletingRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingRole?.name}</strong>?
              This action cannot be undone. System roles and roles assigned to users cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

