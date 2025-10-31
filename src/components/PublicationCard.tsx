'use client';

import { useState, useEffect } from 'react';
import { Publication, User, SaveFolder } from '@/types';
import { publicationLikeService, publicationSaveService, publicationCommentService, publicationShareService, publicationService } from '@/lib/database';
import { formatDistanceToNow } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { FiEdit } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import CommentsSection from './CommentsSection';
import ShareModal from './ShareModal';
import SaveToFolderModal from './SaveToFolderModal';
import CreatePublicationModal from './CreatePublicationModal';

interface PublicationCardProps {
  publication: Publication;
  currentUser: User | null;
  saveFolders: SaveFolder[];
  onPublicationUpdate?: () => void;
}

export default function PublicationCard({ 
  publication, 
  currentUser, 
  saveFolders, 
  onPublicationUpdate 
}: PublicationCardProps) {
  const { t } = useTranslation();
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);

  useEffect(() => {
    if (currentUser) {
      checkUserInteractions();
    }
  }, [currentUser, publication.id]);

  const checkUserInteractions = async () => {
    if (!currentUser) return;

    try {
      const [like, save] = await Promise.all([
        publicationLikeService.getUserLike(publication.id, currentUser.id),
        publicationSaveService.getUserSave(publication.id, currentUser.id)
      ]);

      setIsLiked(!!like);
      setIsSaved(!!save);
    } catch (error) {
      console.error('Error checking user interactions:', error);
    }
  };

  const handleLike = async () => {
    if (!currentUser || isLoading) return;

    setIsLoading(true);
    try {
      if (isLiked) {
        await publicationLikeService.delete(publication.id, currentUser.id);
        setIsLiked(false);
      } else {
        await publicationLikeService.create(publication.id, currentUser.id);
        setIsLiked(true);
      }
      onPublicationUpdate?.();
    } catch (error) {
      console.error('Error handling like:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (folderId?: string) => {
    if (!currentUser || isLoading) return;

    setIsLoading(true);
    try {
      if (isSaved) {
        await publicationSaveService.delete(publication.id, currentUser.id);
        setIsSaved(false);
      } else {
        await publicationSaveService.create(publication.id, currentUser.id, folderId);
        setIsSaved(true);
      }
      setShowSaveModal(false);
      onPublicationUpdate?.();
    } catch (error) {
      console.error('Error handling save:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async (shareType: 'facebook' | 'twitter' | 'whatsapp' | 'linkedin' | 'copy_link') => {
    if (!currentUser) return;

    try {
      await publicationShareService.create({
        publicationId: publication.id,
        userId: currentUser.id,
        shareType
      });

      const publicationUrl = `${window.location.origin}/publications/${publication.id}`;
      
      switch (shareType) {
        case 'facebook':
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicationUrl)}`, '_blank');
          break;
        case 'twitter':
          window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(publicationUrl)}&text=${encodeURIComponent(publication.caption)}`, '_blank');
          break;
        case 'whatsapp':
          window.open(`https://wa.me/?text=${encodeURIComponent(publication.caption + ' ' + publicationUrl)}`, '_blank');
          break;
        case 'linkedin':
          window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicationUrl)}`, '_blank');
          break;
        case 'copy_link':
          await navigator.clipboard.writeText(publicationUrl);
          break;
      }

      setShowShareModal(false);
      onPublicationUpdate?.();
    } catch (error) {
      console.error('Error handling share:', error);
    }
  };

  const handleDelete = async () => {
    if (!currentUser || (!(currentUser.id === publication.authorId || currentUser.role === 'admin' || currentUser.role === 'superadmin')) || isLoading) return;

    if (!confirm(t('confirmDeletePost', 'Are you sure you want to delete this post? This action cannot be undone.'))) {
      return;
    }

    setIsLoading(true);
    try {
      await publicationService.delete(publication.id);
      onPublicationUpdate?.();
    } catch (error) {
      console.error('Error deleting publication:', error);
      alert(t('errorDeletingPost', 'Error deleting post. Please try again.'));
    } finally {
      setIsLoading(false);
      window.location.reload();
    }
  };

  const formatDate = (date: any) => {
    try {
      const dateObj = date instanceof Timestamp ? date.toDate() : new Date(date);
      return formatDistanceToNow(dateObj, { addSuffix: true });
    } catch (error) {
      return 'Recently';
    }
  };

// Option 1: Use object-cover to fill the container (may crop video)
const renderMedia = () => {
  const getAspectRatio = () => {
    if (publication.width && publication.height) {
      return publication.width / publication.height;
    }
    return publication.mediaType === 'video' ? 16/9 : 1;
  };

  const aspectRatio = getAspectRatio();
  let containerAspectRatio = aspectRatio;

  // Instagram constraints
  if (aspectRatio > 1.91) {
    containerAspectRatio = 1.91; // Max landscape
  } else if (aspectRatio < 0.8) {
    containerAspectRatio = 0.8; // Max portrait (4:5)
  }

  const containerStyle = {
    aspectRatio: containerAspectRatio.toString(),
    width: '100%'
  };

  const mediaClasses = "w-full h-full object-cover"; // Changed from object-contain to object-cover

  if (publication.mediaType === 'video') {
    if (publication.externalMediaUrl) {
      if (publication.externalMediaUrl.includes('youtube.com') || publication.externalMediaUrl.includes('youtu.be')) {
        const videoId = publication.externalMediaUrl.includes('youtu.be') 
          ? publication.externalMediaUrl.split('/').pop()?.split('?')[0]
          : new URL(publication.externalMediaUrl).searchParams.get('v');
        
        return (
          <div className="relative bg-black" style={containerStyle}>
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title="YouTube video"
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        );
      }
      
      return (
        <div className="relative bg-black" style={containerStyle}>
          <video
            src={publication.externalMediaUrl}
            controls
            playsInline
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover" // Changed to object-cover
            poster={publication.mediaUrl}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    } else {
      const posterUrl = publication.mediaUrl
        .replace('/upload/v1754019030/', '/upload/so_1/')
        .replace('.mp4', '.jpg');
      
      return (
        <div className="relative bg-black" style={containerStyle}>
          <video
            src={publication.mediaUrl}
            controls
            playsInline
            poster={posterUrl}
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover" // Changed to object-cover
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }
  } else {
    return (
      <div className="relative bg-gray-900" style={containerStyle}>
        <Image
          src={publication.mediaUrl}
          alt={publication.caption}
          fill
          className={mediaClasses}
          sizes="(max-width: 640px) 100vw, 470px"
        />
      </div>
    );
  }
};

// Option 2: Dynamic aspect ratio based on actual video dimensions
const renderMediaDynamic = () => {
  // Use the actual video aspect ratio without constraints
  const aspectRatio = publication.width && publication.height 
    ? publication.width / publication.height 
    : 16/9;

  const containerStyle = {
    aspectRatio: aspectRatio.toString(),
    width: '100%'
  };

  if (publication.mediaType === 'video') {
    if (publication.externalMediaUrl) {
      return (
        <div className="relative" style={containerStyle}>
          <video
            src={publication.externalMediaUrl}
            controls
            playsInline
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover"
            poster={publication.mediaUrl}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    } else {
      const posterUrl = publication.mediaUrl
        .replace('/upload/v1754019030/', '/upload/so_1/')
        .replace('.mp4', '.jpg');
      
      return (
        <div className="relative" style={containerStyle}>
          <video
            src={publication.mediaUrl}
            controls
            playsInline
            poster={posterUrl}
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }
  }
  // ... rest of image handling
};

// Option 3: Remove container constraints entirely for videos
const renderMediaFlex = () => {
  if (publication.mediaType === 'video') {
    return (
      <div className="relative w-full">
        <video
          src={publication.externalMediaUrl || publication.mediaUrl}
          controls
          playsInline
          preload="metadata"
          className="w-full h-auto" // Let video maintain its natural aspect ratio
          poster={publication.mediaUrl}
        >
          Your browser does not support the video tag.
        </video>
      </div>
    );
  } else {
    // Keep existing image logic with constraints
    const getAspectRatio = () => {
      if (publication.width && publication.height) {
        return publication.width / publication.height;
      }
      return 1;
    };

    const aspectRatio = getAspectRatio();
    let containerAspectRatio = aspectRatio;

    if (aspectRatio > 1.91) {
      containerAspectRatio = 1.91;
    } else if (aspectRatio < 0.8) {
      containerAspectRatio = 0.8;
    }

    const containerStyle = {
      aspectRatio: containerAspectRatio.toString(),
      width: '100%'
    };

    return (
      <div className="relative bg-gray-900" style={containerStyle}>
        <Image
          src={publication.mediaUrl}
          alt={publication.caption}
          fill
          className="w-full h-full object-cover"
          sizes="(max-width: 640px) 100vw, 470px"
        />
      </div>
    );
  }
};

  const toggleCaption = () => {
    setIsCaptionExpanded(!isCaptionExpanded);
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  return (
    <article className="w-full max-w-[470px] mx-auto bg-black border border-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between p-3">
        <Link href="" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
          <div className="relative">
            <div className={`w-8 h-8 rounded-full overflow-hidden ${publication.authorRole === 'coach' ? 'ring-2 ring-gradient-to-r from-[#7000FF] to-[#D91CD2] p-0.5' : ''}`}>
              <div className="w-full h-full rounded-full overflow-hidden bg-gray-800">
                <Image
                  src={publication.authorProfileImage || '/default-avatar.png'}
                  alt={publication.authorName}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            {publication.authorRole === 'coach' && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-[#7000FF] to-[#D91CD2] rounded-full flex items-center justify-center">
                <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-white text-sm truncate">{publication.authorName}</h3>
              {publication.authorRole === 'coach' && (
                <span className="px-2 py-0.5 text-xs bg-gradient-to-r from-[#7000FF] to-[#D91CD2] text-white rounded-full font-medium flex-shrink-0">
                  {t('coach', 'Coach')}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">{formatDate(publication.createdAt)}</p>
          </div>
        </Link>
        
        {currentUser && (currentUser.id === publication.authorId || currentUser?.role === 'admin' || currentUser?.role === 'superadmin') && (
          <div className="flex items-center space-x-1">
            <button
              onClick={handleEdit}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              aria-label={t('editPost', 'Edit Post')}
            >
              <FiEdit className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
              aria-label={t('deletePost', 'Delete Post')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        )}
      </header>

      {/* Media */}
      <div className="w-full">
        {renderMedia()}
      </div>

      {/* Action Buttons */}
      {currentUser && (
        <div className="px-3 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLike}
                disabled={isLoading}
                className="transition-transform hover:scale-110 disabled:opacity-50"
                aria-label={isLiked ? 'Unlike' : 'Like'}
              >
                <svg 
                  className={`w-6 h-6 ${isLiked ? 'text-red-500 fill-current' : 'text-white'}`} 
                  fill={isLiked ? 'currentColor' : 'none'} 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={1.5} 
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                  />
                </svg>
              </button>

              <button
                onClick={() => setShowComments(!showComments)}
                className="transition-transform hover:scale-110"
                aria-label="Comment"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>

              <button
                onClick={() => setShowShareModal(true)}
                className="transition-transform hover:scale-110"
                aria-label="Share"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            
            <button
              onClick={() => setShowSaveModal(true)}
              disabled={isLoading}
              className="transition-transform hover:scale-110 disabled:opacity-50"
              aria-label={isSaved ? 'Unsave' : 'Save'}
            >
              <svg 
                className={`w-6 h-6 ${isSaved ? 'text-white fill-current' : 'text-white'}`} 
                fill={isSaved ? 'currentColor' : 'none'} 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 3H7a2 2 0 00-2 2v16l7-3 7 3V5a2 2 0 00-2-2z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Engagement Stats */}
      <div className="px-3 pb-1">
        <div className="flex items-center space-x-4 text-sm">
          <span className="font-semibold text-white">{publication.likes.toLocaleString()} likes</span>
          <span className="text-gray-400">{publication.comments} comments</span>
          <span className="text-gray-400">{publication.shares} shares</span>
        </div>
      </div>

      {/* Caption */}
      {publication.caption && (
        <div className="px-3 pb-2">
          <div className="text-sm text-white">
            <span className="font-semibold mr-2">{publication.authorName}</span>
            <span 
              className={`${isCaptionExpanded ? '' : 'line-clamp-2'} cursor-pointer`}
              onClick={toggleCaption}
              dangerouslySetInnerHTML={{ __html: publication.caption.replace(/\n/g, '<br />') }}
            />
            {publication.caption.length > 150 && (
              <button
                onClick={toggleCaption}
                className="text-gray-400 hover:text-white transition-colors ml-1"
              >
                {isCaptionExpanded ? 'less' : 'more'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Social Media Links */}
      {publication.authorRole === 'student' && publication.socialMediaLinks && (
        <div className="px-3 pb-2">
          <div className="flex items-center space-x-3">
            <span className="text-xs text-gray-400">{t('followOn', 'Follow on')}:</span>
            <div className="flex space-x-2">
              {publication.socialMediaLinks.instagram && (
                <a
                  href={publication.socialMediaLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pink-500 hover:text-pink-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              )}
              {publication.socialMediaLinks.facebook && (
                <a
                  href={publication.socialMediaLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
              )}
              {publication.socialMediaLinks.tiktok && (
                <a
                  href={publication.socialMediaLinks.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-gray-300 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                  </svg>
                </a>
              )}
              {publication.socialMediaLinks.youtube && (
                <a
                  href={publication.socialMediaLinks.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-500 hover:text-red-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Course Button */}
      <div className="px-3 pb-3">
        <Link
          href="/courses"
          className="block w-full text-center py-2 rounded-lg bg-gradient-to-r from-[#7000FF] to-[#D91CD2] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          {t('booking', 'View Course')}
        </Link>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-gray-800">
          <CommentsSection
            publicationId={publication.id}
            currentUser={currentUser}
          />
        </div>
      )}

      {/* Modals */}
      {showShareModal && (
        <ShareModal
          onClose={() => setShowShareModal(false)}
          onShare={handleShare}
        />
      )}

      {showSaveModal && (
        <SaveToFolderModal
          folders={saveFolders}
          onClose={() => setShowSaveModal(false)}
          onSave={handleSave}
        />
      )}

      {showEditModal && (
        <CreatePublicationModal
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            onPublicationUpdate?.();
            window.location.reload();
          }}
          publicationToEdit={publication}
        />
      )}
    </article>
  );
}