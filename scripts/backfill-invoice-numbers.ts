/**
 * Migration Script: Backfill invoiceNo for existing sales
 * 
 * This script assigns sequential invoice numbers to existing sales
 * that don't have an invoiceNo value.
 * 
 * Run with: npx ts-node --project tsconfig.seed.json scripts/backfill-invoice-numbers.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function backfillInvoiceNumbers() {
  try {
    console.log('Starting invoice number backfill...')

    // Get all sales ordered by creation date (oldest first)
    const sales = await prisma.sale.findMany({
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
        invoiceNo: true,
        createdAt: true,
      },
    })

    console.log(`Found ${sales.length} sales`)

    // Find the highest existing invoiceNo
    const salesWithInvoiceNo = sales.filter((s) => s.invoiceNo !== null)
    const highestInvoiceNo = salesWithInvoiceNo.length > 0
      ? Math.max(...salesWithInvoiceNo.map((s) => s.invoiceNo!))
      : 0

    console.log(`Highest existing invoiceNo: ${highestInvoiceNo}`)

    // Find sales without invoiceNo
    const salesWithoutInvoiceNo = sales.filter((s) => s.invoiceNo === null)
    console.log(`Sales without invoiceNo: ${salesWithoutInvoiceNo.length}`)

    if (salesWithoutInvoiceNo.length === 0) {
      console.log('All sales already have invoice numbers. Nothing to do.')
      return
    }

    // Assign sequential numbers starting from highest + 1
    let nextInvoiceNo = highestInvoiceNo + 1

    console.log(`Starting assignment from invoiceNo: ${nextInvoiceNo}`)

    // Update each sale with a sequential invoice number
    for (const sale of salesWithoutInvoiceNo) {
      await prisma.sale.update({
        where: { id: sale.id },
        data: { invoiceNo: nextInvoiceNo },
      })
      console.log(`Assigned invoiceNo ${nextInvoiceNo} to sale ${sale.id}`)
      nextInvoiceNo++
    }

    console.log(`✅ Successfully backfilled ${salesWithoutInvoiceNo.length} sales`)
    console.log(`Next invoice number will be: ${nextInvoiceNo}`)
  } catch (error) {
    console.error('Error backfilling invoice numbers:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
backfillInvoiceNumbers()
  .then(() => {
    console.log('Backfill completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Backfill failed:', error)
    process.exit(1)
  })

