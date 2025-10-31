import { NextRequest, NextResponse } from 'next/server';
import { productService, sellerProfileService } from '@/lib/database';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const { id } = params;
    const product = await productService.getById(id);

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Increment views
    await productService.incrementViews(id);

    return NextResponse.json({ product });

  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const { id } = params;
    const updateData = await request.json();
    const { sellerId } = updateData;

    const product = await productService.getById(id);
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    console.log(sellerId)
    // Verify seller owns this product
    if (product.sellerId !== sellerId) {
      return NextResponse.json(
        { error: 'Unauthorized: You can only update your own products' },
        { status: 403 }
      );
    }

    // Update the product
    await productService.update(id, updateData);

    return NextResponse.json({ 
      success: true,
      message: 'Product updated successfully' 
    });

  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get('sellerId');

    const product = await productService.getById(id);
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    await productService.delete(id);

    return NextResponse.json({ 
      success: true,
      message: 'Product deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
