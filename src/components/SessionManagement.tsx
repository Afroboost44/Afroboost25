'use client';
 
import { useState, useEffect } from'react';
import { motion } from 'framer-motion';
import { FiUsers, FiMinus, FiPlus, FiClock, FiCheck, FiSearch, FiCalendar } from 'react-icons/fi';
import { useAuth } from '@/lib/auth';
import { StudentCourseSession, DateOrTimestamp } from '@/types';
import { studentCourseSessionService } from '@/lib/database';
import { formatDate, formatDateTime } from '@/lib/dateUtils';
import Card from '@/components/Card';
import { useTranslation } from 'react-i18next'; // Import useTranslation

// Helper function to convert DateOrTimestamp to Date
const toDate = (timestamp: DateOrTimestamp): Date => {
  if (timestamp instanceof Date) {
    return timestamp;
  }
  // Firebase Timestamp
  if (timestamp && typeof timestamp === 'object' && 'seconds' in timestamp) {
    return new Date(timestamp.seconds * 1000);
  }
  // String timestamp
  return new Date(timestamp);
};

export default function SessionManagement() {
  const { t } = useTranslation(); // Initialize useTranslation
  const { user } = useAuth();
  const [sessions, setSessions] = useState<StudentCourseSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === 'coach' || user?.role === 'admin' || user?.role === 'superadmin') {
      loadSessions();
    }
  }, [user]);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const sessionData = await studentCourseSessionService.getByCoachId(user?.id || '');
      setSessions(sessionData);
    } catch (error) {
      console.error('Error loading sessions:', error);
      setError('Failed to load session data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeductSession = async (sessionId: string, studentName: string, courseName: string) => {
    if (!confirm(t('confirmDeductSession', { studentName, courseName }))) {
      return;
    }

    try {
      const success = await studentCourseSessionService.deductSession(sessionId);
      if (success) {
        setSuccess(t('sessionDeductedSuccessfully'));
        await loadSessions();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(t('failedToDeductSession'));
      }
    } catch (error) {
      console.error('Error deducting session:', error);
      setError(t('failedToDeductSession'));
    }
  };

  const handleAddSession = async (sessionId: string, studentName: string, courseName: string) => {
    if (!confirm(t('confirmAddSession', { studentName, courseName }))) {
      return;
    }

    try {
      const success = await studentCourseSessionService.addSession(sessionId, 1);
      if (success) {
        setSuccess(t('sessionAddedSuccessfully'));
        await loadSessions();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(t('failedToAddSession'));
      }
    } catch (error) {
      console.error('Error adding session:', error);
      setError(t('failedToAddSession'));
    }
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.studentId.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'active') return matchesSearch && !session.isComplete;
    if (filter === 'completed') return matchesSearch && session.isComplete;
    return matchesSearch;
  });

  if (!user || (user.role !== 'coach' && user.role !== 'admin' && user.role !== 'superadmin')) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <FiClock className="text-[#D91CD2]" size={24} />
            <h2 className="text-2xl font-bold">{t('sessionManagement')}</h2>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6 flex items-center"
          >
            <p className="text-red-500 text-sm">{error}</p>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-500/20 border border-green-500 rounded-lg p-4 mb-6 flex items-center"
          >
            <p className="text-green-500 text-sm">{success}</p>
          </motion.div>
        )}

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('searchByCourseNameOrStudent')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-primary pl-10 w-full"
              />
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded text-sm transition-colors ${
                filter === 'all' ? 'bg-[#D91CD2] text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {t('allSessions')}
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded text-sm transition-colors ${
                filter === 'active' ? 'bg-[#D91CD2] text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {t('active')}
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded text-sm transition-colors ${
                filter === 'completed' ? 'bg-[#D91CD2] text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {t('completed')}
            </button>
          </div>
        </div>
      </Card>

      {/* Sessions List */}
      {isLoading ? (
        <Card>
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-[#D91CD2] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">{t('loadingSessions')}</p>
          </div>
        </Card>
      ) : filteredSessions.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <FiUsers className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-400 mb-4">{t('noSessionsFound')}</p>
            <p className="text-gray-500 text-sm">{t('studentsWillAppearAfterPurchase')}</p>
          </div>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid gap-4 min-w-[400px] sm:min-w-0" style={{ minWidth: 350 }}>
            {filteredSessions.map((session) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800/50 rounded-lg p-6 border border-gray-700/50 min-w-[320px]"
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex-1 min-w-[180px]">
                    <div className="flex items-center space-x-4 mb-2">
                      <h3 className="text-lg font-semibold">{session.courseName}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        session.isComplete 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {session.isComplete ? t('completed') : t('active')}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center space-x-6 text-sm text-gray-400">
                      <span>{t('studentId')}: {session.studentId}</span>
                      <span className="flex items-center">
                        <FiCalendar className="mr-1" />
                        {t('purchased')}: {formatDate(session.purchaseDate)}
                      </span>
                      {session.lastSessionDate && (
                        <span className="flex items-center">
                          <FiClock className="mr-1" />
                          {t('lastSession')}: {formatDateTime(session.lastSessionDate)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* Session Counter */}
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[#D91CD2]">
                        {session.remainingSessions}
                      </div>
                      <div className="text-xs text-gray-400">
                        {t('ofSessionsRemaining', { 
                          remaining: session.remainingSessions,
                          total: session.totalSessions 
                        })}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleAddSession(session.id, session.studentId, session.courseName)}
                        className="p-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded transition-colors"
                        title={t('addSession')}
                      >
                        <FiPlus size={16} />
                      </button>
                      
                      <button
                        onClick={() => handleDeductSession(session.id, session.studentId, session.courseName)}
                        disabled={session.remainingSessions === 0}
                        className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={t('deductSession')}
                      >
                        <FiMinus size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{t('progress')}</span>
                    <span>{session.totalSessions - session.remainingSessions}/{session.totalSessions} {t('completed')}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-[#D91CD2] h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${((session.totalSessions - session.remainingSessions) / session.totalSessions) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
