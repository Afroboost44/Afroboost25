'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiUser, 
  FiMail, 
  FiLock, 
  FiEye, 
  FiEyeOff, 
  FiUserPlus,
  FiGift,
  FiCheck,
  FiAlertCircle
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useRouter, useSearchParams } from 'next/navigation';

interface SignupWithReferralProps {
  onSubmit: (userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    referralCode?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export default function SignupWithReferral({ onSubmit, isLoading = false }: SignupWithReferralProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    referralCode: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [referralInfo, setReferralInfo] = useState<{
    valid: boolean;
    sponsorName?: string;
    rewardAmount?: number;
    error?: string;
  } | null>(null);
  const [isValidatingReferral, setIsValidatingReferral] = useState(false);

  // Check for referral code in URL parameters
  useEffect(() => {
    const referralCodeFromUrl = searchParams?.get('ref');
    if (referralCodeFromUrl) {
      setFormData(prev => ({ ...prev, referralCode: referralCodeFromUrl }));
      validateReferralCode(referralCodeFromUrl);
    }
  }, [searchParams]);

  const validateReferralCode = async (code: string) => {
    if (!code.trim()) {
      setReferralInfo(null);
      return;
    }

    setIsValidatingReferral(true);
    try {
      const response = await fetch('/api/referrals/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ referralCode: code }),
      });

      const result = await response.json();
      
      if (response.ok && result.valid) {
        setReferralInfo({
          valid: true,
          sponsorName: result.sponsorName,
          rewardAmount: result.rewardAmount,
        });
        setErrors(prev => ({ ...prev, referralCode: '' }));
      } else {
        setReferralInfo({
          valid: false,
          error: result.error || t('Invalid referral code'),
        });
        setErrors(prev => ({ ...prev, referralCode: result.error || t('Invalid referral code') }));
      }
    } catch (error) {
      console.error('Error validating referral code:', error);
      setReferralInfo({
        valid: false,
        error: t('Error validating referral code'),
      });
      setErrors(prev => ({ ...prev, referralCode: t('Error validating referral code') }));
    } finally {
      setIsValidatingReferral(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Validate referral code when it changes
    if (name === 'referralCode') {
      const trimmedValue = value.trim();
      if (trimmedValue !== formData.referralCode.trim()) {
        validateReferralCode(trimmedValue);
      }
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = t('First name is required');
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = t('Last name is required');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('Email is required');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('Please enter a valid email address');
    }

    if (!formData.password) {
      newErrors.password = t('Password is required');
    } else if (formData.password.length < 6) {
      newErrors.password = t('Password must be at least 6 characters');
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('Passwords do not match');
    }

    // Don't block signup for invalid referral code, just warn
    if (formData.referralCode && referralInfo && !referralInfo.valid) {
      // Warning only, not blocking
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        referralCode: formData.referralCode.trim() || undefined,
      });
    } catch (error) {
      console.error('Signup error:', error);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900 rounded-xl p-8 border border-gray-700"
      >
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">{t('Create Account')}</h2>
          <p className="text-gray-400">
            {t('Join AfroBoost and start your dance journey')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('First Name')}
              </label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 ${
                    errors.firstName ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder={t('Enter first name')}
                />
              </div>
              {errors.firstName && (
                <p className="text-red-400 text-sm mt-1">{errors.firstName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('Last Name')}
              </label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 ${
                    errors.lastName ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder={t('Enter last name')}
                />
              </div>
              {errors.lastName && (
                <p className="text-red-400 text-sm mt-1">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('Email Address')}
            </label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder={t('Enter email address')}
              />
            </div>
            {errors.email && (
              <p className="text-red-400 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('Password')}
            </label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-12 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 ${
                  errors.password ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder={t('Enter password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-400 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('Confirm Password')}
            </label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-12 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 ${
                  errors.confirmPassword ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder={t('Confirm password')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-red-400 text-sm mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Referral Code */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {t('Referral Code')} <span className="text-gray-500">({t('Optional')})</span>
            </label>
            <div className="relative">
              <FiGift className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                name="referralCode"
                value={formData.referralCode}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-12 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 ${
                  errors.referralCode ? 'border-red-500' : 
                  referralInfo?.valid ? 'border-green-500' : 'border-gray-600'
                }`}
                placeholder={t('Enter referral code')}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {isValidatingReferral ? (
                  <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                ) : referralInfo?.valid ? (
                  <FiCheck className="text-green-400" size={18} />
                ) : referralInfo && !referralInfo.valid ? (
                  <FiAlertCircle className="text-red-400" size={18} />
                ) : null}
              </div>
            </div>
            
            {/* Referral Status */}
            {referralInfo && (
              <div className={`mt-2 p-3 rounded-lg ${
                referralInfo.valid 
                  ? 'bg-green-900/20 border border-green-700' 
                  : 'bg-red-900/20 border border-red-700'
              }`}>
                {referralInfo.valid ? (
                  <div className="text-green-400 text-sm">
                    <div className="flex items-center space-x-2">
                      <FiCheck size={16} />
                      <span>
                        {t('Valid referral from')} {referralInfo.sponsorName}
                      </span>
                    </div>
                    <p className="text-green-300 text-xs mt-1">
                      {t('You\'ll both receive')} CHF {referralInfo.rewardAmount?.toFixed(2)} {t('reward credits')}
                    </p>
                  </div>
                ) : (
                  <div className="text-red-400 text-sm flex items-center space-x-2">
                    <FiAlertCircle size={16} />
                    <span>{referralInfo.error}</span>
                  </div>
                )}
              </div>
            )}
            
            {errors.referralCode && (
              <p className="text-red-400 text-sm mt-1">{errors.referralCode}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{t('Creating Account...')}</span>
              </>
            ) : (
              <>
                <FiUserPlus size={18} />
                <span>{t('Create Account')}</span>
              </>
            )}
          </button>
        </form>

        {/* Login Link */}
        <div className="text-center mt-6">
          <p className="text-gray-400">
            {t('Already have an account?')}{' '}
            <button
              onClick={() => router.push('/login')}
              className="text-purple-400 hover:text-purple-300 font-medium"
            >
              {t('Sign In')}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}