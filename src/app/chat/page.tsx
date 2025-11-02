'use client';

import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import DirectChat from '@/components/DirectChat';
import { useAuth } from '@/lib/auth';
import { FiMessageCircle, FiUsers } from 'react-icons/fi';

export default function Chat() {
  const { t } = useTranslation();
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center px-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md mx-auto"
        >
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 shadow-2xl">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiMessageCircle className="text-2xl text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">{t('Please log in to access chat')}</h2>
            <p className="text-gray-400 mb-8">{t('You need to be logged in to send and receive messages')}</p>
            <a 
              href="/login" 
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 transform hover:scale-105"
            >
              {t('Sign In')}
            </a>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 mt-16 px-4 sm:px-6">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 px-4 py-4 sm:px-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <FiMessageCircle className="text-xl text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">{t('Messages')}</h1>
                <p className="text-sm text-gray-400 hidden sm:block">{t('Chat with students, coaches, and admins')}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <FiUsers className="text-lg" />
              <span className="hidden sm:inline">{t('Online')}</span>
            </div>
          </div>
        </motion.div>

        {/* Chat Area */}
        <div className="flex-1 overflow-hidden">
          <DirectChat />
        </div>
      </div>
    </div>
  );
} 