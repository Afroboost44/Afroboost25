'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiSave, FiKey, FiLock, FiEye, FiEyeOff, FiCheck, FiX, FiCreditCard, FiDollarSign, FiToggleLeft, FiToggleRight, FiTrendingUp, FiImage, FiMail, FiSend } from 'react-icons/fi';
import { useAuth } from '@/lib/auth';
import Card from '@/components/Card';
import EmailTestPanel from '@/components/EmailTestPanel';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useTranslation } from 'react-i18next'; // Import useTranslation

interface StripeSettings {
  publishableKey: string;
  secretKey: string;
  isConfigured: boolean;
  isEnabled: boolean;
}

interface PayPalSettings {
  clientId: string;
  clientSecret: string;
  isConfigured: boolean;
  isEnabled: boolean;
}

interface PaymentMethodsSettings {
  stripe: boolean;
  paypal: boolean;
}

interface BoostPricingSettings {
  basic: number;
  premium: number;
  featured: number;
}

interface BackgroundSettings {
  backgroundImageUrl: string;
}

interface VideoSettings {
  heroVideoUrl: string;
  heroTitle: string;
  heroSubtitle: string;
}

interface EmailSettings {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  isEnabled: boolean;
  isConfigured: boolean;
  senderName: string;
}

export default function AdminSettings() {
  const { t } = useTranslation(); // Initialize useTranslation
  const { user } = useAuth();
  const [stripeSettings, setStripeSettings] = useState<StripeSettings>({
    publishableKey: '',
    secretKey: '',
    isConfigured: false,
    isEnabled: false
  });
  const [paypalSettings, setPaypalSettings] = useState<PayPalSettings>({
    clientId: '',
    clientSecret: '',
    isConfigured: false,
    isEnabled: false
  });
  const [boostPricing, setBoostPricing] = useState<BoostPricingSettings>({
    basic: 25,
    premium: 50,
    featured: 100
  });
  const [backgroundSettings, setBackgroundSettings] = useState<BackgroundSettings>({
    backgroundImageUrl: ''
  });
  const [videoSettings, setVideoSettings] = useState<VideoSettings>({
    heroVideoUrl: '',
    heroTitle: '',
    heroSubtitle: ''
  });
  const [socialMediaSettings, setSocialMediaSettings] = useState({
    facebook: '',
    instagram: '',
    tiktok: '',
    youtube: ''
  });
  const [homePageVideoSettings, setHomePageVideoSettings] = useState({
    heroVideoLink: '',
    heroTitle: '',
    heroSubtitle: ''
  });
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: '',
      pass: ''
    },
    isEnabled: true,
    isConfigured: true,
    senderName: 'AfroBoost'
  });
  const [showStripeSecretKey, setShowStripeSecretKey] = useState(false);
  const [showPaypalSecretKey, setShowPaypalSecretKey] = useState(false);
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingStripe, setIsSavingStripe] = useState(false);
  const [isSavingPaypal, setIsSavingPaypal] = useState(false);
  const [isSavingBoost, setIsSavingBoost] = useState(false);
  const [isSavingBackground, setIsSavingBackground] = useState(false);
  const [isSavingVideo, setIsSavingVideo] = useState(false);
  const [isSavingSocialMedia, setIsSavingSocialMedia] = useState(false);
  const [isSavingHomeVideo, setIsSavingHomeVideo] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'superadmin') {
      loadSettings();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      
      // Load Stripe settings
      const stripeDoc = await getDoc(doc(db, 'admin_settings', 'stripe'));
      if (stripeDoc.exists()) {
        const data = stripeDoc.data();
        setStripeSettings({
          publishableKey: data.publishableKey || '',
          secretKey: data.secretKey ? '••••••••••••••••' : '',
          isConfigured: data.isConfigured || false,
          isEnabled: data.isEnabled !== undefined ? data.isEnabled : data.isConfigured || false
        });
      }
      
      // Load PayPal settings
      const paypalDoc = await getDoc(doc(db, 'admin_settings', 'paypal'));
      if (paypalDoc.exists()) {
        const data = paypalDoc.data();
        setPaypalSettings({
          clientId: data.clientId || '',
          clientSecret: data.clientSecret ? '••••••••••••••••' : '',
          isConfigured: data.isConfigured || false,
          isEnabled: data.isEnabled !== undefined ? data.isEnabled : data.isConfigured || false
        });
      }
      
      // Load boost pricing settings
      const boostDoc = await getDoc(doc(db, 'admin_settings', 'boost_pricing'));
      if (boostDoc.exists()) {
        const data = boostDoc.data();
        setBoostPricing({
          basic: data.basic || 25,
          premium: data.premium || 50,
          featured: data.featured || 100
        });
      }

      // Load background settings
      const backgroundDoc = await getDoc(doc(db, 'admin_settings', 'background'));
      if (backgroundDoc.exists()) {
        const data = backgroundDoc.data();
        setBackgroundSettings({
          backgroundImageUrl: data.backgroundImageUrl || ''
        });
      }
      
      // Load video settings
      const videoDoc = await getDoc(doc(db, 'admin_settings', 'video'));
      if (videoDoc.exists()) {
        const data = videoDoc.data();
        setVideoSettings({
          heroVideoUrl: data.heroVideoUrl || '',
          heroTitle: data.heroTitle || '',
          heroSubtitle: data.heroSubtitle || ''
        });
      }
      
      // Load social media settings
      const socialMediaDoc = await getDoc(doc(db, 'admin_settings', 'social_media'));
      if (socialMediaDoc.exists()) {
        const data = socialMediaDoc.data();
        setSocialMediaSettings({
          facebook: data.facebook || '',
          instagram: data.instagram || '',
          tiktok: data.tiktok || '',
          youtube: data.youtube || ''
        });
      }
      
      // Load home page video settings
      const homePageVideoDoc = await getDoc(doc(db, 'admin_settings', 'home_page_video'));
      if (homePageVideoDoc.exists()) {
        const data = homePageVideoDoc.data();
        setHomePageVideoSettings({
          heroVideoLink: data.heroVideoLink || '',
          heroTitle: data.heroTitle || '',
          heroSubtitle: data.heroSubtitle || ''
        });
      }
      
      // Load email settings
      const emailDoc = await getDoc(doc(db, 'admin_settings', 'email'));
      if (emailDoc.exists()) {
        const data = emailDoc.data();
        setEmailSettings({
          host: data.host || 'smtp.gmail.com',
          port: data.port || 465,
          secure: data.secure || true,
          auth: {
            user: data.auth?.user || '',
            pass: data.auth?.pass ? '••••••••••••••••' : ''
          },
          isEnabled: data.isEnabled || true,
          isConfigured: data.isConfigured || true,
          senderName: data.senderName || 'AfroBoost'
        });
      }
      
    } catch (error) {
      console.error('Error loading settings:', error);
      showMessage('error', 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const encryptKey = (key: string): string => {
    // Simple encryption - in production, use proper encryption
    return btoa(key);
  };

  const handleSaveStripeSettings = async () => {
    if (!stripeSettings.publishableKey || !stripeSettings.secretKey) {
      showMessage('error', 'Please provide both publishable and secret keys for Stripe');
      return;
    }

    if (!stripeSettings.publishableKey.startsWith('pk_')) {
      showMessage('error', 'Invalid Stripe publishable key format');
      return;
    }

    if (!stripeSettings.secretKey.startsWith('sk_') && !stripeSettings.secretKey.includes('••••')) {
      showMessage('error', 'Invalid Stripe secret key format');
      return;
    }

    try {
      setIsSavingStripe(true);
      
      const settingsData = {
        publishableKey: stripeSettings.publishableKey,
        secretKey: stripeSettings.secretKey.includes('••••') ? undefined : encryptKey(stripeSettings.secretKey),
        isConfigured: true,
        isEnabled: stripeSettings.isEnabled,
        updatedAt: new Date(),
        updatedBy: user?.id
      };

      // Remove undefined values
      const settingsDataMutable: Record<string, any> = { ...settingsData };
      Object.keys(settingsDataMutable).forEach(key => {
        if (settingsDataMutable[key] === undefined) {
          delete settingsDataMutable[key];
        }
      });
      
      await setDoc(doc(db, 'admin_settings', 'stripe'), settingsDataMutable, { merge: true });
      
      // Check if at least one payment method is enabled
      if (!stripeSettings.isEnabled && !paypalSettings.isEnabled) {
        await setDoc(doc(db, 'admin_settings', 'stripe'), { isEnabled: true }, { merge: true });
        setStripeSettings(prev => ({ ...prev, isEnabled: true }));
        showMessage('success', 'Stripe settings saved. At least one payment method must be enabled.');
      } else {
        showMessage('success', 'Stripe settings saved successfully');
      }
      
      await loadSettings();
    } catch (error) {
      console.error('Error saving Stripe settings:', error);
      showMessage('error', 'Failed to save Stripe settings');
    } finally {
      setIsSavingStripe(false);
    }
  };

  const handleSavePaypalSettings = async () => {
    if (!paypalSettings.clientId || !paypalSettings.clientSecret) {
      showMessage('error', 'Please provide both client ID and client secret for PayPal');
      return;
    }

    try {
      setIsSavingPaypal(true);
      
      const settingsData = {
        clientId: paypalSettings.clientId,
        clientSecret: paypalSettings.clientSecret.includes('••••') ? undefined : encryptKey(paypalSettings.clientSecret),
        isConfigured: true,
        isEnabled: paypalSettings.isEnabled,
        updatedAt: new Date(),
        updatedBy: user?.id
      };

      // Remove undefined values
      const settingsDataMutable: Record<string, any> = { ...settingsData };
      Object.keys(settingsDataMutable).forEach(key => {
        if (settingsDataMutable[key] === undefined) {
          delete settingsDataMutable[key];
        }
      });
      
      await setDoc(doc(db, 'admin_settings', 'paypal'), settingsDataMutable, { merge: true });
      
      // Check if at least one payment method is enabled
      if (!stripeSettings.isEnabled && !paypalSettings.isEnabled) {
        await setDoc(doc(db, 'admin_settings', 'paypal'), { isEnabled: true }, { merge: true });
        setPaypalSettings(prev => ({ ...prev, isEnabled: true }));
        showMessage('success', 'PayPal settings saved. At least one payment method must be enabled.');
      } else {
        showMessage('success', 'PayPal settings saved successfully');
      }
      
      await loadSettings();
    } catch (error) {
      console.error('Error saving PayPal settings:', error);
      showMessage('error', 'Failed to save PayPal settings');
    } finally {
      setIsSavingPaypal(false);
    }
  };

  const handleSaveBoostPricing = async () => {
    try {
      setIsSavingBoost(true);
      
      await setDoc(doc(db, 'admin_settings', 'boost_pricing'), {
        ...boostPricing,
        updatedAt: new Date(),
        updatedBy: user?.id
      });
      
      showMessage('success', 'Boost pricing settings saved successfully');
    } catch (error) {
      console.error('Error saving boost pricing:', error);
      showMessage('error', 'Failed to save boost pricing settings');
    } finally {
      setIsSavingBoost(false);
    }
  };

  const handleSaveEmailSettings = async () => {
    if (!emailSettings.host || !emailSettings.port || !emailSettings.auth.user || !emailSettings.auth.pass) {
      showMessage('error', 'Please fill in all required email settings');
      return;
    }

    if (!emailSettings.auth.user.includes('@')) {
      showMessage('error', 'Please enter a valid email address');
      return;
    }

    try {
      setIsSavingEmail(true);
      
      const settingsData = {
        host: emailSettings.host,
        port: emailSettings.port,
        secure: emailSettings.secure,
        auth: {
          user: emailSettings.auth.user,
          pass: emailSettings.auth.pass.includes('••••') ? undefined : emailSettings.auth.pass
        },
        isEnabled: emailSettings.isEnabled,
        senderName: emailSettings.senderName || 'AfroBoost'
      };
      // Remove undefined values
      const settingsDataMutable: Record<string, any> = { ...settingsData };
      if (settingsDataMutable.auth.pass === undefined) {
        delete settingsDataMutable.auth.pass;
      }

      const response = await fetch('/api/admin/email-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id}` // Simple auth for demo
        },
        body: JSON.stringify(settingsDataMutable)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save email settings');
      }

      showMessage('success', 'Email settings saved and tested successfully');
      await loadSettings();
    } catch (error) {
      console.error('Error saving email settings:', error);
      showMessage('error', error instanceof Error ? error.message : 'Failed to save email settings');
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmailAddress) {
      showMessage('error', 'Please enter a test email address');
      return;
    }

    try {
      setIsTestingEmail(true);
      
      const response = await fetch('/api/admin/email-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id}`
        },
        body: JSON.stringify({ testEmail: testEmailAddress })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send test email');
      }

      showMessage('success', 'Test email sent successfully! Please check your inbox.');
      setTestEmailAddress('');
    } catch (error) {
      console.error('Error sending test email:', error);
      showMessage('error', error instanceof Error ? error.message : 'Failed to send test email');
    } finally {
      setIsTestingEmail(false);
    }
  };

  const handleSaveBackgroundSettings = async () => {
    try {
      setIsSavingBackground(true);
      
      await setDoc(doc(db, 'admin_settings', 'background'), {
        ...backgroundSettings,
        updatedAt: new Date(),
        updatedBy: user?.id
      });
      
      showMessage('success', 'Background settings saved successfully');
    } catch (error) {
      console.error('Error saving background settings:', error);
      showMessage('error', 'Failed to save background settings');
    } finally {
      setIsSavingBackground(false);
    }
  };

  const handleSaveVideoSettings = async () => {
    try {
      setIsSavingVideo(true);

      // Save to video settings collection
      await setDoc(doc(db, 'admin_settings', 'video'), {
        ...videoSettings,
        updatedAt: new Date(),
        updatedBy: user?.id
      });
      
      showMessage('success', 'Video settings saved successfully');
    } catch (error) {
      console.error('Error saving video settings:', error);
      showMessage('error', 'Failed to save video settings');
    } finally {
      setIsSavingVideo(false);
    }
  };

  const handleVideoUploadUnsigned = async (file: File) => {
    // Check file size (limit to 100MB for better user experience)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      showMessage('error', 'Video file is too large. Please choose a file smaller than 100MB.');
      return;
    }

    try {
      setIsSavingVideo(true);
      setIsUploading(true);
      setUploadProgress(0);
      
      // Get Cloudinary config
      const configResponse = await fetch('/api/cloudinary/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!configResponse.ok) {
        throw new Error('Failed to get upload configuration');
      }

      const { cloudName, uploadPreset } = await configResponse.json();

      // Upload directly to Cloudinary with progress tracking (unsigned)
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      formData.append('resource_type', 'video');

      // Use XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener('load', async () => {
          if (xhr.status === 200) {
            try {
              const uploadData = JSON.parse(xhr.responseText);
              const videoUrl = uploadData.secure_url;
              
              // Update state
              setVideoSettings(prev => ({
                ...prev,
                heroVideoUrl: videoUrl
              }));
              
              // Save to database immediately
              await setDoc(doc(db, 'admin_settings', 'video'), {
                heroVideoUrl: videoUrl,
                heroTitle: videoSettings.heroTitle,
                heroSubtitle: videoSettings.heroSubtitle,
                updatedAt: new Date(),
                updatedBy: user?.id
              });
              
              // Also save to home_page_video collection for homepage usage
              await setDoc(doc(db, 'admin_settings', 'home_page_video'), {
                uploadedVideoUrl: videoUrl,
                heroVideoLink: homePageVideoSettings.heroVideoLink,
                heroTitle: homePageVideoSettings.heroTitle,
                heroSubtitle: homePageVideoSettings.heroSubtitle,
                updatedAt: new Date(),
                updatedBy: user?.id
              });
              
              showMessage('success', 'Video uploaded and saved successfully');
              resolve(uploadData);
            } catch (error) {
              reject(new Error('Failed to parse upload response'));
            }
          } else {
            reject(new Error(`Upload failed with status: ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`);
        xhr.send(formData);
      });
      
    } catch (error) {
      console.error('Error uploading video:', error);
      showMessage('error', 'Failed to upload video: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSavingVideo(false);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleVideoUpload = async (file: File) => {
    // Check file size (limit to 100MB for better user experience)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      showMessage('error', 'Video file is too large. Please choose a file smaller than 100MB.');
      return;
    }

    try {
      setIsSavingVideo(true);
      setIsUploading(true);
      setUploadProgress(0);
      
      // Get upload signature from your API
      const signatureResponse = await fetch('/api/cloudinary/signature', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: Math.round((new Date()).getTime() / 1000),
          upload_preset: 'afroboost_videos', // You'll need to create this preset in Cloudinary
        }),
      });

      if (!signatureResponse.ok) {
        throw new Error('Failed to get upload signature');
      }

      const { signature, timestamp, cloudName, apiKey } = await signatureResponse.json();

      // Upload directly to Cloudinary with progress tracking
      const formData = new FormData();
      formData.append('file', file);
      formData.append('signature', signature);
      formData.append('timestamp', timestamp.toString());
      formData.append('api_key', apiKey);
      formData.append('upload_preset', 'afroboost_videos');
      formData.append('resource_type', 'video');

      // Use XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener('load', async () => {
          if (xhr.status === 200) {
            try {
              const uploadData = JSON.parse(xhr.responseText);
              const videoUrl = uploadData.secure_url;
              
              // Update state
              setVideoSettings(prev => ({
                ...prev,
                heroVideoUrl: videoUrl
              }));
              
              // Save to database immediately
              await setDoc(doc(db, 'admin_settings', 'video'), {
                heroVideoUrl: videoUrl,
                heroTitle: videoSettings.heroTitle,
                heroSubtitle: videoSettings.heroSubtitle,
                updatedAt: new Date(),
                updatedBy: user?.id
              });
              
              // Also save to home_page_video collection for homepage usage
              await setDoc(doc(db, 'admin_settings', 'home_page_video'), {
                uploadedVideoUrl: videoUrl,
                heroVideoLink: homePageVideoSettings.heroVideoLink,
                heroTitle: homePageVideoSettings.heroTitle,
                heroSubtitle: homePageVideoSettings.heroSubtitle,
                updatedAt: new Date(),
                updatedBy: user?.id
              });
              
              showMessage('success', 'Video uploaded and saved successfully');
              resolve(uploadData);
            } catch (error) {
              reject(new Error('Failed to parse upload response'));
            }
          } else {
            reject(new Error(`Upload failed with status: ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`);
        xhr.send(formData);
      });
      
    } catch (error) {
      console.error('Error uploading video:', error);
      showMessage('error', 'Failed to upload video: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsSavingVideo(false);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSaveSocialMediaSettings = async () => {
    try {
      await setDoc(doc(db, 'admin_settings', 'social_media'), {
        ...socialMediaSettings,
        updatedAt: new Date(),
        updatedBy: user?.id
      });
      
      showMessage('success', 'Social media settings saved successfully');
    } catch (error) {
      console.error('Error saving social media settings:', error);
      showMessage('error', 'Failed to save social media settings');
    }
  };

  const handleSaveHomePageVideoSettings = async () => {
    try {
      await setDoc(doc(db, 'admin_settings', 'home_page_video'), {
        ...homePageVideoSettings,
        uploadedVideoUrl: videoSettings.heroVideoUrl, // Save uploaded video URL
        updatedAt: new Date(),
        updatedBy: user?.id
      });
      
      showMessage('success', 'Home page video settings saved successfully');
    } catch (error) {
      console.error('Error saving home page video settings:', error);
      showMessage('error', 'Failed to save home page video settings');
    }
  };

  const togglePaymentMethod = async (method: 'stripe' | 'paypal') => {
    try {
      if (method === 'stripe') {
        const newValue = !stripeSettings.isEnabled;
        
        // Prevent disabling if it's the only enabled payment method
        if (!newValue && !paypalSettings.isEnabled) {
          showMessage('error', 'At least one payment method must be enabled');
          return;
        }
        
        await setDoc(doc(db, 'admin_settings', 'stripe'), { isEnabled: newValue }, { merge: true });
        setStripeSettings(prev => ({ ...prev, isEnabled: newValue }));
        showMessage('success', `Stripe payments ${newValue ? 'enabled' : 'disabled'}`);
      } else {
        const newValue = !paypalSettings.isEnabled;
        
        // Prevent disabling if it's the only enabled payment method
        if (!newValue && !stripeSettings.isEnabled) {
          showMessage('error', 'At least one payment method must be enabled');
          return;
        }
        
        await setDoc(doc(db, 'admin_settings', 'paypal'), { isEnabled: newValue }, { merge: true });
        setPaypalSettings(prev => ({ ...prev, isEnabled: newValue }));
        showMessage('success', `PayPal payments ${newValue ? 'enabled' : 'disabled'}`);
      }
    } catch (error) {
      console.error('Error toggling payment method:', error);
      showMessage('error', 'Failed to update payment method settings');
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return null;
  }

  return (
    <div className="space-y-6">
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg mb-6 flex items-center space-x-2 ${
            message.type === 'success' 
              ? 'bg-green-500/20 border border-green-500/30 text-green-400'
              : 'bg-red-500/20 border border-red-500/30 text-red-400'
          }`}
        >
          {message.type === 'success' ? <FiCheck /> : <FiX />}
          <span>{message.text}</span>
        </motion.div>
      )}

      {/* Payment Methods Control */}
      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <FiCreditCard className="text-[#D91CD2]" size={24} />
          <h2 className="text-2xl font-bold">{t('paymentMethods')}</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <FiCreditCard className="text-white" size={20} />
              <div>
                <h3 className="font-medium">{t('stripePayments')}</h3>
                <p className="text-sm text-gray-400">{t('creditDebitPayments')}</p>
              </div>
            </div>
            <button 
              onClick={() => togglePaymentMethod('stripe')}
              disabled={!stripeSettings.isConfigured}
              className={`text-2xl ${!stripeSettings.isConfigured ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              title={stripeSettings.isConfigured ? t('toggleStripe') : t('configureStripeFirst')}
            >
              {stripeSettings.isEnabled ? 
                <FiToggleRight className="text-green-400" /> : 
                <FiToggleLeft className="text-gray-400" />
              }
            </button>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <FiDollarSign className="text-white" size={20} />
              <div>
                <h3 className="font-medium">{t('paypalPayments')}</h3>
                <p className="text-sm text-gray-400">{t('paypalBalancePayments')}</p>
              </div>
            </div>
            <button 
              onClick={() => togglePaymentMethod('paypal')}
              disabled={!paypalSettings.isConfigured}
              className={`text-2xl ${!paypalSettings.isConfigured ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              title={paypalSettings.isConfigured ? t('togglePaypal') : t('configurePaypalFirst')}
            >
              {paypalSettings.isEnabled ? 
                <FiToggleRight className="text-green-400" /> : 
                <FiToggleLeft className="text-gray-400" />
              }
            </button>
          </div>
          
          <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <FiLock className="text-yellow-400 mt-1" />
              <div>
                <h4 className="font-medium text-yellow-300">{t('paymentConfiguration')}</h4>
                <p className="text-sm text-yellow-200 mt-1">
                  {t('atLeastOnePaymentMethod')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Stripe Settings */}
      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <FiCreditCard className="text-[#D91CD2]" size={24} />
          <h2 className="text-2xl font-bold">{t('stripePaymentSettings')}</h2>
          {stripeSettings.isConfigured && (
            <div className="flex items-center space-x-2 text-green-400">
              <FiCheck size={16} />
              <span className="text-sm">{t('configured')}</span>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              {t('stripePublishableKey')}
            </label>
            <div className="relative">
              <input
                type="text"
                value={stripeSettings.publishableKey}
                onChange={(e) => setStripeSettings(prev => ({ ...prev, publishableKey: e.target.value }))}
                className="input-primary w-full pr-10"
                placeholder={t('stripePublishableKeyPlaceholder')}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <FiKey className="text-gray-400" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {t('stripePublishableKeyInfo')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              {t('stripeSecretKey')}
            </label>
            <div className="relative">
              <input
                type={showStripeSecretKey ? 'text' : 'password'}
                value={stripeSettings.secretKey}
                onChange={(e) => setStripeSettings(prev => ({ ...prev, secretKey: e.target.value }))}
                className="input-primary w-full pr-20"
                placeholder={t('stripeSecretKeyPlaceholder')}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowStripeSecretKey(!showStripeSecretKey)}
                  className="text-gray-400 hover:text-white"
                >
                  {showStripeSecretKey ? <FiEyeOff /> : <FiEye />}
                </button>
                <FiLock className="text-red-400" />
              </div>
            </div>
            <p className="text-xs text-red-400 mt-1">
              {t('stripeSecretKeyWarning')}
            </p>
          </div>

          <button
            onClick={handleSaveStripeSettings}
            disabled={isSavingStripe || isLoading}
            className="btn-primary w-full flex items-center justify-center space-x-2"
          >
            {isSavingStripe ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <FiSave />
                <span>{t('saveStripeSettings')}</span>
              </>
            )}
          </button>
        </div>
      </Card>

      {/* PayPal Settings */}
      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <FiDollarSign className="text-[#D91CD2]" size={24} />
          <h2 className="text-2xl font-bold">{t('paypalPaymentSettings')}</h2>
          {paypalSettings.isConfigured && (
            <div className="flex items-center space-x-2 text-green-400">
              <FiCheck size={16} />
              <span className="text-sm">{t('configured')}</span>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              {t('paypalClientId')}
            </label>
            <div className="relative">
              <input
                type="text"
                value={paypalSettings.clientId}
                onChange={(e) => setPaypalSettings(prev => ({ ...prev, clientId: e.target.value }))}
                className="input-primary w-full pr-10"
                placeholder={t('yourPayPalClientId')}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <FiKey className="text-gray-400" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {t('clientIdFromPayPal')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              {t('paypalClientSecret')}
            </label>
            <div className="relative">
              <input
                type={showPaypalSecretKey ? 'text' : 'password'}
                value={paypalSettings.clientSecret}
                onChange={(e) => setPaypalSettings(prev => ({ ...prev, clientSecret: e.target.value }))}
                className="input-primary w-full pr-20"
                placeholder={t('yourPayPalClientSecret')}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPaypalSecretKey(!showPaypalSecretKey)}
                  className="text-gray-400 hover:text-white"
                >
                  {showPaypalSecretKey ? <FiEyeOff /> : <FiEye />}
                </button>
                <FiLock className="text-red-400" />
              </div>
            </div>
            <p className="text-xs text-red-400 mt-1">
              {t('secretKeyWarning')}
            </p>
          </div>

          <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <FiLock className="text-yellow-400 mt-1" />
              <div>
                <h4 className="font-medium text-yellow-300">{t('securityNotice')}</h4>
                <p className="text-sm text-yellow-200 mt-1">
                  {t('secretKeysEncrypted')}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleSavePaypalSettings}
            disabled={isSavingPaypal || isLoading}
            className="btn-primary w-full flex items-center justify-center space-x-2"
          >
            {isSavingPaypal ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <FiSave />
                <span>{t('savePaypalSettings')}</span>
              </>
            )}
          </button>
        </div>
      </Card>

      {/* Email Notification Settings */}
      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <FiMail className="text-[#D91CD2]" size={24} />
          <h2 className="text-2xl font-bold">{t('emailNotificationSettings')}</h2>
        </div>

        <div className="space-y-6">
          {/* Enable/Disable Email Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">{t('enableEmailNotifications')}</h3>
              <p className="text-sm text-gray-400">{t('enableEmailNotificationsDesc')}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={emailSettings.isEnabled}
                onChange={(e) => setEmailSettings(prev => ({ ...prev, isEnabled: e.target.checked }))}
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D91CD2]"></div>
            </label>
          </div>

          {/* Email Host */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              {t('emailHost')} *
            </label>
            <input
              type="text"
              value={emailSettings.host}
              onChange={(e) => setEmailSettings(prev => ({ ...prev, host: e.target.value }))}
              className="input-primary w-full"
              placeholder="smtp.gmail.com"
              required
            />
            <p className="text-xs text-gray-400 mt-1">{t('emailHostDesc')}</p>
          </div>

          {/* Email Port and Security */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                {t('emailPort')} *
              </label>
              <input
                type="number"
                value={emailSettings.port}
                onChange={(e) => setEmailSettings(prev => ({ ...prev, port: Number(e.target.value) }))}
                className="input-primary w-full"
                placeholder="465"
                min="1"
                max="65535"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                {t('emailSecurity')}
              </label>
              <select
                value={emailSettings.secure.toString()}
                onChange={(e) => setEmailSettings(prev => ({ ...prev, secure: e.target.value === 'true' }))}
                className="input-primary w-full"
              >
                <option value="true">SSL/TLS (465)</option>
                <option value="false">STARTTLS (587)</option>
              </select>
            </div>
          </div>

          {/* Email Authentication */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              {t('emailAddress')} *
            </label>
            <input
              type="email"
              value={emailSettings.auth.user}
              onChange={(e) => setEmailSettings(prev => ({ ...prev, auth: { ...prev.auth, user: e.target.value } }))}
              className="input-primary w-full"
              placeholder="your-email@gmail.com"
              required
            />
            <p className="text-xs text-gray-400 mt-1">{t('emailAddressDesc')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              {t('emailPassword')} *
            </label>
            <div className="relative">
              <input
                type={showEmailPassword ? 'text' : 'password'}
                value={emailSettings.auth.pass}
                onChange={(e) => setEmailSettings(prev => ({ ...prev, auth: { ...prev.auth, pass: e.target.value } }))}
                className="input-primary w-full pr-20"
                placeholder={t('emailPasswordPlaceholder')}
                required
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEmailPassword(!showEmailPassword)}
                  className="text-gray-400 hover:text-white"
                >
                  {showEmailPassword ? <FiEyeOff /> : <FiEye />}
                </button>
                <FiLock className="text-red-400" />
              </div>
            </div>
            <p className="text-xs text-red-400 mt-1">
              {t('emailPasswordWarning')}
            </p>
          </div>

          {/* Sender Name */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              {t('senderName')}
            </label>
            <input
              type="text"
              value={emailSettings.senderName}
              onChange={(e) => setEmailSettings(prev => ({ ...prev, senderName: e.target.value }))}
              className="input-primary w-full"
              placeholder="AfroBoost"
            />
            <p className="text-xs text-gray-400 mt-1">{t('senderNameDesc')}</p>
          </div>

          {/* Security Notice */}
          <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <FiLock className="text-yellow-400 mt-1" />
              <div>
                <h4 className="font-medium text-yellow-300">{t('securityNotice')}</h4>
                <p className="text-sm text-yellow-200 mt-1">
                  {t('emailSecurityNotice')}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveEmailSettings}
            disabled={isSavingEmail || isLoading}
            className="btn-primary w-full flex items-center justify-center space-x-2"
          >
            {isSavingEmail ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <FiSave />
                <span>{t('saveEmailSettings')}</span>
              </>
            )}
          </button>
        </div>
      </Card>

      {/* Boost Pricing Settings */}
      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <FiTrendingUp className="text-[#D91CD2]" size={24} />
          <h2 className="text-2xl font-bold">{t('courseBoostPricing')}</h2>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                {t('basicBoostPrice')} ($)
              </label>
              <input
                type="number"
                value={boostPricing.basic}
                onChange={(e) => setBoostPricing(prev => ({ ...prev, basic: Number(e.target.value) }))}
                className="input-primary w-full"
                min="1"
                step="1"
              />
              <p className="text-xs text-gray-400 mt-1">{t('boostDuration3Days')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                {t('premiumBoostPrice')} ($)
              </label>
              <input
                type="number"
                value={boostPricing.premium}
                onChange={(e) => setBoostPricing(prev => ({ ...prev, premium: Number(e.target.value) }))}
                className="input-primary w-full"
                min="1"
                step="1"
              />
              <p className="text-xs text-gray-400 mt-1">{t('boostDuration7Days')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                {t('featuredBoostPrice')} ($)
              </label>
              <input
                type="number"
                value={boostPricing.featured}
                onChange={(e) => setBoostPricing(prev => ({ ...prev, featured: Number(e.target.value) }))}
                className="input-primary w-full"
                min="1"
                step="1"
              />
              <p className="text-xs text-gray-400 mt-1">{t('boostDuration14Days')}</p>
            </div>
          </div>

          <button
            onClick={handleSaveBoostPricing}
            disabled={isSavingBoost || isLoading}
            className="btn-primary w-full flex items-center justify-center space-x-2"
          >
            {isSavingBoost ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <FiSave />
                <span>{t('saveBoostPricing')}</span>
              </>
            )}
          </button>
        </div>
      </Card>

      {/* Background Image Settings */}
      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <FiImage className="text-[#D91CD2]" size={24} />
          <h2 className="text-2xl font-bold">{t('homepageBackground')}</h2>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              {t('backgroundImageUrl')}
            </label>
            <input
              type="url"
              value={backgroundSettings.backgroundImageUrl}
              onChange={(e) => setBackgroundSettings(prev => ({ ...prev, backgroundImageUrl: e.target.value }))}
              className="input-primary w-full"
              placeholder="https://example.com/background-image.jpg"
            />
            <p className="text-xs text-gray-400 mt-1">
              {t('backgroundImageInfo')}
            </p>
          </div>

          {backgroundSettings.backgroundImageUrl && (
            <div className="relative">
              <img 
                src={backgroundSettings.backgroundImageUrl} 
                alt="Background preview" 
                className="w-full h-40 object-cover rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <p className="text-xs text-gray-400 mt-2">{t('previewOfBackgroundImage')}</p>
            </div>
          )}

          <button
            onClick={handleSaveBackgroundSettings}
            disabled={isSavingBackground || isLoading}
            className="btn-primary w-full flex items-center justify-center space-x-2"
          >
            {isSavingBackground ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <FiSave />
                <span>{t('saveBackgroundSettings')}</span>
              </>
            )}
          </button>
        </div>
      </Card>

      {/* Social Media Settings */}
      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <FiImage className="text-[#D91CD2]" size={24} />
          <h2 className="text-2xl font-bold">{t('socialMediaLinks')}</h2>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              {t('facebookUrl')}
            </label>
            <input
              type="url"
              value={socialMediaSettings.facebook}
              onChange={(e) => setSocialMediaSettings(prev => ({ ...prev, facebook: e.target.value }))}
              className="input-primary w-full"
              placeholder="https://facebook.com/yourprofile"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              {t('instagramUrl')}
            </label>
            <input
              type="url"
              value={socialMediaSettings.instagram}
              onChange={(e) => setSocialMediaSettings(prev => ({ ...prev, instagram: e.target.value }))}
              className="input-primary w-full"
              placeholder="https://instagram.com/yourprofile"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              {t('tiktokUrl')}
            </label>
            <input
              type="url"
              value={socialMediaSettings.tiktok}
              onChange={(e) => setSocialMediaSettings(prev => ({ ...prev, tiktok: e.target.value }))}
              className="input-primary w-full"
              placeholder="https://tiktok.com/@yourprofile"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              {t('youtubeUrl')}
            </label>
            <input
              type="url"
              value={socialMediaSettings.youtube}
              onChange={(e) => setSocialMediaSettings(prev => ({ ...prev, youtube: e.target.value }))}
              className="input-primary w-full"
              placeholder="https://youtube.com/c/yourchannel"
            />
          </div>

          <button
            onClick={handleSaveSocialMediaSettings}
            className="btn-primary w-full flex items-center justify-center space-x-2"
          >
            <FiSave />
            <span>{t('saveSocialMediaSettings')}</span>
          </button>
        </div>
      </Card>

      {/* Home Page Video Settings */}
      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <FiImage className="text-[#D91CD2]" size={24} />
          <h2 className="text-2xl font-bold">{t('homePageVideo')}</h2>
        </div>

        <div className="space-y-6">
          {/* File Upload for Video */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              {t('uploadVideoFile')}
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center">
                <FiImage className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label htmlFor="video-upload" className={`cursor-pointer ${isUploading ? 'pointer-events-none opacity-50' : ''}`}>
                    <span className="mt-2 block text-sm font-medium text-white">
                      {isUploading ? t('uploading') + '...' : t('chooseVideoFile')}
                    </span>
                    <input
                      id="video-upload"
                      name="video-upload"
                      type="file"
                      accept="video/mp4,video/webm,video/ogg,video/mov,video/avi"
                      className="sr-only"
                      disabled={isUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Use unsigned upload method for simplicity
                          handleVideoUploadUnsigned(file);
                        }
                      }}
                    />
                  </label>
                  <p className="mt-1 text-xs text-gray-400">
                    {t('supportedVideoFormats')} (Max: 100MB)
                  </p>
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            {isUploading && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                  <span>{t('uploading')}...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-[#D91CD2] h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {videoSettings.heroVideoUrl && !isUploading && (
              <div className="mt-4">
                <p className="text-sm text-green-400 mb-2">{t('currentUploadedVideo')}</p>
                <video 
                  src={videoSettings.heroVideoUrl} 
                  className="w-full h-40 object-cover rounded-lg"
                  controls
                />
              </div>
            )}
          </div>

          {/* Video Link (Alternative) */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              {t('heroVideoLink')} ({t('alternative')})
            </label>
            <input
              type="url"
              value={homePageVideoSettings.heroVideoLink}
              onChange={(e) => setHomePageVideoSettings(prev => ({ ...prev, heroVideoLink: e.target.value }))}
              className="input-primary w-full"
              placeholder="https://videos.pexels.com/video-files/33028280/14078407_1920_1080_60fps.mp4"
            />
            <p className="text-xs text-gray-400 mt-1">
              {t('heroVideoLinkInfo')}
            </p>
          </div>

                    <div>
            <label className="block text-sm font-medium text-white mb-2">
              {t('heroTitle')}
            </label>
            <input
              type="text"
              value={homePageVideoSettings.heroTitle}
              onChange={(e) => setHomePageVideoSettings(prev => ({ ...prev, heroTitle: e.target.value }))}
              className="input-primary w-full"
              placeholder={t('enterHeroTitle')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              {t('heroSubtitle')}
            </label>
            <input
              type="text"
              value={homePageVideoSettings.heroSubtitle}
              onChange={(e) => setHomePageVideoSettings(prev => ({ ...prev, heroSubtitle: e.target.value }))}
              className="input-primary w-full"
              placeholder={t('enterHeroSubtitle')}
            />
          </div>

          <button
            onClick={handleSaveHomePageVideoSettings}
            className="btn-primary w-full flex items-center justify-center space-x-2"
          >
            <FiSave />
            <span>{t('saveHomePageVideoSettings')}</span>
          </button>
        </div>
      </Card>

      {/* Email Test Panel */}
      <EmailTestPanel />
    </div>
  );
}
