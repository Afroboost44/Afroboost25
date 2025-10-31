import { NextRequest, NextResponse } from 'next/server';
import { query, where, getDocs, collection, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { userService } from '@/lib/database';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user details
    const user = await userService.getById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user's referral statistics
    const referralsQuery = query(
      collection(db, 'users'),
      where('referredBy', '==', user.referralCode)
    );
    
    const referralsSnapshot = await getDocs(referralsQuery);
    const directReferrals = referralsSnapshot.docs.map(doc => ({
      id: doc.id,
      firstName: doc.data().firstName,
      lastName: doc.data().lastName,
      email: doc.data().email,
      createdAt: doc.data().createdAt?.toDate() || new Date()
    }));

    // Get pending referrals from referrals collection (for admin approval)
    const pendingReferralsQuery = query(
      collection(db, 'referrals'),
      where('sponsorId', '==', userId),
      where('status', '==', 'pending')
    );
    
    const pendingSnapshot = await getDocs(pendingReferralsQuery);
    const pendingReferrals = pendingSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    }));

    // Get approved referrals
    const approvedReferralsQuery = query(
      collection(db, 'referrals'),
      where('sponsorId', '==', userId),
      where('status', '==', 'approved')
    );
    
    const approvedSnapshot = await getDocs(approvedReferralsQuery);
    const approvedReferrals = approvedSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      approvedAt: doc.data().approvedAt?.toDate() || null
    }));

    // Calculate statistics
    const rewardAmount = 10; // Default reward per referral
    const totalEarnings = approvedReferrals.length * rewardAmount;
    const pendingEarnings = pendingReferrals.length * rewardAmount;

    // Get recent referral activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentReferrals = directReferrals.filter(referral => 
      referral.createdAt >= thirtyDaysAgo
    );

    // Generate referral link
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const referralLink = `${baseUrl}/signup?ref=${user.referralCode}`;

    return NextResponse.json({
      success: true,
      userReferralData: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          referralCode: user.referralCode
        },
        referralLink,
        statistics: {
          totalReferrals: directReferrals.length,
          pendingReferrals: pendingReferrals.length,
          approvedReferrals: approvedReferrals.length,
          recentReferrals: recentReferrals.length,
          totalEarnings,
          pendingEarnings,
          rewardPerReferral: rewardAmount
        },
        referrals: {
          direct: directReferrals.slice(0, 10), // Latest 10
          pending: pendingReferrals,
          approved: approvedReferrals.slice(0, 10), // Latest 10
          recent: recentReferrals
        }
      }
    });

  } catch (error) {
    console.error('Error fetching user referral data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user referral data' },
      { status: 500 }
    );
  }
}

// POST endpoint to create a referral record (when someone signs up with a referral code)
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params;
    const body = await request.json();
    const { newUserId, newUserEmail, newUserName, referralCode } = body;

    if (!newUserId || !newUserEmail || !referralCode) {
      return NextResponse.json(
        { error: 'Missing required fields: newUserId, newUserEmail, referralCode' },
        { status: 400 }
      );
    }

    // Get sponsor user
    const sponsor = await userService.getById(userId);
    if (!sponsor || sponsor.referralCode !== referralCode) {
      return NextResponse.json(
        { error: 'Invalid sponsor or referral code' },
        { status: 400 }
      );
    }

    // Create referral record for admin approval
    const referralRecord = {
      sponsorId: userId,
      sponsorName: `${sponsor.firstName} ${sponsor.lastName}`,
      sponsorEmail: sponsor.email,
      sponsorReferralCode: referralCode,
      newUserId,
      newUserEmail,
      newUserName,
      status: 'pending',
      rewardAmount: 10,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'referrals'), referralRecord);

    // Send admin notification about new referral
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/notifications/admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'referral_pending',
          data: {
            referrerName: `${sponsor.firstName} ${sponsor.lastName}`,
            newUserName,
            referralCodeUsed: referralCode
          }
        }),
      });
    } catch (notificationError) {
      console.error('Error sending admin notification:', notificationError);
    }

    return NextResponse.json({
      success: true,
      referralId: docRef.id,
      message: 'Referral recorded successfully and pending approval'
    });

  } catch (error) {
    console.error('Error creating referral record:', error);
    return NextResponse.json(
      { error: 'Failed to create referral record' },
      { status: 500 }
    );
  }
}