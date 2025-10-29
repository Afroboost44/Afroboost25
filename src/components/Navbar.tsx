'use client';

import { useState, useContext } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FiMenu, FiX, FiGlobe, FiUser, FiLogOut } from 'react-icons/fi';
import { AppContext, translations } from '@/app/providers';
import { useAuth } from '@/lib/auth';
import NotificationSystem from './NotificationSystem';
import { useRouter } from 'next/navigation';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { language, setLanguage } = useContext(AppContext);
  const { user, isLoading, logout } = useAuth();
  const isAuthenticated = !!user;
  const router = useRouter();
  
  const t = translations[language];

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const toggleProfileMenu = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  const changeLanguage = (lang: 'en' | 'fr' | 'de') => {
    setLanguage(lang);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setShowProfileMenu(false);
      console.log('Logout successful, refreshing window');
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
      // Refresh anyway to ensure clean state
      window.location.reload();
    }
  };

  return (
    <nav className="navbar py-3 px-6">
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo */}
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

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-10">
          <Link href="/" className="text-white hover:text-[#D91CD2] transition-colors text-sm">
            {t.home}
          </Link>
          <Link href="/courses" className="text-white hover:text-[#D91CD2] transition-colors text-sm">
            {t.courses}
          </Link>
          {isAuthenticated && (
            <>
              <Link href="/dashboard" className="text-white hover:text-[#D91CD2] transition-colors text-sm">
                {t.dashboard}
              </Link>
              <Link href="/chat" className="text-white hover:text-[#D91CD2] transition-colors text-sm">
                {t.chat}
              </Link>
            </>
          )}

          {/* Language Selector */}
          <div className="relative">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => changeLanguage('en')}
                className={`lang-selector w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                  language === 'en' ? 'lang-active' : ''
                }`}
              >
                EN
              </button>
              <button
                onClick={() => changeLanguage('fr')}
                className={`lang-selector w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                  language === 'fr' ? 'lang-active' : ''
                }`}
              >
                FR
              </button>
              <button
                onClick={() => changeLanguage('de')}
                className={`lang-selector w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                  language === 'de' ? 'lang-active' : ''
                }`}
              >
                DE
              </button>
            </div>
          </div>

          {/* Auth Buttons */}
          {!isAuthenticated ? (
            <div className="flex items-center space-x-4">
              <Link href="/login" className="btn-secondary text-xs">
                {t.login}
              </Link>
              <Link href="/signup" className="btn-primary text-xs">
                {t.signup}
              </Link>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              {/* Notification System */}
              <NotificationSystem />
              
              {/* Profile Menu */}
              <div className="relative">
              <button 
                onClick={toggleProfileMenu}
                className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-[#D91CD2]/20 border border-[#D91CD2]/30">
                  {user.profileImage ? (
                    <Image 
                      src={user.profileImage} 
                      alt="Profile" 
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

              {/* Profile Dropdown */}
              {showProfileMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-2 w-44 bg-black border border-[#D91CD2]/30 rounded-lg shadow-lg py-2 z-50"
                >
                    <div className="px-4 py-2 border-b border-[#D91CD2]/30 min-w-[176px] max-w-xs break-all flex">
                      <div className="flex-1">
                        <p className="text-xs font-medium">{user?.firstName} {user?.lastName}</p>
                        <p className="text-xs text-gray-400">{user?.email}</p>
                      </div>
                    </div>
                  <Link href="/profile" className="block px-4 py-2 hover:bg-[#D91CD2]/10 transition-colors text-xs">
                    {t.profile}
                  </Link>
                  <Link href="/profile_analytics" className="block px-4 py-2 hover:bg-[#D91CD2]/10 transition-colors text-xs">
                    Profile Analytics
                  </Link>
                  <button 
                    onClick={handleLogout} 
                    className="w-full text-left px-4 py-2 hover:bg-[#D91CD2]/10 transition-colors flex items-center text-xs"
                  >
                    <FiLogOut className="mr-2" /> {t.logout}
                  </button>
                </motion.div>
              )}
            </div>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button onClick={toggleMenu} className="text-white focus:outline-none">
            {isOpen ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden bg-black/95 border-t border-[#D91CD2]/20 mt-3"
        >
          <div className="container mx-auto py-3 px-6 flex flex-col space-y-3">
            <Link href="/" className="text-white py-2 text-sm" onClick={toggleMenu}>
              {t.home}
            </Link>
            <Link href="/courses" className="text-white py-2 text-sm" onClick={toggleMenu}>
              {t.courses}
            </Link>
            {isAuthenticated && (
              <>
                <Link href="/dashboard" className="text-white py-2 text-sm" onClick={toggleMenu}>
                  {t.dashboard}
                </Link>
                <Link href="/chat" className="text-white py-2 text-sm" onClick={toggleMenu}>
                  {t.chat}
                </Link>
              </>
            )}
            
            {/* Language Selector Mobile */}
            <div className="flex items-center space-x-4 py-2">
              <FiGlobe className="text-[#D91CD2] text-sm" />
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    changeLanguage('en');
                    toggleMenu();
                  }}
                  className={`lang-selector px-2 py-1 rounded text-xs ${
                    language === 'en' ? 'lang-active' : ''
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => {
                    changeLanguage('fr');
                    toggleMenu();
                  }}
                  className={`lang-selector px-2 py-1 rounded text-xs ${
                    language === 'fr' ? 'lang-active' : ''
                  }`}
                >
                  FR
                </button>
                <button
                  onClick={() => {
                    changeLanguage('de');
                    toggleMenu();
                  }}
                  className={`lang-selector px-2 py-1 rounded text-xs ${
                    language === 'de' ? 'lang-active' : ''
                  }`}
                >
                  DE
                </button>
              </div>
            </div>
            
            {/* Auth Buttons Mobile */}
            {!isAuthenticated ? (
              <div className="flex flex-col space-y-2 pt-2">
                <Link href="/login" className="btn-secondary text-center text-xs" onClick={toggleMenu}>
                  {t.login}
                </Link>
                <Link href="/signup" className="btn-primary text-center text-xs" onClick={toggleMenu}>
                  {t.signup}
                </Link>
              </div>
            ) : (
              <div className="flex flex-col space-y-2 pt-2">
                <div className="flex items-center space-x-3 py-2">
                  {user?.profileImage ? (
                    <Image 
                      src={user.profileImage} 
                      alt="Profile" 
                      width={36} 
                      height={36} 
                      className="rounded-full border-2 border-[#D91CD2]"
                    />
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
                <Link href="/profile" className="text-white py-2 text-sm flex items-center" onClick={toggleMenu}>
                  {t.profile}
                </Link>
                <button 
                  onClick={() => {
                    handleLogout();
                    toggleMenu();
                  }}
                  className="text-white py-2 text-sm flex items-center"
                >
                  <FiLogOut className="mr-2" /> {t.logout}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </nav>
  );
};

export default Navbar;