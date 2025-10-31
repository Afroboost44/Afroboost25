'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiPlus, 
  FiX, 
  FiEdit, 
  FiTrash2, 
  FiSave, 
  FiPackage,
  FiTag,
  FiDollarSign,
  FiHash,
  FiImage,
  FiToggleLeft,
  FiToggleRight
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { ProductVariant, ProductVariantType, ProductVariantOption, Product } from '@/types';

// Helper function to normalize options data (handles both array and object formats from Firestore)
const normalizeOptions = (options: ProductVariantOption[] | Record<string, ProductVariantOption>): ProductVariantOption[] => {
  return Array.isArray(options) ? options : Object.values(options);
};

interface ProductVariantManagerProps {
  product: Product;
  onUpdate: () => void;
}

interface VariantFormData {
  combinations: { [variantTypeId: string]: string };
  sku: string;
  price: number;
  salePrice?: number;
  stock: number;
  weight?: number;
  images?: string[];
  isActive: boolean;
  isDefault: boolean;
}

export default function ProductVariantManager({ product, onUpdate }: ProductVariantManagerProps) {
  const { t } = useTranslation();
  
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantTypes, setVariantTypes] = useState<ProductVariantType[]>([]);
  const [selectedVariantTypes, setSelectedVariantTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [variantForm, setVariantForm] = useState<VariantFormData>({
    combinations: {},
    sku: '',
    price: product.price,
    salePrice: product.salePrice,
    stock: 0,
    weight: product.weight,
    images: [],
    isActive: true,
    isDefault: false
  });
  const [showBulkCreate, setShowBulkCreate] = useState(false);

  useEffect(() => {
    loadVariants();
    loadVariantTypes();
  }, [product.id]);

  const loadVariants = async () => {
    try {
      const response = await fetch(`/api/marketplace/products/${product.id}/variants`);
      if (response.ok) {
        const data = await response.json();
        setVariants(data.variants || []);
      }
    } catch (error) {
      console.error('Error loading variants:', error);
    }
  };

  const loadVariantTypes = async () => {
    try {
      // Get seller-specific variant types filtered by product category
      const params = new URLSearchParams({
        sellerId: product.sellerId,
        category: product.categoryName || ''
      });
      
      const response = await fetch(`/api/marketplace/variant-types?${params}`);
      if (response.ok) {
        const data = await response.json();
        setVariantTypes(data.variantTypes || []);
      }
    } catch (error) {
      console.error('Error loading variant types:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSKU = (combinations: { [key: string]: string }) => {
    const productPrefix = product.name.substring(0, 3).toUpperCase();
    const variantSuffix = Object.entries(combinations)
      .map(([typeId, optionId]) => {
        const type = variantTypes.find(vt => vt.id === typeId);
        const option = type ? normalizeOptions(type.options).find(opt => opt.id === optionId) : null;
        return option ? option.value.substring(0, 2).toUpperCase() : '';
      })
      .join('');
    
    return `${productPrefix}-${variantSuffix}-${Date.now().toString().slice(-4)}`;
  };

  const getDisplayText = (combinations: { [key: string]: string }) => {
    // Check if combinations is null, undefined, or not an object
    if (!combinations || typeof combinations !== 'object') {
      return 'No variant data';
    }

    const displayParts: string[] = [];
    
    Object.entries(combinations).forEach(([typeId, optionId]) => {
      const type = variantTypes.find(vt => vt.id === typeId);
      const option = type ? normalizeOptions(type.options).find(opt => opt.id === optionId) : null;
      if (type && option) {
        displayParts.push(`${type.displayName}: ${option.displayValue}`);
      }
    });

    return displayParts.join(', ');
  };

  const handleSaveVariant = async () => {
    try {
      const variantData = {
        ...variantForm,
        sku: variantForm.sku || generateSKU(variantForm.combinations)
      };

      let response;
      if (editingVariant) {
        response = await fetch(`/api/marketplace/products/${product.id}/variants`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variantId: editingVariant.id,
            updateData: variantData
          })
        });
      } else {
        response = await fetch(`/api/marketplace/products/${product.id}/variants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variants: [variantData]
          })
        });
      }

      if (response.ok) {
        await loadVariants();
        resetForm();
        onUpdate();
      } else {
        alert(t('Failed to save variant'));
      }
    } catch (error) {
      console.error('Error saving variant:', error);
      alert(t('Error saving variant'));
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!confirm(t('Are you sure you want to delete this variant?'))) return;

    try {
      const response = await fetch(`/api/marketplace/products/${product.id}/variants?variantId=${variantId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadVariants();
        onUpdate();
      } else {
        alert(t('Failed to delete variant'));
      }
    } catch (error) {
      console.error('Error deleting variant:', error);
      alert(t('Error deleting variant'));
    }
  };

  const handleBulkCreate = async () => {
    if (selectedVariantTypes.length === 0) {
      alert(t('Please select at least one variant type'));
      return;
    }

    // Generate all combinations
    const selectedTypes = variantTypes.filter(vt => selectedVariantTypes.includes(vt.id));
    const combinations = generateAllCombinations(selectedTypes);
    
    const newVariants = combinations.map(combination => ({
      combinations: combination,
      sku: generateSKU(combination),
      price: product.price,
      salePrice: product.salePrice,
      stock: 0,
      weight: product.weight,
      images: [],
      isActive: true,
      isDefault: false
    }));

    try {
      const response = await fetch(`/api/marketplace/products/${product.id}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variants: newVariants })
      });

      if (response.ok) {
        await loadVariants();
        setShowBulkCreate(false);
        setSelectedVariantTypes([]);
        onUpdate();
      } else {
        alert(t('Failed to create variants'));
      }
    } catch (error) {
      console.error('Error creating bulk variants:', error);
      alert(t('Error creating variants'));
    }
  };

  const generateAllCombinations = (types: ProductVariantType[]) => {
    if (types.length === 0) return [];
    
    let combinations: { [key: string]: string }[] = [{}];
    
    for (const type of types) {
      const newCombinations: { [key: string]: string }[] = [];
      
      for (const combination of combinations) {
        for (const option of normalizeOptions(type.options)) {
          if (option.isActive) {
            newCombinations.push({
              ...combination,
              [type.id]: option.id
            });
          }
        }
      }
      
      combinations = newCombinations;
    }
    
    return combinations;
  };

  const resetForm = () => {
    setVariantForm({
      combinations: {},
      sku: '',
      price: product.price,
      salePrice: product.salePrice,
      stock: 0,
      weight: product.weight,
      images: [],
      isActive: true,
      isDefault: false
    });
    setEditingVariant(null);
    setShowAddVariant(false);
  };

  const handleEditVariant = (variant: ProductVariant) => {
    setEditingVariant(variant);
    setVariantForm({
      combinations: variant.combinations,
      sku: variant.sku,
      price: variant.price,
      salePrice: variant.salePrice,
      stock: variant.stock,
      weight: variant.weight,
      images: variant.images || [],
      isActive: variant.isActive,
      isDefault: variant.isDefault
    });
    setShowAddVariant(true);
  };

  const getTotalStock = () => {
    return variants.reduce((total, variant) => total + variant.stock, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FiPackage className="text-primary" />
            {t('Product Variants')}
          </h3>
          <p className="text-gray-400 text-sm">
            {t('Manage sizes, colors, and other variations')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulkCreate(true)}
            className="px-4 py-2 bg-primary hover:bg-primary-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <FiPlus className="w-4 h-4" />
            {t('Bulk Create')}
          </button>
          <button
            onClick={() => setShowAddVariant(true)}
            className="px-4 py-2 bg-primary hover:bg-primary-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <FiPlus className="w-4 h-4" />
            {t('Add Variant')}
          </button>
        </div>
      </div>

      {/* Variants Summary */}
      {variants.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{variants.length}</div>
            <div className="text-gray-400 text-sm">{t('Total Variants')}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{getTotalStock()}</div>
            <div className="text-gray-400 text-sm">{t('Total Stock')}</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">
              {variants.filter(v => v.stock > 0).length}
            </div>
            <div className="text-gray-400 text-sm">{t('In Stock')}</div>
          </div>
        </div>
      )}

      {/* Variants List */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        {variants.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    {t('Variant')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    {t('SKU')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    {t('Price')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    {t('Stock')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    {t('Status')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    {t('Actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {variants.map((variant, index) => (
                  <tr key={variant.id} className={index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}>
                    <td className="px-4 py-4">
                      <div>
                        <div className="text-white font-medium">
                          {variant.combinations ? getDisplayText(variant.combinations) : 'No variant data'}
                        </div>
                        {variant.isDefault && (
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-primary-900 text-primary rounded-full mt-1">
                            {t('Default')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-300">{variant.sku}</td>
                    <td className="px-4 py-4">
                      <div className="text-white">
                        {variant.salePrice ? (
                          <div>
                            <span className="line-through text-gray-400">{product.currency} {variant.price}</span>
                            <span className="ml-2 text-green-400">{product.currency} {variant.salePrice}</span>
                          </div>
                        ) : (
                          <span>{product.currency} {variant.price}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-sm ${variant.stock > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {variant.stock} {t('units')}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        variant.isActive
                          ? 'bg-green-900 text-green-200'
                          : 'bg-red-900 text-red-200'
                      }`}>
                        {variant.isActive ? t('Active') : t('Inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditVariant(variant)}
                          className="p-2 text-gray-400 hover:text-primary transition-colors"
                          title={t('Edit')}
                        >
                          <FiEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteVariant(variant.id)}
                          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                          title={t('Delete')}
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <FiPackage className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">
              {t('No variants yet')}
            </h3>
            <p className="text-gray-400 mb-4">
              {t('Create variants to offer different sizes, colors, or options')}
            </p>
            <button
              onClick={() => setShowAddVariant(true)}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center gap-2 mx-auto transition-colors"
            >
              <FiPlus className="w-4 h-4" />
              {t('Create First Variant')}
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Variant Modal */}
      <AnimatePresence>
        {showAddVariant && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <h2 className="text-xl font-semibold text-white">
                  {editingVariant ? t('Edit Variant') : t('Add New Variant')}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-white"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Variant Combinations */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('Variant Options')}
                  </label>
                  {variantTypes.map((variantType) => (
                    <div key={variantType.id} className="mb-4">
                      <label className="block text-sm text-gray-400 mb-1">
                        {variantType.displayName}
                      </label>
                      <select
                        value={variantForm.combinations[variantType.id] || ''}
                        onChange={(e) => setVariantForm(prev => ({
                          ...prev,
                          combinations: {
                            ...prev.combinations,
                            [variantType.id]: e.target.value
                          }
                        }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">{t('Select')} {variantType.displayName}</option>
                        {normalizeOptions(variantType.options).filter(opt => opt.isActive).map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.displayValue}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {/* SKU */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('SKU')}
                  </label>
                  <input
                    type="text"
                    value={variantForm.sku}
                    onChange={(e) => setVariantForm(prev => ({ ...prev, sku: e.target.value }))}
                    placeholder={t('Auto-generated if empty')}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Price and Sale Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t('Price')} ({product.currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={variantForm.price}
                      onChange={(e) => setVariantForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t('Sale Price')} ({product.currency})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={variantForm.salePrice || ''}
                      onChange={(e) => setVariantForm(prev => ({ ...prev, salePrice: parseFloat(e.target.value) || undefined }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Stock and Weight */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t('Stock Quantity')}
                    </label>
                    <input
                      type="number"
                      value={variantForm.stock}
                      onChange={(e) => setVariantForm(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t('Weight')} (kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={variantForm.weight || ''}
                      onChange={(e) => setVariantForm(prev => ({ ...prev, weight: parseFloat(e.target.value) || undefined }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Active and Default toggles */}
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <button
                      type="button"
                      onClick={() => setVariantForm(prev => ({ ...prev, isActive: !prev.isActive }))}
                      className="flex items-center"
                    >
                      {variantForm.isActive ? (
                        <FiToggleRight className="w-6 h-6 text-green-400" />
                      ) : (
                        <FiToggleLeft className="w-6 h-6 text-gray-400" />
                      )}
                    </button>
                    <span className="text-sm text-gray-300">{t('Active')}</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <button
                      type="button"
                      onClick={() => setVariantForm(prev => ({ ...prev, isDefault: !prev.isDefault }))}
                      className="flex items-center"
                    >
                      {variantForm.isDefault ? (
                        <FiToggleRight className="w-6 h-6 text-primary-400" />
                      ) : (
                        <FiToggleLeft className="w-6 h-6 text-gray-400" />
                      )}
                    </button>
                    <span className="text-sm text-gray-300">{t('Default Variant')}</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-3 p-6 border-t border-gray-700">
                <button
                  onClick={handleSaveVariant}
                  className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <FiSave className="w-4 h-4" />
                  {editingVariant ? t('Update Variant') : t('Create Variant')}
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  {t('Cancel')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Create Modal */}
      <AnimatePresence>
        {showBulkCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <h2 className="text-xl font-semibold text-white">
                  {t('Bulk Create Variants')}
                </h2>
                <button
                  onClick={() => setShowBulkCreate(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6">
                <p className="text-gray-300 mb-4">
                  {t('Select variant types to generate all possible combinations')}
                </p>
                
                <div className="space-y-3">
                  {variantTypes.map((variantType) => (
                    <label key={variantType.id} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedVariantTypes.includes(variantType.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedVariantTypes(prev => [...prev, variantType.id]);
                          } else {
                            setSelectedVariantTypes(prev => prev.filter(id => id !== variantType.id));
                          }
                        }}
                        className="w-4 h-4 text-primary-600 bg-gray-700 border-gray-600 rounded focus:ring-primary-500"
                      />
                      <span className="text-white">{variantType.displayName}</span>
                      <span className="text-gray-400 text-sm">
                        ({normalizeOptions(variantType.options).filter(opt => opt.isActive).length} options)
                      </span>
                    </label>
                  ))}
                </div>

                {selectedVariantTypes.length > 0 && (
                  <div className="mt-4 p-3 bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-300">
                      {t('This will create')} <strong>
                        {selectedVariantTypes.reduce((total, typeId) => {
                          const type = variantTypes.find(vt => vt.id === typeId);
                          const activeOptions = type ? normalizeOptions(type.options).filter(opt => opt.isActive).length : 0;
                          return total === 0 ? activeOptions : total * activeOptions;
                        }, 0)}
                      </strong> {t('variants')}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 p-6 border-t border-gray-700">
                <button
                  onClick={handleBulkCreate}
                  disabled={selectedVariantTypes.length === 0}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <FiPackage className="w-4 h-4" />
                  {t('Create Variants')}
                </button>
                <button
                  onClick={() => {
                    setShowBulkCreate(false);
                    setSelectedVariantTypes([]);
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  {t('Cancel')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
