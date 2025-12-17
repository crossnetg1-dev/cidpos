'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Trash2, Download, Upload, FileJson, Database, AlertCircle } from 'lucide-react'
import { resetDatabase } from '@/actions/settings'
import { generateJsonBackup, restoreJsonBackup, downloadDbFile, restoreDbFile } from '@/actions/backup'
import { PasswordConfirmationDialog } from '@/components/settings/password-confirmation-dialog'
import { toast } from 'sonner'

export function SystemSettings() {
  const router = useRouter()
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [showJsonRestoreDialog, setShowJsonRestoreDialog] = useState(false)
  const [showDbRestoreDialog, setShowDbRestoreDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isJsonBackupLoading, setIsJsonBackupLoading] = useState(false)
  const [isDbBackupLoading, setIsDbBackupLoading] = useState(false)
  const [jsonBackupFile, setJsonBackupFile] = useState<File | null>(null)
  const [dbBackupFile, setDbBackupFile] = useState<File | null>(null)
  const jsonFileInputRef = useRef<HTMLInputElement>(null)
  const dbFileInputRef = useRef<HTMLInputElement>(null)

  // JSON Backup Handlers
  const handleDownloadJsonBackup = async () => {
    setIsJsonBackupLoading(true)
    try {
      const result = await generateJsonBackup()
      if (result.success && result.data) {
        // Create a blob and download
        const blob = new Blob([JSON.stringify(result.data, null, 2)], {
          type: 'application/json',
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const date = new Date().toISOString().split('T')[0]
        a.download = `POS_Backup_${date}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('JSON backup downloaded successfully')
      } else {
        toast.error(result.error || 'Failed to generate backup')
      }
    } catch (error) {
      console.error('Backup error:', error)
      toast.error('An error occurred while generating backup')
    } finally {
      setIsJsonBackupLoading(false)
    }
  }

  const handleJsonFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.json')) {
        toast.error('Please select a valid JSON backup file')
        return
      }
      setJsonBackupFile(file)
    }
  }

  const handleJsonRestore = async (password: string) => {
    if (!jsonBackupFile) {
      toast.error('Please select a backup file')
      return
    }

    setIsLoading(true)
    try {
      // Read file content
      const text = await jsonBackupFile.text()
      let backupData
      try {
        backupData = JSON.parse(text)
      } catch (parseError) {
        throw new Error('Invalid backup file format. The file may be corrupted.')
      }

      const result = await restoreJsonBackup(backupData, password)
      if (result.success) {
        toast.success(result.message || 'Database restored successfully')
        setJsonBackupFile(null)
        if (jsonFileInputRef.current) {
          jsonFileInputRef.current.value = ''
        }
        setShowJsonRestoreDialog(false)
        router.refresh()
      } else {
        throw new Error(result.error || 'Failed to restore database')
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred during restore')
      throw error // Re-throw to show error in dialog
    } finally {
      setIsLoading(false)
    }
  }

  // DB File Backup Handlers
  const handleDownloadDbFile = async () => {
    setIsDbBackupLoading(true)
    try {
      const result = await downloadDbFile()
      if (result.success && result.data) {
        // Convert Base64 to Blob
        const binaryString = atob(result.data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        const blob = new Blob([bytes], {
          type: 'application/x-sqlite3',
        })

        // Create download link
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const date = new Date().toISOString().split('T')[0]
        a.download = `POS_Database_${date}.db`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('Database file downloaded successfully')
      } else {
        toast.error(result.error || 'Failed to download database file')
      }
    } catch (error) {
      console.error('DB download error:', error)
      toast.error('An error occurred while downloading database file')
    } finally {
      setIsDbBackupLoading(false)
    }
  }

  const handleDbFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.db') && !file.name.endsWith('.sqlite') && !file.name.endsWith('.sqlite3')) {
        toast.error('Please select a valid database file (.db, .sqlite, or .sqlite3)')
        return
      }
      setDbBackupFile(file)
    }
  }

  const handleDbRestore = async (password: string) => {
    if (!dbBackupFile) {
      toast.error('Please select a database file')
      return
    }

    setIsLoading(true)
    try {
      // Read file as base64
      const reader = new FileReader()
      const fileData = await new Promise<string>((resolve, reject) => {
        reader.onload = (e) => {
          if (e.target?.result) {
            // Convert ArrayBuffer to base64
            const arrayBuffer = e.target.result as ArrayBuffer
            const bytes = new Uint8Array(arrayBuffer)
            let binary = ''
            for (let i = 0; i < bytes.length; i++) {
              binary += String.fromCharCode(bytes[i])
            }
            const base64 = btoa(binary)
            resolve(base64)
          } else {
            reject(new Error('Failed to read file'))
          }
        }
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsArrayBuffer(dbBackupFile)
      })

      const result = await restoreDbFile(fileData, password)
      if (result.success) {
        toast.success(result.message || 'Database file restored successfully. Please restart your application.', {
          duration: 10000, // Show for 10 seconds
        })
        setDbBackupFile(null)
        if (dbFileInputRef.current) {
          dbFileInputRef.current.value = ''
        }
        setShowDbRestoreDialog(false)
        // Note: We don't refresh the router here as the user needs to restart the app
      } else {
        throw new Error(result.error || 'Failed to restore database file')
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred during restore')
      throw error // Re-throw to show error in dialog
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = async (password: string) => {
    setIsLoading(true)
    try {
      const result = await resetDatabase(password)
      if (result.success) {
        toast.success(result.message || 'Database reset successfully')
        setShowResetDialog(false)
        router.refresh()
      } else {
        throw new Error(result.error || 'Failed to reset database')
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred')
      throw error // Re-throw to show error in dialog
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* Dual Backup & Restore Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Card 1: Data Only Backup (JSON) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileJson className="h-5 w-5" />
                Data Only Backup (.json)
              </CardTitle>
              <CardDescription>
                Best for transferring data or fixing specific records. Safe and version-compatible.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Button
                  onClick={handleDownloadJsonBackup}
                  disabled={isJsonBackupLoading}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isJsonBackupLoading ? 'Generating Backup...' : 'Download JSON'}
                </Button>
              </div>
              <div className="space-y-2">
                <Input
                  ref={jsonFileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleJsonFileSelect}
                  className="cursor-pointer"
                />
                {jsonBackupFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileJson className="h-4 w-4" />
                    {jsonBackupFile.name}
                  </div>
                )}
                <Button
                  onClick={() => setShowJsonRestoreDialog(true)}
                  disabled={!jsonBackupFile || isLoading}
                  variant="outline"
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Restore Data
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: System Snapshot (.db) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Full Database Snapshot (.db)
              </CardTitle>
              <CardDescription>
                Best for moving the system to a new computer. Creates an exact clone. Requires Server Restart.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Button
                  onClick={handleDownloadDbFile}
                  disabled={isDbBackupLoading}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isDbBackupLoading ? 'Downloading...' : 'Download DB File'}
                </Button>
              </div>
              <div className="space-y-2">
                <Input
                  ref={dbFileInputRef}
                  type="file"
                  accept=".db,.sqlite,.sqlite3"
                  onChange={handleDbFileSelect}
                  className="cursor-pointer"
                />
                {dbBackupFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Database className="h-4 w-4" />
                    {dbBackupFile.name}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Warning
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Restoring will overwrite everything immediately
                  </span>
                </div>
                <Button
                  onClick={() => setShowDbRestoreDialog(true)}
                  disabled={!dbBackupFile || isLoading}
                  variant="outline"
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Restore Database
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Danger Zone */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions that affect all transaction data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Clear Transaction Data</h3>
              <p className="text-sm text-muted-foreground">
                This will permanently delete all sales, purchases, stock movements, and transaction
                history. Products, categories, users, and settings will be preserved. This action
                cannot be undone.
              </p>
              <Button
                variant="destructive"
                onClick={() => setShowResetDialog(true)}
                className="mt-4"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Reset All Sales & Transactions
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Password Confirmation Dialog for Reset */}
      <PasswordConfirmationDialog
        open={showResetDialog}
        onOpenChange={setShowResetDialog}
        onConfirm={handleReset}
        title="Confirm Database Reset"
        description="Enter your password to confirm this dangerous action. This will permanently delete all transaction data."
        confirmButtonText="Reset Database"
        isLoading={isLoading}
      />

      {/* Password Confirmation Dialog for JSON Restore */}
      <PasswordConfirmationDialog
        open={showJsonRestoreDialog}
        onOpenChange={setShowJsonRestoreDialog}
        onConfirm={handleJsonRestore}
        title="Confirm Data Restore"
        description="Enter your password to confirm this action. This will replace all existing data with the JSON backup."
        confirmButtonText="Restore Data"
        isLoading={isLoading}
      />

      {/* Password Confirmation Dialog for DB File Restore */}
      <PasswordConfirmationDialog
        open={showDbRestoreDialog}
        onOpenChange={setShowDbRestoreDialog}
        onConfirm={handleDbRestore}
        title="Confirm Database Restore"
        description="Enter your password to confirm this action. This will overwrite the entire database file. You will need to restart the application after this operation."
        confirmButtonText="Restore Database"
        isLoading={isLoading}
      />
    </>
  )
}
