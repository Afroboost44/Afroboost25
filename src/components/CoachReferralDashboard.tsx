'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiUsers, 
  FiGift, 
  FiDollarSign, 
  FiBook,
  FiTrendingUp,
  FiClock,
  FiCheck,
  FiX,
  FiStar,
  FiCalendar,
  FiSearch,
  FiFilter,
  FiRefreshCw,
  FiEye,
  FiAward
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { 
  coachReferralActivityService, 
  coachReferralLicenseService,
  coachReferralStatsService,
  userService,
  courseService,
  bookingService,
  creditTransactionService,
  studentCourseSessionService
} from '@/lib/database';
import { CoachReferralActivity, CoachReferralStats, Course } from '@/types';
import Card from '@/components/Card';

interface CoachReferralDashboardProps {
  className?: string;
}

export default function CoachReferralDashboard({ className = '' }: CoachReferralDashboardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [activities, setActivities] = useState<CoachReferralActivity[]>([]);
  const [stats, setStats] = useState<CoachReferralStats | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLicenseEnabled, setIsLicenseEnabled] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<CoachReferralActivity | null>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [rewardType, setRewardType] = useState<'credits' | 'course'>('credits');
  const [rewardAmount, setRewardAmount] = useState<number>(0);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [courseSessions, setCourseSessions] = useState<number>(1);
  const [targetUser, setTargetUser] = useState<'purchaser' | 'referrer'>('purchaser');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (user?.role === 'coach') {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Check if coach has referral license
      const licenseEnabled = await coachReferralLicenseService.isCoachEnabled(user.id);
      setIsLicenseEnabled(licenseEnabled);

      if (licenseEnabled) {
        // Load referral activities, stats, and courses
        const [activitiesData, statsData, coursesData] = await Promise.all([
          coachReferralActivityService.getByCoach(user.id),
          coachReferralStatsService.getByCoach(user.id),
          courseService.getByCoach(user.id)
        ]);

        setActivities(activitiesData);
        setStats(statsData);
        setCourses(coursesData);
      }
    } catch (error) {
      console.error('Error loading coach referral dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGiveReward = async () => {
    if (!selectedActivity || !user || isProcessing) return;

    try {
      setIsProcessing(true);

      // Validate reward inputs
      if (rewardType === 'credits' && rewardAmount <= 0) {
        alert(t('Please enter a valid credit amount'));
        return;
      }

      if (rewardType === 'course' && (!selectedCourse || courseSessions <= 0)) {
        alert(t('Please select a course and valid number of sessions'));
        return;
      }

      // Get target user info
      const userId = targetUser === 'purchaser' ? selectedActivity.purchaserUserId : selectedActivity.referrerUserId;
      const targetUserData = await userService.getById(userId);
      
      if (!targetUserData) {
        alert(t('User not found'));
        return;
      }

      if (rewardType === 'credits') {
        // Give credits to user
        await creditTransactionService.creditUser(
          userId,
          rewardAmount,
          `Referral reward from coach ${user.firstName} ${user.lastName}`,
          user.id,
          `${user.firstName} ${user.lastName}`
        );

        // Update user's credit balance
        await userService.update(userId, {
          credits: targetUserData.credits + rewardAmount
        });

        // Mark reward as given in activity
        await coachReferralActivityService.markRewardGiven(selectedActivity.id, targetUser, {
          type: 'credits',
          amount: rewardAmount,
          rewardedBy: user.id
        });

        // Update coach stats
        const month = new Date().toISOString().substring(0, 7);
        await coachReferralStatsService.updateRewardStats(user.id, 'credits', rewardAmount, month);

      } else {
        // Give course sessions
        const course = courses.find(c => c.id === selectedCourse);
        if (!course) {
          alert(t('Course not found'));
          return;
        }

        // Create student course session record
        await studentCourseSessionService.create({
          studentId: userId,
          courseId: selectedCourse,
          courseName: course.title,
          coachId: user.id,
          coachName: `${user.firstName} ${user.lastName}`,
          totalSessions: courseSessions,
          remainingSessions: courseSessions,
          isComplete: false,
          purchaseDate: new Date()
        });

        // Mark reward as given in activity
        await coachReferralActivityService.markRewardGiven(selectedActivity.id, targetUser, {
          type: 'course',
          courseId: selectedCourse,
          courseName: course.title,
          sessions: courseSessions,
          rewardedBy: user.id
        });

        // Update coach stats
        const month = new Date().toISOString().substring(0, 7);
        await coachReferralStatsService.updateRewardStats(user.id, 'course', courseSessions, month);
      }

      // Reload data and close modal
      await loadDashboardData();
      setShowRewardModal(false);
      setSelectedActivity(null);
      
      alert(t('Reward given successfully!'));

    } catch (error) {
      console.error('Error giving reward:', error);
      alert(t('Failed to give reward. Please try again.'));
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

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = searchTerm === '' || 
      activity.purchaserName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.referrerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.referralCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || activity.rewardStatus === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isLicenseEnabled) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card className="p-8 text-center">
          <FiX className="text-red-500 text-6xl mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            {t('Referral System Not Available')}
          </h3>
          <p className="text-gray-400 mb-4">
            {t('Your referral license has been disabled or not yet enabled by admin.')}
          </p>
          <p className="text-gray-500 text-sm">
            {t('Please contact admin to enable your referral system access.')}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">{t('Referral Management')}</h2>
          <p className="text-gray-400">{t('Manage rewards for users who used referral codes to purchase your courses')}</p>
        </div>
        <button
          onClick={loadDashboardData}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          <FiRefreshCw size={16} />
          {t('Refresh')}
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
          <Card className="p-4 lg:p-6">
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <div className="p-2 lg:p-3 bg-purple-600 rounded-lg">
                <FiUsers className="text-white" size={20} />
              </div>
            </div>
            <h3 className="text-lg lg:text-2xl font-bold text-white mb-1">{stats.totalReferralPurchases}</h3>
            <p className="text-gray-400 text-xs lg:text-sm">{t('Total Referral Purchases')}</p>
          </Card>

          <Card className="p-4 lg:p-6">
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <div className="p-2 lg:p-3 bg-green-600 rounded-lg">
                <FiGift className="text-white" size={20} />
              </div>
            </div>
            <h3 className="text-lg lg:text-2xl font-bold text-white mb-1">{stats.totalRewardsGiven}</h3>
            <p className="text-gray-400 text-xs lg:text-sm">{t('Rewards Given')}</p>
          </Card>

          <Card className="p-4 lg:p-6">
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <div className="p-2 lg:p-3 bg-yellow-600 rounded-lg">
                <FiDollarSign className="text-white" size={20} />
              </div>
            </div>
            <h3 className="text-lg lg:text-2xl font-bold text-white mb-1">{stats.totalCreditsRewarded}</h3>
            <p className="text-gray-400 text-xs lg:text-sm">{t('Credits Rewarded')}</p>
          </Card>

          <Card className="p-4 lg:p-6">
            <div className="flex items-center justify-between mb-3 lg:mb-4">
              <div className="p-2 lg:p-3 bg-blue-600 rounded-lg">
                <FiBook className="text-white" size={20} />
              </div>
            </div>
            <h3 className="text-lg lg:text-2xl font-bold text-white mb-1">{stats.totalCourseSessionsRewarded}</h3>
            <p className="text-gray-400 text-xs lg:text-sm">{t('Course Sessions Rewarded')}</p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4 lg:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder={t('Search by name, course, or referral code...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <FiFilter className="text-gray-400" size={20} />
              <span className="text-sm text-gray-400 whitespace-nowrap">{t('Filter by')}</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
            >
              <option value="all">{t('All Status')}</option>
              <option value="pending">{t('Pending Rewards')}</option>
              <option value="rewarded_both">{t('Both Rewarded')}</option>
              <option value="rewarded_purchaser">{t('Purchaser Rewarded')}</option>
              <option value="rewarded_referrer">{t('Referrer Rewarded')}</option>
              <option value="no_reward">{t('No Reward')}</option>
            </select>
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
              {t('No referral activities found')}
            </h4>
            <p className="text-sm lg:text-base text-gray-500 max-w-md mx-auto">
              {t('Referral activities will appear here when users purchase your courses using referral codes.')}
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
                      <h4 className="text-white font-medium text-sm lg:text-base">{activity.courseName}</h4>
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
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 lg:gap-3 text-xs lg:text-sm">
                      <div className="break-words">
                        <span className="text-gray-400">{t('Purchaser')}: </span>
                        <span className="text-white">{activity.purchaserName}</span>
                      </div>
                      <div className="break-words">
                        <span className="text-gray-400">{t('Referrer')}: </span>
                        <span className="text-white">{activity.referrerName}</span>
                      </div>
                      <div className="break-all">
                        <span className="text-gray-400">{t('Referral Code')}: </span>
                        <span className="text-purple-400 font-mono">{activity.referralCode}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">{t('Purchase Amount')}: </span>
                        <span className="text-green-400">${activity.purchaseAmount}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-gray-400">{t('Purchase Date')}: </span>
                        <span className="text-gray-300">{formatDate(activity.purchaseDate)}</span>
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
                            </div>
                          )}
                          {activity.referrerReward && (
                            <div className="text-gray-400 break-words">
                              <span className="text-purple-400">{t('Referrer')}: </span>
                              {activity.referrerReward.type === 'credits' ? 
                                `${activity.referrerReward.amount} ${t('credits')}` :
                                `${activity.referrerReward.sessions} ${t('sessions')} of ${activity.referrerReward.courseName}`
                              }
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-700">
                    {activity.rewardStatus === 'pending' && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedActivity(activity);
                            setTargetUser('purchaser');
                            setShowRewardModal(true);
                          }}
                          className="flex-1 sm:flex-none px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-xs lg:text-sm"
                        >
                          {t('Reward Purchaser')}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedActivity(activity);
                            setTargetUser('referrer');
                            setShowRewardModal(true);
                          }}
                          className="flex-1 sm:flex-none px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-xs lg:text-sm"
                        >
                          {t('Reward Referrer')}
                        </button>
                      </>
                    )}
                    
                    {activity.rewardStatus === 'rewarded_purchaser' && (
                      <button
                        onClick={() => {
                          setSelectedActivity(activity);
                          setTargetUser('referrer');
                          setShowRewardModal(true);
                        }}
                        className="flex-1 sm:flex-none px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-xs lg:text-sm"
                      >
                        {t('Reward Referrer')}
                      </button>
                    )}
                    
                    {activity.rewardStatus === 'rewarded_referrer' && (
                      <button
                        onClick={() => {
                          setSelectedActivity(activity);
                          setTargetUser('purchaser');
                          setShowRewardModal(true);
                        }}
                        className="flex-1 sm:flex-none px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-xs lg:text-sm"
                      >
                        {t('Reward Purchaser')}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      {/* Reward Modal */}
      {showRewardModal && selectedActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-4 lg:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 lg:mb-6">
              <h3 className="text-lg lg:text-xl font-semibold text-white">
                {t('Give Reward to')} {targetUser === 'purchaser' ? 
                  selectedActivity.purchaserName : selectedActivity.referrerName}
              </h3>
              <button
                onClick={() => setShowRewardModal(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <FiX className="text-gray-400" size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Reward Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('Reward Type')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setRewardType('credits')}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      rewardType === 'credits' 
                        ? 'border-purple-500 bg-purple-500/20 text-white' 
                        : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <FiDollarSign className="mx-auto mb-1" size={20} />
                    <span className="text-xs lg:text-sm">{t('Credits')}</span>
                  </button>
                  <button
                    onClick={() => setRewardType('course')}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      rewardType === 'course' 
                        ? 'border-purple-500 bg-purple-500/20 text-white' 
                        : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                    }`}
                  >
                    <FiBook className="mx-auto mb-1" size={20} />
                    <span className="text-xs lg:text-sm">{t('Course')}</span>
                  </button>
                </div>
              </div>

              {/* Credit Amount Input */}
              {rewardType === 'credits' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('Credit Amount')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={rewardAmount}
                    onChange={(e) => setRewardAmount(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    placeholder={t('Enter credit amount')}
                  />
                </div>
              )}

              {/* Course Selection */}
              {rewardType === 'course' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t('Select Course')}
                    </label>
                    <select
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="">{t('Choose a course')}</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t('Number of Sessions')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={courseSessions}
                      onChange={(e) => setCourseSessions(parseInt(e.target.value) || 1)}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                      placeholder={t('Enter number of sessions')}
                    />
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  onClick={() => setShowRewardModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm lg:text-base"
                >
                  {t('Cancel')}
                </button>
                <button
                  onClick={handleGiveReward}
                  disabled={isProcessing || (rewardType === 'credits' && rewardAmount <= 0) || 
                           (rewardType === 'course' && (!selectedCourse || courseSessions <= 0))}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm lg:text-base"
                >
                  {isProcessing ? t('Processing...') : t('Give Reward')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}