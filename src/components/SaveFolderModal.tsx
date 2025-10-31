'use client';

import { useState, useEffect } from 'react';
import { SaveFolder } from '@/types';
import { saveFolderService } from '@/lib/database';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';

interface SaveFolderModalProps {
  folders: SaveFolder[];
  editingFolder?: SaveFolder | null;
  onClose: () => void;
  onFolderCreated: () => void;
}

export default function SaveFolderModal({ folders, editingFolder, onClose, onFolderCreated }: SaveFolderModalProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Initialize form with editing folder data
  useEffect(() => {
    if (editingFolder) {
      setNewFolderName(editingFolder.name);
      setNewFolderDescription(editingFolder.description || '');
      setShowCreateForm(true);
    } else {
      setNewFolderName('');
      setNewFolderDescription('');
      setShowCreateForm(false);
    }
  }, [editingFolder]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newFolderName.trim() || creating) return;

    try {
      setCreating(true);
      
      if (editingFolder) {
        // Update existing folder
        await saveFolderService.update(editingFolder.id, {
          name: newFolderName.trim(),
          description: newFolderDescription.trim() || undefined
        });
      } else {
        // Create new folder
        await saveFolderService.create({
          userId: user.id,
          name: newFolderName.trim(),
          description: newFolderDescription.trim() || undefined,
          publicationCount: 0
        });
      }

      setNewFolderName('');
      setNewFolderDescription('');
      setShowCreateForm(false);
      onFolderCreated();
    } catch (error) {
      console.error('Error saving folder:', error);
      alert(t('errorSavingFolder', 'Error saving folder. Please try again.'));
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm(t('confirmDeleteFolder', 'Are you sure you want to delete this folder? All saved publications in this folder will be moved to general saves.'))) {
      return;
    }

    try {
      await saveFolderService.delete(folderId);
      onFolderCreated(); // Refresh the list
    } catch (error) {
      console.error('Error deleting folder:', error);
      alert(t('errorDeletingFolder', 'Error deleting folder. Please try again.'));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-[#D91CD2]/30">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">
              {editingFolder ? t('editFolder', 'Edit Folder') : t('manageFolders', 'Manage Folders')}
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
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Create New Folder */}
          <div className="mb-6">
            {!showCreateForm && !editingFolder ? (
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full p-4 border-2 border-dashed border-[#D91CD2]/30 rounded-lg text-gray-400 hover:border-[#D91CD2] hover:text-[#D91CD2] transition-colors"
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>{t('createNewFolder', 'Create New Folder')}</span>
                </div>
              </button>
            ) : (showCreateForm || editingFolder) && (
              <form onSubmit={handleCreateFolder} className="space-y-4 p-4 border border-[#D91CD2]/30 rounded-lg bg-black/50">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    {t('folderName', 'Folder Name')} *
                  </label>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder={t('enterFolderName', 'Enter folder name')}
                    className="input-primary w-full"
                    disabled={creating}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    {t('description', 'Description')} ({t('optional', 'Optional')})
                  </label>
                  <textarea
                    value={newFolderDescription}
                    onChange={(e) => setNewFolderDescription(e.target.value)}
                    placeholder={t('enterFolderDescription', 'Enter folder description')}
                    rows={2}
                    className="input-primary w-full resize-none"
                    disabled={creating}
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewFolderName('');
                      setNewFolderDescription('');
                      if (editingFolder) {
                        onClose(); // Close modal if editing
                      }
                    }}
                    disabled={creating}
                    className="btn-secondary flex-1"
                  >
                    {t('cancel', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={!newFolderName.trim() || creating}
                    className="btn-primary flex-1"
                  >
                    {creating 
                      ? (editingFolder ? t('updating', 'Updating...') : t('creating', 'Creating...'))
                      : (editingFolder ? t('update', 'Update') : t('create', 'Create'))
                    }
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Existing Folders */}
          {!editingFolder && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                {t('existingFolders', 'Existing Folders')} ({folders.length})
              </h3>
            
            {folders.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <p className="text-gray-400 text-lg mb-2">{t('noFoldersYet', 'No folders created yet')}</p>
                <p className="text-gray-500 text-sm">{t('createFirstFolder', 'Create your first folder to organize your saved publications')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {folders.map((folder) => (
                  <div key={folder.id} className="flex items-center justify-between p-4 border border-[#D91CD2]/30 rounded-lg hover:bg-[#D91CD2]/10 transition-colors">
                    <div className="flex items-center space-x-3">
                      <svg className="w-8 h-8 text-[#D91CD2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <div>
                        <h4 className="font-medium text-white">{folder.name}</h4>
                        {folder.description && (
                          <p className="text-sm text-gray-400">{folder.description}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {folder.publicationCount} {t('publications', 'publications')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleDeleteFolder(folder.id)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                        title={t('deleteFolder', 'Delete folder')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-[#D91CD2]/30">
          <button
            onClick={onClose}
            className="w-full btn-secondary"
          >
            {t('close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
}
