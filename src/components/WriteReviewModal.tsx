'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiStar, FiUpload, FiTrash2 } from 'react-icons/fi';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';

interface WriteReviewModalProps {
  productId: string;
  productName: string;
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
  onReviewSubmitted?: () => void;
}

export default function WriteReviewModal({ 
  productId, 
  productName, 
  orderId, 
  isOpen, 
  onClose,
  onReviewSubmitted 
}: WriteReviewModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUploadError, setImageUploadError] = useState('');

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const maxImages = 5;
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (images.length + files.length > maxImages) {
      setImageUploadError(t('Maximum 5 images allowed'));
      return;
    }

    Array.from(files).forEach(file => {
      if (file.size > maxSize) {
        setImageUploadError(t('Image size must be less than 5MB'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result && images.length < maxImages) {
          setImages(prev => [...prev, result]);
          setImageUploadError('');
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset the input
    event.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const submitReview = async () => {
    if (!user || !rating) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/product-reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer token`
        },
        body: JSON.stringify({
          productId,
          orderId,
          customerId: user.id,
          rating,
          comment,
          images
        })
      });

      if (response.ok) {
        // Reset form
        setRating(0);
        setHoverRating(0);
        setComment('');
        setImages([]);
        
        onReviewSubmitted?.();
        onClose();
      } else {
        const error = await response.json();
        console.error('Error submitting review:', error);
        // You might want to show an error message to the user
      }
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="text-2xl transition-colors"
          >
            <FiStar
              className={`${
                star <= (hoverRating || rating)
                  ? 'text-yellow-400 fill-current' 
                  : 'text-gray-400 hover:text-yellow-300'
              } transition-colors`}
            />
          </button>
        ))}
      </div>
    );
  };

  if (!isOpen) return null;

return (
    <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />
            
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
                    <h2 className="text-2xl font-bold text-white">
                        {t('Write a Review')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-2"
                    >
                        <FiX className="text-xl" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-white mb-2">
                            {productName}
                        </h3>
                        <p className="text-gray-400 text-sm">
                            {t('Share your experience with this product')}
                        </p>
                    </div>

                    {/* Rating */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-300 mb-3">
                            {t('Rating')} *
                        </label>
                        <div className="flex items-center space-x-2">
                            {renderStars()}
                            <span className="text-sm text-gray-400 ml-4">
                                {rating > 0 && (
                                    <>
                                        {rating} {t('star')}{rating !== 1 ? 's' : ''}
                                        {rating === 5 && ' - ' + t('Excellent!')}
                                        {rating === 4 && ' - ' + t('Very Good')}
                                        {rating === 3 && ' - ' + t('Good')}
                                        {rating === 2 && ' - ' + t('Fair')}
                                        {rating === 1 && ' - ' + t('Poor')}
                                    </>
                                )}
                            </span>
                        </div>
                    </div>

                    {/* Comment */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            {t('Review')} ({t('optional')})
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={5}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                            placeholder={t('Tell others about your experience with this product...')}
                            maxLength={1000}
                        />
                        <div className="flex justify-end mt-1">
                            <span className="text-xs text-gray-400">
                                {comment.length}/1000
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-700 sticky bottom-0 bg-gray-800 z-10">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                        {t('Cancel')}
                    </button>
                    <button
                        onClick={submitReview}
                        disabled={!rating || isSubmitting}
                        className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                        {isSubmitting ? t('Submitting...') : t('Submit Review')}
                    </button>
                </div>
            </motion.div>
        </div>
    </AnimatePresence>
);
}
