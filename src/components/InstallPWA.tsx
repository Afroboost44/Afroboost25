'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useTranslation } from 'react-i18next';
import { FiDownload, FiX, FiSmartphone, FiMonitor, FiShare } from 'react-icons/fi';

interface InstallPWAProps {
  onClose: () => void;
}

export default function InstallPWA({ onClose }: InstallPWAProps) {
  const { t } = useTranslation();
  const { installPWA, isIOS } = usePWAInstall();
  const [isInstalling, setIsInstalling] = useState(false);

  const handleInstall = async () => {
    if (isIOS) {
      // For iOS, we can't programmatically install, so we show instructions
      return;
    }

    setIsInstalling(true);
    try {
      await installPWA();
      onClose();
    } catch (error) {
      console.error('Installation failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-black border border-gray-800 rounded-xl p-6 max-w-md w-full mx-4"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-white">
              {t('installApp', 'Install Afroboosteur')}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <FiX size={24} />
            </button>
          </div>

          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-[#7000FF] to-[#D91CD2] rounded-2xl flex items-center justify-center">
              <FiDownload size={32} className="text-white" />
            </div>
            <p className="text-gray-300 mb-4">
              {t('installDescription', 'Install Afroboosteur on your device for the best experience. Access your dance classes faster with offline support.')}
            </p>
          </div>

          {isIOS ? (
            <div className="space-y-4">
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-3 flex items-center">
                  <FiSmartphone className="mr-2" />
                  {t('installIOS', 'Install on iOS')}
                </h4>
                <ol className="text-sm text-gray-300 space-y-2">
                  <li className="flex items-start">
                    <span className="bg-[#7000FF] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">1</span>
                    <span>{t('iosStep1', 'Tap the Share button')}</span>
                    <FiShare className="ml-2 flex-shrink-0" />
                  </li>
                  <li className="flex items-start">
                    <span className="bg-[#7000FF] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">2</span>
                    <span>{t('iosStep2', 'Scroll down and tap "Add to Home Screen"')}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-[#7000FF] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0">3</span>
                    <span>{t('iosStep3', 'Tap "Add" to install')}</span>
                  </li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-3 flex items-center">
                  <FiMonitor className="mr-2" />
                  {t('installDesktop', 'Install on Desktop/Android')}
                </h4>
                <p className="text-sm text-gray-300 mb-4">
                  {t('desktopInstallDesc', 'Click the install button below to add Afroboosteur to your device.')}
                </p>
              </div>

              <button
                onClick={handleInstall}
                disabled={isInstalling}
                className="w-full bg-gradient-to-r from-[#7000FF] to-[#D91CD2] text-white py-3 px-6 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center"
              >
                {isInstalling ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    {t('installing', 'Installing...')}
                  </>
                ) : (
                  <>
                    <FiDownload className="mr-2" />
                    {t('installNow', 'Install Now')}
                  </>
                )}
              </button>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-gray-800">
            <h5 className="font-semibold text-white mb-2">{t('benefits', 'Benefits')}</h5>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• {t('benefit1', 'Faster loading times')}</li>
              <li>• {t('benefit2', 'Offline access to content')}</li>
              <li>• {t('benefit3', 'Native app experience')}</li>
              <li>• {t('benefit4', 'Push notifications')}</li>
            </ul>
          </div>

          <button
            onClick={onClose}
            className="w-full mt-4 text-gray-400 hover:text-white transition-colors text-sm"
          >
            {t('maybeLater', 'Maybe Later')}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
