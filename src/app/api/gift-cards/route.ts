import { NextRequest, NextResponse } from 'next/server';
import { giftCardService, notificationService } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const issuerId = searchParams.get('issuerId');
    const issuerType = searchParams.get('issuerType') as 'seller' | 'coach';

    if (!issuerId || !issuerType) {
      return NextResponse.json(
        { error: 'Issuer ID and type are required' },
        { status: 400 }
      );
    }

    const giftCards = await giftCardService.getByIssuer(issuerId, issuerType);

    return NextResponse.json({
      success: true,
      giftCards
    });

  } catch (error) {
    console.error('Error fetching gift cards:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    const requiredFields = ['issuerId', 'issuerType', 'cardCode', 'amount', 'expirationDate'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Check if card code is unique
    const existingCard = await giftCardService.getByCardCode(data.cardCode);
    if (existingCard) {
      return NextResponse.json(
        { error: 'Gift card code already exists' },
        { status: 400 }
      );
    }

    const giftCard = await giftCardService.create({
      ...data,
      isActive: true,
      isUsed: false,
      remainingAmount: data.amount,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return NextResponse.json({
      success: true,
      message: 'Gift card created successfully',
      giftCard
    });

  } catch (error) {
    console.error('Error creating gift card:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
