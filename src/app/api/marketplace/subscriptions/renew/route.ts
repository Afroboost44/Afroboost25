import { NextRequest, NextResponse } from 'next/server';
import { sellerApplicationService, marketplaceSettingsService } from '@/lib/database';
import { notificationService } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    // This would typically be called by a cron job or scheduled function
    // For now, it can be manually triggered or called from a webhook
    
    const allSellers = await sellerApplicationService.getAll();
    const approvedSellers = allSellers.filter(seller => seller.status === 'approved');
    const monthlySubscribers = approvedSellers.filter(seller => seller.subscriptionModel === 'monthly');
    
    const settings = await marketplaceSettingsService.get();
    
    for (const seller of monthlySubscribers) {
      try {
        // Get subscription price based on activity type
        const subscriptionPrice = settings?.subscriptionPrices?.[seller.activityType as keyof typeof settings.subscriptionPrices] || 29.99;
        
        // Here you would integrate with your payment system (Stripe, PayPal)
        // to charge the seller's saved payment method
        
        // For now, we'll create a notification about the renewal
        await notificationService.create({
          userId: seller.userId,
          title: 'Monthly Subscription Renewed',
          message: `Your monthly subscription of ${subscriptionPrice} CHF has been renewed successfully.`,
          type: 'payment',
          read: false
        });
        
        console.log(`Processed subscription renewal for seller: ${seller.fullName}`);
        
      } catch (error) {
        console.error(`Failed to process renewal for seller ${seller.id}:`, error);
        
        // Create notification about failed payment
        await notificationService.create({
          userId: seller.userId,
          title: 'Subscription Payment Failed',
          message: 'Your monthly subscription payment failed. Please update your payment method.',
          type: 'system',
          read: false
        });
      }
    }
    
    return NextResponse.json({ 
      message: 'Subscription renewals processed',
      processedCount: monthlySubscribers.length
    });
    
  } catch (error) {
    console.error('Error processing subscription renewals:', error);
    return NextResponse.json(
      { error: 'Failed to process subscription renewals' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return information about upcoming renewals
  try {
    const allSellers = await sellerApplicationService.getAll();
    const monthlySubscribers = allSellers.filter(seller => 
      seller.status === 'approved' && seller.subscriptionModel === 'monthly'
    );
    
    // Calculate next renewal dates (this would be based on actual subscription data)
    const renewalInfo = monthlySubscribers.map(seller => ({
      sellerId: seller.id,
      sellerName: seller.fullName,
      activityType: seller.activityType,
      // This would be calculated from actual subscription start date
      nextRenewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now as example
    }));
    
    return NextResponse.json({ 
      upcomingRenewals: renewalInfo,
      totalCount: renewalInfo.length
    });
    
  } catch (error) {
    console.error('Error fetching renewal information:', error);
    return NextResponse.json(
      { error: 'Failed to fetch renewal information' },
      { status: 500 }
    );
  }
}
