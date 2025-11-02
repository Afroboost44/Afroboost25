'use client';

import { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiStar, FiX, FiMessageSquare, FiUser, FiCalendar } from 'react-icons/fi';
import { useAuth } from '@/lib/auth';
import { Review, Course, Booking } from '@/types';
import { reviewService, bookingService, courseService, notificationService } from '@/lib/database';
import { useParams } from 'next/navigation';
import React from 'react';
import { useTranslation } from 'react-i18next'; // Import useTranslation

interface ReviewSystemProps {
  courseId?: string;
  bookingId?: string;
  onReviewSubmitted?: () => void;
  showReviews?: boolean;
  className?: string;
}

export default function ReviewSystem({ 
  courseId, 
  bookingId, 
  onReviewSubmitted, 
  showReviews = true,
  className = '' 
}: ReviewSystemProps) {
  const { t } = useTranslation(); // Initialize useTranslation
  const params = useParams();
  const { user } = useAuth();
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [course, setCourse] = useState<Course | null>(null);
  const [canReview, setCanReview] = useState(false);

  useEffect(() => {
    if (courseId) {
      loadReviews();
      loadCourse();
      checkCanReview();
    }
  }, [courseId, user]);

  const loadReviews = async () => {
    if (!courseId) return;
    
    try {
      setIsLoading(true);
      const courseReviews = await reviewService.getByCourse(courseId);
      setReviews(courseReviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCourse = async () => {
    if (!courseId) return;
    
    try {
      const courseData = await courseService.getById(courseId);
      setCourse(courseData);
    } catch (error) {
      console.error('Error loading course:', error);
    }
  };

  const checkCanReview = async () => {
    if (!user || !courseId) return;
    
    try {
      // Check if user has completed a booking for this course
      const userBookings = await bookingService.getByStudent(user.id);
      const completedBooking = userBookings.find(
        (booking: Booking) => booking.courseId === courseId && 
        booking.status === 'completed'
      );
      
      if (completedBooking) {
        // Check if already reviewed
        const userReviews = await reviewService.getByUser(user.id);
        const existingReview = userReviews.find((review: Review) => review.courseId === courseId);
        setCanReview(!existingReview);
      } else {
        setCanReview(false);
      }
    } catch (error) {
      console.error('Error checking review eligibility:', error);
    }
  };

  const submitReview = async () => {
    if (!user || !courseId || !course || rating === 0) return;
    
    try {
      setIsSubmitting(true);
      
      // Create review
      const reviewData = {
        courseId,
        studentId: user.id,
        studentName: `${user.firstName} ${user.lastName}`,
        coachId: course.coachId,
        rating,
        comment: comment.trim(),
        helpful: 0
      };
      
      await reviewService.create(reviewData);
      
      // Update course statistics
      const updatedReviews = [...reviews, { ...reviewData, id: 'temp', createdAt: new Date() }];
      const averageRating = updatedReviews.reduce((sum, review) => sum + review.rating, 0) / updatedReviews.length;
      
      await courseService.update(courseId, {
        averageRating,
        totalReviews: updatedReviews.length
      });
      
      // Send notification to coach
      await notificationService.create({
        userId: course.coachId,
        title: t('newReviewReceived'),
        message: t('reviewNotificationMessage', {
          firstName: user.firstName,
          lastName: user.lastName,
          rating,
          title: course.title
        }),
        type: 'review',
        read: false
      });
      
      // Close modal and reload reviews
      setShowReviewModal(false);
      setRating(0);
      setComment('');
      await loadReviews();
      setCanReview(false);
      
      if (onReviewSubmitted) {
        onReviewSubmitted();
      }
      
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Accepts Date or Firestore Timestamp (with toDate method)
  const formatDate = (date: any) => {
    let jsDate: Date;
    if (date instanceof Date) {
      jsDate = date;
    } else if (date && typeof date.toDate === 'function') {
      jsDate = date.toDate();
    } else {
      jsDate = new Date(date);
    }
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(jsDate);
  };

  const renderStars = (rating: number, interactive = false, size = 20) => {
    return [...Array(5)].map((_, i) => (
      <button
        key={i}
        onClick={interactive ? () => setRating(i + 1) : undefined}
        onMouseEnter={interactive ? () => setHoverRating(i + 1) : undefined}
        onMouseLeave={interactive ? () => setHoverRating(0) : undefined}
        disabled={!interactive}
        className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-all`}
      >
        <FiStar
          size={size}
          className={`${
            i < (interactive ? (hoverRating || rating) : rating)
              ? 'text-yellow-400 fill-current'
              : 'text-gray-400'
          } transition-colors`}
        />
      </button>
    ));
  };

  if (!showReviews && !canReview) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Review Action Button */}
      {canReview && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#D91CD2] to-[#7B1FA2] p-4 rounded-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">{t('shareYourExperience')}</h3>
              <p className="text-sm text-gray-200">{t('helpOthersLeaveReview')}</p>
            </div>
            <button
              onClick={() => setShowReviewModal(true)}
              className="bg-white text-[#D91CD2] px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              {t('writeReview')}
            </button>
          </div>
        </motion.div>
      )}

      {/* Reviews List */}
      {showReviews && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">{t('studentReviews')}</h3>
            {reviews.length > 0 && (
              <div className="flex items-center space-x-2">
                <div className="flex">
                  {renderStars(course?.averageRating || 0)}
                </div>
                <span className="text-gray-400">
                  {course?.averageRating?.toFixed(1)} ({reviews.length} {t('reviews')})
                </span>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-[#D91CD2] border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FiMessageSquare size={48} className="mx-auto mb-4 opacity-50" />
              <p>{t('noReviewsYetBeFirst')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-900 p-6 rounded-lg border border-gray-700"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-[#D91CD2] to-[#7B1FA2] rounded-full flex items-center justify-center">
                        <FiUser className="text-white" />
                      </div>
                      <div>
                        <p className="font-medium">{review.studentName}</p>
                        <p className="text-sm text-gray-400 flex items-center">
                          <FiCalendar size={12} className="mr-1" />
                          {formatDate(review.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex">
                      {renderStars(review.rating)}
                    </div>
                  </div>
                  
                  {review.comment && (
                    <p className="text-gray-300 leading-relaxed">{review.comment}</p>
                  )}
                  
                  {(review.helpful ?? 0) > 0 && (
                    <div className="mt-4 text-sm text-gray-400">
                      {t('peopleFoundHelpful', { count: review.helpful ?? 0 })}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Review Modal */}
      <AnimatePresence>
        {showReviewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowReviewModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 rounded-lg p-6 w-full max-w-md"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">{t('writeReview')}</h3>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <FiX size={24} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium mb-2">{t('rating')}</label>
                  <div className="flex space-x-1">
                    {renderStars(rating, true, 32)}
                  </div>
                  {rating > 0 && (
                    <p className="text-sm text-gray-400 mt-2">
                      {rating === 1 ? t('poor') : 
                       rating === 2 ? t('fair') :
                       rating === 3 ? t('good') :
                       rating === 4 ? t('veryGood') : t('excellent')}
                    </p>
                  )}
                </div>

                {/* Comment */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {t('commentOptional')}
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={t('shareExperienceWithCourse')}
                    rows={4}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:border-[#D91CD2] focus:outline-none resize-none"
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {comment.length}/500 {t('characters')}
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  onClick={submitReview}
                  disabled={rating === 0 || isSubmitting}
                  className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? t('submitting') : t('submitReview')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
