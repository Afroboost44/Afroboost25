'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiPlus, 
  FiX, 
  FiEdit, 
  FiTrash2, 
  FiSave, 
  FiTag,
  FiToggleLeft,
  FiToggleRight,
  FiType,
  FiPackage,
  FiDroplet
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { ProductVariantType, ProductVariantOption } from '@/types';

interface VariantTypeManagerProps {
  sellerId: string;
  sellerName: string;
}

interface VariantTypeFormData {
  name: string;
  displayName: string;
  type: 'size' | 'color' | 'material' | 'length' | 'format' | 'style' | 'custom';
  options: ProductVariantOption[];
  required: boolean;
  multiSelect: boolean;
  productCategories: string[];
  sortOrder: number;
}

export default function VariantTypeManager({ sellerId, sellerName }: VariantTypeManagerProps) {
  const { t } = useTranslation();
  
  const [variantTypes, setVariantTypes] = useState<ProductVariantType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingType, setEditingType] = useState<ProductVariantType | null>(null);
  const [formData, setFormData] = useState<VariantTypeFormData>({
    name: '',
    displayName: '',
    type: 'size',
    options: [],
    required: true,
    multiSelect: false,
    productCategories: [],
    sortOrder: 1
  });
  const [newOption, setNewOption] = useState({
    value: '',
    displayValue: '',
    colorHex: '',
    sortOrder: 1
  });

  useEffect(() => {
    loadVariantTypes();
  }, [sellerId]);

  const loadVariantTypes = async () => {
    try {
      const response = await fetch(`/api/marketplace/variant-types?sellerId=${sellerId}`);
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

  const handleSaveType = async () => {
    try {
      const typeData = {
        ...formData,
        sellerId,
        sellerName,
        isActive: true
      };

      let response;
      if (editingType) {
        response = await fetch('/api/marketplace/variant-types', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingType.id,
            updateData: typeData
          })
        });
      } else {
        response = await fetch('/api/marketplace/variant-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(typeData)
        });
      }

      if (response.ok) {
        await loadVariantTypes();
        resetForm();
        alert(t('Variant type saved successfully'));
      } else {
        alert(t('Failed to save variant type'));
      }
    } catch (error) {
      console.error('Error saving variant type:', error);
      alert(t('Error saving variant type'));
    }
  };

  const handleDeleteType = async (typeId: string) => {
    if (!confirm(t('Are you sure you want to delete this variant type?'))) return;

    try {
      const response = await fetch(`/api/marketplace/variant-types?id=${typeId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadVariantTypes();
        alert(t('Variant type deleted successfully'));
      } else {
        alert(t('Failed to delete variant type'));
      }
    } catch (error) {
      console.error('Error deleting variant type:', error);
      alert(t('Error deleting variant type'));
    }
  };

  const handleEditType = (variantType: ProductVariantType) => {
    setEditingType(variantType);
    setFormData({
      name: variantType.name,
      displayName: variantType.displayName,
      type: variantType.type,
      options: [...variantType.options],
      required: variantType.required,
      multiSelect: variantType.multiSelect,
      productCategories: [...variantType.productCategories],
      sortOrder: variantType.sortOrder
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      displayName: '',
      type: 'size',
      options: [],
      required: true,
      multiSelect: false,
      productCategories: [],
      sortOrder: 1
    });
    setNewOption({
      value: '',
      displayValue: '',
      colorHex: '',
      sortOrder: 1
    });
    setEditingType(null);
    setShowAddForm(false);
  };

  const handleAddOption = () => {
    if (!newOption.value || !newOption.displayValue) return;

    const option: ProductVariantOption = {
      id: newOption.value.toLowerCase().replace(/\s+/g, '_'),
      value: newOption.value,
      displayValue: newOption.displayValue,
      sortOrder: formData.options.length + 1,
      isActive: true,
      ...(formData.type === 'color' && newOption.colorHex ? { colorHex: newOption.colorHex } : {})
    };

    setFormData(prev => ({
      ...prev,
      options: [...prev.options, option]
    }));

    setNewOption({
      value: '',
      displayValue: '',
      colorHex: '',
      sortOrder: 1
    });
  };

  const handleRemoveOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const handleCategoryToggle = (category: string) => {
    setFormData(prev => ({
      ...prev,
      productCategories: prev.productCategories.includes(category)
        ? prev.productCategories.filter(c => c !== category)
        : [...prev.productCategories, category]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">{t('Variant Types Management')}</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-primary hover:bg-secondary text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <FiPlus /> {t('Add Variant Type')}
        </button>
      </div>

      {/* Variant Types List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {variantTypes.map((variantType) => (
          <div key={variantType.id} className="bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-semibold text-white">{variantType.displayName}</h3>
                <p className="text-sm text-gray-400 capitalize">{variantType.name}</p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditType(variantType)}
                  className="p-2 text-primary rounded-lg hover:bg-gray-700"
                >
                  <FiEdit />
                </button>
                <button
                  onClick={() => handleDeleteType(variantType.id)}
                  className="p-2 text-red-400 hover:text-red-300 rounded-lg hover:bg-gray-700"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex justify-between">
                <span>{t('Type')}:</span>
                <span className="capitalize">{variantType.type}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('Options')}:</span>
                <span>{variantType.options.length}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('Required')}:</span>
                <span>{variantType.required ? t('Yes') : t('No')}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('Categories')}:</span>
                <span>{variantType.productCategories.length}</span>
              </div>
            </div>

            {/* Show first few options */}
            {variantType.options.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className="flex flex-wrap gap-1">
                  {variantType.options.slice(0, 3).map((option, index) => (
                    <span
                      key={index}
                      className="inline-block bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs"
                    >
                      {option.displayValue}
                    </span>
                  ))}
                  {variantType.options.length > 3 && (
                    <span className="text-xs text-gray-500">+{variantType.options.length - 3} more</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add/Edit Form Modal */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-white">
                  {editingType ? t('Edit Variant Type') : t('Add New Variant Type')}
                </h3>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-white"
                >
                  <FiX />
                </button>
              </div>

              <div className="space-y-4">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t('Name')} *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                      placeholder={t('e.g., size')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t('Display Name')} *
                    </label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                      placeholder={t('e.g., Size')}
                    />
                  </div>
                </div>

                {/* Type and Settings */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t('Type')} *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="size">{t('Size')}</option>
                      <option value="color">{t('Color')}</option>
                      <option value="material">{t('Material')}</option>
                      <option value="length">{t('Length')}</option>
                      <option value="format">{t('Format')}</option>
                      <option value="style">{t('Style')}</option>
                      <option value="custom">{t('Custom')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t('Sort Order')}
                    </label>
                    <input
                      type="number"
                      value={formData.sortOrder}
                      onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) }))}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                      min="1"
                    />
                  </div>

                  <div className="flex items-center justify-center space-x-4 pt-6">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.required}
                        onChange={(e) => setFormData(prev => ({ ...prev, required: e.target.checked }))}
                        className="rounded"
                      />
                      <span className="text-white text-sm">{t('Required')}</span>
                    </label>
                  </div>
                </div>

                {/* Options Management */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {t('Options')}
                  </label>
                  
                  {/* Add New Option */}
                  <div className="bg-gray-700 rounded-lg p-4 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <input
                          type="text"
                          value={newOption.value}
                          onChange={(e) => setNewOption(prev => ({ ...prev, value: e.target.value }))}
                          className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm"
                          placeholder={t('Value (e.g., XS)')}
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={newOption.displayValue}
                          onChange={(e) => setNewOption(prev => ({ ...prev, displayValue: e.target.value }))}
                          className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm"
                          placeholder={t('Display (e.g., Extra Small)')}
                        />
                      </div>
                      {formData.type === 'color' && (
                        <div>
                          <input
                            type="color"
                            value={newOption.colorHex}
                            onChange={(e) => setNewOption(prev => ({ ...prev, colorHex: e.target.value }))}
                            className="w-full h-10 bg-gray-600 border border-gray-500 rounded"
                          />
                        </div>
                      )}
                      <div>
                        <button
                          onClick={handleAddOption}
                          className="bg-primary text-white px-4 py-2 rounded text-sm w-full"
                        >
                          {t('Add Option')}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Options List */}
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {formData.options.map((option, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-700 rounded px-3 py-2">
                        <div className="flex items-center space-x-3">
                          {option.colorHex && (
                            <div 
                              className="w-4 h-4 rounded border border-gray-500"
                              style={{ backgroundColor: option.colorHex }}
                            ></div>
                          )}
                          <span className="text-white">{option.displayValue}</span>
                          <span className="text-gray-400 text-sm">({option.value})</span>
                        </div>
                        <button
                          onClick={() => handleRemoveOption(index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <FiX />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-300 hover:text-white"
                  >
                    {t('Cancel')}
                  </button>
                  <button
                    onClick={handleSaveType}
                    className="bg-primary hover:bg-secondary text-white px-6 py-2 rounded-lg flex items-center gap-2"
                  >
                    <FiSave /> {t('Save')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
