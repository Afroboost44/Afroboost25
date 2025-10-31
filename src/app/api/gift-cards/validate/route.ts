import { NextRequest, NextResponse } from 'next/server';
import { giftCardService } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { cardCode, amount, customerId, customerName, businessId, orderId, bookingId, transactionType } = await request.json();

    // Validate required fields
    if (!cardCode || !amount || !customerId || !customerName) {
      return NextResponse.json(
        { error: 'Card code, amount, customer ID, and customer name are required' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Validate transaction type for proper cross-checking
    if (!transactionType || !['course', 'product', 'token'].includes(transactionType)) {
      return NextResponse.json(
        { error: 'Valid transaction type is required (course, product, token)' },
        { status: 400 }
      );
    }

    // Validate and use the gift card with transaction type
    const result = await giftCardService.validateAndUse(
      cardCode, 
      amount, 
      customerId, 
      customerName,
      businessId,
      orderId, 
      bookingId,
      transactionType
    );


    return NextResponse.json({
      success: true,
      message: 'Gift card validated and used successfully',
      ...result
    });

  } catch (error: any) {
    console.error('Error validating gift card:', error);
    
    // Return specific error messages for gift card validation
    if (error.message.includes('not found') || 
        error.message.includes('not active') || 
        error.message.includes('expired') || 
        error.message.includes('used') ||
        error.message.includes('balance') ||
        error.message.includes('can only be used with')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
