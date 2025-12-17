import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getCurrentUser } from '@/actions/auth'

export async function GET() {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ user: null })
    }

    // Get full user data with role permissions
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ user: null })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        roleId: user.roleId,
        roleName: user.roleRelation?.name || null,
        permissions: user.roleRelation ? JSON.parse(user.roleRelation.permissions) : null,
      },
    })
  } catch (error) {
    console.error('Error fetching session:', error)
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    )
  }
}

