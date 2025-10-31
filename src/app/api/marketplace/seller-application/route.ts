import { NextRequest, NextResponse } from 'next/server';
import { sellerApplicationService, notificationService, userService } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const applicationData = await request.json();

    // Validate required fields
    const requiredFields = ['userId', 'fullName', 'address', 'phone', 'email', 'idDocumentUrl', 'activityType', 'businessDescription', 'businessCategory', 'subscriptionModel'];
    const missingFields = requiredFields.filter(field => !applicationData[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Create the application
    const applicationId = await sellerApplicationService.create({
      ...applicationData,
      status: 'pending'
    });

    // Notify admins about new application
    const admins = (await userService.getAll()).filter(user => user.role === 'admin' || user.role === 'superadmin');
    for (const admin of admins) {
      await notificationService.create({
        userId: admin.id,
        title: 'New Seller Application',
        message: `${applicationData.fullName} has submitted a seller application for ${applicationData.activityType}.`,
        type: 'system',
        read: false
      });
    }

    // Notify applicant
    await notificationService.create({
      userId: applicationData.userId,
      title: 'Application Submitted',
      message: 'Your seller application has been submitted and is under review. We\'ll notify you once it\'s processed.',
      type: 'system',
      read: false
    });

    return NextResponse.json({ 
      success: true, 
      applicationId,
      message: 'Application submitted successfully' 
    });

  } catch (error) {
    console.error('Error creating seller application:', error);
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    let applications;

    if (userId) {
      applications = await sellerApplicationService.getByUserId(userId);
    } else if (status === 'pending') {
      applications = await sellerApplicationService.getPending();
    } else {
      applications = await sellerApplicationService.getAll();
    }

    return NextResponse.json({ applications });

  } catch (error) {
    console.error('Error fetching seller applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}
