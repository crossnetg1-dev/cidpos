'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export interface PermissionStructure {
  dashboard: { view: boolean }
  pos: { access: boolean; discount: boolean; void: boolean }
  products: { view: boolean; create: boolean; edit: boolean; delete: boolean }
  categories: { view: boolean; create: boolean; edit: boolean; delete: boolean }
  purchases: { view: boolean; create: boolean; edit: boolean; delete: boolean }
  sales: { view: boolean; edit: boolean; void: boolean; refund: boolean }
  stock: { view: boolean; adjust: boolean }
  customers: { view: boolean; create: boolean; edit: boolean; delete: boolean }
  reports: { view: boolean; export: boolean }
  settings: { view: boolean; edit: boolean }
}

export interface RoleFormData {
  name: string
  permissions: PermissionStructure
}

/**
 * Get all roles
 */
export async function getRoles() {
  try {
    const session = await getSession()
    if (!session) {
      return {
        success: false,
        error: 'Unauthorized. Please log in again.',
      }
    }

    const roles = await prisma.role.findMany({
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return {
      success: true,
      data: roles.map((role) => ({
        ...role,
        permissions: JSON.parse(role.permissions) as PermissionStructure,
        userCount: role._count.users,
      })),
    }
  } catch (error) {
    console.error('Error fetching roles:', error)
    return {
      success: false,
      error: 'Failed to fetch roles',
    }
  }
}

/**
 * Get role by ID
 */
export async function getRoleById(roleId: string) {
  try {
    const session = await getSession()
    if (!session) {
      return {
        success: false,
        error: 'Unauthorized. Please log in again.',
      }
    }

    const role = await prisma.role.findUnique({
      where: { id: roleId },
    })

    if (!role) {
      return {
        success: false,
        error: 'Role not found',
      }
    }

    return {
      success: true,
      data: {
        ...role,
        permissions: JSON.parse(role.permissions) as PermissionStructure,
      },
    }
  } catch (error) {
    console.error('Error fetching role:', error)
    return {
      success: false,
      error: 'Failed to fetch role',
    }
  }
}

/**
 * Create a new role
 */
export async function createRole(data: RoleFormData) {
  try {
    const session = await getSession()
    if (!session) {
      return {
        success: false,
        error: 'Unauthorized. Please log in again.',
      }
    }

    // Check if role name already exists
    const existing = await prisma.role.findUnique({
      where: { name: data.name },
    })

    if (existing) {
      return {
        success: false,
        error: 'A role with this name already exists',
      }
    }

    const role = await prisma.role.create({
      data: {
        name: data.name,
        permissions: JSON.stringify(data.permissions),
        isSystem: false,
      },
    })

    revalidatePath('/settings')

    return {
      success: true,
      data: {
        ...role,
        permissions: role.permissions as PermissionStructure,
      },
    }
  } catch (error: any) {
    console.error('Error creating role:', error)
    return {
      success: false,
      error: error.message || 'Failed to create role',
    }
  }
}

/**
 * Update a role
 */
export async function updateRole(roleId: string, data: Partial<RoleFormData>) {
  try {
    const session = await getSession()
    if (!session) {
      return {
        success: false,
        error: 'Unauthorized. Please log in again.',
      }
    }

    const role = await prisma.role.findUnique({
      where: { id: roleId },
    })

    if (!role) {
      return {
        success: false,
        error: 'Role not found',
      }
    }

    // Check if name is being changed and if it conflicts
    if (data.name && data.name !== role.name) {
      const existing = await prisma.role.findUnique({
        where: { name: data.name },
      })

      if (existing) {
        return {
          success: false,
          error: 'A role with this name already exists',
        }
      }
    }

    const updateData: any = {}
    if (data.name) updateData.name = data.name
    if (data.permissions) updateData.permissions = JSON.stringify(data.permissions)

    const updated = await prisma.role.update({
      where: { id: roleId },
      data: updateData,
    })

    revalidatePath('/settings')

    return {
      success: true,
      data: {
        ...updated,
        permissions: JSON.parse(updated.permissions) as PermissionStructure,
      },
    }
  } catch (error: any) {
    console.error('Error updating role:', error)
    return {
      success: false,
      error: error.message || 'Failed to update role',
    }
  }
}

/**
 * Delete a role
 */
export async function deleteRole(roleId: string) {
  try {
    const session = await getSession()
    if (!session) {
      return {
        success: false,
        error: 'Unauthorized. Please log in again.',
      }
    }

    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    })

    if (!role) {
      return {
        success: false,
        error: 'Role not found',
      }
    }

    // Prevent deleting system roles
    if (role.isSystem) {
      return {
        success: false,
        error: 'Cannot delete system roles (Super Admin, Cashier, etc.)',
      }
    }

    // Prevent deleting roles assigned to users
    if (role._count.users > 0) {
      return {
        success: false,
        error: `Cannot delete role. It is assigned to ${role._count.users} user(s).`,
      }
    }

    await prisma.role.delete({
      where: { id: roleId },
    })

    revalidatePath('/settings')

    return {
      success: true,
    }
  } catch (error: any) {
    console.error('Error deleting role:', error)
    return {
      success: false,
      error: error.message || 'Failed to delete role',
    }
  }
}

/**
 * Get user permissions (helper function)
 */
export async function getUserPermissions(userId: string): Promise<PermissionStructure | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roleRelation: true,
      },
    })

    if (!user || !user.roleRelation) {
      return null
    }

    return JSON.parse(user.roleRelation.permissions) as PermissionStructure
  } catch (error) {
    console.error('Error fetching user permissions:', error)
    return null
  }
}

/**
 * Check if user has permission (server-side)
 */
export async function hasPermission(
  userId: string,
  module: keyof PermissionStructure,
  action: string
): Promise<boolean> {
  try {
    const permissions = await getUserPermissions(userId)
    if (!permissions) {
      return false
    }

    const modulePermissions = permissions[module] as any
    return modulePermissions?.[action] === true
  } catch (error) {
    console.error('Error checking permission:', error)
    return false
  }
}
