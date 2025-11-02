'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiShare2, 
  FiUsers, 
  FiDollarSign, 
  FiCopy, 
  FiCheck, 
  FiExternalLink,
  FiUserPlus,
  FiGift
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';

interface ReferralApiResponse {
  success: boolean;
  userReferralData: {
    referralLink: string;
    referrals: {
      approved: any[];
      direct: any[];
      pending: any[];
      recent: any[];
    };
    statistics: {
      approvedReferrals: number;
      pendingEarnings: number;
      pendingReferrals: number;
      recentReferrals: number;
      rewardPerReferral: number;
      totalEarnings: number;
      totalReferrals: number;
    };
    user: {
      firstName: string;
      id: string;
      lastName: string;
      referralCode: string;
    };
  };
}

interface ReferralApiResponse {
  success: boolean;
  userReferralData: {
    referralLink: string;
    referrals: {
      approved: any[];
      direct: any[];
      pending: any[];
      recent: any[];
    };
    statistics: {
      approvedReferrals: number;
      pendingEarnings: number;
      pendingReferrals: number;
      recentReferrals: number;
      rewardPerReferral: number;
      totalEarnings: number;
      totalReferrals: number;
    };
    user: {
      firstName: string;
      id: string;
      lastName: string;
      referralCode: string;
    };
  };
}

interface ReferralData {
  referralCode?: string;
  referralLink?: string;
  totalReferrals?: number;
  pendingRewards?: number;
  approvedRewards?: number;
  totalRewards?: number;
  recentReferrals?: Array<{
    id: string;
    referredUserName: string;
    referredUserEmail: string;
    signupDate: string;
    status: 'pending' | 'approved' | 'rejected';
    rewardAmount?: number;
  }>;
}

interface ReferralSystemProps {
  userId: string;
  userType: 'user' | 'coach' | 'admin';
}

export default function ReferralSystem({ userId, userType }: ReferralSystemProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState<'code' | 'link' | null>(null);

  useEffect(() => {
    loadReferralData();
  }, [userId]);

  const loadReferralData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/referrals/user/${userId}`);
      if (response.ok) {
        const apiResponse: ReferralApiResponse = await response.json();
        console.log('Fetched referral data:', apiResponse);
        
        if (apiResponse.success && apiResponse.userReferralData) {
          const { userReferralData } = apiResponse;
          
          // Transform API response to match component expectations
          const transformedData: ReferralData = {
            referralCode: userReferralData.user.referralCode,
            referralLink: userReferralData.referralLink,
            totalReferrals: userReferralData.statistics.totalReferrals,
            pendingRewards: userReferralData.statistics.pendingEarnings,
            approvedRewards: userReferralData.statistics.totalEarnings,
            totalRewards: userReferralData.statistics.totalEarnings,
            recentReferrals: [
              ...userReferralData.referrals.recent.map((ref: any) => ({
                ...ref,
                status: 'recent' as const,
                rewardAmount: userReferralData.statistics.rewardPerReferral
              })),
              ...userReferralData.referrals.pending.map((ref: any) => ({
                ...ref,
                status: 'pending' as const,
                rewardAmount: userReferralData.statistics.rewardPerReferral
              })),
              ...userReferralData.referrals.approved.map((ref: any) => ({
                ...ref,
                status: 'approved' as const,
                rewardAmount: userReferralData.statistics.rewardPerReferral
              }))
            ]
          };
          
          setReferralData(transformedData);
        } else {
          setReferralData(null);
        }
      } else if (response.status === 404) {
        // User doesn't have referral data yet
        setReferralData(null);
      }
    } catch (error) {
      console.error('Error loading referral data:', error);
      // Set default data on error
      setReferralData({
        totalReferrals: 0,
        pendingRewards: 0,
        approvedRewards: 0,
        totalRewards: 0,
        recentReferrals: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateReferralCode = async () => {
    try {
      const response = await fetch('/api/referrals/generate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const apiResponse: ReferralApiResponse = await response.json();
        if (apiResponse.success && apiResponse.userReferralData) {
          // Transform the response to match our component structure
          const { userReferralData } = apiResponse;
          const transformedData: ReferralData = {
            referralCode: userReferralData.user.referralCode,
            referralLink: userReferralData.referralLink,
            totalReferrals: userReferralData.statistics.totalReferrals,
            pendingRewards: userReferralData.statistics.pendingEarnings,
            approvedRewards: userReferralData.statistics.totalEarnings,
            totalRewards: userReferralData.statistics.totalEarnings,
            recentReferrals: [],
          };
          setReferralData(transformedData);
        }
      }
    } catch (error) {
      console.error('Error generating referral code:', error);
    }
  };

  const copyToClipboard = async (text: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(type);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const shareReferralLink = () => {
    if (!referralData?.referralLink) return;
    
    if (navigator.share) {
      navigator.share({
        title: t('Join AfroBoost with my referral'),
        text: t('Join me on AfroBoost and get amazing dance courses!'),
        url: referralData.referralLink,
      });
    } else {
      copyToClipboard(referralData.referralLink, 'link');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!referralData) {
    return (
      <div className="text-center py-12">
        <FiShare2 className="text-gray-600 text-6xl mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-400 mb-2">
          {t('Set up your referral system')}
        </h3>
        <p className="text-gray-500 mb-6">
          {t('Generate your unique referral code to start earning rewards')}
        </p>
        <button
          onClick={generateReferralCode}
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
        >
          {t('Generate Referral Code')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{t('Referral Program')}</h1>
        <p className="text-gray-400 mt-2">
          {t('Share your referral code and earn rewards when friends join')}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <div className="min-w-0 flex-1">
          <p className="text-gray-400 text-xs sm:text-sm truncate">{t('Total Referrals')}</p>
          <p className="text-xl sm:text-2xl font-bold text-white">{referralData.totalReferrals || 0}</p>
        </div>
        <FiUsers className="text-blue-400 flex-shrink-0 self-start sm:self-center" size={20} />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <div className="min-w-0 flex-1">
          <p className="text-gray-400 text-xs sm:text-sm truncate">{t('Pending Rewards')}</p>
          <p className="text-xl sm:text-2xl font-bold text-yellow-400 truncate">
            CHF {(referralData.pendingRewards || 0).toFixed(2)}
          </p>
        </div>
        <FiGift className="text-yellow-400 flex-shrink-0 self-start sm:self-center" size={20} />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <div className="min-w-0 flex-1">
          <p className="text-gray-400 text-xs sm:text-sm truncate">{t('Approved Rewards')}</p>
          <p className="text-xl sm:text-2xl font-bold text-green-400 truncate">
            CHF {(referralData.approvedRewards || 0).toFixed(2)}
          </p>
        </div>
        <FiCheck className="text-green-400 flex-shrink-0 self-start sm:self-center" size={20} />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <div className="min-w-0 flex-1">
          <p className="text-gray-400 text-xs sm:text-sm truncate">{t('Total Earned')}</p>
          <p className="text-xl sm:text-2xl font-bold text-purple-400 truncate">
            CHF {(referralData.totalRewards || 0).toFixed(2)}
          </p>
        </div>
        <FiDollarSign className="text-purple-400 flex-shrink-0 self-start sm:self-center" size={20} />
          </div>
        </motion.div>
      </div>

      {/* Referral Code & Link */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">{t('Your Referral Details')}</h3>
        
        <div className="space-y-4">
          {/* Referral Code */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('Referral Code')}
            </label>
            <div className="flex items-center space-x-2">
              <code className="bg-gray-900 px-4 py-3 rounded-lg text-white font-mono text-lg flex-1">
                {referralData.referralCode || t('No code generated')}
              </code>
              <button
                onClick={() => copyToClipboard(referralData.referralCode || '', 'code')}
                className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                title={t('Copy code')}
                disabled={!referralData.referralCode}
              >
                {copySuccess === 'code' ? (
                  <FiCheck size={20} />
                ) : (
                  <FiCopy size={20} />
                )}
              </button>
            </div>
          </div>

          {/* Referral Link */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('Referral Link')}
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={referralData.referralLink || ''}
                readOnly
                placeholder={t('Link will be generated with code')}
                className="bg-gray-900 px-4 py-3 rounded-lg text-white font-mono text-sm flex-1"
              />
              <button
                onClick={() => copyToClipboard(referralData.referralLink || '', 'link')}
                className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                title={t('Copy link')}
                disabled={!referralData.referralLink}
              >
                {copySuccess === 'link' ? (
                  <FiCheck size={20} />
                ) : (
                  <FiCopy size={20} />
                )}
              </button>
              <button
                onClick={shareReferralLink}
                className="p-3 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition-colors"
                title={t('Share link')}
                disabled={!referralData.referralLink}
              >
                <FiShare2 size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-6 p-4 bg-gray-900 rounded-lg">
          <h4 className="text-white font-semibold mb-3">{t('How it works')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
            <div className="flex items-start space-x-2">
              <FiUserPlus className="text-purple-400 mt-0.5" size={16} />
              <span>{t('Share your code with friends')}</span>
            </div>
            <div className="flex items-start space-x-2">
              <FiUsers className="text-blue-400 mt-0.5" size={16} />
              <span>{t('They sign up using your code')}</span>
            </div>
            <div className="flex items-start space-x-2">
              <FiGift className="text-yellow-400 mt-0.5" size={16} />
              <span>{t('You both get reward credits')}</span>
            </div>
            <div className="flex items-start space-x-2">
              <FiCheck className="text-green-400 mt-0.5" size={16} />
              <span>{t('Admin approves and credits are added')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Referrals */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">{t('Recent Referrals')}</h3>
        
        {(referralData.recentReferrals || []).length === 0 ? (
          <div className="text-center py-8">
            <FiUsers className="text-gray-600 text-4xl mx-auto mb-3" />
            <p className="text-gray-400">{t('No referrals yet')}</p>
            <p className="text-gray-500 text-sm mt-1">
              {t('Start sharing your referral code to earn rewards')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {(referralData.recentReferrals || []).map((referral) => (
              <div
                key={referral.id}
                className="flex items-center justify-between p-4 bg-gray-900 rounded-lg"
              >
                <div className="flex-1">
                  <h4 className="text-white font-medium">{referral.referredUserName}</h4>
                  <p className="text-gray-400 text-sm">{referral.referredUserEmail}</p>
                  <p className="text-gray-500 text-xs">
                    {t('Signed up on')} {new Date(referral.signupDate).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="text-right">
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    referral.status === 'approved' 
                      ? 'bg-green-900/20 text-green-400'
                      : referral.status === 'pending'
                      ? 'bg-yellow-900/20 text-yellow-400'
                      : 'bg-red-900/20 text-red-400'
                  }`}>
                    {t(referral.status)}
                  </div>
                  <p className="text-gray-400 text-sm mt-1">
                    CHF {(referral.rewardAmount || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}