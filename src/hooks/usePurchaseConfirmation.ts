import { useState, useCallback } from 'react';

interface PurchaseItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity?: number;
  type: 'course' | 'token_package' | 'credits' | 'subscription' | 'boost';
  image?: string;
}

interface UsePurchaseConfirmationReturn {
  isConfirmationOpen: boolean;
  purchaseItem: PurchaseItem | null;
  paymentMethod: 'stripe' | 'paypal' | 'twint' | 'credits' | 'gift-card' | null;
  showConfirmation: (
    item: PurchaseItem, 
    method: 'stripe' | 'paypal' | 'twint' | 'credits' | 'gift-card',
    onConfirm: () => void
  ) => void;
  hideConfirmation: () => void;
  confirmPurchase: () => void;
  isProcessing: boolean;
  setIsProcessing: (loading: boolean) => void;
}

export function usePurchaseConfirmation(): UsePurchaseConfirmationReturn {
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [purchaseItem, setPurchaseItem] = useState<PurchaseItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal' | 'twint' | 'credits' | 'gift-card' | null>(null);
  const [onConfirmCallback, setOnConfirmCallback] = useState<(() => void) | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const showConfirmation = useCallback((
    item: PurchaseItem, 
    method: 'stripe' | 'paypal' | 'twint' | 'credits' | 'gift-card',
    onConfirm: () => void
  ) => {
    setPurchaseItem(item);
    setPaymentMethod(method);
    setOnConfirmCallback(() => onConfirm);
    setIsConfirmationOpen(true);
    setIsProcessing(false);
  }, []);

  const hideConfirmation = useCallback(() => {
    setIsConfirmationOpen(false);
    setPurchaseItem(null);
    setPaymentMethod(null);
    setOnConfirmCallback(null);
    setIsProcessing(false);
  }, []);

  const confirmPurchase = useCallback(() => {
    if (onConfirmCallback) {
      setIsProcessing(true);
      onConfirmCallback();
    }
  }, [onConfirmCallback]);

  return {
    isConfirmationOpen,
    purchaseItem,
    paymentMethod,
    showConfirmation,
    hideConfirmation,
    confirmPurchase,
    isProcessing,
    setIsProcessing,
  };
}
