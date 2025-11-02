import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Mock user database - replace with your actual database
const users = new Map();

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    try {
      // Verify the token
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Check if token is for password reset
      if (decoded.type !== 'password_reset') {
        return NextResponse.json(
          { error: 'Invalid token type' },
          { status: 400 }
        );
      }

      // Check if token has expired
      if (decoded.exp && Date.now() >= decoded.exp * 1000) {
        return NextResponse.json(
          { error: 'Reset token has expired' },
          { status: 400 }
        );
      }

      const email = decoded.email;
      
      // Hash the new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Update user password in database
      // Replace this with your actual database update logic
      const user = users.get(email);
      if (user) {
        users.set(email, { ...user, password: hashedPassword });
      } else {
        // For demo purposes, create a new user if not exists
        users.set(email, { email, password: hashedPassword });
      }

      return NextResponse.json(
        { 
          success: true, 
          message: 'Password has been reset successfully. You can now login with your new password.' 
        },
        { status: 200 }
      );

    } catch (jwtError) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
