import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/setup', '/api/auth']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // If it's a public route, allow access
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Protected routes (including root path)
  const protectedRoutes = ['/dashboard', '/pos', '/products', '/sales', '/purchases', '/stock', '/customers', '/reports', '/settings']
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  
  // Root path should also check authentication
  const isRootPath = pathname === '/'

  if (isProtectedRoute || isRootPath) {
    // Get session cookie
    const sessionCookie = request.cookies.get('session')?.value

    if (!sessionCookie) {
      // Redirect to login if no session
      const loginUrl = new URL('/login', request.url)
      if (pathname !== '/') {
        loginUrl.searchParams.set('from', pathname)
      }
      return NextResponse.redirect(loginUrl)
    }

    // Verify session
    try {
      const session = await decrypt(sessionCookie)

      if (!session) {
        // Invalid session, clear cookie and redirect to login
        const loginUrl = new URL('/login', request.url)
        if (pathname !== '/') {
          loginUrl.searchParams.set('from', pathname)
        }
        const response = NextResponse.redirect(loginUrl)
        response.cookies.delete('session')
        return response
      }

      // Check if session is expired
      if (new Date() > new Date(session.expiresAt)) {
        // Expired session, clear cookie and redirect to login
        const loginUrl = new URL('/login', request.url)
        if (pathname !== '/') {
          loginUrl.searchParams.set('from', pathname)
        }
        const response = NextResponse.redirect(loginUrl)
        response.cookies.delete('session')
        return response
      }

      // Session is valid
      // If root path, redirect to dashboard (or appropriate page based on permissions)
      if (isRootPath) {
        // Allow the root page to handle the redirect based on user permissions
        return NextResponse.next()
      }
      
      // For other protected routes, allow access
      return NextResponse.next()
    } catch (error) {
      // Error verifying session, clear cookie and redirect to login
      const loginUrl = new URL('/login', request.url)
      if (pathname !== '/') {
        loginUrl.searchParams.set('from', pathname)
      }
      const response = NextResponse.redirect(loginUrl)
      response.cookies.delete('session')
      return response
    }
  }

  // Allow access to other routes
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

