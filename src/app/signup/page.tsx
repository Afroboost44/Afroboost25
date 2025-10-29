'use client';

import { useState, useContext, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiMail, FiLock, FiUser, FiPhone, FiAlertCircle, FiGift, FiUpload, FiX } from 'react-icons/fi';
import { AppContext, translations } from '../providers';
import { useAuth } from '@/lib/auth';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';

const signupSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  referralCode: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function Signup() {
  const { language } = useContext(AppContext);
  const { register: registerUser, user } = useAuth();
  const t = translations[language];
  const router = useRouter();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImageURL, setProfileImageURL] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simple redirect if already logged in
  useEffect(() => {
    if (user) {
      console.log('Already logged in, redirecting to home');
      router.replace('/');
    }
  }, [user, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    // Check file type
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      setError('Only JPEG, PNG, and GIF images are allowed');
      return;
    }

    setProfileImage(file);
    setProfileImageURL(URL.createObjectURL(file));
    setError('');
  };

  const removeImage = () => {
    setProfileImage(null);
    if (profileImageURL) {
      URL.revokeObjectURL(profileImageURL);
      setProfileImageURL(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImageToCloudinary = async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/cloudinary/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      return data.secure_url;
    } catch (error: any) {
      console.error('Error uploading image to Cloudinary:', error);
      throw new Error('Failed to upload profile image');
    }
  };

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    setError('');

    try {
      console.log('Submitting registration form');
      
      let profileImageUrl = null;
      
      // Upload image to Cloudinary if selected
      if (profileImage) {
        try {
          profileImageUrl = await uploadImageToCloudinary(profileImage);
        } catch (uploadError: any) {
          console.error('Image upload error:', uploadError);
          setError(uploadError.message || 'Failed to upload profile image');
          setIsLoading(false);
          return;
        }
      }
      
      const success = await registerUser({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        password: data.password,
        profileImage: profileImageUrl,
        referredBy: data.referralCode || null,
      });
      
      if (success) {
        console.log('Registration successful, refreshing window');
        window.location.reload();
      } else {
        setError('Registration failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err?.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if user is authenticated (prevent flash)
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#D91CD2] border-t-transparent rounded-full animate-spin"></div>
        <p className="ml-4 text-lg">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="card">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold gradient-text">{t.signUp}</h1>
            <p className="text-gray-400 mt-2">
              {t.haveAccount}{' '}
              <Link href="/login" className="text-[#D91CD2] hover:underline">
                {t.signIn}
              </Link>
            </p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-6 flex items-center">
              <FiAlertCircle className="text-red-500 mr-2" />
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Profile Image Upload */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                {profileImageURL ? (
                  <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-[#D91CD2] bg-black">
                    <Image 
                      src={profileImageURL} 
                      alt="Profile Preview" 
                      fill 
                      className="object-cover"
                      sizes="96px"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-0 right-0 bg-red-500 rounded-full p-1 text-white hover:bg-red-600 transition-colors"
                      aria-label="Remove image"
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 rounded-full bg-black/40 border-2 border-dashed border-[#D91CD2]/50 flex items-center justify-center cursor-pointer hover:border-[#D91CD2] transition-colors"
                  >
                    <FiUpload className="text-[#D91CD2]" size={24} />
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/jpeg, image/png, image/gif"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm text-[#D91CD2] mt-2 hover:underline"
              >
                {profileImageURL ? 'Change Profile Picture' : 'Upload Profile Picture'}
              </button>
              <p className="text-xs text-gray-400 mt-1">Max size: 5MB (JPEG, PNG, GIF)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="firstName" className="block text-sm font-medium">
                  {t.firstName}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiUser className="text-gray-400" />
                  </div>
                  <input
                    id="firstName"
                    type="text"
                    {...register('firstName')}
                    className="input-primary w-full pl-12" // Increased padding for icon
                    placeholder="John"
                  />
                </div>
                {errors.firstName && (
                  <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="lastName" className="block text-sm font-medium">
                  {t.lastName}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiUser className="text-gray-400" />
                  </div>
                  <input
                    id="lastName"
                    type="text"
                    {...register('lastName')}
                    className="input-primary w-full pl-12" // Increased padding for icon
                    placeholder="Doe"
                  />
                </div>
                {errors.lastName && (
                  <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium">
                {t.email}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMail className="text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  className="input-primary w-full pl-12" // Increased padding for icon
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="phone" className="block text-sm font-medium">
                {t.phone}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiPhone className="text-gray-400" />
                </div>
                <input
                  id="phone"
                  type="tel"
                  {...register('phone')}
                  className="input-primary w-full pl-10"
                  placeholder="+1234567890"
                />
              </div>
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium">
                {t.password}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  {...register('password')}
                  className="input-primary w-full pl-12" // Increased padding for icon
                  placeholder="••••••••"
                />
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium">
                {t.confirmPassword}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  type="password"
                  {...register('confirmPassword')}
                  className="input-primary w-full pl-12" // Increased padding for icon
                  placeholder="••••••••"
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="referralCode" className="block text-sm font-medium">
                Referral Code <span className="text-gray-400">(Optional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiGift className="text-gray-400" />
                </div>
                <input
                  id="referralCode"
                  type="text"
                  {...register('referralCode')}
                  className="input-primary w-full pl-12" // Increased padding for icon
                  placeholder="Enter referral code"
                />
              </div>
              {errors.referralCode && (
                <p className="text-red-500 text-xs mt-1">{errors.referralCode.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex justify-center items-center"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                t.signUp
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}