'use client'
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import SellerDashboard from '@/components/SellerDashboard';
import { sellerProfileService } from '@/lib/database';
import { useAuth } from '@/lib/auth';

export default function SellerDashboardPage() {
  const { user } = useAuth();
  const [isSeller, setIsSeller] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSeller() {
      if (user?.email) {
        // Fetch all seller profiles
        const profiles = await sellerProfileService.getAll();
        // Check if any profile matches the logged-in user's email
        const found = profiles.some((profile: any) => profile.email === user.email);
        setIsSeller(found);
      }
      setLoading(false);
    }
    checkSeller();
  }, [user]);

  if (loading) return <div>Loading...</div>;
  if (!isSeller) return <div>Access denied. You are not a seller.</div>;
  return <SellerDashboard />;
}
