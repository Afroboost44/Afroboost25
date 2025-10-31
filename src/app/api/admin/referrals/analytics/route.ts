import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    const groupBy = searchParams.get('groupBy') || 'day'; // day, week, month
    const sponsorId = searchParams.get('sponsorId');

    let q = query(collection(db, 'referrals'));

    // Filter by sponsor if specified
    if (sponsorId) {
      q = query(q, where('sponsorId', '==', sponsorId));
    }

    // Order by creation date
    q = query(q, orderBy('createdAt', 'desc'));

    const querySnapshot = await getDocs(q);
    const referrals = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Referral[];

    // Filter by time period
    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const filteredReferrals = referrals.filter(referral => {
      const createdAt = new Date(referral.createdAt?.toDate?.() || referral.createdAt);
      return createdAt >= startDate;
    });

    // Generate analytics data
    const analytics = {
      summary: generateSummary(filteredReferrals),
      timeline: generateTimeline(filteredReferrals, groupBy, periodDays),
      statusBreakdown: generateStatusBreakdown(filteredReferrals),
      rewardAnalytics: generateRewardAnalytics(filteredReferrals),
      topPerformers: generateTopPerformers(filteredReferrals),
      conversionFunnel: generateConversionFunnel(filteredReferrals)
    };

    return NextResponse.json({
      success: true,
      analytics,
      period: periodDays,
      totalReferrals: filteredReferrals.length
    });

  } catch (error) {
    console.error('Error generating referral analytics:', error);
    return NextResponse.json(
      { error: 'Failed to generate analytics' },
      { status: 500 }
    );
  }
}

function generateSummary(referrals: Referral[]) {
  const total = referrals.length;
  const approved = referrals.filter(r => r.status === 'approved').length;
  const rewarded = referrals.filter(r => r.status === 'rewarded').length;
  const pending = referrals.filter(r => r.status === 'pending').length;
  const rejected = referrals.filter(r => r.status === 'rejected').length;

  const totalRewardAmount = referrals
    .filter(r => r.status === 'rewarded' && r.rewardAmount)
    .reduce((sum, r) => sum + (r.rewardAmount || 0), 0);

  const conversionRate = total > 0 ? ((approved + rewarded) / total) * 100 : 0;

  return {
    total,
    approved,
    rewarded,
    pending,
    rejected,
    totalRewardAmount,
    conversionRate: parseFloat(conversionRate.toFixed(2)),
    averageReward: rewarded > 0 ? parseFloat((totalRewardAmount / rewarded).toFixed(2)) : 0
  };
}

function generateTimeline(referrals: Referral[], groupBy: string, periodDays: number) {
  const timeline = [];
  const now = new Date();

  let intervalDays = 1;
  if (groupBy === 'week') intervalDays = 7;
  else if (groupBy === 'month') intervalDays = 30;

  const intervals = Math.ceil(periodDays / intervalDays);

  for (let i = intervals - 1; i >= 0; i--) {
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() - (i * intervalDays));
    
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - intervalDays);

    const intervalReferrals = referrals.filter(referral => {
      const createdAt = new Date(referral.createdAt?.toDate?.() || referral.createdAt);
      return createdAt >= startDate && createdAt < endDate;
    });

    const label = groupBy === 'day' 
      ? endDate.toLocaleDateString()
      : groupBy === 'week'
      ? `Week of ${startDate.toLocaleDateString()}`
      : `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;

    timeline.push({
      period: label,
      date: endDate.toISOString(),
      total: intervalReferrals.length,
      approved: intervalReferrals.filter(r => r.status === 'approved').length,
      rewarded: intervalReferrals.filter(r => r.status === 'rewarded').length,
      pending: intervalReferrals.filter(r => r.status === 'pending').length,
      rejected: intervalReferrals.filter(r => r.status === 'rejected').length
    });
  }

  return timeline;
}

function generateStatusBreakdown(referrals: Referral[]) {
  const statuses = ['pending', 'approved', 'rewarded', 'rejected'] as const;
  
  return statuses.map(status => ({
    status,
    count: referrals.filter(r => r.status === status).length,
    percentage: referrals.length > 0 
      ? parseFloat(((referrals.filter(r => r.status === status).length / referrals.length) * 100).toFixed(1))
      : 0
  }));
}

function generateRewardAnalytics(referrals: Referral[]) {
  const rewardedReferrals = referrals.filter(r => r.status === 'rewarded' && r.rewardAmount);
  
  if (rewardedReferrals.length === 0) {
    return {
      totalAmount: 0,
      averageAmount: 0,
      minAmount: 0,
      maxAmount: 0,
      count: 0,
      byCurrency: {}
    };
  }

  const amounts = rewardedReferrals.map(r => r.rewardAmount || 0);
  const totalAmount = amounts.reduce((sum, amount) => sum + amount, 0);

  const byCurrency = rewardedReferrals.reduce((acc, referral) => {
    const currency = referral.rewardCurrency || 'CHF';
    if (!acc[currency]) {
      acc[currency] = { count: 0, total: 0 };
    }
    acc[currency].count++;
    acc[currency].total += referral.rewardAmount || 0;
    return acc;
  }, {} as Record<string, { count: number; total: number }>);

  return {
    totalAmount: parseFloat(totalAmount.toFixed(2)),
    averageAmount: parseFloat((totalAmount / rewardedReferrals.length).toFixed(2)),
    minAmount: Math.min(...amounts),
    maxAmount: Math.max(...amounts),
    count: rewardedReferrals.length,
    byCurrency
  };
}

function generateTopPerformers(referrals: Referral[]) {
  const sponsorStats = referrals.reduce((acc, referral) => {
    const sponsorId = referral.sponsorId;
    if (!acc[sponsorId]) {
      acc[sponsorId] = {
        sponsorId,
        sponsorName: referral.sponsorName,
        sponsorEmail: referral.sponsorEmail,
        totalReferrals: 0,
        successfulReferrals: 0,
        totalRewards: 0,
        conversionRate: 0
      };
    }
    
    acc[sponsorId].totalReferrals++;
    
    if (referral.status === 'approved' || referral.status === 'rewarded') {
      acc[sponsorId].successfulReferrals++;
    }
    
    if (referral.status === 'rewarded' && referral.rewardAmount) {
      acc[sponsorId].totalRewards += referral.rewardAmount;
    }
    
    return acc;
  }, {} as Record<string, any>);

  // Calculate conversion rates
  Object.values(sponsorStats).forEach((sponsor: any) => {
    sponsor.conversionRate = sponsor.totalReferrals > 0 
      ? parseFloat(((sponsor.successfulReferrals / sponsor.totalReferrals) * 100).toFixed(1))
      : 0;
  });

  return Object.values(sponsorStats)
    .sort((a: any, b: any) => b.totalReferrals - a.totalReferrals)
    .slice(0, 10);
}

function generateConversionFunnel(referrals: Referral[]) {
  const total = referrals.length;
  const signedUp = referrals.filter(r => r.referredUserId).length;
  const approved = referrals.filter(r => r.status === 'approved' || r.status === 'rewarded').length;
  const rewarded = referrals.filter(r => r.status === 'rewarded').length;

  return [
    {
      stage: 'Referral Created',
      count: total,
      percentage: 100
    },
    {
      stage: 'User Signed Up',
      count: signedUp,
      percentage: total > 0 ? parseFloat(((signedUp / total) * 100).toFixed(1)) : 0
    },
    {
      stage: 'Referral Approved',
      count: approved,
      percentage: total > 0 ? parseFloat(((approved / total) * 100).toFixed(1)) : 0
    },
    {
      stage: 'Reward Distributed',
      count: rewarded,
      percentage: total > 0 ? parseFloat(((rewarded / total) * 100).toFixed(1)) : 0
    }
  ];
}