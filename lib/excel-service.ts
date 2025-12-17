'use client'

import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

export interface ColumnDefinition {
  header: string
  key: string
  required: boolean
  width?: number // Optional custom width
}

/**
 * Downloads an Excel template file with styled headers
 * @param columns - Array of column definitions with header, key, and required flag
 * @param filename - Name of the file to download (without extension)
 */
export async function downloadTemplate(
  columns: ColumnDefinition[],
  filename: string = 'template'
): Promise<void> {
  // Create a new workbook and worksheet
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Sheet1')

  // Define columns
  worksheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width || Math.max(col.header.length + 2, 12), // Auto-adjust width
  }))

  // Style the header row
  const headerRow = worksheet.getRow(1)
  
  // Apply base header styling (light gray background, bold)
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' }, // Light gray background
  }
  headerRow.font = {
    bold: true,
  }
  headerRow.alignment = {
    vertical: 'middle',
    horizontal: 'center',
  }
  headerRow.height = 20

  // Style each header cell based on required flag
  columns.forEach((col, index) => {
    const cell = headerRow.getCell(index + 1)
    
    if (col.required) {
      // Required fields: RED font color
      cell.font = {
        ...cell.font,
        color: { argb: 'FFFF0000' }, // Red color
        bold: true,
      }
    } else {
      // Optional fields: Black font color (default)
      cell.font = {
        ...cell.font,
        color: { argb: 'FF000000' }, // Black color
        bold: true,
      }
    }
  })

  // Freeze the header row
  worksheet.views = [
    {
      state: 'frozen',
      ySplit: 1, // Freeze first row
    },
  ]

  // Generate Excel file buffer
  const buffer = await workbook.xlsx.writeBuffer()

  // Download the file
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  saveAs(blob, `${filename}.xlsx`)
}

/**
 * Reads an Excel file and returns parsed data
 * @param file - File object from input
 * @returns Promise with array of objects representing rows
 */
export async function readExcelFile(file: File): Promise<Array<Record<string, any>>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer
        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.load(buffer)

        const worksheet = workbook.worksheets[0]
        const data: Array<Record<string, any>> = []

        // Skip header row (row 1) and process data rows
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return // Skip header

          const rowData: Record<string, any> = {}
          row.eachCell((cell, colNumber) => {
            const headerCell = worksheet.getRow(1).getCell(colNumber)
            const key = headerCell.value?.toString() || `col${colNumber}`
            
            // Get cell value, handling different types
            let value: any = cell.value
            if (cell.value instanceof Date) {
              value = cell.value.toISOString()
            } else if (typeof cell.value === 'object' && cell.value !== null) {
              value = cell.value.toString()
            } else {
              value = cell.value
            }

            rowData[key] = value
          })

          // Only add row if it has at least one non-empty value
          if (Object.values(rowData).some((val) => val !== null && val !== undefined && val !== '')) {
            data.push(rowData)
          }
        })

        resolve(data)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsArrayBuffer(file)
  })
}

