import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, setDoc, updateDoc, deleteField, getDocs, query, where } from 'firebase/firestore';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user's wishlist
    const wishlistRef = doc(db, 'wishlists', userId);
    const wishlistDoc = await getDoc(wishlistRef);

    if (!wishlistDoc.exists()) {
      return NextResponse.json({ wishlist: [] });
    }

    const wishlistData = wishlistDoc.data();
    const productIds = wishlistData?.products || [];

    // Get product details for wishlist items
    if (productIds.length === 0) {
      return NextResponse.json({ wishlist: [] });
    }

    const products = [];
    for (const productId of productIds) {
      const productDoc = await getDoc(doc(db, 'products', productId));
      if (productDoc.exists()) {
        products.push({ id: productDoc.id, ...productDoc.data() });
      }
    }

    return NextResponse.json({ wishlist: products });
  } catch (error) {
    console.error('Error fetching wishlist:', error);
    return NextResponse.json({ error: 'Failed to fetch wishlist' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, productId, action } = await request.json();

    if (!userId || !productId) {
      return NextResponse.json({ error: 'User ID and Product ID are required' }, { status: 400 });
    }

    const wishlistRef = doc(db, 'wishlists', userId);
    const wishlistDoc = await getDoc(wishlistRef);

    let currentProducts = [];
    if (wishlistDoc.exists()) {
      currentProducts = wishlistDoc.data()?.products || [];
    }

    if (action === 'add') {
      // Add product to wishlist if not already present
      if (!currentProducts.includes(productId)) {
        currentProducts.push(productId);
      }
    } else if (action === 'remove') {
      // Remove product from wishlist
      currentProducts = currentProducts.filter((id: string) => id !== productId);
    }

    // Update wishlist
    await setDoc(wishlistRef, {
      products: currentProducts,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return NextResponse.json({ 
      success: true, 
      isInWishlist: currentProducts.includes(productId),
      wishlistCount: currentProducts.length 
    });
  } catch (error) {
    console.error('Error updating wishlist:', error);
    return NextResponse.json({ error: 'Failed to update wishlist' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const productId = searchParams.get('productId');

    if (!userId || !productId) {
      return NextResponse.json({ error: 'User ID and Product ID are required' }, { status: 400 });
    }

    const wishlistRef = doc(db, 'wishlists', userId);
    const wishlistDoc = await getDoc(wishlistRef);

    if (!wishlistDoc.exists()) {
      return NextResponse.json({ success: true, isInWishlist: false });
    }

    const currentProducts = wishlistDoc.data()?.products || [];
    const updatedProducts = currentProducts.filter((id: string) => id !== productId);

    await updateDoc(wishlistRef, {
      products: updatedProducts,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ 
      success: true, 
      isInWishlist: false,
      wishlistCount: updatedProducts.length 
    });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    return NextResponse.json({ error: 'Failed to remove from wishlist' }, { status: 500 });
  }
}
