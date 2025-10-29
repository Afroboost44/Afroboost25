'use client';

import { useContext } from 'react';
import { motion } from 'framer-motion';
import { AppContext, translations } from '../providers';
import DirectChat from '@/components/DirectChat';
import { useAuth } from '@/lib/auth';

export default function Chat() {
  const { language } = useContext(AppContext);
  const { user } = useAuth();
  const t = translations[language];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Please log in to access chat</h2>
          <p className="text-gray-400 mb-6">You need to be logged in to send and receive messages</p>
          <a href="/login" className="btn-primary">
            Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold gradient-text mb-2">{t.chat}</h1>
          <p className="text-gray-400">Chat with students, coaches, and admins</p>
        </motion.div>

        <div className="card overflow-hidden">
          <DirectChat />
        </div>
      </div>
    </div>
  );
} 