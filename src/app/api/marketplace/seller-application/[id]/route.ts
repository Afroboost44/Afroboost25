import { NextRequest, NextResponse } from 'next/server';
import { sellerApplicationService } from '@/lib/database';

export async function DELETE(
  _: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id: applicationId } = params;

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      );
    }

    // Delete the seller application
    await sellerApplicationService.delete(applicationId);

    return NextResponse.json({ 
      success: true,
      message: 'Seller application deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting seller application:', error);
    return NextResponse.json(
      { error: 'Failed to delete application' },
      { status: 500 }
    );
  }
}
