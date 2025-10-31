"use client";

import React, { useState, useEffect } from 'react';
import { 
  coachEarningsService, 
  withdrawalRequestService, 
  userService 
} from '@/lib/database';
import { 
  CoachEarnings, 
  WithdrawalRequest, 
  User 
} from '@/types';
import Card from '@/components/Card';
import { useTranslation } from 'react-i18next'; // Import useTranslation

export default function AdminEarnings() {
  const { t } = useTranslation(); // Initialize useTranslation
  const [coaches, setCoaches] = useState<User[]>([]);
  const [coachEarnings, setCoachEarnings] = useState<CoachEarnings[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [processedRequests, setProcessedRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCommission, setEditingCommission] = useState<string | null>(null);
  const [newCommissionRate, setNewCommissionRate] = useState<string>('');

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      
      // Get all coaches
      const allUsers = await userService.getAll();
      const coachUsers = allUsers.filter((user: User) => user.role === 'coach');
      
      // Get coach earnings and withdrawal requests
      const [earningsData, withdrawalData] = await Promise.all([
        coachEarningsService.getAll(),
        withdrawalRequestService.getAll()
      ]);

      setCoaches(coachUsers);
      setCoachEarnings(earningsData);
      setWithdrawalRequests(withdrawalData.filter((req: WithdrawalRequest) => req.status === 'pending'));
      setProcessedRequests(withdrawalData.filter((req: WithdrawalRequest) => req.status !== 'pending').slice(0, 10)); // Show last 10 processed
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCommissionUpdate = async (coachId: string) => {
    if (!newCommissionRate || parseFloat(newCommissionRate) < 0 || parseFloat(newCommissionRate) > 100) {
      alert('Please enter a valid commission rate between 0 and 100');
      return;
    }

    try {
      const rate = parseFloat(newCommissionRate);
      const coach = coaches.find(c => c.id === coachId);
      
      await coachEarningsService.updateCommissionRate(
        coachId,
        rate,
        'admin'
      );

      await loadAdminData();
      setEditingCommission(null);
      setNewCommissionRate('');
    } catch (error) {
      console.error('Error updating commission:', error);
      alert('Error updating commission rate. Please try again.');
    }
  };

  const handleWithdrawalAction = async (requestId: string, action: 'approved' | 'rejected', note?: string) => {
    try {
      if (action === 'approved') {
        // Use the new updateStatus method that handles money deduction
        await withdrawalRequestService.updateStatus(
          requestId,
          'approved',
          'Admin', // You might want to get this from auth context
          note || 'Approved by admin'
        );
      } else {
        // For rejection, use regular update
        await withdrawalRequestService.update(requestId, {
          status: 'rejected',
          processedDate: new Date(),
          processedBy: 'Admin',
          adminNote: note || '',
          rejectionReason: note || 'Rejected by admin'
        });
      }

      await loadAdminData();
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      alert('Error processing withdrawal request. Please try again.');
    }
  };

  const getCommissionRate = (coachId: string) => {
    const earnings = coachEarnings.find((e: CoachEarnings) => e.coachId === coachId);
    return earnings?.commissionRate || 15; // Default 15%
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount);
  };

  const formatDate = (date: any) => {
    if (!date) return '-';
    if (date.toDate) {
      return date.toDate().toLocaleDateString();
    }
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return (
      <Card>
        <div className="text-center text-gray-400">{t('loadingEarningsData')}</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Commission Management */}
      <Card>
        <h2 className="text-xl font-semibold mb-4 text-white">{t('coachCommissionSettings')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#D91CD2]/30">
                <th className="text-left p-2 text-gray-400">{t('coach')}</th>
                <th className="text-left p-2 text-gray-400">{t('email')}</th>
                <th className="text-left p-2 text-gray-400">{t('currentCommissionRate')}</th>
                <th className="text-left p-2 text-gray-400">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {coaches.map((coach) => (
                <tr key={coach.id} className="border-b border-black/40 hover:bg-black/40">
                  <td className="p-2 text-gray-300">
                    {coach.firstName} {coach.lastName}
                  </td>
                  <td className="p-2 text-gray-300">{coach.email}</td>
                  <td className="p-2">
                    {editingCommission === coach.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          className="w-20 bg-black/50 border-2 border-[#D91CD2]/50 rounded px-2 py-1 text-white focus:outline-none focus:border-[#D91CD2] transition-all duration-300"
                          value={newCommissionRate}
                          onChange={(e) => setNewCommissionRate(e.target.value)}
                          placeholder={t('commissionPlaceholder')}
                          min="0"
                          max="100"
                        />
                        <span className="text-gray-400">%</span>
                      </div>
                    ) : (
                      <span className="text-[#D91CD2]">{getCommissionRate(coach.id)}%</span>
                    )}
                  </td>
                  <td className="p-2">
                    {editingCommission === coach.id ? (
                      <div className="flex gap-2">
                        <button
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-all duration-300"
                          onClick={() => handleCommissionUpdate(coach.id)}
                        >
                          {t('save')}
                        </button>
                        <button
                          className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-all duration-300"
                          onClick={() => {
                            setEditingCommission(null);
                            setNewCommissionRate('');
                          }}
                        >
                          {t('cancel')}
                        </button>
                      </div>
                    ) : (
                      <button
                        className="px-3 py-1 bg-[#D91CD2] text-white rounded text-sm hover:bg-[#c019ba] transition-all duration-300"
                        onClick={() => {
                          setEditingCommission(coach.id);
                          setNewCommissionRate(getCommissionRate(coach.id).toString());
                        }}
                      >
                        {t('edit')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pending Withdrawal Requests */}
      <Card>
        <h2 className="text-xl font-semibold mb-4 text-white">{t('pendingWithdrawalRequests')}</h2>
        {withdrawalRequests.length === 0 ? (
          <p className="text-gray-400">{t('noPendingWithdrawals')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#D91CD2]/30">
                  <th className="text-left p-2 text-gray-400">{t('coach')}</th>
                  <th className="text-left p-2 text-gray-400">{t('amount')}</th>
                  <th className="text-left p-2 text-gray-400">{t('requestDate')}</th>
                  <th className="text-left p-2 text-gray-400">{t('paymentMethod')}</th>
                  <th className="text-left p-2 text-gray-400">{t('paymentDetails')}</th>
                  <th className="text-left p-2 text-gray-400">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {withdrawalRequests.map((request) => (
                  <tr key={request.id} className="border-b border-black/40 hover:bg-black/40">
                    <td className="p-2 text-gray-300">{request.coachName}</td>
                    <td className="p-2 font-semibold text-[#00EEFF]">{formatCurrency(request.amount)}</td>
                    <td className="p-2 text-gray-300">{formatDate(request.requestDate)}</td>
                    <td className="p-2">
                      <span className="px-2 py-1 bg-[#D91CD2]/20 text-[#D91CD2] rounded text-sm capitalize">
                        {request.paymentMethod.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-2">
                      <div className="max-w-xs">
                        <div className="text-sm font-medium text-gray-300 mb-1">{request.paymentDetails.description}</div>
                        <div className="text-xs text-gray-400 break-words">{request.paymentDetails.accountDetails}</div>
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <button
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-all duration-300"
                          onClick={() => {
                            const note = prompt(t('enterApprovalNote'));
                            handleWithdrawalAction(request.id, 'approved', note || t('approvedByAdmin'));
                          }}
                        >
                          {t('approve')}
                        </button>
                        <button
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-all duration-300"
                          onClick={() => {
                            const reason = prompt(t('enterRejectionReason'));
                            if (reason) {
                              handleWithdrawalAction(request.id, 'rejected', reason);
                            }
                          }}
                        >
                          {t('reject')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Recently Processed Withdrawal Requests */}
      <Card>
        <h2 className="text-xl font-semibold mb-4 text-white">{t('recentlyProcessedWithdrawals')}</h2>
        {processedRequests.length === 0 ? (
          <p className="text-gray-400">{t('noProcessedWithdrawals')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#D91CD2]/30">
                  <th className="text-left p-2 text-gray-400">{t('coach')}</th>
                  <th className="text-left p-2 text-gray-400">{t('amount')}</th>
                  <th className="text-left p-2 text-gray-400">{t('status')}</th>
                  <th className="text-left p-2 text-gray-400">{t('processedDate')}</th>
                  <th className="text-left p-2 text-gray-400">{t('processedBy')}</th>
                  <th className="text-left p-2 text-gray-400">{t('adminNote')}</th>
                </tr>
              </thead>
              <tbody>
                {processedRequests.map((request) => (
                  <tr key={request.id} className="border-b border-black/40 hover:bg-black/40">
                    <td className="p-2 text-gray-300">{request.coachName}</td>
                    <td className="p-2 font-semibold text-[#00EEFF]">{formatCurrency(request.amount)}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-sm ${
                        request.status === 'approved' 
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {t(request.status)}
                      </span>
                    </td>
                    <td className="p-2 text-gray-300">{formatDate(request.processedDate)}</td>
                    <td className="p-2 text-gray-300">{request.processedBy || '-'}</td>
                    <td className="p-2 text-gray-300 max-w-xs">
                      <div className="truncate" title={request.adminNote || request.rejectionReason || '-'}>
                        {request.adminNote || request.rejectionReason || '-'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Earnings Overview */}
      <Card>
        <h2 className="text-xl font-semibold mb-4 text-white">{t('platformEarningsOverview')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#D91CD2]/10 border border-[#D91CD2]/30 p-4 rounded-lg">
            <div className="text-sm text-[#D91CD2] font-medium">{t('totalCoaches')}</div>
            <div className="text-2xl font-bold text-white">{coaches.length}</div>
          </div>
          <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-lg">
            <div className="text-sm text-green-400 font-medium">{t('pendingWithdrawals')}</div>
            <div className="text-2xl font-bold text-white">{withdrawalRequests.length}</div>
          </div>
          <div className="bg-[#00EEFF]/10 border border-[#00EEFF]/30 p-4 rounded-lg">
            <div className="text-sm text-[#00EEFF] font-medium">{t('totalWithdrawalAmount')}</div>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(withdrawalRequests.reduce((sum, req) => sum + req.amount, 0))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
