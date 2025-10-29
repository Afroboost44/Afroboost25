'use client';

import { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { 
  FiUsers, 
  FiCalendar, 
  FiActivity, 
  FiBarChart2, 
  FiDollarSign,
  FiTrendingUp,
  FiEye,
  FiEdit,
  FiTrash2,
  FiShield,
  FiSettings,
  FiCheck,
  FiX,
  FiUserCheck,
  FiFileText,
  FiMessageCircle
} from 'react-icons/fi';
import { AppContext, translations } from '../app/providers';
import { useAuth } from '@/lib/auth';
import { User, Course, Booking, Transaction, Review, Notification } from '@/types';
import { 
  userService, 
  courseService, 
  bookingService, 
  transactionService, 
  reviewService,
  notificationService 
} from '@/lib/database';
import Card from '@/components/Card';
import { Timestamp } from 'firebase/firestore';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AdminSettings from '@/components/AdminSettings';
import ContentEditor from '@/components/ContentEditor';
import EmojiManager from '@/components/EmojiManager';
import AdminSubscriptionOverview from '@/components/AdminSubscriptionOverview';
import Link from 'next/link';

interface AdminStats {
  totalUsers: number;
  totalCourses: number;
  totalBookings: number;
  totalRevenue: number;
  activeCoaches: number;
  completedClasses: number;
  averageRating: number;
  monthlyGrowth: number;
}

interface CoachApplication {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  experience: string;
  styles: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date | Timestamp;
}

export default function AdminDashboard() {
  const { language } = useContext(AppContext);
  const { user } = useAuth();
  const t = translations[language];
  
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalCourses: 0,
    totalBookings: 0,
    totalRevenue: 0,
    activeCoaches: 0,
    completedClasses: 0,
    averageRating: 0,
    monthlyGrowth: 0
  });
  
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [coachApplications, setCoachApplications] = useState<CoachApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load all data
      const [usersData, coursesData, bookingsData, transactionsData, reviewsData, applicationsData] = await Promise.all([
        userService.getAll(),
        courseService.getAll(),
        bookingService.getAll(),
        transactionService.getAll(),
        reviewService.getAll(),
        getCoachApplications() // New function to get coach applications
      ]);

      setUsers(usersData);
      setCourses(coursesData);
      setBookings(bookingsData);
      setTransactions(transactionsData);
      setReviews(reviewsData);
      setCoachApplications(applicationsData);

      // Calculate stats
      const activeCoaches = usersData.filter(u => u.role === 'coach').length;
      const completedBookings = bookingsData.filter(b => b.status === 'completed');
      const totalRevenue = transactionsData
        .filter(t => t.type === 'course_purchase' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);
      const averageRating = reviewsData.length > 0 
        ? reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length 
        : 0;

      setStats({
        totalUsers: usersData.length,
        totalCourses: coursesData.length,
        totalBookings: bookingsData.length,
        totalRevenue,
        activeCoaches,
        completedClasses: completedBookings.length,
        averageRating,
        monthlyGrowth: 12.5 // This would normally be calculated from historical data
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get coach applications
  const getCoachApplications = async (): Promise<CoachApplication[]> => {
    try {
      console.log('Fetching coach applications...');
      const applicationsQuery = query(
        collection(db, 'coachApplications'),
        where('status', '==', 'pending')
      );
      const querySnapshot = await getDocs(applicationsQuery);

      const applications = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Application data:', data);
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        };
      }) as CoachApplication[];

      console.log('Fetched applications:', applications.length);
      return applications;
    } catch (error) {
      console.error('Error fetching coach applications:', error);
      return [];
    }
  };

  const updateUserRole = async (userId: string, newRole: 'student' | 'coach' | 'admin') => {
    try {
      await userService.update(userId, { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      
      // Send notification to user
      await notificationService.create({
        userId,
        title: 'Role Updated',
        message: `Your role has been updated to ${newRole}.`,
        type: 'system',
        read: false
      });
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  const deleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }

    try {
      await courseService.delete(courseId);
      setCourses(prev => prev.filter(c => c.id !== courseId));
    } catch (error) {
      console.error('Error deleting course:', error);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    try {
      await userService.delete(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleCoachApplication = async (applicationId: string, userId: string, approved: boolean) => {
    try {
      const applicationRef = doc(db, 'coachApplications', applicationId);

      if (approved) {
        // Update user role to coach
        await updateUserRole(userId, 'coach');

        // Update application status to approved
        await updateDoc(applicationRef, { status: 'approved' });

        // Update local state
        setCoachApplications(prev =>
          prev.map(app => (app.id === applicationId ? { ...app, status: 'approved' } : app))
        );

        // Send notification to user
        await notificationService.create({
          userId,
          title: 'Coach Application Approved',
          message: 'Congratulations! Your application to become a coach has been approved.',
          type: 'system',
          read: false,
        });
      } else {
        // Update application status to rejected
        await updateDoc(applicationRef, { status: 'rejected' });

        // Update local state
        setCoachApplications(prev =>
          prev.map(app => (app.id === applicationId ? { ...app, status: 'rejected' } : app))
        );

        // Send notification to user
        await notificationService.create({
          userId,
          title: 'Coach Application Rejected',
          message: 'Your application to become a coach has been reviewed and rejected.',
          type: 'system',
          read: false,
        });
      }
    } catch (error) {
      console.error('Error handling coach application:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Accepts Date or Firestore Timestamp (from firebase/firestore)
  const formatDate = (date: Date | { toDate: () => Date }) => {
    const realDate = (date instanceof Date)
      ? date
      : typeof date === 'object' && typeof date.toDate === 'function'
        ? date.toDate()
        : new Date(date as any);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(realDate);
  };

  // Redirect if not admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <FiShield size={64} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-[#D91CD2] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

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

  // Navigation Tabs
  const tabs = [
    { id: 'overview', label: 'Overview', icon: FiBarChart2 },
    { id: 'users', label: 'Users', icon: FiUsers },
    { id: 'courses', label: 'Courses', icon: FiCalendar },
    { id: 'bookings', label: 'Bookings', icon: FiActivity },
    { id: 'transactions', label: 'Transactions', icon: FiDollarSign },
    { id: 'coach-applications', label: 'Coach Applications', icon: FiUserCheck },
    { id: 'settings', label: 'Settings', icon: FiSettings },
    { id: 'content', label: 'Content', icon: FiFileText },
    { id: 'chat-settings', label: 'Chat Settings', icon: FiMessageCircle }
  ];

  return (
    <div className="min-h-screen bg-black py-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
            Admin Dashboard
          </h1>
          <p className="text-xl text-gray-400">
            Manage your dance platform
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex overflow-x-auto pb-2 mb-6 gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-[#D91CD2] text-white'
                : 'bg-[#D91CD2]/10 text-gray-300 hover:bg-[#D91CD2]/20'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-[#D91CD2] text-white'
                : 'bg-[#D91CD2]/10 text-gray-300 hover:bg-[#D91CD2]/20'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              activeTab === 'courses'
                ? 'bg-[#D91CD2] text-white'
                : 'bg-[#D91CD2]/10 text-gray-300 hover:bg-[#D91CD2]/20'
            }`}
          >
            Courses
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              activeTab === 'bookings'
                ? 'bg-[#D91CD2] text-white'
                : 'bg-[#D91CD2]/10 text-gray-300 hover:bg-[#D91CD2]/20'
            }`}
          >
            Bookings
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              activeTab === 'applications'
                ? 'bg-[#D91CD2] text-white'
                : 'bg-[#D91CD2]/10 text-gray-300 hover:bg-[#D91CD2]/20'
            }`}
          >
            Coach Applications
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              activeTab === 'content'
                ? 'bg-[#D91CD2] text-white'
                : 'bg-[#D91CD2]/10 text-gray-300 hover:bg-[#D91CD2]/20'
            }`}
          >
            Content
          </button>
          <button
            onClick={() => setActiveTab('chat-settings')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              activeTab === 'chat-settings'
                ? 'bg-[#D91CD2] text-white'
                : 'bg-[#D91CD2]/10 text-gray-300 hover:bg-[#D91CD2]/20'
            }`}
          >
            Chat Settings
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-[#D91CD2] text-white'
                : 'bg-[#D91CD2]/10 text-gray-300 hover:bg-[#D91CD2]/20'
            }`}
          >
            Settings
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              activeTab === 'subscriptions'
                ? 'bg-[#D91CD2] text-white'
                : 'bg-[#D91CD2]/10 text-gray-300 hover:bg-[#D91CD2]/20'
            }`}
          >
            Subscriptions
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-8"
          >
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Users', value: stats.totalUsers, icon: FiUsers, color: 'from-blue-500 to-blue-600' },
                { label: 'Total Courses', value: stats.totalCourses, icon: FiCalendar, color: 'from-green-500 to-green-600' },
                { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), icon: FiDollarSign, color: 'from-yellow-500 to-yellow-600' },
                { label: 'Avg Rating', value: stats.averageRating.toFixed(1), icon: FiTrendingUp, color: 'from-purple-500 to-purple-600' }
              ].map((stat, index) => (
                <motion.div key={index} variants={item}>
                  <Card className="relative overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-10`}></div>
                    <div className="relative">
                      <div className="flex items-center justify-between mb-4">
                        <stat.icon size={24} className="text-gray-400" />
                        <span className="text-2xl font-bold">{stat.value}</span>
                      </div>
                      <p className="text-sm text-gray-400">{stat.label}</p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Quick Actions */}
            <motion.h2 variants={item} className="text-xl font-bold mt-8 mb-4">Quick Actions</motion.h2>
            <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="hover:border-[#D91CD2]/40 transition-colors cursor-pointer" onClick={() => setActiveTab('users')}>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-[#D91CD2]/10 flex items-center justify-center">
                    <FiUsers className="text-[#D91CD2]" size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">User Management</h3>
                    <p className="text-sm text-gray-400">Manage user accounts and permissions</p>
                  </div>
                </div>
              </Card>
              
              <Card className="hover:border-[#D91CD2]/40 transition-colors cursor-pointer" onClick={() => setActiveTab('courses')}>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-[#D91CD2]/10 flex items-center justify-center">
                    <FiCalendar className="text-[#D91CD2]" size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Course Management</h3>
                    <p className="text-sm text-gray-400">Manage courses and schedules</p>
                  </div>
                </div>
              </Card>
              
              <Card className="hover:border-[#D91CD2]/40 transition-colors cursor-pointer" onClick={() => setActiveTab('content')}>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-[#D91CD2]/10 flex items-center justify-center">
                    <FiFileText className="text-[#D91CD2]" size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Content Management</h3>
                    <p className="text-sm text-gray-400">Edit website pages and content</p>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Recent Activity */}
            <motion.div variants={item}>
              <Card>
                <h3 className="text-xl font-semibold mb-6">Recent Activity</h3>
                <div className="space-y-4">
                  {bookings.slice(0, 5).map(booking => {
                    const course = courses.find(c => c.id === booking.courseId);
                    const student = users.find(u => u.id === booking.studentId);
                    return (
                      <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
                        <div>
                          <p className="font-medium">
                            {student?.firstName} {student?.lastName} booked "{course?.title}"
                          </p>
                          <p className="text-sm text-gray-400">{formatDate(booking.createdAt)}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs ${
                          booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                          booking.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          booking.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={item}>
              <Card>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold">User Management</h3>
                  <div className="text-sm text-gray-400">
                    Total: {users.length} users
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4">User</th>
                        <th className="text-left py-3 px-4">Email</th>
                        <th className="text-left py-3 px-4">Role</th>
                        <th className="text-left py-3 px-4">Credits</th>
                        <th className="text-left py-3 px-4">Joined</th>
                        <th className="text-left py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <tr key={user.id} className="border-b border-gray-800 hover:bg-gray-900">
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gradient-to-r from-[#D91CD2] to-[#7B1FA2] rounded-full flex items-center justify-center">
                                <span className="text-xs text-white">
                                  {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                                </span>
                              </div>
                              <Link href={`/profile_analytics/${encodeURIComponent(user.email)}`} className="text-[#D91CD2] hover:underline">
                                {user.firstName} {user.lastName}
                              </Link>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-400">{user.email}</td>
                          <td className="py-3 px-4">
                            <select
                              value={user.role}
                              onChange={(e) => updateUserRole(user.id, e.target.value as any)}
                              className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs"
                            >
                              <option value="student">Student</option>
                              <option value="coach">Coach</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 text-sm">${user.credits}</td>
                          <td className="py-3 px-4 text-sm text-gray-400">
                            {formatDate(user.createdAt)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => deleteUser(user.id)}
                                className="text-red-400 hover:text-red-300"
                                title="Delete User"
                              >
                                <FiTrash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* Courses Tab */}
        {activeTab === 'courses' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={item}>
              <Card>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold">Course Management</h3>
                  <div className="text-sm text-gray-400">
                    Total: {courses.length} courses
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4">Course</th>
                        <th className="text-left py-3 px-4">Coach</th>
                        <th className="text-left py-3 px-4">Price</th>
                        <th className="text-left py-3 px-4">Students</th>
                        <th className="text-left py-3 px-4">Rating</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map(course => (
                        <tr key={course.id} className="border-b border-gray-800 hover:bg-gray-900">
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <img
                                src={course.imageUrl}
                                alt={course.title}
                                className="w-12 h-12 object-cover rounded"
                              />
                              <div>
                                {/* Course title as link */}
                                <a
                                  href={`/courses/${course.id}`}
                                  className="font-medium text-[#D91CD2] hover:text-white transition-colors cursor-pointer"
                                  style={{ textDecoration: 'underline', cursor: 'pointer' }}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {course.title}
                                </a>
                                <p className="text-xs text-gray-400">{course.category}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm">{course.coachName}</td>
                          <td className="py-3 px-4 text-sm">${course.price}</td>
                          <td className="py-3 px-4 text-sm">
                            {course.currentStudents}/{course.maxStudents}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {course.averageRating.toFixed(1)} ({course.totalReviews})
                          </td>
                          <td className="py-3 px-4">
                            {course.boosted && (
                              <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs">
                                Boosted
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex space-x-2">
                              <a
                                href={`/courses/${course.id}`}
                                className="text-blue-400 hover:text-blue-300"
                                target="_blank"
                                rel="noopener noreferrer"
                                title="View Course"
                              >
                                <FiEye size={16} />
                              </a>
                              <button
                                onClick={() => deleteCourse(course.id)}
                                className="text-red-400 hover:text-red-300"
                              >
                                <FiTrash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={item}>
              <Card>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold">Booking Management</h3>
                  <div className="text-sm text-gray-400">
                    Total: {bookings.length} bookings
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4">Student</th>
                        <th className="text-left py-3 px-4">Course</th>
                        <th className="text-left py-3 px-4">Coach</th>
                        <th className="text-left py-3 px-4">Amount</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Scheduled</th>
                        <th className="text-left py-3 px-4">Booked</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map(booking => {
                        const course = courses.find(c => c.id === booking.courseId);
                        const student = users.find(u => u.id === booking.studentId);
                        const coach = users.find(u => u.id === booking.coachId);
                        
                        return (
                          <tr key={booking.id} className="border-b border-gray-800 hover:bg-gray-900">
                            <td className="py-3 px-4 text-sm">
                              {student?.firstName} {student?.lastName}
                            </td>
                            <td className="py-3 px-4 text-sm">{course?.title}</td>
                            <td className="py-3 px-4 text-sm">{coach?.firstName} {coach?.lastName}</td>
                            <td className="py-3 px-4 text-sm">${booking.paymentAmount}</td>
                            <td className="py-3 px-4">
                              <span className={`px-3 py-1 rounded-full text-xs ${
                                booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                                booking.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                booking.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {booking.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-400">
                              {formatDate(booking.scheduledDate)}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-400">
                              {formatDate(booking.createdAt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={item}>
              <Card>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold">Transaction History</h3>
                  <div className="text-sm text-gray-400">
                    Total: {transactions.length} transactions
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4">User</th>
                        <th className="text-left py-3 px-4">Type</th>
                        <th className="text-left py-3 px-4">Amount</th>
                        <th className="text-left py-3 px-4">Description</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map(transaction => {
                        const transactionUser = users.find(u => u.id === transaction.userId);
                        
                        return (
                          <tr key={transaction.id} className="border-b border-gray-800 hover:bg-gray-900">
                            <td className="py-3 px-4 text-sm">
                              {transactionUser?.firstName} {transactionUser?.lastName}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              <span className="capitalize">{transaction.type.replace('_', ' ')}</span>
                            </td>
                            <td className="py-3 px-4 text-sm">
                              <span className={transaction.amount > 0 ? 'text-green-400' : 'text-red-400'}>
                                {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-400">
                              {transaction.description}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-3 py-1 rounded-full text-xs ${
                                transaction.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                transaction.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {transaction.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-400">
                              {formatDate(transaction.createdAt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* Coach Applications Tab */}
        {activeTab === 'applications' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={item}>
              <Card>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold">Coach Applications</h3>
                  <div className="text-sm text-gray-400">
                    Total: {coachApplications.length} applications ({coachApplications.filter(app => app.status === 'pending').length} pending)
                  </div>
                </div>
                
                {coachApplications.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <FiUserCheck className="mx-auto text-4xl mb-4 opacity-50" />
                    <p>No coach applications at this time.</p>
                    <p className="text-sm mt-2">Applications will appear here when users apply to become coaches.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Pending Applications */}
                    {coachApplications.filter(app => app.status === 'pending').length > 0 && (
                      <div>
                        <h4 className="text-lg font-medium mb-4 text-yellow-400">Pending Applications</h4>
                        {coachApplications
                          .filter(app => app.status === 'pending')
                          .map(application => (
                            <div key={application.id} className="bg-gray-900 p-6 rounded-lg border border-yellow-500/30 mb-4">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h4 className="font-semibold text-lg">{application.userName}</h4>
                                  <p className="text-sm text-gray-400">{application.userEmail}</p>
                                </div>
                                <div className="text-xs text-gray-400">
                                  {formatDate(application.createdAt)}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                  <p className="text-xs text-gray-400">Experience</p>
                                  <p>{application.experience}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400">Dance Styles</p>
                                  <p>{application.styles}</p>
                                </div>
                              </div>
                              
                              <div className="mb-6">
                                <p className="text-xs text-gray-400">Reason for Application</p>
                                <p className="text-sm">{application.reason}</p>
                              </div>
                              
                              <div className="flex justify-end space-x-4">
                                <button
                                  onClick={() => handleCoachApplication(application.id, application.userId, false)}
                                  className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                                >
                                  <FiX size={16} />
                                  <span>Reject</span>
                                </button>
                                <button
                                  onClick={() => handleCoachApplication(application.id, application.userId, true)}
                                  className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                                >
                                  <FiCheck size={16} />
                                  <span>Approve</span>
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                      
                    {/* Processed Applications */}
                    {coachApplications.filter(app => app.status !== 'pending').length > 0 && (
                      <div>
                        <h4 className="text-lg font-medium mb-4">Processed Applications</h4>
                        <div className="space-y-4">
                          {coachApplications
                            .filter(app => app.status !== 'pending')
                            .map(application => (
                              <div key={application.id} className="bg-gray-900 p-4 rounded-lg flex justify-between items-center">
                                <div>
                                  <h5 className="font-medium">{application.userName}</h5>
                                  <p className="text-xs text-gray-400">{application.userEmail}</p>
                                  <p className="text-xs text-gray-400">{formatDate(application.createdAt)}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs ${
                                  application.status === 'approved' 
                                    ? 'bg-green-500/20 text-green-400' 
                                    : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {application.status === 'approved' ? 'Approved' : 'Rejected'}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </motion.div>
          </motion.div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={item}>
              <AdminSettings />
            </motion.div>
          </motion.div>
        )}

        {/* Content Tab */}
        {activeTab === 'content' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={item}>
              <div className="space-y-8">
                <div className="flex items-center space-x-3 mb-4">
                  <FiFileText className="text-[#D91CD2]" size={24} />
                  <h2 className="text-2xl font-bold">Content Management</h2>
                </div>
                
                <p className="text-gray-400 mb-6">
                  Edit website content for various pages. Changes will be immediately visible to all users.
                </p>
                
                <div className="space-y-8">
                  <ContentEditor contentType="about" />
                  <ContentEditor contentType="privacy" />
                  <ContentEditor contentType="terms" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'chat-settings' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={item}>
              <div className="space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <FiMessageCircle className="text-[#D91CD2]" size={24} />
                  <h2 className="text-2xl font-bold">Chat Settings</h2>
                </div>
                
                <EmojiManager />
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={item}>
              <AdminSubscriptionOverview />
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}