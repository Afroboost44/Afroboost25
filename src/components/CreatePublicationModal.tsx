'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { publicationService } from '@/lib/database';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { Publication } from '@/types';

interface CreatePublicationModalProps {
  onClose: () => void;
  onSuccess: () => void;
  publicationToEdit?: Publication | null; // Optional prop for editing
}

export default function CreatePublicationModal({ onClose, onSuccess, publicationToEdit }: CreatePublicationModalProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [step, setStep] = useState<'media' | 'details'>('media');
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(publicationToEdit?.mediaType || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState(publicationToEdit?.externalMediaUrl || '');
  const [useExternal, setUseExternal] = useState(!!publicationToEdit?.externalMediaUrl);
  const [preview, setPreview] = useState(publicationToEdit?.mediaUrl || null);
  const [caption, setCaption] = useState(publicationToEdit?.caption || '');
  const [socialLinks, setSocialLinks] = useState(publicationToEdit?.socialMediaLinks || {
    instagram: '',
    facebook: '',
    tiktok: '',
    youtube: ''
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      alert(t('pleaseSelectValidFile', 'Please select a valid image or video file'));
      return;
    }

    // Check file size (max 50MB for videos, 10MB for images)
    const maxSize = isVideo ? 150 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(t('fileTooLarge', `File is too large. Maximum size is ${isVideo ? '150MB' : '10MB'}`));
      return;
    }

    setSelectedFile(file);
    setMediaType(isImage ? 'image' : 'video');
    setPreview(URL.createObjectURL(file));
    setUseExternal(false);
    setExternalUrl('');
  };

  const handleExternalUrl = () => {
    if (!externalUrl.trim()) return;

    // Basic URL validation
    try {
      new URL(externalUrl);
    } catch {
      alert(t('pleaseEnterValidUrl', 'Please enter a valid URL'));
      return;
    }

    // Determine media type from URL
    const isYouTube = externalUrl.includes('youtube.com') || externalUrl.includes('youtu.be');
    const isTikTok = externalUrl.includes('tiktok.com');
    const isInstagram = externalUrl.includes('instagram.com');
    const isFacebook = externalUrl.includes('facebook.com');
    
    if (isYouTube || isTikTok || isInstagram || isFacebook) {
      setMediaType('video');
    } else {
      // Assume image for other URLs
      setMediaType('image');
    }

    setUseExternal(true);
    setSelectedFile(null);
    setPreview(null);
  };

  const uploadToCloudinary = async (file: File): Promise<{ url: string; width: number; height: number }> => {
    // Check file size (limit to 150MB for videos, 10MB for images)
    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? 150 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(`File is too large. Maximum size is ${isVideo ? '150MB' : '10MB'}`);
    }

    try {
      // Get Cloudinary config
      const configResponse = await fetch('/api/cloudinary/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!configResponse.ok) {
        throw new Error('Failed to get upload configuration');
      }

      const { cloudName, uploadPreset } = await configResponse.json();

      // Upload directly to Cloudinary with progress tracking (unsigned)
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      formData.append('resource_type', 'auto'); // Auto-detect resource type
      formData.append('folder', 'afroboosteur'); // Keep consistent folder structure

      // Use XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            try {
              const uploadData = JSON.parse(xhr.responseText);
              resolve({
                url: uploadData.secure_url,
                width: uploadData.width || 0,
                height: uploadData.height || 0,
              });
            } catch (error) {
              reject(new Error('Failed to parse upload response'));
            }
          } else {
            reject(new Error(`Upload failed with status: ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`);
        xhr.send(formData);
      });
      
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      throw new Error('Failed to upload file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!mediaType) {
      alert(t('pleaseSelectMedia', 'Please select media to share'));
      return;
    }
    if (!useExternal && !selectedFile && !publicationToEdit) {
      alert(t('pleaseSelectFile', 'Please select a file'));
      return;
    }
    if (useExternal && !externalUrl.trim()) {
      alert(t('pleaseEnterUrl', 'Please enter a URL'));
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      let mediaUrl = publicationToEdit?.mediaUrl || '';
      let externalMediaUrl = publicationToEdit?.externalMediaUrl || undefined;
      let dimensions = { width: 0, height: 0 };

      if (useExternal) {
        externalMediaUrl = externalUrl.trim();
      } else if (selectedFile) {
        const uploadResult = await uploadToCloudinary(selectedFile);
        mediaUrl = uploadResult.url;
        dimensions = { width: uploadResult.width, height: uploadResult.height };
      }

      const filteredSocialLinks = Object.entries(socialLinks).reduce((acc, [key, value]) => {
        if (value.trim()) {
          acc[key as keyof typeof socialLinks] = value.trim();
        }
        return acc;
      }, {} as Partial<typeof socialLinks>);

      if (publicationToEdit) {
        // Update existing publication
        await publicationService.update(publicationToEdit.id, {
          caption: caption.trim(),
          mediaType,
          mediaUrl,
          externalMediaUrl,
          socialMediaLinks: Object.keys(filteredSocialLinks).length > 0 ? filteredSocialLinks : undefined
        });
      } else {
        // Create new publication
        await publicationService.create({
          authorId: user.id,
          authorName: `${user.firstName} ${user.lastName}`,
          authorRole: (user.role === 'admin' || user.role === 'superadmin') ? 'coach' : user.role,
          authorProfileImage: user.profileImage,
          caption: caption.trim(),
          mediaType,
          mediaUrl,
          externalMediaUrl,
          socialMediaLinks: Object.keys(filteredSocialLinks).length > 0 ? filteredSocialLinks : undefined,
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
          isModerated: false,
          width: dimensions.width,
          height: dimensions.height,
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Error creating/updating publication:', error);
      alert(t('errorCreatingPublication', 'Error creating/updating publication. Please try again.'));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  useEffect(() => {
    if (publicationToEdit) {
      setStep('details'); // Skip to details step if editing
    }
  }, [publicationToEdit]);

  const canProceed = () => {
    if (useExternal) {
      return !!externalUrl.trim() && !!mediaType;
    }
    return !!selectedFile && !!mediaType;
  };

  if (step === 'media') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="card max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {t('createPublication', 'Create Publication')}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Media Selection Tabs */}
              <div className="flex space-x-4 border-b border-gray-700">
                <button
                  onClick={() => setUseExternal(false)}
                  className={`pb-2 px-1 border-b-2 transition-colors ${
                    !useExternal
                      ? 'border-purple-500 text-purple-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  {t('uploadFile', 'Upload File')}
                </button>
                <button
                  onClick={() => setUseExternal(true)}
                  className={`pb-2 px-1 border-b-2 transition-colors ${
                    useExternal
                      ? 'border-purple-500 text-purple-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  {t('externalLink', 'External Link')}
                </button>
              </div>

              {!useExternal ? (
                /* File Upload */
                <div>
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 sm:p-8 bg-gray-800/50">
                  {!selectedFile ? (
                    <div className="text-center flex flex-col items-center">
                    <svg className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <div className="mb-3 sm:mb-4 w-full max-w-xs mx-auto">
                      <p className="text-base sm:text-lg font-medium text-white mb-1">
                      {t('dragDropFiles', 'Drag and drop your files here')}
                      </p>
                      <p className="text-gray-400 text-sm sm:text-base">
                      {t('orClickToSelect', 'Or click to select files')}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 mt-2">
                      {t('supportedFormats', 'Supports images (JPG, PNG, GIF, WebP) and videos (MP4, MOV, AVI, WebM)')}
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer btn-secondary px-4 py-2 text-sm sm:text-base"
                    >
                      {t('selectFile', 'Select File')}
                    </label>
                    </div>
                  ) : (
                    <div className="text-center flex flex-col items-center">
                    {preview && mediaType === 'image' && (
                      <div className="mb-3 sm:mb-4 w-full flex justify-center">
                      <Image
                        src={preview}
                        alt="Preview"
                        width={180}
                        height={180}
                        className="mx-auto rounded-lg object-cover max-w-full h-auto"
                        style={{ maxWidth: '180px', maxHeight: '180px' }}
                      />
                      </div>
                    )}
                    {preview && mediaType === 'video' && (
                      <div className="mb-3 sm:mb-4 w-full flex justify-center">
                      <video
                        src={preview}
                        controls
                        className="mx-auto rounded-lg max-w-full h-auto"
                        style={{ maxWidth: '180px', maxHeight: '180px' }}
                      />
                      </div>
                    )}
                    <p className="text-green-600 font-medium mb-2 text-sm sm:text-base break-all">
                      {t('fileSelected', 'File selected:')} {selectedFile.name}
                    </p>
                    <button
                      onClick={() => {
                      setSelectedFile(null);
                      setPreview(null);
                      setMediaType(null);
                      }}
                      className="text-red-500 hover:text-red-700 transition-colors text-sm sm:text-base"
                    >
                      {t('removeFile', 'Remove File')}
                    </button>
                    </div>
                  )}
                  </div>
                </div>
                ) : (
                /* External URL */
                <div className="space-y-4">
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('mediaUrl', 'Media URL')}
                  </label>
                  <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
                    <input
                    type="url"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder={t('enterMediaUrl', 'Enter YouTube or direct media URL')}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white bg-gray-800 placeholder-gray-400 text-sm sm:text-base"
                    />
                    <button
                    onClick={handleExternalUrl}
                    disabled={!externalUrl.trim()}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                    >
                    {t('preview', 'Preview')}
                    </button>
                  </div>
                  </div>

                  {mediaType && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-800">
                        {t('mediaTypeDetected', 'Media type detected:')} 
                        <span className="font-medium ml-1">
                          {mediaType === 'video' ? t('video', 'Video') : t('image', 'Image')}
                        </span>
                      </p>
                    </div>
                  )}

                  <div className="text-sm text-gray-600">
                    <p className="mb-2 font-medium">{t('supportedPlatforms', 'Supported platforms:')}</p>
                    <ul className="space-y-1 text-gray-500">
                      <li>• YouTube</li>
                      <li>• {t('directMediaLinks', 'Direct media links')}</li>
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <button
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {t('cancel', 'Cancel')}
                </button>
                <button
                  onClick={() => setStep('details')}
                  disabled={!canProceed()}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t('next', 'Next')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="card max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">
              {t('addDetails', 'Add Details')}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {uploading && (
            <div className="mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-blue-800 font-medium">{t('uploading', 'Uploading...')}</span>
                  <span className="text-blue-600">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Caption */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('caption', 'Caption')}
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder={t('writeCaption', 'Write a caption for your publication...')}
                rows={4}
                className="w-full border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-white bg-gray-800 placeholder-gray-400"
                disabled={uploading}
              />
            </div>

            {/* Social Media Links (for students only) */}
            {user?.role === 'student' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-4">
                  {t('socialMediaLinks', 'Social Media Links')} ({t('optional', 'Optional')})
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Instagram</label>
                    <input
                      type="url"
                      value={socialLinks.instagram}
                      onChange={(e) => setSocialLinks(prev => ({ ...prev, instagram: e.target.value }))}
                      placeholder="https://instagram.com/username"
                      className="w-full border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white bg-gray-800 placeholder-gray-400"
                      disabled={uploading}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Facebook</label>
                    <input
                      type="url"
                      value={socialLinks.facebook}
                      onChange={(e) => setSocialLinks(prev => ({ ...prev, facebook: e.target.value }))}
                      placeholder="https://facebook.com/username"
                      className="w-full border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white bg-gray-800 placeholder-gray-400"
                      disabled={uploading}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">TikTok</label>
                    <input
                      type="url"
                      value={socialLinks.tiktok}
                      onChange={(e) => setSocialLinks(prev => ({ ...prev, tiktok: e.target.value }))}
                      placeholder="https://tiktok.com/@username"
                      className="w-full border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white bg-gray-800 placeholder-gray-400"
                      disabled={uploading}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">YouTube</label>
                    <input
                      type="url"
                      value={socialLinks.youtube}
                      onChange={(e) => setSocialLinks(prev => ({ ...prev, youtube: e.target.value }))}
                      placeholder="https://youtube.com/channel/username"
                      className="w-full border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white bg-gray-800 placeholder-gray-400"
                      disabled={uploading}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setStep('media')}
                disabled={uploading}
                className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('back', 'Back')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={uploading}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? t('publishing', 'Publishing...') : t('publish', 'Publish')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
