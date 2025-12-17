'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { Decimal } from '@prisma/client/runtime/library'
import { revalidatePath } from 'next/cache'

export interface CustomerOption {
  id: string
  name: string
  phone: string | null
}

export interface CustomerFormData {
  name: string
  phone?: string
  email?: string
  address?: string
  creditLimit?: number
  openingBalance?: number
}

export interface GetCustomersParams {
  query?: string
  page?: number
}

export interface CustomersResponse {
  customers: Array<{
    id: string
    name: string
    phone: string | null
    email: string | null
    address: string | null
    totalSpent: number
    visitCount: number
    creditBalance: number
    lastVisit: string | null
    createdAt: string
  }>
  total: number
  page: number
  totalPages: number
}

/**
 * Get all active customers for selection
 */
export async function getCustomers(): Promise<CustomerOption[]> {
  try {
    const customers = await prisma.customer.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        phone: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    return customers
  } catch (error) {
    console.error('Error fetching customers:', error)
    return []
  }
}

/**
 * Get customers with pagination and search
 */
export async function getCustomersList(params: GetCustomersParams = {}): Promise<CustomersResponse> {
  try {
    const { query, page = 1 } = params
    const pageSize = 20
    const skip = (page - 1) * pageSize

    const where: any = {
      isActive: true,
    }

    // Search by name or phone
    if (query && query.trim().length > 0) {
      where.OR = [
        { name: { contains: query.trim() } },
        { phone: { contains: query.trim() } },
      ]
    }

    // Get total count
    const total = await prisma.customer.count({ where })

    // Get customers with their last sale date
    const customers = await prisma.customer.findMany({
      where,
      skip,
      take: pageSize,
      include: {
        sales: {
          select: {
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        totalSpent: 'desc', // Sort by total spent (highest first)
      },
    })

    // Serialize and calculate last visit
    const serializedCustomers = customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      totalSpent: Number(customer.totalSpent),
      visitCount: customer.visitCount,
      creditBalance: Number(customer.creditBalance),
      lastVisit: customer.sales.length > 0 ? customer.sales[0].createdAt.toISOString() : null,
      createdAt: customer.createdAt.toISOString(),
    }))

    return {
      customers: serializedCustomers,
      total,
      page,
      totalPages: Math.ceil(total / pageSize),
    }
  } catch (error) {
    console.error('Error fetching customers list:', error)
    return {
      customers: [],
      total: 0,
      page: 1,
      totalPages: 0,
    }
  }
}

/**
 * Create a new customer
 */
export async function createCustomer(data: CustomerFormData) {
  try {
    // Check if phone number already exists
    if (data.phone) {
      const existing = await prisma.customer.findUnique({
        where: { phone: data.phone },
      })

      if (existing) {
        return {
          success: false,
          error: 'A customer with this phone number already exists',
        }
      }
    }

    const customer = await prisma.customer.create({
      data: {
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        creditLimit: data.creditLimit || 0,
        openingBalance: data.openingBalance || 0,
        creditBalance: data.openingBalance || 0,
        isActive: true,
      },
    })

    revalidatePath('/customers')
    revalidatePath('/pos')

    return {
      success: true,
      data: customer,
    }
  } catch (error: any) {
    console.error('Error creating customer:', error)
    return {
      success: false,
      error: error.message || 'Failed to create customer',
    }
  }
}

/**
 * Update an existing customer
 */
export async function updateCustomer(id: string, data: CustomerFormData) {
  try {
    // Check if phone number is being changed and if it conflicts
    if (data.phone) {
      const existing = await prisma.customer.findUnique({
        where: { phone: data.phone },
      })

      if (existing && existing.id !== id) {
        return {
          success: false,
          error: 'A customer with this phone number already exists',
        }
      }
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        creditLimit: data.creditLimit || 0,
      },
    })

    revalidatePath('/customers')
    revalidatePath('/pos')

    return {
      success: true,
      data: customer,
    }
  } catch (error: any) {
    console.error('Error updating customer:', error)
    return {
      success: false,
      error: error.message || 'Failed to update customer',
    }
  }
}

/**
 * Delete a customer (only if no sales exist)
 */
export async function deleteCustomer(id: string) {
  try {
    // 1. Fetch Customer details first
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            sales: true,
            customerPayments: true,
          },
        },
      },
    })

    if (!customer) {
      return {
        success: false,
        error: 'Customer not found',
      }
    }

    // 2. PROTECT "Walk-in Customer"
    if (customer.name === 'Walk-in Customer' || customer.name === 'Walk-in') {
      return {
        success: false,
        error: "System Error: You cannot delete the default 'Walk-in Customer'.",
      }
    }

    // 3. PREVENT ORPHAN DATA (Check Sales History)
    if (customer._count.sales > 0) {
      return {
        success: false,
        error: `Cannot delete ${customer.name} because they have ${customer._count.sales} linked sales records. Please archive or keep this record.`,
      }
    }

    // 4. Check payment history
    if (customer._count.customerPayments > 0) {
      return {
        success: false,
        error: `Cannot delete ${customer.name} because they have ${customer._count.customerPayments} payment record(s). Please archive or keep this record.`,
      }
    }

    // 5. Proceed to Delete if safe
    await prisma.customer.delete({
      where: { id },
    })

    revalidatePath('/customers')
    revalidatePath('/pos')

    return {
      success: true,
    }
  } catch (error: any) {
    console.error('Error deleting customer:', error)
    return {
      success: false,
      error: error.message || 'Failed to delete customer',
    }
  }
}

/**
 * Get customer details with recent sales
 */
export async function getCustomerDetails(customerId: string) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        sales: {
          take: 10,
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            saleNumber: true,
            total: true,
            createdAt: true,
            status: true,
          },
        },
      },
    })

    if (!customer) {
      return {
        success: false,
        error: 'Customer not found',
      }
    }

    return {
      success: true,
      data: {
        ...customer,
        totalSpent: Number(customer.totalSpent),
        visitCount: customer.visitCount,
        creditBalance: Number(customer.creditBalance),
        creditLimit: Number(customer.creditLimit),
        openingBalance: Number(customer.openingBalance),
        sales: customer.sales.map((sale) => ({
          ...sale,
          total: Number(sale.total),
          createdAt: sale.createdAt.toISOString(),
        })),
      },
    }
  } catch (error: any) {
    console.error('Error fetching customer details:', error)
    return {
      success: false,
      error: error.message || 'Failed to fetch customer details',
    }
  }
}

/**
 * Repay customer debt
 */
export async function repayDebt(customerId: string, amount: number) {
  try {
    const session = await getSession()
    if (!session) {
      return {
        success: false,
        error: 'Unauthorized. Please log in again.',
      }
    }

    // Get customer to check current debt
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        creditBalance: true,
      },
    })

    if (!customer) {
      return {
        success: false,
        error: 'Customer not found',
      }
    }

    // Validate amount
    if (amount <= 0) {
      return {
        success: false,
        error: 'Repayment amount must be greater than 0',
      }
    }

    const currentDebt = Number(customer.creditBalance)
    if (amount > currentDebt) {
      return {
        success: false,
        error: `Repayment amount (${amount.toLocaleString()} MMK) cannot exceed current debt (${currentDebt.toLocaleString()} MMK)`,
      }
    }

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Fetch all unpaid sales for this customer (FIFO - oldest first)
      const unpaidSales = await tx.sale.findMany({
        where: {
          customerId: customerId,
          paymentStatus: 'UNPAID',
        },
        orderBy: {
          createdAt: 'asc', // Oldest first (FIFO)
        },
      })

      let remainingRepayment = amount
      const settledSales: string[] = []

      // Allocate repayment to invoices (FIFO)
      for (const sale of unpaidSales) {
        if (remainingRepayment <= 0) break

        const saleTotal = Number(sale.total)

        if (remainingRepayment >= saleTotal) {
          // Fully settle this invoice
          await tx.sale.update({
            where: { id: sale.id },
            data: {
              paymentStatus: 'PAID',
            },
          })
          settledSales.push(sale.id)
          remainingRepayment -= saleTotal
        } else {
          // Partial payment (mark as PARTIAL)
          await tx.sale.update({
            where: { id: sale.id },
            data: {
              paymentStatus: 'PARTIAL',
            },
          })
          settledSales.push(sale.id)
          remainingRepayment = 0
          break
        }
      }

      // Update customer debt (decrement creditBalance)
      const updatedCustomer = await tx.customer.update({
        where: { id: customerId },
        data: {
          creditBalance: {
            decrement: new Decimal(amount),
          },
        },
      })

      // Get the next sequential invoice number for debt collection sale
      // Find the highest invoiceNo in the database, or start from 1 if none exists
      const lastSale = await tx.sale.findFirst({
        orderBy: {
          invoiceNo: 'desc',
        },
        select: {
          invoiceNo: true,
        },
      })

      const nextInvoiceNo = lastSale?.invoiceNo ? lastSale.invoiceNo + 1 : 1

      // Generate short invoice number (INV-XXXXXX format) for display
      const generateInvoiceId = () => {
        return 'INV-' + Math.random().toString(36).substring(2, 8).toUpperCase()
      }
      const collectionSaleNumber = generateInvoiceId()

      // Create a Sale record for debt collection (shows up in dashboard/reports)
      await tx.sale.create({
        data: {
          invoiceNo: nextInvoiceNo,
          saleNumber: collectionSaleNumber,
          userId: session.userId,
          customerId: customerId,
          subtotal: new Decimal(amount),
          discount: new Decimal(0),
          discountPercent: new Decimal(0),
          tax: new Decimal(0),
          total: new Decimal(amount),
          paymentMethod: 'CASH',
          paymentStatus: 'PAID',
          saleType: 'DEBT_COLLECTION',
          cashReceived: new Decimal(amount),
          change: new Decimal(0),
          status: 'COMPLETED',
          notes: `Debt repayment - Settled ${settledSales.length} invoice(s)`,
        },
      })

      // Create a CustomerPayment record for tracking
      await tx.customerPayment.create({
        data: {
          customerId: customerId,
          userId: session.userId,
          amount: new Decimal(amount),
          paymentMethod: 'CASH',
          paymentDate: new Date(),
          notes: `Debt repayment - ${amount.toLocaleString()} MMK (Settled ${settledSales.length} invoice(s))`,
        },
      })

      return {
        updatedCustomer,
        settledCount: settledSales.length,
      }
    })

    revalidatePath('/customers')
    revalidatePath('/sales')
    revalidatePath('/dashboard')
    revalidatePath(`/customers/${customerId}`)

    return {
      success: true,
      data: {
        ...result.updatedCustomer,
        creditBalance: Number(result.updatedCustomer.creditBalance),
      },
      message: `Debt repayment of ${amount.toLocaleString()} MMK recorded successfully. ${result.settledCount} invoice(s) settled.`,
    }
  } catch (error: any) {
    console.error('Error repaying debt:', error)
    return {
      success: false,
      error: error.message || 'Failed to record debt repayment',
    }
  }
}

/**
 * Get or create the default "Walk-in Customer"
 */
export async function getOrCreateWalkInCustomer(): Promise<string> {
  try {
    // Try to find existing walk-in customer
    let walkIn = await prisma.customer.findFirst({
      where: {
        name: 'Walk-in Customer',
      },
    })

    if (!walkIn) {
      // Create walk-in customer if it doesn't exist
      walkIn = await prisma.customer.create({
        data: {
          name: 'Walk-in Customer',
          phone: null,
          email: null,
          address: null,
          creditLimit: 0,
          creditBalance: 0,
          totalSpent: 0,
          visitCount: 0,
        },
      })
    }

    return walkIn.id
  } catch (error) {
    console.error('Error getting/creating walk-in customer:', error)
    throw error
  }
}
