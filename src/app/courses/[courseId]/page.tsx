'use client';

import { useState, useEffect, useContext } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  FiStar, 
  FiClock, 
  FiUsers, 
  FiCalendar,
  FiDollarSign,
  FiArrowLeft,
  FiMapPin,
  FiShare2,
  FiArrowRight,
  FiMessageCircle
} from 'react-icons/fi';

import { useAuth } from '@/lib/auth';
import { Course, Review, StudentTokenPackage } from '@/types';
import { courseService, reviewService, userSubscriptionService, studentTokenPackageService, userService, coachReferralActivityService, coachReferralStatsService } from '@/lib/database';
import PaymentModal from '@/components/PaymentModal';
import ReviewSystem from '@/components/ReviewSystem';
import CourseBoost from '@/components/CourseBoost';
import CommunityChat from '@/components/CommunityChat';
import VideoModal from '@/components/VideoModal';
import TokenSelectionModal from '@/components/TokenSelectionModal';
import { PaymentDetails, UserSubscription } from '@/types';
import { bookingService, transactionService, notificationService } from '@/lib/database';
import PaymentHandlerWithCredits from '@/components/PaymentHandlerWithCredits';

export default function CourseDetail() {
  const params = useParams();
  const router = useRouter();
  const { user, updateUserProfile } = useAuth();
  const {t} = useTranslation();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [hasCompletedCourse, setHasCompletedCourse] = useState(false);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [bookingType, setBookingType] = useState<'subscription' | 'pay_per_session' | 'tokens'>('subscription');
  const [availableTokenPackages, setAvailableTokenPackages] = useState<StudentTokenPackage[]>([]);
  const [selectedTokenPackage, setSelectedTokenPackage] = useState<StudentTokenPackage | null>(null);
  const [showTokenSelector, setShowTokenSelector] = useState(false);

  useEffect(() => {
    loadCourseData();
    // If you need to check if courseContent is an array, do so without assignment
   
    
  }, [params?.courseId]);

  useEffect(() => {
    if (user && course) {
      checkUserCourseStatus();
      loadUserSubscription();
      loadUserTokenPackages();
    }
  }, [user, course]);

  // Initialize tab from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'chat') {
      setActiveTab('chat');
    }
  }, []);

  const loadUserSubscription = async () => {
    if (!user?.id) return;
    try {
      const subscription = await userSubscriptionService.getActiveByUserId(user.id);
      setUserSubscription(subscription);
      // Default to subscription booking if user has active subscription
      if (subscription) {
        setBookingType('subscription');
      } else {
        setBookingType('pay_per_session');
      }
    } catch (error) {
      console.error('Error loading user subscription:', error);
    }
  };

  const loadUserTokenPackages = async () => {
    if (!user?.id || !course?.coachId) return;
    try {
      const tokenPackages = await studentTokenPackageService.getByStudentAndCoach(user.id, course.coachId);
      setAvailableTokenPackages(tokenPackages);
      
      // If user has valid token packages but no subscription, suggest tokens
      if (tokenPackages.length > 0 && !userSubscription) {
        setBookingType('tokens');
      }
    } catch (error) {
      console.error('Error loading user token packages:', error);
    }
  };

  const checkUserCourseStatus = async () => {
    if (!user || !course) return;
    
    try {
      // Check if user has completed this course
      const userBookings = await bookingService.getByStudent(user.id);
      const completedBooking = userBookings.find(
        booking => booking.courseId === course.id && booking.status === 'completed'
      );
      
      if (completedBooking) {
        setHasCompletedCourse(true);
        
        // Check if user hasn't reviewed yet
        const userReviews = await reviewService.getByUser(user.id);
        const hasReviewed = userReviews.some((review: { courseId: string; }) => review.courseId === course.id);
        
        // If user completed course but hasn't reviewed, switch to reviews tab
        if (!hasReviewed) {
          setActiveTab('reviews');
        }
      }
    } catch (error) {
      console.error('Error checking course status:', error);
    }
  };

  const loadCourseData = async () => {
    if (!params?.courseId) {
      console.error('No courseId provided');
      return;
    }
    
    const courseId = params?.courseId as string;
    console.log('Loading course data for ID:', courseId);
    
    try {
      setIsLoading(true);
      const [courseData, reviewsData] = await Promise.all([
        courseService.getById(courseId),
        reviewService.getByCourse(courseId)
      ]);
      
      console.log('Course data loaded:', courseData ? 'Found' : 'Not found');
      console.log('Reviews loaded:', reviewsData.length);
      
      setCourse(courseData);
      setReviews(reviewsData);
    } catch (error) {
      console.error('Error loading course data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    // Update URL parameters to help with footer detection
    if (tabId === 'chat') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'chat');
      window.history.replaceState({}, '', url.toString());
    } else {
      const url = new URL(window.location.href);
      url.searchParams.delete('tab');
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleBookCourse = () => {
    if (!user) {
      router.push('/login');
      return;
    }

    // If user has subscription, book directly with subscription
    if (bookingType === 'subscription' && userSubscription) {
      bookWithSubscription();
    } else if (bookingType === 'tokens') {
      // Show token selector if multiple packages available
      if (availableTokenPackages.length > 1) {
        setShowTokenSelector(true);
      } else if (availableTokenPackages.length === 1) {
        // Use the only available package
        bookWithTokens(availableTokenPackages[0]);
      } else {
        // No token packages available, fallback to payment
        setShowPaymentModal(true);
      }
    } else {
      // Show payment modal for pay-per-session
      setShowPaymentModal(true);
    }
  };

  const bookWithTokens = async (tokenPackage: StudentTokenPackage) => {
    if (!course || !user || !tokenPackage) return;

    try {
      setIsLoading(true);

      // Check if token package has enough tokens
      if (tokenPackage.remainingTokens < course.sessions) {
        alert(`Insufficient tokens. You need ${course.sessions} tokens but only have ${tokenPackage.remainingTokens} remaining.`);
        return;
      }

      // Use the token-aware booking method
      await bookingService.createWithTokens(
        course.id,
        user.id,
        tokenPackage.id
      );

      // Update course student count
      await courseService.update(course.id, {
        currentStudents: course.currentStudents + 1
      });

      // Send notification
      await notificationService.create({
        userId: user.id,
        title: 'Course Booked Successfully!',
        message: `You have successfully booked "${course.title}" using ${course.sessions} tokens from your ${tokenPackage.packageName} package.`,
        type: 'booking',
        read: false
      });

      // Reload data
      await loadCourseData();
      await loadUserTokenPackages();
      setShowTokenSelector(false);
      
    } catch (error) {
      console.error('Token booking error:', error);
      alert(error instanceof Error ? error.message : 'Failed to book course with tokens');
    } finally {
      setIsLoading(false);
    }
  };

  const bookWithSubscription = async () => {
    if (!course || !user || !userSubscription) return;

    try {
      setIsLoading(true);

      // Use the new subscription-aware booking method
      await bookingService.createWithSubscription(
        {
          courseId: course.id,
          studentId: user.id,
          coachId: course.coachId,
          status: 'confirmed',
          paymentStatus: 'completed',
          paymentAmount: 0, // No direct payment required
          scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next week
        },
        course.id,
        course.title,
        course.coachName
      );

      // Update course student count
      await courseService.update(course.id, {
        currentStudents: course.currentStudents + 1
      });

      // Send notification
      await notificationService.create({
        userId: user.id,
        title: 'Course Booked Successfully!',
        message: `You have successfully booked "${course.title}" using your subscription. Check your dashboard for details.`,
        type: 'booking',
        read: false
      });

      // Reload data
      await loadCourseData();
      await loadUserSubscription();
      
    } catch (error) {
      console.error('Subscription booking error:', error);
      alert(error instanceof Error ? error.message : 'Failed to book course with subscription');
    } finally {
      setIsLoading(false);
    }
  };

  const processPayment = async (paymentDetails: PaymentDetails) => {
    if (!course || !user) return false;

    try {
      // Check if user has enough credits
      if (user.credits >= course.totalPrice) {
        // Pay with credits
        const newCredits = user.credits - course.totalPrice;
        await updateUserProfile({ credits: newCredits });
        
        // Record transaction
        await transactionService.create({
          userId: user.id,
          type: 'course_purchase',
          amount: -course.totalPrice,
          description: `Purchased: ${course.title} (${course.sessions} sessions)`,
          status: 'completed'
        });
      } else {
        // Simulate card payment
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Record transaction
        await transactionService.create({
          userId: user.id,
          type: 'course_purchase',
          amount: course.totalPrice,
          description: `Purchased: ${course.title} (${course.sessions} sessions) via ${paymentDetails.cardNumber.slice(-4)} card`,
          status: 'completed'
        });
      }

      // Create booking
      await bookingService.create({
        courseId: course.id,
        studentId: user.id,
        coachId: course.coachId,
        status: 'confirmed',
        paymentStatus: 'completed',
        paymentAmount: course.totalPrice,
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next week
      });

      // Update course student count
      await courseService.update(course.id, {
        currentStudents: course.currentStudents + 1
      });

      // Send notification
      await notificationService.create({
        userId: user.id,
        title: 'Course Booked Successfully!',
        message: `You have successfully booked "${course.title}". Check your dashboard for details.`,
        type: 'booking',
        read: false
      });

      // Send notification to coach
      await notificationService.create({
        userId: course.coachId,
        title: 'New Course Booking!',
        message: `${user.firstName} ${user.lastName} has booked your course "${course.title}". Payment method: ${user.credits >= course.price ? 'Credits' : 'Card'}. Check your dashboard for details.`,
        type: 'booking',
        read: false
      });

      // Reload course data
      await loadCourseData();
      setShowPaymentModal(false);
      
      return true;
    } catch (error) {
      console.error('Booking error:', error);
      return false;
    }
  };

  const processPaymentSuccess = async (paymentId: string, method: 'stripe' | 'paypal' | 'twint' | 'credits' | 'gift-card' | 'discount-card', referralCode?: string) => {
    if (!course || !user) return;

    try {
      // For credits, gift-card, and discount-card payments, the transaction is already recorded in PaymentHandlerWithCredits
      if (method !== 'credits' && method !== 'gift-card' && method !== 'discount-card') {
        // Record transaction for stripe/paypal payments
        await transactionService.create({
          userId: user.id,
          type: 'course_purchase',
          amount: course.price,
          description: `Purchased: ${course.title} via ${method}`,
          status: 'completed'
        });
      }

      // Create booking
      await bookingService.create({
        courseId: course.id,
        studentId: user.id,
        coachId: course.coachId,
        status: 'confirmed',
        paymentStatus: 'completed',
        paymentAmount: course.price,
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      // Handle referral tracking if referral code was provided
      if (referralCode) {
        try {
          const referrerUser = await userService.getByReferralCode(referralCode);
          if (referrerUser) {
            // Create coach referral activity record
            await coachReferralActivityService.create({
              coachId: course.coachId,
              coachName: course.coachName,
              courseId: course.id,
              courseName: course.title,
              purchaserUserId: user.id,
              purchaserName: `${user.firstName} ${user.lastName}`,
              purchaserEmail: user.email,
              referrerUserId: referrerUser.id,
              referrerName: `${referrerUser.firstName} ${referrerUser.lastName}`,
              referrerEmail: referrerUser.email,
              referralCode: referralCode,
              purchaseAmount: course.price,
              purchaseDate: new Date(),
              rewardStatus: 'pending'
            });

            // Update coach referral stats
            await coachReferralStatsService.updateStats(course.coachId, {
              coachId: course.coachId,
              coachName: course.coachName,
              courseId: course.id,
              courseName: course.title,
              purchaserUserId: user.id,
              purchaserName: `${user.firstName} ${user.lastName}`,
              purchaserEmail: user.email,
              referrerUserId: referrerUser.id,
              referrerName: `${referrerUser.firstName} ${referrerUser.lastName}`,
              referrerEmail: referrerUser.email,
              referralCode: referralCode,
              purchaseAmount: course.price,
              purchaseDate: new Date(),
              rewardStatus: 'pending'
            } as any);

            console.log('Referral activity tracked successfully');
          }
        } catch (referralError) {
          console.error('Error tracking referral activity:', referralError);
          // Don't fail the purchase if referral tracking fails
        }
      }

      // Update course student count
      await courseService.update(course.id, {
        currentStudents: course.currentStudents + 1
      });

      // Send notification to student
      await notificationService.create({
        userId: user.id,
        title: 'Course Booked Successfully!',
        message: `You have successfully booked "${course.title}". Check your dashboard for details.`,
        type: 'booking',
        read: false
      });

      // Send notification to coach
      await notificationService.create({
        userId: course.coachId,
        title: 'New Course Booking!',
        message: `${user.firstName} ${user.lastName} has booked your course "${course.title}" via ${method === 'credits' ? 'Credits' : method}. Check your dashboard for details.`,
        type: 'booking',
        read: false
      });

      // Reload course data
      await loadCourseData();
      setShowPaymentModal(false);
      
      return true;
    } catch (error) {
      console.error('Booking error:', error);
      return false;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-[#D91CD2] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">{t('Course Not Found')}</h1>
          <button onClick={() => router.back()} className="btn-primary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-20">
      <div className="container mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center space-x-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <FiArrowLeft />
          <span>{t('Back to Courses')}</span>
        </button>

        {/* Course Header */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8 mb-12">
          <div className="order-2 xl:order-1">
            <div className="relative mb-6">
              <img
                src={course.imageUrl}
                alt={course.title}
                className="w-full h-48 sm:h-56 md:h-64 object-cover rounded-lg"
              />
              
              {/* Video Preview Button */}
              {course.videoLink && (
                <button
                  onClick={() => setShowVideoModal(true)}
                  className="absolute inset-0 bg-black/20 hover:bg-black/40 transition-colors flex items-center justify-center group rounded-lg"
                >
                  <div className="bg-white/90 hover:bg-white transition-colors rounded-full p-3 sm:p-4 group-hover:scale-110 transform duration-200">
                    <svg 
                      className="w-6 h-6 sm:w-8 sm:h-8 text-black ml-1" 
                      fill="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                  <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 bg-black/80 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm">
                    ▶ {t('Watch Preview')}
                  </div>
                </button>
              )}
              
              {course.boosted && (
                <div className="absolute top-2 sm:top-4 left-2 sm:left-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs sm:text-sm font-bold px-2 sm:px-3 py-1 rounded">
                  BOOSTED
                </div>
              )}
              <div className={`absolute top-2 sm:top-4 right-2 sm:right-4 px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-medium ${
                course.difficulty === 'Beginner' ? 'bg-green-500 text-white' :
                course.difficulty === 'Intermediate' ? 'bg-yellow-500 text-black' :
                'bg-red-500 text-white'
              }`}>
                {t(`${course.difficulty}`)}
              </div>
            </div>
          </div>

          <div className="order-1 xl:order-2 space-y-4 sm:space-y-6">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 sm:mb-4 leading-tight">{course.title}</h1>
              <div className="text-sm sm:text-base text-gray-300 leading-relaxed">
                {course.description.split('\n').map((line, index) => (
                  <span key={index}>
                    {line}
                    <br />
                  </span>
                ))}
              </div>
            </div>

            {/* Course Info */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-gray-400 text-xs sm:text-sm">
                <div className="flex items-center space-x-1 sm:space-x-2 bg-gray-900/50 p-2 sm:p-3 rounded-lg">
                  <FiStar className="text-yellow-400 flex-shrink-0" size={14} />
                  <span className="truncate">{course.averageRating.toFixed(1)} ({course.totalReviews})</span>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2 bg-gray-900/50 p-2 sm:p-3 rounded-lg">
                  <FiClock className="flex-shrink-0" size={14} />
                  <span className="truncate">{course.duration} {t('min')}</span>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2 bg-gray-900/50 p-2 sm:p-3 rounded-lg">
                  <FiUsers className="flex-shrink-0" size={14} />
                  <span className="truncate">{course.currentStudents}/{course.maxStudents}</span>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2 bg-gray-900/50 p-2 sm:p-3 rounded-lg">
                  <FiArrowRight className="flex-shrink-0" size={14} />
                  <span className="truncate">{course.sessions} {t('sessions')}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text">
                  CHF {course.price}
                </div>
                <span className="text-sm sm:text-base text-gray-400">{t('per class')}</span>
              </div>

              {/* Instructor Section - Responsive */}
              <div className="p-3 sm:p-4 bg-gray-900/70 rounded-lg border border-gray-800">
                <h3 className="font-semibold mb-3 text-sm sm:text-base">{t('Instructor')}</h3>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-[#D91CD2] to-[#7B1FA2] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-medium text-sm sm:text-base">
                      {course.coachName.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm sm:text-base text-white truncate">{course.coachName}</p>
                    <p className="text-xs sm:text-sm text-gray-400">{t('Professional Dance Coach')}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 sm:space-y-4">
                {/* Subscription Status and Booking Options */}
                {user && userSubscription && (
                  <div className="bg-green-500/20 border border-green-500 rounded-lg p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="text-green-400 font-medium text-sm sm:text-base">{t('Active Subscription')}</p>
                        <p className="text-xs sm:text-sm text-gray-300">{userSubscription.planName}</p>
                      </div>
                      {userSubscription.planType === 'session_pack' && (
                        <div className="sm:text-right">
                          <p className="text-green-400 font-medium text-sm sm:text-base">
                            {userSubscription.remainingSessions} {t('sessions left')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Booking Type Selection */}
                {user && (userSubscription || availableTokenPackages.length > 0) && (
                  <div className="space-y-3">
                    <p className="text-sm sm:text-base font-medium">{t('How would you like to book?')}</p>
                    <div className="grid grid-cols-1 gap-2 sm:gap-3">
                      {userSubscription && (
                        <button
                          onClick={() => setBookingType('subscription')}
                          className={`px-3 sm:px-4 py-3 rounded-lg text-sm sm:text-base transition-colors ${
                            bookingType === 'subscription'
                              ? 'bg-[#D91CD2] text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                          disabled={
                            userSubscription.planType === 'session_pack' && 
                            (!userSubscription.remainingSessions || userSubscription.remainingSessions <= 0)
                          }
                        >
                          <span className="block font-medium">{t('Use Subscription')}</span>
                          {userSubscription.planType === 'session_pack' && (
                            <span className="block text-xs sm:text-sm opacity-75 mt-1">
                              {userSubscription.remainingSessions || 0} {t('left')}
                            </span>
                          )}
                        </button>
                      )}
                      
                      {availableTokenPackages.length > 0 && (
                        <button
                          onClick={() => setBookingType('tokens')}
                          className={`px-3 sm:px-4 py-3 rounded-lg text-sm sm:text-base transition-colors ${
                            bookingType === 'tokens'
                              ? 'bg-[#D91CD2] text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                          disabled={availableTokenPackages.every(pkg => pkg.remainingTokens < course.sessions)}
                        >
                          <span className="block font-medium">{t('Use Tokens')}</span>
                          <span className="block text-xs sm:text-sm opacity-75 mt-1">
                            {availableTokenPackages.reduce((total, pkg) => total + pkg.remainingTokens, 0)} {t('tokens available')}
                          </span>
                        </button>
                      )}

                      <button
                        onClick={() => setBookingType('pay_per_session')}
                        className={`px-3 sm:px-4 py-3 rounded-lg text-sm sm:text-base transition-colors ${
                          bookingType === 'pay_per_session'
                            ? 'bg-[#D91CD2] text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        <span className="block font-medium">{t('Pay Per Session')}</span>
                        <span className="block text-xs sm:text-sm opacity-75 mt-1">
                          CHF {course.totalPrice} ({course.sessions} {t('sessions')}))
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleBookCourse}
                  disabled={
                    course.currentStudents >= course.maxStudents ||
                    (bookingType === 'subscription' && userSubscription?.planType === 'session_pack' && 
                     (!userSubscription.remainingSessions || userSubscription.remainingSessions <= 0)) ||
                    (bookingType === 'tokens' && availableTokenPackages.every(pkg => pkg.remainingTokens < course.sessions))
                  }
                  className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed py-3 sm:py-4 text-sm sm:text-base font-medium"
                >
                  {course.currentStudents >= course.maxStudents 
                    ? t('Fully Booked')
                    : bookingType === 'subscription' && userSubscription
                      ? userSubscription.planType === 'session_pack'
                        ? `${t('Book with Subscription')} (${userSubscription.remainingSessions} ${t('left')})`
                        : t('Book with Annual Subscription')
                      : bookingType === 'tokens' && availableTokenPackages.length > 0
                        ? `${t('Book with Tokens')} (${course.sessions} ${t('tokens needed')})`
                        : `${t('Book Now')} - CHF ${course.totalPrice}`
                  }
                </button>

                
                {/* Course Boost (only for course owner) */}
                <CourseBoost 
                  course={course} 
                  onBoostSuccess={loadCourseData}
                />
                
                <button
                  className="w-full btn-secondary flex items-center justify-center space-x-2 py-3 sm:py-4 text-sm sm:text-base"
                  onClick={() => {
                  const url = `${window.location.origin}/courses/${course.id}`;
                  const shareText = `${t('Check out this course')}: ${course.title}\n${url}`;
                  navigator.clipboard.writeText(shareText).then(() => {
                    alert(t('Course link copied to clipboard!'));
                  });
                  }}
                >
                  <FiShare2 className="flex-shrink-0" />
                  <span>{t('Share Course')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap mb-8 border-b border-gray-800">
            {[
            { id: 'overview', label: 'Overview' },
            { 
              id: 'reviews', 
              label: `Reviews (${course.totalReviews})`,
              notification: hasCompletedCourse && !reviews.some(r => r.studentId === user?.id)
            },
            { 
              id: 'chat', 
              label: (
              <span className="flex items-center gap-2">
                <FiMessageCircle className="inline-block" />
                Community Chat
              </span>
              ),
              isSpecial: true,
              isGroupChat: true
            }
            ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-3 py-1 border-b-2 transition-all duration-300 relative font-medium text-xs sm:text-sm
              ${activeTab === tab.id
              ? 'border-[#D91CD2] text-[#D91CD2] scale-105'
              : 'border-transparent text-gray-400 hover:text-white'}
              ${tab.isSpecial ? 'bg-gradient-to-r from-[#D91CD2]/10 to-[#7000FF]/10 rounded-t-md' : ''}
              ${tab.isGroupChat 
              ? 'bg-[#7B1FA2] hover:bg-[#D91CD2] text-white font-semibold px-4 py-0 mb-1 rounded-md shadow border-2 border-[#D91CD2] hover:border-[#7B1FA2]' 
              : ''
              }
              `}
            >
              {tab.isSpecial && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-gradient-to-r from-[#D91CD2] to-[#7000FF] rounded-full animate-pulse"></div>
              )}
              {tab.label}
              {tab.notification && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
            ))}
        </div>
          
        {/* Tab Content */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="bg-gray-900 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4">{t('What You\'ll Learn')}</h3>
              <ul className="space-y-2 text-gray-300">
                {course.courseContent && typeof course.courseContent === 'object' && Object.keys(course.courseContent).length > 0 ? (
                  Object.entries(course.courseContent).map(([key, value]: [string, string], idx: number) => (
                  <li key={idx}>• {value}</li>
                  ))
                ) : (
                  <li>{t('No course content available.')}</li>
                )}
                </ul>
            </div>

            <div className="bg-gray-900 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4">{t('Class Details')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
                <div>
                  <p><strong>{t('Category:')}</strong> {course.category}</p>
                  <p><strong>{t('Duration:')}</strong> {course.duration} {t('Minutes')}</p>
                  <p><strong>{t('Max Students:')}</strong> {course.maxStudents}</p>
                </div>
                <div>
                  <p><strong>{t('Difficulty:')}</strong> {t(`${course.difficulty}`)}</p>

                  <p><strong>{t('Equipment:')}</strong>{t('None required')}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'reviews' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mb-6 bg-gradient-to-r from-[#D91CD2]/20 to-[#7000FF]/20 p-4 rounded-lg border border-[#D91CD2]/30">
              <h3 className="text-xl font-semibold mb-2">{t('Share Your Experience')}</h3>
              <p className="text-gray-300 mb-4">
                Have you taken this course? Help others by leaving a review and rating!
              </p>
              <p className="text-sm text-gray-400">
                Note: You can only leave a review after completing the course, and you can only review each course once.
              </p>
            </div>
            
            <ReviewSystem
              courseId={course.id}
              onReviewSubmitted={loadCourseData}
              showReviews={true}
            />
          </motion.div>
        )}

        {activeTab === 'chat' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-[calc(100vh-200px)] min-h-[600px]"
          >
            <CommunityChat courseId={course.id} courseName={course.title} />
          </motion.div>
        )}

        {/* Payment Modal */}
        <PaymentHandlerWithCredits
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={(paymentId: string, method: 'stripe' | 'paypal' | 'twint' | 'credits' | 'gift-card' | 'discount-card', referralCode?: string) => {
            console.log(`Payment successful with ID: ${paymentId} using ${method}`, referralCode ? `with referral: ${referralCode}` : '');
            processPaymentSuccess(paymentId, method, referralCode);
          }}
          amount={course.totalPrice}
          title="Book Course"
          description={`Book "${course.title}" (${course.sessions} sessions) with ${course.coachName}`}
          userId={user?.id || ''}
          businessId={course.coachId}
          coachId={course.coachId}
          courseId={course.id}
          transactionType="course"
        />

        {/* Token Selection Modal */}
        <TokenSelectionModal
          isOpen={showTokenSelector}
          onClose={() => setShowTokenSelector(false)}
          onSuccess={async () => {
            await loadCourseData();
            await loadUserTokenPackages();
            setShowTokenSelector(false);
          }}
          onProceedWithPayment={() => {
            setShowTokenSelector(false);
            setShowPaymentModal(true);
          }}
          courseId={course.id}
          coachId={course.coachId}
          courseName={course.title}
          sessionsRequired={course.sessions}
        />
      </div>

      {/* Video Modal */}
      {showVideoModal && course?.videoLink && (
        <VideoModal
          isOpen={showVideoModal}
          videoUrl={course.videoLink}
          title={course.title}
          onClose={() => setShowVideoModal(false)}
        />
      )}
    </div>
  );
}
