'use client';

import { useState, useContext, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiTrendingUp, FiX, FiCreditCard, FiInfo, FiStar } from 'react-icons/fi';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import { AppContext } from '../app/providers';
import { useAuth } from '@/lib/auth';
import { Course } from '@/types';
import { courseService, transactionService, notificationService, adminSettingsService } from '@/lib/database';
import PaymentHandler from '@/components/PaymentHandler';

interface CourseBoostProps {
  course: Course;
  onBoostSuccess?: () => void;
  className?: string;
}

interface BoostPricing {
  basic: number;
  premium: number;
  featured: number;
}

export default function CourseBoost({ course, onBoostSuccess, className = '' }: CourseBoostProps) {
  const { t } = useTranslation(); // Initialize useTranslation
  const { language } = useContext(AppContext);
  const { user, updateUserProfile } = useAuth();
  
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'premium' | 'featured'>('basic');
  const [isProcessing, setIsProcessing] = useState(false);
  const [boostPlans, setBoostPlans] = useState({
    basic: {
      name: t('basicBoost'),
      price: 25,
      duration: t('threeDays'),
      features: [
        t('appearInFeatured'),
        t('higherVisibilitySearch'),
        t('twentyFourSevenBoost')
      ],
      color: 'from-blue-500 to-blue-600'
    },
    premium: {
      name: t('premiumBoost'),
      price: 50,
      duration: t('sevenDays'),
      features: [
        t('topPositionFeatured'),
        t('badgeOnCourseCard'),
        t('prioritySearchResults'),
        t('weeklyBoostPeriod')
      ],
      color: 'from-purple-500 to-purple-600'
    },
    featured: {
      name: t('featuredBoost'),
      price: 100,
      duration: t('fourteenDays'),
      features: [
        t('homepageBannerPlacement'),
        t('goldFeaturedBadge'),
        t('maximumVisibilityBoost'),
        t('twoWeekBoostPeriod'),
        t('socialMediaPromotion')
      ],
      color: 'from-yellow-500 to-yellow-600'
    }
  });

  useEffect(() => {
    loadBoostPricing();
  }, []);

  const loadBoostPricing = async () => {
    try {
      const pricingRaw = await adminSettingsService.getBoostPricing();
      const pricing = pricingRaw as Partial<BoostPricing> | null;
      setBoostPlans(prev => ({
        basic: { ...prev.basic, price: pricing?.basic ?? 25 },
        premium: { ...prev.premium, price: pricing?.premium ?? 50 },
        featured: { ...prev.featured, price: pricing?.featured ?? 100 }
      }));
    } catch (error) {
      console.error('Error loading boost pricing:', error);
    }
  };

  const handleBoostCourse = async (paymentId?: string, method?: string) => {
    if (!user) return false;

    try {
      setIsProcessing(true);
      const plan = boostPlans[selectedPlan];

      // If paymentId exists, payment was successful via payment gateway
      if (!paymentId) {
        // Check if user has enough credits
        if (user.credits >= plan.price) {
          // Pay with credits
          const newCredits = user.credits - plan.price;
          await updateUserProfile({ credits: newCredits });

          // Record transaction
          await transactionService.create({
            userId: user.id,
            type: 'course_boost',
            amount: -plan.price,
            description: `${plan.name} for "${course.title}"`,
            status: 'completed'
          });
        } else {
          // Insufficient credits, show payment modal
          setShowBoostModal(false);
          setShowPaymentModal(true);
          return false;
        }
      } else {
        // Record transaction for payment gateway
        await transactionService.create({
          userId: user.id,
          type: 'course_boost',
          amount: plan.price,
          description: `${plan.name} for "${course.title}" via ${method}`,
          status: 'completed'
        });
      }

      // Calculate boost end date
      const boostEndDate = new Date();
      boostEndDate.setDate(boostEndDate.getDate() + parseInt(plan.duration.split(' ')[0]));

      // Update course with boost
      await courseService.update(course.id, {
        boosted: true,
        boostLevel: selectedPlan,
        boostEndDate
      });

      // Send notification
      await notificationService.create({
        userId: user.id,
        title: 'Course Boost Activated!',
        message: `Your course "${course.title}" is now boosted with ${plan.name} for ${plan.duration}.`,
        type: 'course',
        read: false
      });

      // Close modals
      setShowBoostModal(false);
      setShowPaymentModal(false);

      if (onBoostSuccess) {
        onBoostSuccess();
      }

      return true;
    } catch (error) {
      console.error('Error boosting course:', error);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const getRemainingBoostTime = () => {
    if (!course.boosted || !course.boostEndDate) return null;

    const now = new Date();
    // Handle both Date and timestamp (number/string)
    let endDate: Date;
    if (typeof course.boostEndDate === 'string' || typeof course.boostEndDate === 'number') {
      endDate = new Date(course.boostEndDate);
    } else if (course.boostEndDate instanceof Date) {
      endDate = course.boostEndDate;
    } else {
      return null;
    }
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return null;
    
    return diffDays === 1 ? '1 day' : `${diffDays} days`;
  };

  const remainingTime = getRemainingBoostTime();

  // Don't show boost option for students or if course is not owned by current user
  if (!user || user.role !== 'coach' || course.coachId !== user.id) {
    return null;
  }

  return (
    <div className={className}>
      {/* Boost Status/Button */}
      {course.boosted && remainingTime ? (
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black p-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FiStar className="text-black" />
            <span className="font-medium">{t('boosted')}</span>
          </div>
          <span className="text-sm">{remainingTime} {t('left')}</span>
        </div>
      ) : (
        <button
          onClick={() => setShowBoostModal(true)}
          className="w-full bg-gradient-to-r from-[#D91CD2] to-[#7B1FA2] hover:from-[#E63DE6] hover:to-[#8E24AA] text-white py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all duration-200"
        >
          <FiTrendingUp />
          <span>{t('boostCourse')}</span>
        </button>
      )}

      {/* Boost Plans Modal */}
      <AnimatePresence>
        {showBoostModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowBoostModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold">{t('boostYourCourse')}</h3>
                  <p className="text-gray-400">{t('increaseVisibilityAttractStudents')}</p>
                </div>
                <button
                  onClick={() => setShowBoostModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <FiX size={24} />
                </button>
              </div>

              {/* Boost Info */}
              <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <FiInfo className="text-blue-400 mt-1" />
                  <div>
                    <h4 className="font-medium text-blue-300">{t('howCourseBoostWorks')}</h4>
                    <p className="text-sm text-blue-200 mt-1">
                      {t('courseBoostDescription')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Plans */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {(Object.keys(boostPlans) as Array<keyof typeof boostPlans>).map((planKey) => {
                  const plan = boostPlans[planKey];
                  const isSelected = selectedPlan === planKey;
                  
                  return (
                    <motion.div
                      key={planKey}
                      onClick={() => setSelectedPlan(planKey)}
                      className={`cursor-pointer border-2 rounded-lg p-6 transition-all ${
                        isSelected 
                          ? 'border-[#D91CD2] bg-[#D91CD2]/10' 
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${plan.color} flex items-center justify-center mb-4`}>
                        <FiTrendingUp className="text-white" />
                      </div>
                      
                      <h4 className="text-lg font-semibold mb-2">{plan.name}</h4>
                      <div className="text-2xl font-bold mb-1">CHF {plan.price}</div>
                      <p className="text-sm text-gray-400 mb-4">{plan.duration}</p>
                      
                      <ul className="space-y-2">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="text-sm flex items-center">
                            <div className="w-2 h-2 bg-[#D91CD2] rounded-full mr-3"></div>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  );
                })}
              </div>

              {/* Payment Info */}
              <div className="bg-gray-800 rounded-lg p-4 mb-6">
                <h4 className="font-medium mb-2">{t('paymentOptions')}</h4>
                <div className="flex items-center justify-between text-sm">
                  <span>{t('yourCredits')}: ${user?.credits || 0}</span>
                  <span className={`${
                    (user?.credits || 0) >= boostPlans[selectedPlan].price 
                      ? 'text-green-400' 
                      : 'text-red-400'
                  }`}>
                    {(user?.credits || 0) >= boostPlans[selectedPlan].price 
                      ? t('sufficientCredits')
                      : t('insufficientCreditsCardRequired')
                    }
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowBoostModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={() => handleBoostCourse()}
                  disabled={isProcessing}
                  className="flex-1 bg-gradient-to-r from-[#D91CD2] to-[#7B1FA2] hover:from-[#E63DE6] hover:to-[#8E24AA] text-white py-3 rounded-lg transition-all disabled:opacity-50"
                >
                  {isProcessing ? t('processing') : `${t('boostFor')} CHF ${boostPlans[selectedPlan].price}`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Handler */}
      <PaymentHandler
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={(paymentId, method) => {
          console.log(`Payment successful with ID: ${paymentId} using ${method}`);
          handleBoostCourse(paymentId, method);
        }}
        amount={boostPlans[selectedPlan].price}
        title={t('courseBoostPayment')}
        description={`${t('payFor')} ${boostPlans[selectedPlan].name} - ${boostPlans[selectedPlan].duration}`}
        userId={user?.id || ''}
        courseId={course.id}
        boostType={selectedPlan.toString()}
      />
    </div>
  );
}
