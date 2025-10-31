import { User } from '@/types';

/**
 * Utility functions for role-based access control
 */

/**
 * Check if user has admin privileges (admin or superadmin)
 */
export const isAdmin = (user: User | null): boolean => {
  return user?.role === 'admin' || user?.role === 'superadmin';
};

/**
 * Check if user is specifically a superadmin
 */
export const isSuperAdmin = (user: User | null): boolean => {
  return user?.role === 'superadmin';
};

/**
 * Check if user has coach privileges (coach, admin, or superadmin)
 */
export const isCoach = (user: User | null): boolean => {
  return user?.role === 'coach' || isAdmin(user);
};

/**
 * Check if user has seller privileges (seller, admin, or superadmin)
 */
export const isSeller = (user: User | null): boolean => {
  return user?.role === 'seller' || isAdmin(user);
};

/**
 * Check if user can access admin features
 */
export const canAccessAdminFeatures = (user: User | null): boolean => {
  return isAdmin(user);
};

/**
 * Check if user can access superadmin-only features
 */
export const canAccessSuperAdminFeatures = (user: User | null): boolean => {
  return isSuperAdmin(user);
};

/**
 * Get display role for user (maps superadmin to admin for UI purposes if needed)
 */
export const getDisplayRole = (role: string): string => {
  if (role === 'superadmin') {
    return 'admin'; // Display as admin in most UI contexts
  }
  return role;
};

/**
 * Array of all valid roles
 */
export const ALL_ROLES = ['student', 'coach', 'admin', 'seller', 'superadmin'] as const;

/**
 * Array of admin-level roles
 */
export const ADMIN_ROLES = ['admin', 'superadmin'] as const;