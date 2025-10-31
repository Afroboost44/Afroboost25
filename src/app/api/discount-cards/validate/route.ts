import { NextRequest, NextResponse } from 'next/server';
import { query, where, getDocs, collection, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { userService } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Request body:', body);
    const { cardCode, customerId, orderAmount } = body;

    // Validate required fields
    if (!cardCode) {
      return NextResponse.json(
        { error: 'Discount code is required' },
        { status: 400 }
      );
    }

    // Find discount card by code
    const discountCardQuery = query(
      collection(db, 'discount_cards'),
      where('code', '==', cardCode.toUpperCase())
    );
    
    const querySnapshot = await getDocs(discountCardQuery);
    
    if (querySnapshot.empty) {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Invalid discount code' 
        },
        { status: 200 }
      );
    }

    const discountCardDoc = querySnapshot.docs[0];
    const discountCard = {
      id: discountCardDoc.id,
      ...discountCardDoc.data()
    } as any;

    // Check if card is active
    if (!discountCard.isActive) {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'This discount code is no longer active' 
        },
        { status: 200 }
      );
    }

    // Check expiration date
    if (discountCard.expirationDate) {
      const expirationDate = discountCard.expirationDate.toDate ? 
        discountCard.expirationDate.toDate() : 
        new Date(discountCard.expirationDate);
      
      if (expirationDate < new Date()) {
        return NextResponse.json(
          { 
            valid: false, 
            error: 'This discount code has expired' 
          },
          { status: 200 }
        );
      }
    }

    // Check usage limit
    if (discountCard.usageLimit && discountCard.timesUsed >= discountCard.usageLimit && discountCard.usageLimit !== -1) {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'This discount code has reached its usage limit' 
        },
        { status: 200 }
      );
    }

    // Check if code is user-specific
    if (discountCard.userEmail && customerId && discountCard.userEmail !== customerId) {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'This discount code is not valid for your account' 
        },
        { status: 200 }
      );
    }

    // Calculate discount amount
    const discountAmount = orderAmount ? (orderAmount * discountCard.discountPercentage / 100) : 0;
    const finalAmount = orderAmount ? (orderAmount - discountAmount) : 0;

    return NextResponse.json({
      valid: true,
      discountPercentage: discountCard.discountPercentage,
      cardCode: cardCode.toUpperCase(),
      memberName: discountCard.memberName || '',
      coachId: discountCard.coachId,
      expirationDate: discountCard.expirationDate || discountCard.expiryDate,
      description: discountCard.description,
      discountAmount,
      finalAmount,
      message: `${discountCard.discountPercentage}% discount applied!`,
      discountCard: {
        id: discountCard.id,
        title: discountCard.title,
        description: discountCard.description,
        discountPercentage: discountCard.discountPercentage,
        coachName: discountCard.coachName
      }
    });

  } catch (error) {
    console.error('Error validating discount code:', error);
    return NextResponse.json(
      { error: 'Failed to validate discount code' },
      { status: 500 }
    );
  }
}

// PUT endpoint to apply/use a discount code
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, userEmail } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Discount code is required' },
        { status: 400 }
      );
    }

    // Find and validate the discount card first
    const discountCardQuery = query(
      collection(db, 'discount_cards'),
      where('code', '==', code.toUpperCase())
    );
    
    const querySnapshot = await getDocs(discountCardQuery);
    
    if (querySnapshot.empty) {
      return NextResponse.json(
        { error: 'Invalid discount code' },
        { status: 400 }
      );
    }

    const discountCardDoc = querySnapshot.docs[0];
    const discountCard = discountCardDoc.data() as any;

    // Perform all validations again before incrementing usage
    if (!discountCard.isActive) {
      return NextResponse.json(
        { error: 'This discount code is no longer active' },
        { status: 400 }
      );
    }

    if (discountCard.expirationDate) {
      const expirationDate = discountCard.expirationDate.toDate ? 
        discountCard.expirationDate.toDate() : 
        new Date(discountCard.expirationDate);
      
      if (expirationDate < new Date()) {
        return NextResponse.json(
          { error: 'This discount code has expired' },
          { status: 400 }
        );
      }
    }

    if (discountCard.usageLimit && discountCard.timesUsed >= discountCard.usageLimit) {
      return NextResponse.json(
        { error: 'This discount code has reached its usage limit' },
        { status: 400 }
      );
    }

    if (discountCard.userEmail && userEmail && discountCard.userEmail !== userEmail) {
      return NextResponse.json(
        { error: 'This discount code is not valid for your account' },
        { status: 400 }
      );
    }

    // Increment usage count
    await updateDoc(doc(db, 'discount_cards', discountCardDoc.id), {
      timesUsed: increment(1),
      updatedAt: new Date()
    });

    return NextResponse.json({
      success: true,
      message: 'Discount code applied successfully'
    });

  } catch (error) {
    console.error('Error applying discount code:', error);
    return NextResponse.json(
      { error: 'Failed to apply discount code' },
      { status: 500 }
    );
  }
}