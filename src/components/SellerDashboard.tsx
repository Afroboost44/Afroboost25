'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiPlus, 
  FiMinus,
  FiEdit3, 
  FiTrash2, 
  FiEye, 
  FiShoppingCart, 
  FiTrendingUp, 
  FiDollarSign,
  FiPackage,
  FiUsers,
  FiStar,
  FiFilter,
  FiSearch,
  FiImage,
  FiSave,
  FiX,
  FiCheckCircle,
  FiClock,
  FiTruck,
  FiSettings,
  FiTag
} from 'react-icons/fi';
import { useAuth } from '@/lib/auth';
import Card from '@/components/Card';
import { useTranslation } from 'react-i18next';
import { Product, SellerProfile, Order, ProductCategory, SellerEarnings } from '@/types';
import Image from 'next/image';
import GiftCardManagement from '@/components/GiftCardManagement';
import ProductVariantManager from '@/components/ProductVariantManager';
import VariantTypeManager from '@/components/VariantTypeManager';

interface SellerDashboardProps {
  className?: string;
}

export default function SellerDashboard({ className = '' }: SellerDashboardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // Helper function to format dates properly
  const formatDate = (date: any) => {
    try {
      if (!date) return 'N/A';
      
      // Handle Firestore Timestamp
      if (date && typeof date === 'object' && date.seconds) {
        return new Date(date.seconds * 1000).toLocaleDateString();
      }
      
      // Handle regular Date or string
      const dateObj = new Date(date);
      return isNaN(dateObj.getTime()) ? 'N/A' : dateObj.toLocaleDateString();
    } catch (error) {
      return 'N/A';
    }
  };
  
  const [activeTab, setActiveTab] = useState('overview');
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [earnings, setEarnings] = useState<SellerEarnings | null>(null);
  const [variantTypes, setVariantTypes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Helper function to generate proper variant display text
  const generateVariantDisplayText = (variantDetails: any) => {
    if (!variantDetails) return '';
    
    // Check if displayText looks like technical IDs (contains long alphanumeric strings)
    const looksLikeTechnicalIds = variantDetails.displayText && 
      /[a-zA-Z0-9]{15,}/.test(variantDetails.displayText);
    
    // If we have combinations and variant types, or if displayText looks technical, generate proper text
    if ((variantDetails.combinations && variantTypes.length > 0) || looksLikeTechnicalIds) {
      if (variantDetails.combinations) {
        const displayParts: string[] = [];
        
        Object.entries(variantDetails.combinations).forEach(([typeId, optionId]) => {
          const variantType = variantTypes.find(vt => vt.id === typeId);
          if (variantType) {
            const optionsArray = Array.isArray(variantType.options) 
              ? variantType.options 
              : Object.values(variantType.options);
            const option = optionsArray.find((opt: any) => opt.id === optionId);
            if (option) {
              displayParts.push(`${variantType.displayName}: ${option.displayValue}`);
            }
          }
        });
        
        if (displayParts.length > 0) {
          return displayParts.join(', ');
        }
      }
    }

    // If displayText is already proper (contains readable text), use it
    if (variantDetails.displayText && 
        (variantDetails.displayText.includes('Size:') || 
         variantDetails.displayText.includes('Color:') ||
         variantDetails.displayText.includes(': ')) &&
        !looksLikeTechnicalIds) {
      return variantDetails.displayText;
    }

    return '';
  };
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Order details modal state
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showItemsModal, setShowItemsModal] = useState(false);
  
  // Delivery time editing state
  const [editingDeliveryTime, setEditingDeliveryTime] = useState<string | null>(null);
  const [deliveryTimeValue, setDeliveryTimeValue] = useState('');
  
  // Category management state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    icon: '',
    isActive: true,
    sortOrder: 0
  });

  // Notification state
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
  }>({
    show: false,
    type: 'success',
    message: ''
  });

  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Product form state
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    shortDescription: '',
    categoryId: '',
    price: 0,
    salePrice: 0,
    currency: 'CHF',
    images: [] as string[],
    imageLinks: [] as string[],
    videoLinks: [] as string[],
    mainImage: '',
    stock: 0,
    isUnlimitedStock: false,
    minOrderQuantity: 1,
    maxOrderQuantity: 100,
    tags: [] as string[],
    serviceType: 'delivery' as 'delivery' | 'pickup' | 'dine-in' | 'home-service',
    deliveryInfo: {
      freeDeliveryThreshold: 0,
      deliveryFee: 0,
      estimatedDeliveryTime: '2-3 business days',
      deliveryAreas: [] as string[]
    },
    locationInfo: {
      address: '',
      openingHours: {}
    },
    nutritionInfo: {
      calories: 0,
      allergens: [] as string[],
      ingredients: [] as string[],
      isVegan: false,
      isVegetarian: false,
      isGlutenFree: false
    },
    vatRate: 7.7, // Default Swiss VAT rate
    customVatRate: undefined as number | undefined,
    isActive: true
  });

  const tabs = [
    { id: 'overview', label: t('Overview'), icon: FiTrendingUp },
    { id: 'products', label: t('Products'), icon: FiPackage },
    { id: 'orders', label: t('Orders'), icon: FiShoppingCart },
    { id: 'categories', label: t('Categories'), icon: FiFilter },
    { id: 'variant-types', label: t('Variant Types'), icon: FiTag },
    { id: 'gift-cards', label: t('Gift Cards'), icon: FiCheckCircle },
    { id: 'earnings', label: t('Earnings'), icon: FiDollarSign },
    { id: 'settings', label: t('Settings'), icon: FiSettings }
  ];

  const orderStatuses = [
    { value: 'all', label: t('All Orders') },
    { value: 'processing', label: t('Processing') },
    { value: 'confirmed', label: t('Confirmed') },
    { value: 'preparing', label: t('Preparing') },
    { value: 'dispatched', label: t('Dispatched') },
    { value: 'delivered', label: t('Delivered') },
    { value: 'cancelled', label: t('Cancelled') }
  ];

  useEffect(() => {
    if (user) {
      loadSellerData();
      ensureDefaultCategories();
      loadVariantTypes();
    }
  }, [user]);

  const loadVariantTypes = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/marketplace/variant-types?sellerId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        // Normalize Firestore options (object to array)
        const normalizedTypes = (data.variantTypes || []).map((vt: any) => ({
          ...vt,
          options: Array.isArray(vt.options) ? vt.options : Object.values(vt.options)
        }));
        setVariantTypes(normalizedTypes);
      }
    } catch (error) {
      console.error('Error loading variant types:', error);
    }
  };

  const ensureDefaultCategories = async () => {
    try {
      // Try to seed categories if none exist
      await fetch('/api/marketplace/categories/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Error ensuring categories:', error);
    }
  };

  const loadSellerData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Load seller profile
      const profileResponse = await fetch(`/api/marketplace/seller-profile?userId=${user.id}`);
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setSellerProfile(profileData.profile);
      }

      // Load products
      const productsResponse = await fetch(`/api/marketplace/products?sellerId=${user.id}`);
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        setProducts(productsData.products || []);
      }

      // Load orders
      const ordersResponse = await fetch(`/api/marketplace/orders?sellerId=${user.id}`);
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        setOrders(ordersData.orders || []);
      }

      // Load categories
      try {
        const categoriesResponse = await fetch('/api/marketplace/categories?active=true');
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          setCategories(categoriesData.categories || []);
        } else {
          // If categories API fails, try to create default categories
          await ensureDefaultCategories();
          // Retry fetching categories
          const retryResponse = await fetch('/api/marketplace/categories?active=true');
          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            setCategories(retryData.categories || []);
          }
        }
      } catch (error) {
        console.error('Error loading categories:', error);
        setCategories([]);
      }

      // Load earnings
      const earningsResponse = await fetch(`/api/marketplace/seller-earnings?sellerId=${user.id}`);
      if (earningsResponse.ok) {
        const earningsData = await earningsResponse.json();
        setEarnings(earningsData.earnings);
      }

    } catch (error) {
      console.error('Error loading seller data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Notification functions
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ show: true, type, message });
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 5000);
  };

  const handleSaveProduct = async () => {
    if (!user || !sellerProfile || isSavingProduct) return;

    setIsSavingProduct(true);
    try {
      const productData = {
        ...productForm,
        sellerId: user.id,
        sellerName: sellerProfile.businessName,
        businessName: sellerProfile.businessName
      };

      let response;
      if (editingProduct) {
        response = await fetch(`/api/marketplace/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...productData, sellerId: user.id })
        });
      } else {
        response = await fetch('/api/marketplace/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productData)
        });
      }

      if (response.ok) {
        await loadSellerData();
        setShowProductModal(false);
        resetProductForm();
        
        // Show success notification
        const action = editingProduct ? t('updated') : t('created');
        showNotification('success', t(`Product has been ${action} successfully!`));
      } else {
        const errorData = await response.json().catch(() => ({}));
        showNotification('error', errorData.message || t('Failed to save product. Please try again.'));
      }
    } catch (error) {
      console.error('Error saving product:', error);
      showNotification('error', t('An error occurred while saving the product. Please try again.'));
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!user || !confirm(t('Are you sure you want to delete this product?'))) return;

    try {
      const response = await fetch(`/api/marketplace/products/${productId}?sellerId=${user.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadSellerData();
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    
    // Helper function to convert Firestore map to array
    const mapToArray = (mapOrArray: any): string[] => {
      if (!mapOrArray) return [];
      if (Array.isArray(mapOrArray)) return mapOrArray;
      if (typeof mapOrArray === 'object') {
        return Object.values(mapOrArray).filter(item => typeof item === 'string') as string[];
      }
      return [];
    };

    setProductForm({
      name: product.name || '',
      description: product.description || '',
      shortDescription: product.shortDescription || '',
      categoryId: product.categoryId || '',
      price: product.price || 0,
      salePrice: product.salePrice || 0,
      currency: product.currency || 'CHF',
      images: mapToArray(product.images),
      imageLinks: mapToArray(product.imageLinks),
      videoLinks: mapToArray(product.videoLinks),
      mainImage: product.mainImage || '',
      stock: product.stock || 0,
      isUnlimitedStock: product.isUnlimitedStock || false,
      minOrderQuantity: product.minOrderQuantity || 1,
      maxOrderQuantity: product.maxOrderQuantity || 100,
      tags: mapToArray(product.tags),
      serviceType: product.serviceType || 'delivery',
      deliveryInfo: {
        freeDeliveryThreshold: product.deliveryInfo?.freeDeliveryThreshold ?? 0,
        deliveryFee: product.deliveryInfo?.deliveryFee ?? 0,
        estimatedDeliveryTime: product.deliveryInfo?.estimatedDeliveryTime ?? '2-3 business days',
        deliveryAreas: mapToArray(product.deliveryInfo?.deliveryAreas)
      },
      locationInfo: {
        address: product.locationInfo?.address ?? '',
        openingHours: product.locationInfo?.openingHours ?? {}
      },
      nutritionInfo: {
        calories: product.nutritionInfo?.calories ?? 0,
        allergens: mapToArray(product.nutritionInfo?.allergens),
        ingredients: mapToArray(product.nutritionInfo?.ingredients),
        isVegan: product.nutritionInfo?.isVegan ?? false,
        isVegetarian: product.nutritionInfo?.isVegetarian ?? false,
        isGlutenFree: product.nutritionInfo?.isGlutenFree ?? false
      },
      vatRate: (product as any).vatRate ?? 7.7,
      customVatRate: (product as any).customVatRate ?? undefined,
      isActive: product.isActive ?? true
    });
    setShowProductModal(true);
  };

  const resetProductForm = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      description: '',
      shortDescription: '',
      categoryId: '',
      price: 0,
      salePrice: 0,
      currency: 'CHF',
      images: [],
      imageLinks: [],
      videoLinks: [],
      mainImage: '',
      stock: 0,
      isUnlimitedStock: false,
      minOrderQuantity: 1,
      maxOrderQuantity: 100,
      tags: [],
      serviceType: 'delivery',
      deliveryInfo: {
        freeDeliveryThreshold: 0,
        deliveryFee: 0,
        estimatedDeliveryTime: '2-3 business days',
        deliveryAreas: []
      },
      locationInfo: {
        address: '',
        openingHours: {}
      },
      nutritionInfo: {
        calories: 0,
        allergens: [],
        ingredients: [],
        isVegan: false,
        isVegetarian: false,
        isGlutenFree: false
      },
      vatRate: 7.7,
      customVatRate: undefined,
      isActive: true
    });
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string, sellerNotes?: string) => {
    if (!user) return;

    try {
      const response = await fetch(`/api/marketplace/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          sellerId: user.id,
          sellerNotes
        })
      });

      if (response.ok) {
        await loadSellerData();
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const handleUpdateDeliveryTime = async (orderId: string, estimatedDeliveryTime: string) => {
    if (!user) return;

    try {
      const response = await fetch(`/api/marketplace/orders/${orderId}/delivery-time`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estimatedDeliveryTime,
          sellerId: user.id
        })
      });

      if (response.ok) {
        await loadSellerData();
        setEditingDeliveryTime(null);
        setDeliveryTimeValue('');
      }
    } catch (error) {
      console.error('Error updating delivery time:', error);
    }
  };

  const startEditingDeliveryTime = (orderId: string, currentTime: string) => {
    setEditingDeliveryTime(orderId);
    setDeliveryTimeValue(currentTime || '2-3 business days');
  };

  const handleSaveCategory = async () => {
    if (!user) return;

    try {
      const categoryData = {
        ...categoryForm,
        createdBy: user.id
      };

      let response;
      if (editingCategory) {
        response = await fetch('/api/marketplace/categories', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingCategory.id, ...categoryData })
        });
      } else {
        response = await fetch('/api/marketplace/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(categoryData)
        });
      }

      if (response.ok) {
        await loadSellerData();
        setShowCategoryModal(false);
        resetCategoryForm();
      }
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!user || !confirm(t('Are you sure you want to delete this category?'))) return;

    try {
      const response = await fetch(`/api/marketplace/categories?id=${categoryId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadSellerData();
      }
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const handleEditCategory = (category: ProductCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      icon: category.icon || '',
      isActive: category.isActive,
      sortOrder: category.sortOrder || 0
    });
    setShowCategoryModal(true);
  };

  const resetCategoryForm = () => {
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      description: '',
      icon: '',
      isActive: true,
      sortOrder: 0
    });
  };

  const handleSeedCategories = async () => {
    try {
      const response = await fetch('/api/marketplace/categories/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        await loadSellerData();
      }
    } catch (error) {
      console.error('Error seeding categories:', error);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.orderStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing': return <FiClock className="text-yellow-500" />;
      case 'confirmed': return <FiCheckCircle className="text-blue-500" />;
      case 'preparing': return <FiPackage className="text-orange-500" />;
      case 'dispatched': return <FiTruck className="text-purple-500" />;
      case 'delivered': return <FiCheckCircle className="text-green-500" />;
      case 'cancelled': return <FiX className="text-red-500" />;
      default: return <FiClock className="text-gray-500" />;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">{t('Access Denied')}</h2>
          <p className="text-gray-400">{t('Please log in to access the seller dashboard.')}</p>
        </div>
      </div>
    );
  }

  if (!sellerProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center mt-16">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">{t('Seller Profile Not Found')}</h2>
          <p className="text-gray-400">{t('You need to apply and be approved as a seller first.')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-900 ${className} mt-16`}>
      {/* Notification Toast */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-50">
          <motion.div
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            className={`max-w-md p-4 rounded-xl shadow-lg border ${
              notification.type === 'success'
                ? 'bg-green-900/90 border-green-700 text-green-100'
                : 'bg-red-900/90 border-red-700 text-red-100'
            } backdrop-blur-sm`}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {notification.type === 'success' ? (
                  <FiCheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <FiX className="w-5 h-5 text-red-400" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{notification.message}</p>
              </div>
              <button
                onClick={() => setNotification(prev => ({ ...prev, show: false }))}
                className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {t('Seller Dashboard')}
              </h1>
              <p className="text-gray-400">
                {t('Welcome back')}, {sellerProfile.businessName}
              </p>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 rounded-lg">
              <span className="text-white font-medium">
                {sellerProfile.subscriptionModel === 'monthly' ? t('Monthly Plan') : t('Commission Plan')}
              </span>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{t('Total Products')}</p>
                  <p className="text-2xl font-bold text-white">{products.length}</p>
                </div>
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                  <FiPackage className="text-primary text-xl" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{t('Total Orders')}</p>
                  <p className="text-2xl font-bold text-white">{orders.length}</p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <FiShoppingCart className="text-green-400 text-xl" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{t('Total Revenue')}</p>
                  <p className="text-2xl font-bold text-white">
                    {earnings ? `${earnings.totalRevenue.toFixed(2)} CHF` : '0.00 CHF'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <FiDollarSign className="text-purple-400 text-xl" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{t('Available Balance')}</p>
                  <p className="text-2xl font-bold text-white">
                    {earnings ? `${earnings.availableBalance.toFixed(2)} CHF` : '0.00 CHF'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <FiTrendingUp className="text-yellow-400 text-xl" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700 mb-4">
            <nav className="flex space-x-2 overflow-x-auto items-center">
            {tabs.map((tab) => (
              <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-1 py-3 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
          activeTab === tab.id
          ? 'border-purple-500 text-purple-400'
          : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
              >
              <tab.icon className="text-base" />
              <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
            </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Recent Orders */}
            <Card>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">{t('Recent Orders')}</h3>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-purple-400 hover:text-purple-300 text-sm"
                >
                  {t('View All')}
                </button>
              </div>
              <div className="space-y-4">
                {orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(order.orderStatus)}
                      <div>
                        <p className="font-medium text-white">#{order.orderNumber}</p>
                        <p className="text-sm text-gray-400">{order.customerName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-white">{order.totalAmount.toFixed(2)} {order.currency}</p>
                      <p className="text-sm text-gray-400 capitalize">{order.orderStatus}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Top Products */}
            <Card>
              <h3 className="text-xl font-semibold text-white mb-6">{t('Top Products')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products
                  .sort((a, b) => b.totalSold - a.totalSold)
                  .slice(0, 6)
                  .map((product) => (
                    <div key={product.id} className="bg-gray-800 rounded-lg p-4">
                      <div className="aspect-square bg-gray-700 rounded-lg mb-4 overflow-hidden">
                        {product.mainImage ? (
                          <Image
                            src={product.mainImage}
                            alt={product.name}
                            width={200}
                            height={200}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FiImage className="text-gray-500 text-4xl" />
                          </div>
                        )}
                      </div>
                      <h4 className="font-medium text-white mb-2 line-clamp-2">{product.name}</h4>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-purple-400">{product.price.toFixed(2)} {product.currency}</span>
                        <span className="text-sm text-gray-400">{product.totalSold} sold</span>
                      </div>
                    </div>
                  ))
                }
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'products' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">{t('Products Management')}</h3>
              <button
                onClick={() => {
                  resetProductForm();
                  setShowProductModal(true);
                }}
                className="btn-primary flex items-center space-x-2"
              >
                <FiPlus />
                <span>{t('Add Product')}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-gray-600 transition-all duration-200"
                >
                  <div className="aspect-square bg-gray-700 relative group">
                    {product.mainImage ? (
                      <Image
                        src={product.mainImage}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FiImage className="text-gray-500 text-4xl" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                      <button
                      onClick={() => handleEditProduct(product)}
                      className="p-2 bg-primary hover:bg-secondary rounded-full text-white transition-colors"
                      >
                      <FiEdit3 />
                      </button>
                      <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="p-2 bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors"
                      >
                      <FiTrash2 />
                      </button>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center space-x-2 md:hidden">
                      <button
                      onClick={() => handleEditProduct(product)}
                      className="p-2 bg-primary rounded-full text-white transition-colors"
                      >
                      <FiEdit3 />
                      </button>
                      <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="p-2 bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors"
                      >
                      <FiTrash2 />
                      </button>
                    </div>
                    {!product.isActive && (
                      <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                        {t('Inactive')}
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h4 className="font-medium text-white mb-2 line-clamp-2">{product.name}</h4>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-purple-400">
                        {product.salePrice ? (
                          <span>
                            <span className="line-through text-gray-500 text-sm mr-2">
                              {product.price.toFixed(2)}
                            </span>
                            {product.salePrice.toFixed(2)} {product.currency}
                          </span>
                        ) : (
                          `${product.price.toFixed(2)} ${product.currency}`
                        )}
                      </span>
                      <div className="flex items-center space-x-1">
                        <FiStar className="text-yellow-400 text-sm" />
                        <span className="text-sm text-gray-400">{product.rating.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-400">
                      <span>{product.views} {t('views')}</span>
                      <span>{product.totalSold} {t('sold')}</span>
                    </div>
                    <div className="mt-2 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        product.stock > 10 ? 'bg-green-500/20 text-green-400' : 
                        product.stock > 0 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {product.isUnlimitedStock ? t('Unlimited') : `${product.stock} in stock`}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            <div className="flex flex-wrap justify-between items-center mb-6 space-y-4 md:space-y-0">
              <h3 className="text-xl font-semibold text-white">{t('Orders Management')}</h3>
              
              <div className="flex flex-wrap items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="relative w-full md:w-auto">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('Search orders...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-auto pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-auto px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {orderStatuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
              </div>
            </div>

            <Card>
              <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-4 px-4 text-gray-400 font-medium">{t('Order')}</th>
                <th className="text-left py-4 px-4 text-gray-400 font-medium">{t('Customer')}</th>
                <th className="text-left py-4 px-4 text-gray-400 font-medium">{t('Items')}</th>
                <th className="text-left py-4 px-4 text-gray-400 font-medium">{t('Total')}</th>
                <th className="text-left py-4 px-4 text-gray-400 font-medium">{t('Status')}</th>
                <th className="text-left py-4 px-4 text-gray-400 font-medium">{t('Date')}</th>
                <th className="text-left py-4 px-4 text-gray-400 font-medium">{t('Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="border-b border-gray-800 hover:bg-gray-800/50">
            <td className="py-4 px-4">
              <div>
                <p className="font-medium text-white">#{order.orderNumber}</p>
                <p className="text-sm text-gray-400">{order.deliveryType}</p>
              </div>
            </td>
            <td className="py-4 px-4">
              <div>
                <p className="font-medium text-white">{order.customerName}</p>
                <p className="text-sm text-gray-400">{order.customerEmail}</p>
              </div>
            </td>
            <td className="py-4 px-4">
              <button
                onClick={() => {
                  setSelectedOrder(order);
                  setShowItemsModal(true);
                }}
                className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
              >
                {order.items ? Object.keys(order.items).length : 0} items
              </button>
            </td>
            <td className="py-4 px-4">
              <p className="font-medium text-white">{order.totalAmount.toFixed(2)} {order.currency}</p>
            </td>
            <td className="py-4 px-4">
              <div className="flex items-center space-x-2">
                {getStatusIcon(order.orderStatus)}
                <span className="text-sm text-white capitalize">{order.orderStatus}</span>
              </div>
            </td>
            <td className="py-4 px-4 text-gray-400">
              {formatDate(order.createdAt)}
            </td>
            <td className="py-4 px-4">
              <div className="flex flex-wrap items-center space-x-2">
              {order.orderStatus === 'processing' && (
                <button
                onClick={() => handleUpdateOrderStatus(order.id, 'confirmed')}
                className="w-full sm:w-auto px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors"
                >
                {t('Confirm')}
                </button>
              )}
              {order.orderStatus === 'confirmed' && (
                <button
                onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                className="w-full sm:w-auto px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded transition-colors"
                >
                {t('Prepare')}
                </button>
              )}
              {order.orderStatus === 'preparing' && (
                <button
                onClick={() => handleUpdateOrderStatus(order.id, 'dispatched')}
                className="w-full sm:w-auto px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded transition-colors"
                >
                {t('Dispatch')}
                </button>
              )}
              {order.orderStatus === 'dispatched' && (
                <button
                onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                className="w-full sm:w-auto px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded transition-colors"
                >
                {t('Mark Delivered')}
                </button>
              )}
              <button
                onClick={() => {
                setSelectedOrder(order);
                setShowOrderModal(true);
                }}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <FiEye />
              </button>
              </div>
            </td>
                </tr>
              ))}
            </tbody>
          </table>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'categories' && (
          <div>
            <div className="flex flex-wrap justify-between items-center mb-6 space-y-4 md:space-y-0">
              <h3 className="text-xl font-semibold text-white">{t('Categories Management')}</h3>
              <div className="flex flex-wrap items-center space-y-4 md:space-y-0 md:space-x-3">
          <button
            onClick={handleSeedCategories}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <FiPackage />
            <span>{t('Seed Default Categories')}</span>
          </button>
          <button
            onClick={() => {
              resetCategoryForm();
              setShowCategoryModal(true);
            }}
            className="btn-primary flex items-center space-x-2"
          >
            <FiPlus />
            <span>{t('Add Category')}</span>
          </button>
              </div>
            </div>

            <Card>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <div key={category.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
            {category.icon && (
              <span className="text-2xl">{category.icon}</span>
            )}
            <div>
              <h4 className="font-medium text-white">{category.name}</h4>
              <p className="text-sm text-gray-400 mt-1">{category.description}</p>
            </div>
                </div>
                <div className="flex space-x-2">
            <button
              onClick={() => handleEditCategory(category)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <FiEdit3 />
            </button>
            <button
              onClick={() => handleDeleteCategory(category.id)}
              className="p-2 text-gray-400 hover:text-red-400 transition-colors"
            >
              <FiTrash2 />
            </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className={`px-2 py-1 rounded text-xs ${
            category.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
            {category.isActive ? t('Active') : t('Inactive')}
                </span>
                <span className="text-gray-400">Sort: {category.sortOrder || 0}</span>
              </div>
            </div>
          ))}
              </div>

              {categories.length === 0 && (
          <div className="text-center py-12">
            <FiPackage className="mx-auto text-4xl text-gray-500 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">{t('No Categories Found')}</h3>
            <p className="text-gray-400 mb-6">{t('Create categories to organize your products')}</p>
            <button
              onClick={handleSeedCategories}
              className="btn-primary"
            >
              {t('Create Default Categories')}
            </button>
          </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'earnings' && (
          <div className="space-y-8">
            <Card>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">{t('Earnings Overview')}</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-gray-400 text-sm">{t('Total Revenue')}</h4>
                    <FiDollarSign className="text-green-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {earnings ? `${earnings.totalRevenue.toFixed(2)} CHF` : '0.00 CHF'}
                  </p>
                </div>
                
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-gray-400 text-sm">{t('Available Balance')}</h4>
                    <FiTrendingUp className="text-purple-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {earnings ? `${earnings.availableBalance.toFixed(2)} CHF` : '0.00 CHF'}
                  </p>
                </div>
                
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-gray-400 text-sm">
                      {sellerProfile?.subscriptionModel === 'commission' ? t('Commission Fees') : t('Subscription Fees')}
                    </h4>
                    <FiPackage className="text-orange-400" />
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {earnings ? `${(earnings.commissionFees + earnings.subscriptionFees).toFixed(2)} CHF` : '0.00 CHF'}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-6">
                <h4 className="text-lg font-semibold text-white mb-4">{t('Earnings Details')}</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">{t('Total Orders')}</span>
                    <span className="text-white font-medium">{earnings?.totalOrders || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">{t('Net Earnings')}</span>
                    <span className="text-white font-medium">
                      {earnings ? `${earnings.netEarnings.toFixed(2)} CHF` : '0.00 CHF'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">{t('Total Withdrawn')}</span>
                    <span className="text-white font-medium">
                      {earnings ? `${earnings.totalWithdrawn.toFixed(2)} CHF` : '0.00 CHF'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">{t('Subscription Model')}</span>
                    <span className="text-white font-medium capitalize">
                      {sellerProfile?.subscriptionModel === 'monthly' ? t('Monthly Subscription') : t('Commission Based')}
                    </span>
                  </div>
                  {sellerProfile?.subscriptionModel === 'commission' && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">{t('Commission Rate')}</span>
                      <span className="text-white font-medium">{sellerProfile.commissionRate}%</span>
                    </div>
                  )}
                  {sellerProfile?.subscriptionModel === 'monthly' && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">{t('Monthly Fee')}</span>
                      <span className="text-white font-medium">{sellerProfile.monthlySubscriptionPrice} CHF</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'gift-cards' && (
          <GiftCardManagement userType="seller" />
        )}

        {activeTab === 'variant-types' && user && (
          <VariantTypeManager 
            sellerId={user.id} 
            sellerName={`${user.firstName} ${user.lastName}` || user.email || 'Seller'} 
          />
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8">
            <Card>
              <h3 className="text-xl font-semibold text-white mb-6">{t('Business Settings')}</h3>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      {t('Business Name')}
                    </label>
                    <input
                      type="text"
                      value={sellerProfile?.businessName || ''}
                      readOnly
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      {t('Business Category')}
                    </label>
                    <input
                      type="text"
                      value={sellerProfile?.businessCategory || ''}
                      readOnly
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {t('Business Description')}
                  </label>
                  <textarea
                    value={sellerProfile?.businessDescription || ''}
                    readOnly
                    rows={4}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300"
                  />
                </div>

                <div className="bg-gray-800 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-white mb-4">{t('Subscription Information')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <span className="text-gray-400 text-sm">{t('Current Plan')}</span>
                      <p className="text-white font-medium">
                        {sellerProfile?.subscriptionModel === 'monthly' ? t('Monthly Subscription') : t('Commission Based')}
                      </p>
                    </div>
                    
                    {sellerProfile?.subscriptionModel === 'monthly' && sellerProfile.nextPaymentDate && (
                      <div>
                        <span className="text-gray-400 text-sm">{t('Next Payment')}</span>
                        <p className="text-white font-medium">
                          {formatDate(sellerProfile.nextPaymentDate)}
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <span className="text-gray-400 text-sm">{t('Status')}</span>
                      <p className={`font-medium ${sellerProfile?.subscriptionStatus === 'active' ? 'text-green-400' : 'text-red-400'}`}>
                        {sellerProfile?.subscriptionStatus === 'active' ? t('Active') : t('Inactive')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="text-blue-400 mt-1">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-primary font-medium">{t('Need to update your settings?')}</h4>
                      <p className="text-gray-400 text-sm mt-1">
                        {t('Contact support to modify your business information or subscription plan.')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Product Modal */}
        {showProductModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-900 rounded-xl w-full max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Header - Fixed */}
              <div className="p-4 sm:p-6 border-b border-gray-700 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg sm:text-xl font-semibold text-white">
                    {editingProduct ? t('Edit Product') : t('Add New Product')}
                  </h3>
                  <button
                    onClick={() => setShowProductModal(false)}
                    className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-800 rounded-lg"
                  >
                    <FiX size={20} className="sm:w-6 sm:h-6" />
                  </button>
                </div>
              </div>

              {/* Content - Scrollable */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 sm:p-6 space-y-6">
                  {/* Product Images and Media */}
                  <div className="space-y-6">
                    <label className="block text-sm font-medium text-gray-400 mb-3">
                      {t('Product Images & Media')}
                    </label>

                    {/* Uploaded Images */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-3">{t('Uploaded Images')}</h4>
                      
                      {/* Display existing images */}
                      {productForm.images && productForm.images.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                          {productForm.images.map((imageUrl, index) => (
                            <div key={index} className="relative group">
                              <div className="aspect-square bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                                <Image
                                  src={imageUrl}
                                  alt={`Product image ${index + 1}`}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const newImages = [...productForm.images];
                                  newImages.splice(index, 1);
                                  setProductForm(prev => ({
                                    ...prev,
                                    images: newImages,
                                    mainImage: newImages[0] || ''
                                  }));
                                }}
                                className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <FiX size={12} />
                              </button>
                              {index === 0 && (
                                <div className="absolute bottom-1 left-1 bg-purple-500 text-white text-xs px-2 py-1 rounded">
                                  {t('Main')}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Upload new image */}
                      <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 hover:border-gray-500 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length === 0) return;

                            // Check file sizes
                            for (const file of files) {
                              if (file.size > 5 * 1024 * 1024) {
                                alert(t('All files must be less than 5MB'));
                                return;
                              }
                            }

                            // Upload files one by one
                            const newImageUrls: string[] = [];
                            for (const file of files) {
                              const formData = new FormData();
                              formData.append('file', file);

                              try {
                                const response = await fetch('/api/upload', {
                                  method: 'POST',
                                  body: formData
                                });

                                if (response.ok) {
                                  const data = await response.json();
                                  const imageUrl = data.secure_url || data.url;
                                  newImageUrls.push(imageUrl);
                                } else {
                                  throw new Error('Upload failed');
                                }
                              } catch (error) {
                                console.error('Image upload error:', error);
                                alert(t('Failed to upload image. Please try again.'));
                                return;
                              }
                            }

                            // Add new images to existing ones
                            setProductForm(prev => {
                              const allImages = [...prev.images, ...newImageUrls];
                              return {
                                ...prev,
                                images: allImages,
                                mainImage: prev.mainImage || allImages[0] || ''
                              };
                            });
                          }}
                          className="block w-full text-sm text-gray-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-600 file:text-white hover:file:bg-purple-700 file:cursor-pointer transition-all"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          {t('Upload multiple JPG, PNG, or WEBP images (max 5MB each)')}
                        </p>
                      </div>
                    </div>

                    {/* Image Links */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-3">{t('External Image Links')}</h4>
                      
                      {/* Display existing image links */}
                      {productForm.imageLinks && productForm.imageLinks.length > 0 && (
                        <div className="space-y-2 mb-4">
                          {productForm.imageLinks.map((link, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <input
                                type="url"
                                value={link}
                                onChange={(e) => {
                                  const newLinks = [...productForm.imageLinks];
                                  newLinks[index] = e.target.value;
                                  setProductForm(prev => ({ ...prev, imageLinks: newLinks }));
                                }}
                                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder={t('Enter image URL')}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newLinks = [...productForm.imageLinks];
                                  newLinks.splice(index, 1);
                                  setProductForm(prev => ({ ...prev, imageLinks: newLinks }));
                                }}
                                className="p-2 text-red-400 hover:text-red-300 transition-colors"
                              >
                                <FiX size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add new image link */}
                      <button
                        type="button"
                        onClick={() => {
                          setProductForm(prev => ({
                            ...prev,
                            imageLinks: [...prev.imageLinks, '']
                          }));
                        }}
                        className="flex items-center space-x-2 text-purple-400 hover:text-purple-300 transition-colors text-sm"
                      >
                        <FiPlus size={16} />
                        <span>{t('Add Image Link')}</span>
                      </button>
                    </div>

                    {/* Video Links */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-3">{t('Video Links')}</h4>
                      
                      {/* Display existing video links */}
                      {productForm.videoLinks && productForm.videoLinks.length > 0 && (
                        <div className="space-y-2 mb-4">
                          {productForm.videoLinks.map((link, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <input
                                type="url"
                                value={link}
                                onChange={(e) => {
                                  const newLinks = [...productForm.videoLinks];
                                  newLinks[index] = e.target.value;
                                  setProductForm(prev => ({ ...prev, videoLinks: newLinks }));
                                }}
                                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder={t('Enter YouTube, Vimeo, or other video URL')}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newLinks = [...productForm.videoLinks];
                                  newLinks.splice(index, 1);
                                  setProductForm(prev => ({ ...prev, videoLinks: newLinks }));
                                }}
                                className="p-2 text-red-400 hover:text-red-300 transition-colors"
                              >
                                <FiX size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add new video link */}
                      <button
                        type="button"
                        onClick={() => {
                          setProductForm(prev => ({
                            ...prev,
                            videoLinks: [...prev.videoLinks, '']
                          }));
                        }}
                        className="flex items-center space-x-2 text-purple-400 hover:text-purple-300 transition-colors text-sm"
                      >
                        <FiPlus size={16} />
                        <span>{t('Add Video Link')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Product Name and Category */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-400">
                        {t('Product Name')} <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={productForm.name}
                        onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        placeholder={t('Enter product name')}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-400">
                        {t('Category')} <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={productForm.categoryId}
                        onChange={(e) => setProductForm(prev => ({ ...prev, categoryId: e.target.value }))}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      >
                        <option value="">{t('Select Category')}</option>
                        {categories.length > 0 ? (
                          categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="sports-equipment">{t('Sports Equipment')}</option>
                            <option value="sports-nutrition">{t('Sports Nutrition')}</option>
                            <option value="dance-equipment">{t('Dance Equipment')}</option>
                            <option value="food-beverages">{t('Food & Beverages')}</option>
                            <option value="fitness-apparel">{t('Fitness Apparel')}</option>
                            <option value="training-materials">{t('Training Materials')}</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Price Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-400">
                        {t('Price')} <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={productForm.price}
                          onChange={(e) => setProductForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                          className="w-full pl-4 pr-16 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                        />
                        <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 font-medium">
                          CHF
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-400">
                        {t('Sale Price')} <span className="text-gray-500">({t('Optional')})</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={productForm.salePrice}
                          onChange={(e) => setProductForm(prev => ({ ...prev, salePrice: parseFloat(e.target.value) || 0 }))}
                          className="w-full pl-4 pr-16 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                        />
                        <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 font-medium">
                          CHF
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-400">
                      {t('Description')} <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={productForm.description}
                      onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                      placeholder={t('Enter product description')}
                    />
                  </div>

                  {/* Service Type and Stock */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-400">
                        {t('Service Type')} <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={productForm.serviceType}
                        onChange={(e) => setProductForm(prev => ({ ...prev, serviceType: e.target.value as any }))}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      >
                        <option value="delivery">{t('Delivery')}</option>
                        <option value="pickup">{t('Pickup')}</option>
                        <option value="dine-in">{t('Dine-in')}</option>
                        <option value="home-service">{t('Home Service')}</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-400">
                        {t('Stock Quantity')}
                      </label>
                      <div className="space-y-3">
                        <input
                          type="number"
                          value={productForm.stock}
                          onChange={(e) => setProductForm(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                          disabled={productForm.isUnlimitedStock}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="0"
                          min="0"
                        />
                        <label className="flex items-center space-x-3 text-sm">
                          <input
                            type="checkbox"
                            checked={productForm.isUnlimitedStock}
                            onChange={(e) => setProductForm(prev => ({ ...prev, isUnlimitedStock: e.target.checked }))}
                            className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-purple-500 focus:ring-2"
                          />
                          <span className="text-gray-400">{t('Unlimited Stock')}</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* VAT Settings */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                      {t('VAT Settings')}
                    </h4>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-400">
                          {t('VAT Rate')} (%)
                        </label>
                        <select
                          value={productForm.vatRate || 7.7}
                          onChange={(e) => setProductForm(prev => ({ 
                            ...prev, 
                            vatRate: parseFloat(e.target.value),
                            customVatRate: undefined
                          }))}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        >
                          <option value={0}>0% - {t('VAT Exempt')}</option>
                          <option value={2.5}>2.5% - {t('Reduced Rate')}</option>
                          <option value={7.7}>7.7% - {t('Standard Rate (Switzerland)')}</option>
                          <option value={19}>19% - {t('Standard Rate (Germany)')}</option>
                          <option value={20}>20% - {t('Standard Rate (France)')}</option>
                          <option value={21}>21% - {t('Standard Rate (Belgium)')}</option>
                          <option value={22}>22% - {t('Standard Rate (Italy)')}</option>
                          <option value={23}>23% - {t('Standard Rate (Portugal)')}</option>
                        </select>
                        <p className="text-xs text-gray-500">
                          {t('Select the VAT rate for this product based on your country')}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-400">
                          {t('Custom VAT Rate')} (%)
                        </label>
                        <div className="flex items-center space-x-3">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={productForm.customVatRate || ''}
                            onChange={(e) => {
                              const customRate = parseFloat(e.target.value);
                              setProductForm(prev => ({ 
                                ...prev, 
                                customVatRate: isNaN(customRate) ? undefined : customRate,
                                vatRate: isNaN(customRate) ? prev.vatRate : customRate
                              }))
                            }}
                            className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            placeholder="Enter custom rate"
                          />
                          <button
                            type="button"
                            onClick={() => setProductForm(prev => ({ 
                              ...prev, 
                              customVatRate: undefined,
                              vatRate: 7.7
                            }))}
                            className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors text-sm"
                          >
                            {t('Clear')}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500">
                          {t('Override with a custom VAT rate if needed')}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-800/50 p-4 rounded-xl">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">{t('Price excluding VAT')}:</span>
                        <span className="text-white font-medium">
                          CHF {(productForm.price || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-gray-400">{t('VAT amount')} ({productForm.vatRate || 0}%):</span>
                        <span className="text-white font-medium">
                          CHF {((productForm.price || 0) * (productForm.vatRate || 0) / 100).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-lg font-semibold mt-3 pt-2 border-t border-gray-700">
                        <span className="text-white">{t('Total price including VAT')}:</span>
                        <span className="text-purple-400">
                          CHF {((productForm.price || 0) * (1 + (productForm.vatRate || 0) / 100)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Settings - Only show for delivery service type */}
                  {productForm.serviceType === 'delivery' && (
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">
                        {t('Delivery Settings')}
                      </h4>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-400">
                            {t('Delivery Fee')} (CHF)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={productForm.deliveryInfo.deliveryFee}
                            onChange={(e) => setProductForm(prev => ({ 
                              ...prev, 
                              deliveryInfo: { 
                                ...prev.deliveryInfo, 
                                deliveryFee: parseFloat(e.target.value) || 0 
                              }
                            }))}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            placeholder="0.00"
                          />
                          <p className="text-xs text-gray-500">
                            {t('Cost charged to customer for delivery. Set by your delivery service provider.')}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-400">
                            {t('Free Delivery Threshold')} (CHF)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={productForm.deliveryInfo.freeDeliveryThreshold}
                            onChange={(e) => setProductForm(prev => ({ 
                              ...prev, 
                              deliveryInfo: { 
                                ...prev.deliveryInfo, 
                                freeDeliveryThreshold: parseFloat(e.target.value) || 0 
                              }
                            }))}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            placeholder="0.00"
                          />
                          <p className="text-xs text-gray-500">
                            {t('Minimum order value for free delivery (optional)')}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-400">
                          {t('Estimated Delivery Time')}
                        </label>
                        <select
                          value={productForm.deliveryInfo.estimatedDeliveryTime}
                          onChange={(e) => setProductForm(prev => ({ 
                            ...prev, 
                            deliveryInfo: { 
                              ...prev.deliveryInfo, 
                              estimatedDeliveryTime: e.target.value 
                            }
                          }))}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        >
                          <option value="30-60 minutes">30-60 minutes</option>
                          <option value="1-2 hours">1-2 hours</option>
                          <option value="2-4 hours">2-4 hours</option>
                          <option value="Same day">Same day</option>
                          <option value="1-2 business days">1-2 business days</option>
                          <option value="2-3 business days">2-3 business days</option>
                          <option value="3-5 business days">3-5 business days</option>
                          <option value="1 week">1 week</option>
                          <option value="2-3 weeks">2-3 weeks</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Active Status */}
                  <div className="flex items-center space-x-3 pt-2">
                    <input
                      type="checkbox"
                      checked={productForm.isActive}
                      onChange={(e) => setProductForm(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-purple-500 focus:ring-2"
                    />
                    <label className="text-sm text-gray-400">
                      {t('Product is active and visible to customers')}
                    </label>
                  </div>

                  {/* Product Variants Section */}
                  {editingProduct && (
                    <div className="border-t border-gray-700 pt-6">
                      <ProductVariantManager 
                        product={editingProduct} 
                        onUpdate={loadSellerData}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Footer - Fixed */}
              <div className="p-4 sm:p-6 border-t border-gray-700 flex-shrink-0">
                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
                  <button
                    onClick={() => setShowProductModal(false)}
                    className="px-6 py-2.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-all font-medium"
                  >
                    {t('Cancel')}
                  </button>
                  <button
                    onClick={handleSaveProduct}
                    disabled={isSavingProduct}
                    className={`btn-primary flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl font-medium ${
                      isSavingProduct ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {isSavingProduct ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full" />
                        <span>{t('Saving...')}</span>
                      </>
                    ) : (
                      <>
                        <FiSave className="w-4 h-4" />
                        <span>{editingProduct ? t('Update Product') : t('Create Product')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Category Modal */}
        {showCategoryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-white">
                    {editingCategory ? t('Edit Category') : t('Add New Category')}
                  </h3>
                  <button
                    onClick={() => setShowCategoryModal(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <FiX size={24} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      {t('Category Name')} *
                    </label>
                    <input
                      type="text"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder={t('Enter category name')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      {t('Icon')} ({t('Emoji')})
                    </label>
                    <input
                      type="text"
                      value={categoryForm.icon}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, icon: e.target.value }))}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="🏃‍♂️"
                      maxLength={4}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    {t('Description')}
                  </label>
                  <textarea
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder={t('Enter category description')}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      {t('Sort Order')}
                    </label>
                    <input
                      type="number"
                      value={categoryForm.sortOrder}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="0"
                    />
                  </div>

                  <div className="flex items-center space-x-4 mt-8">
                    <label className="flex items-center space-x-2 text-sm text-gray-400">
                      <input
                        type="checkbox"
                        checked={categoryForm.isActive}
                        onChange={(e) => setCategoryForm(prev => ({ ...prev, isActive: e.target.checked }))}
                        className="rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-purple-500"
                      />
                      <span>{t('Active')}</span>
                    </label>
                  </div>
                </div>

                {/* Common Category Suggestions */}
                {!editingCategory && (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-3">{t('Quick Add Suggestions')}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {[
                        { name: t('Sports Equipment'), icon: '🏃‍♂️' },
                        { name: t('Sports Nutrition'), icon: '💪' },
                        { name: t('Dance Equipment'), icon: '💃' },
                        { name: t('Food & Beverages'), icon: '🍎' },
                        { name: t('Fitness Apparel'), icon: '👕' },
                        { name: t('Training Materials'), icon: '📚' },
                        { name: t('Health & Wellness'), icon: '🧘‍♀️' },
                        { name: t('Electronic Devices'), icon: '📱' },
                        { name: t('Beauty & Care'), icon: '💄' }
                      ].map((suggestion) => (
                        <button
                          key={suggestion.name}
                          onClick={() => {
                            setCategoryForm(prev => ({
                              ...prev,
                              name: suggestion.name,
                              icon: suggestion.icon,
                              description: `${suggestion.name} category`
                            }));
                          }}
                          className="flex items-center space-x-2 p-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white transition-colors"
                        >
                          <span>{suggestion.icon}</span>
                          <span className="truncate">{suggestion.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-700 flex justify-end space-x-4">
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  {t('Cancel')}
                </button>
                <button
                  onClick={handleSaveCategory}
                  disabled={!categoryForm.name.trim()}
                  className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiSave />
                  <span>{editingCategory ? t('Update Category') : t('Create Category')}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
          >
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-start mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-semibold text-white pr-4">
                  {t('Order Details')} - #{selectedOrder.orderNumber}
                </h3>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="text-gray-400 hover:text-white flex-shrink-0"
                >
                  <FiX size={20} className="sm:w-6 sm:h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Customer Information */}
                <div className="space-y-3 sm:space-y-4">
                  <h4 className="text-base sm:text-lg font-medium text-white">{t('Customer Information')}</h4>
                  <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
                    <div className="break-words">
                      <span className="text-gray-400 text-sm">{t('Name')}: </span>
                      <span className="text-white">{selectedOrder.customerName}</span>
                    </div>
                    <div className="break-words">
                      <span className="text-gray-400 text-sm">{t('Email')}: </span>
                      <span className="text-white">{selectedOrder.customerEmail}</span>
                    </div>
                    <div className="break-words">
                      <span className="text-gray-400 text-sm">{t('Phone')}: </span>
                      <span className="text-white">{selectedOrder.customerPhone}</span>
                    </div>
                  </div>
                </div>

                {/* Order Information */}
                <div className="space-y-3 sm:space-y-4">
                  <h4 className="text-base sm:text-lg font-medium text-white">{t('Order Information')}</h4>
                  <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
                    <div>
                      <span className="text-gray-400 text-sm">{t('Order Status')}: </span>
                      <span className="text-white capitalize">{selectedOrder.orderStatus}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">{t('Payment Status')}: </span>
                      <span className="text-white capitalize">{selectedOrder.paymentStatus}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">{t('Delivery Type')}: </span>
                      <span className="text-white capitalize">{selectedOrder.deliveryType}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">{t('Payment Method')}: </span>
                      <span className="text-white capitalize">{selectedOrder.paymentMethod}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 text-sm">{t('Date')}: </span>
                      <span className="text-white">{formatDate(selectedOrder.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Delivery Time Management */}
                <div className="space-y-3 sm:space-y-4 lg:col-span-2">
                  <h4 className="text-base sm:text-lg font-medium text-white">{t('Delivery Management')}</h4>
                  <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
                    <div>
                      <span className="text-gray-400 text-sm">{t('Estimated Delivery Time')}: </span>
                      {editingDeliveryTime === selectedOrder.id ? (
                        <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                          <input
                            type="text"
                            value={deliveryTimeValue}
                            onChange={(e) => setDeliveryTimeValue(e.target.value)}
                            className="bg-gray-700 text-white px-3 py-2 rounded text-sm flex-1 w-full sm:w-auto"
                            placeholder="e.g., 2-3 business days"
                          />
                          <div className="flex space-x-2 w-full sm:w-auto">
                            <button
                              onClick={() => handleUpdateDeliveryTime(selectedOrder.id, deliveryTimeValue)}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm flex items-center justify-center space-x-1 flex-1 sm:flex-none"
                            >
                              <FiSave size={14} />
                              <span>{t('Save')}</span>
                            </button>
                            <button
                              onClick={() => {
                                setEditingDeliveryTime(null);
                                setDeliveryTimeValue('');
                              }}
                              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm flex-1 sm:flex-none"
                            >
                              <FiX size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-1 space-y-2 sm:space-y-0">
                          <span className="text-white">{selectedOrder.estimatedDeliveryTime || '2-3 business days'}</span>
                          <button
                            onClick={() => startEditingDeliveryTime(selectedOrder.id, selectedOrder.estimatedDeliveryTime || '2-3 business days')}
                            className="text-purple-400 hover:text-purple-300 text-sm flex items-center space-x-1 self-start sm:self-auto"
                          >
                            <FiEdit3 size={14} />
                            <span>{t('Edit')}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              {selectedOrder.deliveryAddress && (
                <div className="mt-4 sm:mt-6">
                  <h4 className="text-base sm:text-lg font-medium text-white mb-3 sm:mb-4">{t('Delivery Address')}</h4>
                  <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4">
                    <p className="text-white break-words">{selectedOrder.deliveryAddress.fullName}</p>
                    <p className="text-gray-400 break-words">{selectedOrder.deliveryAddress.address}</p>
                    <p className="text-gray-400 break-words">
                      {selectedOrder.deliveryAddress.postalCode} {selectedOrder.deliveryAddress.city}
                    </p>
                    <p className="text-gray-400 break-words">{selectedOrder.deliveryAddress.country}</p>
                    {selectedOrder.deliveryAddress.phone && (
                      <p className="text-gray-400 mt-2 break-words">{t('Phone')}: {selectedOrder.deliveryAddress.phone}</p>
                    )}
                    {selectedOrder.deliveryAddress.notes && (
                      <p className="text-gray-400 mt-2 break-words">{t('Notes')}: {selectedOrder.deliveryAddress.notes}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div className="mt-4 sm:mt-6">
                <h4 className="text-base sm:text-lg font-medium text-white mb-3 sm:mb-4">{t('Order Items')}</h4>
                <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4 space-y-3">
                  {selectedOrder.items && Object.values(selectedOrder.items).map((item: any, index: number) => (
                    <div key={item.id || index} className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 py-2 border-b border-gray-700 last:border-b-0">
                      <div className="w-16 h-16 sm:w-16 sm:h-16 bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 self-start sm:self-center">
                        {item.productImage ? (
                          <Image
                            src={item.productImage}
                            alt={item.productName || 'Product'}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FiPackage className="text-gray-400 text-xl" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-white break-words">{item.productName || 'Unknown Product'}</h5>
                        {/* Variant Details */}
                        {item.variantDetails && (
                          <div className="space-y-1 mt-1">
                            {(() => {
                              const displayText = generateVariantDisplayText(item.variantDetails);
                              return displayText ? (
                                <p className="text-sm text-primary-300 break-words">
                                  {displayText}
                                </p>
                              ) : null;
                            })()}
                            {item.variantSku && (
                              <p className="text-xs text-gray-500 break-words">
                                SKU: {item.variantSku}
                              </p>
                            )}
                            {item.variantDetails.weight && (
                              <p className="text-xs text-gray-400">
                                {t('Weight')}: {item.variantDetails.weight} kg
                              </p>
                            )}
                          </div>
                        )}
                        <p className="text-sm text-gray-400 break-words">
                          {t('Quantity')}: {item.quantity || 1} × {(item.price || 0).toFixed(2)} {selectedOrder.currency}
                        </p>
                        {item.specialInstructions && (
                          <p className="text-xs text-purple-300 mt-1 break-words">
                            {t('Instructions')}: {item.specialInstructions}
                          </p>
                        )}
                      </div>
                      <div className="text-left sm:text-right flex-shrink-0">
                        <p className="font-medium text-white">
                          {(item.subtotal || 0).toFixed(2)} {selectedOrder.currency}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="mt-4 sm:mt-6">
                <h4 className="text-base sm:text-lg font-medium text-white mb-3 sm:mb-4">{t('Order Summary')}</h4>
                <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-gray-400 text-sm">{t('Subtotal')}:</span>
                    <span className="text-white text-sm font-medium">{selectedOrder.subtotal.toFixed(2)} {selectedOrder.currency}</span>
                  </div>
                  {selectedOrder.deliveryFee > 0 && (
                    <div className="flex justify-between items-start">
                      <span className="text-gray-400 text-sm">{t('Delivery Fee')}:</span>
                      <span className="text-white text-sm font-medium">{selectedOrder.deliveryFee.toFixed(2)} {selectedOrder.currency}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-start">
                    <span className="text-gray-400 text-sm">{t('VAT')} ({selectedOrder.vatRate}%):</span>
                    <span className="text-white text-sm font-medium">{selectedOrder.vatAmount.toFixed(2)} {selectedOrder.currency}</span>
                  </div>
                  <div className="flex justify-between items-start font-bold pt-2 border-t border-gray-700">
                    <span className="text-white text-sm sm:text-base">{t('Total')}:</span>
                    <span className="text-purple-400 text-sm sm:text-base">{selectedOrder.totalAmount.toFixed(2)} {selectedOrder.currency}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {(selectedOrder.notes || selectedOrder.sellerNotes) && (
                <div className="mt-6">
                  <h4 className="text-lg font-medium text-white mb-4">{t('Notes')}</h4>
                  <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
                    {selectedOrder.notes && (
                      <div>
                        <span className="text-gray-400 text-sm">{t('Customer Notes')}: </span>
                        <span className="text-white">{selectedOrder.notes}</span>
                      </div>
                    )}
                    {selectedOrder.sellerNotes && (
                      <div>
                        <span className="text-gray-400 text-sm">{t('Seller Notes')}: </span>
                        <span className="text-white">{selectedOrder.sellerNotes}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Items Modal - Simplified version focused on items */}
      {showItemsModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-white">
                  {t('Order Items')} - #{selectedOrder.orderNumber}
                </h3>
                <button
                  onClick={() => setShowItemsModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <FiX size={24} />
                </button>
              </div>

              <div className="space-y-4">
                {selectedOrder.items && Object.values(selectedOrder.items).map((item: any, index: number) => (
                  <div key={item.id || index} className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-20 h-20 bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                        {item.productImage ? (
                          <Image
                            src={item.productImage}
                            alt={item.productName || 'Product'}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FiPackage className="text-gray-400 text-2xl" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h5 className="font-medium text-white text-lg">{item.productName || 'Unknown Product'}</h5>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-gray-400">
                            {t('Unit Price')}: {(item.price || 0).toFixed(2)} {selectedOrder.currency}
                          </p>
                          <p className="text-sm text-gray-400">
                            {t('Quantity')}: {item.quantity || 1}
                          </p>
                          <p className="text-sm font-medium text-purple-300">
                            {t('Subtotal')}: {(item.subtotal || 0).toFixed(2)} {selectedOrder.currency}
                          </p>
                          {item.specialInstructions && (
                            <p className="text-sm text-yellow-300 mt-2">
                              <strong>{t('Special Instructions')}:</strong> {item.specialInstructions}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Order Total Summary */}
                <div className="border-t border-gray-700 pt-4 mt-6">
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span className="text-white">{t('Order Total')}:</span>
                      <span className="text-purple-400">{selectedOrder.totalAmount.toFixed(2)} {selectedOrder.currency}</span>
                    </div>
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
