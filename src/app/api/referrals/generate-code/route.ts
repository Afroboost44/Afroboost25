import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { userService } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user information
    const user = await userService.getById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate unique referral code
    const referralCode = await generateUniqueReferralCode(user.firstName, user.lastName);

    // Create referral record
    const referralData = {
      referralCode,
      sponsorId: userId,
      sponsorName: `${user.firstName} ${user.lastName}`,
      sponsorEmail: user.email,
      status: 'active',
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await addDoc(collection(db, 'referrals'), referralData);

    return NextResponse.json({
      success: true,
      referralCode,
      referralId: docRef.id,
      message: 'Referral code generated successfully'
    });

  } catch (error) {
    console.error('Error generating referral code:', error);
    return NextResponse.json(
      { error: 'Failed to generate referral code' },
      { status: 500 }
    );
  }
}

async function generateUniqueReferralCode(firstName: string, lastName: string): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    // Create a code based on user's name
    const cleanFirstName = firstName.replace(/[^a-zA-Z]/g, '').toUpperCase().substring(0, 3);
    const cleanLastName = lastName.replace(/[^a-zA-Z]/g, '').toUpperCase().substring(0, 3);
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    const code = `${cleanFirstName}${cleanLastName}${randomSuffix}`;

    // Check if code already exists
    const existingQuery = query(
      collection(db, 'referrals'),
      where('referralCode', '==', code)
    );
    const existingSnapshot = await getDocs(existingQuery);

    if (existingSnapshot.empty) {
      return code;
    }

    attempts++;
  }

  // Fallback to timestamp-based code if all attempts fail
  const timestamp = Date.now().toString().slice(-6);
  return `REF${timestamp}`;
}