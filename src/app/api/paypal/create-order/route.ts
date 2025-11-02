import { NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Decrypt utility for PayPal clientSecret
function decryptKey(encrypted: string): string {
  // Simple decryption - reverse of btoa (base64)
  return atob(encrypted);
}

// Fetch PayPal access token
async function getPayPalAccessToken(clientId: string, clientSecret: string, isProduction: boolean) {
  const baseUrl = isProduction ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com';
  const base64Auth = Buffer.from(`${clientId.trim()}:${clientSecret.trim()}`).toString('base64');

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${base64Auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal token error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Create PayPal order
async function createPayPalOrder(amount: number, description: string, clientId: string, clientSecret: string, isProduction: boolean, currency: string = 'CHF') {
  const accessToken = await getPayPalAccessToken(clientId, clientSecret, true);

  const baseUrl = isProduction ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com';

  const orderData = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        amount: {
          currency_code: currency,
          value: amount.toFixed(2),
        },
        description,
      },
    ],
    application_context: {
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payment/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payment/cancel`,
      shipping_preference: 'NO_SHIPPING',
      user_action: 'PAY_NOW',
      brand_name: 'AfroBoost Dance Platform',
    },
  };

  const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      'PayPal-Request-Id': `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    },
    body: JSON.stringify(orderData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal order creation failed ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data;
}

// API handler
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, description, currency = 'CHF' } = body;

    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Fetch PayPal settings from Firestore
    const settingsDoc = await getDoc(doc(db, 'admin_settings', 'paypal'));
    if (!settingsDoc.exists() || !settingsDoc.data().isConfigured) {
      return NextResponse.json({ error: 'PayPal is not configured' }, { status: 400 });
    }
    
    const paypalSettings = settingsDoc.data();
    const clientId = paypalSettings.clientId;
    const clientSecret = decryptKey(paypalSettings.clientSecret);
    const isProduction = true;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'PayPal credentials are not properly configured' }, { status: 400 });
    }

    const order = await createPayPalOrder(
      parseFloat(amount),
      description || 'Payment for services',
      clientId,
      clientSecret,
      isProduction,
      currency.toUpperCase()
    );

    return NextResponse.json({
      id: order.id,
      status: order.status,
      links: order.links,
      ...order,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'Unexpected error',
    }, { status: 500 });
  }
}
