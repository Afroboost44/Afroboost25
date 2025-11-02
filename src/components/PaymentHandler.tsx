'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiCreditCard, FiDollarSign, FiX } from 'react-icons/fi';
import StripePaymentModal from './StripePaymentModal';
import PaypalPaymentModal from './PaypalPaymentModal';
import TwintPaymentModal from './TwintPaymentModal';
import PurchaseConfirmationModal from './PurchaseConfirmationModal';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { usePurchaseConfirmation } from '@/hooks/usePurchaseConfirmation';
import { useTranslation } from 'react-i18next';

interface PaymentHandlerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentId: string, method: 'stripe' | 'paypal' | 'twint') => void;
  amount: number;
  title: string;
  description: string;
  userId: string;
  // Purchase context for TWINT payments
  courseId?: string;
  boostType?: string;
}

interface PaymentMethod {
  id: 'stripe' | 'paypal' | 'twint';
  name: string;
  icon: React.ReactNode;
  isEnabled: boolean;
}

export default function PaymentHandler(props: PaymentHandlerProps) {
  const { t } = useTranslation();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    { id: 'stripe', name: t('creditDebitCard'), icon: <FiCreditCard size={24} />, isEnabled: false },
    { id: 'paypal', name: t('paypal'), icon: <FiDollarSign size={24} />, isEnabled: false },
    { id: 'twint', name: 'TWINT', icon: <span className="text-orange-500 font-bold text-lg">📱</span>, isEnabled: false }
  ]);
  const [selectedMethod, setSelectedMethod] = useState<'stripe' | 'paypal' | 'twint' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMethodSelection, setShowMethodSelection] = useState(false);

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
        } else if (method.id === 'twint') {
          return { ...method, isEnabled: stripeEnabled }; // TWINT requires Stripe
        }
        return method;
      }));
      
      const availableMethods = [
        stripeEnabled && { id: 'stripe' as const },
        paypalEnabled && { id: 'paypal' as const },
        stripeEnabled && { id: 'twint' as const }, // Add TWINT if Stripe is enabled
      ].filter(Boolean);
      
      if (availableMethods.length === 0) {
        setError(t('noPaymentMethodsAvailable'));
      } else if (availableMethods.length === 1) {
        // Only one method available, show confirmation before proceeding
        const singleMethod = availableMethods[0].id;
        const purchaseItem = {
          id: 'payment-item',
          name: props.title,
          description: props.description,
          price: props.amount,
          quantity: 1,
          type: 'course' as const,
        };
        
        showConfirmation(purchaseItem, singleMethod, () => {
          setSelectedMethod(singleMethod);
          setShowMethodSelection(false);
          hideConfirmation();
        });
      } else {
        // Multiple methods available, show selection
        setShowMethodSelection(true);
        setSelectedMethod(null);
      }
      
    } catch (error) {
      console.error('Error loading payment settings:', error);
      setError(t('failedToLoadPaymentOptions'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = (paymentId: string) => {
    if (selectedMethod) {
      // Clear all states
      hideConfirmation();
      setSelectedMethod(null);
      setShowMethodSelection(false);
      // Call the parent success handler
      props.onSuccess(paymentId, selectedMethod);
    }
  };

  const handleMethodSelection = (methodId: 'stripe' | 'paypal' | 'twint') => {
    // Create purchase item for confirmation
    const purchaseItem = {
      id: 'payment-item',
      name: props.title,
      description: props.description,
      price: props.amount,
      quantity: 1,
      type: 'course' as const, // Default to course, can be customized based on props
    };

    // Show confirmation dialog
    showConfirmation(purchaseItem, methodId, () => {
      // This callback will be executed when user confirms the purchase
      setSelectedMethod(methodId);
      setShowMethodSelection(false);
      // Hide confirmation modal to show payment gateway
      hideConfirmation();
    });
  };

  const handleBackToSelection = () => {
    setSelectedMethod(null);
    setShowMethodSelection(true);
    hideConfirmation(); // Also hide confirmation if going back
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
              <div className="text-3xl font-bold text-white mt-4">CHF {props.amount.toFixed(2)}</div>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-[#D91CD2] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400">{t('loadingPaymentOptions')}</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <FiX className="text-red-400" />
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                </div>
                <button onClick={props.onClose} className="btn-secondary">{t('close')}</button>
              </div>
            ) : (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-center">{t('selectPaymentMethod')}</h3>
                
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
                  {t('cancel')}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Stripe Payment Modal */}
      {selectedMethod === 'stripe' && !isConfirmationOpen && (
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
      {selectedMethod === 'paypal' && !isConfirmationOpen && (
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

      {/* TWINT Payment Modal */}
      {selectedMethod === 'twint' && !isConfirmationOpen && (
        <TwintPaymentModal
          isOpen={true}
          onClose={paymentMethods.filter(m => m.isEnabled).length > 1 ? handleBackToSelection : props.onClose}
          onSuccess={handlePaymentSuccess}
          amount={props.amount}
          title={props.title}
          description={props.description}
          userId={props.userId}
          purchaseContext={{
            type: 'course',
            courseId: props.courseId,
            boostType: props.boostType
          }}
        />
      )}

      {/* Purchase Confirmation Modal */}
      {isConfirmationOpen && purchaseItem && confirmationPaymentMethod && (
        <PurchaseConfirmationModal
          isOpen={isConfirmationOpen}
          onClose={hideConfirmation}
          onConfirm={confirmPurchase}
          item={purchaseItem}
          paymentMethod={confirmationPaymentMethod}
          userCredits={0} // Regular PaymentHandler doesn't have user credits
          isLoading={isConfirmationProcessing}
          title={t('confirmPurchaseTitle')}
        />
      )}
    </>
  );
}