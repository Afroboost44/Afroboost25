'use client';

import { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiFilter, FiStar, FiClock, FiUsers, FiDollarSign, FiGrid, FiCalendar } from 'react-icons/fi';
import { AppContext, translations } from '../providers';
import { Course } from '@/types';
import { courseService, danceCategoryService } from '@/lib/database';
import { useAuth } from '@/lib/auth';
import PaymentModal from '@/components/PaymentModal';
import StripePaymentModal from '@/components/StripePaymentModal';
import PaymentHandler from '@/components/PaymentHandler';
import CourseCalendar from '@/components/CourseCalendar';
import { PaymentDetails } from '@/types';
import { bookingService, transactionService, notificationService } from '@/lib/database';
import Link from 'next/link';

type ViewMode = 'grid' | 'calendar';

export default function Courses() {
  const { language } = useContext(AppContext);
  const { user, updateUserProfile } = useAuth();
  const t = translations[language];
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>(['All']);

  const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];

  // Load courses and categories on mount
  useEffect(() => {
    loadCourses();
    loadCategories();
  }, []);

  // Filter courses when search/filter changes
  useEffect(() => {
    filterCourses();
  }, [courses, searchTerm, selectedCategory, selectedDifficulty]);

  const loadCourses = async () => {
    try {
      const allCourses = await courseService.getAll();
      setCourses(allCourses);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const categoriesData = await danceCategoryService.getAll();
      const defaultCategories = ['Afrobeat', 'Hip-Hop', 'Contemporary', 'Salsa', 'Bachata', 'Kizomba', 'Jazz', 'Ballet', 'Breakdance', 'Latin'];
      // If categoriesData only has { id: string }, use id as the category name
      const customCategories = categoriesData.map(cat => (cat as any).name ?? cat.id);
      const allCategories = ['All', ...new Set([...defaultCategories, ...customCategories])];
      setCategories(allCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories(['All', 'Afrobeat', 'Hip-Hop', 'Contemporary', 'Salsa', 'Bachata', 'Kizomba', 'Jazz', 'Ballet']);
    }
  };

  const filterCourses = () => {
    let filtered = courses;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(course => 
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.coachName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(course => course.category === selectedCategory);
    }

    // Difficulty filter
    if (selectedDifficulty !== 'All') {
      filtered = filtered.filter(course => course.difficulty === selectedDifficulty);
    }

    // Sort: Boosted courses first, then by creation date
    filtered.sort((a, b) => {
      if (a.boosted && !b.boosted) return -1;
      if (!a.boosted && b.boosted) return 1;
      if (a.boosted && b.boosted) {
        // Sort boosted courses by boost level (featured > premium > basic)
        const boostOrder = { featured: 3, premium: 2, basic: 1 };
        const aLevel = boostOrder[a.boostLevel || 'basic'];
        const bLevel = boostOrder[b.boostLevel || 'basic'];
        return bLevel - aLevel;
      }
      
      // Convert timestamps to milliseconds for comparison
      const getTime = (timestamp: any): number => {
        if (timestamp instanceof Date) {
          return timestamp.getTime();
        } else if (timestamp && typeof timestamp.toDate === 'function') {
          return timestamp.toDate().getTime();
        } else {
          return new Date(timestamp).getTime();
        }
      };
      
      return getTime(b.createdAt) - getTime(a.createdAt);
    });

    setFilteredCourses(filtered);
  };

  const handleBookCourse = (course: Course) => {
    if (!user) {
      // Redirect to login
      window.location.href = '/login';
      return;
    }

    setSelectedCourse(course);
    setShowPaymentModal(true);
  };

  const processPaymentSuccess = async (paymentId: string, method: string) => {
    if (!selectedCourse || !user) return;

    try {
      // Record transaction
      await transactionService.create({
        userId: user.id,
        type: 'course_purchase',
        amount: selectedCourse.price,
        description: `Purchased: ${selectedCourse.title} via ${method}`,
        status: 'completed'
      });

      // Create booking
      await bookingService.create({
        courseId: selectedCourse.id,
        studentId: user.id,
        coachId: selectedCourse.coachId,
        status: 'confirmed',
        paymentStatus: 'completed',
        paymentAmount: selectedCourse.price,
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next week
      });

      // Update course student count
      await courseService.update(selectedCourse.id, {
        currentStudents: selectedCourse.currentStudents + 1
      });

      // Send notification
      await notificationService.create({
        userId: user.id,
        title: 'Course Booked Successfully!',
        message: `You have successfully booked "${selectedCourse.title}". Check your dashboard for details.`,
        type: 'booking',
        read: false
      });

      // Reload courses to update student count
      await loadCourses();
      setShowPaymentModal(false);
      
      return true;
    } catch (error) {
      console.error('Booking error:', error);
      return false;
    }
  };

  const formatDate = (timestamp: any) => {
    let date: Date;
    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (timestamp && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }
    return new Date(date).toLocaleDateString();
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-[#D91CD2] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-6xl font-bold gradient-text mb-6">
            {t.courses}
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Discover amazing dance classes with professional coaches
          </p>
        </motion.div>

        {/* Search and Filters */}
        <div className="mb-12 space-y-6">
          {/* Search */}
          <div className="relative max-w-md mx-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
              <FiSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search courses, coaches..."
              className="input-primary w-full pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap justify-center gap-6">
            {/* View Mode Toggle */}
            <div className="flex bg-black/40 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  viewMode === 'grid'
                    ? 'bg-[#D91CD2] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <FiGrid size={16} />
                Grid
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  viewMode === 'calendar'
                    ? 'bg-[#D91CD2] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <FiCalendar size={16} />
                Calendar
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <FiFilter className="text-[#D91CD2]" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input-primary"
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="input-primary"
            >
              {difficulties.map(difficulty => (
                <option key={difficulty} value={difficulty}>{difficulty}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Content based on view mode */}
        {viewMode === 'calendar' ? (
          <CourseCalendar onBookCourse={(courseId) => {
            const course = courses.find(c => c.id === courseId);
            if (course) handleBookCourse(course);
          }} />
        ) : (
          /* Courses Grid */
          filteredCourses.length === 0 ? (
            <div className="text-center py-20">
              <h3 className="text-2xl font-semibold mb-4">No courses found</h3>
              <p className="text-gray-400">Try adjusting your search or filters</p>
            </div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {filteredCourses.map((course) => (
              <motion.div
                key={course.id}
                variants={item}
                className="card overflow-hidden hover:transform hover:scale-105 transition-all duration-300"
              >
                <div className="relative">
                  <img
                    src={course.imageUrl}
                    alt={course.title}
                    className="w-full h-48 object-cover"
                  />
                  {course.boosted && (
                    <div className="absolute top-2 left-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs font-bold px-2 py-1 rounded">
                      BOOSTED
                    </div>
                  )}
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs ${
                    course.difficulty === 'Beginner' ? 'bg-green-500' :
                    course.difficulty === 'Intermediate' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}>
                    {course.difficulty}
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-semibold mb-2">{course.title}</h3>
                  {/* Course Category */}
                  <div className="mb-2">
                    <span className="inline-block bg-[#D91CD2]/10 text-[#D91CD2] text-xs font-medium px-2 py-1 rounded">
                      {course.category}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">{course.description}</p>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-400 mb-4">
                    <span className="flex items-center">
                      <FiStar className="mr-1 text-yellow-400" />
                      {course.averageRating.toFixed(1)} ({course.totalReviews})
                    </span>
                    <span className="flex items-center">
                      <FiClock className="mr-1" />
                      {course.duration}m
                    </span>
                    <span className="flex items-center">
                      <FiUsers className="mr-1" />
                      {course.currentStudents}/{course.maxStudents}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-gray-400">Coach</p>
                      <p className="font-medium">{course.coachName}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center text-2xl font-bold gradient-text">
                        <FiDollarSign size={20} />
                        {course.price}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Link href={`/courses/${course.id}`} className="btn-secondary w-full text-center">
                      View Details
                    </Link>
                    <button
                      onClick={() => handleBookCourse(course)}
                      disabled={course.currentStudents >= course.maxStudents}
                      className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {course.currentStudents >= course.maxStudents ? 'Fully Booked' : 'Book Now'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
          )
        )}

        {/* Payment Modal */}
        {selectedCourse && (
          <PaymentHandler
            isOpen={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            onSuccess={(paymentId, method) => {
              console.log(`Payment successful with ID: ${paymentId} using ${method}`);
              processPaymentSuccess(paymentId, method);
            }}
            amount={selectedCourse.price}
            title="Book Course"
            description={`Book "${selectedCourse.title}" with ${selectedCourse.coachName}`}
            userId={user?.id || ''}
          />
        )}
      </div>
    </div>
  );
}
