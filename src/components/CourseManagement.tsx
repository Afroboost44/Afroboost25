<<<<<<< HEAD
'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiPlus, FiEdit3, FiTrash2, FiUsers, FiStar,FiClock, FiDollarSign, FiSearch, FiUpload, FiImage, FiCalendar, FiGrid, FiPlay } from 'react-icons/fi';
import { Course } from '@/types';
import { courseService, danceCategoryService } from '@/lib/database';
import { useAuth } from '@/lib/auth';
import Card from '@/components/Card';
import CourseCalendar from '@/components/CourseCalendar';
import VideoModal from '@/components/VideoModal';
import { useTranslation } from 'react-i18next'; // Import useTranslation

interface CourseFormData {
  title: string;
  description: string;
  price: number; // price per session
  sessions: number; // number of sessions
  duration: number;
  maxStudents: number;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  imageUrl: string; // Change from File to string URL
  videoLink: string; // New field for video link
  courseContent: string[];
}

interface CourseManagementProps {
  onSelectCourse?: (courseId: string) => void;
}

type ViewMode = 'grid' | 'calendar';

export default function CourseManagement({ onSelectCourse }: CourseManagementProps) {
  const { t } = useTranslation(); // Initialize useTranslation
  const { user } = useAuth();

  // Format date helper function
  const formatDate = (timestamp: any) => {
    let date: Date;
    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (timestamp?.toDate) {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }
    return date.toLocaleDateString();
  };
  const [courses, setCourses] = useState<Course[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [formData, setFormData] = useState<CourseFormData>({
    title: '',
    description: '',
    price: 0,
    sessions: 1, // default to 1 session
    duration: 60,
    maxStudents: 10,
    category: 'Afrobeat',
    difficulty: 'Beginner',
    imageUrl: '', // Change from image: null to imageUrl: ''
    videoLink: '', // Add video link field
    courseContent: ['']
  });
  const [courseImage, setCourseImage] = useState<File | null>(null);
  const [courseImagePreview, setCourseImagePreview] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState('');
  const [selectedVideoTitle, setSelectedVideoTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load courses on mount
  useEffect(() => {
    loadCourses();
    loadCategories();
  }, [user]);

  // Populate form when editing a course
  useEffect(() => {
    if (editingCourse) {
      // Properly handle courseContent as array
      let courseContentArray: string[] = [];
      
      if (Array.isArray(editingCourse.courseContent)) {
        // If it's already an array, use it directly
        courseContentArray = editingCourse.courseContent.filter(item => item && item.trim() !== '');
      } else if (editingCourse.courseContent && typeof editingCourse.courseContent === 'object') {
        // If it's an object (from Firestore), convert to array
        courseContentArray = Object.values(editingCourse.courseContent as Record<string, string>)
          .filter(item => item && item.trim() !== '');
      } else if (editingCourse.courseContent && typeof editingCourse.courseContent === 'string') {
        // If it's a single string, make it an array
        courseContentArray = [editingCourse.courseContent];
      }
      
      // Ensure at least one empty field for editing
      if (courseContentArray.length === 0) {
        courseContentArray = [''];
      }

      setFormData({
        title: editingCourse.title || '',
        description: editingCourse.description || '',
        price: editingCourse.price || 0,
        sessions: editingCourse.sessions || 1,
        duration: editingCourse.duration || 60,
        maxStudents: editingCourse.maxStudents || 10,
        category: editingCourse.category || 'Afrobeat',
        difficulty: editingCourse.difficulty || 'Beginner',
        imageUrl: editingCourse.imageUrl || '',
        videoLink: editingCourse.videoLink || '',
        courseContent: courseContentArray
      });
    }
  }, [editingCourse]);

  const loadCourses = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const userCourses = await courseService.getByCoach(user.id);
      setCourses(userCourses);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const categoriesData = await danceCategoryService.getAll();
      const defaultCategories = [
        'Afrobeat', 'Hip-Hop', 'Contemporary', 'Salsa', 'Bachata', 
        'Kizomba', 'Jazz', 'Ballet', 'Breakdance', 'Latin'
      ];
      
      const customCategories = categoriesData.map(cat => ('name' in cat ? cat.name : '')).filter(Boolean);
      const allCategories = [...new Set([...defaultCategories, ...customCategories])];
      setCategories(allCategories as string[]);
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories([
        'Afrobeat', 'Hip-Hop', 'Contemporary', 'Salsa', 'Bachata', 
        'Kizomba', 'Jazz', 'Ballet', 'Breakdance', 'Latin'
      ]);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    // Check file type
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      alert('Only JPEG, PNG, and GIF images are allowed');
      return;
    }

    setCourseImage(file);
    setCourseImagePreview(URL.createObjectURL(file));
  };

  const uploadImageToCloudinary = async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/cloudinary/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      return data.secure_url;
    } catch (error: any) {
      console.error('Error uploading image to Cloudinary:', error);
      throw new Error('Failed to upload course image');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsLoading(true);
    try {
      let imageUrl = formData.imageUrl;
      
      // Upload image to Cloudinary if selected
      if (courseImage) {
        try {
          imageUrl = await uploadImageToCloudinary(courseImage);
        } catch (uploadError: any) {
          console.error('Image upload error:', uploadError);
          alert(uploadError.message || 'Failed to upload course image');
          setIsLoading(false);
          return;
        }
      }
      
      const courseData = {
        title: formData.title,
        description: formData.description,
        price: formData.price, // price per session
        sessions: formData.sessions,
        totalPrice: formData.price * formData.sessions, // calculated total price
        duration: formData.duration,
        maxStudents: formData.maxStudents,
        currentStudents: editingCourse?.currentStudents || 0,
        coachId: user.id,
        coachName: `${user.firstName} ${user.lastName}`,
        coachImage: user.profileImage,
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=1000',
        videoLink: formData.videoLink || undefined, // Add video link
        category: formData.category,
        difficulty: formData.difficulty,
        boosted: editingCourse?.boosted || false,
        boostLevel: editingCourse?.boostLevel,
        boostEndDate: editingCourse?.boostEndDate,
        averageRating: editingCourse?.averageRating || 0,
        totalReviews: editingCourse?.totalReviews || 0,
        courseContent: formData.courseContent.filter(
          item => typeof item === 'string' ? item.trim() !== '' : true
        ),
      };

      if (editingCourse) {
        await courseService.update(editingCourse.id, courseData);
      } else {
        await courseService.create(courseData);
      }

      await loadCourses();
      resetForm();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving course:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (course: Course) => {
    // Normalize courseContent to always be an array
    let courseContentArray: string[] = [];
    
    if (Array.isArray(course.courseContent)) {
      courseContentArray = course.courseContent.filter(item => item && item.trim() !== '');
    } else if (course.courseContent && typeof course.courseContent === 'object') {
      courseContentArray = Object.values(course.courseContent as Record<string, string>)
        .filter(item => item && item.trim() !== '');
    } else if (course.courseContent && typeof course.courseContent === 'string') {
      courseContentArray = [course.courseContent];
    }
    
    // Ensure at least one empty field for editing
    if (courseContentArray.length === 0) {
      courseContentArray = [''];
    }
    
    const normalizedCourse = {
      ...course,
      courseContent: courseContentArray
    };
    
    setEditingCourse(normalizedCourse);
    setIsModalOpen(true);
  };

  const handleDelete = async (courseId: string) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      try {
        await courseService.delete(courseId);
        await loadCourses();
      } catch (error) {
        console.error('Error deleting course:', error);
      }
    }
  };

  const handleVideoPreview = (course: Course) => {
    if (course.videoLink) {
      setSelectedVideoUrl(course.videoLink);
      setSelectedVideoTitle(course.title);
      setVideoModalOpen(true);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      price: 0,
      sessions: 1, // default to 1 session
      duration: 60,
      maxStudents: 10,
      category: 'Afrobeat',
      difficulty: 'Beginner',
      imageUrl: '', // Change from image: null to imageUrl: ''
      videoLink: '', // Add video link field
      courseContent: ['']
    });
    setEditingCourse(null);
    setCourseImage(null);
    if (courseImagePreview) {
      URL.revokeObjectURL(courseImagePreview);
      setCourseImagePreview(null);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    setIsAddingCategory(true);
    try {
      await danceCategoryService.create({
        name: newCategoryName.trim(),
        description: `Custom dance category: ${newCategoryName}`,
        createdBy: user?.id || 'unknown'
      });
      
      await loadCategories();
      setFormData(prev => ({ ...prev, category: newCategoryName.trim() }));
      setShowCategoryModal(false);
      setNewCategoryName('');
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Failed to add category. Please try again.');
    } finally {
      setIsAddingCategory(false);
    }
  };

  // Removed duplicate categories declaration to avoid redeclaration error

  const handleViewParticipants = (courseId: string) => {
    if (onSelectCourse) {
      onSelectCourse(courseId);
    }
  };

  const filteredCourses = courses.filter(course => 
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.difficulty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user || user.role !== 'coach') {
    return null;
  }

  if (isLoading && courses.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-12 h-12 border-2 border-[#D91CD2] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 md:px-6 lg:px-8">
      {/* Header */}
      <Card>
        <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold gradient-text">{t('myCourses')}</h2>
          <div className="flex flex-wrap items-center gap-4">
            {/* View Mode Toggle */}
            <div className="flex bg-black/40 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  viewMode === 'grid'
                    ? 'bg-[#D91CD2] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <FiGrid size={16} />
                {t('grid')}
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  viewMode === 'calendar'
                    ? 'bg-[#D91CD2] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <FiCalendar size={16} />
                {t('calendar')}
              </button>
            </div>

            <button
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="btn-primary flex items-center space-x-2"
            >
              <FiPlus size={20} />
              <span>{t('addCourse')}</span>
            </button>
          </div>
        </div>

        <div className="mb-6 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder={t('searchCourses')}
            className="input-primary w-full pl-12"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Content based on view mode */}
        {viewMode === 'calendar' ? (
          <CourseCalendar showManagement={true} onBookCourse={onSelectCourse} />
        ) : (
          /* Courses Grid - Improved Responsive Tiles */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
            {filteredCourses.length > 0 ? (
              filteredCourses.map((course) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-black/60 rounded-xl overflow-hidden border border-gray-700/50 hover:border-[#D91CD2]/60 transition-all duration-300 hover:shadow-lg hover:shadow-[#D91CD2]/20 min-h-[420px] flex flex-col"
                >
                  <div className="relative">
                    <img
                      src={course.imageUrl}
                      alt={course.title}
                      className="w-full h-36 sm:h-40 object-cover"
                    />
                    {/* Action Buttons with better spacing */}
                    <div className="absolute top-2 right-2 flex flex-col space-y-1">
                      {course.videoLink && (
                        <button
                          onClick={() => handleVideoPreview(course)}
                          className="p-1.5 bg-[#D91CD2]/80 rounded-lg hover:bg-[#D91CD2] transition-colors shadow-lg"
                          title={t('playVideo')}
                        >
                          <FiPlay size={14} className="text-white" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(course)}
                        className="p-1.5 bg-blue-500/80 rounded-lg hover:bg-blue-500 transition-colors shadow-lg"
                        title={t('editCourse')}
                      >
                        <FiEdit3 size={14} className="text-white" />
                      </button>
                      <button
                        onClick={() => handleDelete(course.id)}
                        className="p-1.5 bg-red-500/80 rounded-lg hover:bg-red-500 transition-colors shadow-lg"
                        title={t('deleteCourse')}
                      >
                        <FiTrash2 size={14} className="text-white" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-3 flex-1 flex flex-col space-y-2">
                    {/* Course title as link */}
                    <a
                      href={`/courses/${course.id}`}
                      className="font-semibold text-sm lg:text-base text-[#D91CD2] hover:text-white transition-colors underline cursor-pointer block line-clamp-2 min-h-[40px]"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {course.title}
                    </a>
                    
                    <p className="text-gray-400 text-xs lg:text-sm line-clamp-2 flex-1">{course.description}</p>
                    
                    {/* Course Info Grid - Compact with Icons */}
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div className="flex items-center text-gray-300">
                        <svg className="w-3 h-3 mr-1 text-[#D91CD2]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        <span className="truncate">{formatDate(course.createdAt)}</span>
                      </div>
                      <div className="flex items-center text-gray-300">
                        <svg className="w-3 h-3 mr-1 text-[#D91CD2]" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        <span>{course.duration} min</span>
                      </div>
                      <div className="flex items-center text-gray-300">
                        <svg className="w-3 h-3 mr-1 text-[#D91CD2]" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                        </svg>
                        <span>{course.currentStudents}/{course.maxStudents}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-xs font-bold text-green-400 truncate">
                          ${course.price}/session
                        </span>
                      </div>
                    </div>
                    
                    {/* Stats and Rating */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center">
                        <FiStar className="mr-1 text-yellow-400" size={12} />
                        <span>{course.averageRating.toFixed(1)} ({course.totalReviews})</span>
                      </div>
                      <span className="text-green-400 font-semibold">
                        ${course.totalPrice}
                      </span>
                    </div>
                    
                    {/* Difficulty and Category */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex-1 text-center ${
                        course.difficulty === 'Beginner' ? 'bg-green-500/20 text-green-400' :
                        course.difficulty === 'Intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {t(course.difficulty.toLowerCase())}
                      </span>
                      <span className="text-xs bg-[#D91CD2]/20 text-[#D91CD2] px-2 py-1 rounded flex-1 text-center">
                        {course.category}
                      </span>
                    </div>

                    {onSelectCourse && (
                      <button
                        onClick={() => handleViewParticipants(course.id)}
                        className="mt-auto w-full py-2 text-center text-[#D91CD2] border border-[#D91CD2]/30 rounded-lg hover:bg-[#D91CD2]/10 transition-colors text-xs font-medium"
                      >
                        {t('viewParticipants')}
                      </button>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full bg-black/40 p-8 rounded-lg text-center">
                <p className="text-gray-400">{t('noCoursesFound')}</p>
              </div>
            )}
          </div>
        )}
      </Card>
      {/* Add/Edit Course Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-black border border-[#D91CD2]/20 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
        <h3 className="text-xl font-bold gradient-text mb-6">
          {editingCourse ? t('editCourse') : t('addNewCourse')}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">{t('title')}</label>
            <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          required
          className="input-primary w-full"
          placeholder={t('courseTitle')}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-white mb-2">{t('description')}</label>
            <textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          required
          className="input-primary w-full h-24"
          placeholder={t('courseDescription')}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-white mb-2">{t('videoLink')} ({t('optional')})</label>
            <input
          type="url"
          value={formData.videoLink}
          onChange={(e) => setFormData(prev => ({ ...prev, videoLink: e.target.value }))}
          className="input-primary w-full"
          placeholder="https://youtube.com/watch?v=... or direct video URL"
            />
            <p className="text-gray-400 text-xs mt-1">
          {t('addYouTubeLink')}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-white mb-2">{t('category')}</label>
            <div className="flex gap-2">
          <select
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            required
            className="input-primary flex-1"
          >
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowCategoryModal(true)}
            className="px-3 py-2 bg-[#D91CD2]/20 text-[#D91CD2] rounded-lg hover:bg-[#D91CD2]/30 transition-colors text-sm whitespace-nowrap"
          >
            {t('addNew')}
          </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-white mb-2">{t('difficulty')}</label>
            <select
          value={formData.difficulty}
          onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value as 'Beginner' | 'Intermediate' | 'Advanced' }))}
          required
          className="input-primary w-full"
            >
          <option value="Beginner">{t('beginner')}</option>
          <option value="Intermediate">{t('intermediate')}</option>
          <option value="Advanced">{t('advanced')}</option>
            </select>
          </div>
          
          <div className="flex gap-4 items-center">
            <div className="flex-1 flex flex-col">
          <label className="block text-xs font-medium text-white mb-2">{t('pricePerSession')} ($)</label>
          <input
            type="number"
            value={formData.price}
            onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
            required
            min="0"
            step="0.01"
            className="input-primary w-full"
          />
            </div>
            <div className="flex-1 flex flex-col">
          <label className="block text-sm font-small text-white mb-2">{t('numberOfSessions')}</label>
          <input
            type="number"
            value={formData.sessions}
            onChange={(e) => setFormData(prev => ({ ...prev, sessions: Number(e.target.value) }))}
            required
            min="1"
            className="input-primary w-full"
          />
          <div className="text-xs text-gray-400 mt-1">
            {t('total')}: ${(formData.price * formData.sessions).toFixed(2)}
          </div>
            </div>
            <div className="flex-1 flex flex-col">
          <label className="block text-sm font-medium text-white mb-2">{t('duration')} ({t('min')})</label>
          <input
            type="number"
            value={formData.duration}
            onChange={(e) => setFormData(prev => ({ ...prev, duration: Number(e.target.value) }))}
            required
            min="15"
            step="5"
            className="input-primary w-full"
          />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-white mb-2">{t('maxStudents')}</label>
            <input
          type="number"
          value={formData.maxStudents}
          onChange={(e) => setFormData(prev => ({ ...prev, maxStudents: Number(e.target.value) }))}
          required
          min="1"
          className="input-primary w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-white mb-2">{t('whatYouWillLearn')}</label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {formData.courseContent.map((content, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={content}
                    onChange={(e) => {
                      const newContent = [...formData.courseContent];
                      newContent[index] = e.target.value;
                      setFormData(prev => ({ ...prev, courseContent: newContent }));
                    }}
                    className="input-primary w-full text-sm"
                    placeholder={`${t('learningPoint')} ${index + 1}`}
                  />
                  {formData.courseContent.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newContent = formData.courseContent.filter((_, i) => i !== index);
                        setFormData(prev => ({ ...prev, courseContent: newContent }));
                      }}
                      className="p-2 bg-red-500/50 rounded-full hover:bg-red-500/70 transition-colors flex-shrink-0"
                      title={t('remove')}
                    >
                      <FiTrash2 size={14} className="text-white" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    courseContent: [...prev.courseContent, '']
                  }));
                }}
                className="btn-secondary text-sm w-full mt-2 py-2"
              >
                + {t('addLearningPoint')}
              </button>
              
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-white mb-2">{t('courseImage')}</label>
            <div className="space-y-4">
          {(courseImagePreview || formData.imageUrl) ? (
            <div className="relative">
              <img 
            src={courseImagePreview || formData.imageUrl} 
            alt="Course preview" 
            className="w-full h-40 object-cover rounded-lg"
              />
              <button
            type="button"
            onClick={() => {
              if (courseImagePreview) {
                URL.revokeObjectURL(courseImagePreview);
                setCourseImagePreview(null);
              }
              setCourseImage(null);
              setFormData(prev => ({ ...prev, imageUrl: '' }));
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
            className="absolute top-2 right-2 bg-red-500/70 hover:bg-red-500 p-1 rounded-full text-white"
              >
            <FiTrash2 size={16} />
              </button>
            </div>
          ) : (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-500/30 rounded-lg h-40 flex flex-col items-center justify-center cursor-pointer hover:border-[#D91CD2]/50 transition-colors"
            >
              <FiImage size={32} className="text-gray-400 mb-2" />
              <p className="text-gray-400 text-sm">{t('clickToUpload')}</p>
              <p className="text-gray-500 text-xs mt-1">{t('imageFormats')}</p>
            </div>
          )}
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/jpeg, image/png, image/gif"
            className="hidden"
          />
          
          <div className="flex items-center">
            <span className="text-gray-400 text-sm mr-2">{t('orEnterImageUrl')}:</span>
            <input
              type="url"
              value={formData.imageUrl}
              onChange={(e) => {
            // Clear file input if URL is provided
            if (courseImagePreview) {
              URL.revokeObjectURL(courseImagePreview);
              setCourseImagePreview(null);
            }
            setCourseImage(null);
            setFormData(prev => ({ ...prev, imageUrl: e.target.value }));
              }}
              className="input-primary flex-1"
              placeholder="https://example.com/image.jpg"
            />
          </div>
            </div>
          </div>
          
          {/* Show created date if editing */}
          {editingCourse && editingCourse.createdAt && (
            <div>
          <label className="block text-sm font-medium text-white mb-2">{t('createdAt')}</label>
          <div className="input-primary w-full bg-gray-800 text-gray-400 cursor-not-allowed">
            {formatDate(editingCourse.createdAt)}
          </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-4 pt-4">
            <button
          type="button"
          onClick={() => setIsModalOpen(false)}
          className="btn-secondary"
            >
          {t('cancel')}
            </button>
            <button
          type="submit"
          disabled={isLoading}
          className="btn-primary"
            >
          {isLoading ? t('saving') : t('saveCourse')}
            </button>
          </div>
        </form>
          </motion.div>
        </div>
      )}

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-black border border-[#D91CD2]/20 rounded-lg p-6 w-full max-w-sm"
          >
            <h3 className="text-xl font-bold gradient-text mb-4">{t('addDanceCategory')}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">{t('categoryName')}</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="input-primary w-full"
                  placeholder={t('e.gBollywood')}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryModal(false);
                    setNewCategoryName('');
                  }}
                  className="btn-secondary"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim() || isAddingCategory}
                  className="btn-primary"
                >
                  {isAddingCategory ? t('adding') : t('addCategory')}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Video Modal */}
      <VideoModal
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        videoUrl={selectedVideoUrl}
        title={selectedVideoTitle}
      />
    </div>
  );
}
=======
'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiPlus, FiEdit3, FiTrash2, FiUsers, FiStar, FiDollarSign, FiSearch, FiUpload, FiImage, FiCalendar, FiGrid } from 'react-icons/fi';
import { Course } from '@/types';
import { courseService, danceCategoryService } from '@/lib/database';
import { useAuth } from '@/lib/auth';
import Card from '@/components/Card';
import CourseCalendar from '@/components/CourseCalendar';

interface CourseFormData {
  title: string;
  description: string;
  price: number;
  duration: number;
  maxStudents: number;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  imageUrl: string; // Change from File to string URL
  courseContent: string[];
}

interface CourseManagementProps {
  onSelectCourse?: (courseId: string) => void;
}

type ViewMode = 'grid' | 'calendar';

export default function CourseManagement({ onSelectCourse }: CourseManagementProps) {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [formData, setFormData] = useState<CourseFormData>({
    title: '',
    description: '',
    price: 0,
    duration: 60,
    maxStudents: 10,
    category: 'Afrobeat',
    difficulty: 'Beginner',
    imageUrl: '', // Change from image: null to imageUrl: ''
    courseContent: ['']
  });
  const [courseImage, setCourseImage] = useState<File | null>(null);
  const [courseImagePreview, setCourseImagePreview] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load courses on mount
  useEffect(() => {
    loadCourses();
    loadCategories();
  }, [user]);

  const loadCourses = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const userCourses = await courseService.getByCoach(user.id);
      setCourses(userCourses);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const categoriesData = await danceCategoryService.getAll();
      const defaultCategories = [
        'Afrobeat', 'Hip-Hop', 'Contemporary', 'Salsa', 'Bachata', 
        'Kizomba', 'Jazz', 'Ballet', 'Breakdance', 'Latin'
      ];
      
      const customCategories = categoriesData.map(cat => ('name' in cat ? cat.name : '')).filter(Boolean);
      const allCategories = [...new Set([...defaultCategories, ...customCategories])];
      setCategories(allCategories as string[]);
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories([
        'Afrobeat', 'Hip-Hop', 'Contemporary', 'Salsa', 'Bachata', 
        'Kizomba', 'Jazz', 'Ballet', 'Breakdance', 'Latin'
      ]);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    // Check file type
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      alert('Only JPEG, PNG, and GIF images are allowed');
      return;
    }

    setCourseImage(file);
    setCourseImagePreview(URL.createObjectURL(file));
  };

  const uploadImageToCloudinary = async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/cloudinary/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      return data.secure_url;
    } catch (error: any) {
      console.error('Error uploading image to Cloudinary:', error);
      throw new Error('Failed to upload course image');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsLoading(true);
    try {
      let imageUrl = formData.imageUrl;
      
      // Upload image to Cloudinary if selected
      if (courseImage) {
        try {
          imageUrl = await uploadImageToCloudinary(courseImage);
        } catch (uploadError: any) {
          console.error('Image upload error:', uploadError);
          alert(uploadError.message || 'Failed to upload course image');
          setIsLoading(false);
          return;
        }
      }
      
      const courseData = {
        title: formData.title,
        description: formData.description,
        price: formData.price,
        duration: formData.duration,
        maxStudents: formData.maxStudents,
        currentStudents: editingCourse?.currentStudents || 0,
        coachId: user.id,
        coachName: `${user.firstName} ${user.lastName}`,
        coachImage: user.profileImage,
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=1000',
        category: formData.category,
        difficulty: formData.difficulty,
        boosted: editingCourse?.boosted || false,
        boostLevel: editingCourse?.boostLevel,
        boostEndDate: editingCourse?.boostEndDate,
        averageRating: editingCourse?.averageRating || 0,
        totalReviews: editingCourse?.totalReviews || 0,
        courseContent: formData.courseContent.filter(item => item.trim() !== ''),
      };

      if (editingCourse) {
        await courseService.update(editingCourse.id, courseData);
      } else {
        await courseService.create(courseData);
      }

      await loadCourses();
      resetForm();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving course:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (course: Course) => {
    // Normalize courseContent to always be an array
    const normalizedCourse = {
      ...course,
      courseContent: Array.isArray(course.courseContent) 
        ? course.courseContent 
        : (course.courseContent ? [course.courseContent] : [])
    };
    
    setEditingCourse(normalizedCourse);
    setIsModalOpen(true);
  };

  const handleDelete = async (courseId: string) => {
    if (window.confirm('Are you sure you want to delete this course?')) {
      try {
        await courseService.delete(courseId);
        await loadCourses();
      } catch (error) {
        console.error('Error deleting course:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      price: 0,
      duration: 60,
      maxStudents: 10,
      category: 'Afrobeat',
      difficulty: 'Beginner',
      imageUrl: '', // Change from image: null to imageUrl: ''
      courseContent: ['']
    });
    setEditingCourse(null);
    setCourseImage(null);
    if (courseImagePreview) {
      URL.revokeObjectURL(courseImagePreview);
      setCourseImagePreview(null);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    setIsAddingCategory(true);
    try {
      await danceCategoryService.create({
        name: newCategoryName.trim(),
        description: `Custom dance category: ${newCategoryName}`,
        createdBy: user?.id || 'unknown'
      });
      
      await loadCategories();
      setFormData(prev => ({ ...prev, category: newCategoryName.trim() }));
      setShowCategoryModal(false);
      setNewCategoryName('');
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Failed to add category. Please try again.');
    } finally {
      setIsAddingCategory(false);
    }
  };

  // Removed duplicate categories declaration to avoid redeclaration error

  const handleViewParticipants = (courseId: string) => {
    if (onSelectCourse) {
      onSelectCourse(courseId);
    }
  };

  const filteredCourses = courses.filter(course => 
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.difficulty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user || user.role !== 'coach') {
    return null;
  }

  if (isLoading && courses.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-12 h-12 border-2 border-[#D91CD2] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 md:px-6 lg:px-8">
      {/* Header */}
      <Card>
        <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold gradient-text">My Courses</h2>
          <div className="flex flex-wrap items-center gap-4">
            {/* View Mode Toggle */}
            <div className="flex bg-black/40 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  viewMode === 'grid'
                    ? 'bg-[#D91CD2] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <FiGrid size={16} />
                Grid
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  viewMode === 'calendar'
                    ? 'bg-[#D91CD2] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <FiCalendar size={16} />
                Calendar
              </button>
            </div>

            <button
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="btn-primary flex items-center space-x-2"
            >
              <FiPlus size={20} />
              <span>Add Course</span>
            </button>
          </div>
        </div>

        <div className="mb-6 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search courses..."
            className="input-primary w-full pl-12"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Content based on view mode */}
        {viewMode === 'calendar' ? (
          <CourseCalendar showManagement={true} onBookCourse={onSelectCourse} />
        ) : (
          /* Courses Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.length > 0 ? (
              filteredCourses.map((course) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-black/40 rounded-lg overflow-hidden"
                >
                  <div className="relative">
                    <img
                      src={course.imageUrl}
                      alt={course.title}
                      className="w-full h-40 object-cover"
                    />
                    <div className="absolute top-2 right-2 flex space-x-2">
                      <button
                        onClick={() => handleEdit(course)}
                        className="p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                      >
                        <FiEdit3 size={16} className="text-white" />
                      </button>
                      <button
                        onClick={() => handleDelete(course.id)}
                        className="p-2 bg-red-500/50 rounded-full hover:bg-red-500/70 transition-colors"
                      >
                        <FiTrash2 size={16} className="text-white" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    {/* Course title as link */}
                    <a
                      href={`/courses/${course.id}`}
                      className="font-semibold text-lg mb-2 text-[#D91CD2] hover:text-white transition-colors underline cursor-pointer block"
                      style={{ cursor: 'pointer' }}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {course.title}
                    </a>
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">{course.description}</p>
                    
                    <div className="flex items-center justify-between text-sm mb-4">
                      <span className="flex items-center">
                        <FiUsers className="mr-1" />
                        {course.currentStudents}/{course.maxStudents}
                      </span>
                      <span className="flex items-center">
                        <FiStar className="mr-1" />
                        {course.averageRating.toFixed(1)} ({course.totalReviews})
                      </span>
                      <span className="flex items-center">
                        <FiDollarSign className="mr-1" />
                        {course.price}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        course.difficulty === 'Beginner' ? 'bg-green-500/20 text-green-400' :
                        course.difficulty === 'Intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {course.difficulty}
                      </span>
                      <span className="text-xs text-gray-400">{course.duration} min</span>
                    </div>

                    {onSelectCourse && (
                      <button
                        onClick={() => handleViewParticipants(course.id)}
                        className="mt-4 w-full py-2 text-center text-[#D91CD2] border border-[#D91CD2]/30 rounded hover:bg-[#D91CD2]/10 transition-colors text-sm"
                      >
                        View Participants
                      </button>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full bg-black/40 p-8 rounded-lg text-center">
                <p className="text-gray-400">No courses found. Create your first course!</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Add/Edit Course Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-black border border-[#D91CD2]/20 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-xl font-bold gradient-text mb-6">
              {editingCourse ? 'Edit Course' : 'Add New Course'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                  className="input-primary w-full"
                  placeholder="Course title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  required
                  className="input-primary w-full h-24"
                  placeholder="Course description"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">Category</label>
                <div className="flex gap-2">
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    required
                    className="input-primary flex-1"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(true)}
                    className="px-3 py-2 bg-[#D91CD2]/20 text-[#D91CD2] rounded-lg hover:bg-[#D91CD2]/30 transition-colors text-sm whitespace-nowrap"
                  >
                    Add New
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">Difficulty</label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value as 'Beginner' | 'Intermediate' | 'Advanced' }))}
                  required
                  className="input-primary w-full"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Price ($)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                    required
                    min="0"
                    step="0.01"
                    className="input-primary w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Duration (min)</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration: Number(e.target.value) }))}
                    required
                    min="15"
                    step="5"
                    className="input-primary w-full"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">Max Students</label>
                <input
                  type="number"
                  value={formData.maxStudents}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxStudents: Number(e.target.value) }))}
                  required
                  min="1"
                  className="input-primary w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">What You Will Learn</label>
                <div className="space-y-2">
                  {formData.courseContent.map((content, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={content}
                        onChange={(e) => {
                          const newContent = [...formData.courseContent];
                          newContent[index] = e.target.value;
                          setFormData(prev => ({ ...prev, courseContent: newContent }));
                        }}
                        className="input-primary w-full"
                        placeholder={`Learning point ${index + 1}`}
                      />
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newContent = formData.courseContent.filter((_, i) => i !== index);
                            setFormData(prev => ({ ...prev, courseContent: newContent }));
                          }}
                          className="p-2 bg-red-500/50 rounded-full hover:bg-red-500/70 transition-colors"
                        >
                          <FiTrash2 size={16} className="text-white" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        courseContent: [...prev.courseContent, '']
                      }));
                    }}
                    className="btn-secondary text-sm w-full mt-2"
                  >
                    + Add Learning Point
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">Course Image</label>
                <div className="space-y-4">
                  {courseImagePreview || formData.imageUrl ? (
                    <div className="relative">
                      <img 
                        src={courseImagePreview || formData.imageUrl} 
                        alt="Course preview" 
                        className="w-full h-40 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (courseImagePreview) {
                            URL.revokeObjectURL(courseImagePreview);
                            setCourseImagePreview(null);
                          }
                          setCourseImage(null);
                          setFormData(prev => ({ ...prev, imageUrl: '' }));
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                        className="absolute top-2 right-2 bg-red-500/70 hover:bg-red-500 p-1 rounded-full text-white"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-500/30 rounded-lg h-40 flex flex-col items-center justify-center cursor-pointer hover:border-[#D91CD2]/50 transition-colors"
                    >
                      <FiImage size={32} className="text-gray-400 mb-2" />
                      <p className="text-gray-400 text-sm">Click to upload course image</p>
                      <p className="text-gray-500 text-xs mt-1">JPEG, PNG, GIF (max 5MB)</p>
                    </div>
                  )}
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/jpeg, image/png, image/gif"
                    className="hidden"
                  />
                  
                  <div className="flex items-center">
                    <span className="text-gray-400 text-sm mr-2">Or enter image URL:</span>
                    <input
                      type="url"
                      value={formData.imageUrl}
                      onChange={(e) => {
                        // Clear file input if URL is provided
                        if (courseImagePreview) {
                          URL.revokeObjectURL(courseImagePreview);
                          setCourseImagePreview(null);
                        }
                        setCourseImage(null);
                        setFormData(prev => ({ ...prev, imageUrl: e.target.value }));
                      }}
                      className="input-primary flex-1"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary"
                >
                  {isLoading ? 'Saving...' : 'Save Course'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-black border border-[#D91CD2]/20 rounded-lg p-6 w-full max-w-sm"
          >
            <h3 className="text-xl font-bold gradient-text mb-4">Add Dance Category</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Category Name</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="input-primary w-full"
                  placeholder="e.g., Bollywood, K-Pop, etc."
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryModal(false);
                    setNewCategoryName('');
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim() || isAddingCategory}
                  className="btn-primary"
                >
                  {isAddingCategory ? 'Adding...' : 'Add Category'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
>>>>>>> ddd273af2a7b494359b5df1cd43dbc83468035f0
