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
    const format = searchParams.get('format') || 'json'; // json, csv
    const status = searchParams.get('status');
    const sponsorId = searchParams.get('sponsorId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let q = query(collection(db, 'referrals'));

    // Apply filters
    if (status && status !== 'all') {
      q = query(q, where('status', '==', status));
    }

    if (sponsorId) {
      q = query(q, where('sponsorId', '==', sponsorId));
    }

    // Order by creation date
    q = query(q, orderBy('createdAt', 'desc'));

    const querySnapshot = await getDocs(q);
    let referrals = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Referral[];

    // Apply date filters
    if (startDate || endDate) {
      referrals = referrals.filter(referral => {
        const createdAt = new Date(referral.createdAt?.toDate?.() || referral.createdAt);
        
        if (startDate && createdAt < new Date(startDate)) {
          return false;
        }
        
        if (endDate && createdAt > new Date(endDate)) {
          return false;
        }
        
        return true;
      });
    }

    if (format === 'csv') {
      return generateCSVResponse(referrals);
    }

    // JSON format (default)
    return NextResponse.json({
      success: true,
      data: referrals,
      total: referrals.length,
      exportDate: new Date().toISOString(),
      filters: {
        status,
        sponsorId,
        startDate,
        endDate
      }
    });

  } catch (error) {
    console.error('Error exporting referral data:', error);
    return NextResponse.json(
      { error: 'Failed to export referral data' },
      { status: 500 }
    );
  }
}

function generateCSVResponse(referrals: Referral[]) {
  const headers = [
    'ID',
    'Referral Code',
    'Sponsor ID',
    'Sponsor Name',
    'Sponsor Email',
    'Referred User ID',
    'Referred User Name',
    'Referred User Email',
    'Status',
    'Reward Amount',
    'Reward Currency',
    'Signup Date',
    'Approval Date',
    'Reward Date',
    'Rejection Date',
    'Rejection Reason',
    'Admin Notes',
    'Created At',
    'Updated At'
  ];

  const csvRows = [
    headers.join(','),
    ...referrals.map(referral => [
      referral.id,
      referral.referralCode,
      referral.sponsorId,
      `"${referral.sponsorName}"`,
      referral.sponsorEmail,
      referral.referredUserId || '',
      `"${referral.referredUserName || ''}"`,
      referral.referredUserEmail || '',
      referral.status,
      referral.rewardAmount || '',
      referral.rewardCurrency || '',
      referral.signupDate ? formatDate(referral.signupDate) : '',
      referral.approvalDate ? formatDate(referral.approvalDate) : '',
      referral.rewardDate ? formatDate(referral.rewardDate) : '',
      referral.rejectionDate ? formatDate(referral.rejectionDate) : '',
      `"${referral.rejectionReason || ''}"`,
      `"${referral.adminNotes || ''}"`,
      formatDate(referral.createdAt),
      formatDate(referral.updatedAt)
    ].join(','))
  ];

  const csvContent = csvRows.join('\n');
  const filename = `referrals_export_${new Date().toISOString().split('T')[0]}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  });
}

function formatDate(date: any): string {
  if (!date) return '';
  
  try {
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toISOString();
  } catch (error) {
    return '';
  }
}