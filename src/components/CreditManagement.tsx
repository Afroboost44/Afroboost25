'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiPlus, 
  FiMinus, 
  FiDollarSign, 
  FiUser, 
  FiClock, 
  FiTrendingUp,
  FiTrendingDown,
  FiX
} from 'react-icons/fi';
import { useAuth } from '@/lib/auth';
import { creditTransactionService, userService } from '@/lib/database';
import { User, CreditTransaction } from '@/types';
import Card from './Card';
import { useTranslation } from 'react-i18next'; // Import useTranslation

interface CreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSuccess: () => void;
}

const CreditModal = ({ isOpen, onClose, user: selectedUser, onSuccess }: CreditModalProps) => {
  const { t } = useTranslation(); // Initialize useTranslation
  const { user: currentUser } = useAuth();
  const [type, setType] = useState<'credit' | 'debit'>('credit');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !currentUser || !amount || !reason) return;

    setIsProcessing(true);
    try {
      const amountNum = parseFloat(amount);
      if (amountNum <= 0) {
        alert('Please enter a valid amount');
        return;
      }

      if (type === 'credit') {
        await creditTransactionService.creditUser(
          selectedUser.id,
          amountNum,
          reason,
          currentUser.id,
          `${currentUser.firstName} ${currentUser.lastName}`
        );
      } else {
        await creditTransactionService.debitUser(
          selectedUser.id,
          amountNum,
          reason,
          currentUser.id,
          `${currentUser.firstName} ${currentUser.lastName}`
        );
      }

      setAmount('');
      setReason('');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error processing credit transaction:', error);
      alert('Error processing transaction. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gray-900 rounded-xl p-6 w-full max-w-md"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold">
            {type === 'credit' ? t('creditStudent') : t('debitStudent')}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <FiX size={24} />
          </button>
        </div>

        {selectedUser && (
          <div className="mb-6 p-4 bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-[#D91CD2] to-[#7B1FA2] rounded-full flex items-center justify-center">
                <span className="text-sm text-white">
                  {selectedUser.firstName.charAt(0)}{selectedUser.lastName.charAt(0)}
                </span>
              </div>
              <div>
                <h4 className="font-medium">{selectedUser.firstName} {selectedUser.lastName}</h4>
                <p className="text-sm text-gray-400">{selectedUser.email}</p>
                <p className="text-sm text-green-400">{t('currentBalance')}: ${selectedUser.credits.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">{t('transactionType')}</label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setType('credit')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  type === 'credit'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <FiPlus className="inline mr-1" />
                {t('credit')}
              </button>
              <button
                type="button"
                onClick={() => setType('debit')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  type === 'debit'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <FiMinus className="inline mr-1" />
                {t('debit')}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('amount')}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                <FiDollarSign className="text-gray-400" />
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="0.01"
                step="0.01"
                required
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:border-[#D91CD2] text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('reason')}</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('enterReasonForTransaction')}
              rows={3}
              required
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:border-[#D91CD2] text-white resize-none"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isProcessing || !amount || !reason}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                type === 'credit'
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              {isProcessing ? t('processing') : type === 'credit' ? t('creditAccount') : t('debitAccount')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default function CreditManagement() {
  const { t } = useTranslation(); // Initialize useTranslation
  const [users, setUsers] = useState<User[]>([]);
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allUsers, allTransactions] = await Promise.all([
        userService.getAll(),
        creditTransactionService.getAll()
      ]);
      
      // Filter to only show students and coaches
      const studentsAndCoaches = allUsers.filter(user => user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'coach');
      setUsers(studentsAndCoaches);
      setCreditTransactions(allTransactions);
    } catch (error) {
      console.error('Error loading credit management data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreditUser = (user: User) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleSuccess = () => {
    loadData(); // Reload data after successful transaction
  };

  const filteredUsers = users.filter(user =>
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-[#D91CD2] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{t('creditManagement')}</h2>
        <div className="text-sm text-gray-400">
          {t('totalStudents')}: {users.length} | {t('totalTransactions')}: {creditTransactions.length}
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('searchStudentsByNameOrEmail')}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:border-[#D91CD2] text-white"
          />
        </div>
      </div>

      {/* Students List */}
      <Card>
        <h3 className="text-xl font-semibold mb-6">{t('studentAccounts')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4">{t('student')}</th>
                <th className="text-left py-3 px-4">{t('email')}</th>
                <th className="text-left py-3 px-4">{t('role')}</th>
                <th className="text-left py-3 px-4">{t('currentBalance')}</th>
                <th className="text-left py-3 px-4">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id} className="border-b border-gray-800 hover:bg-gray-900">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-[#D91CD2] to-[#7B1FA2] rounded-full flex items-center justify-center">
                        <span className="text-xs text-white">
                          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                        </span>
                      </div>
                      <span className="font-medium">{user.firstName} {user.lastName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-400">{user.email}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      user.role === 'student' 
                        ? 'bg-blue-500/20 text-blue-400' 
                        : 'bg-green-500/20 text-green-400'
                    }`}>
                      {t(user.role)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-green-400">${user.credits.toFixed(2)}</span>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleCreditUser(user)}
                      className="px-3 py-1 bg-[#D91CD2] text-white rounded-lg hover:bg-[#D91CD2]/80 transition-colors text-sm"
                    >
                      {t('creditDebit')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <h3 className="text-xl font-semibold mb-6">{t('recentCreditTransactions')}</h3>
        {creditTransactions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FiDollarSign className="mx-auto text-4xl mb-4 opacity-50" />
            <p>{t('noCreditTransactionsYet')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4">{t('student')}</th>
                  <th className="text-left py-3 px-4">{t('type')}</th>
                  <th className="text-left py-3 px-4">{t('amount')}</th>
                  <th className="text-left py-3 px-4">{t('balanceChange')}</th>
                  <th className="text-left py-3 px-4">{t('admin')}</th>
                  <th className="text-left py-3 px-4">{t('reason')}</th>
                  <th className="text-left py-3 px-4">{t('date')}</th>
                </tr>
              </thead>
              <tbody>
                {creditTransactions.slice(0, 20).map(transaction => {
                  const student = users.find(u => u.id === transaction.userId);
                  return (
                    <tr key={transaction.id} className="border-b border-gray-800 hover:bg-gray-900">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-gradient-to-r from-[#D91CD2] to-[#7B1FA2] rounded-full flex items-center justify-center">
                            <span className="text-xs text-white">
                              {student?.firstName.charAt(0)}{student?.lastName.charAt(0)}
                            </span>
                          </div>
                          <span className="text-sm">{student?.firstName} {student?.lastName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`flex items-center space-x-1 ${
                          transaction.type === 'credit' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {transaction.type === 'credit' ? (
                            <FiTrendingUp size={16} />
                          ) : (
                            <FiTrendingDown size={16} />
                          )}
                          <span className="capitalize">{t(transaction.type)}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={transaction.type === 'credit' ? 'text-green-400' : 'text-red-400'}>
                          ${transaction.amount.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-400">
                        ${transaction.balanceBefore.toFixed(2)} → ${transaction.balanceAfter.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-sm">{transaction.adminName}</td>
                      <td className="py-3 px-4 text-sm text-gray-400 max-w-xs truncate">
                        {transaction.reason}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-400">
                        {formatDate(transaction.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Credit Modal */}
      <CreditModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        user={selectedUser}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
