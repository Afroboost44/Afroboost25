'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function ProfileAnalyticsRedirect() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        // Redirect to the user's profile analytics page
        router.push(`/profile_analytics/${encodeURIComponent(user.email)}`);
      } else {
        // Redirect to login if not authenticated
        router.push('/login');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-[#D91CD2] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
} 