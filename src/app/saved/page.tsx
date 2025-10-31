'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { publicationService, publicationSaveService, saveFolderService } from '@/lib/database';
import { Publication, SaveFolder, PublicationSave } from '@/types';
import PublicationCard from '@/components/PublicationCard';
import SaveFolderModal from '@/components/SaveFolderModal';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  FiBookmark, 
  FiFolder, 
  FiPlus, 
  FiGrid, 
  FiEdit3, 
  FiTrash2,
  FiMoreHorizontal 
} from 'react-icons/fi';

export default function SavedPublicationsPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'all' | 'general' | string>('all');
  const [publications, setPublications] = useState<Publication[]>([]);
  const [saveFolders, setSaveFolders] = useState<SaveFolder[]>([]);
  const [savedPosts, setSavedPosts] = useState<PublicationSave[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<SaveFolder | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    if (user && savedPosts.length > 0) {
      loadPublicationsForTab();
    }
  }, [activeTab, savedPosts]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [folders, saves] = await Promise.all([
        saveFolderService.getUserFolders(user.id),
        publicationSaveService.getUserSaves(user.id)
      ]);

      setSaveFolders(folders);
      setSavedPosts(saves);
    } catch (error) {
      console.error('Error loading saved data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPublicationsForTab = async () => {
    if (!user || savedPosts.length === 0) {
      setPublications([]);
      return;
    }

    try {
      let filteredSaves: PublicationSave[] = [];

      if (activeTab === 'all') {
        filteredSaves = savedPosts;
      } else if (activeTab === 'general') {
        filteredSaves = savedPosts.filter(save => !save.folderId);
      } else {
        filteredSaves = savedPosts.filter(save => save.folderId === activeTab);
      }

      // Get publication IDs
      const publicationIds = filteredSaves.map(save => save.publicationId);
      
      if (publicationIds.length === 0) {
        setPublications([]);
        return;
      }

      // Load publications
      const publicationPromises = publicationIds.map(id => 
        publicationService.getById(id).catch(() => null)
      );
      
      const loadedPublications = await Promise.all(publicationPromises);
      const validPublications = loadedPublications.filter(pub => pub !== null) as Publication[];
      
      // Sort by save date (most recent first)
      const publicationsWithSaveDate = validPublications.map(pub => {
        const saveInfo = filteredSaves.find(save => save.publicationId === pub.id);
        return { ...pub, savedAt: saveInfo?.createdAt };
      });

      publicationsWithSaveDate.sort((a, b) => {
        const aTime = a.savedAt instanceof Date
          ? a.savedAt
          : (a.savedAt && typeof a.savedAt === 'object' && 'toDate' in a.savedAt && typeof a.savedAt.toDate === 'function'
              ? a.savedAt.toDate()
              : new Date(a.savedAt as any));
        const bTime = b.savedAt instanceof Date
          ? b.savedAt
          : (b.savedAt && typeof b.savedAt === 'object' && 'toDate' in b.savedAt && typeof b.savedAt.toDate === 'function'
              ? b.savedAt.toDate()
              : new Date(b.savedAt as any));
        return bTime.getTime() - aTime.getTime();
      });

      setPublications(publicationsWithSaveDate);
    } catch (error) {
      console.error('Error loading publications for tab:', error);
      setPublications([]);
    }
  };

  const handleFolderCreated = () => {
    setShowFolderModal(false);
    setEditingFolder(null);
    loadData();
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm(t('confirmDeleteFolder', 'Are you sure you want to delete this folder? Saved posts will be moved to general saves.'))) {
      return;
    }

    try {
      await saveFolderService.delete(folderId);
      loadData();
      if (activeTab === folderId) {
        setActiveTab('all');
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
    }
  };

  const handleEditFolder = (folder: SaveFolder) => {
    setEditingFolder(folder);
    setShowFolderModal(true);
  };

  const getFolderPublicationCount = (folderId?: string) => {
    if (!folderId) {
      return savedPosts.filter(save => !save.folderId).length;
    }
    return savedPosts.filter(save => save.folderId === folderId).length;
  };

  if (!user) {
    return (
      <div className="min-h-screen mt-16 bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            {t('pleaseLogin', 'Please log in to view your saved publications')}
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mt-16 bg-black">
      {/* Header */}
      <div className="bg-black/80 border-b border-[#D91CD2]/20">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#7000FF] to-[#D91CD2] bg-clip-text text-transparent">
                {t('savedPublications', 'Saved Publications')}
              </h1>
              <p className="text-gray-400 mt-2">
                {t('organizeSavedPosts', 'Organize and access your saved posts')}
              </p>
            </div>
            
            <button
              onClick={() => setShowFolderModal(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <FiPlus className="w-4 h-4" />
              <span>{t('createFolder', 'Create Folder')}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-80">
            <div className="card p-6 sticky top-24">
              <h3 className="font-semibold text-white mb-4 flex items-center">
                <FiFolder className="w-5 h-5 mr-2 text-[#D91CD2]" />
                {t('folders', 'Folders')}
              </h3>
              
              <div className="space-y-2">
                {/* All Posts */}
                <button
                  onClick={() => setActiveTab('all')}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    activeTab === 'all'
                      ? 'bg-gradient-to-r from-[#7000FF]/20 to-[#D91CD2]/20 border border-[#D91CD2]/50 text-[#D91CD2]'
                      : 'hover:bg-[#D91CD2]/10 border border-transparent text-gray-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FiGrid className="w-5 h-5 text-[#D91CD2]" />
                      <span className="font-medium">{t('allSaved', 'All Saved')}</span>
                    </div>
                    <span className="text-sm text-gray-400 bg-black/50 px-2 py-1 rounded-full">
                      {savedPosts.length}
                    </span>
                  </div>
                </button>

                {/* General Saves */}
                <button
                  onClick={() => setActiveTab('general')}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    activeTab === 'general'
                      ? 'bg-gradient-to-r from-[#7000FF]/20 to-[#D91CD2]/20 border border-[#D91CD2]/50 text-[#D91CD2]'
                      : 'hover:bg-[#D91CD2]/10 border border-transparent text-gray-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FiBookmark className="w-5 h-5 text-gray-400" />
                      <span className="font-medium">{t('generalSaves', 'General Saves')}</span>
                    </div>
                    <span className="text-sm text-gray-400 bg-black/50 px-2 py-1 rounded-full">
                      {getFolderPublicationCount()}
                    </span>
                  </div>
                </button>

                {/* Custom Folders */}
                {saveFolders.map((folder) => (
                  <div
                    key={folder.id}
                    className={`p-3 rounded-lg transition-all group ${
                      activeTab === folder.id
                        ? 'bg-gradient-to-r from-[#7000FF]/20 to-[#D91CD2]/20 border border-[#D91CD2]/50 text-[#D91CD2]'
                        : 'hover:bg-[#D91CD2]/10 border border-transparent text-gray-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setActiveTab(folder.id)}
                        className="flex-1 text-left flex items-center space-x-3"
                      >
                        <FiFolder className="w-5 h-5 text-[#D91CD2]" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{folder.name}</div>
                          {folder.description && (
                            <div className="text-sm text-gray-400 truncate">{folder.description}</div>
                          )}
                        </div>
                      </button>
                      
                      <div className="flex items-center space-x-1">
                        <span className="text-sm text-gray-400 bg-black/50 px-2 py-1 rounded-full">
                          {getFolderPublicationCount(folder.id)}
                        </span>
                        
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                          <button
                            onClick={() => handleEditFolder(folder)}
                            className="p-1 text-gray-400 hover:text-[#D91CD2] transition-colors"
                            title={t('editFolder', 'Edit folder')}
                          >
                            <FiEdit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteFolder(folder.id)}
                            className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                            title={t('deleteFolder', 'Delete folder')}
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D91CD2]"></div>
              </div>
            ) : publications.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-[#7000FF] to-[#D91CD2] rounded-full flex items-center justify-center">
                  <FiBookmark className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {activeTab === 'all' 
                    ? t('noSavedPosts', 'No saved posts yet')
                    : activeTab === 'general'
                    ? t('noGeneralSaves', 'No general saves yet')
                    : t('noPostsInFolder', 'No posts in this folder yet')
                  }
                </h3>
                <p className="text-gray-400">
                  {t('startSavingPosts', 'Start saving posts to organize your favorite content!')}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Current folder/tab name */}
                <div className="card p-4">
                  <h2 className="text-lg font-semibold text-white">
                    {activeTab === 'all' 
                      ? t('allSavedPosts', 'All Saved Posts')
                      : activeTab === 'general'
                      ? t('generalSaves', 'General Saves')
                      : saveFolders.find(f => f.id === activeTab)?.name
                    }
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    {publications.length} {t('posts', 'posts')}
                  </p>
                </div>

                {/* Publications Grid */}
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
                        onPublicationUpdate={loadData}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showFolderModal && (
        <SaveFolderModal
          folders={saveFolders}
          editingFolder={editingFolder}
          onClose={() => {
            setShowFolderModal(false);
            setEditingFolder(null);
          }}
          onFolderCreated={handleFolderCreated}
        />
      )}
    </div>
  );
}
