'use client';

import { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { FiSave, FiImage, FiEdit, FiX } from 'react-icons/fi';
import { AppContext, translations } from '@/app/providers';
import { useAuth } from '@/lib/auth';
import { contentService } from '@/lib/database';
import { EditableContent } from '@/types';
import Card from '@/components/Card';

interface ContentEditorProps {
  contentType: 'about' | 'privacy' | 'terms';
}

export default function ContentEditor({ contentType }: ContentEditorProps) {
  const { language } = useContext(AppContext);
  const t = translations[language];
  const { user } = useAuth();
  
  const [content, setContent] = useState<EditableContent | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [editedImageUrl, setEditedImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Default content based on type
  const defaultContent = {
    about: {
      title: 'About Afroboosteur',
      content: 'Welcome to Afroboosteur, your premier destination for Afrobeat dance classes. Our mission is to share the joy and energy of African dance with everyone, regardless of experience level.',
      imageUrl: '/globe.svg'
    },
    privacy: {
      title: 'Privacy Policy',
      content: '<h2>Privacy Policy</h2><p>This is the default privacy policy for Afroboosteur. The administrator can edit this content.</p>',
      imageUrl: ''
    },
    terms: {
      title: 'Terms & Conditions',
      content: '<h2>Terms and Conditions</h2><p>This is the default terms and conditions for Afroboosteur. The administrator can edit this content.</p>',
      imageUrl: ''
    }
  };

  // Content type display names
  const contentTypeNames = {
    about: 'About Page',
    privacy: 'Privacy Policy',
    terms: 'Terms & Conditions'
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      loadContent();
    }
  }, [user, contentType]);

  const loadContent = async () => {
    try {
      setIsLoading(true);
      const existingContent = await contentService.getByType(contentType);
      
      if (existingContent) {
        setContent(existingContent);
        setEditedTitle(existingContent.title);
        setEditedContent(existingContent.content);
        setEditedImageUrl(existingContent.imageUrl || '');
      } else {
        // Use default content
        const defaults = defaultContent[contentType];
        setContent({
          id: '',
          type: contentType,
          title: defaults.title,
          content: defaults.content,
          imageUrl: defaults.imageUrl,
          lastUpdated: new Date(),
          lastUpdatedBy: 'system'
        });
        setEditedTitle(defaults.title);
        setEditedContent(defaults.content);
        setEditedImageUrl(defaults.imageUrl);
      }
    } catch (error) {
      console.error(`Error loading ${contentType} content:`, error);
      showMessage('error', 'Failed to load content');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    try {
      setIsSaving(true);
      
      const contentData = {
        type: contentType,
        title: editedTitle,
        content: editedContent,
        imageUrl: editedImageUrl,
        lastUpdated: new Date(),
        lastUpdatedBy: user.id
      };
      
      if (content && content.id) {
        // Update existing content
        await contentService.update(content.id, contentData);
      } else {
        // Create new content
        await contentService.create(contentData);
      }
      
      await loadContent();
      setIsEditing(false);
      showMessage('success', 'Content saved successfully');
    } catch (error) {
      console.error(`Error saving ${contentType} content:`, error);
      showMessage('error', 'Failed to save content');
    } finally {
      setIsSaving(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D91CD2]"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Edit {contentTypeNames[contentType]}</h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="btn-secondary flex items-center space-x-2 text-sm"
          >
            <FiEdit size={16} />
            <span>Edit Content</span>
          </button>
        ) : (
          <button
            onClick={() => {
              setIsEditing(false);
              loadContent(); // Reset to original content
            }}
            className="text-gray-400 hover:text-white"
          >
            <FiX size={20} />
          </button>
        )}
      </div>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg mb-6 flex items-center space-x-2 ${
            message.type === 'success' 
              ? 'bg-green-500/20 border border-green-500/30 text-green-400'
              : 'bg-red-500/20 border border-red-500/30 text-red-400'
          }`}
        >
          {message.type === 'success' ? <FiSave /> : <FiX />}
          <span>{message.text}</span>
        </motion.div>
      )}

      {isEditing ? (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Title
            </label>
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="input-primary w-full"
            />
          </div>

          {contentType === 'about' && (
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Image URL
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={editedImageUrl}
                  onChange={(e) => setEditedImageUrl(e.target.value)}
                  className="input-primary flex-grow"
                  placeholder="/image.jpg or https://..."
                />
                <div className="w-10 h-10 bg-gray-800 rounded flex items-center justify-center">
                  <FiImage className="text-gray-400" />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Enter a path to an image in the public folder (e.g. /globe.svg) or an external URL
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Content (HTML supported)
            </label>
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="input-primary w-full h-64"
              placeholder="Enter content here. HTML tags are supported."
            />
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary w-full flex items-center justify-center space-x-2"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <FiSave />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">{content?.title}</h3>
            
            {contentType === 'about' && content?.imageUrl && (
              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-1">Current Image:</p>
                <div className="relative w-32 h-32 rounded-md overflow-hidden border border-[#D91CD2]/30">
                  <img 
                    src={content.imageUrl}
                    alt="Preview"
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>
            )}
            
            <div className="bg-black/30 border border-[#D91CD2]/10 rounded-md p-4 max-h-80 overflow-y-auto">
              <div className="prose prose-invert max-w-none text-sm">
                <div dangerouslySetInnerHTML={{ __html: content?.content || '' }} />
              </div>
            </div>
          </div>
          
          <div className="text-xs text-gray-400">
            Last updated: {content?.lastUpdated instanceof Date 
              ? content.lastUpdated.toLocaleDateString() 
              : new Date(content?.lastUpdated?.toDate?.() || new Date()).toLocaleDateString()}
          </div>
        </div>
      )}
    </Card>
  );
} 