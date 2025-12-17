import type { PermissionStructure } from '@/actions/roles'

/**
 * Default permissions structure (all false)
 */
export function getDefaultPermissions(): PermissionStructure {
  return {
    dashboard: { view: false },
    pos: { access: false, discount: false, void: false },
    products: { view: false, create: false, edit: false, delete: false },
    categories: { view: false, create: false, edit: false, delete: false },
    purchases: { view: false, create: false, edit: false, delete: false },
    sales: { view: false, edit: false, void: false, refund: false },
    stock: { view: false, adjust: false },
    customers: { view: false, create: false, edit: false, delete: false },
    reports: { view: false, export: false },
    settings: { view: false, edit: false },
  }
}

/**
 * Super Admin permissions (all true)
 */
export function getSuperAdminPermissions(): PermissionStructure {
  return {
    dashboard: { view: true },
    pos: { access: true, discount: true, void: true },
    products: { view: true, create: true, edit: true, delete: true },
    categories: { view: true, create: true, edit: true, delete: true },
    purchases: { view: true, create: true, edit: true, delete: true },
    sales: { view: true, edit: true, void: true, refund: true },
    stock: { view: true, adjust: true },
    customers: { view: true, create: true, edit: true, delete: true },
    reports: { view: true, export: true },
    settings: { view: true, edit: true },
  }
}

/**
 * Cashier permissions (limited)
 */
export function getCashierPermissions(): PermissionStructure {
  return {
    dashboard: { view: true },
    pos: { access: true, discount: false, void: false },
    products: { view: true, create: false, edit: false, delete: false },
    categories: { view: false, create: false, edit: false, delete: false },
    purchases: { view: false, create: false, edit: false, delete: false },
    sales: { view: true, edit: false, void: false, refund: false },
    stock: { view: true, adjust: false },
    customers: { view: true, create: true, edit: false, delete: false },
    reports: { view: false, export: false },
    settings: { view: false, edit: false },
  }
}

