import { NextRequest, NextResponse } from 'next/server';
import { productCategoryService } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const categoryData = await request.json();

    // Validate required fields
    const requiredFields = ['name', 'createdBy'];
    const missingFields = requiredFields.filter(field => !categoryData[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    const categoryId = await productCategoryService.create({
      ...categoryData,
      isActive: true,
      sortOrder: categoryData.sortOrder || 0
    });

    return NextResponse.json({ 
      success: true, 
      categoryId,
      message: 'Category created successfully' 
    });

  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    const parentId = searchParams.get('parentId');

    let categories;

    if (parentId) {
      categories = await productCategoryService.getByParent(parentId);
    } else if (active === 'true') {
      categories = await productCategoryService.getActive();
    } else {
      categories = await productCategoryService.getAll();
    }

    return NextResponse.json({ categories });

  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, ...updateData } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }

    await productCategoryService.update(id, updateData);

    return NextResponse.json({ 
      success: true,
      message: 'Category updated successfully' 
    });

  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }

    await productCategoryService.delete(id);

    return NextResponse.json({ 
      success: true,
      message: 'Category deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}
