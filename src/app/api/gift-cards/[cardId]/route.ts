import { NextRequest, NextResponse } from 'next/server';
import { giftCardService } from '@/lib/database';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ cardId: string }> }
) {
  try {
    const { cardId } = await context.params;
    const body = await request.json();
    const { issuerId } = body;

    if (!cardId) {
      return NextResponse.json(
        { error: 'Card ID is required' },
        { status: 400 }
      );
    }

    if (!issuerId) {
      return NextResponse.json(
        { error: 'Issuer ID is required' },
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

    // Verify that the user is the issuer of this card
    if (giftCard.issuerId !== issuerId) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this gift card' },
        { status: 403 }
      );
    }

    // Delete the gift card directly using deleteDoc
    const docRef = doc(db, 'giftCards', cardId);
    await deleteDoc(docRef);

    return NextResponse.json({
      success: true,
      message: 'Gift card deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting gift card:', error);
    return NextResponse.json(
      { error: 'Failed to delete gift card' },
      { status: 500 }
    );
  }
}