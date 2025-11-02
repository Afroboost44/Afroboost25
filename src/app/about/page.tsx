'use client';

import { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { contentService } from '@/lib/database';
import { EditableContent } from '@/types';

export default function AboutPage() {
  
  const [content, setContent] = useState<EditableContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setIsLoading(true);
        const aboutContent = await contentService.getByType('about');
        
        // If no content exists yet, use default content
        if (!aboutContent) {
          setContent({
            id: '',
            type: 'about',
            title: 'About Afroboosteur',
            content: 'Welcome to Afroboosteur, your premier destination for Afrobeat dance classes. Our mission is to share the joy and energy of African dance with everyone, regardless of experience level.',
            imageUrl: '/globe.svg',
            lastUpdated: new Date(),
            lastUpdatedBy: 'system'
          });
        } else {
          setContent(aboutContent);
        }
      } catch (error) {
        console.error('Error fetching about content:', error);
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
    <div className="content-spacing py-10 mt-28">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        <h1 className="text-3xl md:text-4xl font-bold mb-8 gradient-text text-center">
          {content?.title || 'About Us'}
        </h1>

        <div className="bg-black/50 border border-[#D91CD2]/20 rounded-xl p-6 md:p-8 shadow-lg">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-full md:w-1/3 flex justify-center">
              {content?.imageUrl && (
                <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-[#D91CD2]/30 bg-black">
                  <Image
                    src={content.imageUrl}
                    alt="About Afroboosteur"
                    fill
                    className="object-cover"
                    sizes="256px"
                  />
                </div>
              )}
            </div>

            <div className="w-full md:w-2/3">
              <div className="prose prose-invert prose-lg max-w-none">
                <div 
                  className="text-white content-display"
                  dangerouslySetInnerHTML={{ 
                    __html: content?.content || '' 
                  }} 
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}