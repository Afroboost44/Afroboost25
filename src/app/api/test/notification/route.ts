import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, title, message, type = 'system' } = body;

    if (!userId || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, title, message' },
        { status: 400 }
      );
    }

    // Create notification (this will automatically trigger email if enabled)
    const notificationId = await notificationService.create({
      userId,
      title,
      message,
      type,
      read: false
    });

    return NextResponse.json({
      success: true,
      notificationId,
      message: 'Notification created successfully'
    });

  } catch (error) {
    console.error('Error creating test notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test notification endpoint',
    usage: 'POST with userId, title, message, and optional type',
    example: {
      userId: 'rihabrabbani16@gmail.com',
      title: 'Test Notification',
      message: 'This is a test notification to verify email functionality',
      type: 'system'
    }
  });
}
