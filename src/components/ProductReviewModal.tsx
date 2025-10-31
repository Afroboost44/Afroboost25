'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiStar, FiThumbsUp, FiUser, FiCalendar, FiShoppingBag } from 'react-icons/fi';
import { ProductReview } from '@/types';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';

interface ProductReviewModalProps {
  productId: string;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductReviewModal({ 
  productId, 
  productName, 
  isOpen, 
  onClose 
}: ProductReviewModalProps) {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'rating_high' | 'rating_low' | 'helpful'>('newest');
  const [filterRating, setFilterRating] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && productId) {
      fetchReviews();
    }
  }, [isOpen, productId]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/product-reviews?productId=${productId}`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHelpfulVote = async (reviewId: string) => {
    try {
      const response = await fetch('/api/product-reviews', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reviewId,
          action: 'helpful'
        })
      });

      if (response.ok) {
        // Update local state
        setReviews(prev => prev.map(review => 
          review.id === reviewId 
            ? { ...review, helpfulVotes: (review.helpfulVotes || 0) + 1 }
            : review
        ));
      }
    } catch (error) {
      console.error('Error voting helpful:', error);
    }
  };

  const getTimestamp = (date: any): number => {
    if (date?.toDate) return date.toDate().getTime();
    return new Date(date).getTime();
  };

  const filteredAndSortedReviews = reviews
    .filter(review => filterRating ? review.rating === filterRating : true)
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return getTimestamp(a.createdAt) - getTimestamp(b.createdAt);
        case 'rating_high':
          return b.rating - a.rating;
        case 'rating_low':
          return a.rating - b.rating;
        case 'helpful':
          return (b.helpfulVotes || 0) - (a.helpfulVotes || 0);
        default: // newest
          return getTimestamp(b.createdAt) - getTimestamp(a.createdAt);
      }
    });

  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length,
    percentage: reviews.length > 0 ? (reviews.filter(r => r.rating === rating).length / reviews.length) * 100 : 0
  }));

  const formatDate = (date: any) => {
    const dateObj = date?.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString();
  };

  const renderStars = (rating: number, size: 'sm' | 'md' = 'sm') => {
    const sizeClass = size === 'sm' ? 'text-sm' : 'text-base';
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <FiStar
            key={star}
            className={`${sizeClass} ${
              star <= rating 
                ? 'text-yellow-400 fill-current' 
                : 'text-gray-400'
            }`}
          />
        ))}
      </div>
    );
  };

  if (!isOpen) return null;

return (
    <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
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
                className="relative bg-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
                {/* Header */}
                <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 md:p-6 z-10">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl md:text-2xl font-bold text-white mb-1">
                                {t('Reviews for')} {productName}
                            </h2>
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    {renderStars(Math.round(averageRating), 'md')}
                                    <span className="text-base md:text-lg font-semibold text-white">
                                        {averageRating.toFixed(1)}
                                    </span>
                                    <span className="text-gray-400 text-sm md:text-base">
                                        ({reviews.length} {t('reviews')})
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors p-2"
                        >
                            <FiX className="text-lg md:text-xl" />
                        </button>
                    </div>

                    {/* Filters and Sorting */}
                    <div className="flex flex-wrap items-center gap-4 mt-4">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="bg-gray-700 text-white px-3 py-1 rounded text-sm w-full md:w-auto"
                        >
                            <option value="newest">{t('Newest First')}</option>
                            <option value="oldest">{t('Oldest First')}</option>
                            <option value="rating_high">{t('Highest Rating')}</option>
                            <option value="rating_low">{t('Lowest Rating')}</option>
                            <option value="helpful">{t('Most Helpful')}</option>
                        </select>

                        <select
                            value={filterRating || ''}
                            onChange={(e) => setFilterRating(e.target.value ? Number(e.target.value) : null)}
                            className="bg-gray-700 text-white px-3 py-1 rounded text-sm w-full md:w-auto"
                        >
                            <option value="">{t('All Ratings')}</option>
                            <option value="5">{t('5 Stars')}</option>
                            <option value="4">{t('4 Stars')}</option>
                            <option value="3">{t('3 Stars')}</option>
                            <option value="2">{t('2 Stars')}</option>
                            <option value="1">{t('1 Star')}</option>
                        </select>
                    </div>
                </div>

                {/* Content */}
                <div className="flex flex-col md:flex-row h-full overflow-y-auto md:overflow-hidden">
                    <div className="flex-1 overflow-y-auto"></div>
                    {/* Rating Distribution Sidebar */}
                    <div className="w-full md:w-80 p-4 md:p-6 border-b md:border-b-0 md:border-r border-gray-700 bg-gray-800/50">
                        <h3 className="text-lg font-semibold text-white mb-4">
                            {t('Rating Distribution')}
                        </h3>
                        
                        <div className="space-y-3">
                            {ratingDistribution.map(({ rating, count, percentage }) => (
                                <div key={rating} className="flex items-center space-x-3">
                                    <div className="flex items-center space-x-1 w-12">
                                        <span className="text-sm text-gray-300">{rating}</span>
                                        <FiStar className="text-yellow-400 text-xs fill-current" />
                                    </div>
                                    
                                    <div className="flex-1 bg-gray-700 rounded-full h-2">
                                        <div
                                            className="bg-yellow-400 h-2 rounded-full transition-all"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    
                                    <span className="text-sm text-gray-400 w-8 text-right">
                                        {count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Reviews List */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6">
                        {loading ? (
                            <div className="flex items-center justify-center h-40">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                            </div>
                        ) : filteredAndSortedReviews.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                                <FiStar className="text-4xl mb-2" />
                                <p>{t('No reviews found')}</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-700">
                                {filteredAndSortedReviews.map((review) => (
                                    <div key={review.id} className="p-4 md:p-6">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                                    <FiUser className="text-white" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center space-x-2">
                                                        <h4 className="font-semibold text-white">
                                                            {review.customerName}
                                                        </h4>
                                                        {review.isVerifiedPurchase && (
                                                            <div className="flex items-center space-x-1 bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs">
                                                                <FiShoppingBag className="text-xs" />
                                                                <span>{t('Verified Purchase')}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center space-x-2 mt-1">
                                                        {renderStars(review.rating)}
                                                        <span className="text-gray-400 text-sm flex items-center space-x-1">
                                                            <FiCalendar className="text-xs" />
                                                            <span>{formatDate(review.createdAt)}</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {review.comment && (
                                            <p className="text-gray-300 mb-4 leading-relaxed">
                                                {review.comment}
                                            </p>
                                        )}

                                        {review.images && review.images.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {review.images.map((image, index) => (
                                                    <div key={index} className="relative w-20 h-20 rounded-lg overflow-hidden">
                                                        <Image
                                                            src={image}
                                                            alt={`Review image ${index + 1}`}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between">
                                            <button
                                                onClick={() => handleHelpfulVote(review.id)}
                                                className="flex items-center space-x-2 text-gray-400 hover:text-green-400 transition-colors"
                                            >
                                                <FiThumbsUp className="text-sm" />
                                                <span className="text-sm">
                                                    {t('Helpful')} ({review.helpfulVotes || 0})
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    </AnimatePresence>
);
}
