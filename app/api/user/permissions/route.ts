import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/actions/auth'
import type { PermissionStructure } from '@/actions/roles'

export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user || !user.roleRelation) {
      return NextResponse.json({ permissions: null })
    }

    const permissions = JSON.parse(user.roleRelation.permissions) as PermissionStructure

    return NextResponse.json({ permissions })
  } catch (error) {
    console.error('Error fetching user permissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    )
  }
}

