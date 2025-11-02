'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiLock, FiX } from 'react-icons/fi';
import { 
  PayPalButtons, 
  PayPalScriptProvider 
} from '@paypal/react-paypal-js';
import { useTranslation } from 'react-i18next'; // Import useTranslation

interface PaypalPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentId: string) => void;
  amount: number;
  title: string;
  description: string;
  userId: string;
}

interface PayPalOrderData {
  orderID: string;
}

export default function PaypalPaymentModal(props: PaypalPaymentModalProps) {
  const { t } = useTranslation(); // Initialize useTranslation
  const [clientId, setClientId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  useEffect(() => {
    if (props.isOpen) {
      loadPaypalConfig();
    }
  }, [props.isOpen]);

  const loadPaypalConfig = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/paypal/config');
      const config = await response.json();
      
      if (config.isConfigured && config.clientId) {
        setClientId(config.clientId);
      } else {
        throw new Error(t('paypalNotConfigured'));
      }
    } catch (error) {
      console.error('Error loading PayPal:', error);
      setError(t('failedToLoadPaypal'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!props.isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-black border border-[#D91CD2]/20 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold gradient-text">{props.title}</h2>
          <p className="text-gray-400 mt-2">{props.description}</p>
          <div className="text-3xl font-bold text-white mt-4">{props.amount.toFixed(2)} CHF</div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-[#D91CD2] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">{t('loadingPaymentSystem')}</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 flex items-center space-x-2 mb-6">
            <FiX className="text-red-400" />
            <p className="text-red-400 text-sm">{error}</p>
            {debugInfo && (
              <div className="mt-2 p-2 bg-gray-900 rounded text-xs text-gray-400 overflow-auto">
                <pre>{debugInfo}</pre>
              </div>
            )}
          </div>
        ) : clientId ? (
          <div className="space-y-6">
            <PayPalScriptProvider options={{ 
              clientId: clientId,
              currency: "CHF",
              intent: "capture"
            }}>
              <PayPalButtons
                style={{ 
                  layout: "vertical",
                  color: "blue",
                  shape: "rect",
                  label: "pay"
                }}
                createOrder={async () => {
                  try {
                    setError(null);
                    setDebugInfo(null);
                    
                    const response = await fetch('/api/paypal/create-order', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        amount: props.amount,
                        description: props.description,
                        userId: props.userId,
                        currency: 'CHF'
                      }),
                    });
                    
                    const orderData = await response.json();
                    
                    if (orderData.error) {
                      throw new Error(orderData.error);
                    }
                    
                    if (!orderData.id) {
                      // Log the response for debugging
                      const debugStr = JSON.stringify(orderData, null, 2);
                      setDebugInfo(debugStr);
                      throw new Error(t('invalidOrderResponse'));
                    }
                    
                    return orderData.id;
                  } catch (err: any) {
                    console.error('PayPal create order error:', err);
                    setError(err.message || t('failedToCreateOrder'));
                    throw err;
                  }
                }}
                onApprove={async (data: PayPalOrderData) => {
                  try {
                    setError(null);
                    
                    const response = await fetch('/api/paypal/capture-order', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        orderId: data.orderID,
                        userId: props.userId
                      }),
                    });
                    
                    const orderData = await response.json();
                    
                    if (orderData.error) {
                      throw new Error(orderData.error);
                    }
                    
                    // Call the onSuccess callback with the payment ID
                    props.onSuccess(data.orderID);
                  } catch (err: any) {
                    console.error('PayPal capture error:', err);
                    setError(err.message || t('paymentFailed'));
                  }
                }}
                onError={(err) => {
                  console.error('PayPal Error:', err);
                  setError(t('paymentFailedTryDifferentMethod'));
                }}
              />
            </PayPalScriptProvider>

            <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 flex items-center space-x-2">
              <FiLock className="text-green-400" />
              <p className="text-green-400 text-xs">
                {t('paymentInfoSecurePaypal')}
              </p>
            </div>

            <button
              type="button"
              onClick={props.onClose}
              className="btn-secondary w-full"
            >
              {t('cancel')}
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-red-400">{t('paypalNotConfiguredTryDifferent')}</p>
            <button
              onClick={props.onClose}
              className="btn-secondary mt-4"
            >
              {t('close')}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}