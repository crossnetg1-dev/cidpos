'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { createCategory, updateCategory, type CategoryFormData } from '@/actions/categories'
import { toast } from 'sonner'

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  image: z.string().optional().refine(
    (val) => !val || val === '' || z.string().url().safeParse(val).success,
    { message: 'Must be a valid URL' }
  ),
})

type CategoryFormValues = z.infer<typeof categorySchema>

interface CategoryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: {
    id: string
    name: string
    description: string | null
    image: string | null
  } | null
  onSuccess?: () => void
}

export function CategoryForm({ open, onOpenChange, category, onSuccess }: CategoryFormProps) {
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
      image: '',
    },
  })

  // Reset form when category changes
  useEffect(() => {
    if (category) {
      reset({
        name: category.name,
        description: category.description || '',
        image: category.image || '',
      })
    } else {
      reset({
        name: '',
        description: '',
        image: '',
      })
    }
  }, [category, reset])

  const onSubmit = async (data: CategoryFormValues) => {
    setIsLoading(true)
    try {
      const formData: CategoryFormData = {
        name: data.name,
        description: data.description || undefined,
        image: data.image || undefined,
      }

      let result
      if (category) {
        result = await updateCategory(category.id, formData)
      } else {
        result = await createCategory(formData)
      }

      if (result.success) {
        toast.success(category ? 'Category updated successfully' : 'Category created successfully')
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to save category')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{category ? 'Edit Category' : 'Add New Category'}</DialogTitle>
          <DialogDescription>
            {category ? 'Update category information' : 'Create a new product category'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Category name"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Category description (optional)"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Image URL</Label>
            <Input
              id="image"
              {...register('image')}
              placeholder="https://example.com/image.jpg"
            />
            {errors.image && (
              <p className="text-sm text-destructive">{errors.image.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {category ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                category ? 'Update Category' : 'Create Category'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

