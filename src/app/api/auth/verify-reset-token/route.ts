import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Reset token is required' },
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

      return NextResponse.json(
        { success: true, message: 'Token is valid' },
        { status: 200 }
      );

    } catch (jwtError) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error verifying reset token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
