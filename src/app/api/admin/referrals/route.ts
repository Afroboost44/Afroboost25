import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs, orderBy, updateDoc, doc } from 'firebase/firestore';
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
  signupDate?: Date;
  approvalDate?: Date;
  rewardDate?: Date;
  rejectionDate?: Date;
  rejectionReason?: string;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const sponsorId = searchParams.get('sponsorId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let q = query(collection(db, 'referrals'));

    // Apply filters
    if (status && status !== 'all') {
      q = query(q, where('status', '==', status));
    }

    if (sponsorId) {
      q = query(q, where('sponsorId', '==', sponsorId));
    }

    // Order by creation date (newest first)
    q = query(q, orderBy('createdAt', 'desc'));

    const querySnapshot = await getDocs(q);
    const allReferrals = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Referral[];

    // Apply pagination
    const paginatedReferrals = allReferrals.slice(offset, offset + limit);
    const totalCount = allReferrals.length;

    // Calculate statistics
    const stats = {
      total: allReferrals.length,
      pending: allReferrals.filter(r => r.status === 'pending').length,
      approved: allReferrals.filter(r => r.status === 'approved').length,
      rewarded: allReferrals.filter(r => r.status === 'rewarded').length,
      rejected: allReferrals.filter(r => r.status === 'rejected').length,
      totalRewardAmount: allReferrals
        .filter(r => r.status === 'rewarded' && r.rewardAmount)
        .reduce((sum, r) => sum + (r.rewardAmount || 0), 0)
    };

    return NextResponse.json({
      success: true,
      referrals: paginatedReferrals,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      },
      stats
    });

  } catch (error) {
    console.error('Error fetching referrals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch referrals' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      referralId, 
      status, 
      rewardAmount, 
      rewardCurrency, 
      rejectionReason, 
      adminNotes,
      adminId,
      adminName
    } = body;

    if (!referralId || !status) {
      return NextResponse.json(
        { error: 'Referral ID and status are required' },
        { status: 400 }
      );
    }

    const updateData: any = {
      status,
      updatedAt: new Date()
    };

    // Add status-specific fields
    switch (status) {
      case 'approved':
        // Use referralService.approve to handle crediting
        const { referralService } = await import('@/lib/database');
        await referralService.approve(
          referralId, 
          adminId || 'admin', 
          adminName || 'Admin'
        );
        
        return NextResponse.json({
          success: true,
          message: 'Referral approved and users credited successfully'
        });
        
      case 'rewarded':
        updateData.rewardDate = new Date();
        if (rewardAmount) updateData.rewardAmount = rewardAmount;
        if (rewardCurrency) updateData.rewardCurrency = rewardCurrency;
        break;
      case 'rejected':
        updateData.rejectionDate = new Date();
        if (rejectionReason) updateData.rejectionReason = rejectionReason;
        break;
    }

    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    await updateDoc(doc(db, 'referrals', referralId), updateData);

    return NextResponse.json({
      success: true,
      message: 'Referral updated successfully'
    });

  } catch (error) {
    console.error('Error updating referral:', error);
    return NextResponse.json(
      { error: 'Failed to update referral' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const referralId = searchParams.get('id');

    if (!referralId) {
      return NextResponse.json(
        { error: 'Referral ID is required' },
        { status: 400 }
      );
    }

    // Instead of deleting, mark as rejected
    await updateDoc(doc(db, 'referrals', referralId), {
      status: 'rejected',
      rejectionDate: new Date(),
      rejectionReason: 'Deleted by admin',
      updatedAt: new Date()
    });

    return NextResponse.json({
      success: true,
      message: 'Referral marked as rejected'
    });

  } catch (error) {
    console.error('Error deleting referral:', error);
    return NextResponse.json(
      { error: 'Failed to delete referral' },
      { status: 500 }
    );
  }
}