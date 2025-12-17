'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { login } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Lock, User } from 'lucide-react'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(searchParams.get('error'))
  const [isPending, startTransition] = useTransition()

  const handleSubmit = async (formData: FormData) => {
    setError(null)
    
    startTransition(async () => {
      const result = await login(formData)
      
      if (result?.error) {
        setError(result.error)
      }
      // If no error, login will redirect automatically
    })
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive flex items-center gap-2">
          <Lock className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="username" className="text-sm font-medium">
          Username
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="username"
            name="username"
            type="text"
            placeholder="Enter your username"
            required
            autoFocus
            autoComplete="username"
            disabled={isPending}
            className="pl-10 h-11"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium">
          Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Enter your password"
            required
            autoComplete="current-password"
            disabled={isPending}
            className="pl-10 h-11"
          />
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <input
            id="rememberMe"
            name="rememberMe"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
            disabled={isPending}
          />
          <Label 
            htmlFor="rememberMe" 
            className="text-sm font-normal cursor-pointer text-muted-foreground"
          >
            Remember me
          </Label>
        </div>
      </div>
      
      <Button 
        type="submit" 
        className="w-full h-11 text-base font-semibold shadow-md hover:shadow-lg transition-shadow" 
        size="lg" 
        disabled={isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          <>
            <Lock className="mr-2 h-4 w-4" />
            Sign In
          </>
        )}
      </Button>
    </form>
  )
}

