'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiSave, FiImage, FiEdit, FiX, FiBold, FiItalic, FiLink, FiList, FiType, FiCode, FiEye } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { contentService } from '@/lib/database';
import { EditableContent } from '@/types';
import Card from '@/components/Card';

interface ContentEditorProps {
  contentType: 'about' | 'privacy' | 'terms';
}

export default function ContentEditor({ contentType }: ContentEditorProps) {
  const { t } = useTranslation(); // Initialize useTranslation
  const { user } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [content, setContent] = useState<EditableContent | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [editedImageUrl, setEditedImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Default content based on type
  const defaultContent = {
    about: {
      title: t('aboutAfroboosteur'),
      content: `<h2>${t('aboutAfroboosteur')}</h2>
<p>${t('aboutDefaultContent')}</p>
<br>
<p><strong>Notre Mission:</strong></p>
<ul>
<li>Promouvoir la culture africaine à travers la danse</li>
<li>Offrir des cours de qualité avec des instructeurs expérimentés</li>
<li>Créer une communauté inclusive et dynamique</li>
</ul>
<br>
<p><a href="mailto:contact@afroboost.com">Contactez-nous</a> pour plus d'informations.</p>`,
      imageUrl: '/globe.svg'
    },
    privacy: {
      title: t('privacyPolicy'),
      content: `<h2>Politique de Confidentialité</h2>
<p><strong>Dernière mise à jour:</strong> ${new Date().toLocaleDateString()}</p>
<br>
<h3>1. Collecte des données</h3>
<p>Nous collectons uniquement les données nécessaires à la création de votre compte et à l'amélioration de nos services.</p>
<br>
<h3>2. Utilisation des données</h3>
<p>Vos données sont utilisées pour:</p>
<ul>
<li>La gestion de votre compte</li>
<li>L'amélioration de nos services</li>
<li>La communication avec vous</li>
</ul>
<br>
<h3>3. Protection des données</h3>
<p>Nous mettons en place des mesures de sécurité appropriées pour protéger vos informations personnelles.</p>
<br>
<p>Pour toute question, contactez-nous à <a href="mailto:privacy@afroboost.com">privacy@afroboost.com</a></p>`,
      imageUrl: ''
    },
    terms: {
      title: t('termsConditions'),
      content: `<h2>Conditions Générales d'Utilisation</h2>
<p><strong>Dernière mise à jour:</strong> ${new Date().toLocaleDateString()}</p>
<br>
<h3>1. Objet</h3>
<p>Les présentes Conditions Générales régissent l'utilisation de notre plateforme AfroBoost.</p>
<br>
<h3>2. Inscription et compte utilisateur</h3>
<p>Pour accéder à nos services, vous devez:</p>
<ul>
<li>Créer un compte avec des informations exactes</li>
<li>Maintenir la confidentialité de votre mot de passe</li>
<li>Respecter nos conditions d'utilisation</li>
</ul>
<br>
<h3>3. Paiements et remboursements</h3>
<p>Les paiements sont traités de manière sécurisée. Les conditions de remboursement sont disponibles dans notre politique de remboursement.</p>
<br>
<p>Pour toute question, contactez-nous à <a href="mailto:legal@afroboost.com">legal@afroboost.com</a></p>`,
      imageUrl: ''
    }
  };

  // Content type display names
  const contentTypeNames = {
    about: t('aboutPage'),
    privacy: t('privacyPolicy'),
    terms: t('termsConditions')
  };

  // Rich text editing functions
  const insertFormatting = (startTag: string, endTag: string = '') => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = editedContent.substring(start, end);
    
    const beforeText = editedContent.substring(0, start);
    const afterText = editedContent.substring(end);
    
    let newText;
    if (selectedText) {
      newText = beforeText + startTag + selectedText + (endTag || startTag) + afterText;
    } else {
      newText = beforeText + startTag + (endTag || startTag) + afterText;
    }
    
    setEditedContent(newText);
    
    // Reset cursor position
    setTimeout(() => {
      if (selectedText) {
        textarea.selectionStart = start + startTag.length;
        textarea.selectionEnd = start + startTag.length + selectedText.length;
      } else {
        const newPosition = start + startTag.length;
        textarea.selectionStart = newPosition;
        textarea.selectionEnd = newPosition;
      }
      textarea.focus();
    }, 0);
  };

  const insertBold = () => insertFormatting('<strong>', '</strong>');
  const insertItalic = () => insertFormatting('<em>', '</em>');
  const insertHeading = () => insertFormatting('<h3>', '</h3>');
  const insertParagraph = () => insertFormatting('<p>', '</p>');
  const insertBreak = () => insertFormatting('<br>\n');
  const insertList = () => {
    const listHTML = '<ul>\n<li>Item 1</li>\n<li>Item 2</li>\n<li>Item 3</li>\n</ul>\n';
    insertFormatting(listHTML);
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    const text = prompt('Enter link text:') || 'Click here';
    if (url) {
      insertFormatting(`<a href="${url}">`, `</a>`);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'superadmin') {
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

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
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
        <h2 className="text-xl font-bold">{t('edit')} {contentTypeNames[contentType]}</h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="btn-secondary flex items-center space-x-2 text-sm"
          >
            <FiEdit size={16} />
            <span>{t('editContent')}</span>
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
              {t('title')}
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
                {t('imageUrl')}
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
                {t('imageUrlInfo')}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              {t('contentHtmlSupported')}
            </label>
            
            {/* Rich Text Toolbar */}
            <div className="mb-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={insertBold}
                  className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                  title="Bold"
                >
                  <FiBold size={16} />
                </button>
                <button
                  type="button"
                  onClick={insertItalic}
                  className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                  title="Italic"
                >
                  <FiItalic size={16} />
                </button>
                <button
                  type="button"
                  onClick={insertHeading}
                  className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                  title="Heading"
                >
                  <FiType size={16} />
                </button>
                <button
                  type="button"
                  onClick={insertParagraph}
                  className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                  title="Paragraph"
                >
                  <FiCode size={16} />
                </button>
                <button
                  type="button"
                  onClick={insertList}
                  className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                  title="List"
                >
                  <FiList size={16} />
                </button>
                <button
                  type="button"
                  onClick={insertLink}
                  className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                  title="Link"
                >
                  <FiLink size={16} />
                </button>
                <button
                  type="button"
                  onClick={insertBreak}
                  className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                  title="Line Break"
                >
                  <span className="text-xs font-mono">BR</span>
                </button>
                <div className="ml-auto">
                  <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className={`p-2 rounded transition-colors ${showPreview 
                      ? 'text-[#D91CD2] bg-[#D91CD2]/20' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                    title="Preview"
                  >
                    <FiEye size={16} />
                  </button>
                </div>
              </div>
            </div>

            {showPreview ? (
              <div className="mb-4">
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <div className="prose prose-invert max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: editedContent }} />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">Preview - switch back to edit mode to make changes</p>
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="input-primary w-full h-64 font-mono text-sm leading-relaxed"
                placeholder={t('enterContentHere')}
                style={{ lineHeight: '1.6' }}
              />
            )}
            
            <div className="mt-2 text-xs text-gray-400 space-y-1">
              <p><strong>HTML Tags:</strong> &lt;p&gt;, &lt;h3&gt;, &lt;strong&gt;, &lt;em&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;a&gt;, &lt;br&gt;</p>
              <p><strong>Links:</strong> &lt;a href="mailto:email@domain.com"&gt;Email&lt;/a&gt; or &lt;a href="https://website.com"&gt;Website&lt;/a&gt;</p>
            </div>
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
                <span>{t('saveChanges')}</span>
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
                <p className="text-sm text-gray-400 mb-1">{t('currentImage')}:</p>
                <div className="relative w-32 h-32 rounded-md overflow-hidden border border-[#D91CD2]/30">
                  <img 
                    src={content.imageUrl}
                    alt={t('preview')}
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>
            )}
            
            <div className="bg-black/30 border border-[#D91CD2]/10 rounded-md p-6 max-h-96 overflow-y-auto">
              <div className="prose prose-invert max-w-none">
                <div 
                  dangerouslySetInnerHTML={{ __html: content?.content || '' }} 
                  className="content-display"
                />
              </div>
            </div>
          </div>
          
          <div className="text-xs text-gray-400">
            {t('lastUpdated')}: {content?.lastUpdated instanceof Date 
              ? content.lastUpdated.toLocaleDateString() 
              : new Date(content?.lastUpdated?.toDate?.() || new Date()).toLocaleDateString()}
          </div>
        </div>
      )}
    </Card>
  );
}