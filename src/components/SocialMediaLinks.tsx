'use client';

import { useState, useEffect } from 'react';
import { FaFacebook, FaInstagram, FaTiktok, FaYoutube } from 'react-icons/fa';
import { socialMediaService } from '@/lib/database';
import { SocialMediaLinks as SocialMediaLinksType } from '@/types';
import { useTranslation } from 'react-i18next'; // Import useTranslation

interface SocialMediaLinksProps {
  className?: string;
  iconSize?: number;
  showLabels?: boolean;
}

export default function SocialMediaLinks({ 
  className = '', 
  iconSize = 24, 
  showLabels = false 
}: SocialMediaLinksProps) {
  const { t } = useTranslation(); // Initialize useTranslation
  const [socialLinks, setSocialLinks] = useState<SocialMediaLinksType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSocialLinks();
  }, []);

  const loadSocialLinks = async () => {
    try {
      const links = await socialMediaService.get();
      setSocialLinks(links);
    } catch (error) {
      console.error('Error loading social media links:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !socialLinks) {
    return null;
  }

  const links = [
    {
      name: t('facebook'),
      url: socialLinks.facebook,
      icon: FaFacebook,
      color: 'text-blue-600 hover:text-blue-500'
    },
    {
      name: t('instagram'),
      url: socialLinks.instagram,
      icon: FaInstagram,
      color: 'text-pink-600 hover:text-pink-500'
    },
    {
      name: t('tiktok'),
      url: socialLinks.tiktok,
      icon: FaTiktok,
      color: 'text-gray-900 hover:text-gray-700'
    },
    {
      name: t('youtube'),
      url: socialLinks.youtube,
      icon: FaYoutube,
      color: 'text-red-600 hover:text-red-500'
    }
  ];

  const validLinks = links.filter(link => link.url && link.url.trim() !== '');

  if (validLinks.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      {validLinks.map(({ name, url, icon: Icon, color }) => (
        <a
          key={name}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`transition-colors duration-200 ${color} ${showLabels ? 'flex items-center space-x-2' : ''} flex-shrink-0`}
          title={t('followUsOn', { platform: name })}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            minWidth: `${iconSize}px`, 
            minHeight: `${iconSize}px`,
            width: `${iconSize}px`,
            height: `${iconSize}px`,
            position: 'relative'
          }}
        >
          <Icon 
            size={iconSize} 
            style={{ 
              flexShrink: 0,
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }} 
          />
          {showLabels && <span className="text-sm whitespace-nowrap ml-2">{name}</span>}
        </a>
      ))}
    </div>
  );
}
