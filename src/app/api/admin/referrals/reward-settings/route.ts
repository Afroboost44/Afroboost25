import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ReferralRewardSettings {
  id: string;
  isEnabled: boolean;
  rewardType: 'credits' | 'cash' | 'both';
  sponsorReward: {
    amount: number;
    currency: 'CHF' | 'USD' | 'EUR';
    type: 'credits' | 'cash';
  };
  referredUserReward: {
    amount: number;
    currency: 'CHF' | 'USD' | 'EUR';
    type: 'credits' | 'cash';
  };
  minimumSpentAmount?: number; // Minimum amount referred user must spend
  rewardDelay?: number; // Days to wait before awarding reward
  maxRewardsPerSponsor?: number; // Maximum rewards per sponsor
  requireApproval: boolean;
  autoApprovalEnabled: boolean;
  terms: string;
  description: string;
  updatedAt: Date;
  updatedBy?: string;
}

export async function GET() {
  try {
    const settingsDoc = await getDoc(doc(db, 'admin_settings', 'referral_rewards'));
    
    if (!settingsDoc.exists()) {
      // Return default settings if none exist
      const defaultSettings: Omit<ReferralRewardSettings, 'id'> = {
        isEnabled: false,
        rewardType: 'credits',
        sponsorReward: {
          amount: 50,
          currency: 'CHF',
          type: 'credits'
        },
        referredUserReward: {
          amount: 25,
          currency: 'CHF',
          type: 'credits'
        },
        minimumSpentAmount: 100,
        rewardDelay: 7,
        maxRewardsPerSponsor: 50,
        requireApproval: true,
        autoApprovalEnabled: false,
        terms: 'Standard referral program terms apply. Rewards are subject to verification and approval.',
        description: 'Earn rewards for referring new users to our platform!',
        updatedAt: new Date()
      };

      return NextResponse.json({
        success: true,
        settings: {
          id: 'referral_rewards',
          ...defaultSettings
        }
      });
    }

    return NextResponse.json({
      success: true,
      settings: {
        id: settingsDoc.id,
        ...settingsDoc.data()
      }
    });

  } catch (error) {
    console.error('Error fetching referral reward settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch referral reward settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      isEnabled,
      rewardType,
      sponsorReward,
      referredUserReward,
      minimumSpentAmount,
      rewardDelay,
      maxRewardsPerSponsor,
      requireApproval,
      autoApprovalEnabled,
      terms,
      description,
      updatedBy
    } = body;

    // Validate required fields
    if (typeof isEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'isEnabled is required and must be boolean' },
        { status: 400 }
      );
    }

    if (!rewardType || !['credits', 'cash', 'both'].includes(rewardType)) {
      return NextResponse.json(
        { error: 'Valid rewardType is required (credits, cash, or both)' },
        { status: 400 }
      );
    }

    if (!sponsorReward || sponsorReward.amount === undefined || sponsorReward.amount === null || !sponsorReward.currency || isNaN(parseFloat(sponsorReward.amount))) {
      return NextResponse.json(
        { error: 'Valid sponsorReward with numeric amount is required' },
        { status: 400 }
      );
    }

    if (!referredUserReward || referredUserReward.amount === undefined || referredUserReward.amount === null || !referredUserReward.currency || isNaN(parseFloat(referredUserReward.amount))) {
      return NextResponse.json(
        { error: 'Valid referredUserReward with numeric amount is required' },
        { status: 400 }
      );
    }

    // Build settings object, only including defined values to avoid Firestore undefined errors
    const sponsorAmount = parseFloat(sponsorReward.amount);
    const referredAmount = parseFloat(referredUserReward.amount);

    if (sponsorAmount < 0 || referredAmount < 0) {
      return NextResponse.json(
        { error: 'Reward amounts must be positive numbers' },
        { status: 400 }
      );
    }

    const settings: any = {
      isEnabled,
      rewardType,
      sponsorReward: {
        amount: sponsorAmount,
        currency: sponsorReward.currency,
        type: sponsorReward.type || 'credits'
      },
      referredUserReward: {
        amount: referredAmount,
        currency: referredUserReward.currency,
        type: referredUserReward.type || 'credits'
      },
      requireApproval: requireApproval !== false, // Default to true
      autoApprovalEnabled: autoApprovalEnabled === true,
      terms: terms || 'Standard referral program terms apply.',
      description: description || 'Earn rewards for referring new users!',
      updatedAt: new Date()
    };

    // Only add optional fields if they have valid values
    if (minimumSpentAmount !== undefined && minimumSpentAmount !== null && !isNaN(parseFloat(minimumSpentAmount))) {
      settings.minimumSpentAmount = parseFloat(minimumSpentAmount);
    }
    
    if (rewardDelay !== undefined && rewardDelay !== null && !isNaN(parseInt(rewardDelay))) {
      settings.rewardDelay = parseInt(rewardDelay);
    }
    
    if (maxRewardsPerSponsor !== undefined && maxRewardsPerSponsor !== null && !isNaN(parseInt(maxRewardsPerSponsor))) {
      settings.maxRewardsPerSponsor = parseInt(maxRewardsPerSponsor);
    }
    
    if (updatedBy) {
      settings.updatedBy = updatedBy;
    }

    await setDoc(doc(db, 'admin_settings', 'referral_rewards'), settings);

    return NextResponse.json({
      success: true,
      settings: {
        id: 'referral_rewards',
        ...settings
      },
      message: 'Referral reward settings updated successfully'
    });

  } catch (error) {
    console.error('Error updating referral reward settings:', error);
    return NextResponse.json(
      { error: 'Failed to update referral reward settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { updatedBy, ...updateData } = body;

    // Filter out undefined values to avoid Firestore errors
    const cleanedUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    );

    // Add metadata
    const dataToUpdate: any = {
      ...cleanedUpdateData,
      updatedAt: new Date()
    };

    // Only add updatedBy if it's provided
    if (updatedBy) {
      dataToUpdate.updatedBy = updatedBy;
    }

    await updateDoc(doc(db, 'admin_settings', 'referral_rewards'), dataToUpdate);

    return NextResponse.json({
      success: true,
      message: 'Referral reward settings updated successfully'
    });

  } catch (error) {
    console.error('Error updating referral reward settings:', error);
    return NextResponse.json(
      { error: 'Failed to update referral reward settings' },
      { status: 500 }
    );
  }
}