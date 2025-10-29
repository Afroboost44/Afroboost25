'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiShare2, FiCopy, FiCheck, FiDollarSign, FiUsers, FiGift } from 'react-icons/fi';
import { useAuth } from '@/lib/auth';
import { transactionService } from '@/lib/database';

export default function ReferralSystem() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [referralStats, setReferralStats] = useState({
    totalReferrals: 0,
    totalEarned: 0
  });

  useEffect(() => {
    if (user) {
      loadReferralStats();
    }
  }, [user]);

  const loadReferralStats = async () => {
    if (!user) return;
    
    try {
      const transactions = await transactionService.getByUser(user.id);
      const referralTransactions = transactions.filter(t => t.type === 'referral_bonus');
      
      setReferralStats({
        totalReferrals: referralTransactions.length,
        totalEarned: referralTransactions.reduce((sum, t) => sum + t.amount, 0)
      });
    } catch (error) {
      console.error('Error loading referral stats:', error);
    }
  };

  if (!user) return null;

  const referralLink = `${window.location.origin}/signup?ref=${user.referralCode}`;
  const whatsappMessage = `Hey! 💃🕺 I'm absolutely loving these amazing dance classes on Afroboosteur! 
  
🌟 They have incredible instructors teaching Afrobeats, Hip-Hop, Salsa, and so much more!
  
🎁 Join me and get $5 credit to start with when you use my referral code: ${user.referralCode}
  
🔗 Sign up here: ${referralLink}
  
Let's dance together! Can't wait to see you on the platform! ✨`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = referralLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareOnWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareViaOtherPlatforms = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join me on Afroboosteur!',
        text: `Get $5 credit to start with when you use my referral code: ${user.referralCode}`,
        url: referralLink,
      });
    } else {
      copyToClipboard();
    }
  };

  return (
    <div className="card">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-r from-[#D91CD2] to-[#7000FF] rounded-full flex items-center justify-center mx-auto mb-4">
          <FiGift size={32} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold gradient-text">Invite Friends & Earn!</h2>
        <p className="text-gray-400 mt-2">
          Share your love for dance and earn $5 for each friend who joins and books their first class!
        </p>
      </div>

      {/* Referral Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="text-center p-4 bg-[#D91CD2]/10 rounded-lg border border-[#D91CD2]/20"
        >
          <FiUsers className="text-[#D91CD2] mx-auto mb-2" size={24} />
          <div className="text-2xl font-bold gradient-text">{referralStats.totalReferrals}</div>
          <div className="text-sm text-gray-400">Friends Invited</div>
        </motion.div>
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20"
        >
          <FiDollarSign className="text-green-400 mx-auto mb-2" size={24} />
          <div className="text-2xl font-bold text-green-400">${referralStats.totalEarned}</div>
          <div className="text-sm text-gray-400">Total Earned</div>
        </motion.div>
      </div>

      {/* How it works */}
      <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-3 flex items-center">
          <FiGift className="mr-2 text-[#D91CD2]" />
          How it works:
        </h3>
        <div className="space-y-2 text-sm text-gray-300">
          <div className="flex items-start space-x-2">
            <span className="text-[#D91CD2] font-bold">1.</span>
            <span>Share your referral code or link with friends</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-[#D91CD2] font-bold">2.</span>
            <span>They sign up using your code</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-[#D91CD2] font-bold">3.</span>
            <span>When they book their first class, you both get $5!</span>
          </div>
        </div>
      </div>

      {/* Referral Code */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-white mb-2">
          Your Referral Code
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={user.referralCode}
            readOnly
            className="input-primary flex-1 font-mono text-center text-lg font-bold"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={copyToClipboard}
            className="btn-secondary flex items-center space-x-2"
          >
            {copied ? <FiCheck size={16} /> : <FiCopy size={16} />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </motion.button>
        </div>
      </div>

      {/* Referral Link */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-white mb-2">
          Your Referral Link
        </label>
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3">
          <p className="text-sm text-gray-300 break-all">{referralLink}</p>
        </div>
      </div>

      {/* Share Buttons */}
      <div className="space-y-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={shareOnWhatsApp}
          className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
        >
          <FiShare2 size={20} />
          <span>Share on WhatsApp</span>
          <span className="text-xs bg-green-600 px-2 py-1 rounded-full">Recommended</span>
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={shareViaOtherPlatforms}
          className="w-full btn-secondary flex items-center justify-center space-x-2"
        >
          <FiShare2 size={20} />
          <span>Share via Other Apps</span>
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={copyToClipboard}
          className="w-full btn-outline flex items-center justify-center space-x-2"
        >
          {copied ? <FiCheck size={20} /> : <FiCopy size={20} />}
          <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
        </motion.button>
      </div>

      {/* Bonus Info */}
      <div className="mt-6 p-4 bg-gradient-to-r from-[#D91CD2]/10 to-[#7000FF]/10 rounded-lg border border-[#D91CD2]/20">
        <h4 className="font-semibold text-[#D91CD2] mb-2">💡 Pro Tip:</h4>
        <p className="text-sm text-gray-300">
          Share on WhatsApp for the best results! Your friends are more likely to join when they see your personal recommendation in their favorite messaging app.
        </p>
      </div>
    </div>
  );
}
