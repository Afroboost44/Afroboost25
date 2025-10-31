'use client';

import { useState } from 'react';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiPackage, FiClock, FiDollarSign, FiEdit, FiSave, FiX } from 'react-icons/fi';
import { tokenPackageService } from '@/lib/database';
import { TokenPackage } from '@/types';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';
import { Timestamp } from 'firebase/firestore';

interface CreateTokenPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingPackage?: TokenPackage;
}

export default function CreateTokenPackageModal({
  isOpen,
  onClose,
  onSuccess,
  existingPackage
}: CreateTokenPackageModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    packageName: existingPackage?.packageName || '',
    description: existingPackage?.description || '',
    totalTokens: existingPackage?.totalTokens || 10,
    price: existingPackage?.price || 100,
    expiryDate: existingPackage ?
      new Date(existingPackage.expiryDate instanceof Timestamp ?
        existingPackage.expiryDate.toDate() :
        existingPackage.expiryDate
      ).toISOString().slice(0, 16) : '',
    isActive: existingPackage?.isActive ?? true
  });

  // Reset formData when editing a different package or opening modal
  useEffect(() => {
    if (isOpen && existingPackage) {
      setFormData({
        packageName: existingPackage.packageName || '',
        description: existingPackage.description || '',
        totalTokens: existingPackage.totalTokens || 10,
        price: existingPackage.price || 100,
        expiryDate: existingPackage.expiryDate
          ? new Date(existingPackage.expiryDate instanceof Timestamp
              ? existingPackage.expiryDate.toDate()
              : existingPackage.expiryDate
            ).toISOString().slice(0, 16)
          : '',
        isActive: existingPackage.isActive ?? true
      });
    }
    if (isOpen && !existingPackage) {
      setFormData({
        packageName: '',
        description: '',
        totalTokens: 10,
        price: 100,
        expiryDate: '',
        isActive: true
      });
    }
  }, [existingPackage, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : 
               type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
               value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Validation
      if (!formData.packageName.trim()) {
        setError(t('packageNameRequired'));
        return;
      }

      if (formData.totalTokens < 1) {
        setError(t('tokensMinimumOne'));
        return;
      }

      if (formData.price < 0.01) {
        setError(t('priceMinimumRequired'));
        return;
      }

      if (!formData.expiryDate) {
        setError(t('expiryDateRequired'));
        return;
      }

      const expiryDateTime = new Date(formData.expiryDate);
      if (expiryDateTime <= new Date()) {
        setError(t('expiryDateMustBeFuture'));
        return;
      }

      const packageData = {
        coachId: user.id,
        coachName: `${user.firstName} ${user.lastName}`,
        packageName: formData.packageName.trim(),
        description: formData.description.trim(),
        totalTokens: formData.totalTokens,
        price: formData.price,
        expiryDate: Timestamp.fromDate(expiryDateTime),
        isActive: formData.isActive
      };

      if (existingPackage) {
        await tokenPackageService.update(existingPackage.id, packageData);
      } else {
        await tokenPackageService.create(packageData);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving token package:', error);
      setError(t('failedToSaveTokenPackage'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gray-900 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold flex items-center">
            <FiPackage className="mr-2 text-[#D91CD2]" />
            {existingPackage ? t('editTokenPackage') : t('createTokenPackage')}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <FiX size={24} />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/20 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Package Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('packageName')} *
            </label>
            <input
              type="text"
              name="packageName"
              value={formData.packageName}
              onChange={handleInputChange}
              placeholder={t('enterPackageName')}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-[#D91CD2] text-white"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('description')}
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder={t('enterPackageDescription')}
              rows={4}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-[#D91CD2] text-white resize-vertical"
              style={{ lineHeight: '1.6' }}
            />
            <div className="mt-2 text-xs text-gray-400">
              <p><strong>Conseils de formatage:</strong></p>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li>Utilisez des tirets (-) pour les listes</li>
                <li>Séparez les paragraphes par des lignes vides</li>
                <li>Utilisez MAJUSCULES pour l'emphase</li>
                <li>Exemple: "- 50% de remise sur tous nos cours à la carte"</li>
              </ul>
            </div>
          </div>

          {/* Total Tokens */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('totalTokens')} *
            </label>
            <input
              type="number"
              name="totalTokens"
              value={formData.totalTokens}
              onChange={handleInputChange}
              min="1"
              max="1000"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-[#D91CD2] text-white"
              required
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('price')} (CHF) *
            </label>
            <div className="relative">
              <FiDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                min="0.01"
                step="0.01"
                className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-[#D91CD2] text-white"
                required
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {t('pricePerToken')}: ${(formData.price / formData.totalTokens).toFixed(2)}
            </p>
          </div>

          {/* Expiry Date */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('expiryDateTime')} *
            </label>
            <div className="relative">
              <FiClock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="datetime-local"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleInputChange}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-[#D91CD2] text-white"
                required
              />
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleInputChange}
              className="w-4 h-4 text-[#D91CD2] bg-gray-800 border-gray-700 rounded focus:ring-[#D91CD2] focus:ring-2"
            />
            <label className="text-sm font-medium text-gray-300">
              {t('packageActive')}
            </label>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-[#D91CD2] text-white rounded-lg hover:bg-[#B91AD0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <FiSave className="mr-2" />
                  {existingPackage ? t('updatePackage') : t('createPackage')}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
