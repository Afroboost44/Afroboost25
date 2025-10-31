"use client";

import React, { useState, useEffect } from 'react';
import { coachEarningsService, earningTransactionService, withdrawalRequestService } from '@/lib/database';
import { CoachEarnings, EarningTransaction, WithdrawalRequest } from '@/types';
import { formatDate, formatDateTime } from '@/lib/dateUtils';
import Card from '@/components/Card';
import { useTranslation } from 'react-i18next'; // Import useTranslation

interface CoachEarningsProps {
  coachId: string;
}

export default function CoachEarningsComponent({ coachId }: CoachEarningsProps) {
  const { t } = useTranslation(); // Initialize useTranslation
  const [earnings, setEarnings] = useState<CoachEarnings | null>(null);
  const [transactions, setTransactions] = useState<EarningTransaction[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'bank_transfer'>('paypal');
  const [paymentDetails, setPaymentDetails] = useState({
    description: '',
    accountDetails: ''
  });
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  useEffect(() => {
    loadEarningsData();
  }, [coachId]);

  const loadEarningsData = async () => {
    try {
      setLoading(true);
      
      const [earningsData, transactionsData, withdrawalsData] = await Promise.all([
        coachEarningsService.getByCoachId(coachId),
        earningTransactionService.getByCoachId(coachId),
        withdrawalRequestService.getByCoachId(coachId)
      ]);
      

      setEarnings(earningsData);
      setTransactions(transactionsData);
      setWithdrawalRequests(withdrawalsData);
    } catch (error) {
      console.error('Error loading earnings data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawRequest = async () => {
    if (!earnings || !withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      alert('Please enter a valid withdrawal amount');
      return;
    }

    if (!paymentDetails.description.trim() || !paymentDetails.accountDetails.trim()) {
      alert('Please fill in all payment details');
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (amount > earnings.availableBalance) {
      alert('Withdrawal amount cannot exceed available balance');
      return;
    }

    try {
      setWithdrawing(true);
      await withdrawalRequestService.create({
        coachId: coachId,
        coachName: earnings.coachName || 'Coach Name',
        amount: amount,
        paymentMethod,
        paymentDetails: {
          description: paymentDetails.description,
          accountDetails: paymentDetails.accountDetails
        },
        status: 'pending',
        requestDate: new Date(),
        notes: ''
      });

      await loadEarningsData();
      setWithdrawAmount('');
      setPaymentDetails({ description: '', accountDetails: '' });
      setShowWithdrawModal(false);
      alert('Withdrawal request submitted successfully! We will process it within 3-5 business days.');
    } catch (error) {
      console.error('Error requesting withdrawal:', error);
      alert('Error requesting withdrawal. Please try again.');
    } finally {
      setWithdrawing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'rejected':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CH', {
      style: 'currency',
      currency: 'CHF'
    }).format(amount);
  };

  // Using imported formatDate and formatDateTime from dateUtils for better accuracy
  const formatDateOnly = (date: any) => {
    if (!date) return '-';
    try {
      return formatDate(date, 'en-US');
    } catch (error) {
      return '-';
    }
  };

  const formatDateTimeForTransaction = (date: any) => {
    if (!date) return '-';
    try {
      return formatDateTime(date, 'en-US');
    } catch (error) {
      return '-';
    }
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
      {/* Earnings Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="text-sm text-gray-400">{t('totalEarnings')}</div>
          <div className="text-2xl font-bold text-[#D91CD2]">
            {formatCurrency(earnings?.totalEarnings || 0)}
          </div>
        </Card>
        
        <Card>
          <div className="text-sm text-gray-400">{t('availableBalance')}</div>
          <div className="text-2xl font-bold text-[#00EEFF]">
            {formatCurrency(earnings?.availableBalance || 0)}
          </div>
        </Card>
        
        <Card>
          <div className="text-sm text-gray-400">{t('commissionRate')}</div>
          <div className="text-2xl font-bold text-[#7000FF]">
            {earnings?.commissionRate || 15}%
          </div>
        </Card>
      </div>

      {/* Withdraw Button */}
      <Card>
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-white">{t('withdrawEarnings')}</h3>
            <p className="text-sm text-gray-400">
              {t('availableForWithdrawal')}: {formatCurrency(earnings?.availableBalance || 0)}
            </p>
          </div>
          <button 
            className="bg-[#D91CD2] text-white px-4 py-2 rounded-lg hover:bg-[#c019ba] disabled:opacity-50 transition-all duration-300"
            onClick={() => setShowWithdrawModal(true)}
            disabled={!earnings || earnings.availableBalance <= 0}
          >
            {t('requestWithdrawal')}
          </button>
        </div>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <h3 className="text-lg font-semibold mb-4 text-white">{t('recentTransactions')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#D91CD2]/30">
                <th className="text-left p-2 text-gray-400">{t('date')}</th>
                <th className="text-left p-2 text-gray-400">{t('type')}</th>
                <th className="text-left p-2 text-gray-400">{t('student')}</th>
                <th className="text-left p-2 text-gray-400">{t('course')}</th>
                <th className="text-left p-2 text-gray-400">{t('amount')}</th>
                <th className="text-left p-2 text-gray-400">{t('commission')}</th>
                <th className="text-left p-2 text-gray-400">{t('netEarning')}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 10).map((transaction) => (
                <tr key={transaction.id} className="border-b border-black/40 hover:bg-black/40">
                  <td className="p-2 text-gray-300">
                    <div className="text-sm">
                      <div>{formatDateOnly(transaction.createdAt)}</div>
                      <div className="text-xs text-gray-500">{formatDateTimeForTransaction(transaction.createdAt).split(' ')[1]}</div>
                    </div>
                  </td>
                  <td className="p-2">
                    <span className="px-2 py-1 bg-[#D91CD2]/20 text-[#D91CD2] rounded text-sm">
                      {transaction.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-2 text-gray-300">{transaction.studentName}</td>
                  <td className="p-2 text-gray-300">{transaction.courseName}</td>
                  <td className="p-2 text-gray-300">{formatCurrency(transaction.grossAmount)}</td>
                  <td className="p-2 text-gray-300">{formatCurrency(transaction.commissionAmount)}</td>
                  <td className="p-2 text-[#00EEFF] font-semibold">
                    {formatCurrency(transaction.netAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Withdrawal Requests */}
      <Card>
        <h3 className="text-lg font-semibold mb-4 text-white">{t('withdrawalRequests')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#D91CD2]/30">
                <th className="text-left p-2 text-gray-400">{t('date')}</th>
                <th className="text-left p-2 text-gray-400">{t('amount')}</th>
                <th className="text-left p-2 text-gray-400">{t('status')}</th>
                <th className="text-left p-2 text-gray-400">{t('processedDate')}</th>
                <th className="text-left p-2 text-gray-400">{t('notes')}</th>
              </tr>
            </thead>
            <tbody>
              {withdrawalRequests.map((request) => (
                <tr key={request.id} className="border-b border-black/40 hover:bg-black/40">
                  <td className="p-2 text-gray-300">
                    <div className="text-sm">
                      <div>{formatDateOnly(request.requestDate)}</div>
                      <div className="text-xs text-gray-500">{formatDateTimeForTransaction(request.requestDate).split(' ')[1]}</div>
                    </div>
                  </td>
                  <td className="p-2 text-gray-300">{formatCurrency(request.amount)}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded text-sm ${getStatusColor(request.status)}`}>
                      {t(request.status)}
                    </span>
                  </td>
                  <td className="p-2 text-gray-300">
                    <div className="text-sm">
                      {request.processedDate ? (
                        <>
                          <div>{formatDateOnly(request.processedDate)}</div>
                          <div className="text-xs text-gray-500">{formatDateTimeForTransaction(request.processedDate).split(' ')[1]}</div>
                        </>
                      ) : '-'}
                    </div>
                  </td>
                  <td className="p-2 text-gray-300">{request.rejectionReason || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-black/90 border border-[#D91CD2]/30 rounded-xl p-6 w-full max-w-lg shadow-lg shadow-[#D91CD2]/20 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-white">{t('requestWithdrawal')}</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400">
                  {t('availableBalance')}: {formatCurrency(earnings?.availableBalance || 0)}
                </p>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-400">{t('withdrawalAmount')} *</label>
                <input
                  type="number"
                  className="w-full bg-black/50 border-2 border-[#D91CD2]/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#D91CD2] transition-all duration-300"
                  placeholder={t('enterAmountToWithdraw')}
                  value={withdrawAmount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWithdrawAmount(e.target.value)}
                  max={earnings?.availableBalance || 0}
                  min="1"
                />
              </div>

              {/* Payment Method Selection */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-400">{t('paymentMethod')} *</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="paypal"
                      checked={paymentMethod === 'paypal'}
                      onChange={(e) => setPaymentMethod(e.target.value as 'paypal' | 'bank_transfer')}
                      className="mr-2"
                    />
                    <span className="text-white">{t('paypal')}</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="bank_transfer"
                      checked={paymentMethod === 'bank_transfer'}
                      onChange={(e) => setPaymentMethod(e.target.value as 'paypal' | 'bank_transfer')}
                      className="mr-2"
                    />
                    <span className="text-white">{t('bankTransfer')}</span>
                  </label>
                </div>
              </div>

              {/* Payment Description */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-400">
                  {paymentMethod === 'paypal' ? t('paypalDescription') : t('bankNameAccountType')} *
                </label>
                <input
                  type="text"
                  className="w-full bg-black/50 border-2 border-[#D91CD2]/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#D91CD2] transition-all duration-300"
                  placeholder={
                    paymentMethod === 'paypal' ? t('paypalDescriptionPlaceholder') : t('bankNameAccountTypePlaceholder')
                  }
                  value={paymentDetails.description}
                  onChange={(e) => setPaymentDetails(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              {/* Account Details */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-400">
                  {paymentMethod === 'paypal' ? t('paypalEmailId') : t('accountDetails')} *
                </label>
                <textarea
                  className="w-full bg-black/50 border-2 border-[#D91CD2]/50 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#D91CD2] transition-all duration-300 h-20 resize-none"
                  placeholder={
                    paymentMethod === 'paypal' 
                      ? t('paypalEmailIdPlaceholder')
                      : t('accountDetailsPlaceholder')
                  }
                  value={paymentDetails.accountDetails}
                  onChange={(e) => setPaymentDetails(prev => ({ ...prev, accountDetails: e.target.value }))}
                />
              </div>

              {/* Warning Message */}
              <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-red-400 text-lg">⚠️</span>
                  <div>
                    <h4 className="text-red-400 font-semibold mb-2">{t('importantWarning')}</h4>
                    <div className="text-sm text-red-300 space-y-1">
                      <p>{t('warningCheckPaymentInfo')}</p>
                      <p>{t('warningNotResponsible')}</p>
                      <p>{t('warningInternationalTransfers')}</p>
                      <p>{t('warningProcessingTime')}</p>
                      <p>{t('warningNoReversal')}</p>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                {t('fieldsRequiredNote')}
              </p>
            </div>

            <div className="flex gap-2 mt-6">
              <button 
                className="flex-1 px-4 py-2 border-2 border-[#D91CD2]/50 text-white rounded-lg hover:bg-[#D91CD2]/10 transition-all duration-300"
                onClick={() => {
                  setShowWithdrawModal(false);
                  setWithdrawAmount('');
                  setPaymentDetails({ description: '', accountDetails: '' });
                }}
              >
                {t('cancel')}
              </button>
              <button 
                className="flex-1 px-4 py-2 bg-[#D91CD2] text-white rounded-lg hover:bg-[#c019ba] disabled:opacity-50 transition-all duration-300"
                onClick={handleWithdrawRequest}
                disabled={
                  withdrawing || 
                  !withdrawAmount || 
                  parseFloat(withdrawAmount) <= 0 ||
                  !paymentDetails.description.trim() ||
                  !paymentDetails.accountDetails.trim()
                }
              >
                {withdrawing ? t('processing') : t('submitWithdrawalRequest')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
