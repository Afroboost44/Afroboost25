import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/lib/database';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    
    if (!code) {
      return NextResponse.json(
        { valid: false, error: 'Referral code is required' },
        { status: 400 }
      );
    }

    // Find user by referral code
    const user = await userService.getByReferralCode(code);
    
    if (!user) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid referral code'
      });
    }

    return NextResponse.json({
      valid: true,
      user: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Error validating referral code:', error);
    return NextResponse.json(
      { valid: false, error: 'Server error' },
      { status: 500 }
    );
  }
}