'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  FiUpload, 
  FiX, 
  FiCheck, 
  FiArrowRight,
  FiShoppingBag,
  FiUsers,
  FiDollarSign,
  FiFileText,
  FiImage,
  FiLink,
  FiMapPin
} from 'react-icons/fi';
import { useAuth } from '@/lib/auth';
import Card from '@/components/Card';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';

interface BecomeSellerProps {
  className?: string;
}

export default function BecomeSeller({ className = '' }: BecomeSellerProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const diplomaInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    fullName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : '',
    address: '',
    phone: user?.phone || '',
    email: user?.email || '',
    idDocumentUrl: '',
    diplomaCertificateUrl: '',
    socialMediaLinks: {
      instagram: '',
      facebook: '',
      tiktok: '',
      youtube: '',
      website: ''
    },
    activityType: '' as 'products' | 'food' | 'services' | '',
    businessName: '',
    businessDescription: '',
    businessCategory: '',
    vatNumber: '',
    bankDetails: {
      accountName: '',
      accountNumber: '',
      bankName: '',
      iban: '',
      swiftCode: ''
    },
    subscriptionModel: '' as 'monthly' | 'commission' | ''
  });

  const activityTypes = [
    {
      value: 'products',
      title: t('Sports & Dance Products'),
      description: t('Sell sports equipment, dancewear, accessories, and related products'),
      icon: FiShoppingBag,
      color: 'blue'
    },
    {
      value: 'food',
      title: t('Nutrition & Food'),
      description: t('Offer sports nutrition, healthy meals, supplements, and food products'),
      icon: FiUsers,
      color: 'green'
    },
    {
      value: 'services',
      title: t('Services'),
      description: t('Provide coaching services, consultations, or other professional services'),
      icon: FiDollarSign,
      color: 'purple'
    }
  ];

  const subscriptionModels = [
    {
      value: 'monthly',
      title: t('Monthly Subscription'),
      description: t('Pay a fixed monthly fee and keep 100% of your sales'),
      price: '29.99 CHF/month',
      features: [
        t('100% of sales revenue'),
        t('No commission fees'),
        t('Priority support'),
        t('Advanced analytics')
      ],
      color: 'blue'
    },
    {
      value: 'commission',
      title: t('Commission Based'),
      description: t('Pay a percentage of each sale, no monthly fee'),
      price: '10% per sale',
      features: [
        t('No monthly fees'),
        t('Pay only when you sell'),
        t('Perfect for beginners'),
        t('Standard support')
      ],
      color: 'green'
    }
  ];

  const businessCategories = [
    'Sports Equipment',
    'Dancewear & Accessories',
    'Fitness Nutrition',
    'Health Supplements',
    'Coaching Services',
    'Event Services',
    'Educational Content',
    'Custom Products',
    'Other'
  ];

  const steps = [
    { id: 1, title: t('Personal Information'), icon: FiUsers },
    { id: 2, title: t('Business Details'), icon: FiShoppingBag },
    { id: 3, title: t('Subscription Model'), icon: FiDollarSign },
    { id: 4, title: t('Documents & Verification'), icon: FiFileText }
  ];

  const handleFileUpload = async (file: File, type: 'id' | 'diploma') => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'document');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        if (type === 'id') {
          setFormData(prev => ({ ...prev, idDocumentUrl: data.url }));
        } else {
          setFormData(prev => ({ ...prev, diplomaCertificateUrl: data.url }));
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const applicationData = {
        ...formData,
        userId: user.id,
        status: 'pending'
      };

      const response = await fetch('/api/marketplace/seller-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(applicationData)
      });

      if (response.ok) {
        setShowSuccess(true);
      }
    } catch (error) {
      console.error('Error submitting application:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.fullName && formData.address && formData.phone && formData.email;
      case 2:
        return formData.activityType && formData.businessDescription && formData.businessCategory;
      case 3:
        return formData.subscriptionModel;
      case 4:
        return formData.idDocumentUrl;
      default:
        return false;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">{t('Access Denied')}</h2>
          <p className="text-gray-400">{t('Please log in to apply as a seller.')}</p>
        </div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <Card>
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiCheck className="text-green-400 text-2xl" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">{t('Application Submitted!')}</h2>
            <p className="text-gray-400 mb-6">
              {t('Thank you for your interest in becoming a seller. Your application has been submitted and is now under review. We\'ll notify you via email once it\'s processed.')}
            </p>
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                {t('What happens next?')}
              </p>
              <ul className="text-sm text-gray-400 space-y-2 text-left">
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>{t('Our team will review your application within 2-3 business days')}</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>{t('You\'ll receive an email notification with the decision')}</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>{t('If approved, you can immediately start adding products')}</span>
                </li>
              </ul>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-900 mt-16 py-8 px-4 ${className}`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">{t('Become a Seller')}</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            {t('Join our marketplace and start selling your products or services to thousands of customers. Complete the application process to get started.')}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            {steps.map((step) => (
              <div key={step.id} className="flex flex-col items-center mb-6 md:mb-0 flex-1">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
            currentStep >= step.id
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
              : 'bg-gray-700 text-gray-400'
          }`}>
            <step.icon />
          </div>
          <p className={`text-sm text-center ${
            currentStep >= step.id ? 'text-white' : 'text-gray-400'
          }`}>
            {step.title}
          </p>
              </div>
            ))}
          </div>
        </div>

        {/* Form Steps */}
        <Card>
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">{t('Personal Information')}</h3>
                <p className="text-gray-400 mb-6">
                  {t('Please provide your personal details for verification purposes.')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {t('Full Name')} *
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder={t('Enter your full name')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {t('Email Address')} *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder={t('Enter your email address')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {t('Phone Number')} *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder={t('Enter your phone number')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {t('VAT Number')} ({t('Optional')})
                  </label>
                  <input
                    type="text"
                    value={formData.vatNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, vatNumber: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder={t('Enter VAT number if applicable')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  {t('Address')} *
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder={t('Enter your complete address')}
                />
              </div>

              <div>
                <h4 className="text-lg font-medium text-white mb-4">{t('Social Media Links')} ({t('Optional')})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Instagram</label>
                    <input
                      type="url"
                      value={formData.socialMediaLinks.instagram}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        socialMediaLinks: { ...prev.socialMediaLinks, instagram: e.target.value }
                      }))}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="https://instagram.com/yourprofile"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Facebook</label>
                    <input
                      type="url"
                      value={formData.socialMediaLinks.facebook}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        socialMediaLinks: { ...prev.socialMediaLinks, facebook: e.target.value }
                      }))}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="https://facebook.com/yourpage"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">TikTok</label>
                    <input
                      type="url"
                      value={formData.socialMediaLinks.tiktok}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        socialMediaLinks: { ...prev.socialMediaLinks, tiktok: e.target.value }
                      }))}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="https://tiktok.com/@yourprofile"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">{t('Website')}</label>
                    <input
                      type="url"
                      value={formData.socialMediaLinks.website}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        socialMediaLinks: { ...prev.socialMediaLinks, website: e.target.value }
                      }))}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Business Details */}
          {currentStep === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">{t('Business Details')}</h3>
                <p className="text-gray-400 mb-6">
                  {t('Tell us about your business and what you plan to sell.')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-4">
                  {t('Activity Type')} *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {activityTypes.map((type) => (
                    <div
                      key={type.value}
                      onClick={() => setFormData(prev => ({ ...prev, activityType: type.value as any }))}
                      className={`p-6 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                        formData.activityType === type.value
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                        type.color === 'blue' ? 'bg-blue-500/20 text-blue-400' :
                        type.color === 'green' ? 'bg-green-500/20 text-green-400' :
                        'bg-purple-500/20 text-purple-400'
                      }`}>
                        <type.icon className="text-xl" />
                      </div>
                      <h4 className="font-semibold text-white mb-2">{type.title}</h4>
                      <p className="text-sm text-gray-400">{type.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {t('Business Name')} ({t('Optional')})
                  </label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder={t('Enter your business name')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {t('Business Category')} *
                  </label>
                  <select
                    value={formData.businessCategory}
                    onChange={(e) => setFormData(prev => ({ ...prev, businessCategory: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">{t('Select a category')}</option>
                    {businessCategories.map((category) => (
                      <option key={category} value={category}>
                        {t(category)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  {t('Business Description')} *
                </label>
                <textarea
                  value={formData.businessDescription}
                  onChange={(e) => setFormData(prev => ({ ...prev, businessDescription: e.target.value }))}
                  rows={5}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder={t('Describe your business, what you sell, your experience, and what makes you unique...')}
                />
              </div>
            </motion.div>
          )}

          {/* Step 3: Subscription Model */}
          {currentStep === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">{t('Choose Your Subscription Model')}</h3>
                <p className="text-gray-400 mb-6">
                  {t('Select the pricing model that works best for your business.')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {subscriptionModels.map((model) => (
                  <div
                    key={model.value}
                    onClick={() => setFormData(prev => ({ ...prev, subscriptionModel: model.value as any }))}
                    className={`p-6 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                      formData.subscriptionModel === model.value
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-white">{model.title}</h4>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        formData.subscriptionModel === model.value
                          ? 'border-purple-500 bg-purple-500'
                          : 'border-gray-600'
                      }`}>
                        {formData.subscriptionModel === model.value && (
                          <FiCheck className="text-white text-sm" />
                        )}
                      </div>
                    </div>
                    <p className="text-gray-400 mb-4">{model.description}</p>
                    <div className={`text-xl font-bold mb-4 ${
                      model.color === 'blue' ? 'text-blue-400' : 'text-green-400'
                    }`}>
                      {model.price}
                    </div>
                    <ul className="space-y-2">
                      {model.features.map((feature, index) => (
                        <li key={index} className="flex items-center space-x-2 text-sm text-gray-400">
                          <FiCheck className="text-green-400 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Bank Details */}
              <div className="mt-8">
                <h4 className="text-lg font-medium text-white mb-4">{t('Bank Details')} ({t('Optional')})</h4>
                <p className="text-gray-400 mb-4">
                  {t('Add your bank details to receive payments. You can also add this later.')}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      {t('Account Name')}
                    </label>
                    <input
                      type="text"
                      value={formData.bankDetails.accountName}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        bankDetails: { ...prev.bankDetails, accountName: e.target.value }
                      }))}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder={t('Enter account holder name')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      {t('Bank Name')}
                    </label>
                    <input
                      type="text"
                      value={formData.bankDetails.bankName}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        bankDetails: { ...prev.bankDetails, bankName: e.target.value }
                      }))}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder={t('Enter bank name')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">IBAN</label>
                    <input
                      type="text"
                      value={formData.bankDetails.iban}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        bankDetails: { ...prev.bankDetails, iban: e.target.value }
                      }))}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="CH93 0076 2011 6238 5295 7"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      {t('SWIFT Code')}
                    </label>
                    <input
                      type="text"
                      value={formData.bankDetails.swiftCode}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        bankDetails: { ...prev.bankDetails, swiftCode: e.target.value }
                      }))}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="UBSWCHZH80A"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 4: Documents */}
          {currentStep === 4 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">{t('Documents & Verification')}</h3>
                <p className="text-gray-400 mb-6">
                  {t('Please upload the required documents for verification.')}
                </p>
              </div>

              <div className="space-y-6">
                {/* ID Document */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-4">
                    {t('ID Document')} * ({t('Passport, Driver\'s License, or National ID')})
                  </label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:border-gray-600 transition-colors"
                  >
                    {formData.idDocumentUrl ? (
                      <div className="space-y-4">
                        <FiCheck className="text-green-400 text-3xl mx-auto" />
                        <p className="text-green-400">{t('ID document uploaded successfully')}</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <FiUpload className="text-gray-400 text-3xl mx-auto" />
                        <div>
                          <p className="text-white font-medium">{t('Click to upload ID document')}</p>
                          <p className="text-gray-400 text-sm">{t('JPG, PNG or PDF up to 5MB')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'id');
                    }}
                    className="hidden"
                  />
                </div>

                {/* Diploma/Certificate */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-4">
                    {t('Professional Certificate/Diploma')} ({t('Optional but recommended')})
                  </label>
                  <div 
                    onClick={() => diplomaInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:border-gray-600 transition-colors"
                  >
                    {formData.diplomaCertificateUrl ? (
                      <div className="space-y-4">
                        <FiCheck className="text-green-400 text-3xl mx-auto" />
                        <p className="text-green-400">{t('Certificate uploaded successfully')}</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <FiUpload className="text-gray-400 text-3xl mx-auto" />
                        <div>
                          <p className="text-white font-medium">{t('Click to upload certificate')}</p>
                          <p className="text-gray-400 text-sm">{t('JPG, PNG or PDF up to 5MB')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    ref={diplomaInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'diploma');
                    }}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h4 className="text-blue-400 font-medium mb-2">{t('Review Process')}</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• {t('Applications are typically reviewed within 2-3 business days')}</li>
                  <li>• {t('You\'ll receive an email notification with the decision')}</li>
                  <li>• {t('If approved, you can immediately access your seller dashboard')}</li>
                  <li>• {t('All uploaded documents are securely stored and encrypted')}</li>
                </ul>
              </div>
            </motion.div>
          )}

          {/* Navigation Buttons */}
            <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-gray-700 space-y-4 md:space-y-0">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="flex items-center space-x-2 px-6 py-3 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span>{t('Previous')}</span>
            </button>

            <div className="flex items-center space-x-2">
              {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                index + 1 <= currentStep ? 'bg-purple-500' : 'bg-gray-700'
                }`}
              />
              ))}
            </div>

            {currentStep < steps.length ? (
              <button
              onClick={nextStep}
              disabled={!isStepValid()}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
              <span>{t('Next')}</span>
              <FiArrowRight />
              </button>
            ) : (
              <button
              onClick={handleSubmit}
              disabled={!isStepValid() || isSubmitting}
              className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg hover:from-green-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
              {isSubmitting ? (
                <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{t('Submitting...')}</span>
                </>
              ) : (
                <>
                <FiCheck />
                <span>{t('Submit Application')}</span>
                </>
              )}
              </button>
            )}
            </div>
        </Card>
      </div>
    </div>
  );
}
