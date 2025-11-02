'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiSmile, FiPlus, FiTrash2, FiUpload, FiX, FiCheck, FiLoader } from 'react-icons/fi';
import { useAuth } from '@/lib/auth';
import { CustomEmoji } from '@/types';
import { emojiService } from '@/lib/database';
import Card from '@/components/Card';
import Image from 'next/image';
import { useTranslation } from 'react-i18next'; // Import useTranslation

export default function EmojiManager() {
  const { t } = useTranslation(); // Initialize useTranslation
  const { user } = useAuth();
  const [emojis, setEmojis] = useState<CustomEmoji[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [newEmojiName, setNewEmojiName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'superadmin') {
      loadEmojis();
    }
  }, [user]);

  // Create preview URL when file is selected
  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    // Free memory when component unmounts
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const loadEmojis = async () => {
    try {
      setIsLoading(true);
      const emojiList = await emojiService.getAll();
      setEmojis(emojiList);
    } catch (error) {
      console.error('Error loading emojis:', error);
      setError('Failed to load custom emojis');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      setSelectedFile(null);
      return;
    }

    const file = e.target.files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError(t('pleaseSelectImageFile'));
      return;
    }
    
    // Validate file size (max 200KB)
    if (file.size > 200 * 1024) {
      setError(t('imageSizeLessThan200KB'));
      return;
    }

    setSelectedFile(file);
    setError(null);
  };

  const uploadToCloudinary = async (file: File): Promise<string> => {
    // Create a FormData object to send the file
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'emoji');

    // Upload using our API route
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload image');
    }

    const data = await response.json();
    return data.url;
  };

  const handleAddEmoji = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEmojiName.trim()) {
      setError(t('pleaseEnterEmojiName'));
      return;
    }

    if (!selectedFile) {
      setError(t('pleaseSelectImageFile'));
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      
      // Upload image to Cloudinary
      const imageUrl = await uploadToCloudinary(selectedFile);
      
      // Add emoji to database
      await emojiService.create({
        name: newEmojiName.trim(),
        imageUrl,
        createdBy: user?.id || ''
      });
      
      // Reset form
      setNewEmojiName('');
      setSelectedFile(null);
      setPreviewUrl(null);
      
      // Show success message
      setSuccess(t('emojiAddedSuccessfully'));
      setTimeout(() => setSuccess(null), 3000);
      
      // Reload emojis
      await loadEmojis();
    } catch (error) {
      console.error('Error adding emoji:', error);
      setError(t('failedToAddEmoji'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteEmoji = async (id: string) => {
    if (!confirm(t('areYouSureDeleteEmoji'))) {
      return;
    }

    try {
      await emojiService.delete(id);
      setEmojis(prev => prev.filter(emoji => emoji.id !== id));
      setSuccess(t('emojiDeletedSuccessfully'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error deleting emoji:', error);
      setError(t('failedToDeleteEmoji'));
    }
  };

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return null;
  }

  return (
    <Card>
      <div className="flex items-center space-x-3 mb-6">
        <FiSmile className="text-[#D91CD2]" size={24} />
        <h2 className="text-2xl font-bold">{t('customEmojiManager')}</h2>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-6 flex items-center">
          <FiX className="text-red-500 mr-2" />
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-500/20 border border-green-500 rounded-lg p-3 mb-6 flex items-center">
          <FiCheck className="text-green-500 mr-2" />
          <p className="text-green-500 text-sm">{success}</p>
        </div>
      )}

      {/* Add New Emoji Form */}
      <form onSubmit={handleAddEmoji} className="mb-8 bg-gray-800 p-4 rounded-lg">
        <h3 className="text-lg font-medium mb-4">{t('addNewEmoji')}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">{t('emojiName')}</label>
            <input
              type="text"
              value={newEmojiName}
              onChange={(e) => setNewEmojiName(e.target.value)}
              className="input-primary w-full"
              placeholder={t('emojiNamePlaceholder')}
              disabled={isUploading}
            />
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">{t('emojiImage')}</label>
            <div className="relative">
              <input
                type="file"
                onChange={handleFileChange}
                className="hidden"
                id="emoji-upload"
                accept="image/*"
                disabled={isUploading}
              />
              <label
                htmlFor="emoji-upload"
                className="input-primary w-full flex items-center cursor-pointer"
              >
                <FiUpload className="mr-2" />
                {selectedFile ? selectedFile.name : t('chooseFile')}
              </label>
            </div>
            <p className="text-xs text-gray-400">{t('maxSize200KB')}</p>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-transparent select-none">{t('add')}</label>
            <button
              type="submit"
              disabled={isUploading}
              className="btn-primary w-full flex items-center justify-center"
            >
              {isUploading ? (
                <FiLoader className="animate-spin mr-2" />
              ) : (
                <FiPlus className="mr-2" />
              )}
              {t('addEmoji')}
            </button>
          </div>
        </div>
        
        {previewUrl && (
          <div className="mt-4 flex items-center space-x-4">
            <div className="w-16 h-16 bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center">
              <Image
                src={previewUrl}
                alt={t('emojiPreview')}
                width={64}
                height={64}
                className="max-w-full max-h-full"
              />
            </div>
            <div>
              <h4 className="font-medium">{t('preview')}</h4>
              <p className="text-sm text-gray-400">{t('emojiAppearancePreview')}</p>
            </div>
          </div>
        )}
      </form>

      {/* Emoji List */}
      <div>
        <h3 className="text-lg font-medium mb-4">{t('yourCustomEmojis')}</h3>
        
        {isLoading ? (
          <div className="text-center py-8">
            <FiLoader className="animate-spin mx-auto text-2xl mb-2" />
            <p className="text-gray-400">{t('loadingEmojis')}</p>
          </div>
        ) : emojis.length === 0 ? (
          <div className="text-center py-8 bg-gray-800 rounded-lg">
            <FiSmile className="mx-auto text-4xl text-gray-500 mb-4" />
            <p className="text-gray-400">{t('noCustomEmojisAdded')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {emojis.map(emoji => (
              <motion.div
                key={emoji.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-gray-800 rounded-lg p-3 flex flex-col items-center"
              >
                <div className="w-16 h-16 bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center mb-2">
                  <Image
                    src={emoji.imageUrl}
                    alt={emoji.name}
                    width={64}
                    height={64}
                    className="max-w-full max-h-full"
                  />
                </div>
                <p className="text-sm font-medium mb-2 text-center truncate w-full">{emoji.name}</p>
                <button
                  onClick={() => handleDeleteEmoji(emoji.id)}
                  className="text-red-400 hover:text-red-300 text-sm flex items-center"
                >
                  <FiTrash2 className="mr-1" size={12} />
                  {t('delete')}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}