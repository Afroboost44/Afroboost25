import { NextRequest, NextResponse } from 'next/server';
import { productVariantTypeService } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const sellerId = url.searchParams.get('sellerId');
    const productCategory = url.searchParams.get('productCategory');
    const type = url.searchParams.get('type');

    if (!sellerId) {
      return NextResponse.json(
        { error: 'sellerId is required' },
        { status: 400 }
      );
    }

    let variantTypes;
    
    if (productCategory) {
      // Get variant types for specific seller and product category
      variantTypes = await productVariantTypeService.getBySellerAndCategory(sellerId, productCategory);
    } else if (type) {
      // Get variant types for specific seller and type
      variantTypes = await productVariantTypeService.getBySellerAndType(sellerId, type as any);
    } else {
      // Get all variant types for specific seller
      variantTypes = await productVariantTypeService.getBySeller(sellerId);
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
      variantTypes: normalizedVariantTypes
    });
  } catch (error) {
    console.error('Error fetching variant types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch variant types' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const variantTypeData = await request.json();

    // Validate required fields
    if (!variantTypeData.sellerId || !variantTypeData.sellerName) {
      return NextResponse.json(
        { error: 'sellerId and sellerName are required' },
        { status: 400 }
      );
    }

    // Create new variant type
    const variantTypeId = await productVariantTypeService.create(variantTypeData);

    return NextResponse.json({
      success: true,
      variantTypeId
    });
  } catch (error) {
    console.error('Error creating variant type:', error);
    return NextResponse.json(
      { error: 'Failed to create variant type' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, updateData } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Variant type ID is required' },
        { status: 400 }
      );
    }

    await productVariantTypeService.update(id, updateData);

    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error('Error updating variant type:', error);
    return NextResponse.json(
      { error: 'Failed to update variant type' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Variant type ID is required' },
        { status: 400 }
      );
    }

    await productVariantTypeService.delete(id);

    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error('Error deleting variant type:', error);
    return NextResponse.json(
      { error: 'Failed to delete variant type' },
      { status: 500 }
    );
  }
}
