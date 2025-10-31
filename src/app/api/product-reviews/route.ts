import { NextRequest, NextResponse } from 'next/server';
import { productReviewService, orderService, productService, userService } from '@/lib/database';

// GET - Get all reviews or reviews for a specific product
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const customerId = searchParams.get('customerId');
    const sellerId = searchParams.get('sellerId');

    if (productId) {
      const reviews = await productReviewService.getByProduct(productId);
      return NextResponse.json(reviews);
    }

    if (customerId) {
      const reviews = await productReviewService.getByCustomer(customerId);
      return NextResponse.json(reviews);
    }

    if (sellerId) {
      const reviews = await productReviewService.getBySeller(sellerId);
      return NextResponse.json(reviews);
    }

    const reviews = await productReviewService.getAll();
    return NextResponse.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

// POST - Create a new review
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId, orderId, customerId, rating, comment, images } = await request.json();

    // Validate required fields
    if (!productId || !orderId || !customerId || !rating) {
      return NextResponse.json({ 
        error: 'Product ID, Order ID, Customer ID, and rating are required' 
      }, { status: 400 });
    }

    // Verify that the user has purchased this product
    const order = await orderService.getById(orderId);
    if (!order || order.customerId !== customerId) {
      return NextResponse.json({ 
        error: 'You can only review products you have purchased' 
      }, { status: 403 });
    }

    // Check if the product is in the order
    console.log('Order items:', order.items);
    const hasProduct = order.items && Object.values(order.items).some(item => item.productId === productId);
    if (!hasProduct) {
      return NextResponse.json({ 
        error: 'Product not found in your order' 
      }, { status: 403 });
    }

    // Check if already reviewed
    const existingReviews = await productReviewService.getByProduct(productId);
    const alreadyReviewed = existingReviews.some(
      review => review.customerId === customerId && review.orderId === orderId
    );
    
    if (alreadyReviewed) {
      return NextResponse.json({ 
        error: 'You have already reviewed this product from this order' 
      }, { status: 400 });
    }

    // Get product and customer info
    const product = await productService.getById(productId);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const customer = await userService.getById(customerId);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Create review
    const reviewId = await productReviewService.create({
      productId,
      orderId,
      customerId,
      customerName: `${customer.firstName} ${customer.lastName}`.trim() || customer.email,
      sellerId: product.sellerId,
      rating,
      comment: comment || '',
      images: images || [],
      isVerifiedPurchase: true,
      isModerated: false,
      helpfulVotes: 0
    });

    return NextResponse.json({ 
      success: true, 
      reviewId 
    });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}

// PUT - Update helpful votes for a review
export async function PUT(request: NextRequest) {
  try {
    const { reviewId, action } = await request.json();

    if (!reviewId || !action) {
      return NextResponse.json({ 
        error: 'Review ID and action are required' 
      }, { status: 400 });
    }

    if (action === 'helpful') {
      await productReviewService.addHelpfulVote(reviewId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating review:', error);
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 });
  }
}
