'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiShoppingCart, FiCreditCard, FiDollarSign, FiX, FiCheck, FiAlertTriangle } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

interface PurchaseItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity?: number;
  type: 'course' | 'token_package' | 'credits' | 'subscription' | 'boost';
  image?: string;
}

interface PurchaseConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  item: PurchaseItem;
  paymentMethod: 'stripe' | 'paypal' | 'twint' | 'credits' | 'gift-card';
  userCredits?: number;
  isLoading?: boolean;
  title?: string;
}

export default function PurchaseConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  item,
  paymentMethod,
  userCredits = 0,
  isLoading = false,
  title
}: PurchaseConfirmationModalProps) {
  const { t } = useTranslation();

  const getPaymentMethodIcon = () => {
    switch (paymentMethod) {
      case 'stripe':
        return <FiCreditCard className="text-blue-500" size={20} />;
      case 'paypal':
        return <FiDollarSign className="text-yellow-500" size={20} />;
      case 'twint':
        return <FiCreditCard className="text-orange-500" size={20} />;
      case 'credits':
        return <FiDollarSign className="text-green-500" size={20} />;
      default:
        return <FiCreditCard className="text-gray-500" size={20} />;
    }
  };

  const getPaymentMethodName = () => {
    switch (paymentMethod) {
      case 'stripe':
        return t('creditDebitCard');
      case 'paypal':
        return t('paypal');
      case 'twint':
        return 'TWINT';
      case 'credits':
        return t('credits');
      default:
        return t('card');
    }
  };

  const getItemTypeIcon = () => {
    switch (item.type) {
      case 'course':
        return '🎯';
      case 'token_package':
        return '🎟️';
      case 'credits':
        return '💰';
      case 'subscription':
        return '⭐';
      case 'boost':
        return '🚀';
      default:
        return '🛒';
    }
  };

  const getItemTypeName = () => {
    switch (item.type) {
      case 'course':
        return t('course');
      case 'token_package':
        return t('tokenPackage');
      case 'credits':
        return t('credits');
      case 'subscription':
        return t('subscription');
      case 'boost':
        return t('boost');
      default:
        return t('item');
    }
  };

  const totalPrice = item.price * (item.quantity || 1);
  const remainingCredits = userCredits - totalPrice;
  const canAffordWithCredits = paymentMethod === 'credits' && userCredits >= totalPrice;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-gray-700"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-[#D91CD2] to-[#7000FF] rounded-full flex items-center justify-center">
                  <FiShoppingCart className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {title || t('confirmPurchaseTitle')}
                  </h3>
                  <p className="text-sm text-gray-400">{t('reviewPurchaseDetails')}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
                disabled={isLoading}
              >
                <FiX size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Item Details */}
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-start space-x-4">
                  <div className="text-3xl">{getItemTypeIcon()}</div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-1">{item.name}</h4>
                    <p className="text-sm text-gray-400 mb-2">{getItemTypeName()}</p>
                    {item.description && (
                      <p className="text-sm text-gray-300 mb-3">{item.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-bold text-[#D91CD2]">
                        ${totalPrice.toFixed(2)}
                        {item.quantity && item.quantity > 1 && (
                          <span className="text-sm text-gray-400 ml-2">
                            (${item.price.toFixed(2)} × {item.quantity})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h5 className="font-medium text-white mb-3">{t('paymentMethod')}</h5>
                <div className="flex items-center space-x-3">
                  {getPaymentMethodIcon()}
                  <span className="text-gray-300">{getPaymentMethodName()}</span>
                </div>

                {/* Credits Warning */}
                {paymentMethod === 'credits' && !canAffordWithCredits && (
                  <div className="mt-3 p-3 bg-red-900/20 border border-red-600/30 rounded-lg">
                    <div className="flex items-center space-x-2 text-red-400">
                      <FiAlertTriangle size={16} />
                      <span className="text-sm font-medium">{t('insufficientCredits')}</span>
                    </div>
                    <p className="text-xs text-red-300 mt-1">
                      {t('needMoreCredits', { 
                        needed: (totalPrice - userCredits).toFixed(2),
                        current: userCredits.toFixed(2)
                      })}
                    </p>
                  </div>
                )}

                {/* Credits Balance Info */}
                {paymentMethod === 'credits' && canAffordWithCredits && (
                  <div className="mt-3 p-3 bg-green-900/20 border border-green-600/30 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">{t('currentCredits')}</span>
                      <span className="text-green-400">${userCredits.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-gray-300">{t('afterPurchase')}</span>
                      <span className="text-white font-medium">${remainingCredits.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Security Notice */}
              <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-3">
                <div className="flex items-center space-x-2 text-blue-400">
                  <FiCheck size={16} />
                  <span className="text-sm font-medium">{t('securePayment')}</span>
                </div>
                <p className="text-xs text-blue-300 mt-1">
                  {paymentMethod === 'credits' 
                    ? t('secureCreditsTransaction')
                    : t('secureCardTransaction')
                  }
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 p-6 border-t border-gray-700">
              <button
                onClick={onClose}
                className="btn-secondary flex-1"
                disabled={isLoading}
              >
                {t('cancel')}
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${
                  (paymentMethod === 'credits' && !canAffordWithCredits) || isLoading
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#D91CD2] to-[#7000FF] text-white hover:from-[#B91AD0] hover:to-[#5F00CC]'
                }`}
                disabled={(paymentMethod === 'credits' && !canAffordWithCredits) || isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{t('processing')}</span>
                  </>
                ) : (
                  <>
                    <FiCheck size={16} />
                    <span>{t('confirmPurchase')}</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
