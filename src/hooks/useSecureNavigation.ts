'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { validateSession, resetSession } from '@/lib/navigationUtils';
import { useCallback } from 'react';

export const useSecureNavigation = () => {
  const router = useRouter();
  const { user } = useAuth();

  const navigate = useCallback(async (href: string, options?: { replace?: boolean }) => {
    try {
      // Validate session before navigation for protected routes
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

      const isProtectedRoute = protectedRoutes.some(route => href.startsWith(route));

      if (isProtectedRoute) {
        const isValidSession = await validateSession();
        
        if (!isValidSession || !user) {
          console.log('Invalid session or no user, redirecting to login');
          resetSession();
          router.push('/login');
          return;
        }
      }

      // Perform navigation
      if (options?.replace) {
        router.replace(href);
      } else {
        router.push(href);
      }
    } catch (error) {
      console.error('Navigation error:', error);
      
      // Fallback to window.location for critical navigation
      if (href === '/login' || href === '/') {
        window.location.href = href;
      } else {
        // For other routes, try again with window.location after a short delay
        setTimeout(() => {
          window.location.href = href;
        }, 100);
      }
    }
  }, [router, user]);

  const refresh = useCallback(() => {
    window.location.reload();
  }, []);

  const goBack = useCallback(() => {
    try {
      router.back();
    } catch (error) {
      console.error('Go back error:', error);
      window.history.back();
    }
  }, [router]);

  return { navigate, refresh, goBack };
};

export default useSecureNavigation;
