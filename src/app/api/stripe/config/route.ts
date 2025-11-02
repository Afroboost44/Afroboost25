import { NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET() {
  try {
    const settingsDoc = await getDoc(doc(db, 'admin_settings', 'stripe'));
    
    if (!settingsDoc.exists() || !settingsDoc.data()?.isConfigured) {
      return NextResponse.json(
        { error: 'Stripe not configured', isConfigured: false },
        { status: 404 }
      );
    }

    const settings = settingsDoc.data();
    
    // Only return the publishable key - never the secret key
    return NextResponse.json({
      publishableKey: settings.publishableKey,
      isConfigured: true
    });

  } catch (error) {
    console.error('Error fetching Stripe config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configuration', isConfigured: false },
      { status: 500 }
    );
  }
}
