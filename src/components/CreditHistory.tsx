'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiDollarSign, 
  FiTrendingUp, 
  FiTrendingDown, 
  FiClock, 
  FiUser,
  FiRefreshCw,
  FiShoppingCart,
  FiGift
} from 'react-icons/fi';
import { useAuth } from '@/lib/auth';
import { creditTransactionService, transactionService } from '@/lib/database';
import { CreditTransaction, Transaction } from '@/types';
import Card from './Card';
import { useTranslation } from 'react-i18next'; // Import useTranslation

interface CombinedTransaction {
  id: string;
  userId: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  createdAt: any;
  source: 'transaction' | 'credit';
  adminName?: string;
  balanceBefore?: number;
  balanceAfter?: number;
}

export default function CreditHistory() {
  const { t } = useTranslation(); // Initialize useTranslation
  const { user } = useAuth();
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (user?.id) {
      loadTransactions();
    }
  }, [user]);

  const loadTransactions = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const [creditTxns, allTxns] = await Promise.all([
        creditTransactionService.getByUser(user.id),
        transactionService.getByUser(user.id)
      ]);
      
      setCreditTransactions(creditTxns);
      setAllTransactions(allTxns);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: any) => {
    const realDate = date instanceof Date ? date : date.toDate();
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(realDate);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'topup':
        return <FiTrendingUp className="text-green-400" />;
      case 'course_purchase':
      case 'subscription_purchase':
      case 'product_purchase':
        return <FiShoppingCart className="text-blue-400" />;
      case 'referral_bonus':
        return <FiGift className="text-purple-400" />;
      case 'admin_credit':
        return <FiTrendingUp className="text-green-400" />;
      case 'admin_debit':
        return <FiTrendingDown className="text-red-400" />;
      default:
        return <FiDollarSign className="text-gray-400" />;
    }
  };

  const getTransactionDescription = (transaction: CombinedTransaction) => {
    switch (transaction.type) {
      case 'topup':
        return t('accountTopup');
      case 'course_purchase':
        return t('coursePurchase');
      case 'subscription_purchase':
        return t('subscriptionPurchase');
      case 'product_purchase':
        return t('productPurchase');
      case 'referral_bonus':
        return t('referralBonus');
      case 'admin_credit':
        return t('adminCredit');
      case 'admin_debit':
        return t('adminDebit');
      default:
        return transaction.description;
    }
  };

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-[#D91CD2] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Combine and sort all transactions by date
  const combinedTransactions: CombinedTransaction[] = [
    ...allTransactions.map(t => ({
      id: t.id,
      userId: t.userId,
      type: t.type,
      amount: t.amount,
      description: t.description,
      status: t.status,
      createdAt: t.createdAt,
      source: 'transaction' as const
    })),
    ...creditTransactions.map(t => ({
      id: t.id,
      userId: t.userId,
      type: t.type === 'credit' ? 'admin_credit' : 'admin_debit',
      amount: t.type === 'credit' ? t.amount : -t.amount,
      description: t.reason,
      status: 'completed',
      createdAt: t.createdAt,
      source: 'credit' as const,
      adminName: t.adminName,
      balanceBefore: t.balanceBefore,
      balanceAfter: t.balanceAfter
    }))
  ].sort((a, b) => {
    const dateA = a.createdAt instanceof Date ? a.createdAt : a.createdAt.toDate();
    const dateB = b.createdAt instanceof Date ? b.createdAt : b.createdAt.toDate();
    return dateB.getTime() - dateA.getTime();
  });

  const filteredTransactions = activeTab === 'all' 
    ? combinedTransactions 
    : activeTab === 'credits'
    ? combinedTransactions.filter(t => t.source === 'credit')
    : combinedTransactions.filter(t => t.source === 'transaction');

  return (
    <div className="space-y-6">
      {/* Current Balance */}
      <Card className="text-center">
        <div className="w-20 h-20 bg-gradient-to-r from-[#D91CD2] to-[#7000FF] rounded-full flex items-center justify-center mx-auto mb-4">
          <FiDollarSign size={40} className="text-white" />
        </div>
        <h2 className="text-3xl font-bold gradient-text mb-2">
          CHF {user.credits.toFixed(2)}
        </h2>
        <p className="text-gray-400">{t('availableCredits')}</p>
        <button
          onClick={loadTransactions}
          className="mt-4 px-4 py-2 bg-[#D91CD2]/10 text-[#D91CD2] rounded-lg hover:bg-[#D91CD2]/20 transition-colors text-sm flex items-center space-x-2 mx-auto"
        >
          <FiRefreshCw size={16} />
          <span>{t('refresh')}</span>
        </button>
      </Card>

      {/* Transaction History */}
      <Card>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xl font-semibold">{t('transactionHistory')}</h3>
        </div>
        <div className="flex space-x-2 mb-4">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-1 py-1 rounded-lg text-sm transition-colors ${
                activeTab === 'all'
                  ? 'bg-[#D91CD2] text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {t('all')}
            </button>
            <button
              onClick={() => setActiveTab('credits')}
              className={`px-1 py-1 rounded-lg text-sm transition-colors ${
                activeTab === 'credits'
                  ? 'bg-[#D91CD2] text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {t('adminCredits')}
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-1 py-1 rounded-lg text-sm transition-colors ${
                activeTab === 'payments'
                  ? 'bg-[#D91CD2] text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {t('payments')}
            </button>
          </div>

        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <FiDollarSign className="mx-auto text-4xl mb-4 opacity-50" />
            <h4 className="text-lg font-medium mb-2">{t('noTransactionsFound')}</h4>
            <p className="text-sm">{t('transactionHistoryWillAppear')}</p>
          </div>
        ) : (
            <div className="space-y-4">
            {filteredTransactions.map((transaction, index) => (
              <motion.div
              key={transaction.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 bg-gray-900 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors"
              >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
                  {getTransactionIcon(transaction.type)}
                </div>
                <div>
                  <h4 className="font-medium">{getTransactionDescription(transaction)}</h4>
                  <div className="flex items-center space-x-2 text-sm text-gray-400 flex-wrap">
                  <FiClock size={14} />
                  <span>{formatDate(transaction.createdAt)}</span>
                  {transaction.source === 'credit' && transaction.adminName && (
                    <>
                    <span>•</span>
                    <FiUser size={14} />
                    <span>{t('by')} {transaction.adminName}</span>
                    </>
                  )}
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{transaction.description}</p>
                  {transaction.source === 'credit' && (
                  <div className="text-xs text-gray-500 mt-1">
                    {t('balance')}: CHF{transaction.balanceBefore?.toFixed(2)} → CHF{transaction.balanceAfter?.toFixed(2)}
                  </div>
                  )}
                </div>
                </div>
                <div className="text-right sm:text-left">
                <div className={`text-lg font-semibold ${
                  transaction.amount > 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {transaction.amount > 0 ? '+' : ''} CHF {Math.abs(transaction.amount).toFixed(2)}
                </div>
                <div className={`text-xs px-2 py-1 rounded ${
                  transaction.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                  transaction.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {t(transaction.status)}
                </div>
                </div>
              </div>
              </motion.div>
            ))}
            </div>
        )}
      </Card>
    </div>
  );
}
