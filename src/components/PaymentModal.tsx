'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiCreditCard, FiLock, FiCheck } from 'react-icons/fi';
import { PaymentDetails } from '@/types';
import { useTranslation } from 'react-i18next';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPayment: (details: PaymentDetails) => Promise<boolean>;
  amount: number;
  title: string;
  description: string;
}

export default function PaymentModal({
  isOpen,
  onClose,
  onPayment,
  amount,
  title,
  description
}: PaymentModalProps) {
  const { t } = useTranslation();
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    holderName: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<Partial<PaymentDetails>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const validateForm = () => {
    const newErrors: Partial<PaymentDetails> = {};
    
    if (!paymentDetails.cardNumber || paymentDetails.cardNumber.length < 16) {
      newErrors.cardNumber = t('pleaseEnterValidCardNumber');
    }
    
    if (!paymentDetails.expiryMonth || !paymentDetails.expiryYear) {
      newErrors.expiryMonth = t('pleaseEnterExpiryDate');
    }
    
    if (!paymentDetails.cvv || paymentDetails.cvv.length < 3) {
      newErrors.cvv = t('pleaseEnterValidCvv');
    }
    
    if (!paymentDetails.holderName.trim()) {
      newErrors.holderName = t('pleaseEnterCardholderName');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsProcessing(true);
    
    try {
      const success = await onPayment(paymentDetails);
      if (success) {
        onClose();
        // Reset form
        setPaymentDetails({
          cardNumber: '',
          expiryMonth: '',
          expiryYear: '',
          cvv: '',
          holderName: ''
        });
      }
    } catch (error) {
      console.error('Payment error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayPalPayment = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          description
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        // Show user-friendly error and suggest Stripe
        if (result.helpText) {
          setError(result.helpText);
        } else {
          setError(t('paypalUnavailableUseCard'));
        }
        return;
      }
      
      // Handle PayPal success (e.g., redirect to PayPal)
      window.location.href = result.links.find((link: any) => link.rel === 'approve')?.href;
      
    } catch (error: any) {
      setError(t('paypalFailedTryCard'));
    } finally {
      setIsLoading(false);
    }
  };

  const formatCardNumber = (value: string) => {
    // Remove all non-digit characters
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    // Add spaces every 4 digits
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-black border border-[#D91CD2]/20 rounded-lg p-6 w-full max-w-md"
      >
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold gradient-text">{title}</h2>
          <p className="text-gray-400 mt-2">{description}</p>
          <div className="text-3xl font-bold text-white mt-4">CHF {amount.toFixed(2)}</div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4">
            <p className="text-red-500 text-xs">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Card Number */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              {t('cardNumber')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                <FiCreditCard className="text-gray-400" />
              </div>
              <input
                type="text"
                value={formatCardNumber(paymentDetails.cardNumber)}
                onChange={(e) => {
                  const formatted = formatCardNumber(e.target.value);
                  setPaymentDetails(prev => ({
                    ...prev,
                    cardNumber: formatted.replace(/\s/g, '')
                  }));
                }}
                className="input-primary w-full pl-10"
                placeholder="1234 5678 9012 3456"
                maxLength={19}
              />
            </div>
            {errors.cardNumber && (
              <p className="text-red-500 text-xs mt-1">{errors.cardNumber}</p>
            )}
          </div>

          {/* Expiry and CVV */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                {t('month')}
              </label>
              <select
                value={paymentDetails.expiryMonth}
                onChange={(e) => setPaymentDetails(prev => ({ ...prev, expiryMonth: e.target.value }))}
                className="input-primary w-full"
              >
                <option value="">MM</option>
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                    {String(i + 1).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                {t('year')}
              </label>
              <select
                value={paymentDetails.expiryYear}
                onChange={(e) => setPaymentDetails(prev => ({ ...prev, expiryYear: e.target.value }))}
                className="input-primary w-full"
              >
                <option value="">YY</option>
                {[...Array(10)].map((_, i) => {
                  const year = new Date().getFullYear() + i;
                  return (
                    <option key={year} value={String(year).slice(-2)}>
                      {String(year).slice(-2)}
                    </option>
                  );
                })}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                CVV
              </label>
              <input
                type="text"
                value={paymentDetails.cvv}
                onChange={(e) => setPaymentDetails(prev => ({ ...prev, cvv: e.target.value.replace(/\D/g, '') }))}
                className="input-primary w-full"
                placeholder="123"
                maxLength={4}
              />
            </div>
          </div>
          {errors.expiryMonth && (
            <p className="text-red-500 text-xs">{errors.expiryMonth}</p>
          )}
          {errors.cvv && (
            <p className="text-red-500 text-xs">{errors.cvv}</p>
          )}

          {/* Cardholder Name */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              {t('cardholderName')}
            </label>
            <input
              type="text"
              value={paymentDetails.holderName}
              onChange={(e) => setPaymentDetails(prev => ({ ...prev, holderName: e.target.value }))}
              className="input-primary w-full"
              placeholder="John Doe"
            />
            {errors.holderName && (
              <p className="text-red-500 text-xs mt-1">{errors.holderName}</p>
            )}
          </div>

          {/* Security Notice */}
          <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 flex items-center space-x-2">
            <FiLock className="text-green-400" />
            <p className="text-green-400 text-xs">
              {t('paymentSecurityNotice')}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={isProcessing}
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 flex items-center justify-center"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <FiCheck className="mr-2" />
                  {t('payAmount', { amount: amount.toFixed(2) })}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
