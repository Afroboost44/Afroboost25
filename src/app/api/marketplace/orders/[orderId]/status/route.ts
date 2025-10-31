import { NextRequest, NextResponse } from 'next/server';
import { orderService, notificationService } from '@/lib/database';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const params = await context.params;
    const { orderId } = params;
    const { status, sellerId, sellerNotes } = await request.json();

    // Validate required fields
    if (!orderId || !status || !sellerId) {
      return NextResponse.json(
        { error: 'Order ID, status, and seller ID are required' },
        { status: 400 }
      );
    }

    // Get the existing order
    const existingOrder = await orderService.getById(orderId);
    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Verify the seller owns this order
    if (existingOrder.sellerId !== sellerId) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only update your own orders' },
        { status: 403 }
      );
    }

    // Update the order status
    const updateData: any = {
      orderStatus: status,
      updatedAt: new Date()
    };

    if (sellerNotes) {
      updateData.sellerNotes = sellerNotes;
    }

    await orderService.update(orderId, updateData);

    // Create notification for customer
    let notificationTitle = '';
    let notificationMessage = '';
    
    switch (status) {
      case 'confirmed':
        notificationTitle = 'Order Confirmed ✅';
        notificationMessage = `Your order #${existingOrder.orderNumber} has been confirmed and is being prepared.`;
        break;
      case 'preparing':
        notificationTitle = 'Order Being Prepared 👨‍🍳';
        notificationMessage = `Your order #${existingOrder.orderNumber} is now being prepared.`;
        break;
      case 'dispatched':
        notificationTitle = 'Order Dispatched 🚚';
        notificationMessage = `Your order #${existingOrder.orderNumber} has been dispatched and is on its way!`;
        break;
      case 'delivered':
        notificationTitle = 'Order Delivered 📦';
        notificationMessage = `Your order #${existingOrder.orderNumber} has been delivered. Thank you for your business!`;
        break;
      case 'cancelled':
        notificationTitle = 'Order Cancelled ❌';
        notificationMessage = `Your order #${existingOrder.orderNumber} has been cancelled.`;
        break;
    }

    if (notificationTitle) {
      await notificationService.create({
        userId: existingOrder.customerId,
        title: notificationTitle,
        message: notificationMessage,
        type: 'system',
        read: false
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Order status updated successfully' 
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { error: 'Failed to update order status' },
      { status: 500 }
    );
  }
}
