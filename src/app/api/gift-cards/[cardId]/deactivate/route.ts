import { NextRequest, NextResponse } from 'next/server';
import { giftCardService } from '@/lib/database';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ cardId: string }> }
) {
  try {
    const params = await context.params;
    const { cardId } = params;
    const { issuerId } = await request.json();

    if (!cardId || !issuerId) {
      return NextResponse.json(
        { error: 'Card ID and issuer ID are required' },
        { status: 400 }
      );
    }

    // Get the gift card to verify ownership
    const giftCard = await giftCardService.getById(cardId);
    if (!giftCard) {
      return NextResponse.json(
        { error: 'Gift card not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (giftCard.issuerId !== issuerId) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only deactivate your own gift cards' },
        { status: 403 }
      );
    }

    // Deactivate the gift card
    await giftCardService.deactivate(cardId);

    return NextResponse.json({
      success: true,
      message: 'Gift card deactivated successfully'
    });

  } catch (error) {
    console.error('Error deactivating gift card:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
