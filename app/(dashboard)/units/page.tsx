'use client'

import { useState, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { UnitForm } from '@/components/units/unit-form'
import { getUnits, deleteUnit } from '@/actions/units'
import { Plus, Search, Edit, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export default function UnitsPage() {
  const [units, setUnits] = useState<Array<{
    id: string
    name: string
    shortName: string
    isActive: boolean
  }>>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<typeof units[0] | null>(null)
  const [deletingUnit, setDeletingUnit] = useState<typeof units[0] | null>(null)

  const loadUnits = async () => {
    startTransition(async () => {
      try {
        const data = await getUnits(false) // Only active units
        setUnits(data)
      } catch (error) {
        toast.error('Failed to load units')
      }
    })
  }

  useEffect(() => {
    loadUnits()
  }, [])

  const handleSearch = (value: string) => {
    setSearchQuery(value)
  }

  const filteredUnits = units.filter((unit) =>
    unit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    unit.shortName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDelete = async () => {
    if (!deletingUnit) return

    startTransition(async () => {
      try {
        const result = await deleteUnit(deletingUnit.id)
        if (result.success) {
          toast.success('Unit deleted successfully')
          setDeletingUnit(null)
          loadUnits()
        } else {
          toast.error(result.error || 'Failed to delete unit')
        }
      } catch (error) {
        toast.error('An error occurred')
      }
    })
  }

  const handleEdit = (unit: typeof units[0]) => {
    setEditingUnit(unit)
    setIsFormOpen(true)
  }

  const handleAdd = () => {
    setEditingUnit(null)
    setIsFormOpen(true)
  }

  const handleFormSuccess = () => {
    setIsFormOpen(false)
    setEditingUnit(null)
    loadUnits()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Units</h1>
          <p className="text-muted-foreground">Manage measurement units</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Unit
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search units..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Units Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Short Name</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && units.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredUnits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'No units found matching your search' : 'No units found'}
                </TableCell>
              </TableRow>
            ) : (
              filteredUnits.map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell>
                    <div className="font-medium">{unit.name}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground font-mono">{unit.shortName}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(unit)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingUnit(unit)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Unit Form Dialog */}
      <UnitForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        unit={editingUnit}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingUnit} onOpenChange={(open) => !open && setDeletingUnit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the unit "{deletingUnit?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

