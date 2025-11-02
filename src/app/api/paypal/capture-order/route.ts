import { NextResponse } from 'next/server';
import { doc, getDoc, addDoc, collection, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Decrypt utility for PayPal clientSecret (same as in create-order)
function decryptKey(encrypted: string): string {
  // Simple decryption - reverse of btoa (base64)
  return atob(encrypted);
}

// Function to get PayPal access token
async function getPayPalAccessToken(clientId: string, clientSecret: string, isProduction: boolean = true) {
  const baseUrl = isProduction ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com';
  
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Accept-Language': 'en_US',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`Failed to get PayPal access token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Function to capture PayPal order using REST API
async function capturePayPalOrder(orderId: string, clientId: string, clientSecret: string, isProduction: boolean = true) {
  try {
    // Get access token
    const accessToken = await getPayPalAccessToken(clientId, clientSecret, true);
    
    const baseUrl = isProduction ? 'https://api.paypal.com' : 'https://api.sandbox.paypal.com';
    
    // Capture the order
    const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'PayPal-Request-Id': Date.now().toString(), // Unique request ID
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('PayPal capture error:', errorData);
      throw new Error(`PayPal capture error: ${response.statusText}`);
    }

    const captureResult = await response.json();
    return captureResult;
    
  } catch (error) {
    console.error('Error capturing PayPal order:', error);
    throw new Error('Failed to capture PayPal payment');
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderId, userId } = body;
    
    if (!orderId || !userId) {
      return NextResponse.json({ 
        error: 'Order ID and user ID are required' 
      }, { status: 400 });
    }
    
    // Get PayPal settings from Firestore
    const settingsDoc = await getDoc(doc(db, 'admin_settings', 'paypal'));
    
    if (!settingsDoc.exists() || !settingsDoc.data().isConfigured) {
      return NextResponse.json({ 
        error: 'PayPal is not configured' 
      }, { status: 400 });
    }
    
    const paypalSettings = settingsDoc.data();
    const clientId = paypalSettings.clientId;
    const clientSecret = decryptKey(paypalSettings.clientSecret);
    const isProduction = !!paypalSettings.isProduction;
    
    if (!clientId || !clientSecret) {
      return NextResponse.json({ 
        error: 'PayPal credentials are not properly configured' 
      }, { status: 400 });
    }
    
    // Capture PayPal payment using actual API
    const captureResult = await capturePayPalOrder(orderId, clientId, clientSecret, true);
    
    // Validate capture was successful
    if (captureResult.status !== 'COMPLETED') {
      return NextResponse.json({ 
        error: `Payment capture failed with status: ${captureResult.status}` 
      }, { status: 400 });
    }
    
    // Extract payment information
    const capture = captureResult.purchase_units[0].payments.captures[0];
    const amount = parseFloat(capture.amount.value);
    const captureId = capture.id;
    const payerEmail = captureResult.payer?.email_address || 'N/A';
    
    // Record the transaction in Firestore
    const transactionRef = await addDoc(collection(db, 'transactions'), {
      userId,
      type: 'course_purchase',
      paymentMethod: 'paypal',
      paymentId: orderId,
      captureId: captureId,
      amount: amount,
      currency: capture.amount.currency_code,
      status: 'completed',
      payerEmail: payerEmail,
      description: 'PayPal payment',
      paypalResponse: captureResult, // Store full response for debugging
      createdAt: new Date()
    });
    
    // Update the user's record if needed (e.g., add credits, mark course as purchased, etc.)
    // This would depend on your application's business logic
    // Example:
    // const userRef = doc(db, 'users', userId);
    // await updateDoc(userRef, {
    //   credits: increment(amount),
    //   lastPurchaseDate: new Date()
    // });
    
    return NextResponse.json({
      success: true,
      transactionId: transactionRef.id,
      paymentId: orderId,
      captureId: captureId,
      status: captureResult.status,
      amount: amount,
      currency: capture.amount.currency_code
    });
    
  } catch (error: any) {
    console.error('Error in capture-order API:', error);
    
    // Log detailed error information
    if (error.message.includes('PayPal')) {
      console.error('PayPal API error details:', error);
    }
    
    return NextResponse.json({ 
      error: error.message || 'Failed to capture payment' 
    }, { status: 500 });
  }
}