'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import Card from '@/components/Card';
import { FiMail, FiSend, FiUser } from 'react-icons/fi';

export default function EmailTestPanel() {
  const { user } = useAuth();
  const [testUserId, setTestUserId] = useState('');
  const [testTitle, setTestTitle] = useState('Test Notification');
  const [testMessage, setTestMessage] = useState('This is a test notification to verify email functionality is working correctly.');
  const [testType, setTestType] = useState('system');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSendTest = async () => {
    if (!testUserId || !testTitle || !testMessage) {
      setResult('Please fill in all fields');
      return;
    }

    setIsSending(true);
    setResult(null);

    try {
      const response = await fetch('/api/test/notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: testUserId,
          title: testTitle,
          message: testMessage,
          type: testType
        })
      });

      const data = await response.json();

      if (response.ok) {
        setResult('✅ Test notification sent successfully! Check user notifications and email inbox.');
      } else {
        setResult(`❌ Error: ${data.error || 'Failed to send test notification'}`);
      }
    } catch (error) {
      setResult(`❌ Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSending(false);
    }
  };

  if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
    return null;
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <div className="flex items-center space-x-3 mb-6">
        <FiMail className="text-[#D91CD2]" size={24} />
        <h2 className="text-2xl font-bold">Email Notification Test</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            <FiUser className="inline mr-2" />
            User ID *
          </label>
          <input
            type="text"
            value={testUserId}
            onChange={(e) => setTestUserId(e.target.value)}
            className="input-primary w-full"
            placeholder="Enter user ID to test"
            required
          />
          <p className="text-xs text-gray-400 mt-1">
            Enter the ID of a user who has email notifications enabled
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Notification Title *
          </label>
          <input
            type="text"
            value={testTitle}
            onChange={(e) => setTestTitle(e.target.value)}
            className="input-primary w-full"
            placeholder="Enter notification title"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Notification Message *
          </label>
          <textarea
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            className="input-primary w-full h-24 resize-none"
            placeholder="Enter notification message"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Notification Type
          </label>
          <select
            value={testType}
            onChange={(e) => setTestType(e.target.value)}
            className="input-primary w-full"
          >
            <option value="system">System</option>
            <option value="booking">Booking</option>
            <option value="payment">Payment</option>
            <option value="course">Course</option>
            <option value="referral">Referral</option>
            <option value="review">Review</option>
            <option value="session">Session</option>
          </select>
        </div>

        <button
          onClick={handleSendTest}
          disabled={isSending || !testUserId || !testTitle || !testMessage}
          className="btn-primary w-full flex items-center justify-center space-x-2"
        >
          {isSending ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <FiSend />
          )}
          <span>{isSending ? 'Sending...' : 'Send Test Notification'}</span>
        </button>

        {result && (
          <div className={`p-4 rounded-lg ${
            result.includes('✅') ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'
          }`}>
            <p className="text-sm">{result}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
