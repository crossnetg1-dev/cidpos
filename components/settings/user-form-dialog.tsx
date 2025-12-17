'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { createUser } from '@/actions/settings'
import { getRoles } from '@/actions/roles'
import { toast } from 'sonner'

const userSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  roleId: z.string().min(1, 'Role is required'),
})

type UserFormValues = z.infer<typeof userSchema>

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function UserFormDialog({ open, onOpenChange, onSuccess }: UserFormDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([])
  const [loadingRoles, setLoadingRoles] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: '',
      fullName: '',
      email: '',
      phone: '',
      password: '',
      roleId: '',
    },
  })

  const roleId = watch('roleId')

  // Fetch roles when dialog opens
  useEffect(() => {
    if (open) {
      setLoadingRoles(true)
      getRoles()
        .then((result) => {
          if (result.success && result.data) {
            setRoles(result.data.map((r) => ({ id: r.id, name: r.name })))
            // Set default to first role if available
            if (result.data.length > 0 && !roleId) {
              setValue('roleId', result.data[0].id)
            }
          } else {
            toast.error(result.error || 'Failed to load roles')
          }
        })
        .catch((error) => {
          console.error('Error loading roles:', error)
          toast.error('Failed to load roles')
        })
        .finally(() => {
          setLoadingRoles(false)
        })
    }
  }, [open, setValue, roleId])

  const onSubmit = async (data: UserFormValues) => {
    setIsLoading(true)
    try {
      const result = await createUser(data)

      if (result.success) {
        toast.success('User created successfully')
        reset()
        onOpenChange(false)
        router.refresh()
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to create user')
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
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new staff account with login credentials
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              {...register('username')}
              placeholder="johndoe"
            />
            {errors.username && (
              <p className="text-sm text-destructive">{errors.username.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              {...register('fullName')}
              placeholder="John Doe"
            />
            {errors.fullName && (
              <p className="text-sm text-destructive">{errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="john@example.com"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              {...register('phone')}
              placeholder="+95 9XXXXXXXXX"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              {...register('password')}
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="roleId">Role *</Label>
            <Select
              value={roleId}
              onValueChange={(value) => setValue('roleId', value)}
              disabled={loadingRoles}
            >
              <SelectTrigger id="roleId">
                <SelectValue placeholder={loadingRoles ? 'Loading roles...' : 'Select a role'} />
              </SelectTrigger>
              <SelectContent>
                {roles.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No roles available
                  </SelectItem>
                ) : (
                  roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.roleId && (
              <p className="text-sm text-destructive">{errors.roleId.message}</p>
            )}
            {loadingRoles && (
              <p className="text-xs text-muted-foreground">Loading roles...</p>
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
                  Creating...
                </>
              ) : (
                'Create User'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

