'use client'

import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { downloadTemplate, readExcelFile } from '@/lib/excel-service'
import { PRODUCT_COLUMNS } from '@/actions/product-excel'
import { bulkImportProducts } from '@/actions/products'
import { toast } from 'sonner'
import { Upload, Download, FileSpreadsheet, X } from 'lucide-react'
import { useTransition } from 'react'

interface ProductImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface ParsedRow {
  barcode?: string
  name?: string
  category?: string
  costPrice?: number | string
  sellPrice?: number | string
  stock?: number | string
  description?: string
  _rowNumber?: number
  _errors?: string[]
}

export function ProductImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: ProductImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedRow[]>([])
  const [validationErrors, setValidationErrors] = useState<Map<number, string[]>>(new Map())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()

  const handleDownloadTemplate = async () => {
    try {
      await downloadTemplate(PRODUCT_COLUMNS, 'product_template')
      toast.success('Template downloaded successfully')
    } catch (error) {
      console.error('Error downloading template:', error)
      toast.error('Failed to download template')
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validate file type
    if (
      !selectedFile.name.endsWith('.xlsx') &&
      !selectedFile.name.endsWith('.xls')
    ) {
      toast.error('Please select a valid Excel file (.xlsx or .xls)')
      return
    }

    setFile(selectedFile)

    try {
      // Parse Excel file
      const data = await readExcelFile(selectedFile)
      
      // Map parsed data to our structure
      const mappedData: ParsedRow[] = data.map((row, index) => {
        // Map Excel headers to our keys (case-insensitive)
        const mappedRow: ParsedRow = {
          barcode: row['Barcode']?.toString().trim() || row['barcode']?.toString().trim() || '',
          name: row['Name']?.toString().trim() || row['name']?.toString().trim() || '',
          category: row['Category']?.toString().trim() || row['category']?.toString().trim() || '',
          costPrice: row['Cost Price'] || row['costPrice'] || row['Cost Price'] || '',
          sellPrice: row['Sell Price'] || row['sellPrice'] || row['Sell Price'] || '',
          stock: row['Stock'] || row['stock'] || '',
          description: row['Description']?.toString().trim() || row['description']?.toString().trim() || '',
          _rowNumber: index + 2, // Excel row number (1 is header, so data starts at 2)
        }
        return mappedRow
      })

      // Validate data
      const errors = new Map<number, string[]>()
      mappedData.forEach((row, index) => {
        const rowErrors: string[] = []
        const rowNumber = row._rowNumber || index + 2

        // Check required fields
        if (!row.barcode || row.barcode.trim() === '') {
          rowErrors.push('Barcode is required')
        }
        if (!row.name || row.name.trim() === '') {
          rowErrors.push('Name is required')
        }
        if (!row.category || row.category.trim() === '') {
          rowErrors.push('Category is required')
        }
        if (!row.costPrice || row.costPrice === '') {
          rowErrors.push('Cost Price is required')
        } else {
          const costPrice = parseFloat(row.costPrice.toString())
          if (isNaN(costPrice) || costPrice < 0) {
            rowErrors.push('Cost Price must be a valid number')
          }
        }
        if (!row.sellPrice || row.sellPrice === '') {
          rowErrors.push('Sell Price is required')
        } else {
          const sellPrice = parseFloat(row.sellPrice.toString())
          if (isNaN(sellPrice) || sellPrice < 0) {
            rowErrors.push('Sell Price must be a valid number')
          }
        }
        if (row.stock === undefined || row.stock === '' || row.stock === null) {
          rowErrors.push('Stock is required')
        } else {
          const stock = parseFloat(row.stock.toString())
          if (isNaN(stock) || stock < 0) {
            rowErrors.push('Stock must be a valid number')
          }
        }

        if (rowErrors.length > 0) {
          errors.set(rowNumber, rowErrors)
        }
      })

      setValidationErrors(errors)
      setParsedData(mappedData)
    } catch (error) {
      console.error('Error parsing file:', error)
      toast.error('Failed to parse Excel file. Please check the format.')
      setFile(null)
      setParsedData([])
      setValidationErrors(new Map())
    }
  }

  const handleImport = () => {
    if (parsedData.length === 0) {
      toast.error('No data to import')
      return
    }

    if (validationErrors.size > 0) {
      toast.error('Please fix validation errors before importing')
      return
    }

    startTransition(async () => {
      try {
        // Transform data for server action
        const importData = parsedData.map((row) => ({
          barcode: row.barcode?.trim() || '',
          name: row.name?.trim() || '',
          category: row.category?.trim() || '',
          costPrice: parseFloat(row.costPrice?.toString() || '0'),
          sellPrice: parseFloat(row.sellPrice?.toString() || '0'),
          stock: parseFloat(row.stock?.toString() || '0'),
          description: row.description?.trim() || '',
        }))

        const result = await bulkImportProducts(importData)

        if (result.success) {
          toast.success(`Successfully imported ${result.imported} product(s)`)
          if (result.updated > 0) {
            toast.info(`${result.updated} product(s) were updated`)
          }
          handleClose()
          onSuccess?.()
        } else {
          toast.error(result.error || 'Failed to import products')
        }
      } catch (error) {
        console.error('Import error:', error)
        toast.error('An error occurred during import')
      }
    })
  }

  const handleClose = () => {
    setFile(null)
    setParsedData([])
    setValidationErrors(new Map())
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onOpenChange(false)
  }

  const hasErrors = validationErrors.size > 0
  const canImport = parsedData.length > 0 && !hasErrors

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Products from Excel</DialogTitle>
          <DialogDescription>
            Upload an Excel file to import products in bulk. Download the template to see the required format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download Template Button */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Template
            </Button>
          </div>

          {/* File Upload Area */}
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
            <div className="flex flex-col items-center justify-center gap-4">
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">Select an Excel file to import</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supported formats: .xlsx, .xls
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="excel-file-input"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                {file ? file.name : 'Choose File'}
              </Button>
              {file && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null)
                    setParsedData([])
                    setValidationErrors(new Map())
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ''
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Preview Table */}
          {parsedData.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Preview ({parsedData.length} row{parsedData.length !== 1 ? 's' : ''})
                </p>
                {hasErrors && (
                  <p className="text-sm text-destructive">
                    {validationErrors.size} row{validationErrors.size !== 1 ? 's' : ''} with errors
                  </p>
                )}
              </div>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Row</TableHead>
                      <TableHead>Barcode</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Cost Price</TableHead>
                      <TableHead>Sell Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((row, index) => {
                      const rowNumber = row._rowNumber || index + 2
                      const errors = validationErrors.get(rowNumber) || []
                      const hasRowErrors = errors.length > 0

                      return (
                        <TableRow
                          key={index}
                          className={hasRowErrors ? 'bg-destructive/10' : ''}
                        >
                          <TableCell className="font-medium">{rowNumber}</TableCell>
                          <TableCell
                            className={
                              !row.barcode || row.barcode.trim() === ''
                                ? 'bg-destructive/20 text-destructive font-medium'
                                : ''
                            }
                          >
                            {row.barcode || <span className="text-destructive">Required</span>}
                          </TableCell>
                          <TableCell
                            className={
                              !row.name || row.name.trim() === ''
                                ? 'bg-destructive/20 text-destructive font-medium'
                                : ''
                            }
                          >
                            {row.name || <span className="text-destructive">Required</span>}
                          </TableCell>
                          <TableCell
                            className={
                              !row.category || row.category.trim() === ''
                                ? 'bg-destructive/20 text-destructive font-medium'
                                : ''
                            }
                          >
                            {row.category || <span className="text-destructive">Required</span>}
                          </TableCell>
                          <TableCell
                            className={
                              !row.costPrice || row.costPrice === ''
                                ? 'bg-destructive/20 text-destructive font-medium'
                                : ''
                            }
                          >
                            {row.costPrice || <span className="text-destructive">Required</span>}
                          </TableCell>
                          <TableCell
                            className={
                              !row.sellPrice || row.sellPrice === ''
                                ? 'bg-destructive/20 text-destructive font-medium'
                                : ''
                            }
                          >
                            {row.sellPrice || <span className="text-destructive">Required</span>}
                          </TableCell>
                          <TableCell
                            className={
                              row.stock === undefined || row.stock === '' || row.stock === null
                                ? 'bg-destructive/20 text-destructive font-medium'
                                : ''
                            }
                          >
                            {row.stock !== undefined && row.stock !== '' && row.stock !== null
                              ? row.stock
                              : <span className="text-destructive">Required</span>}
                          </TableCell>
                          <TableCell>{row.description || '-'}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              {hasErrors && (
                <div className="text-sm text-destructive space-y-1">
                  <p className="font-medium">Validation Errors:</p>
                  {Array.from(validationErrors.entries()).map(([rowNum, errors]) => (
                    <p key={rowNum}>
                      Row {rowNum}: {errors.join(', ')}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={!canImport || isPending}
          >
            {isPending ? 'Importing...' : `Import ${parsedData.length} Product${parsedData.length !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

