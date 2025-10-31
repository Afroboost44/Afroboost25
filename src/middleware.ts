import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Get the pathname
  const pathname = request.nextUrl.pathname;
  
  // Skip middleware for API routes, static files, and Next.js internals
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return response;
  }

  // Check for Firebase auth session cookie with fallback options
  const authToken = request.cookies.get('firebase-auth-token')?.value ||
                   request.cookies.get('next-auth.session-token')?.value ||
                   request.cookies.get('__session')?.value;
  
  const hasAuth = !!authToken;
  
  // Define protected routes
  const protectedRoutes = [
    '/dashboard', 
    '/profile', 
    '/courses', 
    '/publications', 
    '/saved', 
    '/tokens', 
    '/chat', 
    '/subscription',
    '/profile_analytics'
  ];
  
  // Define auth routes
  const authRoutes = ['/login', '/signup'];
  
  // Check if the requested path is a protected route
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  // Check if the requested path is an auth route
  const isAuthRoute = authRoutes.includes(pathname);
  
  console.log('Middleware check:', { 
    pathname, 
    hasAuth, 
    isProtectedRoute, 
    isAuthRoute,
    authToken: authToken ? 'exists' : 'missing'
  });
  
  // If trying to access a protected route while not authenticated, redirect to login
  if (isProtectedRoute && !hasAuth) {
    console.log('Middleware: Redirecting unauthenticated user to login');
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // If trying to access auth routes while authenticated, redirect to dashboard
  if (isAuthRoute && hasAuth) {
    console.log('Middleware: Redirecting authenticated user to dashboard');
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Set cache control headers to prevent caching issues
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}