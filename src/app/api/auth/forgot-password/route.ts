import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

// Mock user database - replace with your actual database
const users = new Map([
  ['test@example.com', { email: 'test@example.com', password: 'hashedpassword' }],
  ['user@demo.com', { email: 'user@demo.com', password: 'hashedpassword' }],
]);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Check if user exists
    const userExists = users.has(email);
    
    // For security, always return success even if user doesn't exist
    // This prevents email enumeration attacks
    
    if (userExists) {
      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
      
      // Create reset token that expires in 1 hour
      const resetToken = jwt.sign(
        { 
          email,
          type: 'password_reset',
          timestamp: Date.now()
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // In a real application, you would send an email here
      // For demo purposes, we'll just log the reset link
      const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      
      console.log('Password reset link:', resetUrl);
      
      // Here you would typically send an email using a service like:
      // - SendGrid
      // - AWS SES
      // - Nodemailer
      // - Resend
      
      return NextResponse.json(
        { 
          success: true,
          emailSent: true,
          message: 'If an account with that email exists, we\'ve sent a password reset link.',
          instructions: [
            'Check your inbox for the reset email',
            'Click the reset link in the email',
            'Follow the instructions to set a new password',
            'The link will expire in 1 hour for security'
          ]
        },
        { status: 200 }
      );
    } else {
      // Still return success for security
      return NextResponse.json(
        { 
          success: true,
          emailSent: true,
          message: 'If an account with that email exists, we\'ve sent a password reset link.',
          instructions: [
            'Check your inbox for the reset email',
            'Make sure to check your spam/junk folder',
            'If you don\'t receive an email, the account may not exist',
            'Try creating a new account if needed'
          ]
        },
        { status: 200 }
      );
    }

  } catch (error) {
    console.error('Error in forgot password:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    );
  }
}