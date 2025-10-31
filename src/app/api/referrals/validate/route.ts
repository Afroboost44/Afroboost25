import { NextRequest, NextResponse } from 'next/server';
import { query, where, getDocs, getDoc, doc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { userService } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { referralCode } = body;

    // Validate required fields
    if (!referralCode) {
      return NextResponse.json(
        { 
          valid: false,
          error: 'Referral code is required' 
        },
        { status: 400 }
      );
    }

    // Find user with this referral code
    const userQuery = query(
      collection(db, 'users'),
      where('referralCode', '==', referralCode.trim())
    );
    
    const querySnapshot = await getDocs(userQuery);
    
    if (querySnapshot.empty) {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Invalid referral code' 
        },
        { status: 200 }
      );
    }

    const sponsorDoc = querySnapshot.docs[0];
    const sponsor = {
      id: sponsorDoc.id,
      ...sponsorDoc.data()
    } as any;

    // Check if sponsor is active
    if (!sponsor.firstName || !sponsor.lastName) {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Invalid referral code' 
        },
        { status: 200 }
      );
    }

    // Get current reward amounts from admin settings
    let sponsorRewardAmount = 50; // Default values
    let refereeRewardAmount = 25;
    
    try {
      const settingsDoc = await getDoc(doc(db, 'admin_settings', 'referral_rewards'));
      if (settingsDoc.exists()) {
        const settings = settingsDoc.data();
        if (settings.isEnabled && settings.sponsorReward && settings.referredUserReward) {
          sponsorRewardAmount = settings.sponsorReward.amount || 50;
          refereeRewardAmount = settings.referredUserReward.amount || 25;
        }
      }
    } catch (settingsError) {
      console.error('Error fetching referral settings:', settingsError);
    }

    const sponsorName = `${sponsor.firstName} ${sponsor.lastName}`;

    return NextResponse.json({
      valid: true,
      sponsorId: sponsor.id,
      sponsorName,
      rewardAmount: sponsorRewardAmount, // For backward compatibility
      sponsorRewardAmount,
      refereeRewardAmount,
      message: `Valid referral code from ${sponsorName}`
    });

  } catch (error) {
    console.error('Error validating referral code:', error);
    return NextResponse.json(
      { 
        valid: false,
        error: 'Error validating referral code' 
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check referral statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const referralCode = searchParams.get('referralCode');

    if (!referralCode) {
      return NextResponse.json(
        { error: 'Referral code is required' },
        { status: 400 }
      );
    }

    // Find sponsor user
    const userQuery = query(
      collection(db, 'users'),
      where('referralCode', '==', referralCode)
    );
    
    const userSnapshot = await getDocs(userQuery);
    
    if (userSnapshot.empty) {
      return NextResponse.json(
        { error: 'Referral code not found' },
        { status: 404 }
      );
    }

    const sponsor = userSnapshot.docs[0].data();

    // Get referral statistics
    const referralsQuery = query(
      collection(db, 'users'),
      where('referredBy', '==', referralCode)
    );
    
    const referralsSnapshot = await getDocs(referralsQuery);
    const totalReferrals = referralsSnapshot.size;

    // Get pending referrals (if you have a referrals collection for approval workflow)
    const pendingReferralsQuery = query(
      collection(db, 'referrals'),
      where('sponsorReferralCode', '==', referralCode),
      where('status', '==', 'pending')
    );
    
    const pendingSnapshot = await getDocs(pendingReferralsQuery);
    const pendingReferrals = pendingSnapshot.size;

    // Get approved referrals
    const approvedReferralsQuery = query(
      collection(db, 'referrals'),
      where('sponsorReferralCode', '==', referralCode),
      where('status', '==', 'approved')
    );
    
    const approvedSnapshot = await getDocs(approvedReferralsQuery);
    const approvedReferrals = approvedSnapshot.size;

    const rewardAmount = 10; // Default reward amount
    const totalEarnings = approvedReferrals * rewardAmount;

    return NextResponse.json({
      success: true,
      statistics: {
        totalReferrals,
        pendingReferrals,
        approvedReferrals,
        totalEarnings,
        rewardPerReferral: rewardAmount,
        sponsorName: `${sponsor.firstName} ${sponsor.lastName}`
      }
    });

  } catch (error) {
    console.error('Error fetching referral statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch referral statistics' },
      { status: 500 }
    );
  }
}