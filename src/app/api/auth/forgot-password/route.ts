import { NextResponse } from 'next/server';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json({ 
        error: 'Invalid request format. Please send valid JSON.',
        suggestion: 'Make sure your request contains valid JSON data.'
      }, { status: 400 });
    }

    const { email } = body;

    if (!email) {
      return NextResponse.json({ 
        error: 'Email is required',
        suggestion: 'Please enter your email address to continue.'
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: 'Please enter a valid email address.',
        suggestion: 'Make sure your email follows the format: example@domain.com'
      }, { status: 400 });
    }

    console.log('Sending password reset email to:', email);

    // Check if user exists in Firebase Auth first (optional check)
    try {
      const usersRef = collection(db, 'users');
      
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      console.log('User exists in Firestore:', !querySnapshot.empty);
    } catch (firestoreError) {
      console.log('Firestore check failed, continuing:', firestoreError);
    }

    // Send password reset email
    try {
      await sendPasswordResetEmail(auth, email);
      
      console.log('✅ Password reset email sent successfully');
      
      return NextResponse.json({ 
        success: true, 
        message: 'Password reset email sent! Please check your email and spam folder.',
        emailSent: true,
        instructions: [
          'Check your inbox for the reset email',
          'If not found, check your spam/junk folder',
          'Look for an email from AfroBoost App or noreply@afroboostapp.firebaseapp.com',
          'The reset link expires in 1 hour'
        ]
      }, { status: 200 });
    } catch (error: any) {
      console.error('Firebase Auth Error:', error.code, error.message);
      
      switch (error.code) {
        case 'auth/user-not-found':
          return NextResponse.json({ 
            error: 'No account found with this email address.',
            suggestion: 'Double-check your email address or create a new account.'
          }, { status: 404 });
        
        case 'auth/invalid-email':
          return NextResponse.json({ 
            error: 'Please enter a valid email address.',
            suggestion: 'Make sure your email follows the format: example@domain.com'
          }, { status: 400 });
        
        case 'auth/too-many-requests':
          return NextResponse.json({ 
            error: 'Too many password reset attempts.',
            suggestion: 'Please wait 5 minutes before trying again to avoid rate limiting.'
          }, { status: 429 });
        
        case 'auth/network-request-failed':
          return NextResponse.json({ 
            error: 'Network error occurred.',
            suggestion: 'Please check your internet connection and try again.'
          }, { status: 503 });
        
        case 'auth/internal-error':
          return NextResponse.json({ 
            error: 'Internal server error occurred.',
            suggestion: 'Please try again in a few moments or contact support if the problem persists.'
          }, { status: 500 });
        
        default:
          return NextResponse.json({ 
            error: 'Unable to send password reset email.',
            suggestion: 'Please try again or contact support if the problem continues.'
          }, { status: 500 });
      }
    }
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error. Please try again.',
      suggestion: 'If the problem persists, please contact support.'
    }, { status: 500 });
  }
}