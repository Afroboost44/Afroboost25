'use client';

import { useState } from 'react';
import { SaveFolder } from '@/types';
import { useTranslation } from 'react-i18next';

interface SaveToFolderModalProps {
  folders: SaveFolder[];
  onClose: () => void;
  onSave: (folderId?: string) => void;
}

export default function SaveToFolderModal({ folders, onClose, onSave }: SaveToFolderModalProps) {
  const { t } = useTranslation();
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  const handleSave = () => {
    onSave(selectedFolder || undefined);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">
              {t('saveToFolder', 'Save to Folder')}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-3 mb-6">
            {/* Save without folder option */}
            <button
              onClick={() => setSelectedFolder(null)}
              className={`w-full text-left p-3 rounded-lg border transition-all ${
                selectedFolder === null
                  ? 'border-[#D91CD2] bg-gradient-to-r from-[#7000FF]/20 to-[#D91CD2]/20 text-[#D91CD2]'
                  : 'border-[#D91CD2]/30 hover:border-[#D91CD2]/50 text-gray-300 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <div>
                  <div className="font-medium">{t('generalSaves', 'General Saves')}</div>
                  <div className="text-sm text-gray-400">{t('saveWithoutFolder', 'Save without organizing into a folder')}</div>
                </div>
              </div>
            </button>

            {/* Existing folders */}
            {folders.length > 0 && (
              <>
                <div className="pt-2 border-t border-[#D91CD2]/30">
                  <p className="text-sm font-medium text-white mb-3">{t('existingFolders', 'Existing Folders')}</p>
                </div>
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => setSelectedFolder(folder.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedFolder === folder.id
                        ? 'border-[#D91CD2] bg-gradient-to-r from-[#7000FF]/20 to-[#D91CD2]/20 text-[#D91CD2]'
                        : 'border-[#D91CD2]/30 hover:border-[#D91CD2]/50 text-gray-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-[#D91CD2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      <div>
                        <div className="font-medium">{folder.name}</div>
                        {folder.description && (
                          <div className="text-sm text-gray-400">{folder.description}</div>
                        )}
                        <div className="text-xs text-gray-500">
                          {folder.publicationCount} {t('publications', 'publications')}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}

            {folders.length === 0 && (
              <div className="text-center py-6 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <p className="text-sm">{t('noFoldersYet', 'No folders created yet')}</p>
                <p className="text-xs mt-1 text-gray-500">{t('createFoldersHint', 'Create folders to organize your saved publications')}</p>
              </div>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              {t('cancel', 'Cancel')}
            </button>
            <button
              onClick={handleSave}
              className="btn-primary flex-1"
            >
              {t('save', 'Save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
