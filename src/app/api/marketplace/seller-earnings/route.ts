import { NextRequest, NextResponse } from 'next/server';
import { sellerEarningsService, orderService, sellerProfileService } from '@/lib/database';
import { SellerEarnings } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get('sellerId');

    if (!sellerId) {
      return NextResponse.json(
        { error: 'Seller ID is required' },
        { status: 400 }
      );
    }

    // Try to get existing earnings record
    let earnings = await sellerEarningsService.getBySeller(sellerId);

    // If no earnings record exists, calculate from orders and create one
    if (!earnings) {
      const orders = await orderService.getAll();
      const sellerOrders = orders.filter(order => order.sellerId === sellerId && order.orderStatus === 'delivered');
      
      const totalRevenue = sellerOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      const totalOrders = sellerOrders.length;
      
      // Get seller profile to determine commission rate
      const profiles = await sellerProfileService.getAll();
      const profile = profiles.find(p => p.userId === sellerId);
      const commissionRate = profile?.commissionRate || 0;
      const subscriptionPrice = profile?.monthlySubscriptionPrice || 0;
      
      // Calculate fees and net earnings
      const commissionFees = profile?.subscriptionModel === 'commission' ? (totalRevenue * commissionRate / 100) : 0;
      const subscriptionFees = profile?.subscriptionModel === 'monthly' ? subscriptionPrice : 0;
      const netEarnings = totalRevenue - commissionFees - subscriptionFees;
      
      // Create earnings record
      const earningsData: Omit<SellerEarnings, 'id' | 'createdAt' | 'updatedAt'> = {
        sellerId,
        sellerName: profile?.businessName || '',
        businessName: profile?.businessName || '',
        totalRevenue,
        totalOrders,
        subscriptionFees,
        commissionFees,
        netEarnings,
        availableBalance: netEarnings, // Assuming no payouts yet
        totalWithdrawn: 0,
        subscriptionModel: profile?.subscriptionModel || 'commission',
        monthlySubscriptionPrice: subscriptionPrice,
        commissionRate,
        lastCalculatedAt: new Date()
      };

      const earningsId = await sellerEarningsService.create(earningsData);
      earnings = await sellerEarningsService.getById(earningsId);
    }

    return NextResponse.json({
      success: true,
      earnings
    });

  } catch (error) {
    console.error('Error fetching seller earnings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch seller earnings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get('sellerId');
    const updateData = await request.json();

    if (!sellerId) {
      return NextResponse.json(
        { error: 'Seller ID is required' },
        { status: 400 }
      );
    }

    // Get existing earnings record
    const earnings = await sellerEarningsService.getBySeller(sellerId);

    if (!earnings) {
      return NextResponse.json(
        { error: 'Seller earnings record not found' },
        { status: 404 }
      );
    }

    // Update the earnings record
    const updatedEarnings = await sellerEarningsService.update(earnings.id, {
      ...updateData,
      updatedAt: new Date()
    });

    return NextResponse.json({
      success: true,
      earnings: updatedEarnings
    });

  } catch (error) {
    console.error('Error updating seller earnings:', error);
    return NextResponse.json(
      { error: 'Failed to update seller earnings' },
      { status: 500 }
    );
  }
}
