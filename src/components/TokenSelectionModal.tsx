'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiCheck, FiX, FiClock, FiPackage, FiDollarSign } from 'react-icons/fi';
import { studentTokenPackageService, bookingService } from '@/lib/database';
import { StudentTokenPackage } from '@/types';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';
import { Timestamp } from 'firebase/firestore';

// Helper function to convert Firestore Timestamp to Date
const toDate = (dateOrTimestamp: any): Date => {
  if (dateOrTimestamp instanceof Timestamp) {
    return dateOrTimestamp.toDate();
  }
  return dateOrTimestamp instanceof Date ? dateOrTimestamp : new Date(dateOrTimestamp);
};

interface TokenSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onProceedWithPayment: () => void;
  courseId: string;
  coachId: string;
  courseName: string;
  sessionsRequired: number;
}

export default function TokenSelectionModal({
  isOpen,
  onClose,
  onSuccess,
  onProceedWithPayment,
  courseId,
  coachId,
  courseName,
  sessionsRequired
}: TokenSelectionModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [availablePackages, setAvailablePackages] = useState<StudentTokenPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      loadAvailablePackages();
    }
  }, [isOpen, user, coachId]);

  const loadAvailablePackages = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!user) return;

      // Get all student's token packages for this coach
      const packages = await studentTokenPackageService.getByStudentAndCoach(user.id, coachId);
      
      // Filter packages that have enough tokens and are not expired
      const validPackages = packages.filter(pkg => 
        pkg.remainingTokens >= sessionsRequired &&
        !pkg.isExpired &&
        toDate(pkg.expiryDate) > new Date()
      );

      setAvailablePackages(validPackages);
    } catch (error) {
      console.error('Error loading available packages:', error);
      setError(t('failedToLoadTokenPackages'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseTokens = async () => {
    if (!selectedPackageId || !user) return;

    setIsProcessing(true);
    try {
      await bookingService.createWithTokens(courseId, user.id, selectedPackageId);
      onSuccess();
    } catch (error) {
      console.error('Error using tokens for course:', error);
      setError(t('failedToUseTokensForCourse'));
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gray-900 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold flex items-center">
            <FiPackage className="mr-2 text-[#D91CD2]" />
            {t('useTokenPackage')}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="mb-6">
          <h4 className="font-medium text-white mb-2">{courseName}</h4>
          <p className="text-sm text-gray-400">
            {t('sessionsRequired')}: <span className="text-[#D91CD2] font-bold">{sessionsRequired}</span>
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/20 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-[#D91CD2] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">{t('loadingTokenPackages')}</p>
          </div>
        ) : availablePackages.length === 0 ? (
          <div className="text-center py-8">
            <FiPackage className="mx-auto text-gray-400 mb-4" size={48} />
            <h4 className="text-lg font-medium text-gray-400 mb-2">
              {t('noValidTokenPackages')}
            </h4>
            <p className="text-gray-500 mb-4">
              {t('noTokenPackagesForThisCoach')}
            </p>
            <div className="space-y-3">
              <button
                onClick={onProceedWithPayment}
                className="w-full bg-[#D91CD2] text-white py-3 rounded-lg hover:bg-[#B91AD0] transition-colors"
              >
                {t('proceedWithRegularPayment')}
              </button>
              <button
                onClick={onClose}
                className="w-full bg-gray-700 text-white py-3 rounded-lg hover:bg-gray-600 transition-colors"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm mb-4">
              {t('selectTokenPackageToUse')}
            </p>

            {/* Available Packages */}
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {availablePackages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedPackageId(pkg.id)}
                  className={`w-full p-4 border rounded-lg transition-all text-left ${
                    selectedPackageId === pkg.id
                      ? 'border-[#D91CD2] bg-[#D91CD2]/10'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium text-white mb-1">{pkg.packageName}</h5>
                      <div className="flex items-center space-x-4 text-sm text-gray-400 mb-2">
                        <span className="flex items-center">
                          <FiPackage className="mr-1" />
                          {pkg.remainingTokens} {t('tokensLeft')}
                        </span>
                        <span className="flex items-center">
                          <FiClock className="mr-1" />
                          {t('expires')}: {toDate(pkg.expiryDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {t('purchasePrice')}: ${pkg.purchasePrice.toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center">
                      {selectedPackageId === pkg.id && (
                        <FiCheck className="text-[#D91CD2]" size={20} />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              <button
                onClick={handleUseTokens}
                disabled={!selectedPackageId || isProcessing}
                className="w-full bg-[#D91CD2] text-white py-3 rounded-lg hover:bg-[#B91AD0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <FiCheck className="mr-2" />
                    {t('useSelectedPackage')}
                  </>
                )}
              </button>

              <button
                onClick={onProceedWithPayment}
                className="w-full bg-gray-700 text-white py-3 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center"
              >
                <FiDollarSign className="mr-2" />
                {t('payWithCreditsOrCard')}
              </button>

              <button
                onClick={onClose}
                className="w-full bg-transparent border border-gray-600 text-gray-400 py-3 rounded-lg hover:text-white hover:border-gray-500 transition-colors"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
