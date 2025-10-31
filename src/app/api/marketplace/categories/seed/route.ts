import { NextRequest, NextResponse } from 'next/server';
import { productCategoryService } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    // Check if categories already exist
    const existingCategories = await productCategoryService.getAll();
    if (existingCategories.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Categories already exist',
        categories: existingCategories
      });
    }

    // Create default categories
    const defaultCategories = [
      {
        name: 'Sports Equipment',
        description: 'Sports gear, equipment, and accessories',
        icon: '🏈',
        isActive: true,
        sortOrder: 1,
        createdBy: 'system'
      },
      {
        name: 'Sports Nutrition',
        description: 'Supplements, protein powders, and sports nutrition',
        icon: '💪',
        isActive: true,
        sortOrder: 2,
        createdBy: 'system'
      },
      {
        name: 'Dance Equipment',
        description: 'Dance shoes, costumes, and accessories',
        icon: '💃',
        isActive: true,
        sortOrder: 3,
        createdBy: 'system'
      },
      {
        name: 'Food & Beverages',
        description: 'Healthy meals, snacks, and beverages',
        icon: '🍎',
        isActive: true,
        sortOrder: 4,
        createdBy: 'system'
      },
      {
        name: 'Fitness Apparel',
        description: 'Workout clothes, shoes, and accessories',
        icon: '👕',
        isActive: true,
        sortOrder: 5,
        createdBy: 'system'
      },
      {
        name: 'Training Materials',
        description: 'Books, videos, and training resources',
        icon: '📚',
        isActive: true,
        sortOrder: 6,
        createdBy: 'system'
      }
    ];

    const createdCategories = [];
    for (const category of defaultCategories) {
      const categoryId = await productCategoryService.create(category);
      createdCategories.push({ id: categoryId, ...category });
    }

    return NextResponse.json({
      success: true,
      message: 'Default categories created successfully',
      categories: createdCategories
    });

  } catch (error) {
    console.error('Error seeding categories:', error);
    return NextResponse.json(
      { error: 'Failed to seed categories' },
      { status: 500 }
    );
  }
}
