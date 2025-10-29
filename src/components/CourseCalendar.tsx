'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiCalendar, 
  FiChevronLeft, 
  FiChevronRight, 
  FiFilter, 
  FiMapPin, 
  FiClock, 
  FiUsers, 
  FiBookOpen,
  FiPlus,
  FiEdit3,
  FiTrash2,
  FiX,
  FiGrid,
  FiList,
  FiEye,
  FiDollarSign,
  FiStar
} from 'react-icons/fi';
import { Course, CourseSchedule } from '@/types';
import { courseService, scheduleService } from '@/lib/database';
import { useAuth } from '@/lib/auth';
import Card from '@/components/Card';
import Link from 'next/link';

interface CourseCalendarProps {
  onBookCourse?: (courseId: string) => void;
  showManagement?: boolean; // Show add/edit/delete options for coaches/admins
}

interface ScheduleFormData {
  courseId: string;
  startTime: Date;
  endTime: Date;
  level: 'beginner' | 'intermediate' | 'advanced' | 'all';
  location?: string;
  description?: string;
  maxParticipants?: number;
  price?: number;
}

type ViewMode = 'month' | 'week' | 'day' | 'list';
type FilterLevel = 'all' | 'beginner' | 'intermediate' | 'advanced';
type CalendarView = 'calendar' | 'timeline';

export default function CourseCalendar({ onBookCourse, showManagement = false }: CourseCalendarProps) {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<CourseSchedule[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [calendarView, setCalendarView] = useState<CalendarView>('calendar');
  const [filterLevel, setFilterLevel] = useState<FilterLevel>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<CourseSchedule | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<CourseSchedule | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<ScheduleFormData>({
    courseId: '',
    startTime: new Date(),
    endTime: new Date(),
    level: 'all',
    location: '',
    description: '',
    maxParticipants: 15,
    price: 0
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [schedulesData, coursesData] = await Promise.all([
        scheduleService.getAll(),
        showManagement && user?.role === 'coach' 
          ? courseService.getByCoach(user.id) 
          : courseService.getAll()
      ]);
      
      setSchedules(schedulesData);
      setCourses(coursesData);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCourseById = (courseId: string) => {
    return courses.find(course => course.id === courseId);
  };

  const getFilteredSchedules = () => {
    return schedules.filter(schedule => {
      const course = getCourseById(schedule.courseId);
      if (!course) return false;

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          course.title.toLowerCase().includes(searchLower) ||
          course.description.toLowerCase().includes(searchLower) ||
          course.coachName.toLowerCase().includes(searchLower) ||
          (schedule.location && schedule.location.toLowerCase().includes(searchLower)) ||
          (schedule.description && schedule.description.toLowerCase().includes(searchLower));
        
        if (!matchesSearch) return false;
      }

      // Filter by level
      if (filterLevel !== 'all' && schedule.level !== filterLevel) return false;

      // Filter by category
      if (filterCategory !== 'all' && course.category !== filterCategory) return false;

      // Filter by date range based on view mode
      const scheduleDate = schedule.startTime instanceof Date 
        ? schedule.startTime 
        : schedule.startTime.toDate();

      if (viewMode === 'day') {
        return isSameDay(scheduleDate, currentDate);
      } else if (viewMode === 'week') {
        return isInSameWeek(scheduleDate, currentDate);
      } else if (viewMode === 'list') {
        // For list view, show future schedules
        return scheduleDate >= new Date();
      } else {
        return isInSameMonth(scheduleDate, currentDate);
      }
    });
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.toDateString() === date2.toDateString();
  };

  const isInSameWeek = (date1: Date, date2: Date) => {
    const startOfWeek = new Date(date2);
    startOfWeek.setDate(date2.getDate() - date2.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return date1 >= startOfWeek && date1 <= endOfWeek;
  };

  const isInSameMonth = (date1: Date, date2: Date) => {
    return date1.getMonth() === date2.getMonth() && date1.getFullYear() === date2.getFullYear();
  };

  const formatTime = (date: Date | any) => {
    const actualDate = date instanceof Date ? date : date.toDate();
    return actualDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date | any) => {
    const actualDate = date instanceof Date ? date : date.toDate();
    return actualDate.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatDateDetailed = (date: Date | any) => {
    const actualDate = date instanceof Date ? date : date.toDate();
    return actualDate.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDayOfWeek = (date: Date | any) => {
    const actualDate = date instanceof Date ? date : date.toDate();
    return actualDate.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getDayOfMonth = (date: Date | any) => {
    const actualDate = date instanceof Date ? date : date.toDate();
    return actualDate.getDate();
  };

  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay());
    
    const days = [];
    const currentCalendarDate = new Date(startDate);
    
    for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
      days.push(new Date(currentCalendarDate));
      currentCalendarDate.setDate(currentCalendarDate.getDate() + 1);
    }
    
    return days;
  };

  const getSchedulesForDay = (date: Date) => {
    return filteredSchedules.filter(schedule => {
      const scheduleDate = schedule.startTime instanceof Date 
        ? schedule.startTime 
        : schedule.startTime.toDate();
      return isSameDay(scheduleDate, date);
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    if (viewMode === 'day') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    
    setCurrentDate(newDate);
  };

  const getCalendarTitle = () => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long', 
        day: 'numeric' 
      });
    } else if (viewMode === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { 
        year: 'numeric',
        month: 'long' 
      });
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      const course = getCourseById(formData.courseId);
      if (!course) throw new Error('Course not found');

      const scheduleData = {
        courseId: formData.courseId,
        title: course.title,
        startTime: formData.startTime,
        endTime: formData.endTime,
        level: formData.level,
        location: formData.location,
        description: formData.description,
        createdBy: user.id
      };

      if (editingSchedule) {
        await scheduleService.update(editingSchedule.id, scheduleData);
      } else {
        await scheduleService.create(scheduleData);
      }

      await loadData();
      setIsModalOpen(false);
      setEditingSchedule(null);
      resetForm();
    } catch (error) {
      console.error('Error saving schedule:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSchedule = (schedule: CourseSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      courseId: schedule.courseId,
      startTime: schedule.startTime instanceof Date ? schedule.startTime : schedule.startTime.toDate(),
      endTime: schedule.endTime instanceof Date ? schedule.endTime : schedule.endTime.toDate(),
      level: schedule.level,
      location: schedule.location || '',
      description: schedule.description || '',
      maxParticipants: (schedule as any).maxParticipants || 15,
      price: (schedule as any).price || 0
    });
    setIsModalOpen(true);
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      try {
        await scheduleService.delete(scheduleId);
        await loadData();
      } catch (error) {
        console.error('Error deleting schedule:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      courseId: '',
      startTime: new Date(),
      endTime: new Date(),
      level: 'all',
      location: '',
      description: '',
      maxParticipants: 15,
      price: 0
    });
  };

  const categories = [
    'Afrobeat', 'Hip-Hop', 'Contemporary', 'Salsa', 'Bachata', 
    'Kizomba', 'Jazz', 'Ballet', 'Breakdance', 'Latin'
  ];

  const filteredSchedules = getFilteredSchedules();

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'intermediate':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'advanced':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const getCalendarStats = () => {
    const totalSchedules = filteredSchedules.length;
    const upcomingSchedules = filteredSchedules.filter(s => {
      const scheduleDate = s.startTime instanceof Date ? s.startTime : s.startTime.toDate();
      return scheduleDate > new Date();
    }).length;
    
    const levelCounts = filteredSchedules.reduce((acc, schedule) => {
      acc[schedule.level] = (acc[schedule.level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const categoryCount = new Set(
      filteredSchedules.map(s => getCourseById(s.courseId)?.category).filter(Boolean)
    ).size;
    
    return {
      total: totalSchedules,
      upcoming: upcomingSchedules,
      levelCounts,
      categories: categoryCount
    };
  };

  const CalendarStats = () => {
    const stats = getCalendarStats();
    
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-r from-[#D91CD2]/20 to-[#7000FF]/20 p-4 rounded-lg border border-[#D91CD2]/30">
          <div className="text-2xl font-bold text-[#D91CD2]">{stats.total}</div>
          <div className="text-sm text-gray-400">Total Sessions</div>
        </div>
        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-4 rounded-lg border border-green-500/30">
          <div className="text-2xl font-bold text-green-400">{stats.upcoming}</div>
          <div className="text-sm text-gray-400">Upcoming</div>
        </div>
        <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 p-4 rounded-lg border border-blue-500/30">
          <div className="text-2xl font-bold text-blue-400">{stats.categories}</div>
          <div className="text-sm text-gray-400">Categories</div>
        </div>
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 p-4 rounded-lg border border-yellow-500/30">
          <div className="text-2xl font-bold text-yellow-400">
            {Object.keys(stats.levelCounts).length}
          </div>
          <div className="text-sm text-gray-400">Skill Levels</div>
        </div>
      </div>
    );
  };

  if (isLoading && schedules.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-12 h-12 border-2 border-[#D91CD2] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <h2 className="text-2xl font-bold gradient-text">Course Calendar</h2>
          
          {showManagement && user?.role === 'coach' && (
            <button
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="btn-primary flex items-center space-x-2"
            >
              <FiPlus size={20} />
              <span>Schedule Course</span>
            </button>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiFilter className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search courses, coaches, locations..."
                className="input-primary w-full pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* View Mode Selector */}
          <div className="flex bg-black/40 rounded-lg p-1">
            {(['day', 'week', 'month', 'list'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  viewMode === mode
                    ? 'bg-[#D91CD2] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {mode === 'list' ? <FiList size={16} /> : <FiCalendar size={16} />}
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {/* Calendar View Toggle for Month/Week view */}
          {(viewMode === 'month' || viewMode === 'week') && (
            <div className="flex bg-black/40 rounded-lg p-1">
              <button
                onClick={() => setCalendarView('calendar')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  calendarView === 'calendar'
                    ? 'bg-[#D91CD2] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <FiGrid size={16} />
                Grid
              </button>
              <button
                onClick={() => setCalendarView('timeline')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  calendarView === 'timeline'
                    ? 'bg-[#D91CD2] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <FiList size={16} />
                Timeline
              </button>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value as FilterLevel)}
              className="input-primary text-sm"
            >
              <option value="all">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="input-primary text-sm"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Calendar Statistics */}
        <CalendarStats />

        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigateDate('prev')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <FiChevronLeft size={20} />
          </button>
          
          <h3 className="text-lg font-semibold">{getCalendarTitle()}</h3>
          
          <button
            onClick={() => navigateDate('next')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <FiChevronRight size={20} />
          </button>
        </div>

        {/* Calendar View */}
        <div className="space-y-4">
          {viewMode === 'list' ? (
            /* List View */
            <div className="space-y-4">
              {filteredSchedules.length > 0 ? (
                filteredSchedules
                  .sort((a, b) => {
                    const dateA = a.startTime instanceof Date ? a.startTime : a.startTime.toDate();
                    const dateB = b.startTime instanceof Date ? b.startTime : b.startTime.toDate();
                    return dateA.getTime() - dateB.getTime();
                  })
                  .map((schedule) => {
                    const course = getCourseById(schedule.courseId);
                    if (!course) return null;

                    return (
                      <motion.div
                        key={schedule.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-black/40 rounded-lg p-6 border border-gray-700/30 hover:border-[#D91CD2]/30 transition-colors"
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                          {/* Course Image & Basic Info */}
                          <div className="lg:col-span-1">
                            <img
                              src={course.imageUrl}
                              alt={course.title}
                              className="w-full h-32 object-cover rounded-lg mb-4"
                            />
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 rounded-full text-xs border ${getLevelColor(schedule.level)}`}>
                                {schedule.level}
                              </span>
                              <span className="text-sm text-gray-400">{course.category}</span>
                            </div>
                          </div>

                          {/* Course Details */}
                          <div className="lg:col-span-2">
                            <h4 className="font-bold text-xl mb-2 text-white">{course.title}</h4>
                            <p className="text-gray-300 mb-4 line-clamp-2">{course.description}</p>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="flex items-center text-gray-400">
                                <FiCalendar className="mr-2 text-[#D91CD2]" />
                                {formatDate(schedule.startTime)}
                              </div>
                              <div className="flex items-center text-gray-400">
                                <FiClock className="mr-2 text-[#D91CD2]" />
                                {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                              </div>
                              <div className="flex items-center text-gray-400">
                                <FiUsers className="mr-2 text-[#D91CD2]" />
                                Coach: {course.coachName}
                              </div>
                              {schedule.location && (
                                <div className="flex items-center text-gray-400">
                                  <FiMapPin className="mr-2 text-[#D91CD2]" />
                                  {schedule.location}
                                </div>
                              )}
                              <div className="flex items-center text-gray-400">
                                <FiStar className="mr-2 text-[#D91CD2]" />
                                {course.averageRating.toFixed(1)} ({course.totalReviews} reviews)
                              </div>
                              <div className="flex items-center text-gray-400">
                                <FiUsers className="mr-2 text-[#D91CD2]" />
                                {course.currentStudents}/{course.maxStudents} enrolled
                              </div>
                            </div>

                            {schedule.description && (
                              <div className="mt-4">
                                <p className="text-sm text-gray-400">{schedule.description}</p>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="lg:col-span-1 flex flex-col justify-between">
                            <div className="text-right mb-4">
                              <div className="text-2xl font-bold text-[#D91CD2] mb-2">
                                ${course.price}
                              </div>
                              <div className="text-sm text-gray-400">per session</div>
                            </div>

                            <div className="space-y-2">
                              <Link 
                                href={`/courses/${course.id}`}
                                className="btn-secondary w-full text-center text-sm flex items-center justify-center gap-2"
                              >
                                <FiEye size={16} />
                                View Details
                              </Link>
                              
                              {onBookCourse && (
                                <button
                                  onClick={() => onBookCourse(course.id)}
                                  className="btn-primary w-full text-sm"
                                >
                                  Book Now
                                </button>
                              )}
                              
                              {showManagement && user?.role === 'coach' && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleEditSchedule(schedule)}
                                    className="flex-1 p-2 hover:bg-white/10 rounded-lg transition-colors border border-gray-600"
                                  >
                                    <FiEdit3 size={16} className="mx-auto" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSchedule(schedule.id)}
                                    className="flex-1 p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400 border border-red-400/30"
                                  >
                                    <FiTrash2 size={16} className="mx-auto" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
              ) : (
                <div className="bg-black/40 p-8 rounded-lg text-center">
                  <FiCalendar size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-400">No courses found matching your criteria.</p>
                  {showManagement && user?.role === 'coach' && (
                    <button
                      onClick={() => {
                        resetForm();
                        setIsModalOpen(true);
                      }}
                      className="btn-primary mt-4"
                    >
                      Schedule Your First Course
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : viewMode === 'month' && calendarView === 'calendar' ? (
            /* Month Calendar Grid View */
            <div className="bg-black/20 rounded-lg overflow-hidden">
              {/* Calendar Header */}
              <div className="grid grid-cols-7 gap-0 bg-gray-800/50">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-3 text-center font-medium text-gray-300 border-r border-gray-700 last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-0">
                {getCalendarDays().map((day, index) => {
                  const daySchedules = getSchedulesForDay(day);
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                  const isToday = isSameDay(day, new Date());
                  
                  return (
                    <div
                      key={index}
                      className={`min-h-24 p-2 border-r border-b border-gray-700 last:border-r-0 ${
                        isCurrentMonth ? 'bg-black/40' : 'bg-gray-900/20'
                      } ${isToday ? 'bg-[#D91CD2]/10 border-[#D91CD2]/30' : ''}`}
                    >
                      <div className={`text-sm font-medium mb-1 ${
                        isCurrentMonth ? 'text-white' : 'text-gray-500'
                      } ${isToday ? 'text-[#D91CD2]' : ''}`}>
                        {getDayOfMonth(day)}
                      </div>
                      
                      <div className="space-y-1">
                        {daySchedules.slice(0, 2).map((schedule, idx) => {
                          const course = getCourseById(schedule.courseId);
                          if (!course) return null;
                          
                          return (
                            <div
                              key={idx}
                              onClick={() => setSelectedSchedule(schedule)}
                              className={`text-xs p-1 rounded cursor-pointer truncate border ${getLevelColor(schedule.level)} hover:opacity-80`}
                            >
                              {formatTime(schedule.startTime)} {course.title}
                            </div>
                          );
                        })}
                        {daySchedules.length > 2 && (
                          <div className="text-xs text-gray-400 font-medium">
                            +{daySchedules.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Timeline View for Week/Month and Week/Day views */
            <div className="space-y-4">
              {filteredSchedules.length > 0 ? (
                filteredSchedules
                  .sort((a, b) => {
                    const dateA = a.startTime instanceof Date ? a.startTime : a.startTime.toDate();
                    const dateB = b.startTime instanceof Date ? b.startTime : b.startTime.toDate();
                    return dateA.getTime() - dateB.getTime();
                  })
                  .map((schedule) => {
                    const course = getCourseById(schedule.courseId);
                    if (!course) return null;

                    return (
                      <motion.div
                        key={schedule.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-black/40 rounded-lg p-4 border border-gray-700/30 hover:border-[#D91CD2]/30 transition-colors cursor-pointer"
                        onClick={() => setSelectedSchedule(schedule)}
                      >
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-lg">{course.title}</h4>
                              <span className={`px-2 py-1 rounded-full text-xs border ${getLevelColor(schedule.level)}`}>
                                {schedule.level}
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                              <div className="flex items-center">
                                <FiCalendar className="mr-1" />
                                {formatDate(schedule.startTime)}
                              </div>
                              <div className="flex items-center">
                                <FiClock className="mr-1" />
                                {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                              </div>
                              {schedule.location && (
                                <div className="flex items-center">
                                  <FiMapPin className="mr-1" />
                                  {schedule.location}
                                </div>
                              )}
                              <div className="flex items-center">
                                <FiUsers className="mr-1" />
                                {course.currentStudents}/{course.maxStudents}
                              </div>
                              <div className="flex items-center">
                                <FiDollarSign className="mr-1" />
                                {course.price}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {onBookCourse && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onBookCourse(course.id);
                                }}
                                className="btn-primary text-sm"
                              >
                                Book Now
                              </button>
                            )}
                            
                            {showManagement && user?.role === 'coach' && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditSchedule(schedule);
                                  }}
                                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                  <FiEdit3 size={16} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSchedule(schedule.id);
                                  }}
                                  className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"
                                >
                                  <FiTrash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
              ) : (
                <div className="bg-black/40 p-8 rounded-lg text-center">
                  <FiCalendar size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-400">No courses scheduled for this period.</p>
                  {showManagement && user?.role === 'coach' && (
                    <button
                      onClick={() => {
                        resetForm();
                        setIsModalOpen(true);
                      }}
                      className="btn-primary mt-4"
                    >
                      Schedule Your First Course
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Schedule Detail Modal */}
      <AnimatePresence>
        {selectedSchedule && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-black border border-[#D91CD2]/20 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              {(() => {
          const course = getCourseById(selectedSchedule.courseId);
          if (!course) return null;

          return (
            <>
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold gradient-text">{course.title}</h3>
                <button
            onClick={() => setSelectedSchedule(null)}
            className="p-1 hover:bg-white/10 rounded"
                >
            <FiX size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <img
            src={course.imageUrl}
            alt={course.title}
            className="w-full h-40 object-cover rounded-lg"
                />

                <p className="text-gray-300">{course.description}</p>

                <div className="space-y-2">
            <div className="flex items-center">
              <FiCalendar className="mr-2 text-[#D91CD2]" />
              <span>{formatDate(selectedSchedule.startTime)}</span>
            </div>
            <div className="flex items-center">
              <FiClock className="mr-2 text-[#D91CD2]" />
              <span>{formatTime(selectedSchedule.startTime)} - {formatTime(selectedSchedule.endTime)}</span>
            </div>
            {selectedSchedule.location && (
              <div className="flex items-center">
                <FiMapPin className="mr-2 text-[#D91CD2]" />
                <span>{selectedSchedule.location}</span>
              </div>
            )}
            <div className="max-h-40 overflow-y-auto">
              <div className="flex items-center"></div>
              <span>{course.currentStudents}/{course.maxStudents} students</span>
            </div>
                </div>

                {selectedSchedule.description && (
            <div>
              <h4 className="font-semibold mb-2">Additional Information</h4>
              <p className="text-gray-400 text-sm">{selectedSchedule.description}</p>
            </div>
                )}

                <div className="flex justify-between items-center pt-4">
            <span className={`px-3 py-1 rounded-full text-sm border ${getLevelColor(selectedSchedule.level)}`}>
              {selectedSchedule.level} level
            </span>
            <span className="text-xl font-bold text-[#D91CD2]">${course.price}</span>
                </div>

                {onBookCourse && (
            <button
              onClick={() => {
                onBookCourse(course.id);
                setSelectedSchedule(null);
              }}
              className="btn-primary w-full"
            >
              Book This Course
            </button>
                )}
              </div>
            </>
          );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Schedule Form Modal */}
      <AnimatePresence>
        {isModalOpen && showManagement && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-black border border-[#D91CD2]/20 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-xl font-bold gradient-text mb-6">
                {editingSchedule ? 'Edit Schedule' : 'Schedule Course'}
              </h3>

              <form onSubmit={handleScheduleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Course</label>
                  <select
                    value={formData.courseId}
                    onChange={(e) => setFormData(prev => ({ ...prev, courseId: e.target.value }))}
                    required
                    className="input-primary w-full"
                  >
                    <option value="">Select a course</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>{course.title}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Start Time</label>
                    <input
                      type="datetime-local"
                      value={formData.startTime.toISOString().slice(0, 16)}
                      onChange={(e) => setFormData(prev => ({ ...prev, startTime: new Date(e.target.value) }))}
                      required
                      className="input-primary w-full text-white"
                      style={{ colorScheme: "dark" }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">End Time</label>
                    <input
                      type="datetime-local"
                      value={formData.endTime.toISOString().slice(0, 16)}
                      onChange={(e) => setFormData(prev => ({ ...prev, endTime: new Date(e.target.value) }))}
                      required
                      className="input-primary w-full text-white"
                      style={{ colorScheme: "dark" }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Level</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value as any }))}
                    required
                    className="input-primary w-full"
                  >
                    <option value="all">All Levels</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Location (Optional)</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    className="input-primary w-full"
                    placeholder="e.g., Studio A, Online, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Additional Notes (Optional)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="input-primary w-full h-20"
                    placeholder="Any additional information for students"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Max Participants (Optional)</label>
                    <input
                      type="number"
                      value={formData.maxParticipants}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) || 0 }))}
                      className="input-primary w-full"
                      placeholder="Leave empty to use course default"
                      min="1"
                      max="50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Session Price (Optional)</label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      className="input-primary w-full"
                      placeholder="Leave empty to use course default"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingSchedule(null);
                      resetForm();
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary"
                  >
                    {isLoading ? 'Saving...' : editingSchedule ? 'Update Schedule' : 'Create Schedule'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
