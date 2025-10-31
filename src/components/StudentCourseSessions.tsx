'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiClock, FiCheck, FiPlay, FiCalendar, FiUser, FiPackage } from 'react-icons/fi';
import { useAuth } from '@/lib/auth';
import { StudentCourseSession, DateOrTimestamp } from '@/types';
import { studentCourseSessionService } from '@/lib/database';
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

export default function StudentCourseSessions() {
  const { t } = useTranslation(); // Initialize useTranslation
  const { user } = useAuth();
  const [sessions, setSessions] = useState<StudentCourseSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    if (user?.id) {
      loadSessions();
    }
  }, [user]);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      const studentSessions = await studentCourseSessionService.getByStudentId(user?.id || '');
      setSessions(studentSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSessions = sessions.filter(session => {
    if (filter === 'active') return !session.isComplete;
    if (filter === 'completed') return session.isComplete;
    return true;
  });

  const activeSessionsCount = sessions.filter(s => !s.isComplete).length;
  const completedSessionsCount = sessions.filter(s => s.isComplete).length;
  const totalRemainingSessions = sessions.reduce((sum, s) => sum + (s.isComplete ? 0 : s.remainingSessions), 0);

  return (
    <div className="space-y-6">
      {/* Session Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">{t('activeCourses')}</p>
              <p className="text-2xl font-bold text-[#D91CD2]">{activeSessionsCount}</p>
            </div>
            <FiPlay className="text-[#D91CD2]" size={24} />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">{t('remainingSessions')}</p>
              <p className="text-2xl font-bold text-blue-400">{totalRemainingSessions}</p>
            </div>
            <FiClock className="text-blue-400" size={24} />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">{t('completedCourses')}</p>
              <p className="text-2xl font-bold text-green-400">{completedSessionsCount}</p>
            </div>
            <FiCheck className="text-green-400" size={24} />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded text-sm transition-colors ${
              filter === 'all' ? 'bg-[#D91CD2] text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {t('allCourses')} ({sessions.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded text-sm transition-colors ${
              filter === 'active' ? 'bg-[#D91CD2] text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {t('active')} ({activeSessionsCount})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded text-sm transition-colors ${
              filter === 'completed' ? 'bg-[#D91CD2] text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {t('completed')} ({completedSessionsCount})
          </button>
        </div>

        {/* Sessions List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-[#D91CD2] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">{t('loadingYourCourses')}</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-12">
            <FiPackage className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-400 mb-4">
              {filter === 'all' ? t('noCoursesFound') : 
               filter === 'active' ? t('noActiveCourses') : t('noCompletedCourses')}
            </p>
            <p className="text-gray-500 text-sm">
              {filter === 'all' && t('purchaseCoursesToGetStarted')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSessions.map((session) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800/50 rounded-lg p-6 border border-gray-700/50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold">{session.courseName}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        session.isComplete 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {session.isComplete ? t('completed') : t('active')}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-6 text-sm text-gray-400 mb-4">
                      <span className="flex items-center">
                        <FiUser className="mr-1" />
                        {t('coach')}: {session.coachName}
                      </span>
                      <span className="flex items-center">
                        <FiCalendar className="mr-1" />
                        {t('purchased')}: {toDate(session.purchaseDate).toLocaleDateString()}
                      </span>
                      {session.lastSessionDate && (
                        <span className="flex items-center">
                          <FiClock className="mr-1" />
                          {t('lastSession')}: {toDate(session.lastSessionDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold text-[#D91CD2] mb-1">
                      {session.remainingSessions}
                    </div>
                    <div className="text-xs text-gray-400">
                      {t('ofSessionsLeft', { 
                        remaining: session.remainingSessions,
                        total: session.totalSessions 
                      })}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{t('progress')}</span>
                    <span>{session.totalSessions - session.remainingSessions}/{session.totalSessions} {t('completed')}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        session.isComplete ? 'bg-green-500' : 'bg-[#D91CD2]'
                      }`}
                      style={{ 
                        width: `${((session.totalSessions - session.remainingSessions) / session.totalSessions) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>

                {/* Status Message */}
                {session.isComplete ? (
                  <div className="flex items-center text-green-400 text-sm">
                    <FiCheck className="mr-2" />
                    {t('courseCompletedGreatJob')}
                  </div>
                ) : (
                  <div className="flex items-center text-blue-400 text-sm">
                    <FiPlay className="mr-2" />
                    {t('readyForNextSession')}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
