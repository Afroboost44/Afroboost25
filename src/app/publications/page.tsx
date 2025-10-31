'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { publicationService, publicationLikeService, publicationSaveService, saveFolderService } from '@/lib/database';
import { Publication, SaveFolder } from '@/types';
import PublicationCard from '@/components/PublicationCard';
import CreatePublicationModal from '@/components/CreatePublicationModal';
import SaveFolderModal from '@/components/SaveFolderModal';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function PublicationsPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [userSaves, setUserSaves] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [saveFolders, setSaveFolders] = useState<SaveFolder[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  // Load initial publications only once when user is available
  useEffect(() => {
    if (user && !hasInitialized) {
      loadPublications(true);
      loadUserInteractions();
      loadSaveFolders();
      setHasInitialized(true);
    }
  }, [user, hasInitialized]);

  // Set up infinite scroll observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadPublications(false);
        }
      },
      { threshold: 0.1 }
    );

    if (loadingRef.current) {
      observerRef.current.observe(loadingRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [hasMore, loading]);

  const loadPublications = async (reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPublications([]);
        setLastDoc(null);
      }

      const result = await publicationService.getAll(20, reset ? null : lastDoc);
      
      if (result.publications.length === 0) {
        setHasMore(false);
      } else {
        setPublications(prev => reset ? result.publications : [...prev, ...result.publications]);
        setLastDoc(result.lastDoc);
        setHasMore(result.publications.length === 20);
      }
    } catch (error) {
      console.error('Error loading publications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserInteractions = async () => {
    if (!user) return;

    try {
      // Load user likes and saves
      const likes = new Set<string>();
      const saves = new Set<string>();

      // This would typically be optimized with a single query per user
      // For now, we'll load them as needed in the PublicationCard component
      
      setUserLikes(likes);
      setUserSaves(saves);
    } catch (error) {
      console.error('Error loading user interactions:', error);
    }
  };

  const loadSaveFolders = async () => {
    if (!user) return;

    try {
      const folders = await saveFolderService.getUserFolders(user.id);
      setSaveFolders(folders);
    } catch (error) {
      console.error('Error loading save folders:', error);
    }
  };

  const handlePublicationCreated = () => {
    setShowCreateModal(false);
    loadPublications(true); // Refresh publications
  };

  const handleFolderCreated = () => {
    setShowFolderModal(false);
    loadSaveFolders(); // Refresh folders
  };

  if(!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <h2 className="text-white text-2xl">{t('loginRequired', 'Please log in to view publications')}</h2>
      </div>
    );
  }

  return (

    

    <div className="min-h-screen mt-16 bg-black">
      {/* Header */}
      <div className="bg-black/80 border-b border-[#D91CD2]/20">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#7000FF] to-[#D91CD2] bg-clip-text text-transparent">
                {t('publicationWall', 'Publication Wall')}
              </h1>
              <p className="text-gray-400 mt-2">
                {t('shareYourDanceJourney', 'Share your dance journey with the community')}
              </p>
            </div>
            {user && (
              <div className="flex flex-col xs:flex-row gap-2 xs:gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setShowFolderModal(true)}
                  className="btn-secondary w-full xs:w-auto"
                >
                  {t('manageFolders', 'Manage Folders')}
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary w-full xs:w-auto"
                >
                  {t('createPost', 'Create Post')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Publications Feed */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {publications.length === 0 && !loading ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-[#7000FF] to-[#D91CD2] rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {t('noPublications', 'No publications yet')}
            </h3>
            <p className="text-gray-400 mb-6">
              {t('beFirstToShare', 'Be the first to share your dance journey!')}
            </p>
            {user && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary"
              >
                {t('createFirstPost', 'Create Your First Post')}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {publications.map((publication, index) => (
              <motion.div
                key={publication.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <PublicationCard
                  publication={publication}
                  currentUser={user}
                  saveFolders={saveFolders}
                  onPublicationUpdate={loadPublications}
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* Loading indicator */}
        {loading && publications.length > 0 && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D91CD2]"></div>
          </div>
        )}

        {/* Infinite scroll trigger */}
        <div ref={loadingRef} className="h-10" />

        {/* End of feed indicator */}
        {!hasMore && publications.length > 0 && (
          <div className="text-center py-8">
            <p className="text-gray-400">
              {t('endOfFeed', "You've reached the end!")}
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreatePublicationModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handlePublicationCreated}
        />
      )}

      {showFolderModal && (
        <SaveFolderModal
          folders={saveFolders}
          onClose={() => setShowFolderModal(false)}
          onFolderCreated={handleFolderCreated}
        />
      )}
    </div>
  );
}
