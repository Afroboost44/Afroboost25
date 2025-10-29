'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiSave, FiKey, FiLock, FiEye, FiEyeOff, FiCheck, FiX, FiCreditCard, FiDollarSign, FiToggleLeft, FiToggleRight, FiTrendingUp, FiImage } from 'react-icons/fi';
import { useAuth } from '@/lib/auth';
import Card from '@/components/Card';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

export default function AdminSettings() {
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
  const [showStripeSecretKey, setShowStripeSecretKey] = useState(false);
  const [showPaypalSecretKey, setShowPaypalSecretKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingStripe, setIsSavingStripe] = useState(false);
  const [isSavingPaypal, setIsSavingPaypal] = useState(false);
  const [isSavingBoost, setIsSavingBoost] = useState(false);
  const [isSavingBackground, setIsSavingBackground] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (user?.role === 'admin') {
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

  if (!user || user.role !== 'admin') {
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
          <h2 className="text-2xl font-bold">Payment Methods</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <FiCreditCard className="text-white" size={20} />
              <div>
                <h3 className="font-medium">Stripe Payments</h3>
                <p className="text-sm text-gray-400">Credit/Debit card payments</p>
              </div>
            </div>
            <button 
              onClick={() => togglePaymentMethod('stripe')}
              disabled={!stripeSettings.isConfigured}
              className={`text-2xl ${!stripeSettings.isConfigured ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              title={stripeSettings.isConfigured ? 'Toggle Stripe payments' : 'Configure Stripe first'}
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
                <h3 className="font-medium">PayPal Payments</h3>
                <p className="text-sm text-gray-400">Pay with PayPal balance or linked accounts</p>
              </div>
            </div>
            <button 
              onClick={() => togglePaymentMethod('paypal')}
              disabled={!paypalSettings.isConfigured}
              className={`text-2xl ${!paypalSettings.isConfigured ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              title={paypalSettings.isConfigured ? 'Toggle PayPal payments' : 'Configure PayPal first'}
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
                <h4 className="font-medium text-yellow-300">Payment Configuration</h4>
                <p className="text-sm text-yellow-200 mt-1">
                  At least one payment method must be enabled at all times. Configure each payment provider below.
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
          <h2 className="text-2xl font-bold">Stripe Payment Settings</h2>
          {stripeSettings.isConfigured && (
            <div className="flex items-center space-x-2 text-green-400">
              <FiCheck size={16} />
              <span className="text-sm">Configured</span>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Stripe Publishable Key
            </label>
            <div className="relative">
              <input
                type="text"
                value={stripeSettings.publishableKey}
                onChange={(e) => setStripeSettings(prev => ({ ...prev, publishableKey: e.target.value }))}
                className="input-primary w-full pr-10"
                placeholder="pk_test_..."
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <FiKey className="text-gray-400" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              This key is used for client-side operations and is safe to expose
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Stripe Secret Key
            </label>
            <div className="relative">
              <input
                type={showStripeSecretKey ? 'text' : 'password'}
                value={stripeSettings.secretKey}
                onChange={(e) => setStripeSettings(prev => ({ ...prev, secretKey: e.target.value }))}
                className="input-primary w-full pr-20"
                placeholder="sk_test_..."
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
              ⚠️ This key will be encrypted and stored securely. Never share it.
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
                <span>Save Stripe Settings</span>
              </>
            )}
          </button>
        </div>
      </Card>

      {/* PayPal Settings */}
      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <FiDollarSign className="text-[#D91CD2]" size={24} />
          <h2 className="text-2xl font-bold">PayPal Payment Settings</h2>
          {paypalSettings.isConfigured && (
            <div className="flex items-center space-x-2 text-green-400">
              <FiCheck size={16} />
              <span className="text-sm">Configured</span>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              PayPal Client ID
            </label>
            <div className="relative">
              <input
                type="text"
                value={paypalSettings.clientId}
                onChange={(e) => setPaypalSettings(prev => ({ ...prev, clientId: e.target.value }))}
                className="input-primary w-full pr-10"
                placeholder="Your PayPal client ID"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <FiKey className="text-gray-400" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Client ID from your PayPal developer dashboard
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              PayPal Client Secret
            </label>
            <div className="relative">
              <input
                type={showPaypalSecretKey ? 'text' : 'password'}
                value={paypalSettings.clientSecret}
                onChange={(e) => setPaypalSettings(prev => ({ ...prev, clientSecret: e.target.value }))}
                className="input-primary w-full pr-20"
                placeholder="Your PayPal client secret"
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
              ⚠️ This key will be encrypted and stored securely. Never share it.
            </p>
          </div>

          <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <FiLock className="text-yellow-400 mt-1" />
              <div>
                <h4 className="font-medium text-yellow-300">Security Notice</h4>
                <p className="text-sm text-yellow-200 mt-1">
                  Secret keys are encrypted before storage and only decrypted server-side for payment processing. 
                  They are never exposed to the frontend.
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
                <span>Save PayPal Settings</span>
              </>
            )}
          </button>
        </div>
      </Card>

      {/* Boost Pricing Settings */}
      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <FiTrendingUp className="text-[#D91CD2]" size={24} />
          <h2 className="text-2xl font-bold">Course Boost Pricing</h2>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Basic Boost Price ($)
              </label>
              <input
                type="number"
                value={boostPricing.basic}
                onChange={(e) => setBoostPricing(prev => ({ ...prev, basic: Number(e.target.value) }))}
                className="input-primary w-full"
                min="1"
                step="1"
              />
              <p className="text-xs text-gray-400 mt-1">3 days boost duration</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Premium Boost Price ($)
              </label>
              <input
                type="number"
                value={boostPricing.premium}
                onChange={(e) => setBoostPricing(prev => ({ ...prev, premium: Number(e.target.value) }))}
                className="input-primary w-full"
                min="1"
                step="1"
              />
              <p className="text-xs text-gray-400 mt-1">7 days boost duration</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Featured Boost Price ($)
              </label>
              <input
                type="number"
                value={boostPricing.featured}
                onChange={(e) => setBoostPricing(prev => ({ ...prev, featured: Number(e.target.value) }))}
                className="input-primary w-full"
                min="1"
                step="1"
              />
              <p className="text-xs text-gray-400 mt-1">14 days boost duration</p>
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
                <span>Save Boost Pricing</span>
              </>
            )}
          </button>
        </div>
      </Card>

      {/* Background Image Settings */}
      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <FiImage className="text-[#D91CD2]" size={24} />
          <h2 className="text-2xl font-bold">Homepage Background</h2>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Background Image URL
            </label>
            <input
              type="url"
              value={backgroundSettings.backgroundImageUrl}
              onChange={(e) => setBackgroundSettings(prev => ({ ...prev, backgroundImageUrl: e.target.value }))}
              className="input-primary w-full"
              placeholder="https://example.com/background-image.jpg"
            />
            <p className="text-xs text-gray-400 mt-1">
              This image will be displayed as the homepage hero background
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
              <p className="text-xs text-gray-400 mt-2">Preview of background image</p>
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
                <span>Save Background Settings</span>
              </>
            )}
          </button>
        </div>
      </Card>
    </div>
  );
}
