<<<<<<< HEAD
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiCalendar, FiUsers, FiPackage, FiSettings, FiDollarSign, FiCheckCircle, FiPercent, FiShare2, FiUser, FiSearch, FiFilter } from 'react-icons/fi';
import Image from 'next/image';
import Link from 'next/link';

import { useContext } from 'react';
import Card from '@/components/Card';
import CourseManagement from '@/components/CourseManagement';
import SessionManagement from '@/components/SessionManagement';
import CoachEarnings from '@/components/CoachEarnings';
import TokenManagement from '@/components/TokenManagement';
import GiftCardManagement from '@/components/GiftCardManagement';
import DiscountCardManagement from '@/components/DiscountCardManagement';
import ReferralSystem from '@/components/ReferralSystem';
import CoachReferralDashboard from '@/components/CoachReferralDashboard';
import { useAuth } from '@/lib/auth';
import { bookingService, userService, courseService } from '@/lib/database';
import { Booking, User, Course } from '@/types';
import { formatDate } from '@/lib/dateUtils';
import { Translation, useTranslation } from 'react-i18next';
import { use } from 'i18next';

const CoachDashboard = () => {
  
  const { user } = useAuth();
  const{t} = useTranslation();
  const [activeTab, setActiveTab] = useState('courses');
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [participantUsers, setParticipantUsers] = useState<{[key: string]: User}>({});
  const [courses, setCourses] = useState<{[key: string]: Course}>({});
  const [isLoading, setIsLoading] = useState(true);
  
  // Search and filter states for participants
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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
      
      // Load user data for all participants
      const userIds = [...new Set(coachBookings.map(booking => booking.studentId))];
      const usersData: {[key: string]: User} = {};
      
      await Promise.all(
        userIds.map(async (userId) => {
          try {
            const userData = await userService.getById(userId);
            if (userData) {
              usersData[userId] = userData;
            }
          } catch (error) {
            console.error(`Error loading user ${userId}:`, error);
          }
        })
      );
      
      setParticipantUsers(usersData);

      // Load course data for all bookings
      const courseIds = [...new Set(coachBookings.map(booking => booking.courseId))];
      const coursesData: {[key: string]: Course} = {};
      
      await Promise.all(
        courseIds.map(async (courseId) => {
          try {
            const courseData = await courseService.getById(courseId);
            if (courseData) {
              coursesData[courseId] = courseData;
            }
          } catch (error) {
            console.error(`Error loading course ${courseId}:`, error);
          }
        })
      );
      
      setCourses(coursesData);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get date from various formats
  const getBookingDate = (booking: Booking): Date => {
    try {
      // Prioritize createdAt to avoid the 1-week difference issue
      if (booking.createdAt) {
        // Handle Firestore timestamp
        if (typeof booking.createdAt === 'object' && 'toDate' in booking.createdAt) {
          return booking.createdAt.toDate();
        }
        // Handle string or number
        return new Date(booking.createdAt);
      }
      // Fallback to scheduledDate
      if (booking.scheduledDate) {
        if (typeof booking.scheduledDate === 'object' && 'toDate' in booking.scheduledDate) {
          return booking.scheduledDate.toDate();
        }
        return new Date(booking.scheduledDate);
      }
      return new Date();
    } catch (error) {
      console.error('Error parsing booking date:', error);
      return new Date();
    }
  };

  // Filter participants based on search criteria
  const getFilteredParticipants = () => {
    let filtered = bookings.filter(booking => 
      selectedCourse ? booking.courseId === selectedCourse : true
    );

    // Filter by search term (participant name, email, or course name)
    if (searchTerm) {
      filtered = filtered.filter(booking => {
        const participant = participantUsers[booking.studentId];
        const course = courses[booking.courseId];
        if (!participant) return false;
        
        const fullName = `${participant.firstName || ''} ${participant.lastName || ''}`.toLowerCase();
        const email = (participant.email || '').toLowerCase();
        const courseName = (course?.title || '').toLowerCase();
        const search = searchTerm.toLowerCase();
        
        return fullName.includes(search) || email.includes(search) || courseName.includes(search);
      });
    }

    // Filter by specific date
    if (dateFilter) {
      filtered = filtered.filter(booking => {
        const bookingDate = getBookingDate(booking);
        const filterDate = new Date(dateFilter);
        return bookingDate.toDateString() === filterDate.toDateString();
      });
    }

    // Filter by week
    if (startDateFilter || endDateFilter) {
      filtered = filtered.filter(booking => {
        const bookingDate = getBookingDate(booking);
        const bookingDateOnly = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate());
        
        if (startDateFilter && endDateFilter) {
          const startDate = new Date(startDateFilter);
          const endDate = new Date(endDateFilter);
          return bookingDateOnly >= startDate && bookingDateOnly <= endDate;
        } else if (startDateFilter) {
          const startDate = new Date(startDateFilter);
          return bookingDateOnly >= startDate;
        } else if (endDateFilter) {
          const endDate = new Date(endDateFilter);
          return bookingDateOnly <= endDate;
        }
        return true;
      });
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    return filtered;
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

  // Use filtered participants instead of courseParticipants
  const filteredParticipants = getFilteredParticipants();

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
          <h2 className="text-lg lg:text-xl font-semibold mb-4 lg:mb-6">{t('Dashboard')}</h2>
          <nav className="space-y-1 lg:space-y-2">
            <button
              onClick={() => setActiveTab('courses')}
              className={`w-full text-left px-3 lg:px-4 py-2 lg:py-3 rounded-lg flex items-center text-sm lg:text-base ${
                activeTab === 'courses' ? 'bg-[#D91CD2]/20 text-[#D91CD2]' : 'hover:bg-black/40'
              }`}
            >
              <FiCalendar className="mr-2 lg:mr-3" size={16} />
              <span className="hidden sm:inline lg:inline">{t('Course Management')}</span>
              <span className="sm:hidden lg:hidden">{t('Courses')}</span>
            </button>
            <button
              onClick={() => setActiveTab('participants')}
              className={`w-full text-left px-3 lg:px-4 py-2 lg:py-3 rounded-lg flex items-center text-sm lg:text-base ${
                activeTab === 'participants' ? 'bg-[#D91CD2]/20 text-[#D91CD2]' : 'hover:bg-black/40'
              }`}
            >
              <FiUsers className="mr-2 lg:mr-3" size={16} />
              <span className="hidden sm:inline lg:inline">{t('Participant List')}</span>
              <span className="sm:hidden lg:hidden">{t('Participants')}</span>
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`w-full text-left px-3 lg:px-4 py-2 lg:py-3 rounded-lg flex items-center text-sm lg:text-base ${
                activeTab === 'sessions' ? 'bg-[#D91CD2]/20 text-[#D91CD2]' : 'hover:bg-black/40'
              }`}
            >
              <FiPackage className="mr-2 lg:mr-3" size={16} />
              <span className="hidden sm:inline lg:inline">{t('Session Management')}</span>
              <span className="sm:hidden lg:hidden">{t('Sessions')}</span>
            </button>

            <button
              onClick={() => setActiveTab('earnings')}
              className={`w-full text-left px-3 lg:px-4 py-2 lg:py-3 rounded-lg flex items-center text-sm lg:text-base ${
              activeTab === 'earnings' ? 'bg-[#D91CD2]/20 text-[#D91CD2]' : 'hover:bg-black/40'
              }`}
            >
              <span className="mr-2 lg:mr-3 font-bold text-lg">CHF</span>
              <span className="hidden sm:inline lg:inline">{t('Earnings')}</span>
              <span className="sm:hidden lg:hidden">{t('Earnings')}</span>
            </button>

            <button
              onClick={() => setActiveTab('tokens')}
              className={`w-full text-left px-3 lg:px-4 py-2 lg:py-3 rounded-lg flex items-center text-sm lg:text-base ${
                activeTab === 'tokens' ? 'bg-[#D91CD2]/20 text-[#D91CD2]' : 'hover:bg-black/40'
              }`}
            >
              <FiPackage className="mr-2 lg:mr-3" size={16} />
              <span className="hidden sm:inline lg:inline">{t('Token Packages')}</span>
              <span className="sm:hidden lg:hidden">{t('Tokens')}</span>
            </button>

            <button
              onClick={() => setActiveTab('gift-cards')}
              className={`w-full text-left px-3 lg:px-4 py-2 lg:py-3 rounded-lg flex items-center text-sm lg:text-base ${
                activeTab === 'gift-cards' ? 'bg-[#D91CD2]/20 text-[#D91CD2]' : 'hover:bg-black/40'
              }`}
            >
              <FiCheckCircle className="mr-2 lg:mr-3" size={16} />
              <span className="hidden sm:inline lg:inline">{t('Gift Cards')}</span>
              <span className="sm:hidden lg:hidden">{t('Cards')}</span>
            </button>

            <button
              onClick={() => setActiveTab('discount-cards')}
              className={`w-full text-left px-3 lg:px-4 py-2 lg:py-3 rounded-lg flex items-center text-sm lg:text-base ${
                activeTab === 'discount-cards' ? 'bg-[#D91CD2]/20 text-[#D91CD2]' : 'hover:bg-black/40'
              }`}
            >
              <FiPercent className="mr-2 lg:mr-3" size={16} />
              <span className="hidden sm:inline lg:inline">{t('Discount Cards')}</span>
              <span className="sm:hidden lg:hidden">{t('Discounts')}</span>
            </button>

            <button
              onClick={() => setActiveTab('referrals')}
              className={`w-full text-left px-3 lg:px-4 py-2 lg:py-3 rounded-lg flex items-center text-sm lg:text-base ${
                activeTab === 'referrals' ? 'bg-[#D91CD2]/20 text-[#D91CD2]' : 'hover:bg-black/40'
              }`}
            >
              <FiShare2 className="mr-2 lg:mr-3" size={16} />
              <span className="hidden sm:inline lg:inline">{t('Referral Program')}</span>
              <span className="sm:hidden lg:hidden">{t('Referrals')}</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full text-left px-3 lg:px-4 py-2 lg:py-3 rounded-lg flex items-center text-sm lg:text-base ${
                activeTab === 'settings' ? 'bg-[#D91CD2]/20 text-[#D91CD2]' : 'hover:bg-black/40'
              }`}
            >
              <FiSettings className="mr-2 lg:mr-3" size={16} />
              <span className="hidden sm:inline lg:inline">{t('Pricing Settings')}</span>
              <span className="sm:hidden lg:hidden">{t('Settings')}</span>
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
                <div className="flex flex-col space-y-6">
                  <h2 className="text-xl font-semibold">
                    {selectedCourse ? 'Course Participants' : 'All Participants'}
                  </h2>
                  
                  {/* Search and Filter Controls */}
                  <div className="bg-gray-900/50 p-4 rounded-lg space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Search by Name */}
                      <div className="relative">
                        <FiSearch className="absolute left-3 top-3 text-gray-400" size={16} />
                        <input
                          type="text"
                          placeholder={t('Search by name, email, or course...')}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 text-sm"
                        />
                      </div>
                      
                      {/* Date Filter */}
                      <div className="relative">
                        <FiCalendar className="absolute left-3 top-3 text-gray-400" size={16} />
                        <input
                          type="date"
                          placeholder={t('Filter by date')}
                          value={dateFilter}
                          onChange={(e) => setDateFilter(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500 text-sm"
                        />
                      </div>
                      
                      {/* Date Range Label */}
                      <div className="col-span-1 md:col-span-2 lg:col-span-4">
                        <p className="text-sm font-medium text-gray-300 mb-2">{t('Date Range Filter')}</p>
                      </div>
                      {/* Date Range Filter */}
                      <div className="relative">
                        <FiCalendar className="absolute left-3 top-3 text-gray-400" size={16} />
                        <input
                          type="date"
                          placeholder={t('Start date')}
                          value={startDateFilter}
                          onChange={(e) => {
                            const newStartDate = e.target.value;
                            setStartDateFilter(newStartDate);
                            // If end date is before new start date, clear it
                            if (endDateFilter && newStartDate && new Date(newStartDate) > new Date(endDateFilter)) {
                              setEndDateFilter('');
                            }
                          }}
                          className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500 text-sm"
                          title={t('Filter from this date onwards')}
                        />
                      </div>
                      
                      {/* End Date Filter */}
                      <div className="relative">
                        <FiCalendar className="absolute left-3 top-3 text-gray-400" size={16} />
                        <input
                          type="date"
                          placeholder={t('End date')}
                          value={endDateFilter}
                          onChange={(e) => setEndDateFilter(e.target.value)}
                          min={startDateFilter} // Prevent selecting date before start date
                          className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500 text-sm"
                          title={t('Filter up to this date')}
                        />
                      </div>
                      
                      {/* Status Filter */}
                      <div className="relative">
                        <FiFilter className="absolute left-3 top-3 text-gray-400" size={16} />
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500 text-sm appearance-none"
                        >
                          <option value="all">{t('All status')}</option>
                          <option value="confirmed">{t('Confirmed')}</option>
                          <option value="pending">{t('Pending')}</option>
                          <option value="completed">{t('Completed')}</option>
                          <option value="cancelled">{t('Cancelled')}</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* Clear Filters Button */}
                    {(searchTerm || dateFilter || startDateFilter || endDateFilter || statusFilter !== 'all') && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setDateFilter('');
                            setStartDateFilter('');
                            setEndDateFilter('');
                            setStatusFilter('all');
                          }}
                          className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                        >
                          {t('Clear Filters')}
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Results Summary */}
                  <div className="text-sm text-gray-400">
                    {t('Showing')} {filteredParticipants.length} {t('of')} {bookings.length} {t('participants')}
                    {selectedCourse && ` ${t('for selected course')}`}
                    {(startDateFilter || endDateFilter) && (
                      <div className="mt-1">
                        {startDateFilter && endDateFilter ? 
                          `${t('Date range')}: ${new Date(startDateFilter).toLocaleDateString('en-GB')} - ${new Date(endDateFilter).toLocaleDateString('en-GB')}` :
                          startDateFilter ? 
                            `${t('From')}: ${new Date(startDateFilter).toLocaleDateString('en-GB')}` :
                            `${t('Until')}: ${new Date(endDateFilter).toLocaleDateString('en-GB')}`
                        }
                      </div>
                    )}
                  </div>
                </div>
                
                {filteredParticipants.length > 0 ? (
                  <div className="space-y-4">
                    {filteredParticipants.map((booking) => {
                      const participant = participantUsers[booking.studentId];
                      const course = courses[booking.courseId];
                      return (
                        <div key={booking.id} className="bg-black/40 p-4 rounded-lg">
                          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 mb-3">
                            {/* Profile Picture */}
                            <Link href={`/profile_analytics/${encodeURIComponent(participant?.email || '')}`} className="flex-shrink-0 self-start sm:self-center">
                              <div className="relative w-12 h-12 rounded-full overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all">
                                {participant?.profileImage ? (
                                  <Image
                                    src={participant.profileImage}
                                    alt={`${participant.firstName} ${participant.lastName}`}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-r from-[#D91CD2] to-[#7B1FA2] flex items-center justify-center">
                                    <span className="text-sm text-white font-medium">
                                      {participant?.firstName?.charAt(0) || 'U'}
                                      {participant?.lastName?.charAt(0) || ''}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </Link>
                            
                            {/* User Info */}
                            <div className="flex-1 min-w-0">
                              <Link href={`/profile_analytics/${encodeURIComponent(participant?.email || '')}`} className="hover:text-purple-400 transition-colors">
                                <h3 className="font-medium text-base truncate">
                                  {participant ? `${participant.firstName} ${participant.lastName}` : `User ${booking.studentId.slice(0, 8)}`}
                                </h3>
                              </Link>
                              <p className="text-sm text-gray-400 truncate">{participant?.email || 'Email not available'}</p>
                              <p className="text-sm text-blue-300 truncate font-medium">{course?.title || 'Course not available'}</p>
                              <p className="text-xs text-gray-500">{t('Booking ID: ')} {booking.id.slice(0, 8)}</p>
                            </div>
                            
                            {/* Status and Date - Mobile: Full width, Desktop: Right aligned */}
                            <div className="flex flex-row sm:flex-col sm:text-right items-start sm:items-end space-x-4 sm:space-x-0 sm:space-y-1">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                                booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                                booking.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                booking.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {t(booking.status.charAt(0).toUpperCase() + booking.status.slice(1))}
                              </span>
                              <p className="text-xs text-gray-400 whitespace-nowrap">
                                {formatDate(booking.createdAt, 'en-GB')}
                              </p>
                            </div>
                          </div>
                          
                          {/* Payment Info */}
                          <div className="pt-3 border-t border-gray-700 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
                            <span className="text-sm">
                              {t('Payment:')} CHF {booking.paymentAmount}
                            </span>
                            <span className={`text-sm ${
                              booking.paymentStatus === 'completed' ? 'text-green-400' :
                              booking.paymentStatus === 'pending' ? 'text-yellow-400' :
                              'text-red-400'
                            }`}>
                              {t(booking.paymentStatus?.charAt(0).toUpperCase() + booking.paymentStatus?.slice(1) || 'Unknown')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-black/40 p-8 rounded-lg text-center">
                    <FiUsers className="mx-auto text-4xl text-gray-500 mb-3" />
                    <p className="text-gray-400">{t('No participants found')}</p>
                  </div>
                )}
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* Session Management */}
        {activeTab === 'sessions' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            <SessionManagement />
          </motion.div>
        )}

        {/* Earnings */}
        {activeTab === 'earnings' && user?.id && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            <CoachEarnings coachId={user.id} />
          </motion.div>
        )}

        {/* Token Management */}
        {activeTab === 'tokens' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            <TokenManagement />
          </motion.div>
        )}

        {/* Gift Card Management */}
        {activeTab === 'gift-cards' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            <GiftCardManagement userType="coach" />
          </motion.div>
        )}

        {/* Discount Card Management */}
        {activeTab === 'discount-cards' && user?.id && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            <DiscountCardManagement coachId={user.id} />
          </motion.div>
        )}

        {/* Referral Program */}
        {activeTab === 'referrals' && user?.id && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            <CoachReferralDashboard />
            {/* Keep the original referral system as a secondary component if needed */}
            {/* <ReferralSystem userId={user.id} userType="coach" /> */}
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
                <h2 className="text-xl font-semibold mb-6">{t('Course Session Settings')}</h2>
                <p className="text-gray-400">
                  {t(' Use the Session Management tab to manage student sessions and track course progress.')}
                </p>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

=======
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

>>>>>>> ddd273af2a7b494359b5df1cd43dbc83468035f0
export default CoachDashboard;