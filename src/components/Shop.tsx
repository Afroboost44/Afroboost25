'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiSearch, 
  FiFilter, 
  FiShoppingCart, 
  FiStar,
  FiHeart,
  FiMapPin,
  FiTruck,
  FiGrid,
  FiList,
  FiChevronDown,
  FiX,
  FiCheck,
  FiPlus,
  FiMinus,
  FiEye,
  FiChevronLeft,
  FiChevronRight,
  FiPlay,
  FiMessageSquare,
  FiTag
} from 'react-icons/fi';
import { useAuth } from '@/lib/auth';
import Card from '@/components/Card';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { Product, ProductReview, ProductVariant, ProductVariantType, ProductVariantOption } from '@/types';
import ProductReviewModal from '@/components/ProductReviewModal';
import WriteReviewModal from '@/components/WriteReviewModal';
import ProductVariantSelector from '@/components/ProductVariantSelector';

interface Category {
  id: string;
  name: string;
}
import PaymentHandlerWithCredits from '@/components/PaymentHandlerWithCredits';

interface CartItem extends Product {
  title: any;
  quantity: number;
  selectedVariant?: {
    variantId: string;
    sku: string;
    combinations: { [variantTypeId: string]: string };
    displayText: string;
    price: number;
    weight?: number;
  };
}

interface ShopProps {
  className?: string;
}

export default function Shop({ className = '' }: ShopProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showLikedOnly, setShowLikedOnly] = useState(false);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [checkoutItems, setCheckoutItems] = useState<CartItem[]>([]);
  const [checkoutForm, setCheckoutForm] = useState({
    customerName: user?.firstName || '',
    customerEmail: user?.email || '',
    customerPhone: '',
    deliveryType: 'delivery' as 'delivery' | 'pickup',
    deliveryAddress: {
      street: '',
      city: '',
      postalCode: '',
      country: 'Switzerland'
    },
    specialInstructions: ''
  });
  const [reviews, setReviews] = useState<{ [key: string]: ProductReview[] }>({});

  // Image gallery modal state
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryVideos, setGalleryVideos] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Cart confirmation popup state
  const [showCartConfirmation, setShowCartConfirmation] = useState(false);
  const [addedProduct, setAddedProduct] = useState<Product | null>(null);
  const [addedQuantity, setAddedQuantity] = useState(1);

  // Review modal states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showWriteReviewModal, setShowWriteReviewModal] = useState(false);
  const [selectedProductForReview, setSelectedProductForReview] = useState<Product | null>(null);
  const [selectedOrderIdForReview, setSelectedOrderIdForReview] = useState<string>('');

  // Expanded descriptions state
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());

  // VAT settings
  const [userCountry, setUserCountry] = useState('France');

  // Variant selection state
  const [selectedVariants, setSelectedVariants] = useState<{ [productId: string]: { variant: ProductVariant | null, combinations: { [key: string]: string } } }>({});
  const [variantTypes, setVariantTypes] = useState<ProductVariantType[]>([]);
  const [variantTypesCache, setVariantTypesCache] = useState<{ [sellerId: string]: ProductVariantType[] }>({});
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  // Helper function to safely get images array
  const getProductImages = (images: any): string[] => {
    if (!images) return [];
    if (Array.isArray(images)) return images.filter(Boolean);
    if (typeof images === 'object') return Object.values(images).filter(Boolean) as string[];
    return [];
  };

  // Helper function to safely get links from object or array
  const getLinksArray = (links: any): string[] => {
    if (!links) return [];
    if (Array.isArray(links)) return links.filter(Boolean);
    if (typeof links === 'object') return Object.values(links).filter(Boolean) as string[];
    return [];
  };

  // Helper function to get YouTube video ID
  const getYouTubeVideoId = (url: string) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  // Helper function to check if URL is a video
  const isVideoUrl = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com') || url.includes('tiktok.com');
  };

  // Helper function to set VAT rate based on country (fallback)
  const getVATRateForCountry = (country: string) => {
    const vatRates: { [key: string]: number } = {
      'France': 20,
      'Germany': 19,
      'Switzerland': 7.7,
      'Italy': 22,
      'Spain': 21,
      'Belgium': 21,
      'Netherlands': 21,
      'Austria': 20,
      'Portugal': 23,
    };
    return vatRates[country] || 20; // Default 20%
  };

  // Get VAT rate for a specific product (seller-configured or fallback)
  const getProductVATRate = (product: Product) => {
    if (product.customVatRate !== undefined && product.customVatRate >= 0) {
      return product.customVatRate;
    }
    if (product.vatRate !== undefined && product.vatRate >= 0) {
      return product.vatRate;
    }
    return getVATRateForCountry(userCountry);
  };

  // Get delivery fee for cart by seller
  const getDeliveryFeesBySeller = () => {
    const deliveryFees: { [sellerId: string]: { fee: number, sellerName: string, freeThreshold?: number } } = {};
    
    cart.forEach(item => {
      if (!deliveryFees[item.sellerId] && checkoutForm.deliveryType === 'delivery') {
        const product = products.find(p => p.id === item.id);
        if (product && product.deliveryInfo) {
          deliveryFees[item.sellerId] = {
            fee: product.deliveryInfo.deliveryFee || 0,
            sellerName: item.businessName || item.sellerName,
            freeThreshold: product.deliveryInfo.freeDeliveryThreshold
          };
        }
      }
    });

    return deliveryFees;
  };

  // Calculate delivery fees with free threshold check
  const getTotalDeliveryFees = () => {
    if (checkoutForm.deliveryType !== 'delivery') return 0;
    
    const deliveryFees = getDeliveryFeesBySeller();
    let totalFees = 0;

    Object.entries(deliveryFees).forEach(([sellerId, { fee, freeThreshold }]) => {
      // Calculate subtotal for this seller
      const sellerSubtotal = cart
        .filter(item => item.sellerId === sellerId)
        .reduce((sum, item) => sum + (item.salePrice || item.price) * item.quantity, 0);
      
      // Apply free delivery threshold if set
      if (freeThreshold && sellerSubtotal >= freeThreshold) {
        // Free delivery
      } else {
        totalFees += fee;
      }
    });

    return totalFees;
  };

  // Wishlist functions
  const loadWishlist = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/wishlist?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        const productIds = data.wishlist.map((product: any) => product.id);
        setWishlist(productIds);
      }
    } catch (error) {
      console.error('Error loading wishlist:', error);
    }
  };

  const toggleWishlist = async (productId: string) => {
    if (!user) {
      // Could show login modal here
      return;
    }

    const isInWishlist = wishlist.includes(productId);
    const action = isInWishlist ? 'remove' : 'add';

    try {
      const response = await fetch('/api/wishlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          productId,
          action
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.isInWishlist) {
          setWishlist(prev => [...prev, productId]);
        } else {
          setWishlist(prev => prev.filter(id => id !== productId));
        }
      }
    } catch (error) {
      console.error('Error updating wishlist:', error);
    }
  };

  // Load products
  useEffect(() => {
    loadProducts();
    loadCategories();
    loadVariantTypes();
  }, []);

  // Load wishlist when user changes
  useEffect(() => {
    if (user) {
      loadWishlist();
    } else {
      setWishlist([]);
    }
  }, [user]);

  const loadProducts = async () => {
    try {
      const response = await fetch('/api/marketplace/products');
      if (response.ok) {
        const data = await response.json();
        const productsData = data.products || [];
        setProducts(productsData);
        
        // Extract unique seller IDs from products to load their variant types
        const sellerIds = [...new Set(productsData.map((product: Product) => product.sellerId).filter((id: any) => typeof id === 'string'))] as string[];
        if (sellerIds.length > 0) {
          await loadVariantTypesForSellers(sellerIds);
        }
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/marketplace/categories');
      if (response.ok) {
        const data = await response.json();
        // Ensure categories are objects with id and name
        if (Array.isArray(data.categories)) {
            const uniqueCategories = Array.from(
            new Map(
              data.categories.map((cat: any) => {
              const category = typeof cat === 'string' ? { id: cat, name: cat } : cat;
              return [category.name, category];
              })
            ).values()
            );
            setCategories(uniqueCategories.map((category, index) => {
              if (typeof category === 'object' && category !== null) {
                const typedCategory = category as { id?: string; name?: string };
                return { id: typedCategory.id || index.toString(), name: typedCategory.name || '', key: typedCategory.id || index.toString() };
              }
              return { id: index.toString(), name: String(category), key: index.toString() };
            }) as Category[]);
        } else {
          setCategories([]);
        }
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadVariantTypesForSellers = async (sellerIds: string[]) => {
    try {
      const newCache = { ...variantTypesCache };
      const uniqueSellerIds = [...new Set(sellerIds)];
      
      for (const sellerId of uniqueSellerIds) {
        if (!newCache[sellerId]) {
          const response = await fetch(`/api/marketplace/variant-types?sellerId=${sellerId}`);
          if (response.ok) {
            const data = await response.json();
            newCache[sellerId] = (data.variantTypes || []).map((vt: ProductVariantType) => ({
              ...vt,
              options: Array.isArray(vt.options) ? vt.options : Object.values(vt.options)
            }));
          } else {
            newCache[sellerId] = [];
          }
        }
      }
      
      setVariantTypesCache(newCache);
      
      // Also update the main variantTypes for backward compatibility
      const allVariantTypes = Object.values(newCache).flat();
      setVariantTypes(allVariantTypes);
    } catch (error) {
      console.error('Error loading variant types:', error);
    }
  };

  const loadVariantTypes = async () => {
    // This function is now deprecated in favor of loadVariantTypesForSellers
    // But keeping it for any legacy usage
    return;
  };

  const loadReviews = async (productId: string) => {
    try {
      const response = await fetch(`/api/marketplace/products/${productId}/reviews`);
      if (response.ok) {
        const data = await response.json();
        setReviews(prev => ({ ...prev, [productId]: data.reviews || [] }));
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  // Keyboard navigation for image gallery
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!showImageGallery) return;

      const totalMedia = galleryImages.length + galleryVideos.length;
      
      switch (event.key) {
        case 'Escape':
          setShowImageGallery(false);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          setCurrentImageIndex(prev => 
            prev > 0 ? prev - 1 : totalMedia - 1
          );
          break;
        case 'ArrowRight':
          event.preventDefault();
          setCurrentImageIndex(prev => 
            prev < totalMedia - 1 ? prev + 1 : 0
          );
          break;
      }
    };

    if (showImageGallery) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scrolling when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [showImageGallery, galleryImages.length, galleryVideos.length]);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || product.categoryName === selectedCategory;
    const matchesPrice = (!priceRange.min || product.price >= parseFloat(priceRange.min)) &&
                        (!priceRange.max || product.price <= parseFloat(priceRange.max));
    const matchesWishlist = !showLikedOnly || wishlist.includes(product.id);
    
    return matchesSearch && matchesCategory && matchesPrice && matchesWishlist && product.isActive;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'rating':
        return (b.rating || 0) - (a.rating || 0);
      case 'popular':
        return (b.totalSold || 0) - (a.totalSold || 0);
      default:
        // Handle DateOrTimestamp properly
        const aDate = a.createdAt instanceof Date ? a.createdAt : 
                     typeof a.createdAt === 'string' ? new Date(a.createdAt) :
                     a.createdAt && typeof a.createdAt.toDate === 'function' ? a.createdAt.toDate() : new Date();
        const bDate = b.createdAt instanceof Date ? b.createdAt : 
                     typeof b.createdAt === 'string' ? new Date(b.createdAt) :
                     b.createdAt && typeof b.createdAt.toDate === 'function' ? b.createdAt.toDate() : new Date();
        return bDate.getTime() - aDate.getTime();
    }
  });

  const addToCart = (product: Product, quantity = 1, selectedVariant?: ProductVariant, combinations?: { [key: string]: string }) => {
    // If product has variants but no variant is selected, show product detail
    if (product.hasVariants && !selectedVariant) {
      setDetailProduct(product);
      setShowProductDetail(true);
      return;
    }

    // Determine the effective price and stock
    const effectivePrice = selectedVariant ? (selectedVariant.salePrice || selectedVariant.price) : (product.salePrice || product.price);
    const effectiveStock = selectedVariant ? selectedVariant.stock : product.stock;
    const effectiveWeight = selectedVariant?.weight || product.weight;

    // Check stock
    if (!product.isUnlimitedStock && effectiveStock <= 0) {
      alert(t('This product is out of stock'));
      return;
    }

    // Check if cart has items from a different business
    if (cart.length > 0) {
      const existingBusinessId = cart[0].sellerId;
      const existingBusinessName = cart[0].businessName || cart[0].sellerName;
      
      if (existingBusinessId !== product.sellerId) {
        const confirmMessage = t('You can only have items from one business at a time. This will clear your current cart and add items from {{newBusiness}}. Continue?', {
          newBusiness: product.businessName || product.sellerName
        });
        
        if (!confirm(confirmMessage)) {
          return;
        }
        
        // Clear cart and add new item with variant info
        const cartItem: CartItem = { 
          ...product, 
          quantity, 
          title: product.name,
          price: effectivePrice
        };

        if (selectedVariant && combinations) {
          cartItem.selectedVariant = {
            variantId: selectedVariant.id,
            sku: selectedVariant.sku,
            combinations,
            displayText: generateVariantDisplayText(combinations, product.sellerId),
            price: effectivePrice,
            weight: effectiveWeight
          };
        }

        setCart([cartItem]);
        setAddedProduct(product);
        setAddedQuantity(quantity);
        setShowCartConfirmation(true);
        return;
      }
    }

    setCart(prev => {
      // Create unique identifier for product+variant combination
      const cartItemKey = selectedVariant ? `${product.id}_${selectedVariant.id}` : product.id;
      const existingItem = prev.find(item => {
        if (selectedVariant) {
          return item.id === product.id && item.selectedVariant?.variantId === selectedVariant.id;
        }
        return item.id === product.id && !item.selectedVariant;
      });

      const currentQuantityInCart = existingItem ? existingItem.quantity : 0;
      const totalQuantityNeeded = currentQuantityInCart + quantity;

      // Check stock limits
      if (!product.isUnlimitedStock && totalQuantityNeeded > effectiveStock) {
        const availableQuantity = effectiveStock - currentQuantityInCart;
        if (availableQuantity <= 0) {
          alert(t('No more items available in stock'));
          return prev;
        }
        alert(t(`Only ${availableQuantity} items available. Adding ${availableQuantity} to cart.`));
        quantity = availableQuantity;
      }

      if (existingItem) {
        return prev.map(item => {
          if (selectedVariant) {
            return item.id === product.id && item.selectedVariant?.variantId === selectedVariant.id
              ? { ...item, quantity: item.quantity + quantity }
              : item;
          }
          return item.id === product.id && !item.selectedVariant
            ? { ...item, quantity: item.quantity + quantity }
            : item;
        });
      } else {
        const cartItem: CartItem = { 
          ...product, 
          quantity, 
          title: product.name,
          price: effectivePrice
        };

        if (selectedVariant && combinations) {
          cartItem.selectedVariant = {
            variantId: selectedVariant.id,
            sku: selectedVariant.sku,
            combinations,
            displayText: generateVariantDisplayText(combinations, product.sellerId),
            price: effectivePrice,
            weight: effectiveWeight
          };
        }

        return [...prev, cartItem];
      }
    });

    setAddedProduct(product);
    setAddedQuantity(quantity);
    setShowCartConfirmation(true);
  };

  // Helper function to generate variant display text
  const generateVariantDisplayText = (combinations: { [key: string]: string }, sellerId?: string) => {
    if (!combinations) return '';
    
    // Get variant types for the specific seller, or fall back to all variant types
    const relevantVariantTypes = sellerId && variantTypesCache[sellerId] 
      ? variantTypesCache[sellerId] 
      : variantTypes;
    
    return Object.entries(combinations).map(([typeId, optionId]) => {
      // Check if this looks like a technical ID pattern (long random string)
      const isTypeIdTechnical = typeId.length > 10 && /^[a-zA-Z0-9]{10,}$/.test(typeId);
      const isOptionIdTechnical = optionId.length > 10 && /^[a-zA-Z0-9]{10,}$/.test(optionId);
      
      if (!isTypeIdTechnical && !isOptionIdTechnical) {
        // Already human-readable
        return `${typeId}: ${optionId}`;
      }
      
      // Try to resolve technical IDs using variant types
      const variantType = relevantVariantTypes.find(vt => vt.id === typeId);
      if (variantType) {
        const normalizedOptions = normalizeOptions(variantType.options);
        const option = normalizedOptions.find(opt => opt.id === optionId);
        if (option) {
          return `${variantType.displayName}: ${option.displayValue}`;
        }
      }
      
      // Fallback to original if we can't resolve
      return `${typeId}: ${optionId}`;
    }).join(', ');
  };

  // Helper function to normalize variant type options (handle Firestore serialization)
  const normalizeOptions = (options: any): ProductVariantOption[] => {
    if (!options) return [];
    
    // If it's already an array, return as is
    if (Array.isArray(options)) {
      return options as ProductVariantOption[];
    }
    
    // If it's an object (from Firestore serialization), convert to array
    if (typeof options === 'object') {
      return Object.values(options) as ProductVariantOption[];
    }
    
    return [];
  };

  const removeFromCart = (productId: string, variantId?: string) => {
    setCart(prev => prev.filter(item => {
      if (variantId) {
        return !(item.id === productId && item.selectedVariant?.variantId === variantId);
      }
      return !(item.id === productId && !item.selectedVariant);
    }));
  };

  const updateCartQuantity = (productId: string, quantity: number, variantId?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, variantId);
      return;
    }

    // Find the cart item and check its effective stock
    const cartItem = cart.find(item => {
      if (variantId) {
        return item.id === productId && item.selectedVariant?.variantId === variantId;
      }
      return item.id === productId && !item.selectedVariant;
    });

    if (cartItem) {
      // For variant items, we need to check the variant stock from the database
      // For now, we'll use the product stock as fallback
      const effectiveStock = cartItem.isUnlimitedStock ? Infinity : cartItem.stock;
      
      if (quantity > effectiveStock && effectiveStock !== Infinity) {
        alert(t(`Only ${effectiveStock} items available in stock`));
        return;
      }
    }

    setCart(prev =>
      prev.map(item => {
        if (variantId) {
          return item.id === productId && item.selectedVariant?.variantId === variantId
            ? { ...item, quantity }
            : item;
        }
        return item.id === productId && !item.selectedVariant
          ? { ...item, quantity }
          : item;
      })
    );
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => {
      const effectivePrice = item.selectedVariant?.price || item.salePrice || item.price;
      return total + (effectivePrice * item.quantity);
    }, 0);
  };

  const getSubtotal = () => {
    return cart.reduce((total, item) => {
      const effectivePrice = item.selectedVariant?.price || item.salePrice || item.price;
      return total + (effectivePrice * item.quantity);
    }, 0);
  };

  const getVATAmount = () => {
    return cart.reduce((total, item) => {
      const product = products.find(p => p.id === item.id);
      if (product) {
        const vatRate = getProductVATRate(product);
        const effectivePrice = item.selectedVariant?.price || item.salePrice || item.price;
        const itemTotal = effectivePrice * item.quantity;
        return total + (itemTotal * vatRate) / 100;
      }
      return total;
    }, 0);
  };

  const getTotalWithVAT = () => {
    return getSubtotal() + getVATAmount() + getTotalDeliveryFees();
  };

  const handleCheckout = () => {
    setCheckoutItems([...cart]);
    setShowCart(false);
    setShowCheckoutForm(true);
  };

  const proceedToPayment = () => {
    if (!checkoutForm.customerName || !checkoutForm.customerEmail || !checkoutForm.customerPhone) {
      alert(t('Please fill in all required fields'));
      return;
    }
    if (checkoutForm.deliveryType === 'delivery' && (!checkoutForm.deliveryAddress.street || !checkoutForm.deliveryAddress.city)) {
      alert(t('Please provide complete delivery address'));
      return;
    }
    setShowCheckoutForm(false);
    setShowPayment(true);
  };

  const handlePaymentSuccess = async () => {
    try {
      // Create orders for each seller
      const ordersBySeller: { [sellerId: string]: CartItem[] } = {};
      
      checkoutItems.forEach(item => {
        if (!ordersBySeller[item.sellerId]) {
          ordersBySeller[item.sellerId] = [];
        }
        ordersBySeller[item.sellerId].push(item);
      });

      // Create separate orders for each seller
      for (const [sellerId, items] of Object.entries(ordersBySeller)) {
        const sellerItems = items as CartItem[];
        
        // Calculate subtotal for this seller
        const subtotal = sellerItems.reduce((sum, item) => sum + (item.salePrice || item.price) * item.quantity, 0);
        
        // Calculate VAT for this seller
        const vatAmount = sellerItems.reduce((total, item) => {
          const product = products.find(p => p.id === item.id);
          if (product) {
            const vatRate = getProductVATRate(product);
            const itemTotal = (item.salePrice || item.price) * item.quantity;
            return total + (itemTotal * vatRate) / 100;
          }
          return total;
        }, 0);
        
        // Calculate average VAT rate for this seller
        const avgVatRate = subtotal > 0 ? (vatAmount / subtotal) * 100 : 0;
        
        // Calculate delivery fee for this seller
        let deliveryFee = 0;
        if (checkoutForm.deliveryType === 'delivery') {
          const firstProduct = products.find(p => p.id === sellerItems[0].id);
          if (firstProduct?.deliveryInfo) {
            const { deliveryFee: fee, freeDeliveryThreshold } = firstProduct.deliveryInfo;
            if (freeDeliveryThreshold && subtotal >= freeDeliveryThreshold) {
              deliveryFee = 0; // Free delivery
            } else {
              deliveryFee = fee || 0;
            }
          }
        }

        const orderData = {
          customerId: user?.id,
          customerName: checkoutForm.customerName,
          customerEmail: checkoutForm.customerEmail,
          customerPhone: checkoutForm.customerPhone,
          sellerId,
          sellerName: sellerItems[0].businessName || sellerItems[0].sellerName,
          businessName: sellerItems[0].businessName || sellerItems[0].sellerName,
          items: sellerItems.map(item => ({
            productId: item.id,
            productName: item.name,
            productImage: item.mainImage,
            quantity: item.quantity,
            price: item.selectedVariant?.price || item.salePrice || item.price,
            subtotal: (item.selectedVariant?.price || item.salePrice || item.price) * item.quantity,
            // Include variant details if present
            ...(item.selectedVariant && {
              variantId: item.selectedVariant.variantId,
              variantSku: item.selectedVariant.sku,
              variantDetails: {
                combinations: item.selectedVariant.combinations,
                displayText: item.selectedVariant.displayText,
                weight: item.selectedVariant.weight
              }
            }),
            selectedOptions: {},
            specialInstructions: checkoutForm.specialInstructions
          })),
          subtotal,
          deliveryFee,
          vatAmount,
          vatRate: avgVatRate,
          totalAmount: subtotal + deliveryFee + vatAmount,
          paymentMethod: 'stripe',
          paymentId: `payment_${Date.now()}`,
          deliveryType: checkoutForm.deliveryType,
          deliveryAddress: checkoutForm.deliveryType === 'delivery' ? checkoutForm.deliveryAddress : null,
          notes: checkoutForm.specialInstructions,
          currency: 'CHF'
        };

        const response = await fetch('/api/marketplace/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create order');
        }
      }

      // Clear cart and forms
      setCart([]);
      setShowPayment(false);
      setShowCheckoutForm(false);
      setCheckoutItems([]);
      
      // Reset checkout form
      setCheckoutForm({
        customerName: user?.firstName || '',
        customerEmail: user?.email || '',
        customerPhone: '',
        deliveryType: 'delivery',
        deliveryAddress: {
          street: '',
          city: '',
          postalCode: '',
          country: 'Switzerland'
        },
        specialInstructions: ''
      });

      alert(t('Orders placed successfully!'));
    } catch (error) {
      console.error('Error creating orders:', error);
      alert(t('Failed to place orders. Please try again.'));
    }
  };

  // Toggle description expansion
  const toggleDescription = (productId: string) => {
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const ProductCard = ({ product }: { product: Product }) => {
    const productImages = getProductImages(product.images);
    const imageLinks = getLinksArray(product.imageLinks);
    const videoLinks = getLinksArray(product.videoLinks);
    
    // Combine all images (product.images + imageLinks)
    const allImages = [...productImages, ...imageLinks];
    // Videos remain separate for different handling
    const allVideos = [...videoLinks];

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="group"
      >
        <Card className="overflow-hidden hover:shadow-lg transition-all duration-200">
          <div className="relative">
            <div 
              className="aspect-[4/3] sm:aspect-square relative overflow-hidden bg-gray-800 cursor-pointer" 
              onClick={() => {
                // Combine all media from different sources
                const allImagesCombined = [...allImages];
                const allVideosCombined = [...allVideos];
                
                if (allImagesCombined.length > 0 || allVideosCombined.length > 0) {
                  setGalleryImages(allImagesCombined);
                  setGalleryVideos(allVideosCombined);
                  setCurrentImageIndex(0);
                  setShowImageGallery(true);
                }
              }}
            >
              {allImages[0] ? (
                <div className="relative w-full h-full">
                  <Image
                    src={allImages[0]}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  {/* Image count indicator */}
                  {((allImages.length + allVideos.length) > 1) && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {allImages.length + allVideos.length} {t('items')}
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <FiEye className="text-white text-2xl" />
                  </div>
                </div>
              ) : product.mainImage ? (
                <div className="relative w-full h-full">
                  <Image
                    src={product.mainImage}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <FiEye className="text-white text-2xl" />
                  </div>
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  <FiShoppingCart className="text-4xl" />
                </div>
              )}

              {/* Heart/Wishlist Icon */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleWishlist(product.id);
                }}
                className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-all duration-200 group/heart"
              >
                {wishlist.includes(product.id) ? (
                  <svg 
                    className="w-4 h-4 text-red-500 fill-current" 
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                ) : (
                  <FiHeart className="w-4 h-4 text-white group-hover/heart:text-red-300 transition-colors duration-200" />
                )}
              </button>
            </div>
            
            {/* Badges */}
            <div className="absolute top-3 left-3 space-y-2">
              {product.isFeatured && (
                <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded">
                  {t('Featured')}
                </span>
              )}

            </div>

          </div>

          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-white text-sm group-hover:text-purple-400 transition-colors line-clamp-2">
                {product.name}
              </h3>
            </div>

            <div className="mb-3">
              <p 
              className={`text-gray-400 text-xs ${expandedDescriptions.has(product.id) ? '' : 'line-clamp-2'}`}
              dangerouslySetInnerHTML={{
                __html: product.description?.replace(/\n/g, '<br>') || ''
              }}
              />
              {product.description && product.description.length > 100 && (
              <button
                onClick={() => toggleDescription(product.id)}
                className="text-purple-400 hover:text-purple-300 text-xs font-medium mt-1 transition-colors"
              >
                {expandedDescriptions.has(product.id) ? t('Show less') : t('Show more')}
              </button>
              )}
            </div>

            <div className="flex items-center space-x-2 mb-3">
              {product.rating > 0 && (
                <>
                  <div className="flex items-center space-x-1">
                    <FiStar className="text-yellow-400 text-xs fill-current" />
                    <span className="text-yellow-400 text-xs">
                      {product.rating.toFixed(1)}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedProductForReview(product);
                      setShowReviewModal(true);
                    }}
                    className="text-primary text-xs hover:text-purple-400 transition-colors"
                  >
                    ({product.reviewCount})
                  </button>
                </>
              )}

              {(!product.rating || product.rating === 0) && (
                <button
                  onClick={() => {
                    setSelectedProductForReview(product);
                    setShowReviewModal(true);
                    }}
                    className="flex items-center space-x-1 text-primary text-xs hover:text-purple-400 transition-colors"
                  >
                    <FiMessageSquare />
                  <span>{t('No reviews yet')}</span>
                </button>
              )}

              
                <span className="text-gray-500 text-xs">
                  • {product.totalSold} {t('sold')}
                </span>

            </div>

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                {product.salePrice && product.salePrice < product.price ? (
                  <>
                    <span className="text-lg font-bold text-white">
                      {product.salePrice.toFixed(2)} CHF
                    </span>
                    <span className="text-sm text-gray-400 line-through">
                      {product.price.toFixed(2)} CHF
                    </span>
                  </>
                ) : (
                  <span className="text-lg font-bold text-white">
                    {product.price.toFixed(2)} CHF
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2"></div>
                {!product.isUnlimitedStock && product.stock > 0 && (
                  <span className="text-xs text-primary">
                    {t('Only')} {product.stock - (cart.find(item => item.id === product.id)?.quantity || 0)} {t('left')}
                  </span>
                )}
            </div>

            <div className="flex items-center space-x-2 mb-4">
              {product.serviceType === 'delivery' && (
                <div className="flex items-center space-x-1 text-xs text-gray-400">
                  <FiTruck />
                  <span>{t('Delivery')}</span>
                </div>
              )}
              {product.serviceType === 'pickup' && (
                <div className="flex items-center space-x-1 text-xs text-gray-400">
                  <FiMapPin />
                  <span>{t('Pickup')}</span>
                </div>
              )}
              {product.hasVariants && (
                <div className="flex items-center space-x-1 text-xs text-primary-400">
                  <FiTag />
                  <span>{t('Multiple options')}</span>
                </div>
              )}
              {product.material && (
                <div className="flex items-center space-x-1 text-xs text-gray-400">
                  <span>{product.material}</span>
                </div>
              )}
            </div>

            {/* Add to Cart or View Details */}
            {product.hasVariants ? (
              <button
                onClick={() => {
                  setDetailProduct(product);
                  setShowProductDetail(true);
                }}
                className="w-full py-2 bg-gradient-to-r from-primary to-purple-600 text-white rounded-lg text-sm font-medium hover:from-primary-600 hover:to-purple-600 transition-all duration-200"
              >
                {t('Select Options')}
              </button>
            ) : (
                <button
                onClick={() => addToCart(product)}
                disabled={!product.isUnlimitedStock && product.stock === 0}
                className="w-full py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                {!product.isUnlimitedStock && product.stock === 0 ? t('Out of Stock') : t('Add to Cart')}
                </button>
            )}
          </div>
        </Card>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">{t('Loading products...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen mt-16 bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">{t('Shop')}</h1>
            <p className="text-gray-300 max-w-2xl mx-auto">
              {t('Discover amazing products from our verified sellers. From sports equipment to nutrition, find everything you need.')}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters and Search */}
  <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 sm:items-center mb-8 w-full">
          {/* Search */}
          <div className="relative w-full sm:w-auto flex-1 flex items-center">
            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('Search products...')}
              className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-3 h-12 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 w-full sm:w-auto"
            style={{ minWidth: 180 }}
          >
            <option value="">{t('All Categories')}</option>
            {categories.map((category) => (
              <option key={String(category.id)} value={category.name}>
                {t(category.name)}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-3 h-12 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 w-full sm:w-auto"
            style={{ minWidth: 180 }}
          >
            <option value="newest">{t('Newest')}</option>
            <option value="price-low">{t('Price: Low to High')}</option>
            <option value="price-high">{t('Price: High to Low')}</option>
            <option value="rating">{t('Highest Rated')}</option>
            <option value="popular">{t('Most Popular')}</option>
          </select>

          {/* View Mode */}
          <div className="flex bg-gray-800 rounded-lg p-1 h-12 items-center w-full sm:w-auto justify-center">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-purple-500 text-white' : 'text-gray-400'}`}
            >
              <FiGrid />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-purple-500 text-white' : 'text-gray-400'}`}
            >
              <FiList />
            </button>
          </div>

          {/* Liked Products Filter */}
          <button
            onClick={() => setShowLikedOnly(!showLikedOnly)}
            className={`px-4 py-3 h-12 flex items-center gap-2 border rounded-lg transition-all duration-200 w-full sm:w-auto ${
              showLikedOnly
                ? 'bg-red-500 border-red-500 text-white'
                : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-red-400 hover:text-red-400'
            }`}
            style={{ minWidth: 150 }}
          >
            {showLikedOnly ? (
              <svg 
                className="w-4 h-4 fill-current" 
                viewBox="0 0 24 24"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            ) : (
              <FiHeart />
            )}
            {t('Liked Products')}
            {wishlist.length > 0 && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                showLikedOnly ? 'bg-red-600' : 'bg-gray-700'
              }`}>
                {wishlist.length}
              </span>
            )}
          </button>

          {/* Cart */}
          <button
            onClick={() => setShowCart(true)}
            className="relative px-6 py-3 h-12 flex items-center bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 w-full sm:w-auto"
            style={{ minWidth: 110 }}
          >
            <FiShoppingCart className="mr-2" />
            {t('Cart')}
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </button>
        </div>

        {/* Results Info */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-400">
            {t('Showing')} {sortedProducts.length} {t('of')} {products.length} {t('products')}
          </p>
        </div>

        {/* Products Grid */}
        {sortedProducts.length > 0 ? (
          <div className={`grid gap-6 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
              : 'grid-cols-1'
          }`}>
            {sortedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <FiShoppingCart className="text-6xl text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">{t('No products found')}</h3>
            <p className="text-gray-400">
              {t('Try adjusting your search criteria or browse different categories.')}
            </p>
          </div>
        )}

        {/* Shopping Cart Modal */}
        {/* Shopping Cart Modal */}
        {showCart && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-800 rounded-lg w-full max-w-sm sm:max-w-md md:max-w-2xl lg:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-700">
                <h3 className="text-base sm:text-lg font-semibold text-white">{t('Shopping Cart')}</h3>
                <button
                  onClick={() => setShowCart(false)}
                  className="text-gray-400 hover:text-white p-1"
                >
                  <FiX className="text-lg sm:text-xl" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-3 sm:p-4">
                {cart.length > 0 ? (
                  <div className="space-y-3 sm:space-y-4">
                    {cart.map((item, index) => {
                      const cartKey = item.selectedVariant ? `${item.id}-${item.selectedVariant.variantId}` : item.id;

                      const getFirstAvailableImage = (cartItem: CartItem) => {
                        const productImages = getProductImages(cartItem.images);
                        const imageLinks = getLinksArray(cartItem.imageLinks);
                        const allImages = [...productImages, ...imageLinks];
                        return allImages[0] || cartItem.mainImage || null;
                      };

                      const firstImage = getFirstAvailableImage(item);

                      return (
                        <div key={`cart-item-${cartKey}-${index}`} className="bg-gray-700/50 rounded-lg p-3 sm:p-4">
                          {/* Mobile Layout (< sm) */}
                          <div className="sm:hidden">
                            <div className="flex items-start space-x-3 mb-3">
                              <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                                {firstImage ? (
                                  <Image
                                    src={firstImage}
                                    alt={item.name}
                                    width={64}
                                    height={64}
                                    className="w-full h-full object-cover rounded-lg"
                                  />
                                ) : (
                                  <FiShoppingCart className="text-gray-400 text-lg" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-white text-sm leading-tight mb-1">{item.name}</h4>
                                {item.selectedVariant && (
                                  <p className="text-xs text-gray-400 mb-1 leading-tight">
                                    {item.selectedVariant.displayText}
                                  </p>
                                )}
                                {item.selectedVariant?.sku && (
                                  <p className="text-xs text-gray-500 mb-1">SKU: {item.selectedVariant.sku}</p>
                                )}
                                <p className="text-purple-400 font-medium text-sm">
                                  {(item.selectedVariant?.price || item.salePrice || item.price).toFixed(2)} CHF
                                </p>
                              </div>

                              <button
                                onClick={() => removeFromCart(item.id, item.selectedVariant?.variantId)}
                                className="text-red-400 hover:text-red-300 p-1 flex-shrink-0"
                              >
                                <FiX className="text-lg" />
                              </button>
                            </div>

                            {/* Quantity controls for mobile */}
                            <div className="flex items-center justify-center space-x-3">
                              <button
                                onClick={() => updateCartQuantity(item.id, item.quantity - 1, item.selectedVariant?.variantId)}
                                className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-500 transition-colors"
                              >
                                <FiMinus className="text-white text-sm" />
                              </button>
                              <span className="w-12 text-center text-white font-medium">{item.quantity}</span>
                              <button
                                onClick={() => updateCartQuantity(item.id, item.quantity + 1, item.selectedVariant?.variantId)}
                                className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-500 transition-colors"
                              >
                                <FiPlus className="text-white text-sm" />
                              </button>
                            </div>
                          </div>

                          {/* Desktop Layout (>= sm) */}
                          <div className="hidden sm:flex items-center space-x-4">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                              {firstImage ? (
                                <Image
                                  src={firstImage}
                                  alt={item.name}
                                  width={80}
                                  height={80}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <FiShoppingCart className="text-gray-400 text-xl" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-white text-sm sm:text-base mb-1">{item.name}</h4>
                              {item.selectedVariant && (
                                <p className="text-xs sm:text-sm text-gray-400 mb-1">
                                  {item.selectedVariant.displayText}
                                </p>
                              )}
                              {item.selectedVariant?.sku && (
                                <p className="text-xs text-gray-500 mb-1">SKU: {item.selectedVariant.sku}</p>
                              )}
                              <p className="text-purple-400 font-medium text-sm sm:text-base">
                                {(item.selectedVariant?.price || item.salePrice || item.price).toFixed(2)} CHF
                              </p>
                            </div>

                            <div className="flex items-center space-x-2 flex-shrink-0">
                              <button
                                onClick={() => updateCartQuantity(item.id, item.quantity - 1, item.selectedVariant?.variantId)}
                                className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-500 transition-colors"
                              >
                                <FiMinus className="text-white text-sm" />
                              </button>
                              <span className="w-8 text-center text-white font-medium">{item.quantity}</span>
                              <button
                                onClick={() => updateCartQuantity(item.id, item.quantity + 1, item.selectedVariant?.variantId)}
                                className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-500 transition-colors"
                              >
                                <FiPlus className="text-white text-sm" />
                              </button>
                            </div>

                            <button
                              onClick={() => removeFromCart(item.id, item.selectedVariant?.variantId)}
                              className="text-red-400 hover:text-red-300 p-1 flex-shrink-0"
                            >
                              <FiX className="text-lg" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FiShoppingCart className="text-3xl sm:text-4xl text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-sm sm:text-base">{t('Your cart is empty')}</p>
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-3 sm:p-4 border-t border-gray-700">
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm sm:text-base">{t('Subtotal')}</span>
                      <span className="text-white text-sm sm:text-base font-medium">
                        {getSubtotal().toFixed(2)} CHF
                      </span>
                    </div>

                    {checkoutForm.deliveryType === 'delivery' && getTotalDeliveryFees() > 0 && (
                      <>
                        {Object.entries(getDeliveryFeesBySeller()).map(([sellerId, { fee, sellerName, freeThreshold }]) => {
                          const sellerSubtotal = cart
                            .filter(item => item.sellerId === sellerId)
                            .reduce((sum, item) => sum + (item.salePrice || item.price) * item.quantity, 0);

                          const isFreeDelivery = freeThreshold && sellerSubtotal >= freeThreshold;
                          const actualFee = isFreeDelivery ? 0 : fee;

                          return (
                            <div key={sellerId} className="flex items-center justify-between text-xs sm:text-sm">
                              <span className="text-gray-400 flex-1 pr-2">
                                {t('Delivery')} ({sellerName})
                                {isFreeDelivery && <span className="text-green-400 ml-1">({t('Free')})</span>}
                              </span>
                              <span className="text-white font-medium">
                                {actualFee.toFixed(2)} CHF
                              </span>
                            </div>
                          );
                        })}
                      </>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm sm:text-base">{t('VAT')}</span>
                      <span className="text-white text-sm sm:text-base font-medium">
                        {getVATAmount().toFixed(2)} CHF
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-600">
                      <span className="text-base sm:text-lg font-semibold text-white">{t('Total')}</span>
                      <span className="text-lg sm:text-xl font-bold text-purple-400">
                        {getTotalWithVAT().toFixed(2)} CHF
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleCheckout}
                    className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200 text-sm sm:text-base"
                  >
                    {t('Proceed to Checkout')}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* Checkout Form Modal */}
        {showCheckoutForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <h3 className="text-xl font-semibold text-white">{t('Checkout Details')}</h3>
                <button
                  onClick={() => setShowCheckoutForm(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <FiX className="text-xl" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Order Summary */}
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-3">{t('Order Summary')}</h4>
                  <div className="space-y-2">
                    {checkoutItems.map((item) => (
                      <div key={`checkout-${item.id}`} className="flex justify-between text-sm">
                        <span className="text-gray-300">{item.name} x{item.quantity}</span>
                        <span className="text-white">{((item.salePrice || item.price) * item.quantity).toFixed(2)} CHF</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-600 pt-2 mt-2 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">{t('Subtotal')}</span>
                        <span className="text-white">
                          {checkoutItems.reduce((sum, item) => sum + ((item.salePrice || item.price) * item.quantity), 0).toFixed(2)} CHF
                        </span>
                      </div>
                      
                      {/* Delivery Fees */}
                      {checkoutForm.deliveryType === 'delivery' && getTotalDeliveryFees() > 0 && (
                        <>
                          {Object.entries(getDeliveryFeesBySeller()).map(([sellerId, { fee, sellerName, freeThreshold }]) => {
                            const sellerSubtotal = checkoutItems
                              .filter(item => item.sellerId === sellerId)
                              .reduce((sum, item) => sum + (item.salePrice || item.price) * item.quantity, 0);
                            
                            const isFreeDelivery = freeThreshold && sellerSubtotal >= freeThreshold;
                            const actualFee = isFreeDelivery ? 0 : fee;
                            
                            return (
                              <div key={sellerId} className="flex justify-between text-sm">
                                <span className="text-gray-400">
                                  {t('Delivery')} ({sellerName})
                                  {isFreeDelivery && <span className="text-green-400 ml-1">({t('Free')})</span>}
                                </span>
                                <span className="text-white">
                                  {actualFee.toFixed(2)} CHF
                                </span>
                              </div>
                            );
                          })}
                        </>
                      )}

                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">{t('VAT')}</span>
                        <span className="text-white">
                          {checkoutItems.reduce((total, item) => {
                            const product = products.find(p => p.id === item.id);
                            if (product) {
                              const vatRate = getProductVATRate(product);
                              const itemTotal = (item.salePrice || item.price) * item.quantity;
                              return total + (itemTotal * vatRate) / 100;
                            }
                            return total;
                          }, 0).toFixed(2)} CHF
                        </span>
                      </div>
                      
                      <div className="flex justify-between font-medium pt-1 border-t border-gray-600">
                        <span className="text-white">{t('Total')}</span>
                        <span className="text-purple-400">
                          {(checkoutItems.reduce((sum, item) => sum + ((item.salePrice || item.price) * item.quantity), 0) + 
                            checkoutItems.reduce((total, item) => {
                              const product = products.find(p => p.id === item.id);
                              if (product) {
                                const vatRate = getProductVATRate(product);
                                const itemTotal = (item.salePrice || item.price) * item.quantity;
                                return total + (itemTotal * vatRate) / 100;
                              }
                              return total;
                            }, 0) + getTotalDeliveryFees()).toFixed(2)} CHF
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Customer Information */}
                <div className="space-y-4">
                  <h4 className="font-medium text-white">{t('Customer Information')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        {t('Full Name')} *
                      </label>
                      <input
                        type="text"
                        value={checkoutForm.customerName}
                        onChange={(e) => setCheckoutForm(prev => ({ ...prev, customerName: e.target.value }))}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder={t('Enter your full name')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        {t('Email')} *
                      </label>
                      <input
                        type="email"
                        value={checkoutForm.customerEmail}
                        onChange={(e) => setCheckoutForm(prev => ({ ...prev, customerEmail: e.target.value }))}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder={t('Enter your email')}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        {t('Phone Number')} *
                      </label>
                      <input
                        type="tel"
                        value={checkoutForm.customerPhone}
                        onChange={(e) => setCheckoutForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder={t('Enter your phone number')}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        {t('Country')} *
                      </label>
                        <input
                        type="text"
                        value={userCountry}
                        onChange={(e) => setUserCountry(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Enter your country"
                        />
                    </div>
                  </div>
                </div>

                {/* Delivery Options */}
                <div className="space-y-4">
                  <h4 className="font-medium text-white">{t('Delivery Options')}</h4>
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="delivery"
                        checked={checkoutForm.deliveryType === 'delivery'}
                        onChange={(e) => setCheckoutForm(prev => ({ ...prev, deliveryType: e.target.value as 'delivery' | 'pickup' }))}
                        className="text-purple-500 focus:ring-purple-500"
                      />
                      <span className="text-white">{t('Home Delivery')}</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="pickup"
                        checked={checkoutForm.deliveryType === 'pickup'}
                        onChange={(e) => setCheckoutForm(prev => ({ ...prev, deliveryType: e.target.value as 'delivery' | 'pickup' }))}
                        className="text-purple-500 focus:ring-purple-500"
                      />
                      <span className="text-white">{t('Pickup')}</span>
                    </label>
                  </div>
                </div>

                {/* Delivery Address */}
                {checkoutForm.deliveryType === 'delivery' && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-white">{t('Delivery Address')}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          {t('Street Address')} *
                        </label>
                        <input
                          type="text"
                          value={checkoutForm.deliveryAddress.street}
                          onChange={(e) => setCheckoutForm(prev => ({ 
                            ...prev, 
                            deliveryAddress: { ...prev.deliveryAddress, street: e.target.value }
                          }))}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder={t('Enter street address')}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          {t('City')} *
                        </label>
                        <input
                          type="text"
                          value={checkoutForm.deliveryAddress.city}
                          onChange={(e) => setCheckoutForm(prev => ({ 
                            ...prev, 
                            deliveryAddress: { ...prev.deliveryAddress, city: e.target.value }
                          }))}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder={t('Enter city')}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          {t('Postal Code')} *
                        </label>
                        <input
                          type="text"
                          value={checkoutForm.deliveryAddress.postalCode}
                          onChange={(e) => setCheckoutForm(prev => ({ 
                            ...prev, 
                            deliveryAddress: { ...prev.deliveryAddress, postalCode: e.target.value }
                          }))}
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder={t('Enter postal code')}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Special Instructions */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {t('Special Instructions')}
                  </label>
                  <textarea
                    value={checkoutForm.specialInstructions}
                    onChange={(e) => setCheckoutForm(prev => ({ ...prev, specialInstructions: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder={t('Any special instructions for delivery...')}
                  />
                </div>
              </div>

              <div className="p-6 border-t border-gray-700 flex justify-end space-x-4">
                <button
                  onClick={() => setShowCheckoutForm(false)}
                  className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  {t('Cancel')}
                </button>
                <button
                  onClick={proceedToPayment}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                >
                  {t('Proceed to Payment')}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Payment Modal */}
        {showPayment && (
          <PaymentHandlerWithCredits
            isOpen={showPayment}
            onClose={() => setShowPayment(false)}
            onSuccess={async (paymentId: string, method: 'stripe' | 'paypal' | 'twint' | 'credits' | 'gift-card' | 'discount-card') => {
              await handlePaymentSuccess();
            }}
            amount={getTotalWithVAT()}
            title={`Purchase of ${checkoutItems.length} items`}
            description={`Purchase of ${checkoutItems.length} items from shop (incl. VAT & delivery)`}
            userId={user?.id || ''}
            businessId={checkoutItems[0]?.sellerId}
            transactionType="product"
            checkoutData={JSON.stringify({
              items: checkoutItems,
              form: checkoutForm,
              totalAmount: getTotalWithVAT()
            })}
          />
        )}

        {/* Image Gallery Modal */}
        {showImageGallery && (
          <div 
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
            style={{ margin: 0, padding: 0 }}
            onClick={(e) => {
              // Close modal when clicking on backdrop
              if (e.target === e.currentTarget) {
                setShowImageGallery(false);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-screen h-screen sm:w-[95vw] sm:h-[90vh] sm:max-w-6xl bg-gray-900 sm:rounded-xl overflow-hidden flex flex-col m-0 sm:m-4"
            >
              {/* Header */}
              <div className="flex-shrink-0 p-4 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">
                  {t('Product Media')} ({currentImageIndex + 1} / {galleryImages.length + galleryVideos.length})
                </h3>
                <button
                  onClick={() => setShowImageGallery(false)}
                  className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
                >
                  <FiX size={24} />
                </button>
              </div>

              {/* Main Media Display */}
              <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
                <div className="w-full h-full flex items-center justify-center p-4 sm:p-8">
                  {currentImageIndex < galleryImages.length ? (
                    // Display Image
                    galleryImages[currentImageIndex] && (
                      <div className="relative flex items-center justify-center w-full h-full">
                        <Image
                          src={galleryImages[currentImageIndex]}
                          alt={`Product image ${currentImageIndex + 1}`}
                          width={1200}
                          height={800}
                          className="object-contain"
                          style={{ 
                            maxWidth: '100%',
                            maxHeight: '100%',
                            width: 'auto',
                            height: 'auto'
                          }}
                          priority
                          loading="eager"
                          onError={(e) => {
                            // Fallback for broken images
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )
                  ) : (
                    // Display Video
                    galleryVideos[currentImageIndex - galleryImages.length] && (
                      <div className="w-full h-full flex items-center justify-center p-4">
                        {getYouTubeVideoId(galleryVideos[currentImageIndex - galleryImages.length]) ? (
                          <div className="relative w-full max-w-4xl" style={{ aspectRatio: '16/9' }}>
                            <iframe
                              src={`https://www.youtube.com/embed/${getYouTubeVideoId(galleryVideos[currentImageIndex - galleryImages.length])}`}
                              title={`Product video ${currentImageIndex - galleryImages.length + 1}`}
                              className="w-full h-full rounded-lg"
                              frameBorder="0"
                              allowFullScreen
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-white max-w-md">
                            <FiPlay size={64} className="mb-6 text-purple-400" />
                            <p className="text-center mb-6 text-lg">External Video Link</p>
                            <a
                              href={galleryVideos[currentImageIndex - galleryImages.length]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-8 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors font-medium"
                            >
                              {t('Open Video')}
                            </a>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
                  
                {/* Navigation Arrows */}
                {(galleryImages.length + galleryVideos.length) > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImageIndex(prev => 
                        prev > 0 ? prev - 1 : (galleryImages.length + galleryVideos.length) - 1
                      )}
                      className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition-all duration-200 z-10 shadow-lg backdrop-blur-sm"
                      style={{ backdropFilter: 'blur(4px)' }}
                    >
                      <FiChevronLeft size={24} />
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex(prev => 
                        prev < (galleryImages.length + galleryVideos.length) - 1 ? prev + 1 : 0
                      )}
                      className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition-all duration-200 z-10 shadow-lg backdrop-blur-sm"
                      style={{ backdropFilter: 'blur(4px)' }}
                    >
                      <FiChevronRight size={24} />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnail Strip */}
              {(galleryImages.length + galleryVideos.length) > 1 && (
                <div className="flex-shrink-0 p-4 bg-gray-800 border-t border-gray-700">
                  <div 
                  className="flex space-x-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800" 
                  style={{ 
                    scrollbarWidth: 'thin', 
                    scrollbarColor: '#4B5563 #1F2937',
                    WebkitOverflowScrolling: 'touch'
                  }}
                >
                    {/* Image Thumbnails */}
                    {galleryImages.map((image, index) => (
                      <button
                        key={`img-${index}`}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                          index === currentImageIndex 
                            ? 'border-purple-500 ring-2 ring-purple-500/50' 
                            : 'border-gray-600 hover:border-gray-500 hover:scale-105'
                        }`}
                      >
                        <Image
                          src={image}
                          alt={`Thumbnail ${index + 1}`}
                          width={80}
                          height={80}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                    
                    {/* Video Thumbnails */}
                    {galleryVideos.map((video, index) => (
                      <button
                        key={`vid-${index}`}
                        onClick={() => setCurrentImageIndex(galleryImages.length + index)}
                        className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 relative bg-gradient-to-br from-purple-900 to-purple-700 flex items-center justify-center ${
                          (galleryImages.length + index) === currentImageIndex 
                            ? 'border-purple-500 ring-2 ring-purple-500/50' 
                            : 'border-gray-600 hover:border-gray-500 hover:scale-105'
                        }`}
                      >
                        <FiPlay size={24} className="text-white drop-shadow-lg" />
                        <div className="absolute inset-0 bg-black/20 rounded-lg"></div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* Cart Confirmation Popup */}
        {showCartConfirmation && addedProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-800 rounded-xl max-w-md w-full p-6 border border-gray-700"
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mr-4">
                  <FiCheck className="text-green-400 text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{t('Added to Cart')}</h3>
                  <p className="text-gray-400 text-sm">{t('Product successfully added')}</p>
                </div>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-600 rounded-lg overflow-hidden">
                    {(() => {
                      const productImages = getProductImages(addedProduct.images);
                      const imageLinks = getLinksArray(addedProduct.imageLinks);
                      const allImages = [...productImages, ...imageLinks];
                      const firstImage = allImages[0] || addedProduct.mainImage;
                      
                      return firstImage ? (
                        <Image
                          src={firstImage}
                          alt={addedProduct.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FiShoppingCart className="text-gray-400" />
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-white line-clamp-1">{addedProduct.name}</h4>
                    <p className="text-gray-400 text-sm">
                      {t('Quantity')}: {addedQuantity} × {(addedProduct.salePrice || addedProduct.price).toFixed(2)} CHF
                    </p>
                    <p className="text-purple-400 text-sm font-medium">
                      {t('Subtotal')}: {((addedProduct.salePrice || addedProduct.price) * addedQuantity).toFixed(2)} CHF
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCartConfirmation(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  {t('Continue Shopping')}
                </button>
                <button
                  onClick={() => {
                    setShowCartConfirmation(false);
                    handleCheckout();
                  }}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-all duration-200 font-medium"
                >
                  {t('Go to Cart')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Product Review Modal */}
      {showReviewModal && selectedProductForReview && (
        <ProductReviewModal
          productId={selectedProductForReview.id}
          productName={selectedProductForReview.name}
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedProductForReview(null);
          }}
        />
      )}

      {/* Write Review Modal */}
      {showWriteReviewModal && selectedProductForReview && selectedOrderIdForReview && (
        <WriteReviewModal
          productId={selectedProductForReview.id}
          productName={selectedProductForReview.name}
          orderId={selectedOrderIdForReview}
          isOpen={showWriteReviewModal}
          onClose={() => {
            setShowWriteReviewModal(false);
            setSelectedProductForReview(null);
            setSelectedOrderIdForReview('');
          }}
          onReviewSubmitted={() => {
            // Refresh products to update ratings
            loadProducts();
          }}
        />
      )}

      {/* Product Detail Modal with Variant Selector */}
      {showProductDetail && detailProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">{detailProduct.name}</h2>
              <button
                onClick={() => {
                  setShowProductDetail(false);
                  setDetailProduct(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Product Images */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {(() => {
                    // Get all images for detail product
                    const detailProductImages = getProductImages(detailProduct.images);
                    const detailImageLinks = getLinksArray(detailProduct.imageLinks);
                    const detailVideoLinks = getLinksArray(detailProduct.videoLinks);
                    const detailAllImages = [...detailProductImages, ...detailImageLinks];
                    
                    return (
                      <>
                        {detailAllImages[0] && (
                          <div 
                            className="aspect-square relative bg-gray-700 rounded-lg overflow-hidden cursor-pointer"
                            onClick={() => {
                              setGalleryImages(detailAllImages);
                              setGalleryVideos(detailVideoLinks);
                              setCurrentImageIndex(0);
                              setShowImageGallery(true);
                            }}
                          >
                            <Image
                              src={detailAllImages[0]}
                              alt={detailProduct.name}
                              fill
                              className="object-cover hover:scale-105 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                              <FiEye className="text-white text-2xl" />
                            </div>
                          </div>
                        )}
                        
                        {/* Additional images */}
                        {detailAllImages.length > 1 && (
                          <div className="grid grid-cols-4 gap-2">
                            {detailAllImages.slice(1, 5).map((image, index) => (
                              <div 
                                key={index} 
                                className="aspect-square relative bg-gray-700 rounded-lg overflow-hidden cursor-pointer"
                                onClick={() => {
                                  setGalleryImages(detailAllImages);
                                  setGalleryVideos(detailVideoLinks);
                                  setCurrentImageIndex(index + 1);
                                  setShowImageGallery(true);
                                }}
                              >
                                <Image
                                  src={image}
                                  alt={`${detailProduct.name} ${index + 2}`}
                                  fill
                                  className="object-cover hover:scale-105 transition-transform duration-200"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Show video count if any */}
                        {detailVideoLinks.length > 0 && (
                          <div className="text-center text-gray-400 text-sm">
                            + {detailVideoLinks.length} video(s) available in gallery
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                <div className="space-y-4">
                  {/* Product Info */}
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">{detailProduct.name}</h3>
                    <p className="text-gray-300 mb-4">{detailProduct.description}</p>
                    
                    {/* Price */}
                    <div className="mb-4">
                      {selectedVariants[detailProduct.id]?.variant ? (
                        <div>
                          <div className="text-2xl font-bold text-white">
                            {detailProduct.currency} {(selectedVariants[detailProduct.id].variant!.salePrice || selectedVariants[detailProduct.id].variant!.price).toFixed(2)}
                          </div>
                          {selectedVariants[detailProduct.id].variant!.salePrice && (
                            <div className="text-lg text-gray-400 line-through">
                              {detailProduct.currency} {selectedVariants[detailProduct.id].variant!.price.toFixed(2)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="text-2xl font-bold text-white">
                            {detailProduct.currency} {(detailProduct.salePrice || detailProduct.price).toFixed(2)}
                          </div>
                          {detailProduct.salePrice && (
                            <div className="text-lg text-gray-400 line-through">
                              {detailProduct.currency} {detailProduct.price.toFixed(2)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Product Material */}
                    {detailProduct.material && (
                      <div className="mb-4">
                        <span className="text-sm text-gray-400">{t('Material')}: </span>
                        <span className="text-white">{detailProduct.material}</span>
                      </div>
                    )}

                    {/* Weight */}
                    {(selectedVariants[detailProduct.id]?.variant?.weight || detailProduct.weight) && (
                      <div className="mb-4">
                        <span className="text-sm text-gray-400">{t('Weight')}: </span>
                        <span className="text-white">
                          {selectedVariants[detailProduct.id]?.variant?.weight || detailProduct.weight} kg
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Variant Selector */}
                  <ProductVariantSelector
                    product={detailProduct}
                    onVariantSelect={(variant, combinations) => {
                      setSelectedVariants(prev => ({
                        ...prev,
                        [detailProduct.id]: { variant, combinations }
                      }));
                    }}
                    selectedCombinations={selectedVariants[detailProduct.id]?.combinations}
                  />

                  {/* Stock Info */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    {selectedVariants[detailProduct.id]?.variant ? (
                      <div>
                        <span className="text-sm text-gray-400">{t('Stock')}: </span>
                        <span className={`font-medium ${selectedVariants[detailProduct.id].variant!.stock > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {selectedVariants[detailProduct.id].variant!.stock > 0 
                            ? `${selectedVariants[detailProduct.id].variant!.stock} ${t('available')}`
                            : t('Out of stock')
                          }
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-sm text-gray-400">{t('Stock')}: </span>
                        <span className={`font-medium ${detailProduct.stock > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {detailProduct.isUnlimitedStock 
                            ? t('In stock') 
                            : detailProduct.stock > 0 
                              ? `${detailProduct.stock} ${t('available')}`
                              : t('Out of stock')
                          }
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Add to Cart Button */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        const variant = selectedVariants[detailProduct.id]?.variant;
                        const combinations = selectedVariants[detailProduct.id]?.combinations;
                        
                        if (detailProduct.hasVariants && !variant) {
                          alert(t('Please select all required options'));
                          return;
                        }

                        addToCart(detailProduct, 1, variant || undefined, combinations);
                        setShowProductDetail(false);
                        setDetailProduct(null);
                      }}
                      disabled={
                        (detailProduct.hasVariants && !selectedVariants[detailProduct.id]?.variant) ||
                        (selectedVariants[detailProduct.id]?.variant ? 
                          selectedVariants[detailProduct.id].variant!.stock <= 0 : 
                          !detailProduct.isUnlimitedStock && detailProduct.stock <= 0
                        )
                      }
                      className="flex-1 px-6 py-3 bg-primary hover:bg-secondary disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                      <FiShoppingCart className="w-5 h-5" />
                      {t('Add to Cart')}
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowProductDetail(false);
                        setDetailProduct(null);
                      }}
                      className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                      {t('Cancel')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
