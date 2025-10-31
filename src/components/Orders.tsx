'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiPackage, 
  FiClock, 
  FiCheckCircle, 
  FiTruck,
  FiMapPin,
  FiPhone,
  FiMail,
  FiCalendar,
  FiDollarSign
} from 'react-icons/fi';
import { useAuth } from '@/lib/auth';
import Card from '@/components/Card';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import ReviewableOrderItems from '@/components/ReviewableOrderItems';

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  price: number;
  quantity: number;
  subtotal: number;
  specialInstructions?: string;
  variantId?: string;
  variantSku?: string;
  variantDetails?: {
    displayText: string;
    weight?: number;
    options: Record<string, string>;
    combinations?: Record<string, string>; // Raw variant type ID to option ID mapping
  };
}

interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  sellerId: string;
  sellerName: string;
  businessName: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  vatAmount: number;
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  deliveryType: string;
  deliveryAddress?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  estimatedDeliveryTime?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface OrdersProps {
  className?: string;
}

export default function Orders({ className = '' }: OrdersProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [variantTypes, setVariantTypes] = useState<any[]>([]);
  const [variantTypesCache, setVariantTypesCache] = useState<{ [sellerId: string]: any[] }>({});

  const [showReviews, setShowReviews] = useState<{ [orderId: string]: boolean }>({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 5;

  const loadVariantTypesForSellers = async (sellerIds: string[]) => {
    try {
      const newCache = { ...variantTypesCache };
      const uniqueSellerIds = [...new Set(sellerIds)];
      
      for (const sellerId of uniqueSellerIds) {
        if (!newCache[sellerId]) {
          const response = await fetch(`/api/marketplace/variant-types?sellerId=${sellerId}`);
          if (response.ok) {
            const data = await response.json();
            newCache[sellerId] = (data.variantTypes || []).map((vt: any) => ({
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

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const loadVariantTypes = async () => {
    // This is now replaced by loadVariantTypesForSellers
    return;
  };

  const generateVariantDisplayText = (variantDetails: any, sellerId?: string) => {
    if (!variantDetails) return '';
    
    // Check if displayText looks like technical IDs (contains long alphanumeric strings)
    const looksLikeTechnicalIds = variantDetails.displayText && 
      /[a-zA-Z0-9]{15,}/.test(variantDetails.displayText);
    
    // Get variant types for the specific seller, or fall back to all variant types
    const relevantVariantTypes = sellerId && variantTypesCache[sellerId] 
      ? variantTypesCache[sellerId] 
      : variantTypes;
    
    // If we have combinations and variant types, or if displayText looks technical, generate proper text
    if ((variantDetails.combinations && relevantVariantTypes.length > 0) || looksLikeTechnicalIds) {
      if (variantDetails.combinations) {
        const displayParts: string[] = [];
        
        Object.entries(variantDetails.combinations).forEach(([typeId, optionId]) => {
          const variantType = relevantVariantTypes.find(vt => vt.id === typeId);
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

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/marketplace/orders?customerId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        const ordersData = data.orders || [];
        setOrders(ordersData);
        
        // Extract unique seller IDs from orders to load their variant types
        const sellerIds = [...new Set(ordersData
          .map((order: any) => order.sellerId)
          .filter((id: any) => typeof id === 'string'))] as string[];
        if (sellerIds.length > 0) {
          await loadVariantTypesForSellers(sellerIds);
        }
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'processing': return <FiClock className="text-yellow-500" />;
      case 'confirmed': return <FiCheckCircle className="text-blue-500" />;
      case 'preparing': return <FiPackage className="text-orange-500" />;
      case 'dispatched': return <FiTruck className="text-purple-500" />;
      case 'delivered': return <FiCheckCircle className="text-green-500" />;
      case 'cancelled': return <FiCheckCircle className="text-red-500" />;
      default: return <FiClock className="text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'processing': return 'text-yellow-400 bg-yellow-500/20';
      case 'confirmed': return 'text-blue-400 bg-blue-500/20';
      case 'preparing': return 'text-orange-400 bg-orange-500/20';
      case 'dispatched': return 'text-purple-400 bg-purple-500/20';
      case 'delivered': return 'text-green-400 bg-green-500/20';
      case 'cancelled': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const filteredOrders = orders.filter(order => 
    statusFilter === 'all' || order.orderStatus.toLowerCase() === statusFilter
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">{t('Access Denied')}</h2>
          <p className="text-gray-400">{t('Please log in to view your orders.')}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">{t('Loading your orders...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-900 mt-16 ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">{t('My Orders')}</h1>
            <p className="text-gray-300 max-w-2xl mx-auto">
              {t('Track your orders and view order history')}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'all', label: t('All Orders') },
              { value: 'processing', label: t('Processing') },
              { value: 'confirmed', label: t('Confirmed') },
              { value: 'preparing', label: t('Preparing') },
              { value: 'dispatched', label: t('Dispatched') },
              { value: 'delivered', label: t('Delivered') },
              { value: 'cancelled', label: t('Cancelled') }
            ].map((status) => (
              <button
                key={status.value}
                onClick={() => setStatusFilter(status.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length > 0 ? (
          <div className="space-y-6">
            {filteredOrders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
                    <div className="flex items-center space-x-4 mb-4 lg:mb-0">
                      <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                        {getStatusIcon(order.orderStatus)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {t('Order')} #{order.orderNumber}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col lg:flex-row lg:items-center space-y-2 lg:space-y-0 lg:space-x-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.orderStatus)}`}>
                        {t(order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1))}
                      </span>
                      <span className="text-lg font-bold text-purple-400">
                        {order.totalAmount.toFixed(2)} {order.currency}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Items */}
                    <div className="lg:col-span-2">
                      <h4 className="font-medium text-white mb-3">{t('Items')}</h4>
                      <div className="space-y-3">
                        {order.items && Object.values(order.items).map((item: any, index: number) => (
                          <div key={item.id || index} className="flex flex-col space-y-3 bg-gray-800/50 rounded-lg p-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                                {item.productImage ? (
                                  <Image
                                    src={item.productImage}
                                    alt={item.productName || 'Product'}
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <FiPackage className="text-gray-400" />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-white">{item.productName || 'Unknown Product'}</p>
                                {/* Variant Details */}
                                {item.variantDetails && (
                                  <div className="space-y-1 mt-1">
                                    {(() => {
                                      const displayText = generateVariantDisplayText(item.variantDetails, order.sellerId);
                                      return displayText ? (
                                        <p className="text-sm text-purple-300">
                                          {displayText}
                                        </p>
                                      ) : null;
                                    })()}
                                    {item.variantSku && (
                                      <p className="text-xs text-gray-500">
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
                                <p className="text-sm text-gray-400">
                                  {t('Quantity')}: {item.quantity || 1} × {(item.price || 0).toFixed(2)} {order.currency}
                                </p>
                                {item.specialInstructions && (
                                  <p className="text-xs text-purple-300 mt-1">
                                    {t('Instructions')}: {item.specialInstructions}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-white">
                                  {(item.subtotal || 0).toFixed(2)} {order.currency}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Review Section for Delivered Orders */}
                      <ReviewableOrderItems
                        orderId={order.id}
                        items={Object.values(order.items || {})}
                        orderStatus={order.orderStatus}
                      />
                    </div>

                    {/* Order Details */}
                    <div>
                      <h4 className="font-medium text-white mb-3">{t('Order Details')}</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex items-center space-x-2 text-gray-400">
                          <FiMapPin className="text-purple-400" />
                          <span>
                            {order.deliveryType === 'delivery' ? t('Home Delivery') : t('Pickup')}
                          </span>
                        </div>
                        
                        {order.deliveryAddress && (
                          <div className="text-gray-300">
                            <p>{order.deliveryAddress.street}</p>
                            <p>{order.deliveryAddress.postalCode} {order.deliveryAddress.city}</p>
                          </div>
                        )}

                        <div className="flex items-center space-x-2 text-gray-400">
                          <FiCalendar className="text-purple-400" />
                          <span>
                            {order.estimatedDeliveryTime || t('Standard delivery')}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 text-gray-400">
                          <FiDollarSign className="text-purple-400" />
                          <span>{t('Payment')}: {order.paymentMethod}</span>
                        </div>

                        {order.notes && (
                          <div className="pt-2 border-t border-gray-700">
                            <p className="text-xs text-gray-400">{t('Notes')}:</p>
                            <p className="text-gray-300">{order.notes}</p>
                          </div>
                        )}

                        {/* Order Summary */}
                        <div className="pt-3 border-t border-gray-700 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-400">{t('Subtotal')}</span>
                            <span className="text-white">{order.subtotal.toFixed(2)} {order.currency}</span>
                          </div>
                          {order.deliveryFee > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">{t('Delivery')}</span>
                              <span className="text-white">{order.deliveryFee.toFixed(2)} {order.currency}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-400">{t('VAT')}</span>
                            <span className="text-white">{order.vatAmount.toFixed(2)} {order.currency}</span>
                          </div>
                          <div className="flex justify-between font-medium pt-1 border-t border-gray-600">
                            <span className="text-white">{t('Total')}</span>
                            <span className="text-purple-400">{order.totalAmount.toFixed(2)} {order.currency}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seller Info */}
                  <div className="mt-6 pt-6 border-t border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">{t('Sold by')}</p>
                        <p className="font-medium text-white">{order.businessName || order.sellerName}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <FiPackage className="text-6xl text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {statusFilter === 'all' ? t('No orders found') : t('No orders with this status')}
            </h3>
            <p className="text-gray-400 mb-6">
              {statusFilter === 'all' 
                ? t('You haven\'t placed any orders yet. Start shopping to see your orders here.')
                : t('Try selecting a different status filter.')
              }
            </p>
            {statusFilter === 'all' && (
              <button
                onClick={() => window.location.href = '/shop'}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
              >
                {t('Start Shopping')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
