// Navigation utility to handle session/cookie issues
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

export const useNavigationFix = () => {
  const router = useRouter();

  useEffect(() => {
    // Function to handle navigation with session validation
    const handleNavigation = (url: string) => {
      try {
        // Check if auth token exists
        const authToken = Cookies.get('firebase-auth-token');
        
        if (!authToken) {
          console.log('No auth token found, redirecting to login');
          router.push('/login');
          return;
        }

        // Perform navigation
        router.push(url);
      } catch (error) {
        console.error('Navigation error:', error);
        // Fallback: force reload
        window.location.href = url;
      }
    };

    // Add event listener for navigation issues
    const handleRouteChangeError = (err: any, url: string) => {
      console.error('Route change error:', err, 'URL:', url);
      
      // If there's a navigation error, try to refresh the page
      if (err.cancelled) {
        console.log('Route change was cancelled, retrying...');
        setTimeout(() => {
          window.location.href = url;
        }, 100);
      }
    };

    // Override the default router.push to include error handling
    const originalPush = router.push;
    router.push = (href: string, options?: any) => {
      try {
        return originalPush(href, options);
      } catch (error) {
        console.error('Router push error:', error);
        // Fallback to window.location
        window.location.href = href;
        return Promise.resolve(true);
      }
    };

    return () => {
      // Cleanup if needed
    };
  }, [router]);

  return { router };
};

// Function to clear all cookies and reset session
export const resetSession = () => {
  try {
    // Clear all auth-related cookies
    Cookies.remove('firebase-auth-token', { path: '/' });
    Cookies.remove('next-auth.session-token', { path: '/' });
    Cookies.remove('__session', { path: '/' });
    
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
    
    console.log('Session reset completed');
  } catch (error) {
    console.error('Error resetting session:', error);
  }
};

// Function to validate current session
export const validateSession = async () => {
  try {
    const authToken = Cookies.get('firebase-auth-token');
    
    if (!authToken) {
      console.log('No auth token found');
      return false;
    }

    // You can add additional validation here if needed
    // For now, just check if token exists
    return true;
  } catch (error) {
    console.error('Session validation error:', error);
    return false;
  }
};

// Function to refresh auth token
export const refreshAuthToken = async () => {
  try {
    const { auth } = await import('@/lib/firebase');
    const { getIdToken } = await import('firebase/auth');
    
    if (auth.currentUser) {
      const token = await getIdToken(auth.currentUser, true);
      Cookies.set('firebase-auth-token', token, { 
        expires: 7, 
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
      });
      console.log('Auth token refreshed successfully');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error refreshing auth token:', error);
    return false;
  }
};
