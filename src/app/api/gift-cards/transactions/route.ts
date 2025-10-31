import { NextRequest, NextResponse } from 'next/server';
import { giftCardTransactionService } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const issuerId = searchParams.get('issuerId');

    if (!issuerId) {
      return NextResponse.json(
        { error: 'Issuer ID is required' },
        { status: 400 }
      );
    }

    const transactions = await giftCardTransactionService.getByIssuer(issuerId);

    return NextResponse.json({
      success: true,
      transactions
    });

  } catch (error) {
    console.error('Error fetching gift card transactions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
