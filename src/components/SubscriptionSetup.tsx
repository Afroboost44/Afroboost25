'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiPlay, FiCheck, FiAlertTriangle, FiPackage } from 'react-icons/fi';
import { useAuth } from '@/lib/auth';
import { subscriptionSettingsService, subscriptionPlanService } from '@/lib/database';
import Card from '@/components/Card';

export default function SubscriptionSetup() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeSubscriptionSystem = async () => {
    if (!user || user.role !== 'admin') return;

    try {
      setIsLoading(true);
      setError(null);

      // Create default subscription settings
      const defaultSettings = {
        singleSessionPrice: 15,
        annualSubscriptionPrice: 100,
        currency: 'USD',
        sessionPackPlans: [
          { sessionCount: 10, price: 150, isActive: true },
          { sessionCount: 15, price: 220, isActive: true },
          { sessionCount: 20, price: 280, isActive: true }
        ],
        lastUpdatedBy: user.id,
        lastUpdatedAt: new Date()
      };

      await subscriptionSettingsService.create(defaultSettings);

      // Create default subscription plans
      const defaultPlans = [
        {
          name: '10 Session Package',
          description: 'Perfect for getting started with dance classes. 10 sessions with no expiry.',
          type: 'session_pack' as const,
          sessionCount: 10,
          price: 150,
          isActive: true,
          createdBy: user.id
        },
        {
          name: '15 Session Package',
          description: 'Great value for regular dancers. 15 sessions with extended validity.',
          type: 'session_pack' as const,
          sessionCount: 15,
          price: 220,
          isActive: true,
          createdBy: user.id
        },
        {
          name: 'Annual Unlimited',
          description: 'Unlimited access to all dance classes for a full year. Best value for dedicated dancers!',
          type: 'annual' as const,
          price: 100,
          isActive: true,
          createdBy: user.id
        }
      ];

      for (const plan of defaultPlans) {
        await subscriptionPlanService.create(plan);
      }

      setSetupComplete(true);
    } catch (error) {
      console.error('Error initializing subscription system:', error);
      setError('Failed to initialize subscription system. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <Card>
      <div className="text-center py-8">
        {setupComplete ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <FiCheck className="text-green-400" size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-green-400 mb-2">
                Subscription System Initialized!
              </h2>
              <p className="text-gray-400">
                Your subscription system is now ready. You can manage plans and pricing in the coach dashboard.
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-[#D91CD2]/20 rounded-full flex items-center justify-center mx-auto">
              <FiPackage className="text-[#D91CD2]" size={32} />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold mb-2">
                Initialize Subscription System
              </h2>
              <p className="text-gray-400 mb-6">
                Set up the subscription system with default plans and pricing. This will create:
              </p>
              
              <div className="text-left bg-gray-800 rounded-lg p-4 mb-6 space-y-2">
                <div className="flex items-center">
                  <FiCheck className="text-green-400 mr-2" size={16} />
                  <span className="text-sm">Default pricing settings (15 USD per session, 100 USD annual)</span>
                </div>
                <div className="flex items-center">
                  <FiCheck className="text-green-400 mr-2" size={16} />
                  <span className="text-sm">10, 15, and 20 session packages</span>
                </div>
                <div className="flex items-center">
                  <FiCheck className="text-green-400 mr-2" size={16} />
                  <span className="text-sm">Annual unlimited subscription</span>
                </div>
                <div className="flex items-center">
                  <FiCheck className="text-green-400 mr-2" size={16} />
                  <span className="text-sm">Database collections and structure</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-4 flex items-center">
                <FiAlertTriangle className="text-red-500 mr-2" />
                <p className="text-red-500 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={initializeSubscriptionSystem}
              disabled={isLoading}
              className="btn-primary flex items-center justify-center mx-auto disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : (
                <FiPlay className="mr-2" />
              )}
              {isLoading ? 'Initializing...' : 'Initialize Subscription System'}
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
