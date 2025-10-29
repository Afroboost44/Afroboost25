'use client';

import { useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiMail, FiLock, FiAlertCircle } from 'react-icons/fi';
import { AppContext, translations } from '../providers';
import { useAuth } from '@/lib/auth';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react'; // 👈 NEW

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const { language } = useContext(AppContext);
  const { login, user, isLoading: authLoading } = useAuth();
  const t = translations[language];
  const router = useRouter();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && !authLoading) {
      router.replace('/');
    }
  }, [user, authLoading, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError('');
    try {
      const success = await login(data.email, data.password);
      if (success) window.location.reload();
      else setError('Invalid email or password. Please check your credentials and try again.');
    } catch (err: any) {
      if (err?.code === 'auth/user-not-found') setError('User not found. Please check your email or sign up for an account.');
      else if (err?.code === 'auth/wrong-password') setError('Incorrect password. Please try again.');
      else if (err?.code === 'auth/invalid-credential') setError('Invalid credentials. Please check your email and password.');
      else if (err?.code === 'auth/network-request-failed') setError('Network error. Please check your internet connection.');
      else setError(`An error occurred: ${err?.message || 'Please try again later.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#D91CD2] border-t-transparent rounded-full animate-spin" />
        <p className="ml-4 text-lg">Loading...</p>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#D91CD2] border-t-transparent rounded-full animate-spin" />
        <p className="ml-4 text-lg">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="card">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold gradient-text">{t.signIn}</h1>
            <p className="text-gray-400 mt-2">
              {t.noAccount}{' '}
              <Link href="/signup" className="text-[#D91CD2] hover:underline">
                {t.signUp}
              </Link>
            </p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-6 flex items-center">
              <FiAlertCircle className="text-red-500 mr-2" />
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium">
                {t.email}
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
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium">
                {t.password}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  {...register('password')}
                  className="input-primary w-full pl-12"
                  placeholder="••••••••"
                />
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 bg-black border-[#D91CD2] rounded focus:ring-[#D91CD2]"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-400">
                  Remember me
                </label>
              </div>
              <Link href="/forgot-password" className="text-sm text-[#D91CD2] hover:underline">
                {t.forgotPassword}
              </Link>
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full flex justify-center items-center">
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                t.signIn
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-8 flex items-center">
            <div className="flex-1 h-px bg-[#D91CD2]/20" />
            <span className="px-3 text-xs uppercase tracking-wider text-gray-400">ou</span>
            <div className="flex-1 h-px bg-[#D91CD2]/20" />
          </div>

          {/* Google button */}
          <div className="mt-6">
            <button
              onClick={() => signIn('google', { callbackUrl: '/' })}
              className="w-full border border-[#D91CD2]/40 rounded-lg py-3 hover:bg-[#D91CD2]/10 transition"
            >
              Continuer avec Google
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
