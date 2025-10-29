'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiCalendar, FiUsers, FiPackage, FiSettings } from 'react-icons/fi';
import { AppContext, translations } from '../providers';
import { useContext } from 'react';
import Card from '@/components/Card';
import CourseManagement from '@/components/CourseManagement';
import SubscriptionManager from '@/components/SubscriptionManager';
import CoachSubscriptionBookings from '@/components/CoachSubscriptionBookings';
import { useAuth } from '@/lib/auth';
import { bookingService } from '@/lib/database';
import { Booking } from '@/types';
import { formatDate } from '@/lib/dateUtils';

const CoachDashboard = () => {
  const { language } = useContext(AppContext);
  const { user } = useAuth();
  const t = translations[language];
  const [activeTab, setActiveTab] = useState('courses');
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadBookings();
    }
  }, [user]);

  const loadBookings = async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const coachBookings = await bookingService.getByCoach(user.id);
      setBookings(coachBookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const courseParticipants = bookings.filter(booking => 
    selectedCourse ? booking.courseId === selectedCourse : true
  );

  const handleSelectCourse = (courseId: string) => {
    setSelectedCourse(courseId);
    setActiveTab('participants');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-[#D91CD2] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
      {/* Sidebar Navigation */}
      <div className="lg:col-span-1">
        <Card className="lg:sticky lg:top-24">
          <h2 className="text-lg lg:text-xl font-semibold mb-4 lg:mb-6">{t.dashboard}</h2>
          <nav className="space-y-1 lg:space-y-2">
            <button
              onClick={() => setActiveTab('courses')}
              className={`w-full text-left px-3 lg:px-4 py-2 lg:py-3 rounded-lg flex items-center text-sm lg:text-base ${
                activeTab === 'courses' ? 'bg-[#D91CD2]/20 text-[#D91CD2]' : 'hover:bg-black/40'
              }`}
            >
              <FiCalendar className="mr-2 lg:mr-3" size={16} />
              <span className="hidden sm:inline lg:inline">{t.courseManagement}</span>
              <span className="sm:hidden lg:hidden">Courses</span>
            </button>
            <button
              onClick={() => setActiveTab('participants')}
              className={`w-full text-left px-3 lg:px-4 py-2 lg:py-3 rounded-lg flex items-center text-sm lg:text-base ${
                activeTab === 'participants' ? 'bg-[#D91CD2]/20 text-[#D91CD2]' : 'hover:bg-black/40'
              }`}
            >
              <FiUsers className="mr-2 lg:mr-3" size={16} />
              <span className="hidden sm:inline lg:inline">{t.participantList}</span>
              <span className="sm:hidden lg:hidden">Participants</span>
            </button>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`w-full text-left px-3 lg:px-4 py-2 lg:py-3 rounded-lg flex items-center text-sm lg:text-base ${
                activeTab === 'subscriptions' ? 'bg-[#D91CD2]/20 text-[#D91CD2]' : 'hover:bg-black/40'
              }`}
            >
              <FiPackage className="mr-2 lg:mr-3" size={16} />
              <span className="hidden sm:inline lg:inline">Subscription Plans</span>
              <span className="sm:hidden lg:hidden">Plans</span>
            </button>
            <button
              onClick={() => setActiveTab('session-management')}
              className={`w-full text-left px-3 lg:px-4 py-2 lg:py-3 rounded-lg flex items-center text-sm lg:text-base ${
                activeTab === 'session-management' ? 'bg-[#D91CD2]/20 text-[#D91CD2]' : 'hover:bg-black/40'
              }`}
            >
              <FiUsers className="mr-2 lg:mr-3" size={16} />
              <span className="hidden sm:inline lg:inline">Session Management</span>
              <span className="sm:hidden lg:hidden">Sessions</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full text-left px-3 lg:px-4 py-2 lg:py-3 rounded-lg flex items-center text-sm lg:text-base ${
                activeTab === 'settings' ? 'bg-[#D91CD2]/20 text-[#D91CD2]' : 'hover:bg-black/40'
              }`}
            >
              <FiSettings className="mr-2 lg:mr-3" size={16} />
              <span className="hidden sm:inline lg:inline">Pricing Settings</span>
              <span className="sm:hidden lg:hidden">Settings</span>
            </button>
          </nav>
        </Card>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-3">
        {/* Course Management */}
        {activeTab === 'courses' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            <CourseManagement onSelectCourse={handleSelectCourse} />
          </motion.div>
        )}

        {/* Participants */}
        {activeTab === 'participants' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={item}>
              <Card>
                <h2 className="text-xl font-semibold mb-6">
                  {selectedCourse ? 'Course Participants' : 'All Participants'}
                </h2>
                
                {courseParticipants.length > 0 ? (
                  <div className="space-y-4">
                    {courseParticipants.map((booking) => (
                      <div key={booking.id} className="bg-black/40 p-3 lg:p-4 rounded-lg">
                        <div className="flex flex-col lg:flex-row lg:justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="font-medium text-sm lg:text-base">Booking #{booking.id.slice(0, 8)}</h3>
                            <p className="text-xs lg:text-sm text-gray-400">Student ID: {booking.studentId.slice(0, 12)}...</p>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center lg:flex-col lg:items-end gap-2 lg:gap-1">
                            <span className={`px-2 py-1 rounded-full text-xs w-fit ${
                              booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                              booking.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                              booking.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </span>
                            <p className="text-xs lg:text-sm text-gray-400">
                              {formatDate(booking.scheduledDate)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-700 flex flex-col sm:flex-row sm:justify-between gap-2">
                          <span className="text-xs lg:text-sm">
                            Payment: ${booking.paymentAmount}
                          </span>
                          <span className={`text-xs lg:text-sm w-fit ${
                            booking.paymentStatus === 'completed' ? 'text-green-400' :
                            booking.paymentStatus === 'pending' ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>
                            {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-black/40 p-8 rounded-lg text-center">
                    <FiUsers className="mx-auto text-4xl text-gray-500 mb-3" />
                    <p className="text-gray-400">No participants found</p>
                  </div>
                )}
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* Subscription Management */}
        {activeTab === 'subscriptions' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            <SubscriptionManager />
          </motion.div>
        )}

        {/* Session Management */}
        {activeTab === 'session-management' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            <CoachSubscriptionBookings />
          </motion.div>
        )}

        {/* Settings */}
        {activeTab === 'settings' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={item}>
              <Card>
                <h2 className="text-xl font-semibold mb-6">Pricing Settings</h2>
                <p className="text-gray-400">
                  Use the Subscription Management tab to configure your subscription plans and pricing.
                </p>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CoachDashboard;