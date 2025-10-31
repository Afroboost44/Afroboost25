import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { userService, creditTransactionService } from '@/lib/database';

interface Referral {
  id: string;
  referralCode: string;
  sponsorId: string;
  sponsorName: string;
  sponsorEmail: string;
  referredUserId?: string;
  referredUserName?: string;
  referredUserEmail?: string;
  status: 'pending' | 'approved' | 'rewarded' | 'rejected';
  rewardAmount?: number;
  rewardCurrency?: string;
  signupDate?: any;
  approvalDate?: any;
  rewardDate?: any;
  rejectionDate?: any;
  rejectionReason?: string;
  adminNotes?: string;
  createdAt: any;
  updatedAt: any;
}

interface ProcessRewardRequest {
  referralId: string;
  sponsorReward?: {
    amount: number;
    currency: string;
    type: 'credits' | 'cash';
  };
  referredUserReward?: {
    amount: number;
    currency: string;
    type: 'credits' | 'cash';
  };
  adminId: string;
  adminName: string;
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ProcessRewardRequest = await request.json();
    const {
      referralId,
      sponsorReward,
      referredUserReward,
      adminId,
      adminName,
      notes
    } = body;

    if (!referralId || !adminId || !adminName) {
      return NextResponse.json(
        { error: 'Referral ID, admin ID, and admin name are required' },
        { status: 400 }
      );
    }

    // Get referral data
    const referralDoc = await getDoc(doc(db, 'referrals', referralId));
    if (!referralDoc.exists()) {
      return NextResponse.json(
        { error: 'Referral not found' },
        { status: 404 }
      );
    }

    const referralData = { id: referralDoc.id, ...referralDoc.data() } as Referral;

    // Check if referral is in correct status
    if (referralData.status !== 'approved') {
      return NextResponse.json(
        { error: 'Referral must be approved before processing rewards' },
        { status: 400 }
      );
    }

    const results = {
      sponsorReward: null as any,
      referredUserReward: null as any,
      errors: [] as string[]
    };

    // Process sponsor reward
    if (sponsorReward && sponsorReward.type === 'credits') {
      try {
        const sponsor = await userService.getById(referralData.sponsorId);
        if (sponsor) {
          await creditTransactionService.creditUser(
            referralData.sponsorId,
            sponsorReward.amount,
            `Referral reward for referring ${referralData.referredUserName || 'user'}`,
            adminId,
            adminName
          );
          
          results.sponsorReward = {
            success: true,
            amount: sponsorReward.amount,
            type: 'credits'
          };
        } else {
          results.errors.push('Sponsor user not found');
        }
      } catch (error) {
        console.error('Error processing sponsor reward:', error);
        results.errors.push('Failed to process sponsor reward');
      }
    }

    // Process referred user reward
    if (referredUserReward && referredUserReward.type === 'credits' && referralData.referredUserId) {
      try {
        const referredUser = await userService.getById(referralData.referredUserId);
        if (referredUser) {
          await creditTransactionService.creditUser(
            referralData.referredUserId,
            referredUserReward.amount,
            `Welcome bonus for joining via referral`,
            adminId,
            adminName
          );
          
          results.referredUserReward = {
            success: true,
            amount: referredUserReward.amount,
            type: 'credits'
          };
        } else {
          results.errors.push('Referred user not found');
        }
      } catch (error) {
        console.error('Error processing referred user reward:', error);
        results.errors.push('Failed to process referred user reward');
      }
    }

    // Update referral status
    const updateData: any = {
      status: 'rewarded',
      rewardDate: new Date(),
      updatedAt: new Date()
    };

    if (sponsorReward) {
      updateData.sponsorRewardAmount = sponsorReward.amount;
      updateData.sponsorRewardCurrency = sponsorReward.currency;
      updateData.sponsorRewardType = sponsorReward.type;
    }

    if (referredUserReward) {
      updateData.referredUserRewardAmount = referredUserReward.amount;
      updateData.referredUserRewardCurrency = referredUserReward.currency;
      updateData.referredUserRewardType = referredUserReward.type;
    }

    if (notes) {
      updateData.adminNotes = notes;
    }

    await updateDoc(doc(db, 'referrals', referralId), updateData);

    // Create reward processing log
    await addDoc(collection(db, 'referral_reward_logs'), {
      referralId,
      adminId,
      adminName,
      sponsorReward: results.sponsorReward,
      referredUserReward: results.referredUserReward,
      errors: results.errors,
      notes,
      processedAt: new Date()
    });

    const hasErrors = results.errors.length > 0;
    const allSuccessful = results.sponsorReward?.success && 
      (referredUserReward ? results.referredUserReward?.success : true);

    return NextResponse.json({
      success: !hasErrors && allSuccessful,
      message: hasErrors 
        ? 'Rewards processed with some errors'
        : 'Rewards processed successfully',
      results,
      referralId
    });

  } catch (error) {
    console.error('Error processing referral rewards:', error);
    return NextResponse.json(
      { error: 'Failed to process referral rewards' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const referralId = searchParams.get('referralId');

    if (!referralId) {
      return NextResponse.json(
        { error: 'Referral ID is required' },
        { status: 400 }
      );
    }

    // Get reward processing logs for this referral
    const logsQuery = query(
      collection(db, 'referral_reward_logs'),
      where('referralId', '==', referralId)
    );
    const logsSnapshot = await getDocs(logsQuery);

    const logs = logsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime());

    return NextResponse.json({
      success: true,
      logs,
      total: logs.length
    });

  } catch (error) {
    console.error('Error fetching reward processing logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reward processing logs' },
      { status: 500 }
    );
  }
}