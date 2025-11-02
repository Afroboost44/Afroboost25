'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiUsers, 
  FiClock, 
  FiCheckCircle, 
  FiXCircle, 
  FiMinus,
  FiCalendar,
  FiPackage,
  FiUser
} from 'react-icons/fi';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/lib/auth';
import Card from './Card';
import { 
  sessionUsageService, 
  userSubscriptionService, 
  userService,
  notificationService 
} from '@/lib/database';
import { SessionUsage, UserSubscription, User } from '@/types';
import { formatDate, toDate } from '@/lib/dateUtils';
import { useTranslation } from 'react-i18next'; // Import useTranslation

interface CoachSubscriptionBookingsProps {
  className?: string;
}

const CoachSubscriptionBookings: React.FC<CoachSubscriptionBookingsProps> = ({ className = '' }) => {
  const { t } = useTranslation(); // Initialize useTranslation
  const { user } = useAuth();
  const [sessionUsages, setSessionUsages] = useState<SessionUsage[]>([]);
  const [subscribers, setSubscribers] = useState<Array<{
    subscription: UserSubscription;
    user: User;
    sessionCount: number;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingSessionId, setProcessingSessionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'sessions' | 'subscribers'>('sessions');

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      
      // Load session usages for this coach
      const usages = await sessionUsageService.getByCoach(user.id);
      setSessionUsages(usages);
      
      // Load subscribers
      await loadSubscribers();
      
    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSubscribers = async () => {
    if (!user?.id) return;
    
    try {
      // Get all active subscriptions
      const allSubscriptions = await userSubscriptionService.getAll();
      const activeSubscriptions = allSubscriptions.filter(sub => sub.status === 'active');
      
      // Get detailed info for each subscriber
      const subscriberDetails = await Promise.all(
        activeSubscriptions.map(async (subscription) => {
          const userData = await userService.getById(subscription.userId);
          const sessionUsages = await sessionUsageService.getByUserAndCoach(subscription.userId, user.id);
          
          if (userData) {
            return {
              subscription,
              user: userData,
              sessionCount: sessionUsages.length
            };
          }
          return null;
        })
      );
      
      setSubscribers(subscriberDetails.filter(Boolean) as Array<{
        subscription: UserSubscription;
        user: User;
        sessionCount: number;
      }>);
      
    } catch (error) {
      console.error('Error loading subscribers:', error);
    }
  };

  const handleMarkAttended = async (sessionUsage: SessionUsage) => {
    if (!user?.id || sessionUsage.status === 'attended') return;
    
    try {
      setProcessingSessionId(sessionUsage.id);
      
      // Update session status to attended
      await sessionUsageService.update(sessionUsage.id, {
        status: 'attended'
      });
      
      // Send notification to student
      await notificationService.create({
        userId: sessionUsage.userId,
        title: 'Session Completed!',
        message: `Your session for "${sessionUsage.courseName}" has been marked as attended. Great job!`,
        type: 'session',
        read: false
      });
      
      // Reload data
      await loadData();
      
    } catch (error) {
      console.error('Error marking session as attended:', error);
      alert('Failed to mark session as attended');
    } finally {
      setProcessingSessionId(null);
    }
  };

  const handleMarkMissed = async (sessionUsage: SessionUsage) => {
    if (!user?.id || sessionUsage.status === 'missed') return;
    
    try {
      setProcessingSessionId(sessionUsage.id);
      
      // Update session status to missed
      await sessionUsageService.update(sessionUsage.id, {
        status: 'missed'
      });
      
      // For missed sessions, we might want to refund the session back to the user
      if (sessionUsage.status === 'scheduled') {
        const subscription = await userSubscriptionService.getById(sessionUsage.subscriptionId);
        if (subscription && subscription.planType === 'session_pack') {
          await userSubscriptionService.addSession(subscription.id);
        }
      }
      
      // Send notification to student
      await notificationService.create({
        userId: sessionUsage.userId,
        title: 'Session Missed',
        message: `Your session for "${sessionUsage.courseName}" was marked as missed. The session has been refunded to your account.`,
        type: 'session',
        read: false
      });
      
      // Reload data
      await loadData();
      
    } catch (error) {
      console.error('Error marking session as missed:', error);
      alert('Failed to mark session as missed');
    } finally {
      setProcessingSessionId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'attended':
        return <FiCheckCircle className="text-green-400" />;
      case 'missed':
        return <FiXCircle className="text-red-400" />;
      case 'cancelled':
        return <FiMinus className="text-gray-400" />;
      default:
        return <FiClock className="text-yellow-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'attended':
        return 'bg-green-500/20 text-green-400';
      case 'missed':
        return 'bg-red-500/20 text-red-400';
      case 'cancelled':
        return 'bg-gray-500/20 text-gray-400';
      default:
        return 'bg-yellow-500/20 text-yellow-400';
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-[#D91CD2] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-xl sm:text-2xl font-semibold">{t('subscriptionManagement')}</h2>
          
          {/* Tab Navigation */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('sessions')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'sessions'
                  ? 'bg-[#D91CD2] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t('sessionManagement')}
            </button>
            <button
              onClick={() => setActiveTab('subscribers')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'subscribers'
                  ? 'bg-[#D91CD2] text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t('subscribers')} ({subscribers.length})
            </button>
          </div>
        </div>

        {/* Session Management Tab */}
        {activeTab === 'sessions' && (
          <div className="space-y-4">
            <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4">
              <h3 className="font-medium text-blue-400 mb-2">{t('sessionManagement')}</h3>
              <p className="text-sm text-gray-300">
                {t('sessionManagementDescription')}
              </p>
            </div>

            {sessionUsages.length > 0 ? (
              <div className="space-y-3">
                {sessionUsages
                  .sort((a, b) => {
                    const dateA = toDate(a.sessionDate);
                    const dateB = toDate(b.sessionDate);
                    return dateB.getTime() - dateA.getTime();
                  })
                  .map((usage) => (
                    <motion.div
                      key={usage.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex-1 space-y-3 xl:space-y-0 xl:flex xl:items-center xl:space-x-6">
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(usage.status)}
                            <div>
                              <h4 className="font-medium text-sm sm:text-base">{usage.courseName}</h4>
                              <p className="text-xs sm:text-sm text-gray-400">
                                {t('student')}: {usage.userId.slice(0, 8)}...
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-400">
                            <div className="flex items-center space-x-1">
                              <FiCalendar size={14} />
                              <span className="hidden sm:inline">{formatDate(usage.sessionDate)}</span>
                              <span className="sm:hidden">
                                {toDate(usage.sessionDate).toLocaleDateString()}
                              </span>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(usage.status)}`}>
                              {t(usage.status)}
                            </span>
                          </div>
                        </div>

                        {usage.status === 'scheduled' && (
                          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <button
                              onClick={() => handleMarkAttended(usage)}
                              disabled={processingSessionId === usage.id}
                              className="px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                            >
                              <FiCheckCircle size={14} />
                              <span className="hidden sm:inline">{t('markAttended')}</span>
                              <span className="sm:hidden">{t('attended')}</span>
                            </button>
                            <button
                              onClick={() => handleMarkMissed(usage)}
                              disabled={processingSessionId === usage.id}
                              className="px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs sm:text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                            >
                              <FiXCircle size={14} />
                              <span className="hidden sm:inline">{t('markMissed')}</span>
                              <span className="sm:hidden">{t('missed')}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
              </div>
            ) : (
              <div className="bg-gray-800/50 p-8 rounded-lg text-center">
                <FiClock className="mx-auto text-4xl text-gray-500 mb-3" />
                <p className="text-gray-400">{t('noSubscriptionSessions')}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {t('sessionsWillAppearHere')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Subscribers Tab */}
        {activeTab === 'subscribers' && (
          <div className="space-y-4">
            <div className="bg-green-500/20 border border-green-500 rounded-lg p-4">
              <h3 className="font-medium text-green-400 mb-2">{t('yourSubscribers')}</h3>
              <p className="text-sm text-gray-300">
                {t('viewSubscribersDescription')}
              </p>
            </div>

            {subscribers.length > 0 ? (
              <div className="grid gap-4">
                {subscribers.map((subscriber) => (
                  <motion.div
                    key={subscriber.subscription.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-[#D91CD2] to-[#7B1FA2] rounded-full flex items-center justify-center">
                          <FiUser className="text-white" size={20} />
                        </div>
                        <div>
                          <h4 className="font-medium">
                            {subscriber.user.firstName} {subscriber.user.lastName}
                          </h4>
                          <p className="text-sm text-gray-400">{subscriber.user.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="text-sm">
                          <div className="flex items-center space-x-2 mb-1">
                            <FiPackage size={14} className="text-[#D91CD2]" />
                            <span className="font-medium">{subscriber.subscription.planName}</span>
                          </div>
                          {subscriber.subscription.planType === 'session_pack' && (
                            <p className="text-gray-400">
                              {subscriber.subscription.remainingSessions || 0} {t('sessionsRemaining')}
                            </p>
                          )}
                        </div>
                        
                        <div className="text-sm text-right">
                          <p className="text-gray-400">{t('sessionsWithYou')}</p>
                          <p className="font-medium text-[#D91CD2]">{subscriber.sessionCount}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-800/50 p-8 rounded-lg text-center">
                <FiUsers className="mx-auto text-4xl text-gray-500 mb-3" />
                <p className="text-gray-400">{t('noSubscribersFound')}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {t('studentsWillAppearHere')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default CoachSubscriptionBookings;
