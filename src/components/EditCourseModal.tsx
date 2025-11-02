'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiCheck, FiTrash, FiEdit, FiCalendar, FiClock, FiUsers } from 'react-icons/fi';
import { Course } from '@/types';
import { courseService } from '@/lib/database';
import { useTranslation } from 'react-i18next'; // Import useTranslation

interface EditCourseModalProps {
  course: Course;
  onClose: () => void;
  onSave: (course: Course) => void;
}

export default function EditCourseModal({ course, onClose, onSave }: EditCourseModalProps) {
  const { t } = useTranslation(); // Initialize useTranslation
  // Normalize courseContent at the top of the component
  const normalizedCourseContent = Array.isArray(course.courseContent) 
    ? course.courseContent 
    : (course.courseContent ? [course.courseContent] : []);

  const [formData, setFormData] = useState({
    title: course.title,
    description: course.description,
    category: course.category,
    difficulty: course.difficulty,
    price: course.price,
    sessions: course.sessions || 1,
    duration: course.duration || 60,
    maxStudents: course.maxStudents || 10,
    imageUrl: course.imageUrl,
    videoLink: course.videoLink || '',
    courseContent: normalizedCourseContent,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setFormData({
      title: course.title,
      description: course.description,
      category: course.category,
      difficulty: course.difficulty,
      price: course.price,
      sessions: course.sessions || 1,
      duration: course.duration || 60,
      maxStudents: course.maxStudents || 10,
      imageUrl: course.imageUrl,
      videoLink: course.videoLink || '',
      courseContent: normalizedCourseContent,
    });
  }, [course, normalizedCourseContent]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleContentChange = (index: number, value: string) => {
    const updatedContent = [...formData.courseContent];
    updatedContent[index] = value;
    setFormData((prev) => ({ ...prev, courseContent: updatedContent }));
  };

  const handleAddContent = () => {
    setFormData((prev) => ({ ...prev, courseContent: [...prev.courseContent, ''] }));
  };

  const handleRemoveContent = (index: number) => {
    const updatedContent = formData.courseContent.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, courseContent: updatedContent }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      // Call your API or service to update the course
      await courseService.update(course.id, formData);
      
      setSuccess('Course updated successfully!');
      
      // Optionally, call onSave to update the course in the parent component
      onSave({ ...course, ...formData });
      
      // Close the modal after a delay
      setTimeout(onClose, 1000);
    } catch (err: any) {
      console.error('Error updating course:', err);
      setError('Failed to update course. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-black rounded-lg p-6 max-w-3xl mx-auto w-full"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold gradient-text">
            {t('editCourse')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <FiX size={24} />
          </button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-4">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-500/20 border border-green-500 rounded-lg p-3 mb-4">
            <p className="text-green-500 text-sm">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                {t('courseTitle')}
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="input-primary w-full"
                placeholder={t('enterCourseTitle')}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                {t('category')}
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="input-primary w-full"
                required
              >
                <option value="">{t('selectCategory')}</option>
                <option value="Afrobeat">{t('afrobeat')}</option>
                <option value="Hip-Hop">{t('hipHop')}</option>
                <option value="Contemporary">{t('contemporary')}</option>
                <option value="Salsa">{t('salsa')}</option>
                <option value="Bachata">{t('bachata')}</option>
                <option value="Kizomba">{t('kizomba')}</option>
                <option value="Jazz">{t('jazz')}</option>
                <option value="Ballet">{t('ballet')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                {t('difficultyLevel')}
              </label>
              <select
                name="difficulty"
                value={formData.difficulty}
                onChange={handleChange}
                className="input-primary w-full"
                required
              >
                <option value="">{t('selectDifficulty')}</option>
                <option value="Beginner">{t('beginner')}</option>
                <option value="Intermediate">{t('intermediate')}</option>
                <option value="Advanced">{t('advanced')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                {t('price')} ($) - {t('perSession')}
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="input-primary w-full"
                placeholder={t('enterCoursePrice')}
                min="0"
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                {t('numberOfSessions')}
              </label>
              <input
                type="number"
                name="sessions"
                value={formData.sessions}
                onChange={handleChange}
                className="input-primary w-full"
                placeholder={t('enterNumberOfSessions')}
                min="1"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                {t('duration')} ({t('minutes')})
              </label>
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                className="input-primary w-full"
                placeholder={t('enterDuration')}
                min="15"
                step="5"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                {t('maxStudents')}
              </label>
              <input
                type="number"
                name="maxStudents"
                value={formData.maxStudents}
                onChange={handleChange}
                className="input-primary w-full"
                placeholder={t('enterMaxStudents')}
                min="1"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              {t('videoLink')} ({t('optional')})
            </label>
            <input
              type="url"
              name="videoLink"
              value={formData.videoLink}
              onChange={handleChange}
              className="input-primary w-full"
              placeholder="https://youtube.com/watch?v=... or direct video URL"
            />
            <p className="text-gray-400 text-xs mt-1">
              {t('addYouTubeLink')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              {t('description')}
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="input-primary w-full"
              placeholder={t('enterCourseDescription')}
              rows={4}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              {t('courseImageUrl')}
            </label>
            <input
              type="text"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              className="input-primary w-full"
              placeholder={t('enterImageUrl')}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              {t('courseContent')}
            </label>
            <div className="space-y-2">
              {formData.courseContent.map((content, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={content}
                    onChange={(e) => handleContentChange(index, e.target.value)}
                    className="input-primary flex-1"
                    placeholder={`${t('content')} ${index + 1}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveContent(index)}
                    className="text-red-500 hover:text-red-400"
                  >
                    <FiTrash size={20} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddContent}
              className="btn-secondary mt-2"
            >
              + {t('addContent')}
            </button>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 flex justify-center items-center"
              disabled={isSaving}
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <FiCheck className="mr-2" />
                  {t('saveChanges')}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}