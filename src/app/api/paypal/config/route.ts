import { NextResponse } from 'next/server';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Initialize PayPal settings if they don't exist
async function ensurePayPalSettings() {
  try {
    const settingsDoc = await getDoc(doc(db, 'admin_settings', 'paypal'));
    
    if (!settingsDoc.exists()) {
      // Create default settings
      await setDoc(doc(db, 'admin_settings', 'paypal'), {
        clientId: '',
        clientSecret: '',
        isConfigured: false,
        isEnabled: false,
        createdAt: new Date()
      });
      
      console.log('Created default PayPal settings');
      return false;
    }
    
    return settingsDoc.data().isConfigured || false;
  } catch (error) {
    console.error('Error ensuring PayPal settings:', error);
    return false;
  }
}

export async function GET() {
  try {
    // Ensure PayPal settings exist
    const isConfigured = await ensurePayPalSettings();
    
    // Get PayPal settings from Firestore
    const settingsDoc = await getDoc(doc(db, 'admin_settings', 'paypal'));
    
    if (!settingsDoc.exists()) {
      return NextResponse.json({ 
        isConfigured: false,
        message: 'PayPal is not configured',
        error: 'Settings document not found'
      });
    }
    
    const data = settingsDoc.data();
    
    if (!data.clientId) {
      return NextResponse.json({
        isConfigured: false,
        message: 'PayPal client ID is missing',
        error: 'Missing client ID'
      });
    }
    
    // Only return the client ID to the frontend, never the secret
    return NextResponse.json({
      isConfigured: data.isConfigured || false,
      isEnabled: data.isEnabled || false,
      clientId: data.clientId || null
    });
  } catch (error: any) {
    console.error('Error fetching PayPal config:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to load PayPal configuration',
      isConfigured: false
    }, { status: 500 });
  }
} 