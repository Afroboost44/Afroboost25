'use client';

import { useState, useContext } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiMail, FiAlertCircle, FiCheck, FiRefreshCw, FiInfo } from 'react-icons/fi';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type EmailFormData = z.infer<typeof emailSchema>;

interface ApiResponse {
  success?: boolean;
  message?: string;
  error?: string;
  suggestion?: string;
  emailSent?: boolean;
  instructions?: string[];
}

export default function ForgotPassword() {

  const {t} = useTranslation();
  const router = useRouter();
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [email, setEmail] = useState('');
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [instructions, setInstructions] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  });

  const startCountdown = () => {
    setCanResend(false);
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const onSubmitEmail = async (data: EmailFormData) => {
    setIsLoading(true);
    setError('');
    setSuccess('');
    setSuggestion('');
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: data.email }),
      });
      
      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned invalid response format. Please try again.');
      }
      
      const result: ApiResponse = await response.json();
      
      if (!response.ok) {
        setError(result.error || 'Failed to send password reset email');
        if (result.suggestion) {
          setSuggestion(result.suggestion);
        }
        return;
      }
      
      setEmail(data.email);
      setEmailSent(true);
      setSuccess(result.message || 'Password reset email sent! Please check your inbox and spam folder.');
      if (result.instructions) {
        setInstructions(result.instructions);
      }
      startCountdown();
    } catch (err: any) {
      console.error('Error sending password reset email:', err);
      if (err.message.includes('JSON')) {
        setError('Server error. Please try again in a few moments.');
      } else {
        setError('Network error. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resendEmail = async () => {
    if (!canResend) return;
    
    setIsLoading(true);
    setError('');
    setSuggestion('');
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned invalid response format. Please try again.');
      }
      
      const result: ApiResponse = await response.json();
      
      if (!response.ok) {
        setError(result.error || 'Failed to resend password reset email');
        if (result.suggestion) {
          setSuggestion(result.suggestion);
        }
        return;
      }
      
      setSuccess(result.message || 'Password reset email sent again! Please check your inbox and spam folder.');
      startCountdown();
    } catch (err: any) {
      console.error('Error resending password reset email:', err);
      if (err.message.includes('JSON')) {
        setError('Server error. Please try again in a few moments.');
      } else {
        setError('Network error. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmailSent(false);
    setError('');
    setSuccess('');
    setSuggestion('');
    setEmail('');
    setInstructions([]);
  };

  return (
    <div className="min-h-screen flex items-center justify-center mt-8 px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="card">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold gradient-text">
              {t('Forgot Password')}
            </h1>
            <p className="text-gray-400 mt-2">
              {!emailSent 
                ? 'Enter your email address to receive a password reset link' 
                : 'Check your email for the password reset link'}
            </p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-6">
              <div className="flex items-center">
                <FiAlertCircle className="text-red-500 mr-2 flex-shrink-0" />
                <p className="text-red-500 text-sm">{error}</p>
              </div>
              {suggestion && (
                <div className="mt-2 pl-6">
                  <p className="text-red-400 text-xs">{suggestion}</p>
                </div>
              )}
            </div>
          )}

          {success && (
            <div className="bg-green-500/20 border border-green-500 rounded-lg p-3 mb-6 flex items-center">
              <FiCheck className="text-green-500 mr-2 flex-shrink-0" />
              <p className="text-green-500 text-sm">{success}</p>
            </div>
          )}

          {!emailSent ? (
            <form onSubmit={handleSubmit(onSubmitEmail)} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium">
                  {t('Email Address')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiMail className="text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    {...register('email')}
                    className="input-primary w-full pl-12"
                    placeholder="you@example.com"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full flex justify-center items-center"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <FiMail className="mr-2" />
                    {t('Send Reset Link')}
                  </>
                )}
              </button>

              <div className="text-center mt-4">
                <Link href="/login" className="text-[#D91CD2] hover:underline text-sm">
                  {t('Back to Login')}
                </Link>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4">
                <h3 className="text-blue-400 font-semibold mb-2">{t('Email sent to:')}</h3>
                <p className="text-blue-300 text-sm mb-4">{email}</p>
                
                {instructions.length > 0 ? (
                  <div className="space-y-2 text-sm text-gray-300">
                    {instructions.map((instruction, index) => (
                      <p key={index} className="flex items-center">
                        <FiCheck className="text-green-400 mr-2 flex-shrink-0" />
                        {instruction}
                      </p>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2 text-sm text-gray-300">
                    <p className="flex items-center">
                      <FiCheck className="text-green-400 mr-2" />
                      {t('Check your inbox for the password reset link')}
                    </p>
                    <p className="flex items-center">
                      <FiCheck className="text-green-400 mr-2" />
                      {t('If you don’t see it, check your spam folder')}
                    </p>
                    <p className="flex items-center">
                      <FiCheck className="text-green-400 mr-2" />
                      {t('Follow the instructions in the email to reset your password')}
                    </p>
                  </div>
                )}
              </div>

              <div className="text-center space-y-3">
                <p className="text-gray-400 text-sm">
                  {t('Didn’t receive the email?')}
                </p>
                
                <button
                  onClick={resendEmail}
                  disabled={!canResend || isLoading}
                  className={`btn-secondary w-full flex justify-center items-center ${
                    !canResend ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <FiRefreshCw className="mr-2" />
                      {canResend ?   `Resend Email` : `Resend in ${countdown}s`}
                    </>
                  )}
                </button>
              </div>

              <div className="text-center space-y-2">
                <button 
                  type="button" 
                  onClick={resetForm}
                  className="text-[#D91CD2] hover:underline text-sm"
                >
                  {t('Reset Form')}
                </button>
                <br />
                <Link href="/login" className="text-gray-400 hover:text-white text-sm">
                  {t('Back to Login')}
                </Link>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}