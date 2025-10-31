'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiPackage, FiCheck, FiUsers, FiCalendar, FiCreditCard, FiTag, FiClock } from 'react-icons/fi';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/lib/auth';
import { SubscriptionPlan, UserSubscription, SubscriptionSettings, DateOrTimestamp } from '@/types';
import { subscriptionPlanService, userSubscriptionService, subscriptionSettingsService, userService, transactionService } from '@/lib/database';
import Card from '@/components/Card';
import PaymentHandler from '@/components/PaymentHandler';

export default function SubscriptionPurchase() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [settings, setSettings] = useState<SubscriptionSettings | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [plansData, settingsData, subscriptionData] = await Promise.all([
        subscriptionPlanService.getActive(),
        subscriptionSettingsService.get(),
        userSubscriptionService.getActiveByUserId(user?.id || '')
      ]);
      
      setPlans(plansData);
      setSettings(settingsData);
      setCurrentSubscription(subscriptionData);
    } catch (error) {
      console.error('Error loading subscription data:', error);
      setError('Failed to load subscription options');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setShowPayment(true);
  };

  const handlePaymentSuccess = async (paymentId: string, method: 'stripe' | 'paypal') => {
    if (!selectedPlan || !user?.id) return;

    try {
      // Create subscription record
      const subscriptionData = {
        userId: user.id,
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        planType: selectedPlan.type,
        totalSessions: selectedPlan.sessionCount,
        remainingSessions: selectedPlan.sessionCount,
        startDate: new Date(),
        endDate: selectedPlan.type === 'annual' ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : undefined,
        status: 'active' as const,
        paymentId,
        paymentMethod: method,
        amount: selectedPlan.price
      };

      await userSubscriptionService.create(subscriptionData);

      // Create transaction record
      await transactionService.create({
        userId: user.id,
        type: 'subscription_purchase',
        amount: selectedPlan.price,
        description: `Subscription: ${selectedPlan.name}`,
        status: 'completed'
      });

      setSuccess('Subscription purchased successfully!');
      setShowPayment(false);
      setSelectedPlan(null);
      await loadData();
      
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Error processing subscription:', error);
      setError('Failed to activate subscription. Please contact support.');
    }
  };

  const calculateDiscount = (sessionCount: number, regularPrice: number) => {
    const singlePrice = settings?.singleSessionPrice || 15;
    const totalRegular = sessionCount * singlePrice;
    const discount = totalRegular - regularPrice;
    const discountPercent = Math.round((discount / totalRegular) * 100);
    return { discount, discountPercent };
  };

  const formatTimeRemaining = (endDate: DateOrTimestamp) => {
    const now = new Date();
    const endDateTime = endDate instanceof Timestamp ? endDate.toDate() : new Date(endDate);
    const timeDiff = endDateTime.getTime() - now.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    if (daysRemaining > 365) {
      return `${Math.floor(daysRemaining / 365)} year(s)`;
    } else if (daysRemaining > 30) {
      return `${Math.floor(daysRemaining / 30)} month(s)`;
    } else {
      return `${daysRemaining} day(s)`;
    }
  };

  if (!user || user.role !== 'student') {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Current Subscription Status */}
      {currentSubscription && (
        <Card>
          <div className="flex items-center space-x-3 mb-4">
            <FiPackage className="text-[#D91CD2]" size={24} />
            <h2 className="text-2xl font-bold">Your Active Subscription</h2>
          </div>
          
          <div className="bg-green-500/20 border border-green-500 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-400">Plan</p>
                <p className="text-lg font-semibold text-green-400">{currentSubscription.planName}</p>
              </div>
              
              {currentSubscription.planType === 'session_pack' && (
                <div>
                  <p className="text-sm text-gray-400">Sessions Remaining</p>
                  <p className="text-lg font-semibold text-green-400">
                    {currentSubscription.remainingSessions} / {currentSubscription.totalSessions}
                  </p>
                </div>
              )}
              
              {currentSubscription.planType === 'annual' && currentSubscription.endDate && (
                <div>
                  <p className="text-sm text-gray-400">Time Remaining</p>
                  <p className="text-lg font-semibold text-green-400">
                    {formatTimeRemaining(currentSubscription.endDate)}
                  </p>
                </div>
              )}
              
              <div>
                <p className="text-sm text-gray-400">Status</p>
                <p className="text-lg font-semibold text-green-400 capitalize">
                  {currentSubscription.status}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Available Subscription Plans */}
      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <FiPackage className="text-[#D91CD2]" size={24} />
          <h2 className="text-2xl font-bold">
            {currentSubscription ? 'Upgrade Your Subscription' : 'Choose Your Subscription'}
          </h2>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-6 flex items-center">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-500/20 border border-green-500 rounded-lg p-3 mb-6 flex items-center">
            <FiCheck className="text-green-500 mr-2" />
            <p className="text-green-500 text-sm">{success}</p>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-[#D91CD2] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-400">Loading subscription options...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Single Session Option */}
            {settings && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800 border border-gray-700 rounded-lg p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Pay Per Session</h3>
                    <p className="text-gray-400 text-sm">No commitment, pay as you go</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#D91CD2]">
                      {settings.singleSessionPrice} {settings.currency}
                    </p>
                    <p className="text-sm text-gray-400">per session</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center text-sm text-gray-400">
                    <FiCreditCard className="mr-2" />
                    <span>Pay per session</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-400">
                    <FiClock className="mr-2" />
                    <span>No expiry</span>
                  </div>
                </div>
                
                <p className="text-sm text-gray-400 mb-4">
                  Perfect for trying out classes or occasional participation. No subscription required.
                </p>
              </motion.div>
            )}

            {/* Session Pack Plans */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Session Packages</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans
                  .filter(plan => plan.type === 'session_pack')
                  .map((plan, index) => {
                    const { discount, discountPercent } = settings 
                      ? calculateDiscount(plan.sessionCount || 0, plan.price)
                      : { discount: 0, discountPercent: 0 };
                    
                    return (
                      <motion.div
                        key={plan.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-[#D91CD2]/50 transition-colors relative"
                      >
                        {discountPercent > 0 && (
                          <div className="absolute -top-2 -right-2 bg-[#D91CD2] text-white text-xs px-2 py-1 rounded-full">
                            -{discountPercent}%
                          </div>
                        )}
                        
                        <div className="text-center mb-4">
                          <h4 className="text-lg font-semibold mb-2">{plan.name}</h4>
                          <p className="text-3xl font-bold text-[#D91CD2] mb-1">
                            {plan.price} {settings?.currency || 'USD'}
                          </p>
                          {discountPercent > 0 && (
                            <p className="text-sm text-gray-400 line-through">
                              {plan.price + discount} {settings?.currency || 'USD'}
                            </p>
                          )}
                        </div>
                        
                        <div className="space-y-3 mb-6">
                          <div className="flex items-center">
                            <FiUsers className="mr-3 text-[#D91CD2]" size={16} />
                            <span className="text-sm">{plan.sessionCount} sessions included</span>
                          </div>
                          <div className="flex items-center">
                            <FiTag className="mr-3 text-[#D91CD2]" size={16} />
                            <span className="text-sm">
                              {((plan.price / (plan.sessionCount || 1))).toFixed(2)} {settings?.currency || 'USD'} per session
                            </span>
                          </div>
                          {discountPercent > 0 && (
                            <div className="flex items-center">
                              <FiCheck className="mr-3 text-green-400" size={16} />
                              <span className="text-sm text-green-400">
                                Save {discount} {settings?.currency || 'USD'}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-400 mb-4">{plan.description}</p>
                        
                        <button
                          onClick={() => handlePurchase(plan)}
                          disabled={currentSubscription?.planType === 'session_pack'}
                          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {currentSubscription?.planType === 'session_pack' ? 'Already Active' : 'Purchase Plan'}
                        </button>
                      </motion.div>
                    );
                  })}
              </div>
            </div>

            {/* Annual Subscription */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Annual Subscription</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plans
                  .filter(plan => plan.type === 'annual')
                  .map((plan, index) => (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-gradient-to-r from-[#D91CD2]/20 to-purple-600/20 border border-[#D91CD2] rounded-lg p-6 relative"
                    >
                      <div className="absolute -top-2 -right-2 bg-gradient-to-r from-[#D91CD2] to-purple-600 text-white text-xs px-3 py-1 rounded-full">
                        UNLIMITED
                      </div>
                      
                      <div className="text-center mb-4">
                        <h4 className="text-lg font-semibold mb-2">{plan.name}</h4>
                        <p className="text-3xl font-bold text-[#D91CD2] mb-1">
                          {plan.price} {settings?.currency || 'USD'}
                        </p>
                        <p className="text-sm text-gray-400">per year</p>
                      </div>
                      
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center">
                          <FiCalendar className="mr-3 text-[#D91CD2]" size={16} />
                          <span className="text-sm">12 months access</span>
                        </div>
                        <div className="flex items-center">
                          <FiUsers className="mr-3 text-[#D91CD2]" size={16} />
                          <span className="text-sm">Unlimited sessions</span>
                        </div>
                        <div className="flex items-center">
                          <FiCheck className="mr-3 text-green-400" size={16} />
                          <span className="text-sm text-green-400">Best value for regular students</span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-400 mb-4">{plan.description}</p>
                      
                      <button
                        onClick={() => handlePurchase(plan)}
                        disabled={currentSubscription?.planType === 'annual'}
                        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {currentSubscription?.planType === 'annual' ? 'Already Active' : 'Purchase Annual'}
                      </button>
                    </motion.div>
                  ))}
              </div>
            </div>

            {/* Default Annual Option if no custom plans */}
            {plans.filter(plan => plan.type === 'annual').length === 0 && settings && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-[#D91CD2]/20 to-purple-600/20 border border-[#D91CD2] rounded-lg p-6 relative"
              >
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-[#D91CD2] to-purple-600 text-white text-xs px-3 py-1 rounded-full">
                  UNLIMITED
                </div>
                
                <div className="text-center mb-4">
                  <h4 className="text-lg font-semibold mb-2">Annual Subscription</h4>
                  <p className="text-3xl font-bold text-[#D91CD2] mb-1">
                    {settings.annualSubscriptionPrice} {settings.currency}
                  </p>
                  <p className="text-sm text-gray-400">per year</p>
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center">
                    <FiCalendar className="mr-3 text-[#D91CD2]" size={16} />
                    <span className="text-sm">12 months access</span>
                  </div>
                  <div className="flex items-center">
                    <FiUsers className="mr-3 text-[#D91CD2]" size={16} />
                    <span className="text-sm">Unlimited sessions</span>
                  </div>
                  <div className="flex items-center">
                    <FiCheck className="mr-3 text-green-400" size={16} />
                    <span className="text-sm text-green-400">Best value for regular students</span>
                  </div>
                </div>
                
                <p className="text-sm text-gray-400 mb-4">
                  Unlimited access to all dance classes for a full year. Perfect for dedicated dancers!
                </p>
                
                <button
                  onClick={() => handlePurchase({
                    id: 'annual-default',
                    name: 'Annual Subscription',
                    description: 'Unlimited access to all dance classes for a full year',
                    type: 'annual',
                    price: settings.annualSubscriptionPrice,
                    isActive: true,
                    createdBy: 'system',
                    createdAt: new Date(),
                    updatedAt: new Date()
                  })}
                  disabled={currentSubscription?.planType === 'annual'}
                  className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {currentSubscription?.planType === 'annual' ? 'Already Active' : 'Purchase Annual'}
                </button>
              </motion.div>
            )}
          </div>
        )}
      </Card>

      {/* Payment Modal */}
      {showPayment && selectedPlan && (
        <PaymentHandler
          isOpen={showPayment}
          onClose={() => {
            setShowPayment(false);
            setSelectedPlan(null);
          }}
          onSuccess={handlePaymentSuccess}
          amount={selectedPlan.price}
          title={`Purchase ${selectedPlan.name}`}
          description={selectedPlan.description}
          userId={user?.id || ''}
        />
      )}
    </div>
  );
}
