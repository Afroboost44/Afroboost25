import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface PaymentRequest {
  amount: number;
  currency: string;
  description: string;
  userId: string;
}

const decryptKey = (encryptedKey: string): string => {
  try {
    return atob(encryptedKey);
  } catch (error) {
    throw new Error('Invalid encrypted key');
  }
};

export async function POST(request: NextRequest) {
  try {
    const body: PaymentRequest = await request.json();
    const { amount, currency = 'CHF', description, userId } = body;

    if (!amount || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get Stripe settings from Firestore
    const settingsDoc = await getDoc(doc(db, 'admin_settings', 'stripe'));
    
    if (!settingsDoc.exists() || !settingsDoc.data()?.isConfigured) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 500 }
      );
    }

    const settings = settingsDoc.data();
    const secretKey = decryptKey(settings.secretKey);

    if (!secretKey.startsWith('sk_')) {
      return NextResponse.json(
        { error: 'Invalid Stripe configuration' },
        { status: 500 }
      );
    }

    // Initialize Stripe with the secret key
    const stripe = new Stripe(secretKey, {
      apiVersion: '2025-06-30.basil',
    });

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      description,
      metadata: {
        userId,
        source: 'dance-platform'
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (error) {
    console.error('Payment intent creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
