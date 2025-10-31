'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiPackage, 
  FiTruck, 
  FiMapPin, 
  FiCheck, 
  FiClock,
  FiExternalLink
} from 'react-icons/fi';
import { useAuth } from '@/lib/auth';
import Card from '@/components/Card';
import { useTranslation } from 'react-i18next';
import { Order, DeliveryTracking as DeliveryTrackingType } from '@/types';
import Link from 'next/link';

interface DeliveryTrackingProps {
  orderId: string;
  className?: string;
}

export default function DeliveryTracking({ orderId, className = '' }: DeliveryTrackingProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [tracking, setTracking] = useState<DeliveryTrackingType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrderAndTracking();
  }, [orderId]);

  const loadOrderAndTracking = async () => {
    try {
      setLoading(true);
      
      // Load order details
      const orderResponse = await fetch(`/api/marketplace/orders/${orderId}`);
      if (orderResponse.ok) {
        const orderData = await orderResponse.json();
        setOrder(orderData);
      }

      // Load tracking information
      const trackingResponse = await fetch(`/api/marketplace/orders/${orderId}/tracking`);
      if (trackingResponse.ok) {
        const trackingData = await trackingResponse.json();
        setTracking(trackingData);
      }
    } catch (error) {
      console.error('Error loading order and tracking:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing':
        return <FiClock className="text-orange-400" />;
      case 'dispatched':
        return <FiTruck className="text-blue-400" />;
      case 'delivered':
        return <FiCheck className="text-green-400" />;
      default:
        return <FiPackage className="text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing':
        return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      case 'dispatched':
        return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'delivered':
        return 'text-green-400 bg-green-400/10 border-green-400/20';
      default:
        return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const trackingSteps = [
    {
      id: 'processing',
      title: t('Order Processing'),
      description: t('Your order is being prepared'),
      icon: FiPackage
    },
    {
      id: 'dispatched',
      title: t('Dispatched'),
      description: t('Your order is on its way'),
      icon: FiTruck
    },
    {
      id: 'delivered',
      title: t('Delivered'),
      description: t('Your order has been delivered'),
      icon: FiCheck
    }
  ];

  const getStepStatus = (stepId: string, currentStatus: string) => {
    const statusOrder = ['processing', 'dispatched', 'delivered'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const stepIndex = statusOrder.indexOf(stepId);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="ml-4 text-gray-400">{t('Loading tracking information...')}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <FiPackage className="text-6xl text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">{t('Order Not Found')}</h3>
        <p className="text-gray-400">{t('Unable to find order information.')}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Order Header */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">
              {t('Order')} #{order.orderNumber}
            </h2>
            <p className="text-gray-400">
              {t('Placed on')} {new Date(
                order.createdAt instanceof Date 
                  ? order.createdAt 
                  : typeof order.createdAt === 'string'
                  ? new Date(order.createdAt)
                  : order.createdAt.toDate()
              ).toLocaleDateString()}
            </p>
          </div>
          <div className={`px-4 py-2 rounded-full border ${getStatusColor(order.orderStatus)}`}>
            <div className="flex items-center space-x-2">
              {getStatusIcon(order.orderStatus)}
              <span className="font-medium capitalize">{t(order.orderStatus)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-400 mb-1">{t('Seller')}</p>
            <p className="text-white font-medium">{order.sellerName}</p>
          </div>
          <div>
            <p className="text-gray-400 mb-1">{t('Total Amount')}</p>
            <p className="text-white font-medium">{order.totalAmount.toFixed(2)} CHF</p>
          </div>
          <div>
            <p className="text-gray-400 mb-1">{t('Delivery Type')}</p>
            <p className="text-white font-medium capitalize">{t(order.deliveryType)}</p>
          </div>
        </div>
      </Card>

      {/* Tracking Steps */}
      <Card>
        <h3 className="text-lg font-semibold text-white mb-6">{t('Tracking Progress')}</h3>
        
        <div className="space-y-4">
          {trackingSteps.map((step, index) => {
            const status = getStepStatus(step.id, order.orderStatus);
            const isCompleted = status === 'completed';
            const isCurrent = status === 'current';
            
            return (
              <div key={step.id} className="flex items-center space-x-4">
                {/* Step Icon */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                  isCompleted 
                    ? 'bg-green-400 border-green-400 text-white'
                    : isCurrent
                    ? 'bg-blue-400 border-blue-400 text-white'
                    : 'bg-gray-700 border-gray-600 text-gray-400'
                }`}>
                  <step.icon className="text-lg" />
                </div>

                {/* Step Content */}
                <div className="flex-1">
                  <h4 className={`font-medium ${
                    isCompleted || isCurrent ? 'text-white' : 'text-gray-400'
                  }`}>
                    {step.title}
                  </h4>
                  <p className="text-gray-400 text-sm">{step.description}</p>
                  
                  {/* Show timestamp if available */}
                  {tracking && tracking.trackingEvents?.find(e => e.status === step.id) && (
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(tracking.trackingEvents.find(e => e.status === step.id)!.timestamp as any).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Connector Line */}
                {index < trackingSteps.length - 1 && (
                  <div className={`absolute left-6 mt-12 w-0.5 h-8 ${
                    isCompleted ? 'bg-green-400' : 'bg-gray-600'
                  }`} style={{ marginLeft: '1.5rem' }} />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Delivery Information */}
      {tracking && (
        <Card>
          <h3 className="text-lg font-semibold text-white mb-4">{t('Delivery Information')}</h3>
          
          <div className="space-y-4">
            {/* Estimated Delivery */}
            {tracking.estimatedDeliveryDate && (
              <div className="flex items-center space-x-3">
                <FiClock className="text-blue-400" />
                <div>
                  <p className="text-gray-400 text-sm">{t('Estimated Delivery')}</p>
                  <p className="text-white font-medium">
                    {new Date(
                      tracking.estimatedDeliveryDate instanceof Date 
                        ? tracking.estimatedDeliveryDate 
                        : typeof tracking.estimatedDeliveryDate === 'string'
                        ? new Date(tracking.estimatedDeliveryDate)
                        : tracking.estimatedDeliveryDate.toDate()
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}

            {/* External Tracking (using trackingNumber instead of trackingUrl) */}
            {tracking.trackingNumber && (
              <div className="flex items-center space-x-3">
                <FiExternalLink className="text-purple-400" />
                <div>
                  <p className="text-gray-400 text-sm">{t('Tracking Number')}</p>
                  <p className="text-white font-medium font-mono">
                    {tracking.trackingNumber}
                  </p>
                  {tracking.carrier && (
                    <p className="text-sm text-gray-400">{t('Carrier')}: {tracking.carrier}</p>
                  )}
                </div>
              </div>
            )}

            {/* Current Location (using location from latest tracking event) */}
            {tracking.trackingEvents && tracking.trackingEvents.length > 0 && 
             tracking.trackingEvents[tracking.trackingEvents.length - 1].location && (
              <div className="flex items-center space-x-3">
                <FiMapPin className="text-green-400" />
                <div>
                  <p className="text-gray-400 text-sm">{t('Current Location')}</p>
                  <p className="text-white font-medium">
                    {tracking.trackingEvents[tracking.trackingEvents.length - 1].location}
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Order Items */}
      <Card>
        <h3 className="text-lg font-semibold text-white mb-4">{t('Order Items')}</h3>
        
        <div className="space-y-3">
          {order.items.map((item, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-b-0">
              <div>
                <p className="text-white font-medium">{item.productName}</p>
                <p className="text-gray-400 text-sm">
                  {t('Quantity')}: {item.quantity}
                </p>
              </div>
              <p className="text-white font-medium">
                {(item.price * item.quantity).toFixed(2)} CHF
              </p>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-700 mt-4 pt-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-white">{t('Total')}</span>
            <span className="text-xl font-bold text-purple-400">
              {order.totalAmount.toFixed(2)} CHF
            </span>
          </div>
        </div>
      </Card>

      {/* Delivery Address */}
      {order.deliveryAddress && (
        <Card>
          <h3 className="text-lg font-semibold text-white mb-4">{t('Delivery Address')}</h3>
          
          <div className="text-gray-300">
            <p className="font-medium text-white">{order.deliveryAddress.fullName}</p>
            <p>{order.deliveryAddress.address}</p>
            <p>{order.deliveryAddress.city}, {order.deliveryAddress.postalCode}</p>
            <p>{order.deliveryAddress.country}</p>
            {order.deliveryAddress.phone && (
              <p className="mt-2 text-sm">
                {t('Phone')}: {order.deliveryAddress.phone}
              </p>
            )}
            {order.deliveryAddress.notes && (
              <p className="mt-2 text-sm text-gray-400">
                {t('Notes')}: {order.deliveryAddress.notes}
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
