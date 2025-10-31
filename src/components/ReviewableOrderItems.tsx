'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiStar, FiMessageSquare } from 'react-icons/fi';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';
import WriteReviewModal from '@/components/WriteReviewModal';

interface ReviewableOrderItemsProps {
  orderId: string;
  items: any[];
  orderStatus: string;
}

export default function ReviewableOrderItems({ 
  orderId, 
  items, 
  orderStatus 
}: ReviewableOrderItemsProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [showWriteReviewModal, setShowWriteReviewModal] = useState(false);
  const [selectedProductForReview, setSelectedProductForReview] = useState<any>(null);
  const [userReviews, setUserReviews] = useState<{ [productId: string]: boolean }>({});

  // Only show review buttons for delivered orders
  const canReview = orderStatus === 'delivered';

  useEffect(() => {
    if (canReview && user) {
      checkExistingReviews();
    }
  }, [canReview, user, items]);

  const checkExistingReviews = async () => {
    if (!user) return;
    
    try {
      const reviewChecks: { [productId: string]: boolean } = {};
      
      for (const item of items) {
        if (item.productId) {
          const response = await fetch(`/api/product-reviews?customerId=${user.id}`);
          if (response.ok) {
            const reviews = await response.json();
            const hasReviewed = reviews.some((review: any) => 
              review.productId === item.productId && review.orderId === orderId
            );
            reviewChecks[item.productId] = hasReviewed;
          }
        }
      }
      
      setUserReviews(reviewChecks);
    } catch (error) {
      console.error('Error checking existing reviews:', error);
    }
  };

  const handleWriteReview = (item: any) => {
    setSelectedProductForReview({
      id: item.productId,
      name: item.productName
    });
    setShowWriteReviewModal(true);
  };

  const handleReviewSubmitted = () => {
    // Refresh review status
    checkExistingReviews();
  };

  if (!canReview) {
    return null;
  }

  return (
    <>
      <div className="mt-4 space-y-2">
        {items.map((item: any, index: number) => {
          if (!item.productId) return null;
          
          const hasReviewed = userReviews[item.productId];
          
          return (
            <div key={item.id || index} className="flex items-center justify-between bg-gray-800/30 rounded-lg p-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{item.productName}</p>
                <p className="text-xs text-gray-400">
                  {t('Quantity')}: {item.quantity || 1}
                </p>
              </div>
              
              <div>
                {hasReviewed ? (
                  <div className="flex items-center space-x-1 text-green-400 text-xs">
                    <FiStar className="fill-current" />
                    <span>{t('Reviewed')}</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleWriteReview(item)}
                    className="flex items-center space-x-1 px-3 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 hover:text-purple-300 rounded text-xs transition-colors"
                  >
                    <FiMessageSquare />
                    <span>{t('Write Review')}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Write Review Modal */}
      {showWriteReviewModal && selectedProductForReview && (
        <WriteReviewModal
          productId={selectedProductForReview.id}
          productName={selectedProductForReview.name}
          orderId={orderId}
          isOpen={showWriteReviewModal}
          onClose={() => {
            setShowWriteReviewModal(false);
            setSelectedProductForReview(null);
          }}
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}
    </>
  );
}
