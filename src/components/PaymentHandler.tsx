'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiCreditCard, FiDollarSign, FiX } from 'react-icons/fi';
import StripePaymentModal from './StripePaymentModal';
import PaypalPaymentModal from './PaypalPaymentModal';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface PaymentHandlerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentId: string, method: 'stripe' | 'paypal') => void;
  amount: number;
  title: string;
  description: string;
  userId: string;
}

interface PaymentMethod {
  id: 'stripe' | 'paypal';
  name: string;
  icon: React.ReactNode;
  isEnabled: boolean;
}

export default function PaymentHandler(props: PaymentHandlerProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    { id: 'stripe', name: 'Credit/Debit Card', icon: <FiCreditCard size={24} />, isEnabled: false },
    { id: 'paypal', name: 'PayPal', icon: <FiDollarSign size={24} />, isEnabled: false }
  ]);
  const [selectedMethod, setSelectedMethod] = useState<'stripe' | 'paypal' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMethodSelection, setShowMethodSelection] = useState(false);

  useEffect(() => {
    if (props.isOpen) {
      loadPaymentSettings();
    }
  }, [props.isOpen]);

  const loadPaymentSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [stripeDoc, paypalDoc] = await Promise.all([
        getDoc(doc(db, 'admin_settings', 'stripe')),
        getDoc(doc(db, 'admin_settings', 'paypal'))
      ]);
      
      const stripeEnabled = stripeDoc.exists() && stripeDoc.data().isConfigured && stripeDoc.data().isEnabled;
      const paypalEnabled = paypalDoc.exists() && paypalDoc.data().isConfigured && paypalDoc.data().isEnabled;
      
      setPaymentMethods(prev => prev.map(method => {
        if (method.id === 'stripe') {
          return { ...method, isEnabled: stripeEnabled };
        } else if (method.id === 'paypal') {
          return { ...method, isEnabled: paypalEnabled };
        }
        return method;
      }));
      
      const availableMethods = [
        { id: 'stripe' as const, enabled: stripeEnabled },
        { id: 'paypal' as const, enabled: paypalEnabled }
      ].filter(m => m.enabled);
      
      if (availableMethods.length === 0) {
        setError('No payment methods are currently available. Please try again later.');
      } else if (availableMethods.length === 1) {
        // Only one method available, use it directly
        setSelectedMethod(availableMethods[0].id);
        setShowMethodSelection(false);
      } else {
        // Multiple methods available, show selection
        setShowMethodSelection(true);
        setSelectedMethod(null);
      }
      
    } catch (error) {
      console.error('Error loading payment settings:', error);
      setError('Failed to load payment options. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = (paymentId: string) => {
    if (selectedMethod) {
      props.onSuccess(paymentId, selectedMethod);
    }
  };

  const handleMethodSelection = (methodId: 'stripe' | 'paypal') => {
    setSelectedMethod(methodId);
    setShowMethodSelection(false);
  };

  const handleBackToSelection = () => {
    setSelectedMethod(null);
    setShowMethodSelection(true);
  };

  if (!props.isOpen) return null;

  return (
    <>
      {/* Method Selection Modal */}
      {(showMethodSelection || (isLoading && !selectedMethod)) && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-black border border-[#D91CD2]/20 rounded-lg p-6 w-full max-w-md"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold gradient-text">{props.title}</h2>
              <p className="text-gray-400 mt-2">{props.description}</p>
              <div className="text-3xl font-bold text-white mt-4">${props.amount.toFixed(2)}</div>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-[#D91CD2] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400">Loading payment options...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <FiX className="text-red-400" />
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                </div>
                <button onClick={props.onClose} className="btn-secondary">Close</button>
              </div>
            ) : (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-center">Select Payment Method</h3>
                
                <div className="space-y-3">
                  {paymentMethods.filter(method => method.isEnabled).map(method => (
                    <button
                      key={method.id}
                      onClick={() => handleMethodSelection(method.id)}
                      className="w-full p-4 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-between transition-colors border border-gray-700 hover:border-[#D91CD2]/50"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-[#D91CD2]">{method.icon}</div>
                        <span className="font-medium">{method.name}</span>
                      </div>
                      <div className="w-4 h-4 rounded-full border-2 border-gray-500"></div>
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={props.onClose}
                  className="btn-secondary w-full"
                >
                  Cancel
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Stripe Payment Modal */}
      {selectedMethod === 'stripe' && (
        <StripePaymentModal
          isOpen={true}
          onClose={paymentMethods.filter(m => m.isEnabled).length > 1 ? handleBackToSelection : props.onClose}
          onSuccess={handlePaymentSuccess}
          amount={props.amount}
          title={props.title}
          description={props.description}
          userId={props.userId}
        />
      )}

      {/* PayPal Payment Modal */}
      {selectedMethod === 'paypal' && (
        <PaypalPaymentModal
          isOpen={true}
          onClose={paymentMethods.filter(m => m.isEnabled).length > 1 ? handleBackToSelection : props.onClose}
          onSuccess={handlePaymentSuccess}
          amount={props.amount}
          title={props.title}
          description={props.description}
          userId={props.userId}
        />
      )}
    </>
  );
}