'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiCreditCard, FiPlus, FiDollarSign, FiTrendingUp } from 'react-icons/fi';
import { useAuth } from '@/lib/auth';
import StripePaymentModal from './StripePaymentModal';
import PurchaseConfirmationModal from './PurchaseConfirmationModal';
import { transactionService } from '@/lib/database';
import { usePurchaseConfirmation } from '@/hooks/usePurchaseConfirmation';
import { useTranslation } from 'react-i18next';

const topupAmounts = [5, 10, 25, 50, 100];

export default function CreditSystem() {
  const { t } = useTranslation();
  const { user, updateUserProfile } = useAuth();
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(0);
  const [customAmount, setCustomAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    isConfirmationOpen,
    purchaseItem,
    paymentMethod: confirmationPaymentMethod,
    showConfirmation,
    hideConfirmation,
    confirmPurchase,
    isProcessing: isConfirmationProcessing,
    setIsProcessing: setConfirmationProcessing,
  } = usePurchaseConfirmation();

  if (!user) return null;

  const handleTopup = (amount: number) => {
    const purchaseItem = {
      id: 'credit-topup',
      name: t('creditTopup'),
      description: t('addCreditsToAccount'),
      price: amount,
      quantity: 1,
      type: 'credits' as const,
    };

    showConfirmation(purchaseItem, 'stripe', () => {
      setSelectedAmount(amount);
      setShowStripeModal(true);
    });
  };

  const handleCustomTopup = () => {
    const amount = parseFloat(customAmount);
    if (amount >= 1) {
      const purchaseItem = {
        id: 'custom-credit-topup',
        name: t('creditTopup'),
        description: t('addCreditsToAccount'),
        price: amount,
        quantity: 1,
        type: 'credits' as const,
      };

      showConfirmation(purchaseItem, 'stripe', () => {
        setSelectedAmount(amount);
        setShowStripeModal(true);
      });
    }
  };

  const handleStripeSuccess = async (paymentIntentId: string) => {
    try {
      setConfirmationProcessing(true);
      
      // Add credits to user account
      const newCredits = user.credits + selectedAmount;
      await updateUserProfile({ credits: newCredits });
      
      // Record transaction
      await transactionService.create({
        userId: user.id,
        type: 'topup',
        amount: selectedAmount,
        description: `Credit top-up via Stripe (${paymentIntentId})`,
        status: 'completed'
      });
      
      setCustomAmount('');
      setShowStripeModal(false);
      hideConfirmation();
    } catch (error) {
      console.error('Error processing successful payment:', error);
      setConfirmationProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Balance */}
      <div className="card text-center">
        <div className="w-20 h-20 bg-gradient-to-r from-[#D91CD2] to-[#7000FF] rounded-full flex items-center justify-center mx-auto mb-4">
          <FiDollarSign size={40} className="text-white" />
        </div>
        <h2 className="text-3xl font-bold gradient-text mb-2">
          ${user.credits.toFixed(2)}
        </h2>
        <p className="text-gray-400">{t('availableCredits')}</p>
      </div>

      {/* Quick Top-up */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-6 flex items-center">
          <FiPlus className="mr-2 text-[#D91CD2]" />
          {t('quickTopup')}
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {topupAmounts.map((amount) => (
            <motion.button
              key={amount}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleTopup(amount)}
              className="p-4 border border-[#D91CD2]/30 rounded-lg hover:border-[#D91CD2] hover:bg-[#D91CD2]/10 transition-all text-center"
            >
              <div className="text-xl font-bold">${amount}</div>
            </motion.button>
          ))}
        </div>

        {/* Custom Amount */}
        <div className="border-t border-[#D91CD2]/20 pt-6">
          <h4 className="font-medium mb-4">{t('customAmount')}</h4>
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                <FiDollarSign className="text-gray-400" />
              </div>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder={t('enterAmount')}
                min="1"
                step="0.01"
                className="input-primary w-full pl-10"
              />
            </div>
            <button
              onClick={handleCustomTopup}
              disabled={!customAmount || parseFloat(customAmount) < 1}
              className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('topUp')}
            </button>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-6 flex items-center">
          <FiTrendingUp className="mr-2 text-[#D91CD2]" />
          {t('whyUseCredits')}
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <FiDollarSign size={16} className="text-green-400" />
            </div>
            <div>
              <h4 className="font-medium">{t('instantBooking')}</h4>
              <p className="text-gray-400 text-sm">{t('instantBookingDesc')}</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <FiCreditCard size={16} className="text-blue-400" />
            </div>
            <div>
              <h4 className="font-medium">{t('secureConvenient')}</h4>
              <p className="text-gray-400 text-sm">{t('secureConvenientDesc')}</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <FiPlus size={16} className="text-purple-400" />
            </div>
            <div>
              <h4 className="font-medium">{t('referralBonuses')}</h4>
              <p className="text-gray-400 text-sm">{t('referralBonusesDesc')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stripe Payment Modal */}
      <StripePaymentModal
        isOpen={showStripeModal}
        onClose={() => setShowStripeModal(false)}
        onSuccess={handleStripeSuccess}
        amount={selectedAmount}
        title={t('addCredits')}
        description={t('topUpAccountWithCredits')}
        userId={user.id}
      />

      {/* Purchase Confirmation Modal */}
      {isConfirmationOpen && purchaseItem && confirmationPaymentMethod && (
        <PurchaseConfirmationModal
          isOpen={isConfirmationOpen}
          onClose={hideConfirmation}
          onConfirm={confirmPurchase}
          item={purchaseItem}
          paymentMethod={confirmationPaymentMethod}
          userCredits={user?.credits || 0}
          isLoading={isConfirmationProcessing}
          title={t('confirmCreditPurchase')}
        />
      )}
    </div>
  );
}
