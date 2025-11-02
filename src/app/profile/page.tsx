'use client';

import { useState, useContext, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiPhone, FiLock, FiSave, FiBell, FiShield, FiGift, FiBarChart2 } from 'react-icons/fi';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import { useAuth } from '@/lib/auth';
import Card from '@/components/Card';
import { UserProfileService } from '@/lib/database';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { no } from 'zod/v4/locales';

export default function Profile() {
  const { t } = useTranslation(); // Initialize useTranslation
  const { user, isLoading, updateUserProfile, updateProfileImage, changePassword } = useAuth();
  const router = useRouter();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [notifications, setNotifications] = useState({
    email: false,
    whatsapp: false,
    website: false,
  });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const [isCoachApplying, setIsCoachApplying] = useState(false);
  const [coachApplication, setCoachApplication] = useState({
    linkedinProfile: '',
    experience: '',
    styles: '',
    reason: ''
  });
  const [isSubmittingApplication, setIsSubmittingApplication] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setPhone(user.phone || '');
      setProfileImage(user.profileImage || null);
      // Set default values for features not in auth system
      setNotifications({ email: false, whatsapp: false, website: false });
      setTwoFactorEnabled(false);
      UserProfileService.getById(user.email).then(profile => {
        if (profile) {
          setNotifications(profile.preferences?.notifications || notifications);
          setTwoFactorEnabled(profile.preferences?.twoFactorEnabled || false);
        }
      }).catch(error => {
        console.error('Error loading user profile:', error);
      });
    }
  }, [isLoading, user, router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    // Check file type
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      alert('Only JPEG, PNG, and GIF images are allowed');
      return;
    }

    setProfileImageFile(file);
    setProfileImagePreview(URL.createObjectURL(file));
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

  const handleSaveProfile = async () => {
    if (!user) return;
    
    try {
      setIsSaving(true);
      setSaveMessage('');
      
      let finalProfileImage = profileImage;
      
      // Upload new profile image if selected
      if (profileImageFile) {
        try {
          setIsUploadingImage(true);
          finalProfileImage = await uploadImageToCloudinary(profileImageFile);
          setIsUploadingImage(false);
          setProfileImageFile(null);
          setProfileImagePreview(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        } catch (uploadError: any) {
          console.error('Image upload error:', uploadError);
          setSaveMessage(uploadError.message || 'Failed to upload profile image');
          setIsUploadingImage(false);
          setIsSaving(false);
          return;
        }
      }
      
      const updateData = {
        firstName,
        lastName,
        phone: phone || undefined,
        profileImage: finalProfileImage || undefined,
        preferences: {
          notifications,
          twoFactorEnabled
        }
      };
      
      const success = await updateUserProfile(updateData);
      
      if (success) {
        setSaveMessage('Profile updated successfully!');
        setIsEditing(false);
        setProfileImage(finalProfileImage);
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        setSaveMessage('Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveMessage('An error occurred while saving. Please try again.');
    } finally {
      setIsSaving(false);
      setIsUploadingImage(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordError('Please fill in all fields');
      return;
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    
    try {
      setIsChangingPassword(true);
      setPasswordError('');
      
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      
      setShowPasswordModal(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSaveMessage('Password changed successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error: any) {
      console.error('Password change error:', error);
      if (error.code === 'auth/wrong-password') {
        setPasswordError('Current password is incorrect');
      } else if (error.code === 'auth/weak-password') {
        setPasswordError('New password is too weak');
      } else {
        setPasswordError('Failed to change password. Please try again.');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleVerifyTwoFactor = () => {
    // Mock verification
    setIsLoadingAction(true);
    setTimeout(() => {
      setIsLoadingAction(false);
      if (verificationCode === '123456') {
        setTwoFactorEnabled(true);
        setShowTwoFactorModal(false);
      }
    }, 1500);
  };

  const handleApplyAsCoach = () => {
    setIsCoachApplying(true);
  };

  const handleSubmitCoachApplication = async () => {
    if (!user) return;
    
    try {
      setIsSubmittingApplication(true);
      
      // Create application document in Firestore
      const applicationData = {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email,
        linkedinProfile: coachApplication.linkedinProfile,
        experience: coachApplication.experience,
        styles: coachApplication.styles,
        reason: coachApplication.reason,
        status: 'pending',
        createdAt: Timestamp.now()
      };
      
      await addDoc(collection(db, 'coachApplications'), applicationData);
      
      // Show success message
      alert('Your application has been submitted and is pending review by an administrator.');
      setIsCoachApplying(false);
      
      // Reset form
      setCoachApplication({
        linkedinProfile: '',
        experience: '',
        styles: '',
        reason: ''
      });
    } catch (error) {
      console.error('Error submitting coach application:', error);
      alert('There was an error submitting your application. Please try again.');
    } finally {
      setIsSubmittingApplication(false);
    }
  };

  const cancelImageUpload = () => {
    setProfileImageFile(null);
    if (profileImagePreview) {
      URL.revokeObjectURL(profileImagePreview);
      setProfileImagePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#D91CD2] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto mt-14 px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold gradient-text">{t('profile')}</h1>
          <Link href={`/profile_analytics/${encodeURIComponent(user.email)}`} className="btn-secondary flex items-center gap-2">
            <FiBarChart2 /> 
          </Link>
        </div>

        {/* Save Message */}
        {saveMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-4 p-3 rounded-lg ${saveMessage.includes('success') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
          >
            {saveMessage}
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Profile Information */}
          <Card className="md:col-span-2">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">{isEditing ? t('editProfile') : t('profile')}</h2>
              <button
                onClick={() => {
                  if (isEditing) {
                    // Reset form when canceling
                    setFirstName(user.firstName);
                    setLastName(user.lastName);
                    setPhone(user.phone || '');
                    setProfileImage(user.profileImage || null);
                  }
                  setIsEditing(!isEditing);
                }}
                className={isEditing ? "btn-secondary" : "btn-primary"}
                disabled={isSaving}
              >
                {isEditing ? t('cancel') : t('editProfile')}
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              {/* Profile Picture */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative w-32 h-32 rounded-full overflow-hidden bg-[#D91CD2]/20 border-2 border-[#D91CD2]/30">
                  {(profileImagePreview || profileImage) ? (
                    <Image 
                      src={profileImagePreview || profileImage || ''} 
                      alt="Profile" 
                      fill 
                      className="object-cover"
                      sizes="128px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FiUser size={60} className="text-[#D91CD2]" />
                    </div>
                  )}
                </div>
                
                {isEditing && (
                  <div className="flex flex-col items-center space-y-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageChange}
                      accept="image/jpeg,image/png,image/gif"
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-secondary text-sm"
                      disabled={isUploadingImage}
                    >
                      {isUploadingImage ? 'Uploading...' : 'Change Photo'}
                    </button>
                    {profileImageFile && (
                      <button
                        onClick={cancelImageUpload}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        Cancel
                      </button>
                    )}
                    <p className="text-xs text-gray-400 text-center">
                      Max 5MB (JPEG, PNG, GIF)
                    </p>
                  </div>
                )}
              </div>

              {/* Profile Details */}
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('firstName')}</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="input-primary w-full"
                      />
                    ) : (
                      <p className="text-gray-300">{firstName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">{t('lastName')}</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="input-primary w-full"
                      />
                    ) : (
                      <p className="text-gray-300">{lastName}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">{t('email')}</label>
                  <div className="flex items-center">
                    <FiMail className="text-[#D91CD2] mr-2" />
                    <p className="text-gray-300">{user.email}</p>
                    <span className="ml-2 text-xs bg-[#D91CD2]/20 text-[#D91CD2] px-2 py-1 rounded">{t('readonly')}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">{t('phone')}</label>
                  {isEditing ? (
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiPhone className="text-gray-400" />
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="input-primary w-full pl-12" // Increased padding for icon
                        placeholder="+1234567890"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <FiPhone className="text-[#D91CD2] mr-2" />
                      <p className="text-gray-300">{phone || t('notProvided')}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">{t('role')}</label>
                  <p className="text-gray-300 capitalize">{user.role}</p>
                  {user.role === 'student' && !isCoachApplying && (
                    <button
                      onClick={handleApplyAsCoach}
                      className="mt-2 btn-secondary text-sm"
                    >
                      {t('applyAsCoach')}
                    </button>
                  )}
                </div>

                {isEditing && (
                  <div className="pt-4">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="btn-primary flex items-center justify-center"
                    >
                      {isSaving ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      ) : (
                        <FiSave className="mr-2" />
                      )}
                      {isSaving ? 'Saving...' : t('savePreferences')}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Coach Application Form */}
            {isCoachApplying && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-8 border-t border-[#D91CD2]/20 pt-6"
              >
                <h3 className="text-lg font-semibold mb-4">{t('coachApplication')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('linkedinProfile')}</label>
                    <input 
                      type="text" 
                      className="input-primary w-full" 
                      placeholder="https://linkedin.com/in/yourprofile" 
                      value={coachApplication.linkedinProfile}
                      onChange={(e) => setCoachApplication({...coachApplication, linkedinProfile: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('experience')}</label>
                    <input 
                      type="text" 
                      className="input-primary w-full" 
                      placeholder="3 years of teaching Hip Hop" 
                      value={coachApplication.experience}
                      onChange={(e) => setCoachApplication({...coachApplication, experience: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('danceStyles')}</label>
                    <input 
                      type="text" 
                      className="input-primary w-full" 
                      placeholder="Afrobeat, Hip Hop, etc." 
                      value={coachApplication.styles}
                      onChange={(e) => setCoachApplication({...coachApplication, styles: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('whyCoach')}</label>
                    <textarea 
                      className="input-primary w-full h-24" 
                      placeholder="Tell us why you want to join our coaching team..."
                      value={coachApplication.reason}
                      onChange={(e) => setCoachApplication({...coachApplication, reason: e.target.value})}
                    ></textarea>
                  </div>
                  <div className="flex space-x-4">
                    <button 
                      onClick={handleSubmitCoachApplication} 
                      disabled={isSubmittingApplication}
                      className="btn-primary flex items-center justify-center"
                    >
                      {isSubmittingApplication ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        t('submitApplication')
                      )}
                    </button>
                    <button onClick={() => setIsCoachApplying(false)} className="btn-secondary">{t('cancel')}</button>
                  </div>
                </div>
              </motion.div>
            )}
          </Card>

          {/* Settings */}
          <Card>
            <h2 className="text-xl font-semibold mb-6">{t('settings')}</h2>
            
            {/* Referral System */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3 flex items-center">
              <FiGift className="mr-2 text-[#D91CD2]" /> {t('referralProgram')}
              </h3>
              <div className="bg-gray-900 p-6 rounded-lg shadow-lg">
              <p className="text-sm text-gray-300 mb-4">{t('shareReferral')}</p>
              <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
                <input
                type="text"
                value={user.referralCode}
                readOnly
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm flex-1 text-gray-300"
                />
                <button
                onClick={() => {
                  navigator.clipboard.writeText(user.referralCode);
                  alert(t('referralCopied'));
                }}
                className="btn-primary text-sm w-full sm:w-auto flex items-center justify-center gap-2"
                >
                <FiGift className="text-white" />
                {t('copyCode')}
                </button>
              </div>
              <div className="flex items-center justify-between bg-gray-800 p-4 rounded-lg">
                <span className="text-sm text-gray-400">{t('totalEarnings')}</span>
                <span className="text-xl font-bold text-[#D91CD2]">${user.credits || 0}</span>
              </div>
              </div>
            </div>
            
            {/* Notifications */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3 flex items-center">
                <FiBell className="mr-2 text-[#D91CD2]" /> {t('pushNotifications')}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm">{t('emailNotifications')}</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      
                      checked={notifications.email}
                      onChange={() => setNotifications({ ...notifications, email: !notifications.email })}
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D91CD2]"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm">{t('whatsappNotifications')}</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={notifications.whatsapp}
                      onChange={() => setNotifications({...notifications, whatsapp: !notifications.whatsapp})}
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D91CD2]"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm">{t('websiteNotifications')}</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={notifications.website}
                      onChange={() => setNotifications({...notifications, website: !notifications.website})}
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D91CD2]"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Security */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3 flex items-center">
                <FiShield className="mr-2 text-[#D91CD2]" /> {t('security')}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm">{t('twoFactorAuth')}</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={twoFactorEnabled}
                      onChange={() => {
                        if (!twoFactorEnabled) {
                          setShowTwoFactorModal(true);
                        } else {
                          setTwoFactorEnabled(false);
                        }
                      }}
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D91CD2]"></div>
                  </label>
                </div>
                <button 
                  onClick={() => setShowPasswordModal(true)}
                  className="btn-secondary w-full text-sm"
                >
                  {t('changePassword')}
                </button>
              </div>
            </div>
          </Card>
        </div>
      </motion.div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-black border border-[#D91CD2]/30 rounded-xl p-6 max-w-md w-full"
          >
            <h3 className="text-xl font-bold mb-4">{t('changePassword')}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Current Password</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                  className="input-primary w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">New Password</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  className="input-primary w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  className="input-primary w-full"
                />
              </div>
              {passwordError && (
                <p className="text-red-400 text-sm">{passwordError}</p>
              )}
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handlePasswordChange}
                disabled={isChangingPassword}
                className="btn-primary flex-1 flex justify-center items-center"
              >
                {isChangingPassword ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Change Password'
                )}
              </button>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setPasswordError('');
                }}
                className="btn-secondary flex-1"
              >
                {t('cancel')}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Two Factor Authentication Modal */}
      {showTwoFactorModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-black border border-[#D91CD2]/30 rounded-xl p-6 max-w-md w-full"
          >
            <h3 className="text-xl font-bold mb-4">{t('twoFactorAuth')}</h3>
            <p className="text-gray-300 mb-6">
              {t('twoFactorVerify')}
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1">{t('verificationCode')}</label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="input-primary w-full text-center text-2xl tracking-wider"
                placeholder="123456"
                maxLength={6}
              />
              <p className="text-xs text-gray-400 mt-1">{t('demoCode')}</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleVerifyTwoFactor}
                disabled={isLoadingAction}
                className="btn-primary flex-1 flex justify-center items-center"
              >
                {isLoadingAction ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  t('verify')
                )}
              </button>
              <button
                onClick={() => setShowTwoFactorModal(false)}
                className="btn-secondary flex-1"
              >
                {t('cancel')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}