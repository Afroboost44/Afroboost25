import { NextRequest, NextResponse } from 'next/server';
import { productService, sellerProfileService, productCategoryService, notificationService } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const productData = await request.json();

    // Validate required fields
    const requiredFields = ['sellerId', 'name', 'description', 'categoryId', 'price', 'currency', 'serviceType'];
    const missingFields = requiredFields.filter(field => !productData[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Ensure images is an array (can be empty)
    if (!Array.isArray(productData.images)) {
      productData.images = [];
    }

    // Ensure imageLinks is an array (can be empty)
    if (!Array.isArray(productData.imageLinks)) {
      productData.imageLinks = [];
    }

    // Ensure videoLinks is an array (can be empty)  
    if (!Array.isArray(productData.videoLinks)) {
      productData.videoLinks = [];
    }

    // Verify seller exists and is active
    const sellerProfile = await sellerProfileService.getByUserId(productData.sellerId);
    if (!sellerProfile || !sellerProfile.isActive) {
      return NextResponse.json(
        { error: 'Seller not found or inactive' },
        { status: 404 }
      );
    }

    // Verify category exists or create a default one
    let category = await productCategoryService.getById(productData.categoryId);
    if (!category) {
      // If category doesn't exist, try to find by name or create a default mapping
      const categoryMappings: Record<string, { name: string, description: string }> = {
        'sports-equipment': { name: 'Sports Equipment', description: 'Sports gear and equipment' },
        'sports-nutrition': { name: 'Sports Nutrition', description: 'Sports supplements and nutrition' },
        'dance-equipment': { name: 'Dance Equipment', description: 'Dance shoes, costumes, and accessories' },
        'food-beverages': { name: 'Food & Beverages', description: 'Healthy meals and beverages' },
        'fitness-apparel': { name: 'Fitness Apparel', description: 'Workout clothes and accessories' },
        'training-materials': { name: 'Training Materials', description: 'Training books and resources' }
      };

      const categoryInfo = categoryMappings[productData.categoryId];
      if (categoryInfo) {
        // Create the category
        const categoryId = await productCategoryService.create({
          name: categoryInfo.name,
          description: categoryInfo.description,
          isActive: true,
          sortOrder: 0,
          createdBy: productData.sellerId
        });
        // Get the created category with all required fields
        category = await productCategoryService.getById(categoryId);
      } else {
        return NextResponse.json(
          { error: 'Category not found' },
          { status: 404 }
        );
      }
    }

    // At this point, category should definitely exist
    if (!category) {
      return NextResponse.json(
        { error: 'Failed to resolve category' },
        { status: 500 }
      );
    }

    // Create the product
    const productId = await productService.create({
      ...productData,
      sellerName: sellerProfile.businessName,
      businessName: sellerProfile.businessName,
      categoryName: category.name,
      mainImage: productData.images[0] || '',
      stock: productData.isUnlimitedStock ? 999999 : (productData.stock || 0),
      minOrderQuantity: productData.minOrderQuantity || 1,
      isActive: true,
      isFeatured: false
    });

    // Notify seller
    await notificationService.create({
      userId: productData.sellerId,
      title: 'Product Added Successfully',
      message: `Your product "${productData.name}" has been added to the marketplace.`,
      type: 'system',
      read: false
    });

    return NextResponse.json({ 
      success: true, 
      productId,
      message: 'Product created successfully' 
    });

  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get('sellerId');
    const categoryId = searchParams.get('categoryId');
    const featured = searchParams.get('featured');
    const search = searchParams.get('search');
    const active = searchParams.get('active');

    let products;

    if (search) {
      products = await productService.search(search);
    } else if (sellerId) {
      products = await productService.getBySeller(sellerId);
    } else if (categoryId) {
      products = await productService.getByCategory(categoryId);
    } else if (featured === 'true') {
      products = await productService.getFeatured();
    } else if (active === 'true') {
      products = await productService.getActive();
    } else {
      products = await productService.getAll();
    }

    return NextResponse.json({ products });

  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
