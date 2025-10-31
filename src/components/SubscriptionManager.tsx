'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiPackage, FiPlus, FiEdit2, FiTrash2, FiCheck, FiX, FiDollarSign, FiCalendar, FiUsers } from 'react-icons/fi';
import { useAuth } from '@/lib/auth';
import { SubscriptionPlan, SubscriptionSettings } from '@/types';
import { subscriptionPlanService, subscriptionSettingsService } from '@/lib/database';
import Card from '@/components/Card';

export default function SubscriptionManager() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [settings, setSettings] = useState<SubscriptionSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [showNewPlanForm, setShowNewPlanForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [newPlan, setNewPlan] = useState({
    name: '',
    description: '',
    type: 'session_pack' as 'session_pack' | 'annual',
    sessionCount: 10,
    price: 150,
    isActive: true
  });

  const [settingsForm, setSettingsForm] = useState({
    singleSessionPrice: 15,
    annualSubscriptionPrice: 100,
    currency: 'USD',
    sessionPackPlans: [
      { sessionCount: 10, price: 150, isActive: true },
      { sessionCount: 15, price: 220, isActive: true }
    ]
  });

  useEffect(() => {
    if (user?.role === 'coach' || user?.role === 'admin') {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [plansData, settingsData] = await Promise.all([
        subscriptionPlanService.getAll(),
        subscriptionSettingsService.get()
      ]);
      
      setPlans(plansData);
      
      if (settingsData) {
        setSettings(settingsData);
        setSettingsForm({
          singleSessionPrice: settingsData.singleSessionPrice,
          annualSubscriptionPrice: settingsData.annualSubscriptionPrice,
          currency: settingsData.currency,
          sessionPackPlans: settingsData.sessionPackPlans
        });
      }
    } catch (error) {
      console.error('Error loading subscription data:', error);
      setError('Failed to load subscription data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPlan.name.trim() || !newPlan.description.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const planData = {
        ...newPlan,
        createdBy: user?.id || ''
      };

      await subscriptionPlanService.create(planData);
      
      setSuccess('Subscription plan created successfully');
      setShowNewPlanForm(false);
      setNewPlan({
        name: '',
        description: '',
        type: 'session_pack',
        sessionCount: 10,
        price: 150,
        isActive: true
      });
      
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error creating plan:', error);
      setError('Failed to create subscription plan');
    }
  };

  const handleUpdatePlan = async (planId: string, updates: Partial<SubscriptionPlan>) => {
    try {
      await subscriptionPlanService.update(planId, updates);
      setSuccess('Plan updated successfully');
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error updating plan:', error);
      setError('Failed to update plan');
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) {
      return;
    }

    try {
      await subscriptionPlanService.delete(planId);
      setSuccess('Plan deleted successfully');
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error deleting plan:', error);
      setError('Failed to delete plan');
    }
  };

  const handleSaveSettings = async () => {
    try {
      const settingsData = {
        ...settingsForm,
        lastUpdatedBy: user?.id || '',
        lastUpdatedAt: new Date()
      };

      if (settings) {
        await subscriptionSettingsService.set(settingsData);
      } else {
        await subscriptionSettingsService.create(settingsData);
      }

      setSuccess('Settings updated successfully');
      setIsEditing(false);
      await loadData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save settings');
    }
  };

  const addSessionPackPlan = () => {
    setSettingsForm(prev => ({
      ...prev,
      sessionPackPlans: [
        ...prev.sessionPackPlans,
        { sessionCount: 5, price: 75, isActive: true }
      ]
    }));
  };

  const removeSessionPackPlan = (index: number) => {
    setSettingsForm(prev => ({
      ...prev,
      sessionPackPlans: prev.sessionPackPlans.filter((_, i) => i !== index)
    }));
  };

  const updateSessionPackPlan = (index: number, field: string, value: any) => {
    setSettingsForm(prev => ({
      ...prev,
      sessionPackPlans: prev.sessionPackPlans.map((plan, i) => 
        i === index ? { ...plan, [field]: value } : plan
      )
    }));
  };

  if (!user || (user.role !== 'coach' && user.role !== 'admin')) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <FiPackage className="text-[#D91CD2]" size={24} />
            <h2 className="text-2xl font-bold">Subscription Management</h2>
          </div>
          <button
            onClick={() => setShowNewPlanForm(!showNewPlanForm)}
            className="btn-primary flex items-center"
          >
            <FiPlus className="mr-2" />
            New Plan
          </button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-6 flex items-center">
            <FiX className="text-red-500 mr-2" />
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-500/20 border border-green-500 rounded-lg p-3 mb-6 flex items-center">
            <FiCheck className="text-green-500 mr-2" />
            <p className="text-green-500 text-sm">{success}</p>
          </div>
        )}

        {/* Subscription Settings */}

      </Card>

      {/* New Plan Form */}
      {showNewPlanForm && (
        <Card>
          <h3 className="text-lg font-medium mb-4">Create New Plan</h3>
          <form onSubmit={handleCreatePlan} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Plan Name</label>
                <input
                  type="text"
                  value={newPlan.name}
                  onChange={(e) => setNewPlan(prev => ({ ...prev, name: e.target.value }))}
                  className="input-primary w-full"
                  placeholder="e.g., 10 Session Pack"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">Plan Type</label>
                <select
                  value={newPlan.type}
                  onChange={(e) => setNewPlan(prev => ({ ...prev, type: e.target.value as 'session_pack' | 'annual' }))}
                  className="input-primary w-full"
                >
                  <option value="session_pack">Session Pack</option>
                  <option value="annual">Annual Subscription</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Description</label>
              <textarea
                value={newPlan.description}
                onChange={(e) => setNewPlan(prev => ({ ...prev, description: e.target.value }))}
                className="input-primary w-full"
                rows={3}
                placeholder="Describe what this plan includes..."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {newPlan.type === 'session_pack' && (
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Number of Sessions</label>
                  <input
                    type="number"
                    value={newPlan.sessionCount}
                    onChange={(e) => setNewPlan(prev => ({ ...prev, sessionCount: Number(e.target.value) }))}
                    className="input-primary w-full"
                    min="1"
                    required
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Price ({settingsForm.currency})
                </label>
                <input
                  type="number"
                  value={newPlan.price}
                  onChange={(e) => setNewPlan(prev => ({ ...prev, price: Number(e.target.value) }))}
                  className="input-primary w-full"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={newPlan.isActive}
                onChange={(e) => setNewPlan(prev => ({ ...prev, isActive: e.target.checked }))}
                className="mr-2"
              />
              <label htmlFor="isActive" className="text-sm">Make this plan active</label>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowNewPlanForm(false)}
                className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-500"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Create Plan
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Existing Plans */}
      <Card>
        <h3 className="text-lg font-medium mb-4">Current Plans</h3>
        
        {isLoading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-[#D91CD2] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-400">Loading plans...</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-8 bg-gray-800 rounded-lg">
            <FiPackage className="mx-auto text-4xl text-gray-500 mb-4" />
            <p className="text-gray-400">No subscription plans created yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map(plan => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">{plan.name}</h4>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleUpdatePlan(plan.id, { isActive: !plan.isActive })}
                      className={`px-2 py-1 rounded text-xs ${
                        plan.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-600 text-gray-400'
                      }`}
                    >
                      {plan.isActive ? 'Active' : 'Inactive'}
                    </button>
                    <button
                      onClick={() => handleDeletePlan(plan.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <p className="text-sm text-gray-400 mb-3">{plan.description}</p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <FiDollarSign className="mr-2 text-[#D91CD2]" size={16} />
                    <span>{plan.price} {settingsForm.currency}</span>
                  </div>
                  
                  {plan.type === 'session_pack' && plan.sessionCount && (
                    <div className="flex items-center">
                      <FiUsers className="mr-2 text-[#D91CD2]" size={16} />
                      <span>{plan.sessionCount} sessions</span>
                    </div>
                  )}
                  
                  {plan.type === 'annual' && (
                    <div className="flex items-center">
                      <FiCalendar className="mr-2 text-[#D91CD2]" size={16} />
                      <span>Annual subscription</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
