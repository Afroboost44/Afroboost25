'use client';

import { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBell, FiX, FiCheck, FiEye, FiTrash2 } from 'react-icons/fi';
import { useAuth } from '@/lib/auth';
import { Notification } from '@/types';
import { notificationService } from '@/lib/database';
import { useTranslation } from 'react-i18next'; // Import useTranslation

interface NotificationSystemProps {
  className?: string;
}

export default function NotificationSystem({ className = '' }: NotificationSystemProps) {
  const { t } = useTranslation(); // Initialize useTranslation
  const { user } = useAuth();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAllRead, setIsAllRead] = useState(false);

  // Load notification preferences from localStorage
  useEffect(() => {
    const savedPreferences = localStorage.getItem('notificationPreferences');
    if (savedPreferences) {
      const preferences = JSON.parse(savedPreferences);
      setIsAllRead(preferences.isAllRead || false);
      
      // Restore checkbox states if available
      if (preferences.checkboxStates) {
        // Apply any stored checkbox states to the UI
        Object.keys(preferences.checkboxStates).forEach(key => {
          const element = document.getElementById(key) as HTMLInputElement;
          if (element && element.type === 'checkbox') {
            element.checked = preferences.checkboxStates[key];
          }
        });
      }
    }
  }, []);

  // Save notification preferences to localStorage
  const savePreferences = (preferences: any) => {
    // Capture current checkbox states
    const checkboxStates: Record<string, boolean> = {};
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((checkbox: Element) => {
      const input = checkbox as HTMLInputElement;
      if (input.id) {
        checkboxStates[input.id] = input.checked;
      }
    });

    const updatedPreferences = {
      ...preferences,
      checkboxStates,
      timestamp: Date.now()
    };

    localStorage.setItem('notificationPreferences', JSON.stringify(updatedPreferences));
  };

  useEffect(() => {
    if (user) {
      loadNotifications();
      // Set up real-time listener for new notifications
      const interval = setInterval(loadNotifications, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const userNotifications = await notificationService.getByUser(user.id);
      setNotifications(userNotifications);
      const unread = userNotifications.filter((n: Notification) => !n.read).length;
      setUnreadCount(unread);  
      // Update isAllRead preference
      const allRead = unread === 0;
      setIsAllRead(allRead);
      savePreferences({ isAllRead: allRead });
      
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationService.update(notificationId, { read: true });
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      const newUnreadCount = Math.max(0, unreadCount - 1);
      setUnreadCount(newUnreadCount);
      
      // Update preferences
      const allRead = newUnreadCount === 0;
      setIsAllRead(allRead);
      savePreferences({ isAllRead: allRead });
      
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      for (const notification of unreadNotifications) {
        await notificationService.update(notification.id, { read: true });
      }
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      setIsAllRead(true);
      savePreferences({ isAllRead: true });
      
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await notificationService.delete(notificationId);
      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Accepts Date or Firestore Timestamp
  const formatDate = (date: Date | { toDate: () => Date }) => {
    // Convert Firestore Timestamp to Date if needed
    const realDate = typeof (date as any).toDate === 'function' ? (date as any).toDate() : date as Date;
    const now = new Date();
    const diff = now.getTime() - realDate.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t('justNow');
    if (minutes < 60) return `${minutes}${t('minutesAgo')}`;
    if (hours < 24) return `${hours}${t('hoursAgo')}`;
    if (days < 7) return `${days}${t('daysAgo')}`;
    return realDate.toLocaleDateString();
  };

  const getNotificationIcon = (type: string, title?: string) => {
    // Check if it's a message notification based on title
    if (title && title.includes('New message from')) {
      return '💬';
    }
    
    switch (type) {
      case 'booking': return '📅';
      case 'payment': return '💳';
      case 'review': return '⭐';
      case 'course': return '🎯';
      case 'referral': return '👥';
      case 'credit': return '💰';
      case 'session': return '🕐';
      default: return '📢';
    }
  };

  if (!user) return null;

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-300 hover:text-white transition-colors duration-200"
      >
        <FiBell size={24} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#D91CD2] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-lg overflow-hidden z-50"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="font-semibold">{t('notifications')}</h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-[#D91CD2] hover:text-[#E63DE6]"
                  >
                    {t('markAllRead')}
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <FiX size={18} />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="w-6 h-6 border-2 border-[#D91CD2] border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <FiBell size={48} className="mx-auto mb-4 opacity-50" />
                  <p>{t('noNotificationsYet')}</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-700">
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-4 hover:bg-gray-800 transition-colors ${
                        !notification.read ? 'bg-gray-800/50' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <span className="text-lg mt-1">
                          {getNotificationIcon(notification.type, notification.title)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-medium text-sm ${
                            !notification.read ? 'text-white' : 'text-gray-300'
                          }`}>
                            {notification.title}
                          </h4>
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {formatDate(notification.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1">
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="p-1 text-gray-400 hover:text-[#D91CD2]"
                              title={t('markAsRead')}
                            >
                              <FiCheck size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="p-1 text-gray-400 hover:text-red-400"
                            title={t('delete')}
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-700 text-center">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    // Could navigate to a full notifications page
                  }}
                  className="text-xs text-[#D91CD2] hover:text-[#E63DE6]"
                >
                  {t('viewAllNotifications')}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
