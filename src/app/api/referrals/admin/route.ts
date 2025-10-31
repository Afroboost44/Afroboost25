import { NextRequest, NextResponse } from 'next/server';
import { 
  query, 
  where, 
  getDocs, 
  collection, 
  doc, 
  updateDoc, 
  getDoc,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { userService } from '@/lib/database';

// GET endpoint to fetch all referrals for admin management
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const limitCount = parseInt(searchParams.get('limit') || '50');

    let referralsQuery;
    
    if (status === 'all') {
      referralsQuery = query(
        collection(db, 'referrals'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
    } else {
      referralsQuery = query(
        collection(db, 'referrals'),
        where('status', '==', status),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
    }
    
    const querySnapshot = await getDocs(referralsQuery);
    const referrals = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      approvedAt: doc.data().approvedAt?.toDate() || null,
      rejectedAt: doc.data().rejectedAt?.toDate() || null
    }));

    // Get summary statistics
    const allReferralsQuery = query(collection(db, 'referrals'));
    const allReferralsSnapshot = await getDocs(allReferralsQuery);
    
    const statistics = {
      total: allReferralsSnapshot.size,
      pending: 0,
      approved: 0,
      rejected: 0,
      totalRewards: 0
    };

    allReferralsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      statistics[data.status as keyof typeof statistics]++;
      if (data.status === 'approved' && data.rewardAmount) {
        statistics.totalRewards += data.rewardAmount;
      }
    });

    return NextResponse.json({
      success: true,
      referrals,
      statistics
    });

  } catch (error) {
    console.error('Error fetching referrals for admin:', error);
    return NextResponse.json(
      { error: 'Failed to fetch referrals' },
      { status: 500 }
    );
  }
}

// POST endpoint for admin actions (approve/reject referrals)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, referralId, adminId, reason, rewardAmount } = body;

    if (!action || !referralId || !adminId) {
      return NextResponse.json(
        { error: 'Missing required fields: action, referralId, adminId' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be approve or reject' },
        { status: 400 }
      );
    }

    // Get referral record
    const referralDoc = await getDoc(doc(db, 'referrals', referralId));
    if (!referralDoc.exists()) {
      return NextResponse.json(
        { error: 'Referral not found' },
        { status: 404 }
      );
    }

    const referralData = referralDoc.data();

    // Check if already processed
    if (referralData.status !== 'pending') {
      return NextResponse.json(
        { error: 'Referral has already been processed' },
        { status: 400 }
      );
    }

    const updateData: any = {
      status: action === 'approve' ? 'approved' : 'rejected',
      adminId,
      adminReason: reason || '',
      updatedAt: serverTimestamp()
    };

    if (action === 'approve') {
      updateData.approvedAt = serverTimestamp();
      updateData.rewardAmount = rewardAmount || referralData.rewardAmount || 10;

      // Award credits to sponsor
      try {
        await updateDoc(doc(db, 'users', referralData.sponsorId), {
          credits: increment(updateData.rewardAmount),
          updatedAt: serverTimestamp()
        });

        // Create transaction record
        await addDoc(collection(db, 'transactions'), {
          userId: referralData.sponsorId,
          type: 'referral_bonus',
          amount: updateData.rewardAmount,
          description: `Referral bonus for ${referralData.newUserName}`,
          status: 'completed',
          referralId: referralId,
          createdAt: serverTimestamp()
        });
      } catch (creditError) {
        console.error('Error awarding credits:', creditError);
        return NextResponse.json(
          { error: 'Failed to award credits to sponsor' },
          { status: 500 }
        );
      }
    } else {
      updateData.rejectedAt = serverTimestamp();
    }

    // Update referral record
    await updateDoc(doc(db, 'referrals', referralId), updateData);

    // Send notification to sponsor
    try {
      const notificationTitle = action === 'approve' 
        ? '🎉 Referral Approved!' 
        : '❌ Referral Rejected';
      
      const notificationMessage = action === 'approve'
        ? `Your referral for ${referralData.newUserName} has been approved! You've earned CHF ${updateData.rewardAmount} in credits.`
        : `Your referral for ${referralData.newUserName} has been rejected. ${reason || 'Please contact support for more information.'}`;

      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/notifications/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: referralData.sponsorId,
          title: notificationTitle,
          message: notificationMessage,
          type: 'referral'
        }),
      });
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
    }

    return NextResponse.json({
      success: true,
      message: `Referral ${action}d successfully`,
      referralId,
      action,
      rewardAmount: action === 'approve' ? updateData.rewardAmount : 0
    });

  } catch (error) {
    console.error('Error processing referral:', error);
    return NextResponse.json(
      { error: 'Failed to process referral' },
      { status: 500 }
    );
  }
}

// PUT endpoint to update referral settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { defaultRewardAmount, autoApproval, adminId } = body;

    if (!adminId) {
      return NextResponse.json(
        { error: 'Admin ID is required' },
        { status: 400 }
      );
    }

    // Update or create referral settings
    const settingsData = {
      defaultRewardAmount: defaultRewardAmount || 10,
      autoApproval: autoApproval || false,
      updatedBy: adminId,
      updatedAt: serverTimestamp()
    };

    // Check if settings document exists
    const settingsDoc = await getDoc(doc(db, 'admin_settings', 'referrals'));
    
    if (settingsDoc.exists()) {
      await updateDoc(doc(db, 'admin_settings', 'referrals'), settingsData);
    } else {
      await addDoc(collection(db, 'admin_settings'), {
        ...settingsData,
        id: 'referrals',
        createdAt: serverTimestamp()
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Referral settings updated successfully',
      settings: settingsData
    });

  } catch (error) {
    console.error('Error updating referral settings:', error);
    return NextResponse.json(
      { error: 'Failed to update referral settings' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a referral record
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const referralId = searchParams.get('referralId');
    const adminId = searchParams.get('adminId');

    if (!referralId || !adminId) {
      return NextResponse.json(
        { error: 'Referral ID and Admin ID are required' },
        { status: 400 }
      );
    }

    // Get referral record to check if approved (to reverse credits if needed)
    const referralDoc = await getDoc(doc(db, 'referrals', referralId));
    if (!referralDoc.exists()) {
      return NextResponse.json(
        { error: 'Referral not found' },
        { status: 404 }
      );
    }

    const referralData = referralDoc.data();

    // If referral was approved, reverse the credits
    if (referralData.status === 'approved' && referralData.rewardAmount) {
      try {
        await updateDoc(doc(db, 'users', referralData.sponsorId), {
          credits: increment(-referralData.rewardAmount),
          updatedAt: serverTimestamp()
        });

        // Create reversal transaction record
        await addDoc(collection(db, 'transactions'), {
          userId: referralData.sponsorId,
          type: 'admin_debit',
          amount: referralData.rewardAmount,
          description: `Referral bonus reversal for ${referralData.newUserName} (admin deletion)`,
          status: 'completed',
          referralId: referralId,
          adminId: adminId,
          createdAt: serverTimestamp()
        });
      } catch (creditError) {
        console.error('Error reversing credits:', creditError);
        return NextResponse.json(
          { error: 'Failed to reverse credits. Manual adjustment may be required.' },
          { status: 500 }
        );
      }
    }

    // Delete the referral record
    await updateDoc(doc(db, 'referrals', referralId), {
      status: 'deleted',
      deletedBy: adminId,
      deletedAt: serverTimestamp()
    });

    return NextResponse.json({
      success: true,
      message: 'Referral deleted successfully',
      creditsReversed: referralData.status === 'approved' ? referralData.rewardAmount : 0
    });

  } catch (error) {
    console.error('Error deleting referral:', error);
    return NextResponse.json(
      { error: 'Failed to delete referral' },
      { status: 500 }
    );
  }
}