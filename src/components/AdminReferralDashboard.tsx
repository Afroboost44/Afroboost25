'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiUsers, 
  FiDollarSign, 
  FiCheck, 
  FiX, 
  FiClock,
  FiEye,
  FiMail,
  FiCalendar,
  FiFilter,
  FiDownload,
  FiSearch,
  FiShield,
  FiUserCheck
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import AdminCoachReferralOversight from '@/components/AdminCoachReferralOversight';

interface ReferralRecord {
  id: string;
  referralCode: string;
  sponsorId: string;
  sponsorName: string;
  sponsorEmail: string;
  refereeId: string; // Updated to match Referral interface
  refereeName: string; // Updated to match Referral interface  
  refereeEmail: string; // Updated to match Referral interface
  signupDate?: string;
  submittedAt?: string; // Added to match Referral interface
  status: 'pending' | 'approved' | 'rejected';
  rewardAmount?: number;
  sponsorRewardAmount?: number;
  referredRewardAmount?: number;
  approvedDate?: string;
  approvedAt?: string; // Added to match Referral interface
  approvedBy?: string;
  approvedByName?: string; // Added to match Referral interface
  rejectionReason?: string;
  rejectedAt?: string; // Added to match Referral interface
  rejectedBy?: string; // Added to match Referral interface
  rejectedByName?: string; // Added to match Referral interface
  createdAt?: string;
  updatedAt?: string;
}

interface AdminReferralDashboardProps {
  adminId: string;
}

export default function AdminReferralDashboard({ adminId }: AdminReferralDashboardProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('user-referrals');
  const [referralRecords, setReferralRecords] = useState<ReferralRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<ReferralRecord | null>(null);
  const [rewardAmounts, setRewardAmounts] = useState({ sponsor: 50, referred: 25 });
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadReferralRecords();
    loadRewardSettings();
  }, [filter]);

  const loadRewardSettings = async () => {
    try {
      const response = await fetch('/api/admin/referrals/reward-settings');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.settings) {
          setRewardAmounts({
            sponsor: data.settings.sponsorReward?.amount || 0,
            referred: data.settings.referredUserReward?.amount || 0
          });
        }
      } else {
        console.error('Failed to load reward settings');
      }
    } catch (error) {
      console.error('Error loading reward settings:', error);
    }
  };

  const loadReferralRecords = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/referrals?status=${filter}`);
      if (response.ok) {
        const data = await response.json();
        // Ensure we always set an array, fallback to empty array if data is malformed
        const records = Array.isArray(data.referrals) ? data.referrals : 
                       Array.isArray(data.records) ? data.records : 
                       Array.isArray(data) ? data : [];
        setReferralRecords(records);
      } else {
        console.error('Failed to load referral records');
        setReferralRecords([]);
      }
    } catch (error) {
      console.error('Error loading referral records:', error);
      setReferralRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveReferral = async (recordId: string) => {
    if (!confirm(t('Are you sure you want to approve this referral?'))) {
      return;
    }

    setIsProcessing(recordId);
    try {
      const response = await fetch(`/api/admin/referrals`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          referralId: recordId,
          status: 'approved',
          rewardAmount: rewardAmounts.sponsor,
          rewardCurrency: 'CHF',
          adminNotes: `Approved by admin ${adminId}`,
          adminId: adminId,
          adminName: `Admin ${adminId}`
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setReferralRecords(prev => {
          const prevArray = Array.isArray(prev) ? prev : [];
          return prevArray.map(record =>
            record.id === recordId ? { ...record, status: 'approved', approvedBy: adminId, approvedDate: new Date().toISOString() } : record
          );
        });
        alert(t('Referral approved successfully'));
      } else {
        const error = await response.json();
        alert(error.message || t('Error approving referral'));
      }
    } catch (error) {
      console.error('Error approving referral:', error);
      alert(t('Error approving referral'));
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRejectReferral = async (recordId: string) => {
    const reason = prompt(t('Please enter rejection reason (optional):'));
    if (reason === null) return; // User cancelled

    setIsProcessing(recordId);
    try {
      const response = await fetch(`/api/admin/referrals`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          referralId: recordId,
          status: 'rejected',
          rejectionReason: reason || 'No reason provided',
          adminNotes: `Rejected by admin ${adminId}`,
          adminId: adminId,
          adminName: `Admin ${adminId}`
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setReferralRecords(prev => {
          const prevArray = Array.isArray(prev) ? prev : [];
          return prevArray.map(record =>
            record.id === recordId ? { ...record, status: 'rejected', rejectionReason: reason } : record
          );
        });
        alert(t('Referral rejected successfully'));
      } else {
        const error = await response.json();
        alert(error.message || t('Error rejecting referral'));
      }
    } catch (error) {
      console.error('Error rejecting referral:', error);
      alert(t('Error rejecting referral'));
    } finally {
      setIsProcessing(null);
    }
  };

  const updateRewardAmounts = async () => {
    try {
      const response = await fetch('/api/admin/referrals/reward-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isEnabled: true,
          rewardType: 'credits',
          sponsorReward: {
            amount: rewardAmounts.sponsor >= 0 ? rewardAmounts.sponsor : 0,
            currency: 'CHF',
            type: 'credits'
          },
          referredUserReward: {
            amount: rewardAmounts.referred >= 0 ? rewardAmounts.referred : 0,
            currency: 'CHF',
            type: 'credits'
          },
          requireApproval: true,
          autoApprovalEnabled: false,
          terms: 'Standard referral program terms apply.',
          description: rewardAmounts.sponsor === 0 && rewardAmounts.referred === 0 ? 
            'Referral program active with no monetary rewards.' : 
            'Earn rewards for referring new users!',
          updatedBy: adminId
        }),
      });

      if (response.ok) {
        alert(t('Reward amounts updated successfully'));
        // Reload the settings to ensure UI reflects what's actually saved
        loadRewardSettings();
      } else {
        const error = await response.json();
        console.error('API Error:', error);
        alert(error.error || t('Error updating reward amounts'));
      }
    } catch (error) {
      console.error('Error updating reward amounts:', error);
      alert(t('Error updating reward amounts'));
    }
  };

  const exportReferralData = async () => {
    try {
      const response = await fetch(`/api/admin/referrals/export?format=csv&status=${filter}&search=${searchTerm}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `referrals-${filter}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      alert(t('Error exporting data'));
    }
  };

  const getFilteredRecords = () => {
    // Ensure referralRecords is always an array
    const records = Array.isArray(referralRecords) ? referralRecords : [];
    
    return records.filter(record => {
      if (!record) return false;
      
      const matchesSearch = searchTerm === '' || 
        (record.sponsorName && record.sponsorName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (record.sponsorEmail && record.sponsorEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (record.refereeName && record.refereeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (record.refereeEmail && record.refereeEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (record.referralCode && record.referralCode.toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesSearch;
    });
  };

  const getStatusStats = () => {
    // Ensure referralRecords is always an array
    const records = Array.isArray(referralRecords) ? referralRecords : [];
    
    const stats = {
      total: records.length,
      pending: records.filter(r => r && r.status === 'pending').length,
      approved: records.filter(r => r && r.status === 'approved').length,
      rejected: records.filter(r => r && r.status === 'rejected').length,
      totalRewards: records
        .filter(r => r && r.status === 'approved' && typeof r.rewardAmount === 'number')
        .reduce((sum, r) => sum + (r.rewardAmount || 0), 0),
    };
    return stats;
  };

  const stats = getStatusStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">{t('Referral Management')}</h1>
          <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
            {t('Manage user referrals and coach referral system')}
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={exportReferralData}
            className="bg-gray-700 hover:bg-gray-600 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 text-sm sm:text-base"
          >
            <FiDownload size={16} />
            <span className="hidden sm:inline">{t('Export')}</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-4 sm:space-x-8 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('user-referrals')}
            className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
              activeTab === 'user-referrals'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-1 sm:space-x-2">
              <FiUsers size={14} className="sm:w-4 sm:h-4" />
              <span>{t('User Referrals')}</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('coach-oversight')}
            className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
              activeTab === 'coach-oversight'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-1 sm:space-x-2">
              <FiShield size={14} className="sm:w-4 sm:h-4" />
              <span>{t('Coach Oversight')}</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'user-referrals' && (
        <div className="space-y-6">{/* Original user referral content will go here */}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gray-800 rounded-xl p-3 sm:p-6 border border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs sm:text-sm">{t('Total Referrals')}</p>
              <p className="text-lg sm:text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <FiUsers className="text-blue-400" size={20} />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gray-800 rounded-xl p-3 sm:p-6 border border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs sm:text-sm">{t('Pending')}</p>
              <p className="text-lg sm:text-2xl font-bold text-yellow-400">{stats.pending}</p>
            </div>
            <FiClock className="text-yellow-400" size={20} />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gray-800 rounded-xl p-3 sm:p-6 border border-gray-700 col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs sm:text-sm">{t('Approved')}</p>
              <p className="text-lg sm:text-2xl font-bold text-green-400">{stats.approved}</p>
            </div>
            <FiCheck className="text-green-400" size={20} />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gray-800 rounded-xl p-3 sm:p-6 border border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs sm:text-sm">{t('Rejected')}</p>
              <p className="text-lg sm:text-2xl font-bold text-red-400">{stats.rejected}</p>
            </div>
            <FiX className="text-red-400" size={20} />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gray-800 rounded-xl p-3 sm:p-6 border border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs sm:text-sm">{t('Total Rewards')}</p>
              <p className="text-lg sm:text-2xl font-bold text-purple-400">
                CHF {stats.totalRewards.toFixed(2)}
              </p>
            </div>
            <FiDollarSign className="text-purple-400" size={20} />
          </div>
        </motion.div>
      </div>

      {/* Reward Settings */}
      <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
        <h3 className="text-base sm:text-lg font-semibold text-white mb-4">{t('Reward Settings')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
              {t('Sponsor Reward (CHF)')}
            </label>
            <input
              type="number"
              value={rewardAmounts.sponsor}
              onChange={(e) => setRewardAmounts(prev => ({ ...prev, sponsor: Number(e.target.value) }))}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm"
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
              {t('New User Reward (CHF)')}
            </label>
            <input
              type="number"
              value={rewardAmounts.referred}
              onChange={(e) => setRewardAmounts(prev => ({ ...prev, referred: Number(e.target.value) }))}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm"
              min="0"
              step="0.01"
            />
          </div>
          <button
            onClick={updateRewardAmounts}
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base col-span-1 sm:col-span-2 lg:col-span-1"
          >
            {t('Update Amounts')}
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 gap-4">
        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-gray-800 rounded-lg p-1 overflow-x-auto">
          {[
            { key: 'all', label: t('All'), count: stats.total },
            { key: 'pending', label: t('Pending'), count: stats.pending },
            { key: 'approved', label: t('Approved'), count: stats.approved },
            { key: 'rejected', label: t('Rejected'), count: stats.rejected },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                filter === tab.key
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span className="hidden sm:inline">{tab.label} ({tab.count})</span>
              <span className="sm:hidden">{tab.label.charAt(0)} {tab.count}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-0 lg:min-w-[300px]">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('Search by name, email, or code...')}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 text-sm sm:text-base"
          />
        </div>
      </div>

      {/* Referral Records Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-gray-300">{t('Referral Info')}</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-gray-300">{t('Sponsor')}</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-gray-300">{t('New User')}</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-gray-300">{t('Rewards')}</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-gray-300">{t('Status')}</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-medium text-gray-300">{t('Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {getFilteredRecords().length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 sm:px-6 py-8 sm:py-12 text-center">
                    <div className="text-gray-400">
                      <FiUsers className="text-4xl sm:text-6xl mx-auto mb-3 sm:mb-4 text-gray-600" />
                      <h3 className="text-lg sm:text-xl font-semibold mb-2">
                        {searchTerm ? t('No matching referrals found') : t('No referrals found')}
                      </h3>
                      <p className="text-sm sm:text-base">
                        {searchTerm ? t('Try adjusting your search criteria') : t('Referrals will appear here when users sign up')}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                getFilteredRecords().map((record) => (
                  <tr key={record?.id || Math.random()} className="hover:bg-gray-750">
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div>
                        <div className="text-white font-medium text-sm sm:text-base">{record?.referralCode || 'N/A'}</div>
                        <div className="text-gray-400 text-xs sm:text-sm">
                          {record?.signupDate ? new Date(record.signupDate).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div>
                        <div className="text-white text-sm sm:text-base truncate max-w-[120px] sm:max-w-none">{record?.sponsorName || 'N/A'}</div>
                        <div className="text-gray-400 text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{record?.sponsorEmail || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div>
                        <div className="text-white text-sm sm:text-base truncate max-w-[120px] sm:max-w-none">{record?.refereeName || 'N/A'}</div>
                        <div className="text-gray-400 text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{record?.refereeEmail || 'N/A'}</div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="text-xs sm:text-sm">
                        <div className="text-green-400">
                          {t('Sponsor')}: CHF {record?.sponsorRewardAmount?.toFixed(2) || rewardAmounts.sponsor.toFixed(2)}
                        </div>
                        <div className="text-blue-400">
                          {t('User')}: CHF {record?.referredRewardAmount?.toFixed(2) || rewardAmounts.referred.toFixed(2)}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        record?.status === 'approved' 
                          ? 'bg-green-900/20 text-green-400'
                          : record?.status === 'pending'
                          ? 'bg-yellow-900/20 text-yellow-400'
                          : 'bg-red-900/20 text-red-400'
                      }`}>
                        <span className="hidden sm:inline">{t(record?.status || 'unknown')}</span>
                        <span className="sm:hidden">{t(record?.status || 'unknown').charAt(0).toUpperCase()}</span>
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        {record?.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveReferral(record.id)}
                              disabled={isProcessing === record.id}
                              className="p-1.5 sm:p-2 text-green-400 hover:text-green-300 transition-colors disabled:opacity-50"
                              title={t('Approve referral')}
                            >
                              <FiCheck size={14} className="sm:hidden" />
                              <FiCheck size={16} className="hidden sm:block" />
                            </button>
                            <button
                              onClick={() => handleRejectReferral(record.id)}
                              disabled={isProcessing === record.id}
                              className="p-1.5 sm:p-2 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                              title={t('Reject referral')}
                            >
                              <FiX size={14} className="sm:hidden" />
                              <FiX size={16} className="hidden sm:block" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setSelectedRecord(record)}
                          className="p-1.5 sm:p-2 text-gray-400 hover:text-white transition-colors"
                          title={t('View details')}
                        >
                          <FiEye size={14} className="sm:hidden" />
                          <FiEye size={16} className="hidden sm:block" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-gray-900 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-700"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">{t('Referral Details')}</h3>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <FiX size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3">{t('Sponsor Information')}</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-gray-400">{t('Name')}:</span> <span className="text-white">{selectedRecord.sponsorName}</span></div>
                      <div><span className="text-gray-400">{t('Email')}:</span> <span className="text-white">{selectedRecord.sponsorEmail}</span></div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3">{t('New User Information')}</h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-gray-400">{t('Name')}:</span> <span className="text-white">{selectedRecord.refereeName}</span></div>
                      <div><span className="text-gray-400">{t('Email')}:</span> <span className="text-white">{selectedRecord.refereeEmail}</span></div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">{t('Referral Information')}</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-gray-400">{t('Referral Code')}:</span> <span className="text-white font-mono">{selectedRecord.referralCode}</span></div>
                    <div><span className="text-gray-400">{t('Signup Date')}:</span> <span className="text-white">{selectedRecord.submittedAt ? new Date(selectedRecord.submittedAt).toLocaleString() : selectedRecord.signupDate ? new Date(selectedRecord.signupDate).toLocaleString() : 'N/A'}</span></div>
                    <div><span className="text-gray-400">{t('Status')}:</span> 
                      <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedRecord.status === 'approved' 
                          ? 'bg-green-900/20 text-green-400'
                          : selectedRecord.status === 'pending'
                          ? 'bg-yellow-900/20 text-yellow-400'
                          : 'bg-red-900/20 text-red-400'
                      }`}>
                        {t(selectedRecord.status)}
                      </span>
                    </div>
                    {selectedRecord.approvedDate && (
                      <div><span className="text-gray-400">{t('Approved Date')}:</span> <span className="text-white">{new Date(selectedRecord.approvedDate).toLocaleString()}</span></div>
                    )}
                    {selectedRecord.rejectionReason && (
                      <div><span className="text-gray-400">{t('Rejection Reason')}:</span> <span className="text-white">{selectedRecord.rejectionReason}</span></div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">{t('Reward Information')}</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-gray-400">{t('Sponsor Reward')}:</span> <span className="text-green-400">CHF {selectedRecord.sponsorRewardAmount?.toFixed(2) || '0.00'}</span></div>
                    <div><span className="text-gray-400">{t('New User Reward')}:</span> <span className="text-blue-400">CHF {selectedRecord.referredRewardAmount?.toFixed(2) || '0.00'}</span></div>
                    <div><span className="text-gray-400">{t('Total Reward')}:</span> <span className="text-purple-400">CHF {((selectedRecord.sponsorRewardAmount || 0) + (selectedRecord.referredRewardAmount || 0)).toFixed(2)}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      </div>
      )}

      {/* Coach Oversight Tab */}
      {activeTab === 'coach-oversight' && (
        <AdminCoachReferralOversight adminId={adminId} />
      )}
    </div>
  );
}