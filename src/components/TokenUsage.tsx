'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiPackage, FiClock, FiBook, FiUser, FiTrendingDown, FiCalendar, FiDollarSign } from 'react-icons/fi';
import Card from '@/components/Card';
import { useAuth } from '@/lib/auth';
import { studentTokenPackageService, tokenUsageService } from '@/lib/database';
import { StudentTokenPackage, TokenUsage as TokenUsageType } from '@/types';
import { useTranslation } from 'react-i18next';
import { Timestamp } from 'firebase/firestore';

// Helper function to convert Firestore Timestamp to Date
const toDate = (dateOrTimestamp: any): Date => {
  if (dateOrTimestamp instanceof Timestamp) {
    return dateOrTimestamp.toDate();
  }
  return dateOrTimestamp instanceof Date ? dateOrTimestamp : new Date(dateOrTimestamp);
};

export default function TokenUsage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tokenPackages, setTokenPackages] = useState<StudentTokenPackage[]>([]);
  const [tokenUsages, setTokenUsages] = useState<TokenUsageType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [stats, setStats] = useState({
    totalPackages: 0,
    activePackages: 0,
    totalTokens: 0,
    remainingTokens: 0,
    totalSpent: 0
  });

  useEffect(() => {
    if (user && user.role === 'student') {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      if (!user) return;

      const [packages, usages] = await Promise.all([
        studentTokenPackageService.getByStudentId(user.id),
        tokenUsageService.getByStudentId(user.id)
      ]);

      setTokenPackages(packages);
      setTokenUsages(usages);

      // Calculate stats
      const activePackages = packages.filter(pkg => 
        !pkg.isExpired && 
        pkg.remainingTokens > 0 && 
        toDate(pkg.expiryDate) > new Date()
      );

      const totalTokens = packages.reduce((sum, pkg) => sum + pkg.totalTokens, 0);
      const remainingTokens = packages.reduce((sum, pkg) => sum + pkg.remainingTokens, 0);
      const totalSpent = packages.reduce((sum, pkg) => sum + pkg.purchasePrice, 0);

      setStats({
        totalPackages: packages.length,
        activePackages: activePackages.length,
        totalTokens,
        remainingTokens,
        totalSpent
      });

    } catch (error) {
      console.error('Error loading token usage data:', error);
      setError(t('failedToLoadTokenUsageData'));
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredPackages = () => {
    switch (selectedFilter) {
      case 'active':
        return tokenPackages.filter(pkg => 
          !pkg.isExpired && 
          pkg.remainingTokens > 0 && 
          toDate(pkg.expiryDate) > new Date()
        );
      case 'expired':
        return tokenPackages.filter(pkg => 
          pkg.isExpired || 
          pkg.remainingTokens === 0 || 
          toDate(pkg.expiryDate) <= new Date()
        );
      default:
        return tokenPackages;
    }
  };

  const getPackageUsages = (packageId: string) => {
    return tokenUsages.filter(usage => usage.packageId === packageId);
  };

  const isPackageExpired = (pkg: StudentTokenPackage) => {
    return pkg.isExpired || 
           pkg.remainingTokens === 0 || 
           toDate(pkg.expiryDate) <= new Date();
  };

  const getUsagePercentage = (pkg: StudentTokenPackage) => {
    return ((pkg.totalTokens - pkg.remainingTokens) / pkg.totalTokens) * 100;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-[#D91CD2] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">{t('loadingTokenUsageData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold gradient-text">{t('tokenUsage')}</h2>
        <p className="text-gray-400 mt-1">{t('trackYourTokenPackagesAndUsage')}</p>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <div className="flex items-center space-x-3">
            <div className="bg-[#D91CD2]/20 p-3 rounded-lg">
              <FiPackage className="text-[#D91CD2]" size={20} />
            </div>
            <div>
              <p className="text-gray-400 text-xs">{t('totalPackages')}</p>
              <p className="text-lg font-bold">{stats.totalPackages}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center space-x-3">
            <div className="bg-green-500/20 p-3 rounded-lg">
              <FiClock className="text-green-400" size={20} />
            </div>
            <div>
              <p className="text-gray-400 text-xs">{t('activePackages')}</p>
              <p className="text-lg font-bold">{stats.activePackages}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center space-x-3">
            <div className="bg-blue-500/20 p-3 rounded-lg">
              <FiTrendingDown className="text-blue-400" size={20} />
            </div>
            <div>
              <p className="text-gray-400 text-xs">{t('totalTokens')}</p>
              <p className="text-lg font-bold">{stats.totalTokens}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center space-x-3">
            <div className="bg-yellow-500/20 p-3 rounded-lg">
              <FiBook className="text-yellow-400" size={20} />
            </div>
            <div>
              <p className="text-gray-400 text-xs">{t('remainingTokens')}</p>
              <p className="text-lg font-bold">{stats.remainingTokens}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center space-x-3">
            <div className="bg-purple-500/20 p-3 rounded-lg">
              <FiDollarSign className="text-purple-400" size={20} />
            </div>
            <div>
              <p className="text-gray-400 text-xs">{t('totalSpent')}</p>
              <p className="text-lg font-bold">${stats.totalSpent.toFixed(2)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Card>
        <div className="flex space-x-4 mb-6">
          {[
            { key: 'all', label: t('allPackages') },
            { key: 'active', label: t('activePackages') },
            { key: 'expired', label: t('expiredPackages') }
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setSelectedFilter(filter.key as any)}
              className={`px-1 py-2 rounded-lg font-medium transition-all ${
                selectedFilter === filter.key
                  ? 'bg-[#D91CD2] text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Token Packages List */}
        {getFilteredPackages().length === 0 ? (
          <div className="text-center py-12">
            <FiPackage className="mx-auto text-gray-400 mb-4" size={48} />
            <h4 className="text-lg font-medium text-gray-400 mb-2">
              {selectedFilter === 'all' 
                ? t('noTokenPackagesYet')
                : selectedFilter === 'active'
                ? t('noActiveTokenPackages')
                : t('noExpiredTokenPackages')
              }
            </h4>
            <p className="text-gray-500">
              {selectedFilter === 'all' && t('visitTokensPageToPurchase')}
            </p>
          </div>
        ) : (
            <div className="space-y-4">
            {getFilteredPackages().map((pkg) => {
              const usages = getPackageUsages(pkg.packageId);
              const usagePercentage = getUsagePercentage(pkg);
              const expired = isPackageExpired(pkg);

              return (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-gray-800/50 rounded-lg p-6 border transition-all ${
                expired ? 'border-red-500/30' : 'border-gray-700/50'
                }`}
              >
                <div className="flex flex-col md:flex-row items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                  <h4 className="text-lg font-bold">{pkg.packageName}</h4>
                  <div className={`px-2 py-1 rounded-full text-xs ${
                    expired 
                    ? 'bg-red-500/20 text-red-400' 
                    : 'bg-green-500/20 text-green-400'
                  }`}>
                    {expired ? t('expired') : t('active')}
                  </div>
                  </div>
                  <div className="flex flex-col md:flex-row items-center space-x-0 md:space-x-4 text-sm text-gray-400 mb-3">
                  <span className="flex items-center">
                    <FiUser className="mr-1" />
                    {t('coach')}: {pkg.coachName}
                  </span>
                  <span className="flex items-center">
                    <FiCalendar className="mr-1" />
                    {t('purchased')}: {toDate(pkg.purchaseDate).toLocaleDateString()}
                  </span>
                  <span className="flex items-center">
                    <FiClock className="mr-1" />
                    {t('expires')}: {toDate(pkg.expiryDate).toLocaleDateString()}
                  </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-[#D91CD2] mb-1">
                  {pkg.remainingTokens}
                  </div>
                  <div className="text-xs text-gray-400">
                  {t('ofTokensLeft', { 
                    remaining: pkg.remainingTokens,
                    total: pkg.totalTokens 
                  })}
                  </div>
                </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{t('usage')}</span>
                  <span>
                  {pkg.totalTokens - pkg.remainingTokens}/{pkg.totalTokens} {t('tokensUsed')}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    expired ? 'bg-red-500' : 'bg-[#D91CD2]'
                  }`}
                  style={{ width: `${usagePercentage}%` }}
                  ></div>
                </div>
                </div>

                {/* Package Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-900/50 rounded-lg mb-4">
                <div className="text-center">
                  <p className="text-xs text-gray-400">{t('purchasePrice')}</p>
                  <p className="text-lg font-bold text-green-400">
                  ${pkg.purchasePrice.toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">{t('coursesUsed')}</p>
                  <p className="text-lg font-bold text-blue-400">{usages.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">{t('lastUsed')}</p>
                  <p className="text-sm text-white">
                  {pkg.lastUsedDate 
                    ? toDate(pkg.lastUsedDate).toLocaleDateString()
                    : t('neverUsed')
                  }
                  </p>
                </div>
                </div>

                {/* Usage History */}
                {usages.length > 0 && (
                <div>
                  <h5 className="font-semibold mb-3 text-sm">
                  {t('usageHistory')} ({usages.length})
                  </h5>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                  {usages.slice(0, 3).map((usage) => (
                    <div
                    key={usage.id}
                    className="flex items-center justify-between p-3 bg-gray-900 rounded-lg"
                    >
                    <div>
                      <p className="font-medium text-sm">{usage.courseName}</p>
                      <p className="text-xs text-gray-400">
                      {toDate(usage.usageDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-red-400">
                      -{usage.tokensUsed} {t('tokens')}
                      </p>
                    </div>
                    </div>
                  ))}
                  {usages.length > 3 && (
                    <p className="text-xs text-gray-400 text-center">
                    {t('andMoreUsages', { count: usages.length - 3 })}
                    </p>
                  )}
                  </div>
                </div>
                )}
              </motion.div>
              );
            })}
            </div>
        )}
      </Card>
    </div>
  );
}
