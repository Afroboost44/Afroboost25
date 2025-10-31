'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiUser, FiMessageCircle, FiClock } from 'react-icons/fi';
import { useAuth } from '@/lib/auth';
import { directMessageService } from '@/lib/database';
import { DirectMessage } from '@/types';
import { useTranslation } from 'react-i18next';

interface MessagePopupProps {
  className?: string;
}

export default function MessagePopup({ className = '' }: MessagePopupProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [latestMessage, setLatestMessage] = useState<DirectMessage | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [lastCheckedTime, setLastCheckedTime] = useState<number>(Date.now());

  useEffect(() => {
    if (!user) return;

    const checkForNewMessages = async () => {
      try {
        const conversations = await directMessageService.getUserConversations(user.id);
        
        if (!conversations || !Array.isArray(conversations)) {
          return;
        }
        
        // Find the most recent unread message
        let newestMessage: DirectMessage | null = null;
        let newestTime = lastCheckedTime;

        for (const conversation of conversations) {
          if (conversation?.lastMessage && 
              typeof conversation.lastMessage === 'object' &&
              !conversation.lastMessage.read && 
              conversation.lastMessage.receiverId === user.id) {
            
            const messageTime = typeof conversation.lastMessage.timestamp === 'object' && 
                              conversation.lastMessage.timestamp.toDate ? 
                              conversation.lastMessage.timestamp.toDate().getTime() : 
                              new Date(conversation.lastMessage.timestamp).getTime();

            if (messageTime > newestTime) {
              newestMessage = conversation.lastMessage;
              newestTime = messageTime;
            }
          }
        }

        if (newestMessage && 
            newestMessage.id && 
            newestMessage.id !== latestMessage?.id) {
          setLatestMessage(newestMessage);
          setIsVisible(true);
          setLastCheckedTime(Date.now());
          
          // Auto-hide after 8 seconds
          setTimeout(() => {
            setIsVisible(true);
          }, 8000);
        }
      } catch (error) {
        console.error('Error checking for new messages:', error);
      }
    };

    // Check immediately
    checkForNewMessages();

    // Set up polling every 10 seconds
    const interval = setInterval(checkForNewMessages, 10000);

    return () => clearInterval(interval);
  }, [user, lastCheckedTime, latestMessage?.id]);

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleViewMessage = () => {
    setIsVisible(false);
    // Navigate to chat page
    window.location.href = '/chat';
  };

  const formatTimeAgo = (timestamp: any) => {
    try {
      if (!timestamp) return '';
      
      const date = typeof timestamp === 'object' && timestamp.toDate ? 
                   timestamp.toDate() : new Date(timestamp);
      
      if (isNaN(date.getTime())) return '';
      
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);

      if (minutes < 1) return t('justNow') || 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return '';
    }
  };

  if (!user || !latestMessage || !isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && latestMessage && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.9 }}
          className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[9999] w-[95vw] max-w-xs sm:max-w-sm px-2`}
        >
          <div className="bg-gradient-to-br from-[#1a1a2e] via-[#23234b] to-[#2d2d5c] border border-[#D91CD2] rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl w-full">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#D91CD2] to-[#E63DE6] p-4 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-white/20 rounded-full p-2">
                  <FiMessageCircle className="text-white" size={20} />
                </div>
                <span className="text-white font-bold text-base tracking-wide drop-shadow">{t('newMessage') || 'New Message'}</span>
              </div>
              <button
                onClick={handleClose}
                className="text-white/80 hover:text-white transition-colors p-1 rounded-full"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Message Content */}
            <div className="p-5 flex gap-3 items-start">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-[#D91CD2] to-[#E63DE6] rounded-full flex items-center justify-center shadow-lg">
                  <FiUser className="text-white" size={28} />
                </div>
              </div>
              {/* Message Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-white font-semibold text-base truncate">
                    {latestMessage?.senderName || 'Unknown Sender'}
                  </h4>
                  <div className="flex items-center text-gray-400 text-xs ml-2">
                    <FiClock size={14} className="mr-1" />
                    {latestMessage?.timestamp ? formatTimeAgo(latestMessage.timestamp) : ''}
                  </div>
                </div>
                <p className="text-gray-200 text-sm mt-1 mb-2 leading-relaxed font-medium">
                  {latestMessage?.message && typeof latestMessage.message === 'string' 
                    ? (latestMessage.message.length > 80 
                        ? `${latestMessage.message.substring(0, 80)}...` 
                        : latestMessage.message)
                    : 'New message received'}
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleViewMessage}
                    className="bg-[#D91CD2] hover:bg-[#E63DE6] text-white px-4 py-2 rounded-lg text-xs font-semibold shadow transition-colors duration-200 flex items-center gap-1"
                  >
                    <FiMessageCircle size={14} />
                    <span>{t('viewMessage') || 'View'}</span>
                  </button>
                  <button
                    onClick={handleClose}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-4 py-2 rounded-lg text-xs font-semibold shadow transition-colors duration-200"
                  >
                    {t('dismiss') || 'Dismiss'}
                  </button>
                </div>
              </div>
            </div>
            {/* Bottom Accent */}
            <div className="h-1 bg-gradient-to-r from-[#D91CD2] to-[#E63DE6] rounded-b-2xl"></div>
          </div>
          {/* Floating Animation Effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-[#D91CD2]/20 to-[#E63DE6]/20 rounded-2xl blur-xl -z-10"
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
