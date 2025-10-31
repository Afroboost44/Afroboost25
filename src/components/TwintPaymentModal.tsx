'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiCreditCard, FiSmartphone, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

interface TwintPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (sessionId: string) => void;
  amount: number;
  title: string;
  description: string;
  userId: string;
  // Purchase context for processing success actions
  purchaseContext?: {
    type: 'course' | 'product' | 'token';
    courseId?: string;
    productId?: string;
    tokenPackageId?: string;
    businessId?: string;
    coachId?: string;
    referralCode?: string;
    boostType?: string;
    // For complex purchases like shopping cart (stored in DB)
    checkoutData?: string; // JSON serialized checkout data
  };
}

export default function TwintPaymentModal(props: TwintPaymentModalProps) {
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'twint' | 'card'>('twint');

  useEffect(() => {
    // Reset state when modal opens/closes
    if (props.isOpen) {
      setIsProcessing(false);
      setError(null);
      setPaymentMethod('twint');
    }
  }, [props.isOpen]);

  const handlePayment = async () => {
    if (!props.userId) {
      setError('User ID is required');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Create checkout session with selected payment method
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: props.amount,
          currency: 'CHF',
          description: props.description,
          userId: props.userId,
          paymentMethod: paymentMethod === 'twint' ? 'twint' : 'card',
          purchaseContext: props.purchaseContext
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create payment session');
      }

      if (result.url) {
        // Redirect to Stripe Checkout
        window.location.href = result.url;
      } else {
        throw new Error('No checkout URL received');
      }

    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || t('paymentFailed'));
      setIsProcessing(false);
    }
  };

  if (!props.isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-black border border-[#D91CD2]/20 rounded-lg p-4 sm:p-6 w-full max-w-sm sm:max-w-md my-auto"
      >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-[#D91CD2] to-[#7000FF] rounded-full flex items-center justify-center flex-shrink-0">
          <FiSmartphone className="text-white" size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg sm:text-xl font-bold gradient-text truncate">{props.title}</h2>
          <p className="text-xs sm:text-sm text-gray-400 truncate">{props.description}</p>
        </div>
        </div>
        <button
        onClick={props.onClose}
        className="text-gray-400 hover:text-white transition-colors ml-2 flex-shrink-0"
        disabled={isProcessing}
        >
        <FiX size={20} className="sm:hidden" />
        <FiX size={24} className="hidden sm:block" />
        </button>
      </div>

      {/* Amount Display */}
      <div className="text-center mb-4 sm:mb-6">
        <div className="text-2xl sm:text-3xl font-bold text-white">{props.amount.toFixed(2)} CHF</div>
      </div>

      {/* Payment Method Selection */}
      <div className="mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Choose Payment Method</h3>
        <div className="space-y-2 sm:space-y-3">
        {/* TWINT Option */}
        <button
          onClick={() => setPaymentMethod('twint')}
          disabled={isProcessing}
          className={`w-full p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 ${
          paymentMethod === 'twint'
            ? 'border-orange-500 bg-orange-500/10'
            : 'border-gray-600 bg-gray-800 hover:border-gray-500'
          }`}
        >
          <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs sm:text-sm">📱</span>
            </div>
            <div className="text-left min-w-0 flex-1">
            <div className="font-semibold text-white text-sm sm:text-base">TWINT</div>
            <div className="text-xs sm:text-sm text-gray-400">Swiss mobile payment</div>
            </div>
          </div>
          {paymentMethod === 'twint' && (
            <FiCheck className="text-orange-500 flex-shrink-0 ml-2" size={16} />
          )}
          </div>
        </button>

        {/* Card Option */}
        <button
          onClick={() => setPaymentMethod('card')}
          disabled={isProcessing}
          className={`w-full p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 ${
          paymentMethod === 'card'
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-gray-600 bg-gray-800 hover:border-gray-500'
          }`}
        >
          <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <FiCreditCard className="text-white" size={14} />
            </div>
            <div className="text-left min-w-0 flex-1">
            <div className="font-semibold text-white text-sm sm:text-base">Credit/Debit Card</div>
            <div className="text-xs sm:text-sm text-gray-400">Visa, Mastercard, etc.</div>
            </div>
          </div>
          {paymentMethod === 'card' && (
            <FiCheck className="text-blue-500 flex-shrink-0 ml-2" size={16} />
          )}
          </div>
        </button>
        </div>
      </div>

      {/* TWINT Instructions */}
      {paymentMethod === 'twint' && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-orange-500 text-base sm:text-lg">📱</span>
          <h4 className="font-semibold text-orange-400 text-sm sm:text-base">TWINT Payment Instructions</h4>
        </div>
        <ul className="text-xs sm:text-sm text-gray-300 space-y-1">
          <li>• You'll be redirected to the secure payment page</li>
          <li>• Follow the instructions to complete your TWINT payment</li>
          <li>• You'll return here automatically after payment</li>
        </ul>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-600/30 rounded-lg">
        <div className="flex items-center space-x-2 text-red-400">
          <FiAlertCircle size={14} className="flex-shrink-0" />
          <span className="text-xs sm:text-sm font-medium">Payment Error</span>
        </div>
        <p className="text-xs text-red-300 mt-1 break-words">{error}</p>
        </div>
      )}

      {/* Security Notice */}
      <div className="mb-4 sm:mb-6 p-3 bg-blue-900/20 border border-blue-600/30 rounded-lg">
        <div className="flex items-center space-x-2 text-blue-400">
        <FiCheck size={14} className="flex-shrink-0" />
        <span className="text-xs sm:text-sm font-medium">Secure Payment</span>
        </div>
        <p className="text-xs text-blue-300 mt-1">
        Your payment is processed securely by Stripe. We never store your payment information.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
        <button
        type="button"
        onClick={props.onClose}
        className="btn-secondary flex-1 order-2 sm:order-1"
        disabled={isProcessing}
        >
        {t('cancel')}
        </button>
        <button
        onClick={handlePayment}
        className="btn-primary flex-1 flex items-center justify-center order-1 sm:order-2"
        disabled={isProcessing}
        >
        {isProcessing ? (
          <>
          <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
          <span className="text-sm sm:text-base">{t('processing')}...</span>
          </>
        ) : (
          <>
          {paymentMethod === 'twint' ? (
            <span className="mr-2">📱</span>
          ) : (
            <FiCreditCard className="mr-2" size={16} />
          )}
          <span className="text-sm sm:text-base">Pay {props.amount.toFixed(2)} CHF</span>
          </>
        )}
        </button>
      </div>
      </motion.div>
    </div>
  );
}