// Support PUT requests in addition to POST
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  // Reuse the POST handler logic for PUT requests
  return await POST(request, context);
}
import { NextRequest, NextResponse } from 'next/server';
import { sellerApplicationService, sellerProfileService, notificationService, userService, marketplaceSettingsService } from '@/lib/database';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const { id } = params;
    const { action, processedBy, adminNotes, rejectionReason } = await request.json();

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be approve or reject' },
        { status: 400 }
      );
    }

    const application = await sellerApplicationService.getById(id);
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    if (action === 'approve') {
      // Approve the application
      await sellerApplicationService.approve(id, processedBy, adminNotes);

      // Get marketplace settings for commission/subscription rates
      const marketplaceSettings = await marketplaceSettingsService.get();
      const commissionRate = marketplaceSettings?.commissionRates[application.activityType] || 10;
      const subscriptionPrice = marketplaceSettings?.subscriptionPrices?.[application?.activityType] ?? 29.99;

      // Create seller profile
      const sellerProfileData = {
        userId: application.userId,
        applicationId: id,
        businessName: application.businessName || `${application.fullName}'s Business`,
        businessDescription: application.businessDescription,
        businessCategory: application.businessCategory,
        activityType: application.activityType,
        country: 'Switzerland', // Default, can be extracted from address
        address: application.address,
        phone: application.phone,
        email: application.email,
        subscriptionModel: application.subscriptionModel,
        monthlySubscriptionPrice: application.subscriptionModel === 'monthly' ? subscriptionPrice : 0,
        commissionRate: application.subscriptionModel === 'commission' ? commissionRate : 0,
        vatRate: 7.7, // Swiss VAT rate
        isActive: true,
        totalSales: 0,
        totalOrders: 0,
        rating: 0,
        reviewCount: 0,
        subscriptionStatus: 'active' as const,
        nextPaymentDate: application.subscriptionModel === 'monthly' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : undefined,
        bankDetails: application.bankDetails,
        socialMediaLinks: application.socialMediaLinks
      };

      await sellerProfileService.create(sellerProfileData);

      // Notify applicant of approval
      await notificationService.create({
        userId: application.userId,
        title: 'Seller Application Approved! 🎉',
        message: `Congratulations! Your seller application has been approved. You can now access your seller dashboard and start adding products.`,
        type: 'system',
        read: false
      });

    } else {
      // Reject the application
      await sellerApplicationService.reject(id, processedBy, rejectionReason, adminNotes);

      // Notify applicant of rejection
      await notificationService.create({
        userId: application.userId,
        title: 'Seller Application Update',
        message: `Unfortunately, your seller application has been rejected. ${rejectionReason || 'Please contact support for more information.'}`,
        type: 'system',
        read: false
      });
    }

    return NextResponse.json({ 
      success: true,
      message: `Application ${action}d successfully`
    });

  } catch (error) {
    console.error('Error processing seller application:', error);
    return NextResponse.json(
      { error: 'Failed to process application' },
      { status: 500 }
    );
  }
}
