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
  FiMessageCircle,
  FiPackage,
  FiShoppingCart,
  FiSearch,
  FiFilter,
  FiUser,
  FiMail
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import { AppContext } from '../app/providers';
import { useAuth } from '@/lib/auth';
import { User, Course, Booking, Transaction, Review, Notification, TokenPackage, StudentTokenPackage, TokenTransaction, SellerApplication, Product, Order, MarketplaceSettings } from '@/types';
import { 
  userService, 
  courseService, 
  bookingService, 
  transactionService, 
  reviewService,
  notificationService,
  tokenPackageService,
  studentTokenPackageService,
  tokenTransactionService,
  sellerApplicationService,
  productService,
  orderService,
  marketplaceSettingsService
} from '@/lib/database';
import Card from '@/components/Card';
import { formatDate as formatDateUtil, formatDateTime } from '@/lib/dateUtils';
import { Timestamp } from 'firebase/firestore';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AdminSettings from '@/components/AdminSettings';
import ContentEditor from '@/components/ContentEditor';
import EmojiManager from '@/components/EmojiManager';
import AdminSubscriptionOverview from '@/components/AdminSubscriptionOverview';
import CreditManagement from '@/components/CreditManagement';
import AdminEarnings from '@/components/AdminEarnings';
import AdminPartnershipManagement from '@/components/AdminPartnershipManagement';
import AdminReferralDashboard from '@/components/AdminReferralDashboard';
import EmailTestPanel from '@/components/EmailTestPanel';
import Link from 'next/link';
import Image from 'next/image';
import { id } from 'zod/v4/locales';

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
  linkedinProfile: string;
  userEmail: string;
  experience: string;
  styles: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date | Timestamp;
}

export default function AdminDashboard() {
  const { t } = useTranslation(); // Initialize useTranslation
  const { user } = useAuth();
  const { language } = useContext(AppContext);
  
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
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
  const [tokenPackages, setTokenPackages] = useState<TokenPackage[]>([]);
  const [studentTokenPackages, setStudentTokenPackages] = useState<StudentTokenPackage[]>([]);
  const [tokenTransactions, setTokenTransactions] = useState<TokenTransaction[]>([]);
  
  // Marketplace state
  const [sellerApplications, setSellerApplications] = useState<SellerApplication[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<SellerApplication | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [marketplaceSettings, setMarketplaceSettings] = useState<MarketplaceSettings | null>(null);
  
  // New modal states for admin product and order management
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showItemsModal, setShowItemsModal] = useState(false);
  
  // Enhanced user management state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userFilterRole, setUserFilterRole] = useState<string>('all');
  const [userSortBy, setUserSortBy] = useState<'name' | 'email' | 'date' | 'role'>('date');
  const [userSortOrder, setUserSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'superadmin') {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load all data
      const [usersData, coursesData, bookingsData, transactionsData, reviewsData, applicationsData, tokenPackagesData, studentTokenPackagesData, tokenTransactionsData, sellerApplicationsData, productsData, ordersData, settingsData] = await Promise.all([
        userService.getAll(),
        courseService.getAll(),
        bookingService.getAll(),
        transactionService.getAll(),
        reviewService.getAll(),
        getCoachApplications(),
        tokenPackageService.getAll(),
        studentTokenPackageService.getAll(),
        tokenTransactionService.getAll(),
        sellerApplicationService.getAll(),
        productService.getAll(),
        orderService.getAll(),
        marketplaceSettingsService.get()
      ]);

      setUsers(usersData);
      setCourses(coursesData);
      setBookings(bookingsData);
      setTransactions(transactionsData);
      setReviews(reviewsData);
      setCoachApplications(applicationsData);
      setTokenPackages(tokenPackagesData);
      setStudentTokenPackages(studentTokenPackagesData);
      setTokenTransactions(tokenTransactionsData);
      setSellerApplications(sellerApplicationsData);
      setProducts(productsData);
      setOrders(ordersData);
      setMarketplaceSettings(settingsData);

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

  const updateUserRole = async (userId: string, newRole: 'student' | 'coach' | 'admin' | 'superadmin') => {
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

  // Enhanced user management helper functions
  const filteredAndSortedUsers = () => {
    let filtered = users.filter(user => {
      const matchesSearch = userSearchTerm === '' || 
        user.firstName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.lastName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(userSearchTerm.toLowerCase());
      
      const matchesRole = userFilterRole === 'all' || user.role === userFilterRole;
      
      return matchesSearch && matchesRole;
    });

    // Sort users
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (userSortBy) {
        case 'name':
          comparison = (a.firstName + ' ' + a.lastName).localeCompare(b.firstName + ' ' + b.lastName);
          break;
        case 'email':
          comparison = a.email.localeCompare(b.email);
          break;
        case 'role':
          comparison = a.role.localeCompare(b.role);
          break;
        case 'date':
        default:
          const dateA = a.createdAt instanceof Date ? a.createdAt : 
                       (a.createdAt as any)?.toDate ? (a.createdAt as any).toDate() : new Date();
          const dateB = b.createdAt instanceof Date ? b.createdAt : 
                       (b.createdAt as any)?.toDate ? (b.createdAt as any).toDate() : new Date();
          comparison = dateA.getTime() - dateB.getTime();
          break;
      }
      
      return userSortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  const openUserProfile = (user: User) => {
    setSelectedUser(user);
    setShowUserProfileModal(true);
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
      currency: 'CHF'
    }).format(amount);
  };

  // Accepts Date or Firestore Timestamp (from firebase/firestore)
  // Removed duplicate formatDate function to avoid redeclaration error.

  // Redirect if not admin or superadmin
  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <FiShield size={64} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">{t('accessDenied')}</h1>
          <p className="text-gray-400">{t('noPermission')}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-[#D91CD2] border-t-transparent rounded-full animate-spin"></div>
        <p className="ml-4 text-lg">{t('loading')}</p>
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

  // Marketplace management functions
  const handleSellerApplicationAction = async (applicationId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch(`/api/marketplace/seller-application/${applicationId}/process`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        // Reload seller applications
        const updatedApplications = await sellerApplicationService.getAll();
        setSellerApplications(updatedApplications);
      }
    } catch (error) {
      console.error('Error processing seller application:', error);
    }
  };

  const handleDeleteSellerApplication = async (applicationId: string) => {
    if (!confirm('Are you sure you want to delete this seller application? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/marketplace/seller-application/${applicationId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        // Reload seller applications
        const updatedApplications = await sellerApplicationService.getAll();
        setSellerApplications(updatedApplications);
      } else {
        console.error('Failed to delete seller application');
      }
    } catch (error) {
      console.error('Error deleting seller application:', error);
    }
  };

  const handleMarketplaceSettingsUpdate = async (settings: Partial<MarketplaceSettings>) => {
    try {
      if (marketplaceSettings?.id) {
        await marketplaceSettingsService.update(settings);
      } else {
        await marketplaceSettingsService.create(settings as Omit<MarketplaceSettings, 'id'>);
      }
      
      // Reload settings
      const updatedSettings = await marketplaceSettingsService.get();
      setMarketplaceSettings(updatedSettings);
    } catch (error) {
      console.error('Error updating marketplace settings:', error);
    }
  };

  // Helper functions for admin product and order management
  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    try {
      return formatDateUtil(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };
  
  const formatDateTimeAdmin = (date: any) => {
    if (!date) return 'N/A';
    try {
      return formatDateTime(date);
    } catch (error) {
      console.error('Error formatting date time:', error);
      return 'Invalid Date';
    }
  };

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowProductModal(true);
  };

  const handleEditProduct = (product: Product) => {
    // For now, just view the product. Edit functionality can be added later
    setSelectedProduct(product);
    setShowProductModal(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm(t('Are you sure you want to delete this product?'))) {
      try {
        await productService.delete(productId);
        // Reload products
        const updatedProducts = await productService.getAll();
        setProducts(updatedProducts);
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const handleViewOrderItems = (order: Order) => {
    setSelectedOrder(order);
    setShowItemsModal(true);
  };

  const renderMarketplaceManagement = () => {
    return (
      <div className="space-y-6">
        {/* Marketplace Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">{t('Pending Applications')}</p>
                <p className="text-2xl font-bold text-white">
                  {sellerApplications.filter(app => app.status === 'pending').length}
                </p>
              </div>
              <FiUserCheck className="text-orange-400 text-2xl" />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">{t('Active Products')}</p>
                <p className="text-2xl font-bold text-white">
                  {products.filter(p => p.isActive).length}
                </p>
              </div>
              <FiPackage className="text-green-400 text-2xl" />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">{t('Total Orders')}</p>
                <p className="text-2xl font-bold text-white">{orders.length}</p>
              </div>
              <FiShoppingCart className="text-blue-400 text-2xl" />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">{t('Revenue')}</p>
                <p className="text-2xl font-bold text-white">
                  {orders.reduce((sum, order) => sum + order.totalAmount, 0).toFixed(2)} CHF
                </p>
              </div>
              <FiDollarSign className="text-purple-400 text-2xl" />
            </div>
          </Card>
        </div>

        {/* Seller Applications */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">{t('Seller Applications')}</h3>
            <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm">
              {sellerApplications.filter(app => app.status === 'pending').length} {t('pending')}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400">{t('Applicant')}</th>
                  <th className="text-left py-3 px-4 text-gray-400">{t('Business Type')}</th>
                  <th className="text-left py-3 px-4 text-gray-400">{t('Subscription Model')}</th>
                  <th className="text-left py-3 px-4 text-gray-400">{t('Applied Date')}</th>
                  <th className="text-left py-3 px-4 text-gray-400">{t('Status')}</th>
                  <th className="text-left py-3 px-4 text-gray-400">{t('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {sellerApplications.map((application) => (
                  <tr key={application.id} className="border-b border-gray-800">
                  <td className="py-4 px-4">
                    <div>
                    <p className="text-white font-medium">{application.fullName}</p>
                    <p className="text-gray-400 text-sm">{application.email}</p>
                    <p className="text-gray-400 text-sm">{application.phone}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-gray-300">{application.activityType}</td>
                  <td className="py-4 px-4 text-gray-300">
                    <span className={`px-2 py-1 rounded text-xs ${
                    application.subscriptionModel === 'monthly' 
                      ? 'bg-blue-500/20 text-blue-400' 
                      : 'bg-green-500/20 text-green-400'
                    }`}>
                    {application.subscriptionModel === 'monthly' ? t('Monthly') : t('Commission')}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-gray-300">
                    {new Date(
                    application.createdAt instanceof Date 
                      ? application.createdAt 
                      : typeof application.createdAt === 'string'
                      ? new Date(application.createdAt)
                      : application.createdAt.toDate()
                    ).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                    application.status === 'pending' ? 'bg-orange-500/20 text-orange-400' :
                    application.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                    'bg-red-500/20 text-red-400'
                    }`}>
                    {t(application.status)}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    {application.status === 'pending' && (
                    <div className="flex space-x-2">
                      <button
                      onClick={() => handleSellerApplicationAction(application.id, 'approve')}
                      className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm transition-colors"
                      >
                      {t('Approve')}
                      </button>
                      <button
                      onClick={() => handleSellerApplicationAction(application.id, 'reject')}
                      className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors"
                      >
                      {t('Reject')}
                      </button>
                    </div>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedApplication(application);
                          setShowApplicationModal(true);
                        }}
                        className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
                      >
                        {t('View Details')}
                      </button>
                      <button
                        onClick={() => handleDeleteSellerApplication(application.id)}
                        className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-colors flex items-center"
                        title="Delete Application"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Categories Management */}
        <Card>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-white">{t('Categories Management')}</h3>
            <button 
              onClick={async () => {
                try {
                  const response = await fetch('/api/marketplace/categories/seed', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                  });
                  if (response.ok) {
                    // Refresh categories or show success message
                    const result = await response.json();
                    console.log('Categories seeded:', result);
                  }
                } catch (error) {
                  console.error('Error seeding categories:', error);
                }
              }}
              className="btn-primary"
            >
              {t('Seed Default Categories')}
            </button>
          </div>
          
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="text-blue-400 mt-1">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="text-blue-400 font-medium">{t('Category Management')}</h4>
                <p className="text-gray-400 text-sm mt-1">
                  {t('Use the "Seed Default Categories" button to create initial categories for the marketplace. This includes Sports Equipment, Sports Nutrition, Dance Equipment, Food & Beverages, Fitness Apparel, and Training Materials.')}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Marketplace Settings */}
        <Card>
          <h3 className="text-xl font-semibold text-white mb-6">{t('Marketplace Settings')}</h3>
          
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-medium text-white mb-4">{t('Commission Rates')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t('Products Commission %')}</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    defaultValue={marketplaceSettings?.commissionRates?.products || 10}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                    onBlur={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        handleMarketplaceSettingsUpdate({
                          commissionRates: {
                            products: value,
                            food: marketplaceSettings?.commissionRates?.food || 15,
                            services: marketplaceSettings?.commissionRates?.services || 12
                          }
                        });
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t('Food Commission %')}</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    defaultValue={marketplaceSettings?.commissionRates?.food || 15}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                    onBlur={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        handleMarketplaceSettingsUpdate({
                          commissionRates: {
                            products: marketplaceSettings?.commissionRates?.products || 10,
                            food: value,
                            services: marketplaceSettings?.commissionRates?.services || 12
                          }
                        });
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t('Services Commission %')}</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    defaultValue={marketplaceSettings?.commissionRates?.services || 12}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                    onBlur={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        handleMarketplaceSettingsUpdate({
                          commissionRates: {
                            products: marketplaceSettings?.commissionRates?.products || 10,
                            food: marketplaceSettings?.commissionRates?.food || 15,
                            services: value
                          }
                        });
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-medium text-white mb-4">{t('Subscription Pricing')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t('Products Monthly Fee (CHF)')}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={marketplaceSettings?.subscriptionPrices?.products || 29.99}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                    onBlur={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        handleMarketplaceSettingsUpdate({
                          subscriptionPrices: {
                            products: value,
                            food: marketplaceSettings?.subscriptionPrices?.food || 39.99,
                            services: marketplaceSettings?.subscriptionPrices?.services || 24.99
                          }
                        });
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t('Food Monthly Fee (CHF)')}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={marketplaceSettings?.subscriptionPrices?.food || 39.99}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                    onBlur={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        handleMarketplaceSettingsUpdate({
                          subscriptionPrices: {
                            products: marketplaceSettings?.subscriptionPrices?.products || 29.99,
                            food: value,
                            services: marketplaceSettings?.subscriptionPrices?.services || 24.99
                          }
                        });
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t('Services Monthly Fee (CHF)')}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={marketplaceSettings?.subscriptionPrices?.services || 24.99}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                    onBlur={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        handleMarketplaceSettingsUpdate({
                          subscriptionPrices: {
                            products: marketplaceSettings?.subscriptionPrices?.products || 29.99,
                            food: marketplaceSettings?.subscriptionPrices?.food || 39.99,
                            services: value
                          }
                        });
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Recent Orders */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">{t('Recent Orders')}</h3>
            <Link 
              href="/admin/orders" 
              className="text-purple-400 hover:text-purple-300 text-sm"
            >
              {t('View All')}
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400">{t('Order ID')}</th>
                  <th className="text-left py-3 px-4 text-gray-400">{t('Customer')}</th>
                  <th className="text-left py-3 px-4 text-gray-400">{t('Seller')}</th>
                  <th className="text-left py-3 px-4 text-gray-400">{t('Amount')}</th>
                  <th className="text-left py-3 px-4 text-gray-400">{t('Status')}</th>
                  <th className="text-left py-3 px-4 text-gray-400">{t('Date')}</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 10).map((order) => (
                  <tr key={order.id} className="border-b border-gray-800">
                    <td className="py-4 px-4 text-gray-300 font-mono text-sm">
                      #{order.orderNumber}
                    </td>
                    <td className="py-4 px-4 text-gray-300">{order.customerName}</td>
                    <td className="py-4 px-4 text-gray-300">{order.sellerName}</td>
                    <td className="py-4 px-4 text-white font-medium">
                      {order.totalAmount.toFixed(2)} CHF
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        order.orderStatus === 'processing' ? 'bg-orange-500/20 text-orange-400' :
                        order.orderStatus === 'dispatched' ? 'bg-blue-500/20 text-blue-400' :
                        order.orderStatus === 'delivered' ? 'bg-green-500/20 text-green-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {t(order.orderStatus)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-300">
                      {new Date(
                        order.createdAt instanceof Date 
                          ? order.createdAt 
                          : typeof order.createdAt === 'string'
                          ? new Date(order.createdAt)
                          : order.createdAt.toDate()
                      ).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* All Products Management */}
        <Card>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-white">{t('Products Management')}</h3>
            <span className="text-gray-400 text-sm">
              {products.length} {t('total products')}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400">{t('Product')}</th>
                  <th className="text-left py-3 px-4 text-gray-400">{t('Seller')}</th>
                  <th className="text-left py-3 px-4 text-gray-400">{t('Category')}</th>
                  <th className="text-left py-3 px-4 text-gray-400">{t('Price')}</th>
                  <th className="text-left py-3 px-4 text-gray-400">{t('Stock')}</th>
                  <th className="text-left py-3 px-4 text-gray-400">{t('Status')}</th>
                  <th className="text-left py-3 px-4 text-gray-400">{t('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {products.slice(0, 20).map((product) => (
                  <tr key={product.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                          {product.mainImage ? (
                            <Image
                              src={product.mainImage}
                              alt={product.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FiPackage className="text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-white">{product.name}</p>
                          <p className="text-sm text-gray-400 truncate max-w-xs">
                            {product.description.substring(0, 60)}...
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-white">{product.sellerName}</p>
                      <p className="text-sm text-gray-400">{product.businessName}</p>
                    </td>
                    <td className="py-4 px-4 text-gray-300">{product.categoryName}</td>
                    <td className="py-4 px-4">
                      <p className="text-white font-medium">{product.price.toFixed(2)} {product.currency}</p>
                      {product.salePrice && product.salePrice < product.price && (
                        <p className="text-sm text-green-400">Sale: {product.salePrice.toFixed(2)} {product.currency}</p>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {product.isUnlimitedStock ? (
                        <span className="text-green-400 text-sm">Unlimited</span>
                      ) : (
                        <span className={`text-sm ${product.stock > 10 ? 'text-green-400' : product.stock > 0 ? 'text-orange-400' : 'text-red-400'}`}>
                          {product.stock}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        product.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {product.isActive ? t('Active') : t('Inactive')}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowProductModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-white transition-colors"
                          title={t('View Details')}
                        >
                          <FiEye />
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const response = await fetch(`/api/marketplace/products/${product.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                  ...product,
                                  isActive: !product.isActive 
                                })
                              });
                              if (response.ok) {
                                await loadDashboardData();
                              }
                            } catch (error) {
                              console.error('Error toggling product status:', error);
                            }
                          }}
                          className={`p-2 transition-colors ${
                            product.isActive 
                              ? 'text-red-400 hover:text-red-300' 
                              : 'text-green-400 hover:text-green-300'
                          }`}
                          title={product.isActive ? t('Deactivate') : t('Activate')}
                        >
                          {product.isActive ? <FiX /> : <FiCheck />}
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(t('Are you sure you want to delete this product? This action cannot be undone.'))) {
                              try {
                                const response = await fetch(`/api/marketplace/products/${product.id}`, {
                                  method: 'DELETE'
                                });
                                if (response.ok) {
                                  await loadDashboardData();
                                }
                              } catch (error) {
                                console.error('Error deleting product:', error);
                              }
                            }
                          }}
                          className="p-2 text-red-400 hover:text-red-300 transition-colors"
                          title={t('Delete Product')}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* All Orders Management */}
        <Card>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-white">{t('Orders Management')}</h3>
            <span className="text-gray-400 text-sm">
              {orders.length} {t('total orders')}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400">{t('Order')}</th>
                  <th className="text-left py-3 px-4 text-gray-400">{t('Customer')}</th>
                  <th className="text-left py-3 px-4 text-gray-400">{t('Seller')}</th>
                  <th className="text-left py-3 px-4 text-gray-400">{t('Items')}</th>
                  <th className="text-left py-3 px-4 text-gray-400">{t('Total')}</th>
                  <th className="text-left py-3 px-4 text-gray-400">{t('Status')}</th>
                  <th className="text-left py-3 px-4 text-gray-400">{t('Date')}</th>
                  <th className="text-left py-3 px-4 text-gray-400">{t('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium text-white">#{order.orderNumber}</p>
                        <p className="text-sm text-gray-400 capitalize">{order.deliveryType}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="text-white">{order.customerName}</p>
                        <p className="text-sm text-gray-400">{order.customerEmail}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="text-white">{order.sellerName}</p>
                        <p className="text-sm text-gray-400">{order.businessName}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowItemsModal(true);
                        }}
                        className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
                      >
                        {order.items ? Object.keys(order.items).length : 0} items
                      </button>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-medium text-white">{order.totalAmount.toFixed(2)} {order.currency}</p>
                      <p className="text-sm text-gray-400">{order.paymentMethod}</p>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        order.orderStatus === 'processing' ? 'bg-orange-500/20 text-orange-400' :
                        order.orderStatus === 'confirmed' ? 'bg-blue-500/20 text-blue-400' :
                        order.orderStatus === 'preparing' ? 'bg-yellow-500/20 text-yellow-400' :
                        order.orderStatus === 'dispatched' ? 'bg-purple-500/20 text-purple-400' :
                        order.orderStatus === 'delivered' ? 'bg-green-500/20 text-green-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {t(order.orderStatus)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-400">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowOrderModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-white transition-colors"
                          title={t('View Details')}
                        >
                          <FiEye />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  // Navigation Tabs
  const tabs = [
    { id: 'overview', label: t('overview'), icon: FiBarChart2 },
    ...(user?.role === 'superadmin'
      ? [
          { id: 'users', label: t('users'), icon: FiUsers },
          { id: 'courses', label: t('courses'), icon: FiCalendar },
          { id: 'marketplace', label: t('marketplace'), icon: FiPackage },
          { id: 'referrals', label: t('Referrals'), icon: FiUsers },
          { id: 'credits', label: t('credits'), icon: FiDollarSign },
          { id: 'email-test', label: t('Email Test'), icon: FiMail },
          { id: 'settings', label: t('settings'), icon: FiSettings },
          { id: 'content', label: t('content'), icon: FiFileText },
        ]
      : []),
    { id: 'earnings', label: t('earnings'), icon: FiDollarSign },
    { id: 'subscriptions', label: t('subscriptions'), icon: FiCheck },
    { id: 'bookings', label: t('bookings'), icon: FiActivity },
    { id: 'transactions', label: t('transactions'), icon: FiDollarSign },
    { id: 'tokens', label: t('Token Packages'), icon: FiPackage },
    { id: 'partnerships', label: t('partnerships'), icon: FiUsers },
    { id: 'applications', label: t('coachApplications'), icon: FiUserCheck },
    { id: 'chat-settings', label: t('chatSettings'), icon: FiMessageCircle }
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
            {t('adminDashboard')}
          </h1>
          <p className="text-xl text-gray-400">{t('managePlatform')}</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex overflow-x-auto pb-2 mb-6 gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#D91CD2] text-white'
                  : 'bg-[#D91CD2]/10 text-gray-300 hover:bg-[#D91CD2]/20'
              }`}
            >
              {tab.label}
            </button>
          ))}
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
              {[{ label: t('totalUsers'), value: stats.totalUsers, icon: FiUsers },
                { label: t('totalCourses'), value: stats.totalCourses, icon: FiCalendar },
                { label: t('totalRevenue'), value: formatCurrency(stats.totalRevenue), icon: FiDollarSign },
                { label: t('avgRating'), value: stats.averageRating.toFixed(1), icon: FiTrendingUp }
              ].map((stat, index) => (
                <motion.div key={index} variants={item}>
                  <Card className="relative overflow-hidden">
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
            <motion.h2 variants={item} className="text-xl font-bold mt-8 mb-4">{t('quickActions')}</motion.h2>
            <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="hover:border-[#D91CD2]/40 transition-colors cursor-pointer" onClick={() => setActiveTab('users')}>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-[#D91CD2]/10 flex items-center justify-center">
                    <FiUsers className="text-[#D91CD2]" size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{t('userManagement')}</h3>
                    <p className="text-sm text-gray-400">{t('manageUserAccounts')}</p>
                  </div>
                </div>
              </Card>
              
              <Card className="hover:border-[#D91CD2]/40 transition-colors cursor-pointer" onClick={() => setActiveTab('courses')}>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-[#D91CD2]/10 flex items-center justify-center">
                    <FiCalendar className="text-[#D91CD2]" size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{t('courseManagement')}</h3>
                    <p className="text-sm text-gray-400">{t('manageCoursesAndSchedules')}</p>
                  </div>
                </div>
              </Card>
              
              <Card className="hover:border-[#D91CD2]/40 transition-colors cursor-pointer" onClick={() => setActiveTab('content')}>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-[#D91CD2]/10 flex items-center justify-center">
                    <FiFileText className="text-[#D91CD2]" size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{t('contentManagement')}</h3>
                    <p className="text-sm text-gray-400">{t('editWebsitePages')}</p>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Recent Activity */}
            <motion.div variants={item}>
              <Card>
                <h3 className="text-xl font-semibold mb-6">{t('recentActivity')}</h3>
                <div className="space-y-4">
                  {bookings.slice(0, 5).map(booking => {
                    const course = courses.find(c => c.id === booking.courseId);
                    const student = users.find(u => u.id === booking.studentId);
                    return (
                      <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
                        <div>
                          <p className="font-medium">
                            {student?.firstName} {student?.lastName} {t('booked')} "{course?.title}"
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
                  <h3 className="text-xl font-semibold">{t('userManagement')}</h3>
                  <div className="text-sm text-gray-400">
                    {t('total')}: {filteredAndSortedUsers().length} {t('users')} ({users.length} total)
                  </div>
                </div>
                
                {/* Search and Filter Controls */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder={t('Search by name or email...')}
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="bg-gray-800 border border-gray-600 rounded-lg pl-10 pr-4 py-2 w-full text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  
                  <select
                    value={userFilterRole}
                    onChange={(e) => setUserFilterRole(e.target.value)}
                    className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="all">{t('All Roles')}</option>
                    <option value="student">{t('student')}</option>
                    <option value="coach">{t('coach')}</option>
                    <option value="admin">{t('admin')}</option>
                    <option value="superadmin">{t('superadmin')}</option>
                    <option value="seller">{t('seller')}</option>
                  </select>
                  
                  <select
                    value={userSortBy}
                    onChange={(e) => setUserSortBy(e.target.value as any)}
                    className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="date">{t('Sort by Date')}</option>
                    <option value="name">{t('Sort by Name')}</option>
                    <option value="email">{t('Sort by Email')}</option>
                    <option value="role">{t('Sort by Role')}</option>
                  </select>
                  
                  <button
                    onClick={() => setUserSortOrder(userSortOrder === 'asc' ? 'desc' : 'asc')}
                    className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white hover:bg-gray-700 focus:outline-none focus:border-purple-500 flex items-center justify-center"
                  >
                    {userSortOrder === 'asc' ? '↑' : '↓'} {userSortOrder === 'asc' ? t('Ascending') : t('Descending')}
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4">{t('user')}</th>
                        <th className="text-left py-3 px-4">{t('email')}</th>
                        <th className="text-left py-3 px-4">{t('role')}</th>
                        <th className="text-left py-3 px-4">{t('credits')}</th>
                        <th className="text-left py-3 px-4">{t('joined')}</th>
                        <th className="text-left py-3 px-4">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedUsers().map(user => (
                        <tr key={user.id} className="border-b border-gray-800 hover:bg-gray-900">
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <Link href={`/profile_analytics/${encodeURIComponent(user?.email || '')}`} className="flex-shrink-0">
                                <div className="relative w-10 h-10 rounded-full overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all">
                                  {user.profileImage ? (
                                    <Image
                                      src={user.profileImage}
                                      alt={`${user.firstName} ${user.lastName}`}
                                      fill
                                      className="object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-r from-[#D91CD2] to-[#7B1FA2] flex items-center justify-center">
                                      <span className="text-sm text-white font-medium">
                                        {(user?.firstName ? user.firstName.charAt(0) : '')}
                                        {(user?.lastName ? user.lastName.charAt(0) : '')}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </Link>
                              <div>
                                <Link href={`/profile_analytics/${encodeURIComponent(user?.email || '')}`} className="text-[#D91CD2] hover:text-[#B819B5] font-medium transition-colors">
                                  {user.firstName} {user.lastName}
                                </Link>
                                <p className="text-xs text-gray-500">
                                  {t('Click to view full profile')}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-400">{user.email}</td>
                          <td className="py-3 px-4">
                            <select
                              value={user.role}
                              onChange={(e) => updateUserRole(user.id, e.target.value as any)}
                              className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs"
                            >
                              <option value="student">{t('student')}</option>
                              <option value="coach">{t('coach')}</option>
                              <option value="admin">{t('admin')}</option>
                              <option value="superadmin">{t('superadmin')}</option>
                              <option value="seller">{t('seller')}</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 text-sm">${user.credits}</td>
                          <td className="py-3 px-4 text-sm text-gray-400">
                            {formatDate(user.createdAt)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => openUserProfile(user)}
                                className="text-blue-400 hover:text-blue-300"
                                title={t('View Profile')}
                              >
                                <FiEye size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  // Set up credit modal for this user
                                  setActiveTab('credits');
                                }}
                                className="text-green-400 hover:text-green-300"
                                title={t('creditDebitUser')}
                              >
                                <FiDollarSign size={16} />
                              </button>
                              <button
                                onClick={() => deleteUser(user.id)}
                                className="text-red-400 hover:text-red-300"
                                title={t('deleteUser')}
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
                  <h3 className="text-xl font-semibold">{t('courseManagement')}</h3>
                  <div className="text-sm text-gray-400">
                    {t('total')}: {courses.length} {t('courses')}
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4">{t('course')}</th>
                        <th className="text-left py-3 px-4">{t('coach')}</th>
                        <th className="text-left py-3 px-4">{t('price')}</th>
                        <th className="text-left py-3 px-4">{t('students')}</th>
                        <th className="text-left py-3 px-4">{t('rating')}</th>
                        <th className="text-left py-3 px-4">{t('status')}</th>
                        <th className="text-left py-3 px-4">{t('actions')}</th>
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
                          <td className="py-3 px-4 text-sm">CHF {course.price}</td>
                          <td className="py-3 px-4 text-sm">
                            {course.currentStudents}/{course.maxStudents}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {course.averageRating.toFixed(1)} ({course.totalReviews})
                          </td>
                          <td className="py-3 px-4">
                            {course.boosted && (
                              <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs">
                                {t('boosted')}
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
                                title={t('viewCourse')}
                              >
                                <FiEye size={16} />
                              </a>
                              <button
                                onClick={() => deleteCourse(course.id)}
                                className="text-red-400 hover:text-red-300"
                                title={t('deleteCourse')}
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
                  <h3 className="text-xl font-semibold">{t('bookingManagement')}</h3>
                  <div className="text-sm text-gray-400">
                    {t('total')}: {bookings.length} {t('bookings')}
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4">{t('student')}</th>
                        <th className="text-left py-3 px-4">{t('course')}</th>
                        <th className="text-left py-3 px-4">{t('coach')}</th>
                        <th className="text-left py-3 px-4">{t('amount')}</th>
                        <th className="text-left py-3 px-4">{t('status')}</th>
                        <th className="text-left py-3 px-4">{t('scheduled')}</th>
                        <th className="text-left py-3 px-4">{t('booked')}</th>
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
                            <td className="py-3 px-4 text-sm">CHF {booking.paymentAmount}</td>
                            <td className="py-3 px-4">
                              <span className={`px-3 py-1 rounded-full text-xs ${
                                booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                                booking.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                booking.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {t(booking.status)}
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
                  <h3 className="text-xl font-semibold">{t('transactionHistory')}</h3>
                  <div className="text-sm text-gray-400">
                    {t('total')}: {transactions.length} {t('transactions')}
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4">{t('user')}</th>
                        <th className="text-left py-3 px-4">{t('type')}</th>
                        <th className="text-left py-3 px-4">{t('amount')}</th>
                        <th className="text-left py-3 px-4">{t('description')}</th>
                        <th className="text-left py-3 px-4">{t('status')}</th>
                        <th className="text-left py-3 px-4">{t('date')}</th>
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
                                {transaction.amount > 0 ? '+' : ''}CHF {Math.abs(transaction.amount)}
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
                                {t(transaction.status)}
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

        {/* Tokens Tab */}
        {activeTab === 'tokens' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            {/* Token Packages Overview */}
            <motion.div variants={item}>
              <Card>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold">{t('Token Packages Overview')}</h3>
                  <div className="text-sm text-gray-400">
                    {t('total')}: {tokenPackages.length} {t('packages')}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-[#D91CD2]">{tokenPackages.length}</div>
                    <div className="text-sm text-gray-400">{t('Total Packages')}</div>
                  </div>
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-400">
                      {tokenPackages.filter(pkg => {
                        const expiry = pkg.expiryDate instanceof Timestamp ? pkg.expiryDate.toDate() : new Date(pkg.expiryDate);
                        return pkg.isActive && expiry > new Date();
                      }).length}
                    </div>
                    <div className="text-sm text-gray-400">{t('Active Packages')}</div>
                  </div>
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-400">{studentTokenPackages.length}</div>
                    <div className="text-sm text-gray-400">{t('Student Purchases')}</div>
                  </div>
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-400">
                      ${tokenTransactions
                        .filter(t => t.type === 'purchase' && t.status === 'completed')
                        .reduce((sum, t) => sum + t.amount, 0)
                        .toFixed(2)
                      }
                    </div>
                    <div className="text-sm text-gray-400">{t('Total Revenue')}</div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4">{t('Package Name')}</th>
                        <th className="text-left py-3 px-4">{t('Coach')}</th>
                        <th className="text-left py-3 px-4">{t('Tokens')}</th>
                        <th className="text-left py-3 px-4">{t('Price')}</th>
                        <th className="text-left py-3 px-4">{t('Subscribers')}</th>
                        <th className="text-left py-3 px-4">{t('Status')}</th>
                        <th className="text-left py-3 px-4">{t('Expiry Date')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokenPackages.map(tokenPackage => {
                        const coach = users.find(u => u.id === tokenPackage.coachId);
                        const subscriberCount = studentTokenPackages.filter(sp => sp.packageId === tokenPackage.id).length;
                        const expiry = tokenPackage.expiryDate instanceof Timestamp ? 
                          tokenPackage.expiryDate.toDate() : 
                          new Date(tokenPackage.expiryDate);
                        const isExpired = expiry < new Date();
                        
                        return (
                          <tr key={tokenPackage.id} className="border-b border-gray-800 hover:bg-gray-900">
                            <td className="py-3 px-4 text-sm font-medium">
                              {tokenPackage.packageName}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {coach?.firstName} {coach?.lastName}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {tokenPackage.totalTokens}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              CHF {tokenPackage.price.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {subscriberCount}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-3 py-1 rounded-full text-xs ${
                                isExpired ? 'bg-red-500/20 text-red-400' :
                                tokenPackage.isActive ? 'bg-green-500/20 text-green-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {isExpired ? 'Expired' : tokenPackage.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-400">
                              {formatDate(expiry)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>

            {/* Token Transactions */}
            <motion.div variants={item}>
              <Card>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold">{t('Token Transactions')}</h3>
                  <div className="text-sm text-gray-400">
                    {t('total')}: {tokenTransactions.length} {t('transactions')}
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4">{t('Student')}</th>
                        <th className="text-left py-3 px-4">{t('Coach')}</th>
                        <th className="text-left py-3 px-4">{t('Type')}</th>
                        <th className="text-left py-3 px-4">{t('Amount')}</th>
                        <th className="text-left py-3 px-4">{t('Tokens')}</th>
                        <th className="text-left py-3 px-4">{t('Status')}</th>
                        <th className="text-left py-3 px-4">{t('Date')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokenTransactions.map(transaction => {
                        const student = users.find(u => u.id === transaction.studentId);
                        const coach = users.find(u => u.id === transaction.coachId);
                        
                        return (
                          <tr key={transaction.id} className="border-b border-gray-800 hover:bg-gray-900">
                            <td className="py-3 px-4 text-sm">
                              {student?.firstName} {student?.lastName}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {coach?.firstName} {coach?.lastName}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              <span className="capitalize">{transaction.type}</span>
                            </td>
                            <td className="py-3 px-4 text-sm">
                              CHF {transaction.amount.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              {transaction.tokensInvolved}
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
                  <h3 className="text-xl font-semibold">{t('coachApplications')}</h3>
                  <div className="text-sm text-gray-400">
                    {t('total')}: {coachApplications.length} {t('applications')} ({coachApplications.filter(app => app.status === 'pending').length} {t('pending')})
                  </div>
                </div>
                
                {coachApplications.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <FiUserCheck className="mx-auto text-4xl mb-4 opacity-50" />
                    <p>{t('noCoachApplications')}</p>
                    <p className="text-sm mt-2">{t('applicationsWillAppearHere')}</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Pending Applications */}
                    {coachApplications.filter(app => app.status === 'pending').length > 0 && (
                      <div>
                        <h4 className="text-lg font-medium mb-4 text-yellow-400">{t('pendingApplications')}</h4>
                        {coachApplications
                          .filter(app => app.status === 'pending')
                          .map(application => (
                            <div key={application.id} className="bg-gray-900 p-6 rounded-lg border border-yellow-500/30 mb-4">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h4 className="font-semibold text-lg">{application.userName}</h4>
                                  <p className="text-sm text-gray-400">{application.userEmail}</p>
                                  <Link
                                    className="font-semibold text-sm text-blue-400 hover:underline hover:text-blue-600 transition-colors"
                                    href={application.linkedinProfile}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    Linkedin
                                  </Link>
                                </div>
                                <div className="text-xs text-gray-400">
                                  {formatDate(application.createdAt)}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                  <p className="text-xs text-gray-400">{t('experience')}</p>
                                  <p>{application.experience}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400">{t('danceStyles')}</p>
                                  <p>{application.styles}</p>
                                </div>
                              </div>
                              
                              <div className="mb-6">
                                <p className="text-xs text-gray-400">{t('reasonForApplication')}</p>
                                <p className="text-sm">{application.reason}</p>
                              </div>
                              
                              <div className="flex justify-end space-x-4">
                                <button
                                  onClick={() => handleCoachApplication(application.id, application.userId, false)}
                                  className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                                >
                                  <FiX size={16} />
                                  <span>{t('reject')}</span>
                                </button>
                                <button
                                  onClick={() => handleCoachApplication(application.id, application.userId, true)}
                                  className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                                >
                                  <FiCheck size={16} />
                                  <span>{t('approve')}</span>
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                      
                    {/* Processed Applications */}
                    {coachApplications.filter(app => app.status !== 'pending').length > 0 && (
                      <div>
                        <h4 className="text-lg font-medium mb-4">{t('processedApplications')}</h4>
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
                                  {application.status === 'approved' ? t('approved') : t('rejected')}
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
                  <h2 className="text-2xl font-bold">{t('contentManagement')}</h2>
                </div>
                
                <p className="text-gray-400 mb-6">
                  {t('editWebsiteContent')}
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
                  <h2 className="text-2xl font-bold">{t('chatSettings')}</h2>
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

        {/* Earnings Tab */}
        {activeTab === 'earnings' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={item}>
              <AdminEarnings />
            </motion.div>
          </motion.div>
        )}

        {/* Referrals Tab */}
        {activeTab === 'referrals' && user?.id && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={item}>
              <AdminReferralDashboard adminId={user.id} />
            </motion.div>
          </motion.div>
        )}

        {/* Email Test Tab */}
        {activeTab === 'email-test' && user?.role === 'superadmin' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={item}>
              <EmailTestPanel />
            </motion.div>
          </motion.div>
        )}

        {/* Credits Tab */}
        {activeTab === 'credits' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={item}>
              <CreditManagement />
            </motion.div>
          </motion.div>
        )}

        {/* Marketplace Tab */}
        {activeTab === 'marketplace' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            {renderMarketplaceManagement()}
          </motion.div>
        )}

        {/* Partnerships Tab */}
        {activeTab === 'partnerships' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={item}>
              <AdminPartnershipManagement />
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* Seller Application Details Modal */}
      {showApplicationModal && selectedApplication && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h3 className="text-xl font-semibold text-white">{t('Seller Application Details')}</h3>
              <button
                onClick={() => {
                  setShowApplicationModal(false);
                  setSelectedApplication(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <FiX className="text-xl" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">{t('Basic Information')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400">{t('Full Name')}</label>
                    <p className="text-white">{selectedApplication.fullName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400">{t('Email')}</label>
                    <p className="text-white">{selectedApplication.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400">{t('Phone')}</label>
                    <p className="text-white">{selectedApplication.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400">{t('Status')}</label>
                    <span className={`px-2 py-1 rounded text-xs ${
                      selectedApplication.status === 'pending' ? 'bg-orange-500/20 text-orange-400' :
                      selectedApplication.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {t(selectedApplication.status)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Business Information */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">{t('Business Information')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400">{t('Business Name')}</label>
                    <p className="text-white">{selectedApplication.businessName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400">{t('Business Category')}</label>
                    <p className="text-white">{selectedApplication.businessCategory}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400">{t('Activity Type')}</label>
                    <p className="text-white">{selectedApplication.activityType}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400">{t('VAT Number')}</label>
                    <p className="text-white">{selectedApplication.vatNumber || 'N/A'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-400">{t('Business Description')}</label>
                    <p className="text-white">{selectedApplication.businessDescription}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-400">{t('Address')}</label>
                    <p className="text-white">{selectedApplication.address}</p>
                  </div>
                </div>
              </div>

              {/* Subscription Model */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">{t('Subscription Model')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400">{t('Model')}</label>
                    <span className={`px-2 py-1 rounded text-sm ${
                      selectedApplication.subscriptionModel === 'monthly' 
                        ? 'bg-blue-500/20 text-blue-400' 
                        : 'bg-green-500/20 text-green-400'
                    }`}>
                      {selectedApplication.subscriptionModel === 'monthly' ? t('Monthly Subscription') : t('Commission Based')}
                    </span>
                  </div>
                  {selectedApplication.subscriptionModel === 'commission' && selectedApplication.commissionRate && (
                    <div>
                      <label className="block text-sm font-medium text-gray-400">{t('Commission Rate')}</label>
                      <p className="text-white">{selectedApplication.commissionRate}%</p>
                    </div>
                  )}
                  {selectedApplication.subscriptionModel === 'monthly' && selectedApplication.monthlySubscriptionPrice && (
                    <div>
                      <label className="block text-sm font-medium text-gray-400">{t('Monthly Price')}</label>
                      <p className="text-white">{selectedApplication.monthlySubscriptionPrice} CHF</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bank Details */}
              {selectedApplication.bankDetails && (
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">{t('Bank Details')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400">{t('Account Name')}</label>
                      <p className="text-white">{selectedApplication.bankDetails.accountName || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400">{t('Bank Name')}</label>
                      <p className="text-white">{selectedApplication.bankDetails.bankName || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400">{t('IBAN')}</label>
                      <p className="text-white">{selectedApplication.bankDetails.iban || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400">{t('SWIFT Code')}</label>
                      <p className="text-white">{selectedApplication.bankDetails.swiftCode || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Social Media Links */}
              {selectedApplication.socialMediaLinks && (
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">{t('Social Media Links')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(selectedApplication.socialMediaLinks).map(([platform, url]) => (
                      url && (
                        <div key={platform}>
                          <label className="block text-sm font-medium text-gray-400">{platform.charAt(0).toUpperCase() + platform.slice(1)}</label>
                          <a href={url} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 break-all">
                            {url}
                          </a>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Documents */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">{t('Documents')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400">{t('ID Document')}</label>
                    {selectedApplication.idDocumentUrl ? (
                      <a href={selectedApplication.idDocumentUrl} target="_blank" rel="noopener noreferrer" 
                         className="text-purple-400 hover:text-purple-300 break-all">
                        {t('View Document')}
                      </a>
                    ) : (
                      <p className="text-gray-400">N/A</p>
                    )}
                  </div>
                  {selectedApplication.diplomaCertificateUrl && (
                    <div>
                      <label className="block text-sm font-medium text-gray-400">{t('Diploma Certificate')}</label>
                      <a href={selectedApplication.diplomaCertificateUrl} target="_blank" rel="noopener noreferrer" 
                         className="text-purple-400 hover:text-purple-300 break-all">
                        {t('View Certificate')}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Application Dates */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">{t('Application Timeline')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400">{t('Applied Date')}</label>
                    <p className="text-white">
                      {selectedApplication.createdAt instanceof Date 
                        ? formatDateTimeAdmin(selectedApplication.createdAt)
                        : formatDateTimeAdmin(selectedApplication.createdAt)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400">{t('Last Updated')}</label>
                    <p className="text-white">
                      {formatDateTimeAdmin(selectedApplication.updatedAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {selectedApplication.status === 'pending' && (
              <div className="p-6 border-t border-gray-700 flex justify-end space-x-4">
                <button
                  onClick={() => {
                    handleSellerApplicationAction(selectedApplication.id, 'reject');
                    setShowApplicationModal(false);
                    setSelectedApplication(null);
                  }}
                  className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  {t('Reject Application')}
                </button>
                <button
                  onClick={() => {
                    handleSellerApplicationAction(selectedApplication.id, 'approve');
                    setShowApplicationModal(false);
                    setSelectedApplication(null);
                  }}
                  className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                >
                  {t('Approve Application')}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Product Details Modal */}
      {showProductModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">
                  {t('Product Details')} - {selectedProduct.name}
                </h3>
                <button
                  onClick={() => setShowProductModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <FiX size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Product Image */}
                <div className="space-y-4">
                  <div className="aspect-square bg-gray-800 rounded-lg overflow-hidden">
                    {selectedProduct.mainImage ? (
                      <Image
                        src={selectedProduct.mainImage}
                        alt={selectedProduct.name}
                        width={400}
                        height={400}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FiPackage className="text-gray-400 text-6xl" />
                      </div>
                    )}
                  </div>
                  
                  {/* Additional Images */}
                  {selectedProduct.images && selectedProduct.images.length > 1 && (
                    <div className="grid grid-cols-4 gap-2">
                      {selectedProduct.images.slice(1, 5).map((image, index) => (
                        <div key={index} className="aspect-square bg-gray-800 rounded overflow-hidden">
                          <Image
                            src={image}
                            alt={`${selectedProduct.name} ${index + 2}`}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Product Information */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-medium text-white mb-2">{t('Basic Information')}</h4>
                    <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                      <div>
                        <span className="text-gray-400 text-sm">{t('Name')}: </span>
                        <span className="text-white">{selectedProduct.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 text-sm">{t('Category')}: </span>
                        <span className="text-white">{selectedProduct.categoryName}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 text-sm">{t('Price')}: </span>
                        <span className="text-white">{selectedProduct.price.toFixed(2)} {selectedProduct.currency}</span>
                        {selectedProduct.salePrice && selectedProduct.salePrice < selectedProduct.price && (
                          <span className="text-green-400 ml-2">
                            Sale: {selectedProduct.salePrice.toFixed(2)} {selectedProduct.currency}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-400 text-sm">{t('Stock')}: </span>
                        <span className="text-white">
                          {selectedProduct.isUnlimitedStock ? t('Unlimited') : selectedProduct.stock}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 text-sm">{t('Status')}: </span>
                        <span className={selectedProduct.isActive ? 'text-green-400' : 'text-red-400'}>
                          {selectedProduct.isActive ? t('Active') : t('Inactive')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium text-white mb-2">{t('Seller Information')}</h4>
                    <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                      <div>
                        <span className="text-gray-400 text-sm">{t('Seller')}: </span>
                        <span className="text-white">{selectedProduct.sellerName}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 text-sm">{t('Business')}: </span>
                        <span className="text-white">{selectedProduct.businessName}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-medium text-white mb-2">{t('Performance')}</h4>
                    <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                      <div>
                        <span className="text-gray-400 text-sm">{t('Views')}: </span>
                        <span className="text-white">{selectedProduct.views}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 text-sm">{t('Total Sold')}: </span>
                        <span className="text-white">{selectedProduct.totalSold}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 text-sm">{t('Rating')}: </span>
                        <span className="text-white">{selectedProduct.rating.toFixed(1)} ⭐ ({selectedProduct.reviewCount} reviews)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mt-6">
                <h4 className="text-lg font-medium text-white mb-2">{t('Description')}</h4>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-gray-300">{selectedProduct.description}</p>
                </div>
              </div>

              {/* Tags */}
              {selectedProduct.tags && selectedProduct.tags.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-lg font-medium text-white mb-2">{t('Tags')}</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.tags.map((tag, index) => (
                      <span key={index} className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Order Details Modal (reuse from SellerDashboard but simplified) */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">
                  {t('Order Details')} - #{selectedOrder.orderNumber}
                </h3>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <FiX size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-white">{t('Customer Information')}</h4>
                  <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                    <div>
                      <span className="text-gray-400 text-sm">{t('Name')}: </span>
                      <span className="text-white">{selectedOrder.customerName}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">{t('Email')}: </span>
                      <span className="text-white">{selectedOrder.customerEmail}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">{t('Phone')}: </span>
                      <span className="text-white">{selectedOrder.customerPhone}</span>
                    </div>
                  </div>
                </div>

                {/* Seller Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-white">{t('Seller Information')}</h4>
                  <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                    <div>
                      <span className="text-gray-400 text-sm">{t('Seller')}: </span>
                      <span className="text-white">{selectedOrder.sellerName}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">{t('Business')}: </span>
                      <span className="text-white">{selectedOrder.businessName}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Information */}
              <div className="mt-6">
                <h4 className="text-lg font-medium text-white mb-4">{t('Order Information')}</h4>
                <div className="bg-gray-800/50 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-gray-400 text-sm">{t('Status')}: </span>
                    <span className="text-white capitalize">{selectedOrder.orderStatus}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">{t('Payment')}: </span>
                    <span className="text-white capitalize">{selectedOrder.paymentStatus}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">{t('Delivery')}: </span>
                    <span className="text-white capitalize">{selectedOrder.deliveryType}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-sm">{t('Date')}: </span>
                    <span className="text-white">
                      {selectedOrder.createdAt instanceof Date 
                        ? selectedOrder.createdAt.toLocaleDateString()
                        : typeof selectedOrder.createdAt === 'string'
                        ? new Date(selectedOrder.createdAt).toLocaleDateString()
                        : selectedOrder.createdAt.toDate().toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="mt-6">
                <h4 className="text-lg font-medium text-white mb-4">{t('Order Items')}</h4>
                <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                  {selectedOrder.items && Object.values(selectedOrder.items).map((item: any, index: number) => (
                    <div key={item.id || index} className="flex items-center space-x-4 py-2 border-b border-gray-700 last:border-b-0">
                      <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                        {item.productImage ? (
                          <Image
                            src={item.productImage}
                            alt={item.productName || 'Product'}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FiPackage className="text-gray-400 text-xl" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h5 className="font-medium text-white">{item.productName || 'Unknown Product'}</h5>
                        <p className="text-sm text-gray-400">
                          {t('Quantity')}: {item.quantity || 1} × {(item.price || 0).toFixed(2)} {selectedOrder.currency}
                        </p>
                        {item.specialInstructions && (
                          <p className="text-xs text-purple-300 mt-1">
                            {t('Instructions')}: {item.specialInstructions}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-white">
                          {(item.subtotal || 0).toFixed(2)} {selectedOrder.currency}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="mt-6">
                <h4 className="text-lg font-medium text-white mb-4">{t('Order Summary')}</h4>
                <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('Subtotal')}:</span>
                    <span className="text-white">{selectedOrder.subtotal.toFixed(2)} {selectedOrder.currency}</span>
                  </div>
                  {selectedOrder.deliveryFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">{t('Delivery Fee')}:</span>
                      <span className="text-white">{selectedOrder.deliveryFee.toFixed(2)} {selectedOrder.currency}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('VAT')} ({selectedOrder.vatRate}%):</span>
                    <span className="text-white">{selectedOrder.vatAmount.toFixed(2)} {selectedOrder.currency}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-2 border-t border-gray-700">
                    <span className="text-white">{t('Total')}:</span>
                    <span className="text-purple-400">{selectedOrder.totalAmount.toFixed(2)} {selectedOrder.currency}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Items Modal - Simplified version for admin */}
      {showItemsModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">
                  {t('Order Items')} - #{selectedOrder.orderNumber}
                </h3>
                <button
                  onClick={() => setShowItemsModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <FiX size={24} />
                </button>
              </div>

              <div className="space-y-4">
                {selectedOrder.items && Object.values(selectedOrder.items).map((item: any, index: number) => (
                  <div key={item.id || index} className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-20 h-20 bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                        {item.productImage ? (
                          <Image
                            src={item.productImage}
                            alt={item.productName || 'Product'}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FiPackage className="text-gray-400 text-2xl" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h5 className="font-medium text-white text-lg">{item.productName || 'Unknown Product'}</h5>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-gray-400">
                            {t('Unit Price')}: {(item.price || 0).toFixed(2)} {selectedOrder.currency}
                          </p>
                          <p className="text-sm text-gray-400">
                            {t('Quantity')}: {item.quantity || 1}
                          </p>
                          <p className="text-sm font-medium text-purple-300">
                            {t('Subtotal')}: {(item.subtotal || 0).toFixed(2)} {selectedOrder.currency}
                          </p>
                          {item.specialInstructions && (
                            <p className="text-sm text-yellow-300 mt-2">
                              <strong>{t('Special Instructions')}:</strong> {item.specialInstructions}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Order Total Summary */}
                <div className="border-t border-gray-700 pt-4 mt-6">
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span className="text-white">{t('Order Total')}:</span>
                      <span className="text-purple-400">{selectedOrder.totalAmount.toFixed(2)} {selectedOrder.currency}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* User Profile Modal */}
      {showUserProfileModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white flex items-center">
                  <FiUser className="mr-2" />
                  {t('User Profile')}
                </h3>
                <button
                  onClick={() => setShowUserProfileModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <FiX size={24} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Profile Header */}
                <div className="flex items-center space-x-4 p-4 bg-gray-800/50 rounded-lg">
                  <div className="relative w-20 h-20 rounded-full overflow-hidden">
                    {selectedUser.profileImage ? (
                      <Image
                        src={selectedUser.profileImage}
                        alt={`${selectedUser.firstName} ${selectedUser.lastName}`}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-[#D91CD2] to-[#7B1FA2] flex items-center justify-center">
                        <span className="text-lg text-white font-medium">
                          {(selectedUser?.firstName ? selectedUser.firstName.charAt(0) : '')}
                          {(selectedUser?.lastName ? selectedUser.lastName.charAt(0) : '')}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-white">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </h4>
                    <p className="text-gray-400">{selectedUser.email}</p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      selectedUser.role === 'admin' || selectedUser.role === 'superadmin' ? 'bg-purple-500/20 text-purple-400' :
                      selectedUser.role === 'coach' ? 'bg-blue-500/20 text-blue-400' :
                      selectedUser.role === 'seller' ? 'bg-green-500/20 text-green-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {t(selectedUser.role)}
                    </span>
                  </div>
                </div>

                {/* Profile Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-gray-400 mb-2">{t('User ID')}</h5>
                    <p className="text-white font-mono text-sm">{selectedUser.id}</p>
                  </div>
                  
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-gray-400 mb-2">{t('credits')}</h5>
                    <p className="text-white text-lg font-semibold">${selectedUser.credits}</p>
                  </div>
                  
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-gray-400 mb-2">{t('Phone')}</h5>
                    <p className="text-white">{selectedUser.phone || t('Not provided')}</p>
                  </div>
                  
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-gray-400 mb-2">{t('Referral Code')}</h5>
                    <p className="text-white font-mono">{selectedUser.referralCode}</p>
                  </div>
                  
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-gray-400 mb-2">{t('Referred By')}</h5>
                    <p className="text-white">{selectedUser.referredBy || t('None')}</p>
                  </div>
                  
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-gray-400 mb-2">{t('Auth Provider')}</h5>
                    <p className="text-white capitalize">{selectedUser.authProvider || 'email'}</p>
                  </div>
                  
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-gray-400 mb-2">{t('joined')}</h5>
                    <p className="text-white">{formatDate(selectedUser.createdAt)}</p>
                  </div>
                  
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-gray-400 mb-2">{t('Last Updated')}</h5>
                    <p className="text-white">{formatDate(selectedUser.updatedAt)}</p>
                  </div>
                </div>

                {/* Preferences */}
                {selectedUser.preferences && (
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <h5 className="text-lg font-medium text-white mb-4">{t('Preferences')}</h5>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">{t('Email Notifications')}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          selectedUser.preferences.notifications?.email ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {selectedUser.preferences.notifications?.email ? t('Enabled') : t('Disabled')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">{t('WhatsApp Notifications')}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          selectedUser.preferences.notifications?.whatsapp ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {selectedUser.preferences.notifications?.whatsapp ? t('Enabled') : t('Disabled')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">{t('Website Notifications')}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          selectedUser.preferences.notifications?.website ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {selectedUser.preferences.notifications?.website ? t('Enabled') : t('Disabled')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">{t('Two-Factor Authentication')}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          selectedUser.preferences.twoFactorEnabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {selectedUser.preferences.twoFactorEnabled ? t('Enabled') : t('Disabled')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-700">
                  <Link
                    href={`/profile_analytics/${encodeURIComponent(selectedUser.email)}`}
                    className="btn-primary flex items-center"
                  >
                    <FiBarChart2 className="mr-2" size={16} />
                    {t('View Analytics')}
                  </Link>
                  <button
                    onClick={() => {
                      setShowUserProfileModal(false);
                      setActiveTab('credits');
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
                  >
                    <FiDollarSign className="mr-2" size={16} />
                    {t('Manage Credits')}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(t('Are you sure you want to delete this user?'))) {
                        deleteUser(selectedUser.id);
                        setShowUserProfileModal(false);
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
                  >
                    <FiTrash2 className="mr-2" size={16} />
                    {t('deleteUser')}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}