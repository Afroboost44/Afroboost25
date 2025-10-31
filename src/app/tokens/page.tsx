'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiClock, FiUser, FiDollarSign, FiPackage, FiCheck, FiX } from 'react-icons/fi';
import Card from '@/components/Card';
import { useAuth } from '@/lib/auth';
import { tokenPackageService, studentTokenPackageService, tokenTransactionService, earningTransactionService } from '@/lib/database';
import { TokenPackage, StudentTokenPackage } from '@/types';
import { useTranslation } from 'react-i18next';
import PaymentHandlerWithCredits from '@/components/PaymentHandlerWithCredits';
import { Timestamp } from 'firebase/firestore';

// Helper function to convert Firestore Timestamp to Date
const toDate = (dateOrTimestamp: any): Date => {
  if (dateOrTimestamp instanceof Timestamp) {
    return dateOrTimestamp.toDate();
  }
  return dateOrTimestamp instanceof Date ? dateOrTimestamp : new Date(dateOrTimestamp);
};

export default function TokensPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tokenPackages, setTokenPackages] = useState<TokenPackage[]>([]);
  const [myTokenPackages, setMyTokenPackages] = useState<StudentTokenPackage[]>([]);
  const [filteredPackages, setFilteredPackages] = useState<TokenPackage[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<TokenPackage | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    loadTokenPackages();
    if (user) {
      loadMyTokenPackages();
    }
  }, [user]);

  useEffect(() => {
    filterPackages();
  }, [searchTerm, tokenPackages]);

  const loadTokenPackages = async () => {
    try {
      setIsLoading(true);
      const packages = await tokenPackageService.getActivePackages();
      setTokenPackages(packages);
    } catch (error) {
      console.error('Error loading token packages:', error);
      setError(t('failedToLoadTokenPackages'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadMyTokenPackages = async () => {
    try {
      if (!user) return;
      const packages = await studentTokenPackageService.getByStudentId(user.id);
      setMyTokenPackages(packages);
    } catch (error) {
      console.error('Error loading my token packages:', error);
    }
  };

  const filterPackages = () => {
    if (!searchTerm.trim()) {
      setFilteredPackages(tokenPackages);
      return;
    }

    const filtered = tokenPackages.filter(pkg => 
      pkg.coachName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.packageName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredPackages(filtered);
  };

  const handlePurchasePackage = (tokenPackage: TokenPackage) => {
    setSelectedPackage(tokenPackage);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async (paymentId: string, method: 'stripe' | 'paypal' | 'twint' | 'credits' | 'gift-card' | 'discount-card') => {
    try {
      if (!selectedPackage || !user) return;

      // Check if user already has this package
      const existingPackageId = await studentTokenPackageService.addTokens(
        user.id,
        selectedPackage.id,
        selectedPackage.totalTokens
      );

      if (existingPackageId) {
        // Tokens added to existing package
        setSuccess(t('tokensAddedToExistingPackage'));
      } else {
        // Create new student token package
        await studentTokenPackageService.create({
          studentId: user.id,
          studentName: `${user.firstName} ${user.lastName}`,
          packageId: selectedPackage.id,
          coachId: selectedPackage.coachId,
          coachName: selectedPackage.coachName,
          packageName: selectedPackage.packageName,
          totalTokens: selectedPackage.totalTokens,
          remainingTokens: selectedPackage.totalTokens,
          purchasePrice: selectedPackage.price,
          expiryDate: selectedPackage.expiryDate,
          isExpired: false,
          purchaseDate: Timestamp.now(),
          lastUsedDate: undefined
        });
        setSuccess(t('tokenPackagePurchasedSuccessfully'));
      }

      // Create transaction record
      await tokenTransactionService.createFromPurchase(
        user.id,
        selectedPackage.coachId,
        selectedPackage.id,
        existingPackageId || 'new',
        selectedPackage.price,
        selectedPackage.totalTokens,
        paymentId,
        method
      );

      // Create coach earnings with commission cut (similar to course purchases)
      await earningTransactionService.createFromTokenPackagePurchase(
        selectedPackage.coachId,
        user.id,
        `${user.firstName} ${user.lastName}`,
        selectedPackage.id,
        selectedPackage.packageName,
        selectedPackage.price,
        method
      );

      setShowPaymentModal(false);
      setSelectedPackage(null);
      await loadMyTokenPackages();
      
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Error processing token package purchase:', error);
      setError(t('failedToPurchaseTokenPackage'));
    }
  };

  const isPackageExpired = (expiryDate: any) => {
    const expiry = toDate(expiryDate);
    return expiry < new Date();
  };

  const hasPackage = (packageId: string) => {
    return myTokenPackages.some(pkg => 
      pkg.packageId === packageId && 
      !pkg.isExpired && 
      pkg.remainingTokens > 0
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-[#D91CD2] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">{t('loadingTokenPackages')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 mt-16">
          <h1 className="text-4xl font-bold gradient-text mb-4">{t('tokenPackages')}</h1>
          <p className="text-gray-400 text-lg">
            {t('tokenPackagesDescription')}
          </p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-500/20 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <FiCheck className="text-green-400" />
              <p className="text-green-400">{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <FiX className="text-red-400" />
              <p className="text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <Card className='mb-10'>
          <div className="relative ">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('searchByCoachNameOrPackage')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-[#D91CD2] text-white"
            />
          </div>
        </Card>

        {/* Token Packages Grid */}
        {filteredPackages.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <FiPackage className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-xl font-medium text-gray-400 mb-2">
                {searchTerm ? t('noPackagesFound') : t('noTokenPackagesAvailable')}
              </h3>
              <p className="text-gray-500">
                {searchTerm ? t('tryDifferentSearchTerm') : t('checkBackLaterForPackages')}
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPackages.map((tokenPackage) => (
              <motion.div
                key={tokenPackage.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-[#D91CD2]/50 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      {tokenPackage.packageName}
                    </h3>
                    <div className="flex items-center text-gray-400 text-sm mb-2">
                      <FiUser className="mr-1" />
                      {t('coach')}: {tokenPackage.coachName}
                    </div>
                  </div>
                  {hasPackage(tokenPackage.id) && (
                    <div className="bg-green-500/20 border border-green-500/30 rounded-full p-2">
                      <FiCheck className="text-green-400" size={16} />
                    </div>
                  )}
                </div>

                {tokenPackage.description && (
                    <div className="text-gray-400 text-sm mb-4">
                      {tokenPackage.description
                      .split('\n')
                      .map((line, idx) => {
                        const trimmed = line.trim();
                        if (trimmed.startsWith('-')) {
                        return (
                          <ul key={idx} className="list-disc pl-5">
                          <li>{trimmed.slice(1).trim()}</li>
                          </ul>
                        );
                        }
                        return <div key={idx}>{trimmed}</div>;
                      })}
                    </div>
                )}

                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">{t('tokens')}</span>
                    <span className="font-bold text-[#D91CD2]">{tokenPackage.totalTokens}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">{t('price')}</span>
                    <span className="font-bold text-white">CHF {tokenPackage.price.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">{t('expiresOn')}</span>
                    <span className="text-white">
                      {toDate(tokenPackage.expiryDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <div className="flex items-center">
                    <FiClock className="mr-1" />
                    {isPackageExpired(tokenPackage.expiryDate) ? (
                      <span className="text-red-400">{t('expired')}</span>
                    ) : (
                      <span className="text-green-400">{t('active')}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-gray-400">
                      CHF {(tokenPackage.price / tokenPackage.totalTokens).toFixed(2)} {t('perToken')}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handlePurchasePackage(tokenPackage)}
                  disabled={isPackageExpired(tokenPackage.expiryDate) || !user}
                  className={`w-full py-3 rounded-lg font-medium transition-all ${
                    isPackageExpired(tokenPackage.expiryDate) || !user
                      ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                      : hasPackage(tokenPackage.id)
                      ? 'bg-[#D91CD2]/20 border border-[#D91CD2] text-[#D91CD2] hover:bg-[#D91CD2]/30'
                      : 'bg-[#D91CD2] text-white hover:bg-[#B91AD0]'
                  }`}
                >
                  {!user 
                    ? t('loginToPurchase')
                    : isPackageExpired(tokenPackage.expiryDate)
                    ? t('expired')
                    : hasPackage(tokenPackage.id)
                    ? t('addMoreTokens')
                    : t('purchasePackage')
                  }
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && selectedPackage && (
          <PaymentHandlerWithCredits
            isOpen={showPaymentModal}
            onClose={() => {
              setShowPaymentModal(false);
              setSelectedPackage(null);
            }}
            onSuccess={handlePaymentSuccess}
            amount={selectedPackage.price}
            title={selectedPackage.packageName}
            description={`${selectedPackage.totalTokens} tokens by ${selectedPackage.coachName}`}
            userId={user?.id || ''}
            businessId={selectedPackage.coachId}
            coachId={selectedPackage.coachId}
            tokenPackageId={selectedPackage.id}
            transactionType="token"
          />
        )}
      </div>
    </div>
  );
}
