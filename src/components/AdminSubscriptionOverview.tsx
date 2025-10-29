'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiPackage, FiUsers, FiTrendingUp, FiCalendar, FiDollarSign, FiEye, FiEdit2 } from 'react-icons/fi';
import { useAuth } from '@/lib/auth';
import { UserSubscription, SessionUsage, SubscriptionPlan } from '@/types';
import { userSubscriptionService, sessionUsageService, subscriptionPlanService } from '@/lib/database';
import Card from '@/components/Card';
import { formatDate } from '@/lib/dateUtils';

export default function AdminSubscriptionOverview() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [sessions, setSessions] = useState<SessionUsage[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (user?.role === 'admin') {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [subscriptionsData, sessionsData, plansData] = await Promise.all([
        userSubscriptionService.getAll(),
        sessionUsageService.getAll(),
        subscriptionPlanService.getAll()
      ]);
      
      setSubscriptions(subscriptionsData);
      setSessions(sessionsData);
      setPlans(plansData);
    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStats = () => {
    const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
    const totalRevenue = subscriptions.reduce((sum, s) => sum + s.amount, 0);
    const sessionPackSubscriptions = activeSubscriptions.filter(s => s.planType === 'session_pack');
    const annualSubscriptions = activeSubscriptions.filter(s => s.planType === 'annual');
    const totalSessionsUsed = sessions.length;
    
    return {
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: activeSubscriptions.length,
      totalRevenue,
      sessionPackCount: sessionPackSubscriptions.length,
      annualCount: annualSubscriptions.length,
      totalSessionsUsed,
      avgRevenuePerSub: subscriptions.length > 0 ? totalRevenue / subscriptions.length : 0
    };
  };

  const stats = getStats();

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="space-y-6 px-4 md:px-6 lg:px-8">
      {/* Header */}
      <Card>
        <div className="flex flex-wrap items-center space-x-3 mb-6">
          <FiPackage className="text-[#D91CD2]" size={24} />
          <h2 className="text-2xl font-bold">Subscription Analytics</h2>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'overview' ? 'bg-[#D91CD2] text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'subscriptions' ? 'bg-[#D91CD2] text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            Active Subscriptions
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'usage' ? 'bg-[#D91CD2] text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            Session Usage
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-[#D91CD2] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-400">Loading subscription data...</p>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div className="bg-gray-800 rounded-lg p-4 text-center">
                    <FiUsers className="mx-auto text-[#D91CD2] mb-2" size={24} />
                    <p className="text-2xl font-bold text-[#D91CD2]">{stats.activeSubscriptions}</p>
                    <p className="text-sm text-gray-400">Active Subscriptions</p>
                  </div>
                  
                  <div className="bg-gray-800 rounded-lg p-4 text-center">
                    <FiDollarSign className="mx-auto text-green-400 mb-2" size={24} />
                    <p className="text-2xl font-bold text-green-400">{stats.totalRevenue.toFixed(0)} USD</p>
                    <p className="text-sm text-gray-400">Total Revenue</p>
                  </div>
                  
                  <div className="bg-gray-800 rounded-lg p-4 text-center">
                    <FiPackage className="mx-auto text-blue-400 mb-2" size={24} />
                    <p className="text-2xl font-bold text-blue-400">{stats.sessionPackCount}</p>
                    <p className="text-sm text-gray-400">Session Packages</p>
                  </div>
                  
                  <div className="bg-gray-800 rounded-lg p-4 text-center">
                    <FiCalendar className="mx-auto text-purple-400 mb-2" size={24} />
                    <p className="text-2xl font-bold text-purple-400">{stats.annualCount}</p>
                    <p className="text-sm text-gray-400">Annual Subscriptions</p>
                  </div>
                </div>

                {/* Revenue Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="font-medium mb-3">Subscription Type Breakdown</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Session Packages:</span>
                        <span>{stats.sessionPackCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Annual Subscriptions:</span>
                        <span>{stats.annualCount}</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Total Active:</span>
                        <span className="text-[#D91CD2]">{stats.activeSubscriptions}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h3 className="font-medium mb-3">Usage Statistics</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Sessions Used:</span>
                        <span>{stats.totalSessionsUsed}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Avg Revenue per Sub:</span>
                        <span>{stats.avgRevenuePerSub.toFixed(0)} USD</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Plans Available:</span>
                        <span>{plans.filter(p => p.isActive).length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Active Subscriptions Tab */}
            {activeTab === 'subscriptions' && (
              <div className="space-y-4">
                {subscriptions.filter(s => s.status === 'active').length === 0 ? (
                  <div className="text-center py-8 bg-gray-800 rounded-lg">
                    <FiPackage className="mx-auto text-4xl text-gray-500 mb-4" />
                    <p className="text-gray-400">No active subscriptions found</p>
                  </div>
                ) : (
                  subscriptions
                    .filter(s => s.status === 'active')
                    .map((subscription) => (
                      <motion.div
                        key={subscription.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gray-800 rounded-lg p-4 border border-gray-700"
                      >
                        <div className="flex flex-wrap items-center justify-between">
                          <div>
                            <h4 className="font-medium">{subscription.planName}</h4>
                            <p className="text-sm text-gray-400">User ID: {subscription.userId}</p>
                            <p className="text-xs text-gray-500">
                              Started: {formatDate(subscription.startDate)}
                            </p>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-lg font-semibold text-[#D91CD2]">
                              {subscription.amount} USD
                            </p>
                            {subscription.planType === 'session_pack' && (
                              <p className="text-sm text-gray-400">
                                {subscription.remainingSessions}/{subscription.totalSessions} sessions left
                              </p>
                            )}
                            {subscription.planType === 'annual' && subscription.endDate && (
                              <p className="text-sm text-gray-400">
                                Until: {formatDate(subscription.endDate)}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-gray-700 flex flex-wrap items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              subscription.planType === 'session_pack' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                            }`}>
                              {subscription.planType === 'session_pack' ? 'Session Pack' : 'Annual'}
                            </span>
                            <span className="text-xs text-gray-500">
                              via {subscription.paymentMethod}
                            </span>
                          </div>
                          
                          <button className="text-[#D91CD2] hover:text-[#D91CD2]/80 text-sm flex items-center">
                            <FiEye className="mr-1" size={14} />
                            View Details
                          </button>
                        </div>
                      </motion.div>
                    ))
                )}
              </div>
            )}

            {/* Session Usage Tab */}
            {activeTab === 'usage' && (
              <div className="space-y-4">
                {sessions.length === 0 ? (
                  <div className="text-center py-8 bg-gray-800 rounded-lg">
                    <FiTrendingUp className="mx-auto text-4xl text-gray-500 mb-4" />
                    <p className="text-gray-400">No session usage data found</p>
                  </div>
                ) : (
                  sessions
                    .slice(0, 20) // Show latest 20 sessions
                    .map((session) => (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gray-800 rounded-lg p-4 border border-gray-700"
                      >
                        <div className="flex flex-wrap items-center justify-between">
                          <div>
                            <h4 className="font-medium">{session.courseName}</h4>
                            <p className="text-sm text-gray-400">Coach: {session.coachName}</p>
                            <p className="text-xs text-gray-500">
                              User ID: {session.userId}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-400">
                              {formatDate(session.sessionDate)}
                            </p>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              session.status === 'attended' ? 'bg-green-500/20 text-green-400' :
                              session.status === 'missed' ? 'bg-red-500/20 text-red-400' :
                              'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))
                )}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

