import { NextRequest, NextResponse } from 'next/server';
import { orderService, notificationService } from '@/lib/database';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const params = await context.params;
    const { orderId } = params;
    const { estimatedDeliveryTime, sellerId } = await request.json();

    // Validate required fields
    if (!orderId || !estimatedDeliveryTime || !sellerId) {
      return NextResponse.json(
        { error: 'Order ID, estimated delivery time, and seller ID are required' },
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

    // Update the order with new estimated delivery time
    const updateData = {
      estimatedDeliveryTime,
      updatedAt: new Date()
    };

    await orderService.update(orderId, updateData);

    // Create notification for customer about delivery time update
    if (existingOrder.customerId) {
      await notificationService.create({
        userId: existingOrder.customerId,
        title: 'Delivery Time Updated 🚚',
        message: `Your order #${existingOrder.orderNumber} estimated delivery time has been updated to: ${estimatedDeliveryTime}`,
        type: 'system',
        read: false
      });
    }

    // Get updated order
    const updatedOrder = await orderService.getById(orderId);

    return NextResponse.json({
      success: true,
      message: 'Delivery time updated successfully',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Error updating delivery time:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
