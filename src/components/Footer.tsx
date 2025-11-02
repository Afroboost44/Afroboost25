'use client';

import { useContext } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiInstagram, FiFacebook, FiYoutube } from 'react-icons/fi';
import { SiTiktok } from 'react-icons/si';
import { socialMediaService } from '@/lib/database';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import { useHideFooter } from '@/hooks/useHideFooter';

const Footer = () => {
  const { t } = useTranslation(); // Initialize useTranslation
  const [backgroundSettings, setBackgroundSettings] = useState<any>(null);
  const shouldHideFooter = useHideFooter();

  useEffect(() => {
    socialMediaService.get().then(setBackgroundSettings);
  }, []);

  // Don't render footer on chat pages
  if (shouldHideFooter) {
    return null;
  }

  return (
    <footer className="bg-black border-t border-[#D91CD2]/20 py-10">
      <div className="content-spacing">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Logo and Description */}
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="flex items-center">
              <h2 className="text-xl font-bold gradient-text">Afroboosteur</h2>
            </Link>
            <p className="mt-3 text-gray-400 text-xs">
              {t('footerDescription')}
            </p>
            <div className="flex mt-5 space-x-3">
              <motion.a 
                href={backgroundSettings?.instagram ?? '#'}
                target="_blank" 
                rel="noopener noreferrer"
                whileHover={{ scale: 1.02 }}
                className="w-8 h-8 rounded-full bg-[#D91CD2]/10 flex items-center justify-center hover:bg-[#D91CD2] transition-colors"
              >
                <FiInstagram className="text-white text-sm" />
              </motion.a>
              <motion.a 
                href={backgroundSettings?.tiktok ?? '#'}
                target="_blank" 
                rel="noopener noreferrer"
                whileHover={{ scale: 1.02 }}
                className="w-8 h-8 rounded-full bg-[#D91CD2]/10 flex items-center justify-center hover:bg-[#D91CD2] transition-colors"
              >
                <SiTiktok className="text-white text-sm" />
              </motion.a>
              <motion.a 
                href={backgroundSettings?.facebook ?? '#'}
                target="_blank" 
                rel="noopener noreferrer"
                whileHover={{ scale: 1.02 }}
                className="w-8 h-8 rounded-full bg-[#D91CD2]/10 flex items-center justify-center hover:bg-[#D91CD2] transition-colors"
              >
                <FiFacebook className="text-white text-sm" />
              </motion.a>
              <motion.a 
                href={backgroundSettings?.youtube ?? '#'}
                target="_blank" 
                rel="noopener noreferrer"
                whileHover={{ scale: 1.02 }}
                className="w-8 h-8 rounded-full bg-[#D91CD2]/10 flex items-center justify-center hover:bg-[#D91CD2] transition-colors"
              >
                <FiYoutube className="text-white text-sm" />
              </motion.a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="col-span-1">
            <h3 className="text-base font-semibold text-white mb-3">{t('home')}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/courses" className="text-gray-400 hover:text-[#D91CD2] transition-colors text-xs">
                  {t('courses')}
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-gray-400 hover:text-[#D91CD2] transition-colors text-xs">
                  {t('dashboard')}
                </Link>
              </li>
              <li>
                <Link href="/profile" className="text-gray-400 hover:text-[#D91CD2] transition-colors text-xs">
                  {t('profile')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="col-span-1">
            <h3 className="text-base font-semibold text-white mb-3">{t('aboutUs')}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-gray-400 hover:text-[#D91CD2] transition-colors text-xs">
                  {t('aboutUs')}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-400 hover:text-[#D91CD2] transition-colors text-xs">
                  {t('contactUs')}
                </Link>
              </li>
              <li>
                <Link href="/partnership" className="text-gray-400 hover:text-[#D91CD2] transition-colors text-xs">
                  {t('becomePartner')}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-400 hover:text-[#D91CD2] transition-colors text-xs">
                  {t('termsConditions')}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-400 hover:text-[#D91CD2] transition-colors text-xs">
                  {t('privacyPolicy')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="col-span-1">
            <h3 className="text-base font-semibold text-white mb-3">{t('followUs')}</h3>
            <p className="text-gray-400 text-xs mb-3">
              {t('stayUpdatedDescription')}
            </p>
            <div className="flex">
              <input
                type="email"
                placeholder={t('email')}
                className="input-primary flex-grow text-xs"
              />
              <button className="btn-primary ml-2">
                →
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-[#D91CD2]/10 mt-8 pt-5 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-xs">
            © {new Date().getFullYear()} Afroboosteur. {t('allRightsReserved')}.
          </p>
          <div className="flex space-x-4 mt-3 md:mt-0">
            <Link href="/terms" className="text-gray-500 text-xs hover:text-[#D91CD2] transition-colors">
              {t('termsConditions')}
            </Link>
            <Link href="/privacy" className="text-gray-500 text-xs hover:text-[#D91CD2] transition-colors">
              {t('privacyPolicy')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;