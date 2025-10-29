'use client';

import { useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AppContext, translations } from '../providers';
import { useAuth } from '@/lib/auth';
import StudentDashboard from './student-dashboard';
import CoachDashboard from './coach-dashboard';
import AdminDashboard from './admin-dashboard';

export default function Dashboard() {
  const { language } = useContext(AppContext);
  const { user, isLoading } = useAuth();
  const t = translations[language];
  const router = useRouter();

  // Simple redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      console.log('No user found, redirecting to login');
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#D91CD2] border-t-transparent rounded-full animate-spin"></div>
        <p className="ml-4 text-lg">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#D91CD2] border-t-transparent rounded-full animate-spin"></div>
        <p className="ml-4 text-lg">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <h1 className="text-3xl font-bold gradient-text mb-8">{t.myDashboard}</h1>

        {user.role === 'student' && <StudentDashboard />}
        {user.role === 'coach' && <CoachDashboard />}
        {user.role === 'admin' && <AdminDashboard />}
      </motion.div>
    </div>
  );
}