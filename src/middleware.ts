import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Check for Firebase auth session cookie
  const hasFirebaseAuth = request.cookies.has('firebase-auth-token') || 
                          request.cookies.has('next-auth.session-token') ||
                          request.cookies.has('__session');
  
  const pathname = request.nextUrl.pathname;
  
  // Define protected routes
  const protectedRoutes = ['/dashboard', '/profile', '/courses'];
  
  // Define auth routes
  const authRoutes = ['/login', '/signup'];
  
  // Check if the requested path is a protected route
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  // Check if the requested path is an auth route
  const isAuthRoute = authRoutes.includes(pathname);
  
  // If trying to access a protected route while not authenticated, redirect to login
  if (isProtectedRoute && !hasFirebaseAuth) {
    console.log('Middleware: Redirecting unauthenticated user to login');
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // If trying to access auth routes while authenticated, redirect to home
  if (isAuthRoute && hasFirebaseAuth) {
    console.log('Middleware: Redirecting authenticated user to home');
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}