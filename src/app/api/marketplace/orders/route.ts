import { NextRequest, NextResponse } from 'next/server';
import { orderService, productService, productVariantService, sellerEarningsService, deliveryTrackingService, notificationService } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const orderData = await request.json();

    // Validate required fields
    const requiredFields = ['customerId', 'customerName', 'customerEmail', 'sellerId', 'items', 'paymentMethod', 'paymentId', 'deliveryType'];
    const missingFields = requiredFields.filter(field => !orderData[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Generate order number
    const orderNumber = `AFB${Date.now().toString().slice(-6)}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // Calculate totals
    let subtotal = 0;
    const processedItems = [];

    for (const item of orderData.items) {
      const product = await productService.getById(item.productId);
      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.productId} not found` },
          { status: 404 }
        );
      }

      let effectivePrice = product.salePrice || product.price;
      let effectiveStock = product.stock;
      let variant = null;

      // Handle variant if specified
      if (item.variantId) {
        variant = await productVariantService.getById(item.variantId);
        if (!variant) {
          return NextResponse.json(
            { error: `Product variant ${item.variantId} not found` },
            { status: 404 }
          );
        }
        effectivePrice = variant.salePrice || variant.price;
        effectiveStock = variant.stock;
      }

      // Check stock availability
      if (!product.isUnlimitedStock && effectiveStock < item.quantity) {
        const productDisplayName = variant 
          ? `${product.name} (${item.variantDetails?.displayText})` 
          : product.name;
        return NextResponse.json(
          { error: `Insufficient stock for ${productDisplayName}` },
          { status: 400 }
        );
      }

      const itemSubtotal = effectivePrice * item.quantity;
      subtotal += itemSubtotal;

      processedItems.push({
        id: uuidv4(),
        productId: item.productId,
        productName: product.name,
        productImage: product.mainImage,
        price: effectivePrice,
        quantity: item.quantity,
        subtotal: itemSubtotal,
        // Include variant information
        ...(variant && {
          variantId: variant.id,
          variantSku: variant.sku,
          variantDetails: item.variantDetails
        }),
        selectedOptions: item.selectedOptions,
        specialInstructions: item.specialInstructions
      });

      // Update stock (variant or product)
      if (!product.isUnlimitedStock) {
        if (variant) {
          await productVariantService.updateStock(variant.id, variant.stock - item.quantity);
        } else {
          await productService.updateStock(product.id, product.stock - item.quantity);
        }
      }

      // Update total sold
      await productService.update(product.id, { totalSold: product.totalSold + item.quantity });
    }

    // Calculate delivery fee and VAT
    const deliveryFee = orderData.deliveryFee || 0;
    const vatRate = orderData.vatRate || 7.7;
    const vatAmount = (subtotal + deliveryFee) * (vatRate / 100);
    const totalAmount = subtotal + deliveryFee + vatAmount;

    // Create the order
    const orderId = await orderService.create({
      orderNumber,
      customerId: orderData.customerId,
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail,
      customerPhone: orderData.customerPhone || '',
      sellerId: orderData.sellerId,
      sellerName: orderData.sellerName,
      businessName: orderData.businessName,
      items: processedItems,
      subtotal,
      deliveryFee,
      vatAmount,
      vatRate,
      totalAmount,
      currency: orderData.currency || 'CHF',
      paymentMethod: orderData.paymentMethod,
      paymentId: orderData.paymentId,
      paymentStatus: 'completed',
      orderStatus: 'processing',
      deliveryType: orderData.deliveryType,
      deliveryAddress: orderData.deliveryAddress,
      estimatedDeliveryTime: orderData.estimatedDeliveryTime,
      notes: orderData.notes
    });

    // Process seller earnings
    await sellerEarningsService.processOrderEarning(
      orderData.sellerId,
      orderId,
      totalAmount,
      10 // Default commission rate, should come from marketplace settings
    );

    // Create delivery tracking if it's a delivery
    if (orderData.deliveryType === 'delivery') {
      const trackingNumber = `TRK${Date.now().toString().slice(-8).toUpperCase()}`;
      await deliveryTrackingService.create({
        orderId,
        customerId: orderData.customerId,
        sellerId: orderData.sellerId,
        trackingNumber,
        status: 'processing',
        estimatedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
        deliveryAddress: orderData.deliveryAddress?.address || '',
        trackingEvents: [{
          id: Date.now().toString(),
          status: 'processing',
          description: 'Order received and being processed',
          timestamp: new Date()
        }]
      });
    }

    // Notify seller
    await notificationService.create({
      userId: orderData.sellerId,
      title: 'New Order Received! 🛒',
      message: `You have received a new order #${orderNumber} from ${orderData.customerName}. Total: ${totalAmount.toFixed(2)} CHF`,
      type: 'system',
      read: false
    });

    // Notify customer
    await notificationService.create({
      userId: orderData.customerId,
      title: 'Order Confirmed 📦',
      message: `Your order #${orderNumber} has been confirmed and is being processed. Total: ${totalAmount.toFixed(2)} CHF`,
      type: 'system',
      read: false
    });

    return NextResponse.json({ 
      success: true, 
      orderId,
      orderNumber,
      totalAmount,
      message: 'Order placed successfully' 
    });

  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const sellerId = searchParams.get('sellerId');
    const status = searchParams.get('status');

    let orders;

    if (customerId) {
      orders = await orderService.getByCustomer(customerId);
    } else if (sellerId) {
      orders = await orderService.getBySeller(sellerId);
    } else if (status) {
      orders = await orderService.getByStatus(status);
    } else {
      orders = await orderService.getAll();
    }

    return NextResponse.json({ orders });

  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
