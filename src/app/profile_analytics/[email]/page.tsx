'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FiUser, FiCalendar, FiClock, FiBookOpen, FiBarChart2, FiActivity, FiCreditCard } from 'react-icons/fi';
import Card from '@/components/Card';
import { useAuth } from '@/lib/auth';
import { userService, bookingService, reviewService, transactionService } from '@/lib/database';
import { User, Booking, Review, Transaction } from '@/types';
import dynamic from 'next/dynamic';
import { useTranslation } from 'react-i18next'; // Import useTranslation

// Dynamically import charts to avoid SSR issues
const LineChart = dynamic(() => import('react-apexcharts'), { ssr: false });
const DonutChart = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function ProfileAnalytics({ params }: { params: Promise<{ email: string }> }) {
  const { t } = useTranslation(); // Initialize useTranslation
  const router = useRouter();
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [decodedEmail, setDecodedEmail] = useState<string>('');

  useEffect(() => {
    const unwrapParams = async () => {
      const resolvedParams = await params;
      setDecodedEmail(decodeURIComponent(resolvedParams.email));
    };
    
    unwrapParams();
  }, [params]);

  useEffect(() => {
    if (!decodedEmail) return;
    
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch user data
        const userData = await userService.getByEmail(decodedEmail);
        if (!userData) {
          console.error('User not found');
          router.push('/404');
          return;
        }
        
        setUser(userData);
        
        // Fetch user's bookings
        const userBookings = await bookingService.getByStudent(userData.id);
        setBookings(userBookings);
        
        // Fetch user's reviews
        const userReviews = await reviewService.getByUser(userData.id);
        setReviews(userReviews);
        
        // Fetch user's transactions
        const userTransactions = await transactionService.getByUser(userData.id);
        setTransactions(userTransactions);
        
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (!authLoading) {
      fetchUserData();
    }
  }, [decodedEmail, router, authLoading]);

  // Check if current user has permission to view this page
  useEffect(() => {
    if (!authLoading && currentUser && decodedEmail) {
      // Allow if viewing own profile or if admin/coach/superadmin
      if (currentUser.email !== decodedEmail && currentUser.role !== 'admin' && currentUser.role !== 'coach' && currentUser.role !== 'superadmin') {
        router.push('/dashboard');
      }
    }
  }, [currentUser, decodedEmail, router, authLoading]);

  // Format date for display
  const formatDate = (dateOrTimestamp: any) => {
    if (!dateOrTimestamp) return 'N/A';
    const date = dateOrTimestamp instanceof Date ? dateOrTimestamp : new Date(dateOrTimestamp.seconds * 1000);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Calculate days since joined
  const calculateDaysSinceJoined = () => {
    if (!user?.createdAt) return 0;
    const createdDate = user.createdAt instanceof Date 
      ? user.createdAt 
      : new Date(user.createdAt.seconds * 1000);
    const diffTime = Math.abs(new Date().getTime() - createdDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Prepare data for booking activity chart
  const prepareBookingActivityData = () => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return date.toLocaleDateString('en-US', { month: 'short' });
    }).reverse();
    
    const bookingCounts = last6Months.map(month => {
      return bookings.filter(booking => {
        const bookingDate = booking.createdAt instanceof Date 
          ? booking.createdAt 
          : new Date(booking.createdAt.seconds * 1000);
        return bookingDate.toLocaleDateString('en-US', { month: 'short' }) === month;
      }).length;
    });
    
    return {
      options: {
        chart: {
          id: 'booking-activity',
          toolbar: {
            show: false
          },
          foreColor: '#FFFFFF'
        },
        xaxis: {
          categories: last6Months
        },
        stroke: {
          curve: 'smooth',
          width: 3
        },
        colors: ['#D91CD2'],
        grid: {
          borderColor: '#333333',
          strokeDashArray: 5
        },
        markers: {
          size: 5,
          colors: ['#D91CD2'],
          strokeWidth: 0
        },
        tooltip: {
          theme: 'dark'
        }
      },
      series: [
        {
          name: 'Bookings',
          data: bookingCounts
        }
      ]
    };
  };

  // Prepare data for booking status chart
  const prepareBookingStatusData = () => {
    const statuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    const statusCounts = statuses.map(status => 
      bookings.filter(booking => booking.status === status).length
    );
    
    return {
      options: {
        chart: {
          type: 'donut',
          foreColor: '#FFFFFF'
        },
        labels: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
        colors: ['#7000FF', '#00EEFF', '#00FF88', '#FF5555'],
        legend: {
          position: 'bottom'
        },
        tooltip: {
          theme: 'dark'
        }
      },
      series: statusCounts
    };
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#D91CD2] border-t-transparent rounded-full animate-spin"></div>
        <p className="ml-4 text-lg">{t('loading')}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold gradient-text mb-8">{t('userNotFound')}</h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold gradient-text mb-8">{t('profileAnalytics')}</h1>

        {/* User Profile Header */}
        <Card className="mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="relative w-32 h-32 rounded-full overflow-hidden bg-[#D91CD2]/20 flex items-center justify-center">
              {user.profileImage ? (
                <Image 
                  src={user.profileImage} 
                  alt={t('profileImageAlt')} 
                  fill 
                  className="object-cover"
                />
              ) : (
                <FiUser size={60} className="text-[#D91CD2]" />
              )}
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold mb-2">{user.firstName} {user.lastName}</h2>
              <p className="text-gray-300 mb-2">{user.email}</p>
              <p className="text-gray-400 mb-4">{t('role')}: <span className="capitalize">{user.role}</span></p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="bg-black/50 p-3 rounded-lg border border-[#D91CD2]/30">
                  <div className="flex items-center gap-2 mb-1">
                    <FiCalendar className="text-[#D91CD2]" />
                    <span className="text-sm">{t('joined')}</span>
                  </div>
                  <p className="font-bold">{formatDate(user.createdAt)}</p>
                </div>
                
                <div className="bg-black/50 p-3 rounded-lg border border-[#D91CD2]/30">
                  <div className="flex items-center gap-2 mb-1">
                    <FiClock className="text-[#D91CD2]" />
                    <span className="text-sm">{t('daysActive')}</span>
                  </div>
                  <p className="font-bold">{calculateDaysSinceJoined()}</p>
                </div>
                
                <div className="bg-black/50 p-3 rounded-lg border border-[#D91CD2]/30">
                  <div className="flex items-center gap-2 mb-1">
                    <FiBookOpen className="text-[#D91CD2]" />
                    <span className="text-sm">{t('bookings')}</span>
                  </div>
                  <p className="font-bold">{bookings.length}</p>
                </div>
                
                <div className="bg-black/50 p-3 rounded-lg border border-[#D91CD2]/30">
                  <div className="flex items-center gap-2 mb-1">
                    <FiCreditCard className="text-[#D91CD2]" />
                    <span className="text-sm">{t('credits')}</span>
                  </div>
                  <p className="font-bold">{user.credits}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button 
            className={`px-4 py-2 rounded-full text-sm ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('overview')}
          >
            {t('overview')}
          </button>
          <button 
            className={`px-4 py-2 rounded-full text-sm ${activeTab === 'bookings' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('bookings')}
          >
            {t('bookings')}
          </button>
          <button 
            className={`px-4 py-2 rounded-full text-sm ${activeTab === 'transactions' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('transactions')}
          >
            {t('transactions')}
          </button>
          <button 
            className={`px-4 py-2 rounded-full text-sm ${activeTab === 'reviews' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('reviews')}
          >
            {t('reviews')}
          </button>
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {/* Activity Chart */}
              <Card className="lg:col-span-2">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <FiActivity className="text-[#D91CD2]" /> {t('bookingActivity')}
                </h3>
                <div className="h-80">
                  {typeof window !== 'undefined' && (
                    <LineChart
                      options={{
                        ...prepareBookingActivityData().options,
                        stroke: {
                          ...prepareBookingActivityData().options.stroke,
                          curve: "smooth" as const
                        }
                      }}
                      series={prepareBookingActivityData().series}
                      type="line"
                      height="100%"
                    />
                  )}
                </div>
              </Card>

              {/* Booking Status Chart */}
              <Card>
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <FiBarChart2 className="text-[#D91CD2]" /> {t('bookingStatus')}
                </h3>
                <div className="h-80">
                  {typeof window !== 'undefined' && (
                    <DonutChart
                      options={{
                        ...prepareBookingStatusData().options,
                        chart: {
                          ...prepareBookingStatusData().options.chart,
                          type: "donut"
                        },
                        legend: {
                          ...prepareBookingStatusData().options.legend,
                          position: "bottom"
                        }
                      }}
                      series={prepareBookingStatusData().series}
                      type="donut"
                      height="100%"
                    />
                  )}
                </div>
              </Card>

              {/* Recent Activity */}
              <Card className="lg:col-span-3">
                <h3 className="text-xl font-semibold mb-4">{t('recentActivity')}</h3>
                <div className="space-y-4">
                  {[...bookings, ...transactions]
                    .sort((a, b) => {
                      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt.seconds * 1000);
                      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt.seconds * 1000);
                      return dateB.getTime() - dateA.getTime();
                    })
                    .slice(0, 5)
                    .map((item, index) => {
                      const isBooking = 'courseId' in item;
                      return (
                        <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-black/30 border border-[#D91CD2]/20">
                          <div className="w-10 h-10 rounded-full bg-[#D91CD2]/20 flex items-center justify-center">
                            {isBooking ? (
                              <FiCalendar className="text-[#D91CD2]" />
                            ) : (
                              <FiCreditCard className="text-[#D91CD2]" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">
                              {isBooking ? `${t('booking')} ${(item as Booking).status}` : `${(item as Transaction).type} - ${(item as Transaction).status}`}
                            </p>
                            <p className="text-sm text-gray-400">
                              {formatDate(item.createdAt)}
                            </p>
                          </div>
                          <div className="ml-auto text-right">
                            {isBooking ? (
                              <span className={`text-sm px-2 py-1 rounded-full ${
                                (item as Booking).status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                (item as Booking).status === 'confirmed' ? 'bg-blue-500/20 text-blue-400' :
                                (item as Booking).status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                                'bg-purple-500/20 text-purple-400'
                              }`}>
                                {(item as Booking).status}
                              </span>
                            ) : (
                              <span className="font-medium">
                                CHF {(item as Transaction).amount}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </Card>
            </>
          )}

          {/* Bookings Tab */}
          {activeTab === 'bookings' && (
            <Card className="lg:col-span-3">
              <h3 className="text-xl font-semibold mb-4">{t('allBookings')}</h3>
              {bookings.length === 0 ? (
                <p className="text-gray-400">{t('noBookingsFound')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#D91CD2]/30">
                        <th className="text-left py-3 px-4">{t('date')}</th>
                        <th className="text-left py-3 px-4">{t('courseId')}</th>
                        <th className="text-left py-3 px-4">{t('coachId')}</th>
                        <th className="text-left py-3 px-4">{t('amount')}</th>
                        <th className="text-left py-3 px-4">{t('status')}</th>
                        <th className="text-left py-3 px-4">{t('payment')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((booking, index) => (
                        <tr key={index} className="border-b border-[#D91CD2]/10">
                          <td className="py-3 px-4">{formatDate(booking.scheduledDate)}</td>
                          <td className="py-3 px-4">{booking.courseId}</td>
                          <td className="py-3 px-4">{booking.coachId}</td>
                          <td className="py-3 px-4">CHF {booking.paymentAmount}</td>
                          <td className="py-3 px-4">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              booking.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                              booking.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400' :
                              booking.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                              'bg-purple-500/20 text-purple-400'
                            }`}>
                              {booking.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              booking.paymentStatus === 'completed' ? 'bg-green-500/20 text-green-400' :
                              booking.paymentStatus === 'failed' ? 'bg-red-500/20 text-red-400' :
                              'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {booking.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <Card className="lg:col-span-3">
              <h3 className="text-xl font-semibold mb-4">{t('allTransactions')}</h3>
              {transactions.length === 0 ? (
                <p className="text-gray-400">{t('noTransactionsFound')}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#D91CD2]/30">
                        <th className="text-left py-3 px-4">{t('date')}</th>
                        <th className="text-left py-3 px-4">{t('type')}</th>
                        <th className="text-left py-3 px-4">{t('amount')}</th>
                        <th className="text-left py-3 px-4">{t('description')}</th>
                        <th className="text-left py-3 px-4">{t('status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((transaction, index) => (
                        <tr key={index} className="border-b border-[#D91CD2]/10">
                          <td className="py-3 px-4">{formatDate(transaction.createdAt)}</td>
                          <td className="py-3 px-4">
                            <span className="capitalize">{transaction.type.replace('_', ' ')}</span>
                          </td>
                          <td className="py-3 px-4">CHF {transaction.amount}</td>
                          <td className="py-3 px-4">{transaction.description}</td>
                          <td className="py-3 px-4">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              transaction.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                              transaction.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                              'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {transaction.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <Card className="lg:col-span-3">
              <h3 className="text-xl font-semibold mb-4">{t('allReviews')}</h3>
              {reviews.length === 0 ? (
                <p className="text-gray-400">{t('noReviewsFound')}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reviews.map((review, index) => (
                    <div key={index} className="bg-black/30 p-4 rounded-lg border border-[#D91CD2]/20">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{t('courseId')}: {review.courseId}</span>
                        </div>
                        <div className="flex items-center">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} className={`text-lg ${i < review.rating ? 'text-yellow-400' : 'text-gray-600'}`}>★</span>
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-300 mb-2">{review.comment}</p>
                      <p className="text-xs text-gray-400">{formatDate(review.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </motion.div>
    </div>
  );
}