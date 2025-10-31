import { NextRequest, NextResponse } from 'next/server';
import { query, where, getDocs, collection, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ coachId: string }> }
) {
  try {
    const { coachId } = await context.params;

    if (!coachId) {
      return NextResponse.json(
        { error: 'Coach ID is required' },
        { status: 400 }
      );
    }

    // Get coach's discount cards
    const discountCardsQuery = query(
      collection(db, 'discount_cards'),
      where('coachId', '==', coachId)
    );
    
    const querySnapshot = await getDocs(discountCardsQuery);
    const discountCards = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convert Firestore timestamps to dates
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      expirationDate: doc.data().expirationDate?.toDate() || null
    }));

    // Sort by creation date (newest first)
    discountCards.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return NextResponse.json({
      success: true,
      discountCards
    });

  } catch (error) {
    console.error('Error fetching discount cards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch discount cards' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ coachId: string }> }
) {
  try {
    const { coachId } = await context.params;
    const body = await request.json();
    const { cardId, isActive, title, description, expirationDate, usageLimit } = body;

    if (!cardId) {
      return NextResponse.json(
        { error: 'Card ID is required' },
        { status: 400 }
      );
    }

    // Update the discount card
    const updateData: any = {
      updatedAt: new Date()
    };

    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (expirationDate) updateData.expirationDate = new Date(expirationDate);
    if (usageLimit !== undefined) updateData.usageLimit = usageLimit;

    await updateDoc(doc(db, 'discount_cards', cardId), updateData);

    return NextResponse.json({
      success: true,
      message: 'Discount card updated successfully'
    });

  } catch (error) {
    console.error('Error updating discount card:', error);
    return NextResponse.json(
      { error: 'Failed to update discount card' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ coachId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const cardId = searchParams.get('cardId');

    if (!cardId) {
      return NextResponse.json(
        { error: 'Card ID is required' },
        { status: 400 }
      );
    }

    // Delete the discount card
    await deleteDoc(doc(db, 'discount_cards', cardId));

    return NextResponse.json({
      success: true,
      message: 'Discount card deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting discount card:', error);
    return NextResponse.json(
      { error: 'Failed to delete discount card' },
      { status: 500 }
    );
  }
}