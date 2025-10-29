'use client';

import { useState, useEffect, useContext } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  FiStar, 
  FiClock, 
  FiUsers, 
  FiCalendar,
  FiDollarSign,
  FiArrowLeft,
  FiMapPin,
  FiShare2
} from 'react-icons/fi';
import { AppContext, translations } from '../../../app/providers';
import { useAuth } from '@/lib/auth';
import { Course, Review } from '@/types';
import { courseService, reviewService, userSubscriptionService } from '@/lib/database';
import PaymentModal from '@/components/PaymentModal';
import ReviewSystem from '@/components/ReviewSystem';
import CourseBoost from '@/components/CourseBoost';
import CommunityChat from '@/components/CommunityChat';
import { PaymentDetails, UserSubscription } from '@/types';
import { bookingService, transactionService, notificationService } from '@/lib/database';
import PaymentHandler from '@/components/PaymentHandler';

export default function CourseDetail() {
  const params = useParams();
  const router = useRouter();
  const { language } = useContext(AppContext);
  const { user, updateUserProfile } = useAuth();
  const t = translations[language];
  
  const [course, setCourse] = useState<Course | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [hasCompletedCourse, setHasCompletedCourse] = useState(false);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [bookingType, setBookingType] = useState<'subscription' | 'pay_per_session'>('subscription');

  useEffect(() => {
    loadCourseData();
  }, [params.courseId]);

  useEffect(() => {
    if (user && course) {
      checkUserCourseStatus();
      loadUserSubscription();
    }
  }, [user, course]);

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
    if (!params.courseId) {
      console.error('No courseId provided');
      return;
    }
    
    const courseId = params.courseId as string;
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

  const handleBookCourse = () => {
    if (!user) {
      router.push('/login');
      return;
    }

    // If user has subscription, book directly with subscription
    if (bookingType === 'subscription' && userSubscription) {
      bookWithSubscription();
    } else {
      // Show payment modal for pay-per-session
      setShowPaymentModal(true);
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
      if (user.credits >= course.price) {
        // Pay with credits
        const newCredits = user.credits - course.price;
        await updateUserProfile({ credits: newCredits });
        
        // Record transaction
        await transactionService.create({
          userId: user.id,
          type: 'course_purchase',
          amount: -course.price,
          description: `Purchased: ${course.title}`,
          status: 'completed'
        });
      } else {
        // Simulate card payment
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Record transaction
        await transactionService.create({
          userId: user.id,
          type: 'course_purchase',
          amount: course.price,
          description: `Purchased: ${course.title} via ${paymentDetails.cardNumber.slice(-4)} card`,
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

  const processPaymentSuccess = async (paymentId: string, method: string) => {
    if (!course || !user) return;

    try {
      // Record transaction
      await transactionService.create({
        userId: user.id,
        type: 'course_purchase',
        amount: course.price,
        description: `Purchased: ${course.title} via ${method}`,
        status: 'completed'
      });

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
        message: `${user.firstName} ${user.lastName} has booked your course "${course.title}" via pay-per-session. Check your dashboard for details.`,
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
          <h1 className="text-2xl font-bold text-white mb-4">Course Not Found</h1>
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
          <span>Back to Courses</span>
        </button>

        {/* Course Header */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 lg:gap-12 mb-12">
          <div>
            <div className="relative mb-6">
              <img
                src={course.imageUrl}
                alt={course.title}
                className="w-full h-48 sm:h-64 object-cover rounded-lg"
              />
              {course.boosted && (
                <div className="absolute top-2 sm:top-4 left-2 sm:left-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs sm:text-sm font-bold px-2 sm:px-3 py-1 rounded">
                  BOOSTED
                </div>
              )}
              <div className={`absolute top-2 sm:top-4 right-2 sm:right-4 px-2 sm:px-3 py-1 rounded text-xs sm:text-sm ${
                course.difficulty === 'Beginner' ? 'bg-green-500' :
                course.difficulty === 'Intermediate' ? 'bg-yellow-500' :
                'bg-red-500'
              }`}>
                {course.difficulty}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">{course.title}</h1>
              <p className="text-gray-400 text-base lg:text-lg leading-relaxed">{course.description}</p>
            </div>

            {/* Course Info */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-4 lg:gap-6 text-gray-400 text-sm lg:text-base">
                <div className="flex items-center space-x-2">
                  <FiStar className="text-yellow-400" />
                  <span>{course.averageRating.toFixed(1)} ({course.totalReviews} reviews)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FiClock />
                  <span>{course.duration} minutes</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FiUsers />
                  <span>{course.currentStudents}/{course.maxStudents} students</span>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-2xl lg:text-3xl font-bold gradient-text flex items-center">
                  <FiDollarSign size={20} className="lg:w-6 lg:h-6" />
                  {course.price}
                </div>
                <span className="text-gray-400">per class</span>
              </div>

              <div className="p-4 bg-gray-900 rounded-lg">
                <h3 className="font-semibold mb-2">Instructor</h3>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-r from-[#D91CD2] to-[#7B1FA2] rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm lg:text-base">
                      {course.coachName.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{course.coachName}</p>
                    <p className="text-sm text-gray-400">Professional Dance Coach</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Subscription Status and Booking Options */}
                {user && userSubscription && (
                  <div className="bg-green-500/20 border border-green-500 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-400 font-medium">Active Subscription</p>
                        <p className="text-sm text-gray-300">{userSubscription.planName}</p>
                      </div>
                      {userSubscription.planType === 'session_pack' && (
                        <div className="text-right">
                          <p className="text-green-400 font-medium">
                            {userSubscription.remainingSessions} sessions left
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Booking Type Selection */}
                {user && userSubscription && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">How would you like to book?</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        onClick={() => setBookingType('subscription')}
                        className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                          bookingType === 'subscription'
                            ? 'bg-[#D91CD2] text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                        disabled={
                          userSubscription.planType === 'session_pack' && 
                          (!userSubscription.remainingSessions || userSubscription.remainingSessions <= 0)
                        }
                      >
                        <span className="block">Use Subscription</span>
                        {userSubscription.planType === 'session_pack' && (
                          <span className="block text-xs opacity-75">
                            {userSubscription.remainingSessions || 0} left
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setBookingType('pay_per_session')}
                        className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                          bookingType === 'pay_per_session'
                            ? 'bg-[#D91CD2] text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        <span className="block">Pay Per Session</span>
                        <span className="block text-xs opacity-75">
                          {course.price} USD
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
                     (!userSubscription.remainingSessions || userSubscription.remainingSessions <= 0))
                  }
                  className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {course.currentStudents >= course.maxStudents 
                    ? 'Fully Booked' 
                    : bookingType === 'subscription' && userSubscription
                      ? userSubscription.planType === 'session_pack'
                        ? `Book with Subscription (${userSubscription.remainingSessions} left)`
                        : 'Book with Annual Subscription'
                      : `Book Now - ${course.price} USD`
                  }
                </button>

                {/* No Subscription CTA */}
                {user && !userSubscription && (
                  <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-3">
                    <p className="text-blue-400 text-sm mb-2">
                      💡 Save money with a subscription package!
                    </p>
                    <button
                      onClick={() => router.push('/dashboard?tab=subscriptions')}
                      className="text-blue-400 underline text-sm hover:text-blue-300"
                    >
                      View subscription plans →
                    </button>
                  </div>
                )}
                
                {/* Course Boost (only for course owner) */}
                <CourseBoost 
                  course={course} 
                  onBoostSuccess={loadCourseData}
                />
                
                <button
                  className="w-full btn-secondary flex items-center justify-center space-x-2"
                  onClick={() => {
                  const url = `${window.location.origin}/courses/${course.id}`;
                  const shareText = `Check out this course: ${course.title}\n${url}`;
                  navigator.clipboard.writeText(shareText).then(() => {
                    alert('Course link copied to clipboard!');
                  });
                  }}
                >
                  <FiShare2 />
                  <span className="hidden sm:inline">Share Course</span>
                  <span className="sm:hidden">Share</span>
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
            { id: 'chat', label: 'Community Chat' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 border-b-2 transition-colors relative ${
                activeTab === tab.id
                  ? 'border-[#D91CD2] text-[#D91CD2]'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
              {tab.notification && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
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
              <h3 className="text-xl font-semibold mb-4">What You'll Learn</h3>
                <ul className="space-y-2 text-gray-300">
                {course.courseContent && typeof course.courseContent === 'object' && Object.keys(course.courseContent).length > 0 ? (
                  Object.entries(course.courseContent).map(([key, value]: [string, string], idx: number) => (
                  <li key={idx}>• {value}</li>
                  ))
                ) : (
                  <li>No course content available.</li>
                )}
                </ul>
            </div>

            <div className="bg-gray-900 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4">Class Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
                <div>
                  <p><strong>Category:</strong> {course.category}</p>
                  <p><strong>Duration:</strong> {course.duration} minutes</p>
                  <p><strong>Max Students:</strong> {course.maxStudents}</p>
                </div>
                <div>
                  <p><strong>Difficulty:</strong> {course.difficulty}</p>
                  <p><strong>Language:</strong> English</p>
                  <p><strong>Equipment:</strong> None required</p>
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
              <h3 className="text-xl font-semibold mb-2">Share Your Experience</h3>
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
          >
            <CommunityChat courseId={course.id} courseName={course.title} />
          </motion.div>
        )}

        {/* Payment Modal */}
        <PaymentHandler
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={(paymentId, method) => {
            console.log(`Payment successful with ID: ${paymentId} using ${method}`);
            processPaymentSuccess(paymentId, method);
          }}
          amount={course.price}
          title="Book Course"
          description={`Book "${course.title}" with ${course.coachName}`}
          userId={user?.id || ''}
        />
      </div>
    </div>
  );
}
