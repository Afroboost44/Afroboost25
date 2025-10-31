'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useTranslation } from 'react-i18next';
import { FiDownload, FiX } from 'react-icons/fi';

export default function PWAPrompt() {
    const { t } = useTranslation();
    const { canInstall, isInstalled, installPWA } = usePWAInstall();
    const [showPrompt, setShowPrompt] = useState(true);

    const handleInstall = async () => {
        await installPWA();
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
    };

    if (!showPrompt || !canInstall || isInstalled) {
        return null;
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50"
            >
                <div className="bg-black border border-gray-800 rounded-lg p-4 shadow-lg">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-r from-[#7000FF] to-[#D91CD2] rounded-lg flex items-center justify-center mr-3">
                                <FiDownload size={20} className="text-white" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-white text-sm">
                                    {t('installApp', 'Install Afroboosteur')}
                                </h4>
                                <p className="text-gray-400 text-xs">
                                    {t('installPromptDesc', 'Get the app for faster access')}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleDismiss}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <FiX size={18} />
                        </button>
                    </div>
                    
                    <div className="flex space-x-2">
                        <button
                            onClick={handleInstall}
                            className="flex-1 bg-gradient-to-r from-[#7000FF] to-[#D91CD2] text-white py-2 px-3 rounded text-sm font-semibold hover:opacity-90 transition-opacity"
                        >
                            {t('install', 'Install')}
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="px-3 py-2 text-gray-400 hover:text-white transition-colors text-sm"
                        >
                            {t('notNow', 'Not now')}
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
