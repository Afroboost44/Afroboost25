'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FiX, FiArrowLeft } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

export default function PaymentCancel() {
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    // Notify parent window if this is a popup
    if (window.opener) {
      window.opener.postMessage({
        type: 'PAYMENT_CANCELLED'
      }, '*');
      window.close();
    }
  }, []);

  const handleReturnHome = () => {
    // Try to go back to the previous page or dashboard
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-pink-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-black/80 backdrop-blur-sm border border-white/10 rounded-2xl p-8 w-full max-w-md text-center"
      >
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gray-600 flex items-center justify-center">
          <FiX className="text-white" size={24} />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-4">
          Payment Cancelled
        </h1>
        
        <p className="text-gray-400 mb-6">
          Your payment was cancelled. No charges have been made to your account.
        </p>
        
        <div className="space-y-3">
          <button
            onClick={handleReturnHome}
            className="w-full btn-primary flex items-center justify-center"
          >
            <FiArrowLeft className="mr-2" />
            Return to Application
          </button>
          
          <p className="text-sm text-gray-500">
            You can try again anytime from your dashboard
          </p>
        </div>
      </motion.div>
    </div>
  );
}