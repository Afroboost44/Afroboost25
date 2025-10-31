'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiCheck, FiPackage, FiRefreshCw } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { Product, ProductVariant, ProductVariantType, ProductVariantOption } from '@/types';
import Image from 'next/image';

// Helper function to normalize options data (handles both array and object formats from Firestore)
const normalizeOptions = (options: ProductVariantOption[] | Record<string, ProductVariantOption>): ProductVariantOption[] => {
  if (!options) return [];
  
  // If it's already an array, return as is
  if (Array.isArray(options)) {
    return options.filter(option => option && typeof option === 'object');
  }
  
  // If it's an object (from Firestore serialization), convert to array
  if (typeof options === 'object') {
    return Object.values(options).filter(option => option && typeof option === 'object') as ProductVariantOption[];
  }
  
  return [];
};

interface ProductVariantSelectorProps {
  product: Product;
  onVariantSelect: (variant: ProductVariant | null, combinations: { [key: string]: string }) => void;
  selectedCombinations?: { [key: string]: string };
}

export default function ProductVariantSelector({ 
  product, 
  onVariantSelect, 
  selectedCombinations = {} 
}: ProductVariantSelectorProps) {
  const { t } = useTranslation();
  
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantTypes, setVariantTypes] = useState<ProductVariantType[]>([]);
  const [combinations, setCombinations] = useState<{ [key: string]: string }>(selectedCombinations);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (product.hasVariants) {
      loadVariants();
    } else {
      setLoading(false);
    }
  }, [product.id]);

  useEffect(() => {
    // Find matching variant when combinations change
    const matchingVariant = findMatchingVariant(combinations);
    setSelectedVariant(matchingVariant);
    onVariantSelect(matchingVariant, combinations);
  }, [combinations, variants]);

  const loadVariants = async () => {
    try {
      // Fetch product variants
      const variantsRes = await fetch(`/api/marketplace/products/${product.id}/variants`);
      let variantsData = [];
      if (variantsRes.ok) {
        const data = await variantsRes.json();
        // Filter out invalid variants
        variantsData = (data.variants || []).filter((v: any) => 
          v && 
          typeof v === 'object' && 
          v.id && 
          v.combinations && 
          typeof v.combinations === 'object'
        );
        setVariants(variantsData);
      }

      // Fetch seller-specific variant types for this product's category
      const params = new URLSearchParams({
        sellerId: product.sellerId,
        category: product.categoryName || ''
      });
      const typesRes = await fetch(`/api/marketplace/variant-types?${params}`);
      if (typesRes.ok) {
        const typesData = await typesRes.json();
        // Normalize Firestore options (object to array) and filter invalid types
        const normalizedTypes = (typesData.variantTypes || [])
          .filter((vt: any) => vt && typeof vt === 'object' && vt.id && vt.options)
          .map((vt: ProductVariantType) => ({
            ...vt,
            options: normalizeOptions(vt.options)
          }));
        setVariantTypes(normalizedTypes);
      }

      // Set default variant if no combinations selected
      if (Object.keys(combinations).length === 0 && variantsData.length > 0) {
        const defaultVariant = variantsData.find((v: ProductVariant) => v && v.isDefault && v.combinations);
        if (defaultVariant && defaultVariant.combinations) {
          setCombinations(defaultVariant.combinations);
        } else {
          // If no default variant, use the first available variant
          const firstAvailableVariant = variantsData.find((v: ProductVariant) => v && v.combinations && v.stock > 0 && v.isActive);
          if (firstAvailableVariant && firstAvailableVariant.combinations) {
            setCombinations(firstAvailableVariant.combinations);
          }
        }
      }
    } catch (error) {
      console.error('Error loading variants/types:', error);
    } finally {
      setLoading(false);
    }
  };

  const findMatchingVariant = (currentCombinations: { [key: string]: string }) => {
    if (!currentCombinations || !variants || variants.length === 0) {
      return null;
    }
    
    return variants.find(variant => {
      if (!variant || !variant.combinations) {
        return false;
      }
      
      return Object.entries(currentCombinations).every(([typeId, optionId]) => {
        return variant.combinations && variant.combinations[typeId] === optionId;
      });
    }) || null;
  };

  const handleOptionSelect = (variantTypeId: string, optionId: string) => {
    const newCombinations = {
      ...combinations,
      [variantTypeId]: optionId
    };
    setCombinations(newCombinations);
  };

  const isOptionAvailable = (variantTypeId: string, optionId: string) => {
    if (!variants || variants.length === 0) {
      return false;
    }
    
    // Check if selecting this option would result in an available variant
    const testCombinations = {
      ...combinations,
      [variantTypeId]: optionId
    };

    // Get all variants that match the current combinations
    const matchingVariants = variants.filter(variant => {
      if (!variant || !variant.combinations) {
        return false;
      }
      
      return Object.entries(testCombinations).every(([typeId, selectedOptionId]) => {
        return variant.combinations && variant.combinations[typeId] === selectedOptionId;
      });
    });

    return matchingVariants.some(variant => variant && variant.stock > 0 && variant.isActive);
  };

  // Smart filtering: Get available options based on current selections
  const getAvailableOptions = (variantTypeId: string) => {
    const variantType = variantTypes.find(vt => vt && vt.id === variantTypeId);
    if (!variantType || !variantType.options) return [];

    const allOptions = normalizeOptions(variantType.options).filter(opt => opt && opt.isActive);
    
    // If no other selections made (reset state), show all active options
    if (Object.keys(combinations).length === 0) {
      return allOptions;
    }

    // Filter options based on current selections
    return allOptions.filter(option => {
      if (!option || !option.id) return false;
      
      const testCombinations = { ...combinations, [variantTypeId]: option.id };
      
      return variants.some(variant => {
        if (!variant || !variant.combinations) return false;
        
        // Check if this variant matches all current selections
        const matches = Object.entries(testCombinations).every(([typeId, selectedOptionId]) => {
          return variant.combinations && variant.combinations[typeId] === selectedOptionId;
        });
        
        return matches && variant.stock > 0 && variant.isActive;
      });
    });
  };

  // Check if an option has available stock (for visual feedback when showing all options)
  const isOptionInStock = (variantTypeId: string, optionId: string) => {
    if (!variants || variants.length === 0) return false;
    
    return variants.some(variant => 
      variant && 
      variant.combinations && 
      variant.combinations[variantTypeId] === optionId && 
      variant.stock > 0 && 
      variant.isActive
    );
  };

  const getSelectedPrice = () => {
    if (selectedVariant) {
      return selectedVariant.salePrice || selectedVariant.price;
    }
    return product.salePrice || product.price;
  };

  const getSelectedStock = () => {
    if (selectedVariant) {
      return selectedVariant.stock;
    }
    return product.stock;
  };

  const isInStock = () => {
    return getSelectedStock() > 0;
  };

  const getVariantDisplay = () => {
    if (!selectedVariant || Object.keys(combinations).length === 0) {
      return null;
    }

    const displayParts: string[] = [];
    Object.entries(combinations).forEach(([typeId, optionId]) => {
      const variantType = variantTypes.find(vt => vt && vt.id === typeId);
      if (!variantType || !variantType.options) return;
      
      const option = normalizeOptions(variantType.options).find(opt => opt && opt.id === optionId);
      if (variantType && option) {
        displayParts.push(`${variantType.displayName}: ${option.displayValue}`);
      }
    });

    return displayParts.join(', ');
  };

  if (!product.hasVariants) {
    return null;
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
        <div className="h-10 bg-gray-700 rounded mb-4"></div>
      </div>
    );
  }

  if (variants.length === 0) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
        <div className="flex items-center gap-2 text-gray-400">
          <FiPackage className="w-4 h-4" />
          <span className="text-sm">{t('No variants available')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Only show variant types that have at least one available option with stock */}
      {variantTypes
        .map((variantType) => {
          // Only show options that are available (stock > 0 and isActive)
          const availableOptions = getAvailableOptions(variantType.id).filter(option => isOptionInStock(variantType.id, option.id));
          if (availableOptions.length === 0) return null;

          return (
            <div key={variantType.id} className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                {variantType.displayName}
                {variantType.required && <span className="text-red-400 ml-1">*</span>}
              </label>

              {variantType.type === 'color' ? (
                <div className="flex flex-wrap gap-2">
                  {availableOptions.map((option) => {
                    const isSelected = combinations[variantType.id] === option.id;
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleOptionSelect(variantType.id, option.id)}
                        className={`
                          relative w-10 h-10 rounded-full border-2 transition-all duration-200 hover:scale-110
                          ${isSelected 
                            ? 'border-primary-400 ring-2 ring-primary-400 ring-opacity-50' 
                            : 'border-gray-600 hover:border-gray-400 cursor-pointer'
                          }
                        `}
                        style={{ backgroundColor: 'pink' }}
                        title={option.displayValue}
                      >
                        {isSelected && (
                          <FiCheck className="w-4 h-4 text-white absolute inset-0 m-auto drop-shadow-lg" />
                        )}
                        {option.image && (
                          <Image
                            src={option.image}
                            alt={option.displayValue}
                            fill
                            className="rounded-full object-cover"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : variantType.type === 'size' && variantType.name === 'shoe_size' ? (
                <div className="grid grid-cols-5 gap-2">
                  {availableOptions.map((option) => {
                    const isSelected = combinations[variantType.id] === option.id;
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleOptionSelect(variantType.id, option.id)}
                        className={`
                          px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200 hover:bg-gray-600
                          ${isSelected 
                            ? 'bg-primary border-primary text-white' 
                            : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500 cursor-pointer'
                          }
                        `}
                      >
                        {option.value}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableOptions.map((option) => {
                    const isSelected = combinations[variantType.id] === option.id;
                    return (
                      <button
                        key={option.id}
                        onClick={() => handleOptionSelect(variantType.id, option.id)}
                        className={`
                          px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200 hover:bg-gray-600
                          ${isSelected 
                            ? 'bg-primary border-primary text-white' 
                            : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-gray-500 cursor-pointer'
                          }
                        `}
                        title={option.displayValue}
                      >
                        {option.displayValue}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

      {/* Available combinations info and reset button */}
      {Object.keys(combinations).length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-400 italic">
            {t('Only available combinations are shown')}
          </div>
          <button
            onClick={() => setCombinations({})}
            className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors duration-200 hover:underline"
          >
            <FiRefreshCw className="w-3 h-3" />
            {t('Show all options')}
          </button>
        </div>
      )}

      {/* Selected Variant Info */}
      {selectedVariant && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-gray-800 rounded-lg border border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400">{t('Selected')}</div>
              <div className="text-white font-medium">{getVariantDisplay()}</div>
              <div className="text-sm text-gray-400">SKU: {selectedVariant.sku}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-white">
                {product.currency} {getSelectedPrice().toFixed(2)}
              </div>
              <div className={`text-sm ${isInStock() ? 'text-green-400' : 'text-red-400'}`}>
                {isInStock() 
                  ? `${getSelectedStock()} ${t('in stock')}`
                  : t('Out of stock')
                }
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stock Warning */}
      {!isInStock() && Object.keys(combinations).length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-3 bg-red-900 bg-opacity-50 border border-red-700 rounded-lg"
        >
          <p className="text-red-300 text-sm">
            {t('This combination is currently out of stock. Please select different options.')}
          </p>
        </motion.div>
      )}
    </div>
  );
}
