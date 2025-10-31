import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ReferralCode {
  id: string;
  code: string;
  sponsorId: string;
  sponsorName: string;
  sponsorEmail: string;
  isActive: boolean;
  usageCount: number;
  maxUsage?: number;
  expiryDate?: Date;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sponsorId = searchParams.get('sponsorId');
    const isActive = searchParams.get('isActive');
    const limit = parseInt(searchParams.get('limit') || '50');

    let q = query(collection(db, 'referral_codes'));

    // Apply filters
    if (sponsorId) {
      q = query(q, where('sponsorId', '==', sponsorId));
    }

    if (isActive !== null) {
      q = query(q, where('isActive', '==', isActive === 'true'));
    }

    const querySnapshot = await getDocs(q);
    const codes = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ReferralCode[];

    // Apply limit and check expiry
    const now = new Date();
    const processedCodes = codes
      .map(code => ({
        ...code,
        isExpired: code.expiryDate ? new Date(code.expiryDate) < now : false,
        isMaxedOut: code.maxUsage ? code.usageCount >= code.maxUsage : false
      }))
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      codes: processedCodes,
      total: codes.length
    });

  } catch (error) {
    console.error('Error fetching referral codes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch referral codes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sponsorId,
      sponsorName,
      sponsorEmail,
      customCode,
      maxUsage,
      expiryDate,
      description
    } = body;

    if (!sponsorId || !sponsorName || !sponsorEmail) {
      return NextResponse.json(
        { error: 'Sponsor ID, name, and email are required' },
        { status: 400 }
      );
    }

    // Generate code if not provided
    let code = customCode;
    if (!code) {
      code = generateReferralCode(sponsorName);
    }

    // Check if code already exists
    const existingQuery = query(
      collection(db, 'referral_codes'),
      where('code', '==', code)
    );
    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
      return NextResponse.json(
        { error: 'Referral code already exists' },
        { status: 400 }
      );
    }

    const newCode: any = {
      code,
      sponsorId,
      sponsorName,
      sponsorEmail,
      isActive: true,
      usageCount: 0,
      description: description || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Only add optional fields if they have valid values
    if (maxUsage !== undefined && maxUsage !== null && !isNaN(parseInt(maxUsage))) {
      newCode.maxUsage = parseInt(maxUsage);
    }
    
    if (expiryDate) {
      newCode.expiryDate = new Date(expiryDate);
    }

    const docRef = await addDoc(collection(db, 'referral_codes'), newCode);

    return NextResponse.json({
      success: true,
      code: {
        id: docRef.id,
        ...newCode
      },
      message: 'Referral code created successfully'
    });

  } catch (error) {
    console.error('Error creating referral code:', error);
    return NextResponse.json(
      { error: 'Failed to create referral code' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      codeId,
      isActive,
      maxUsage,
      expiryDate,
      description
    } = body;

    if (!codeId) {
      return NextResponse.json(
        { error: 'Code ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {
      updatedAt: new Date()
    };

    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive;
    }

    if (maxUsage !== undefined) {
      updateData.maxUsage = maxUsage ? parseInt(maxUsage) : null;
    }

    if (expiryDate !== undefined) {
      updateData.expiryDate = expiryDate ? new Date(expiryDate) : null;
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    await updateDoc(doc(db, 'referral_codes', codeId), updateData);

    return NextResponse.json({
      success: true,
      message: 'Referral code updated successfully'
    });

  } catch (error) {
    console.error('Error updating referral code:', error);
    return NextResponse.json(
      { error: 'Failed to update referral code' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const codeId = searchParams.get('id');

    if (!codeId) {
      return NextResponse.json(
        { error: 'Code ID is required' },
        { status: 400 }
      );
    }

    // Instead of deleting, deactivate the code
    await updateDoc(doc(db, 'referral_codes', codeId), {
      isActive: false,
      updatedAt: new Date()
    });

    return NextResponse.json({
      success: true,
      message: 'Referral code deactivated successfully'
    });

  } catch (error) {
    console.error('Error deactivating referral code:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate referral code' },
      { status: 500 }
    );
  }
}

function generateReferralCode(sponsorName: string): string {
  // Create a clean version of the sponsor name
  const cleanName = sponsorName
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .substring(0, 6);
  
  // Add random characters for uniqueness
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  return `${cleanName}${randomPart}`;
}