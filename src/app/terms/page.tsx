'use client';

import { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';

import { contentService } from '@/lib/database';
import { EditableContent } from '@/types';

export default function TermsPage() {
  
  const [content, setContent] = useState<EditableContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setIsLoading(true);
        const termsContent = await contentService.getByType('terms');
        
        // If no content exists yet, use default content
        if (!termsContent) {
          setContent({
            id: '',
            type: 'terms',
            title: 'Terms & Conditions',
            content: '<h2>Terms and Conditions</h2><p>This is the default terms and conditions for Afroboosteur. The administrator can edit this content from the admin dashboard.</p>',
            lastUpdated: new Date(),
            lastUpdatedBy: 'system'
          });
        } else {
          setContent(termsContent);
        }
      } catch (error) {
        console.error('Error fetching terms content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D91CD2]"></div>
      </div>
    );
  }

  return (
    <div className="content-spacing py-10 mt-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        <h1 className="text-3xl md:text-4xl font-bold mb-8 gradient-text text-center">
          {content?.title || 'Terms & Conditions'}
        </h1>

        <div className="bg-black/50 border border-[#D91CD2]/20 rounded-xl p-6 md:p-8 shadow-lg">
          <div className="prose prose-invert prose-lg max-w-none">
            <div className="text-white content-display">
              <div dangerouslySetInnerHTML={{ 
                __html: content?.content || '' 
              }} />
            </div>
          </div>
          
          <div className="text-sm text-gray-400 mt-8 pt-4 border-t border-[#D91CD2]/10">
            Last updated: {content?.lastUpdated instanceof Date 
              ? content.lastUpdated.toLocaleDateString() 
              : new Date(content?.lastUpdated?.toDate?.() || new Date()).toLocaleDateString()}
          </div>
        </div>
      </motion.div>
    </div>
  );
} 