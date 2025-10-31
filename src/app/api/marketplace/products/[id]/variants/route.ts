import { NextRequest, NextResponse } from 'next/server';
import { productVariantService, productVariantTypeService, productService } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;

    // Get the product to determine seller and category
    const product = await productService.getById(productId);
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Get product variants
    const variants = await productVariantService.getByProduct(productId);

    // Get variant types specific to this seller and product category
    let variantTypes;
    if (product.categoryName) {
      variantTypes = await productVariantTypeService.getBySellerAndCategory(
        product.sellerId, 
        product.categoryName.toLowerCase()
      );
    } else {
      // Fallback to all variant types for this seller
      variantTypes = await productVariantTypeService.getBySeller(product.sellerId);
    }

    // Normalize variant types data (convert Firestore objects to arrays)
    const normalizedVariantTypes = variantTypes.map(vt => ({
      ...vt,
      options: Array.isArray(vt.options) ? vt.options : Object.values(vt.options || {}),
      productCategories: Array.isArray(vt.productCategories) 
        ? vt.productCategories 
        : Object.values(vt.productCategories || {})
    }));

    return NextResponse.json({
      success: true,
      variants,
      variantTypes: normalizedVariantTypes,
      product: {
        id: product.id,
        sellerId: product.sellerId,
        categoryName: product.categoryName
      }
    });
  } catch (error) {
    console.error('Error fetching product variants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product variants' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const { variants } = await request.json();

    // Validate product exists
    const product = await productService.getById(productId);
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Delete existing variants
    await productVariantService.deleteByProduct(productId);

    // Create new variants
    const createdVariants = [];
    for (const variantData of variants) {
      const variantId = await productVariantService.create({
        ...variantData,
        productId
      });
      createdVariants.push(variantId);
    }

    // Update product to indicate it has variants
    await productService.update(productId, {
      hasVariants: variants.length > 0
    });

    return NextResponse.json({
      success: true,
      variantIds: createdVariants
    });
  } catch (error) {
    console.error('Error creating product variants:', error);
    return NextResponse.json(
      { error: 'Failed to create product variants' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const { variantId, updateData } = await request.json();

    // Update specific variant
    await productVariantService.update(variantId, updateData);

    return NextResponse.json({
      success: true,
      message: 'Variant updated successfully'
    });
  } catch (error) {
    console.error('Error updating product variant:', error);
    return NextResponse.json(
      { error: 'Failed to update product variant' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const url = new URL(request.url);
    const variantId = url.searchParams.get('variantId');

    if (variantId) {
      // Delete specific variant
      await productVariantService.delete(variantId);
    } else {
      // Delete all variants for product
      await productVariantService.deleteByProduct(productId);
      
      // Update product to indicate it has no variants
      await productService.update(productId, {
        hasVariants: false
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Variant(s) deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product variant:', error);
    return NextResponse.json(
      { error: 'Failed to delete product variant' },
      { status: 500 }
    );
  }
}
