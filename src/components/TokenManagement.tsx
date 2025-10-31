'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiPackage, FiUsers, FiTrendingUp, FiEdit, FiTrash2, FiPlus, FiEye, FiDollarSign, FiClock, FiCheck, FiX } from 'react-icons/fi';
import Card from '@/components/Card';
import CreateTokenPackageModal from '@/components/CreateTokenPackageModal';
import { useAuth } from '@/lib/auth';
import { tokenPackageService, studentTokenPackageService, tokenUsageService } from '@/lib/database';
import { TokenPackage, StudentTokenPackage, TokenUsage } from '@/types';
import { useTranslation } from 'react-i18next';
import { Timestamp } from 'firebase/firestore';

// Helper function to convert Firestore Timestamp to Date
const toDate = (dateOrTimestamp: any): Date => {
  if (dateOrTimestamp instanceof Timestamp) {
    return dateOrTimestamp.toDate();
  }
  return dateOrTimestamp instanceof Date ? dateOrTimestamp : new Date(dateOrTimestamp);
};

export default function TokenManagement() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tokenPackages, setTokenPackages] = useState<TokenPackage[]>([]);
  const [studentPackages, setStudentPackages] = useState<StudentTokenPackage[]>([]);
  const [tokenUsages, setTokenUsages] = useState<TokenUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<TokenPackage | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalPackages: 0,
    activePackages: 0,
    totalSubscribers: 0,
    totalEarnings: 0
  });

  useEffect(() => {
    if (user && user.role === 'coach') {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      if (!user) return;

      const [packages, usage] = await Promise.all([
        tokenPackageService.getByCoachId(user.id),
        tokenUsageService.getByCoachId(user.id)
      ]);

      setTokenPackages(packages);
      setTokenUsages(usage);

      // Load subscriber data for all packages
      const allStudentPackages: StudentTokenPackage[] = [];
      for (const pkg of packages) {
        const subscribers = await studentTokenPackageService.getByPackageId(pkg.id);
        allStudentPackages.push(...subscribers);
      }
      setStudentPackages(allStudentPackages);

      // Calculate stats
      const activePackages = packages.filter(pkg => 
        pkg.isActive && toDate(pkg.expiryDate) > new Date()
      );
      const totalEarnings = allStudentPackages.reduce((sum, pkg) => sum + pkg.purchasePrice, 0);

      setStats({
        totalPackages: packages.length,
        activePackages: activePackages.length,
        totalSubscribers: allStudentPackages.length,
        totalEarnings
      });

    } catch (error) {
      console.error('Error loading token data:', error);
      setError(t('failedToLoadTokenData'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePackage = () => {
    setEditingPackage(null);
    setShowCreateModal(true);
  };

  const handleEditPackage = (pkg: TokenPackage) => {
    setEditingPackage(pkg);
    setShowCreateModal(true);
  };

  const handleDeletePackage = async (packageId: string) => {
    if (!confirm(t('confirmDeleteTokenPackage'))) return;

    try {
      await tokenPackageService.delete(packageId);
      setSuccess(t('tokenPackageDeletedSuccessfully'));
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error deleting token package:', error);
      setError(t('failedToDeleteTokenPackage'));
    }
  };

  const handleModalSuccess = () => {
    setSuccess(t('tokenPackageSavedSuccessfully'));
    loadData();
    setTimeout(() => setSuccess(null), 3000);
  };

  const getPackageSubscribers = (packageId: string) => {
    return studentPackages.filter(pkg => pkg.packageId === packageId);
  };

  const getPackageUsages = (packageId: string) => {
    return tokenUsages.filter(usage => usage.packageId === packageId);
  };

  const isPackageExpired = (expiryDate: any) => {
    return toDate(expiryDate) < new Date();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-[#D91CD2] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">{t('loadingTokenData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold gradient-text">{t('tokenManagement')}</h2>
          <p className="text-gray-400 mt-1">{t('manageYourTokenPackages')}</p>
        </div>
        <button
          onClick={handleCreatePackage}
          className="btn-primary flex items-center space-x-2"
        >
          <FiPlus />
          <span>{t('createPackage')}</span>
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <FiCheck className="text-green-400" />
            <p className="text-green-400">{success}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <FiX className="text-red-400" />
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center space-x-3">
            <div className="bg-[#D91CD2]/20 p-3 rounded-lg">
              <FiPackage className="text-[#D91CD2]" size={24} />
            </div>
            <div>
              <p className="text-gray-400 text-sm">{t('totalPackages')}</p>
              <p className="text-2xl font-bold">{stats.totalPackages}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center space-x-3">
            <div className="bg-green-500/20 p-3 rounded-lg">
              <FiCheck className="text-green-400" size={24} />
            </div>
            <div>
              <p className="text-gray-400 text-sm">{t('activePackages')}</p>
              <p className="text-2xl font-bold">{stats.activePackages}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center space-x-3">
            <div className="bg-blue-500/20 p-3 rounded-lg">
              <FiUsers className="text-blue-400" size={24} />
            </div>
            <div>
              <p className="text-gray-400 text-sm">{t('totalSubscribers')}</p>
              <p className="text-2xl font-bold">{stats.totalSubscribers}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center space-x-3">
            <div className="bg-yellow-500/20 p-3 rounded-lg">
              <FiDollarSign className="text-yellow-400" size={24} />
            </div>
            <div>
              <p className="text-gray-400 text-sm">{t('totalEarnings')}</p>
              <p className="text-2xl font-bold">${stats.totalEarnings.toFixed(2)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Token Packages */}
      <Card>
        <h3 className="text-xl font-semibold mb-6">{t('yourTokenPackages')}</h3>
        
        {tokenPackages.length === 0 ? (
          <div className="text-center py-12">
            <FiPackage className="mx-auto text-gray-400 mb-4" size={48} />
            <h4 className="text-lg font-medium text-gray-400 mb-2">{t('noTokenPackagesYet')}</h4>
            <p className="text-gray-500 mb-4">{t('createFirstTokenPackage')}</p>
            <button
              onClick={handleCreatePackage}
              className="btn-primary"
            >
              {t('createYourFirstPackage')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {tokenPackages.map((pkg) => {
              const subscribers = getPackageSubscribers(pkg.id);
              const usages = getPackageUsages(pkg.id);
              const totalTokensUsed = usages.reduce((sum, usage) => sum + usage.tokensUsed, 0);
              const isExpired = isPackageExpired(pkg.expiryDate);

              return (
                <div
                  key={pkg.id}
                  className={`bg-gray-800/50 rounded-lg p-6 border transition-all ${
                    selectedPackageId === pkg.id 
                      ? 'border-[#D91CD2] shadow-lg shadow-[#D91CD2]/20' 
                      : 'border-gray-700/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-bold">{pkg.packageName}</h4>
                        <div className={`px-2 py-1 rounded-full text-xs ${
                          isExpired 
                            ? 'bg-red-500/20 text-red-400' 
                            : pkg.isActive 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {isExpired ? t('expired') : pkg.isActive ? t('active') : t('inactive')}
                        </div>
                      </div>
                      {pkg.description && (
                        <div className="text-gray-400 text-sm mb-2 token-description">
                          {pkg.description.split('\n').map((line, index) => (
                            <p key={index} className="mb-2 last:mb-0">
                              {line.trim().startsWith('-') ? (
                                <span className="flex items-start">
                                  <span className="text-[#D91CD2] mr-2">•</span>
                                  {line.trim().substring(1).trim()}
                                </span>
                              ) : (
                                line
                              )}
                            </p>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span>{pkg.totalTokens} {t('tokens')}</span>
                        <span>${pkg.price.toFixed(2)}</span>
                        <span className="flex items-center">
                          <FiClock className="mr-1" />
                          {t('expires')}: {toDate(pkg.expiryDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center space-x-2">
                      <button
                      onClick={() => setSelectedPackageId(
                        selectedPackageId === pkg.id ? null : pkg.id
                      )}
                      className="p-2 text-gray-400 hover:text-[#D91CD2] transition-colors"
                      title={t('viewDetails')}
                      >
                      <FiEye size={18} />
                      </button>
                      <button
                      onClick={() => handleEditPackage(pkg)}
                      className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                      title={t('editPackage')}
                      >
                      <FiEdit size={18} />
                      </button>
                      <button
                      onClick={() => handleDeletePackage(pkg.id)}
                      className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                      title={t('deletePackage')}
                      >
                      <FiTrash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Package Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-900/50 rounded-lg">
                    <div className="text-center">
                      <p className="text-sm text-gray-400">{t('subscribers')}</p>
                      <p className="text-xl font-bold text-[#D91CD2]">{subscribers.length}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-400">{t('tokensUsed')}</p>
                      <p className="text-xl font-bold text-yellow-400">{totalTokensUsed}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-400">{t('earnings')}</p>
                      <p className="text-xl font-bold text-green-400">
                        ${subscribers.reduce((sum, sub) => sum + sub.purchasePrice, 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Detailed View */}
                  {selectedPackageId === pkg.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-gray-700 pt-4"
                    >
                      <h5 className="font-semibold mb-3">{t('subscribers')} ({subscribers.length})</h5>
                      {subscribers.length === 0 ? (
                        <p className="text-gray-400 text-sm">{t('noSubscribersYet')}</p>
                      ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {subscribers.map((subscriber) => (
                            <div
                              key={subscriber.id}
                              className="flex items-center justify-between p-3 bg-gray-900 rounded-lg"
                            >
                              <div>
                                <p className="font-medium">{subscriber.studentName}</p>
                                <p className="text-sm text-gray-400">
                                  {t('purchased')}: {toDate(subscriber.purchaseDate).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm">
                                  {subscriber.remainingTokens}/{subscriber.totalTokens} {t('tokensLeft')}
                                </p>
                                <p className="text-sm text-green-400">
                                  ${subscriber.purchasePrice.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {usages.length > 0 && (
                        <div className="mt-4">
                          <h5 className="font-semibold mb-3">{t('recentUsage')}</h5>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {usages.slice(0, 5).map((usage) => (
                              <div
                                key={usage.id}
                                className="flex items-center justify-between p-3 bg-gray-900 rounded-lg"
                              >
                                <div>
                                  <p className="font-medium">{usage.studentName}</p>
                                  <p className="text-sm text-gray-400">{usage.courseName}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-yellow-400">
                                    -{usage.tokensUsed} {t('tokens')}
                                  </p>
                                  <p className="text-sm text-gray-400">
                                    {toDate(usage.usageDate).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <CreateTokenPackageModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingPackage(null);
        }}
        onSuccess={handleModalSuccess}
        existingPackage={editingPackage || undefined}
      />
    </div>
  );
}
