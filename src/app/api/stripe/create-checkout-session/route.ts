import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { doc, getDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface CheckoutRequest {
  amount: number;
  currency: string;
  description: string;
  userId: string;
  paymentMethod?: 'twint' | 'card' | 'both';
  purchaseContext?: {
    type: 'course' | 'product' | 'token';
    courseId?: string;
    productId?: string;
    tokenPackageId?: string;
    businessId?: string;
    coachId?: string;
    referralCode?: string;
    boostType?: string;
    checkoutData?: string; // Will be stored in DB, not passed to Stripe
  };
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
    const body: CheckoutRequest = await request.json();
    const { amount, currency = 'CHF', description, userId, paymentMethod = 'both', purchaseContext } = body;

    // Store checkout data in database if it's large (for shopping cart)
    let checkoutDataId = '';
    if (purchaseContext?.checkoutData) {
      const checkoutDoc = await addDoc(collection(db, 'checkout_sessions'), {
        data: purchaseContext.checkoutData,
        userId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      });
      checkoutDataId = checkoutDoc.id;
    }

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

    // Determine payment method types based on request
    let payment_method_types: Stripe.Checkout.SessionCreateParams.PaymentMethodType[];
    switch (paymentMethod) {
      case 'twint':
        payment_method_types = ['twint'];
        break;
      case 'card':
        payment_method_types = ['card'];
        break;
      case 'both':
      default:
        payment_method_types = ['card', 'twint'];
        break;
    }

    // Get the base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types,
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: { 
              name: description || 'Payment',
              description: `Payment for user ${userId}`
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        source: 'dance-platform',
        paymentMethod: paymentMethod,
        // Purchase context
        ...(purchaseContext && {
          purchaseType: purchaseContext.type,
          courseId: purchaseContext.courseId || '',
          productId: purchaseContext.productId || '',
          tokenPackageId: purchaseContext.tokenPackageId || '',
          businessId: purchaseContext.businessId || '',
          coachId: purchaseContext.coachId || '',
          referralCode: purchaseContext.referralCode || '',
          boostType: purchaseContext.boostType || '',
          checkoutDataId: checkoutDataId
        })
      },
      success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/payment/cancel`,
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes from now
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('Checkout session creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}