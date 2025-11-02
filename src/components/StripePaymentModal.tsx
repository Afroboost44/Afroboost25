'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiCreditCard, FiLock, FiCheck, FiX } from 'react-icons/fi';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { useTranslation } from 'react-i18next'; // Import useTranslation

interface StripePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentIntentId: string) => void;
  amount: number;
  title: string;
  description: string;
  userId: string;
}

let stripePromise: Promise<Stripe | null> | null = null;

const getStripe = async () => {
  if (!stripePromise) {
    try {
      const response = await fetch('/api/stripe/config');
      const config = await response.json();
      
      if (config.isConfigured && config.publishableKey) {
        stripePromise = loadStripe(config.publishableKey);
      } else {
        throw new Error('Stripe not configured');
      }
    } catch (error) {
      console.error('Error loading Stripe:', error);
      return null;
    }
  }
  return stripePromise;
};

const PaymentForm = ({ 
  amount, 
  description, 
  userId, 
  onSuccess, 
  onClose 
}: {
  amount: number;
  description: string;
  userId: string;
  onSuccess: (paymentIntentId: string) => void;
  onClose: () => void;
}) => {
  const { t } = useTranslation(); // Initialize useTranslation
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Create payment intent
      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency: 'CHF',
          description,
          userId
        }),
      });

      const { clientSecret, paymentIntentId, error: apiError } = await response.json();

      if (apiError) {
        throw new Error(apiError);
      }

      // Confirm payment
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess(paymentIntentId);
      }

    } catch (err: any) {
      setError(err.message || t('paymentFailed'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          {t('cardInformation')}
        </label>
        <div className="p-3 border border-gray-600 rounded-lg bg-gray-800">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#ffffff',
                  '::placeholder': {
                    color: '#9CA3AF',
                  },
                },
              },
            }}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 flex items-center space-x-2">
          <FiX className="text-red-400" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 flex items-center space-x-2">
        <FiLock className="text-green-400" />
        <p className="text-green-400 text-xs">
          {t('paymentInfoSecureStripe')}
        </p>
      </div>

      <div className="flex space-x-4">
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
          disabled={!stripe || isProcessing}
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
  );
};

export default function StripePaymentModal(props: StripePaymentModalProps) {
  const { t } = useTranslation(); // Initialize useTranslation
  const [stripe, setStripe] = useState<Stripe | null>(null);

  useEffect(() => {
    if (props.isOpen) {
      getStripe().then(setStripe);
    }
  }, [props.isOpen]);

  if (!props.isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-black border border-[#D91CD2]/20 rounded-lg p-6 w-full max-w-md"
      >
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold gradient-text">{props.title}</h2>
          <p className="text-gray-400 mt-2">{props.description}</p>
          <div className="text-3xl font-bold text-white mt-4">{props.amount.toFixed(2)} CHF</div>
        </div>

        {stripe ? (
          <Elements stripe={stripe}>
            <PaymentForm
              amount={props.amount}
              description={props.description}
              userId={props.userId}
              onSuccess={props.onSuccess}
              onClose={props.onClose}
            />
          </Elements>
        ) : (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-[#D91CD2] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">{t('loadingPaymentSystem')}</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
