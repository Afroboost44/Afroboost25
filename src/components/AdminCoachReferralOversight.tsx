'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiUsers, 
  FiShield,
  FiDollarSign, 
  FiBook,
  FiTrendingUp,
  FiClock,
  FiCheck,
  FiX,
  FiEye,
  FiSearch,
  FiFilter,
  FiRefreshCw,
  FiAlertTriangle,
  FiUserCheck,
  FiUserX
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { 
  coachReferralActivityService, 
  coachReferralLicenseService,
  coachReferralStatsService,
  userService
} from '@/lib/database';
import { CoachReferralActivity, CoachReferralLicense, CoachReferralStats, User } from '@/types';
import Card from '@/components/Card';

interface AdminCoachReferralOversightProps {
  adminId: string;
  className?: string;
}

export default function AdminCoachReferralOversight({ adminId, className = '' }: AdminCoachReferralOversightProps) {
  const { t } = useTranslation();
  
  const [isLoading, setIsLoading] = useState(true);
  const [activities, setActivities] = useState<CoachReferralActivity[]>([]);
  const [licenses, setLicenses] = useState<CoachReferralLicense[]>([]);
  const [stats, setStats] = useState<CoachReferralStats[]>([]);
  const [coaches, setCoaches] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCoach, setSelectedCoach] = useState<string>('all');
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<CoachReferralLicense | null>(null);
  const [disableReason, setDisableReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load all data in parallel
      const [activitiesData, licensesData, statsData, usersData] = await Promise.all([
        coachReferralActivityService.getAll(),
        coachReferralLicenseService.getAll(),
        coachReferralStatsService.getAll(),
        userService.getAll()
      ]);

      setActivities(activitiesData);
      setLicenses(licensesData);
      setStats(statsData);
      
      // Filter for coaches only
      const coachUsers = usersData.filter(user => user.role === 'coach');
      setCoaches(coachUsers);
      
    } catch (error) {
      console.error('Error loading admin coach referral data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleLicense = async (coachId: string, isEnabled: boolean, reason?: string) => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);
      
      const coach = coaches.find(c => c.id === coachId);
      if (!coach) return;

      const adminUser = await userService.getById(adminId);
      if (!adminUser) return;

      const adminName = `${adminUser.firstName} ${adminUser.lastName}`;

      if (isEnabled) {
        await coachReferralLicenseService.enableLicense(coachId, adminId, adminName);
      } else {
        await coachReferralLicenseService.disableLicense(coachId, adminId, adminName, reason || 'Admin action');
      }

      // Reload data
      await loadData();
      
      setShowLicenseModal(false);
      setSelectedLicense(null);
      setDisableReason('');
      
    } catch (error) {
      console.error('Error toggling license:', error);
      alert(t('Failed to update license. Please try again.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (date: any) => {
    try {
      if (!date) return 'N/A';
      if (date && typeof date === 'object' && date.seconds) {
        return new Date(date.seconds * 1000).toLocaleDateString();
      }
      const dateObj = new Date(date);
      return isNaN(dateObj.getTime()) ? 'N/A' : dateObj.toLocaleDateString();
    } catch (error) {
      return 'N/A';
    }
  };

  const getCoachLicense = (coachId: string) => {
    return licenses.find(license => license.coachId === coachId);
  };

  const getCoachStats = (coachId: string) => {
    return stats.find(stat => stat.coachId === coachId);
  };

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = searchTerm === '' || 
      activity.coachName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.purchaserName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.referrerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.courseName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || activity.rewardStatus === statusFilter;
    const matchesCoach = selectedCoach === 'all' || activity.coachId === selectedCoach;
    
    return matchesSearch && matchesStatus && matchesCoach;
  });

  // Calculate summary statistics
  const summaryStats = {
    totalActivities: activities.length,
    totalRewardsGiven: activities.filter(a => a.rewardStatus !== 'pending' && a.rewardStatus !== 'no_reward').length,
    totalLicensedCoaches: licenses.filter(l => l.isEnabled).length,
    totalDisabledCoaches: licenses.filter(l => !l.isEnabled).length
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">{t('Coach Referral Oversight')}</h2>
          <p className="text-gray-400">{t('Monitor and manage coach referral system activities and permissions')}</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          <FiRefreshCw size={16} />
          {t('Refresh')}
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        <Card className="p-4 lg:p-6">
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <div className="p-2 lg:p-3 bg-blue-600 rounded-lg">
              <FiTrendingUp className="text-white" size={20} />
            </div>
          </div>
          <h3 className="text-lg lg:text-2xl font-bold text-white mb-1">{summaryStats.totalActivities}</h3>
          <p className="text-gray-400 text-xs lg:text-sm">{t('Total Referral Activities')}</p>
        </Card>

        <Card className="p-4 lg:p-6">
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <div className="p-2 lg:p-3 bg-green-600 rounded-lg">
              <FiCheck className="text-white" size={20} />
            </div>
          </div>
          <h3 className="text-lg lg:text-2xl font-bold text-white mb-1">{summaryStats.totalRewardsGiven}</h3>
          <p className="text-gray-400 text-xs lg:text-sm">{t('Rewards Distributed')}</p>
        </Card>

        <Card className="p-4 lg:p-6">
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <div className="p-2 lg:p-3 bg-purple-600 rounded-lg">
              <FiUserCheck className="text-white" size={20} />
            </div>
          </div>
          <h3 className="text-lg lg:text-2xl font-bold text-white mb-1">{summaryStats.totalLicensedCoaches}</h3>
          <p className="text-gray-400 text-xs lg:text-sm">{t('Licensed Coaches')}</p>
        </Card>

        <Card className="p-4 lg:p-6">
          <div className="flex items-center justify-between mb-3 lg:mb-4">
            <div className="p-2 lg:p-3 bg-red-600 rounded-lg">
              <FiUserX className="text-white" size={20} />
            </div>
          </div>
          <h3 className="text-lg lg:text-2xl font-bold text-white mb-1">{summaryStats.totalDisabledCoaches}</h3>
          <p className="text-gray-400 text-xs lg:text-sm">{t('Disabled Licenses')}</p>
        </Card>
      </div>

      {/* Coach License Management */}
      <Card className="p-4 lg:p-6">
        <h3 className="text-lg lg:text-xl font-semibold text-white mb-4">{t('Coach License Management')}</h3>
        
        <div className="space-y-4">
          {coaches.map((coach) => {
            const license = getCoachLicense(coach.id);
            const coachStats = getCoachStats(coach.id);
            
            return (
              <div
                key={coach.id}
                className="p-3 lg:p-4 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <h4 className="text-white font-medium text-sm lg:text-base">{coach.firstName} {coach.lastName}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          license?.isEnabled ? 'bg-green-600 text-green-100' : 'bg-red-600 text-red-100'
                        }`}>
                          {license?.isEnabled ? t('Licensed') : t('Disabled')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 text-xs lg:text-sm">
                      <div className="break-all">
                        <span className="text-gray-400">{t('Email')}: </span>
                        <span className="text-gray-300">{coach.email}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">{t('Referral Activities')}: </span>
                        <span className="text-white">{coachStats?.totalReferralPurchases || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">{t('Rewards Given')}: </span>
                        <span className="text-white">{coachStats?.totalRewardsGiven || 0}</span>
                      </div>
                    </div>

                    {license && !license.isEnabled && license.disabledReason && (
                      <div className="mt-2 p-2 bg-red-600/20 rounded text-xs lg:text-sm">
                        <span className="text-red-400">{t('Disabled Reason')}: </span>
                        <span className="text-red-300">{license.disabledReason}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2 border-t border-gray-700">
                    {license?.isEnabled ? (
                      <button
                        onClick={() => {
                          setSelectedLicense(license);
                          setShowLicenseModal(true);
                        }}
                        className="flex-1 sm:flex-none px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-xs lg:text-sm"
                      >
                        {t('Disable License')}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleToggleLicense(coach.id, true)}
                        disabled={isProcessing}
                        className="flex-1 sm:flex-none px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors text-xs lg:text-sm"
                      >
                        {t('Enable License')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Filters */}
      <Card className="p-4 lg:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder={t('Search activities...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <select
                value={selectedCoach}
                onChange={(e) => setSelectedCoach(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="all">{t('All Coaches')}</option>
                {coaches.map((coach) => (
                  <option key={coach.id} value={coach.id}>
                    {coach.firstName} {coach.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="all">{t('All Status')}</option>
                <option value="pending">{t('Pending')}</option>
                <option value="rewarded_both">{t('Both Rewarded')}</option>
                <option value="rewarded_purchaser">{t('Purchaser Rewarded')}</option>
                <option value="rewarded_referrer">{t('Referrer Rewarded')}</option>
                <option value="no_reward">{t('No Reward')}</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Activities List */}
      <Card className="p-4 lg:p-6">
        <h3 className="text-lg lg:text-xl font-semibold text-white mb-4">{t('Referral Activities')}</h3>
        
        {filteredActivities.length === 0 ? (
          <div className="text-center py-8 lg:py-12">
            <FiUsers className="text-gray-600 text-4xl lg:text-6xl mx-auto mb-4" />
            <h4 className="text-base lg:text-lg font-semibold text-gray-400 mb-2">
              {t('No activities found')}
            </h4>
            <p className="text-sm lg:text-base text-gray-500 max-w-md mx-auto">
              {t('Referral activities will appear here when coaches start using the referral system.')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredActivities.map((activity) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 lg:p-4 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-white font-medium text-sm lg:text-base">{activity.courseName}</h4>
                        <span className="text-gray-400 text-sm">by</span>
                        <span className="text-purple-400 text-sm">{activity.coachName}</span>
                      </div>
                      <span className={`self-start sm:self-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        activity.rewardStatus === 'pending' ? 'bg-yellow-600 text-yellow-100' :
                        activity.rewardStatus === 'rewarded_both' ? 'bg-green-600 text-green-100' :
                        activity.rewardStatus === 'rewarded_purchaser' ? 'bg-blue-600 text-blue-100' :
                        activity.rewardStatus === 'rewarded_referrer' ? 'bg-purple-600 text-purple-100' :
                        'bg-gray-600 text-gray-100'
                      }`}>
                        {activity.rewardStatus === 'pending' ? t('Pending') :
                         activity.rewardStatus === 'rewarded_both' ? t('Both Rewarded') :
                         activity.rewardStatus === 'rewarded_purchaser' ? t('Purchaser Rewarded') :
                         activity.rewardStatus === 'rewarded_referrer' ? t('Referrer Rewarded') :
                         t('No Reward')}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs lg:text-sm">
                      <div className="break-words">
                        <span className="text-gray-400">{t('Purchaser')}: </span>
                        <span className="text-white">{activity.purchaserName}</span>
                      </div>
                      <div className="break-words">
                        <span className="text-gray-400">{t('Referrer')}: </span>
                        <span className="text-white">{activity.referrerName}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">{t('Purchase Amount')}: </span>
                        <span className="text-green-400">${activity.purchaseAmount}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">{t('Purchase Date')}: </span>
                        <span className="text-gray-300">{formatDate(activity.purchaseDate)}</span>
                      </div>
                      <div className="break-all">
                        <span className="text-gray-400">{t('Referral Code')}: </span>
                        <span className="text-purple-400 font-mono">{activity.referralCode}</span>
                      </div>
                    </div>

                    {/* Reward Details */}
                    {(activity.purchaserReward || activity.referrerReward) && (
                      <div className="mt-3 p-3 bg-gray-800 rounded-lg">
                        <h5 className="text-xs lg:text-sm font-medium text-gray-300 mb-2">{t('Rewards Given')}:</h5>
                        <div className="space-y-1 text-xs">
                          {activity.purchaserReward && (
                            <div className="text-gray-400 break-words">
                              <span className="text-green-400">{t('Purchaser')}: </span>
                              {activity.purchaserReward.type === 'credits' ? 
                                `${activity.purchaserReward.amount} ${t('credits')}` :
                                `${activity.purchaserReward.sessions} ${t('sessions')} of ${activity.purchaserReward.courseName}`
                              }
                              <span className="text-gray-500 ml-2">({formatDate(activity.purchaserReward.rewardedAt)})</span>
                            </div>
                          )}
                          {activity.referrerReward && (
                            <div className="text-gray-400 break-words">
                              <span className="text-purple-400">{t('Referrer')}: </span>
                              {activity.referrerReward.type === 'credits' ? 
                                `${activity.referrerReward.amount} ${t('credits')}` :
                                `${activity.referrerReward.sessions} ${t('sessions')} of ${activity.referrerReward.courseName}`
                              }
                              <span className="text-gray-500 ml-2">({formatDate(activity.referrerReward.rewardedAt)})</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      {/* License Disable Modal */}
      {showLicenseModal && selectedLicense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-4 lg:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 lg:mb-6">
              <h3 className="text-lg lg:text-xl font-semibold text-white">
                {t('Disable Referral License')}
              </h3>
              <button
                onClick={() => setShowLicenseModal(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FiX className="text-gray-400" size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-300 text-sm lg:text-base">
                {t('Are you sure you want to disable the referral license for')} <strong>{selectedLicense.coachName}</strong>?
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('Reason for disabling')} *
                </label>
                <textarea
                  value={disableReason}
                  onChange={(e) => setDisableReason(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  placeholder={t('Enter reason for disabling the license...')}
                  rows={3}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  onClick={() => setShowLicenseModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm lg:text-base"
                >
                  {t('Cancel')}
                </button>
                <button
                  onClick={() => handleToggleLicense(selectedLicense.coachId, false, disableReason)}
                  disabled={isProcessing || !disableReason.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm lg:text-base"
                >
                  {isProcessing ? t('Processing...') : t('Disable License')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}