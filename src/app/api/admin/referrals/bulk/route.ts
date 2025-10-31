import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, referralIds, data } = body;

    if (!action || !referralIds || !Array.isArray(referralIds)) {
      return NextResponse.json(
        { error: 'Action and referralIds array are required' },
        { status: 400 }
      );
    }

    const batch = writeBatch(db);
    const timestamp = new Date();

    switch (action) {
      case 'approve':
        referralIds.forEach(id => {
          const ref = doc(db, 'referrals', id);
          batch.update(ref, {
            status: 'approved',
            approvalDate: timestamp,
            updatedAt: timestamp,
            rewardAmount: data?.rewardAmount,
            rewardCurrency: data?.rewardCurrency || 'CHF',
            adminNotes: data?.adminNotes
          });
        });
        break;

      case 'reject':
        referralIds.forEach(id => {
          const ref = doc(db, 'referrals', id);
          batch.update(ref, {
            status: 'rejected',
            rejectionDate: timestamp,
            rejectionReason: data?.rejectionReason || 'Bulk rejection',
            updatedAt: timestamp,
            adminNotes: data?.adminNotes
          });
        });
        break;

      case 'reward':
        referralIds.forEach(id => {
          const ref = doc(db, 'referrals', id);
          batch.update(ref, {
            status: 'rewarded',
            rewardDate: timestamp,
            updatedAt: timestamp,
            rewardAmount: data?.rewardAmount,
            rewardCurrency: data?.rewardCurrency || 'CHF',
            adminNotes: data?.adminNotes
          });
        });
        break;

      case 'reset':
        referralIds.forEach(id => {
          const ref = doc(db, 'referrals', id);
          batch.update(ref, {
            status: 'pending',
            updatedAt: timestamp,
            approvalDate: null,
            rejectionDate: null,
            rewardDate: null,
            rejectionReason: null,
            adminNotes: data?.adminNotes
          });
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: approve, reject, reward, reset' },
          { status: 400 }
        );
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Successfully ${action}ed ${referralIds.length} referrals`,
      processedCount: referralIds.length
    });

  } catch (error) {
    console.error('Error processing bulk referral action:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk action' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'statistics') {
      // Get referral statistics
      const querySnapshot = await getDocs(collection(db, 'referrals'));
      const referrals = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as Referral[];

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const stats = {
        total: referrals.length,
        byStatus: {
          pending: referrals.filter(r => r.status === 'pending').length,
          approved: referrals.filter(r => r.status === 'approved').length,
          rewarded: referrals.filter(r => r.status === 'rewarded').length,
          rejected: referrals.filter(r => r.status === 'rejected').length
        },
        recent: {
          last7Days: referrals.filter(r => new Date(r.createdAt?.toDate?.() || r.createdAt) >= sevenDaysAgo).length,
          last30Days: referrals.filter(r => new Date(r.createdAt?.toDate?.() || r.createdAt) >= thirtyDaysAgo).length
        },
        rewards: {
          totalAmount: referrals
            .filter(r => r.status === 'rewarded' && r.rewardAmount)
            .reduce((sum, r) => sum + (r.rewardAmount || 0), 0),
          totalCount: referrals.filter(r => r.status === 'rewarded').length
        },
        topSponsors: getTopSponsors(referrals, 5)
      };

      return NextResponse.json({
        success: true,
        statistics: stats
      });
    }

    return NextResponse.json(
      { error: 'Invalid action parameter' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error fetching bulk operations data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

function getTopSponsors(referrals: Referral[], limit: number) {
  const sponsorCounts = referrals.reduce((acc, referral) => {
    const sponsorId = referral.sponsorId;
    if (!acc[sponsorId]) {
      acc[sponsorId] = {
        sponsorId,
        sponsorName: referral.sponsorName,
        sponsorEmail: referral.sponsorEmail,
        totalReferrals: 0,
        successfulReferrals: 0,
        pendingReferrals: 0,
        totalRewards: 0
      };
    }
    
    acc[sponsorId].totalReferrals++;
    
    if (referral.status === 'rewarded') {
      acc[sponsorId].successfulReferrals++;
      acc[sponsorId].totalRewards += referral.rewardAmount || 0;
    } else if (referral.status === 'pending') {
      acc[sponsorId].pendingReferrals++;
    }
    
    return acc;
  }, {} as Record<string, any>);

  return Object.values(sponsorCounts)
    .sort((a: any, b: any) => b.totalReferrals - a.totalReferrals)
    .slice(0, limit);
}