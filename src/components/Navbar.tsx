'use client';

import { useState, useContext } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import i18n from 'i18next';
import { FiMenu, FiX, FiGlobe, FiUser, FiLogOut } from 'react-icons/fi';
import { AppContext } from '@/app/providers';
import { useAuth } from '@/lib/auth';
import NotificationSystem from './NotificationSystem';
import SocialMediaLinks from './SocialMediaLinks';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { resetSession, validateSession } from '@/lib/navigationUtils';

const Navbar = () => {
  const { t } = useTranslation(); // Initialize useTranslation
  const [isOpen, setIsOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const { language, setLanguage } = useContext(AppContext);
  const { user, isLoading, logout } = useAuth();
  const isAuthenticated = !!user;
  const router = useRouter();
  
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const toggleProfileMenu = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  const changeLanguage = (lang: 'en' | 'fr' | 'de') => {
    i18n.changeLanguage(lang);
    setLanguage(lang);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setShowProfileMenu(false);
      
      // Clear session data
      resetSession();
      
      console.log('Logout successful, redirecting to login');
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      
      // Force session reset and redirect
      resetSession();
      window.location.href = '/login';
    }
  };

  // Handle navigation with session validation
  const handleNavigation = async (href: string) => {
    const isValidSession = await validateSession();
    
    if (!isValidSession && href !== '/login' && href !== '/signup') {
      console.log('Invalid session detected, redirecting to login');
      router.push('/login');
      return;
    }
    
    router.push(href);
  };

  return (
    <nav className="navbar py-3 px-6">
      <div className="container mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex-shrink-0 flex items-center min-w-[180px]">
          <Link href="/" className="flex items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="flex items-center"
            >
              <h1 className="text-xl font-bold gradient-text">Afroboosteur</h1>
            </motion.div>
          </Link>
        </div>

        {/* Center Navigation - Only essentials */}
        <div className="hidden md:flex flex-1 justify-center">
          <div className="flex items-center space-x-10">
            <Link href="/" className="text-white hover:text-[#D91CD2] transition-colors text-sm">
              {t('home')}
            </Link>
            <Link href="/courses" className="text-white hover:text-[#D91CD2] transition-colors text-sm">
              {t('courses')}
            </Link>
            <Link href="/shop" className="text-white hover:text-[#D91CD2] transition-colors text-sm">
              {t('shop', 'Shop')}
            </Link>
            <Link href="/become-seller" className="text-white hover:text-[#D91CD2] transition-colors text-sm">
              {t('become_seller', 'Become a Seller')}
            </Link>
            <Link href="/dashboard" className="text-white hover:text-[#D91CD2] transition-colors text-sm">
              {t('dashboard', 'Dashboard')}
            </Link>
            {/* More Dropdown for secondary links - improved UX and appearance */}
            <div className="relative">
              <button
                className="flex items-center gap-2 text-white hover:text-[#D91CD2] transition-colors text-sm px-4 py-2 rounded focus:outline-none min-w-[60px]"
                onClick={() => setShowMoreMenu((prev) => !prev)}
                aria-haspopup="true"
                aria-expanded={showMoreMenu}
                style={{ border: '1px solid #D91CD2', background: 'rgba(217,28,210,0.07)' }}
              >
                {t('More')}
                <span className="ml-1">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path stroke="#D91CD2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6"/></svg>
                </span>
              </button>
              {showMoreMenu && (
                <div
                  className="absolute left-0 mt-2 min-w-[180px] w-[90vw] max-w-xs sm:min-w-[180px] sm:w-auto bg-black border border-[#D91CD2]/30 rounded-xl shadow-2xl py-1 z-50 flex flex-col"
                  tabIndex={-1}
                  style={{ boxShadow: '0 8px 32px rgba(217,28,210,0.15)' }}
                >
                  {isAuthenticated && (
                    <Link href="/orders" className="block w-full text-left px-6 py-3 hover:bg-[#D91CD2]/10 transition-colors text-base text-white border-b border-[#D91CD2]/10">{t('orders', 'My Orders')}</Link>
                  )}
                  {isAuthenticated && (
                    <Link href="/saved" className="block w-full text-left px-6 py-3 hover:bg-[#D91CD2]/10 transition-colors text-base text-white border-b border-[#D91CD2]/10">{t('saved', 'Saved')}</Link>
                  )}
                  <Link href="/tokens" className="block w-full text-left px-6 py-3 hover:bg-[#D91CD2]/10 transition-colors text-base text-white border-b border-[#D91CD2]/10">{t('Token Packages')}</Link>
                  <Link href="/publications" className="block w-full text-left px-6 py-3 hover:bg-[#D91CD2]/10 transition-colors text-base text-white border-b border-[#D91CD2]/10">{t('publications', 'Publications')}</Link>
                  {isAuthenticated && (
                    <Link href="/seller-dashboard" className="block w-full text-left px-6 py-3 hover:bg-[#D91CD2]/10 transition-colors text-base text-white border-b border-[#D91CD2]/10">{t('Seller Dashboard', 'Seller Dashboard')}</Link>
                  )}
                  {isAuthenticated && (
                    <Link href="/chat" className="block w-full text-left px-6 py-3 hover:bg-[#D91CD2]/10 transition-colors text-base text-white">{t('chat')}</Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Auth/Profile */}
        <div className="hidden md:flex items-center space-x-6 min-w-[220px] justify-end">
          {!isAuthenticated ? (
            <div className="flex items-center space-x-4">
              <Link href="/login" className="btn-secondary text-xs">
                {t('login')}
              </Link>
              <Link href="/signup" className="btn-primary text-xs">
                {t('signup')}
              </Link>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <NotificationSystem />
              <div className="relative">
                <button 
                  onClick={toggleProfileMenu}
                  className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-[#D91CD2]/20 border border-[#D91CD2]/30">
                    {user.profileImage ? (
                      <Image 
                        src={user.profileImage} 
                        alt={t('profile')} 
                        width={32}
                        height={32}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FiUser size={16} className="text-[#D91CD2]" />
                      </div>
                    )}
                  </div>
                </button>

                {/* Profile Dropdown - Grouped user links and language selector */}
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-56 bg-black border border-[#D91CD2]/30 rounded-lg shadow-lg py-2 z-50"
                  >
                    <div className="px-4 py-2 border-b border-[#D91CD2]/30 min-w-[176px] max-w-xs break-all flex">
                      <div className="flex-1">
                        <p className="text-xs font-medium">{user?.firstName} {user?.lastName}</p>
                        <p className="text-xs text-gray-400">{user?.email}</p>
                      </div>
                    </div>
                    <Link href="/profile" className="block px-4 py-2 hover:bg-[#D91CD2]/10 transition-colors text-xs">{t('profile')}</Link>
                    <Link href="/profile_analytics" className="block px-4 py-2 hover:bg-[#D91CD2]/10 transition-colors text-xs">{t('profileAnalytics')}</Link>
                    <Link href="/orders" className="block px-4 py-2 hover:bg-[#D91CD2]/10 transition-colors text-xs">{t('orders', 'My Orders')}</Link>
                    <Link href="/dashboard" className="block px-4 py-2 hover:bg-[#D91CD2]/10 transition-colors text-xs">{t('dashboard')}</Link>
                    <Link href="/saved" className="block px-4 py-2 hover:bg-[#D91CD2]/10 transition-colors text-xs">{t('saved', 'Saved')}</Link>
                    <Link href="/chat" className="block px-4 py-2 hover:bg-[#D91CD2]/10 transition-colors text-xs">{t('chat')}</Link>
                    {/* Language Selector in profile dropdown */}
                    <div className="flex items-center space-x-2 px-4 py-2 border-t border-[#D91CD2]/30 mt-2">
                      <span className="text-xs text-gray-400">{t('Language')}:</span>
                      <button onClick={() => changeLanguage('en')} className={`lang-selector w-7 h-7 rounded-full flex items-center justify-center text-xs ${language === 'en' ? 'lang-active' : ''}`}>EN</button>
                      <button onClick={() => changeLanguage('fr')} className={`lang-selector w-7 h-7 rounded-full flex items-center justify-center text-xs ${language === 'fr' ? 'lang-active' : ''}`}>FR</button>
                      <button onClick={() => changeLanguage('de')} className={`lang-selector w-7 h-7 rounded-full flex items-center justify-center text-xs ${language === 'de' ? 'lang-active' : ''}`}>DE</button>
                    </div>
                    <button 
                      onClick={handleLogout} 
                      className="w-full text-left px-4 py-2 hover:bg-[#D91CD2]/10 transition-colors flex items-center text-xs"
                    >
                      <FiLogOut className="mr-2" /> {t('logout')}
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center">
          <button onClick={toggleMenu} className="text-white focus:outline-none">
            {isOpen ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu - Essentials and expandable More section */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden bg-black/95 border-t border-[#D91CD2]/20 mt-3"
        >
          <div className="container mx-auto py-3 px-6 flex flex-col space-y-3">
            {/* Essentials */}
            <Link href="/" className="block w-full text-white py-2 text-sm" onClick={toggleMenu}>{t('home')}</Link>
            <Link href="/courses" className="block w-full text-white py-2 text-sm" onClick={toggleMenu}>{t('courses')}</Link>
            <Link href="/shop" className="block w-full text-white py-2 text-sm" onClick={toggleMenu}>{t('shop', 'Shop')}</Link>
            <Link href="/dashboard" className="block w-full text-white py-2 text-sm" onClick={toggleMenu}>{t('dashboard', 'Dashboard')}</Link>
            {/* More - expandable secondary links */}
            <div className="border-t border-gray-700 pt-3 mt-3">
              <button
                className="flex items-center gap-2 text-white text-sm px-4 py-2 rounded focus:outline-none w-full justify-between"
                onClick={() => setMobileMoreOpen((prev) => !prev)}
                aria-haspopup="true"
                aria-expanded={mobileMoreOpen}
                style={{ border: '1px solid #D91CD2', background: 'rgba(217,28,210,0.07)' }}
              >
                {t('More')}
                <span className={`ml-1 transition-transform ${mobileMoreOpen ? 'rotate-180' : ''}`}> {/* Arrow Down SVG */}
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path stroke="#D91CD2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6"/></svg>
                </span>
              </button>
              {mobileMoreOpen && (
                <div className="mt-2 flex flex-col">
                  {isAuthenticated && <Link href="/orders" className="block w-full text-white py-2 text-sm border-b border-gray-700" onClick={toggleMenu}>{t('orders', 'My Orders')}</Link>}
                  {isAuthenticated && <Link href="/saved" className="block w-full text-white py-2 text-sm border-b border-gray-700" onClick={toggleMenu}>{t('saved', 'Saved')}</Link>}
                  <Link href="/tokens" className="block w-full text-white py-2 text-sm border-b border-gray-700" onClick={toggleMenu}>{t('Token Packages')}</Link>
                  <Link href="/publications" className="block w-full text-white py-2 text-sm border-b border-gray-700" onClick={toggleMenu}>{t('publications', 'Publications')}</Link>
                  {isAuthenticated && <Link href="/become-seller" className="block w-full text-white py-2 text-sm border-b border-gray-700" onClick={toggleMenu}>{t('become_seller')}</Link>}
                  {isAuthenticated && <Link href="/chat" className="block w-full text-white py-2 text-sm border-b border-gray-700" onClick={toggleMenu}>{t('chat')}</Link>}
                  {isAuthenticated && <Link href="/seller-dashboard" className="block w-full text-white py-2 text-sm border-b border-gray-700" onClick={toggleMenu}>{t('Seller Dashboard')}</Link>}

                </div>
              )}
            </div>
            {/* Language Selector Mobile */}
            <div className="flex items-center space-x-4 py-2 border-t border-gray-700 mt-3">
              <span className="text-xs text-gray-400">{t('Language')}:</span>
              <button onClick={() => { changeLanguage('en'); toggleMenu(); }} className={`lang-selector px-2 py-1 rounded text-xs ${language === 'en' ? 'lang-active' : ''}`}>EN</button>
              <button onClick={() => { changeLanguage('fr'); toggleMenu(); }} className={`lang-selector px-2 py-1 rounded text-xs ${language === 'fr' ? 'lang-active' : ''}`}>FR</button>
              <button onClick={() => { changeLanguage('de'); toggleMenu(); }} className={`lang-selector px-2 py-1 rounded text-xs ${language === 'de' ? 'lang-active' : ''}`}>DE</button>
            </div>
            {/* Auth Buttons Mobile */}
            {!isAuthenticated ? (
              <div className="flex flex-col space-y-2 pt-2">
                <Link href="/login" className="btn-secondary text-center text-xs" onClick={toggleMenu}>{t('login')}</Link>
                <Link href="/signup" className="btn-primary text-center text-xs" onClick={toggleMenu}>{t('signup')}</Link>
              </div>
            ) : (
              <div className="flex flex-col space-y-2 pt-2">
                <div className="flex items-center space-x-3 py-2">
                  {user?.profileImage ? (
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-[#D91CD2]/20 border border-[#D91CD2]/30 flex items-center justify-center">
                      <Image src={user.profileImage} alt={t('profile')} width={36} height={36} className="object-cover w-full h-full rounded-full" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[#D91CD2] flex items-center justify-center">
                      <FiUser className="text-white text-sm" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-gray-400">{user?.email}</p>
                  </div>
                </div>
                <Link href="/profile" className="text-white py-2 text-sm flex items-center" onClick={toggleMenu}>{t('profile')}</Link>
                <Link href="/profile_analytics" className="text-white py-2 text-sm flex items-center" onClick={toggleMenu}>{t('profileAnalytics')}</Link>
                <button onClick={() => { handleLogout(); toggleMenu(); }} className="text-white py-2 text-sm flex items-center"><FiLogOut className="mr-2" /> {t('logout')}</button>
                {/* Social Media Links */}
                <div className="border-t border-gray-700 pt-4 mt-4">
                  <SocialMediaLinks className="justify-center" iconSize={20} />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </nav>
  );
};

export default Navbar;