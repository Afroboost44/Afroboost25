import { NextResponse } from 'next/server';
import { userService } from '@/lib/database';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const { email: rawEmail } = await params;
    const email = decodeURIComponent(rawEmail);
    
    // Check if user exists
    const user = await userService.getByEmail(email);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Redirect to profile analytics page
    return NextResponse.redirect(new URL(`/profile_analytics/${encodeURIComponent(email)}`, request.url));
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}