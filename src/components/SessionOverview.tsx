'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiClock, FiCheck, FiX, FiCalendar, FiUser, FiPackage, FiTrendingDown } from 'react-icons/fi';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/lib/auth';
import { SessionUsage, UserSubscription, DateOrTimestamp } from '@/types';
import { sessionUsageService, userSubscriptionService } from '@/lib/database';
import Card from '@/components/Card';
import { formatDate } from '@/lib/dateUtils';
import { useTranslation } from 'react-i18next'; // Import useTranslation

export default function SessionOverview() {
  const { t } = useTranslation(); // Initialize useTranslation
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionUsage[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'attended' | 'missed' | 'cancelled'>('all');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('month');

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [sessionsData, subscriptionData] = await Promise.all([
        sessionUsageService.getByUserId(user?.id || ''),
        userSubscriptionService.getActiveByUserId(user?.id || '')
      ]);
      
      setSessions(sessionsData);
      setSubscription(subscriptionData);
    } catch (error) {
      console.error('Error loading session data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (date: DateOrTimestamp) => {
    const dateObj = date instanceof Timestamp ? date.toDate() : new Date(date);
    return formatDate(dateObj);
  };

  const getFilteredSessions = () => {
    let filtered = sessions;
    
    // Filter by status
    if (filter !== 'all') {
      filtered = filtered.filter(session => session.status === filter);
    }
    
    // Filter by time range
    if (timeRange !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      
      if (timeRange === 'week') {
        cutoffDate.setDate(now.getDate() - 7);
      } else if (timeRange === 'month') {
        cutoffDate.setMonth(now.getMonth() - 1);
      }
      
      filtered = filtered.filter(session => {
        const sessionDate = session.sessionDate instanceof Timestamp 
          ? session.sessionDate.toDate() 
          : new Date(session.sessionDate);
        return sessionDate >= cutoffDate;
      });
    }
    
    return filtered;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'attended':
        return <FiCheck className="text-green-400" size={16} />;
      case 'missed':
        return <FiX className="text-red-400" size={16} />;
      case 'cancelled':
        return <FiClock className="text-yellow-400" size={16} />;
      default:
        return <FiClock className="text-gray-400" size={16} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'attended':
        return 'text-green-400 bg-green-400/20';
      case 'missed':
        return 'text-red-400 bg-red-400/20';
      case 'cancelled':
        return 'text-yellow-400 bg-yellow-400/20';
      default:
        return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getUsageStats = () => {
    const totalSessions = sessions.length;
    const attendedSessions = sessions.filter(s => s.status === 'attended').length;
    const missedSessions = sessions.filter(s => s.status === 'missed').length;
    const cancelledSessions = sessions.filter(s => s.status === 'cancelled').length;
    
    return {
      total: totalSessions,
      attended: attendedSessions,
      missed: missedSessions,
      cancelled: cancelledSessions,
      attendanceRate: totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 100) : 0
    };
  };

  const filteredSessions = getFilteredSessions();
  const stats = getUsageStats();

  if (!user || user.role !== 'student') {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Subscription Overview */}
      {subscription && (
        <Card>
          <div className="flex items-center space-x-3 mb-4">
            <FiPackage className="text-[#D91CD2]" size={24} />
            <h2 className="text-2xl font-bold">{t('yourSubscription')}</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">{t('planType')}</p>
              <p className="text-lg font-semibold capitalize">{subscription.planName}</p>
            </div>
            
            {subscription.planType === 'session_pack' && (
              <>
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">{t('sessionsRemaining')}</p>
                  <p className="text-lg font-semibold text-[#D91CD2]">
                    {subscription.remainingSessions || 0}
                  </p>
                </div>
                
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">{t('sessionsUsed')}</p>
                  <p className="text-lg font-semibold">
                    {(subscription.totalSessions || 0) - (subscription.remainingSessions || 0)}
                  </p>
                </div>
                
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">{t('totalSessions')}</p>
                  <p className="text-lg font-semibold">{subscription.totalSessions || 0}</p>
                </div>
              </>
            )}
            
            {subscription.planType === 'annual' && subscription.endDate && (
              <div className="bg-gray-800 rounded-lg p-4 md:col-span-3">
                <p className="text-sm text-gray-400 mb-1">{t('validUntil')}</p>
                <p className="text-lg font-semibold text-green-400">
                  {formatDateTime(subscription.endDate)}
                </p>
              </div>
            )}
          </div>
          
          {subscription.planType === 'session_pack' && subscription.totalSessions && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">{t('usageProgress')}</span>
                <span className="text-sm text-gray-400">
                  {((subscription.totalSessions - (subscription.remainingSessions || 0)) / subscription.totalSessions * 100).toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-[#D91CD2] h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${((subscription.totalSessions - (subscription.remainingSessions || 0)) / subscription.totalSessions * 100)}%` 
                  }}
                ></div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Session Statistics */}
      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <FiTrendingDown className="text-[#D91CD2]" size={24} />
          <h2 className="text-2xl font-bold">{t('sessionStatistics')}</h2>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-[#D91CD2]">{stats.total}</p>
            <p className="text-sm text-gray-400">{t('totalSessions')}</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{stats.attended}</p>
            <p className="text-sm text-gray-400">{t('attended')}</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{stats.missed}</p>
            <p className="text-sm text-gray-400">{t('missed')}</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">{stats.cancelled}</p>
            <p className="text-sm text-gray-400">{t('cancelled')}</p>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{stats.attendanceRate}%</p>
            <p className="text-sm text-gray-400">{t('attendanceRate')}</p>
          </div>
        </div>
      </Card>

      {/* Session History */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <FiClock className="text-[#D91CD2]" size={24} />
            <h2 className="text-2xl font-bold">{t('sessionHistory')}</h2>
          </div>
          
          <div className="flex space-x-2">
            {/* Time Range Filter */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as 'week' | 'month' | 'all')}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
            >
              <option value="week">{t('lastWeek')}</option>
              <option value="month">{t('lastMonth')}</option>
              <option value="all">{t('allTime')}</option>
            </select>
            
            {/* Status Filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'attended' | 'missed' | 'cancelled')}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
            >
              <option value="all">{t('allSessions')}</option>
              <option value="attended">{t('attended')}</option>
              <option value="missed">{t('missed')}</option>
              <option value="cancelled">{t('cancelled')}</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-[#D91CD2] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-400">{t('loadingSessionHistory')}</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-8 bg-gray-800 rounded-lg">
            <FiClock className="mx-auto text-4xl text-gray-500 mb-4" />
            <p className="text-gray-400">{t('noSessionsFoundForFilters')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((session) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(session.status)}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                        {t(session.status)}
                      </span>
                    </div>
                    
                    <div>
                      <h4 className="font-medium">{session.courseName}</h4>
                      <p className="text-sm text-gray-400">{t('withCoach', { coachName: session.coachName })}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <FiCalendar size={14} />
                      <span>{formatDateTime(session.sessionDate)}</span>
                    </div>
                    {session.deductedAt && (
                      <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                        <FiUser size={12} />
                        <span>{t('deducted')}: {formatDateTime(session.deductedAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
