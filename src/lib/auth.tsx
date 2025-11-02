'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  getIdToken,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, Timestamp, getDocs, query, collection, where, addDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User, DateOrTimestamp } from '@/types';
import Cookies from 'js-cookie';

interface RegisterUserData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  profileImage?: string | null;
  referredBy?: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>; // Add Google login method
  logout: () => Promise<void>; // Make logout async for type safety
  register: (userData: RegisterUserData) => Promise<boolean>;
  updateUserProfile: (data: Partial<User>) => Promise<boolean>;
  updateProfileImage: (imageUrl: string) => Promise<boolean>; // New method
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => false,
  loginWithGoogle: async () => false,
  logout: async () => {}, // Make this async for consistency
  register: async () => false,
  updateUserProfile: async () => false,
  updateProfileImage: async () => false,
  changePassword: async () => false,
});

// Helper function to convert Firestore Timestamp to Date if needed
const convertTimestampToDate = (timestamp: DateOrTimestamp): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  return timestamp as Date;
};

// Generate referral code
const generateReferralCode = (firstName: string, lastName: string): string => {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${initials}${randomNum}`;
};

// Helper function to remove undefined fields from an object
const removeUndefinedFields = (obj: any): any => {
  const cleaned: any = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined && obj[key] !== null) {
      if (typeof obj[key] === 'object' && !(obj[key] instanceof Date) && !(obj[key] instanceof Timestamp)) {
        const nestedCleaned = removeUndefinedFields(obj[key]);
        if (Object.keys(nestedCleaned).length > 0) {
          cleaned[key] = nestedCleaned;
        }
      } else {
        cleaned[key] = obj[key];
      }
    }
  });
  return cleaned;
};

// Default admin user
const createDefaultAdmin = async () => {
  try {
    const adminDoc = await getDoc(doc(db, 'users', 'admin@gmail.com'));
    if (!adminDoc.exists()) {
      const adminData: User = {
        id: 'admin@gmail.com',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@gmail.com',
        role: 'admin',
        credits: 0,
        referralCode: 'ADMIN001',
        preferences: {
          notifications: {
            email: true,
            whatsapp: true,
            website: true,
          },
          twoFactorEnabled: false,
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      await setDoc(doc(db, 'users', 'admin@gmail.com'), removeUndefinedFields(adminData));
      console.log('Default admin created');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
};

// Function to persist auth token in cookies
const persistAuthToken = async (firebaseUser: FirebaseUser | null) => {
  if (firebaseUser) {
    try {
      const token = await getIdToken(firebaseUser, true);
      // Set the token as a cookie that expires in 7 days with secure settings
      Cookies.set('firebase-auth-token', token, { 
        expires: 7, 
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
      });
      console.log('Auth token persisted in cookies');
    } catch (error) {
      console.error('Error persisting auth token:', error);
      // If token refresh fails, remove any existing token
      Cookies.remove('firebase-auth-token', { path: '/' });
    }
  } else {
    // Remove the token cookie when user is null
    Cookies.remove('firebase-auth-token', { path: '/' });
    console.log('Auth token removed from cookies');
  }
};

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);

  // Token refresh interval
  useEffect(() => {
    let refreshInterval: NodeJS.Timeout;
    
    if (auth.currentUser) {
      // Refresh token every 30 minutes
      refreshInterval = setInterval(async () => {
        try {
          if (auth.currentUser) {
            await getIdToken(auth.currentUser, true);
            await persistAuthToken(auth.currentUser);
            console.log('Auth token refreshed');
          }
        } catch (error) {
          console.error('Error refreshing token:', error);
        }
      }, 30 * 60 * 1000); // 30 minutes
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [user]);

  // Initialize default admin and listen to auth state
  useEffect(() => {
    console.log('Setting up auth state listener');
    let unsubscribed = false;
    
    // Create default admin user
    createDefaultAdmin().then(() => {
      if (unsubscribed) return;
      
      // Set up auth state listener
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
        if (unsubscribed) return;
        
        console.log('Auth state changed:', firebaseUser ? `User: ${firebaseUser.email}` : 'No user');
        
        // Persist auth token in cookies
        await persistAuthToken(firebaseUser);
        
        try {
          if (firebaseUser) {
            // Get user data from Firestore
            console.log('Fetching user data from Firestore');
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.email!));
            
            if (userDoc.exists()) {
              console.log('User document found in Firestore');
              const userData = userDoc.data() as User;
              
              // Convert Firestore Timestamps to JavaScript Dates
              if (userData.createdAt) {
                userData.createdAt = convertTimestampToDate(userData.createdAt);
              }
              if (userData.updatedAt) {
                userData.updatedAt = convertTimestampToDate(userData.updatedAt);
              }
              
              setUser(userData);
            } else {
              console.log('User authenticated but no document in Firestore');
              // Create a basic user document if it doesn't exist
              const newUser: User = {
                id: firebaseUser.email!,
                firstName: firebaseUser.displayName?.split(' ')[0] || 'User',
                lastName: firebaseUser.displayName?.split(' ')[1] || '',
                email: firebaseUser.email!,
                role: 'student',
                credits: 0,
                referralCode: generateReferralCode(
                  firebaseUser.displayName?.split(' ')[0] || 'User',
                  firebaseUser.displayName?.split(' ')[1] || ''
                ),
                authProvider: 'email', // Default to email for existing users
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
              };
              
              try {
                await setDoc(doc(db, 'users', firebaseUser.email!), removeUndefinedFields(newUser));
                console.log('Created missing user document');
                // Convert timestamps to dates before setting in state
                const userForState = {
                  ...newUser,
                  createdAt: convertTimestampToDate(newUser.createdAt),
                  updatedAt: convertTimestampToDate(newUser.updatedAt)
                };
                setUser(userForState);
              } catch (error) {
                console.error('Error creating missing user document:', error);
                setUser(null);
              }
            }
          } else {
            console.log('No Firebase user, setting user state to null');
            setUser(null);
          }
        } catch (error) {
          console.error('Error in auth state change handler:', error);
          setUser(null);
        } finally {
          if (!unsubscribed) {
            setIsLoading(false);
            setAuthInitialized(true);
          }
        }
      });
      
      return () => {
        console.log('Cleaning up auth state listener');
        unsubscribed = true;
        unsubscribe();
      };
    }).catch(error => {
      console.error('Error initializing auth:', error);
      setIsLoading(false);
      setAuthInitialized(true);
    });
    
    return () => {
      unsubscribed = true;
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log('Login attempt for:', email);
      
      // Handle admin login separately
      if (email === 'admin@gmail.com' && password === 'HXqua0vo') {
        console.log('Admin login attempt');
        const adminDoc = await getDoc(doc(db, 'users', 'admin@gmail.com'));
        if (adminDoc.exists()) {
          console.log('Admin document exists, setting user');
          const adminData = adminDoc.data() as User;
          
          // Convert timestamps to dates
          if (adminData.createdAt) {
            adminData.createdAt = convertTimestampToDate(adminData.createdAt);
          }
          if (adminData.updatedAt) {
            adminData.updatedAt = convertTimestampToDate(adminData.updatedAt);
          }
          
          setUser(adminData);
          return true;
        } else {
          console.log('Admin document does not exist');
        }
      }

      console.log('Attempting Firebase authentication');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Firebase auth successful, checking Firestore');
      
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.email!));
      
      if (userDoc.exists()) {
        console.log('User document exists, setting user');
        const userData = userDoc.data() as User;
        
        // Convert timestamps to dates
        if (userData.createdAt) {
          userData.createdAt = convertTimestampToDate(userData.createdAt);
        }
        if (userData.updatedAt) {
          userData.updatedAt = convertTimestampToDate(userData.updatedAt);
        }
        
        console.log('User data:', { email: userData.email, role: userData.role });
        setUser(userData);
        
        // Return after a small delay to ensure state updates
        return new Promise<boolean>((resolve) => {
          setTimeout(() => {
            resolve(true);
          }, 50);
        });
      } else {
        console.log('User document does not exist in Firestore');
        
        // Create a basic user document if authenticated but no document exists
        const newUser: User = {
          id: userCredential.user.email!,
          firstName: userCredential.user.displayName?.split(' ')[0] || 'User',
          lastName: userCredential.user.displayName?.split(' ')[1] || '',
          email: userCredential.user.email!,
          role: 'student',
          credits: 0,
          referralCode: generateReferralCode(
            userCredential.user.displayName?.split(' ')[0] || 'User',
            userCredential.user.displayName?.split(' ')[1] || ''
          ),
          authProvider: 'email', // Set auth provider for email login
          preferences: {
            notifications: {
              email: true,
              whatsapp: true,
              website: true,
            },
            twoFactorEnabled: false,
          },
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        
        try {
          await setDoc(doc(db, 'users', userCredential.user.email!), removeUndefinedFields(newUser));
          console.log('Created missing user document');
          // Convert timestamps to dates before setting in state
          const userForState = {
            ...newUser,
            createdAt: convertTimestampToDate(newUser.createdAt),
            updatedAt: convertTimestampToDate(newUser.updatedAt)
          };
          setUser(userForState);
          
          // Return after a small delay to ensure state updates
          return new Promise<boolean>((resolve) => {
            setTimeout(() => {
              resolve(true);
            }, 50);
          });
        } catch (docError) {
          console.error('Error creating missing user document:', docError);
          return false;
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      // Re-throw the error so it can be caught by the login page
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out');
      await signOut(auth);
      // Remove auth token cookie
      Cookies.remove('firebase-auth-token');
      setUser(null);
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const register = async (userData: RegisterUserData) => {
    try {
      console.log('Registration attempt for:', userData.email);
      
      // Check if user already exists
      const existingUserDoc = await getDoc(doc(db, 'users', userData.email));
      if (existingUserDoc.exists()) {
        console.error('User already exists:', userData.email);
        return false;
      }
      
      console.log('Creating user with Firebase Auth');
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
      console.log('User created in Firebase Auth:', userCredential.user.uid);
      
      const newUser: User = {
        id: userCredential.user.email!,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        role: 'student',
        // Only include profileImage if it's a valid URL string
        ...(userData.profileImage && typeof userData.profileImage === 'string' && userData.profileImage.startsWith('http') ? { profileImage: userData.profileImage } : {}),
        phone: userData.phone,
        credits: 0,
        referralCode: generateReferralCode(userData.firstName, userData.lastName),
        ...(userData.referredBy && typeof userData.referredBy === 'string' ? { referredBy: userData.referredBy } : {}),
        authProvider: 'email', // Set auth provider for email registration
        preferences: {
          notifications: {
            email: true,
            whatsapp: true,
            website: true,
          },
          twoFactorEnabled: false,
        },
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      
      console.log('Saving user to Firestore');
      await setDoc(doc(db, 'users', userCredential.user.email!), removeUndefinedFields(newUser));
      console.log('User saved to Firestore successfully');
      
      // If referred by someone, create referral record for admin approval
      if (userData.referredBy) {
        try {
          console.log('Processing referral record for:', userData.referredBy);
          
          // Find the referring user
          const referrerQuery = await getDocs(
            query(collection(db, 'users'), where('referralCode', '==', userData.referredBy))
          );
          
          if (!referrerQuery.empty) {
            const referrerDoc = referrerQuery.docs[0];
            const referrerData = { 
              id: referrerDoc.id, // Use document ID
              ...referrerDoc.data() 
            } as User;
            
            // Get current reward settings for display
            let sponsorRewardAmount = 50; // Default
            try {
              const settingsDoc = await getDoc(doc(db, 'admin_settings', 'referral_rewards'));
              if (settingsDoc.exists()) {
                const settings = settingsDoc.data();
                if (settings.isEnabled && settings.sponsorReward) {
                  sponsorRewardAmount = settings.sponsorReward.amount || 50;
                }
              }
            } catch (settingsError) {
              console.error('Error fetching referral settings:', settingsError);
            }

            // Create referral record for admin approval using referralService
            const { referralService } = await import('@/lib/database');
            
            await referralService.create({
              sponsorId: referrerData.id,
              sponsorName: `${referrerData.firstName} ${referrerData.lastName}`,
              sponsorEmail: referrerData.email,
              refereeId: newUser.id, // This matches the interface
              refereeName: `${newUser.firstName} ${newUser.lastName}`, // This matches the interface
              refereeEmail: newUser.email, // This matches the interface
              referralCode: userData.referredBy,
              status: 'pending',
              submittedAt: Timestamp.now(),
              rewardAmount: sponsorRewardAmount // Use current reward amount for display
            });
            
            console.log(`Referral record created for sponsor ${referrerData.id} and referee ${newUser.id}`);
            
            // Send admin notification about new referral (optional)
            try {
              await fetch('/api/notifications/admin', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  type: 'referral_pending',
                  data: {
                    referrerName: `${referrerData.firstName} ${referrerData.lastName}`,
                    refereeName: `${newUser.firstName} ${newUser.lastName}`, // Updated field name
                    referralCodeUsed: userData.referredBy
                  }
                }),
              });
            } catch (notificationError) {
              console.error('Error sending admin notification:', notificationError);
            }
            
          } else {
            console.log('No user found with referral code:', userData.referredBy);
          }
        } catch (referralError) {
          console.error('Error processing referral:', referralError);
          // Don't fail registration if referral processing fails
        }
      }
      
      console.log('Setting user in state');
      // Convert timestamps to dates before setting in state
      const userForState = {
        ...newUser,
        createdAt: convertTimestampToDate(newUser.createdAt),
        updatedAt: convertTimestampToDate(newUser.updatedAt)
      };
      setUser(userForState);
      return true;
    } catch (error: any) {
      console.error('Registration error:', error.message || error);
      // Check for specific Firebase errors
      if (error.code === 'auth/email-already-in-use') {
        console.error('Email already in use');
      }
      return false;
    }
  };

  const loginWithGoogle = async () => {
    try {
      console.log('Google login attempt');
      const provider = new GoogleAuthProvider();
      
      // Optional: Add additional scopes if needed
      provider.addScope('profile');
      provider.addScope('email');
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      console.log('Google auth successful, checking Firestore');
      
      // Check if user document exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.email!));
      
      if (userDoc.exists()) {
        console.log('User document exists, setting user');
        const userData = userDoc.data() as User;
        
        // Convert timestamps to dates
        if (userData.createdAt) {
          userData.createdAt = convertTimestampToDate(userData.createdAt);
        }
        if (userData.updatedAt) {
          userData.updatedAt = convertTimestampToDate(userData.updatedAt);
        }
        
        // Update profile image if Google provides a better one
        if (user.photoURL && (!userData.profileImage || userData.profileImage !== user.photoURL)) {
          await updateDoc(doc(db, 'users', user.email!), {
            profileImage: user.photoURL,
            updatedAt: Timestamp.now()
          });
          userData.profileImage = user.photoURL;
        }
        
        setUser(userData);
        return true;
      } else {
        console.log('Creating new user from Google login');
        
        // Extract first and last name from display name
        const names = user.displayName?.split(' ') || ['User'];
        const firstName = names[0] || 'User';
        const lastName = names.slice(1).join(' ') || '';
        
        // Create a new user document
        const newUser: User = {
          id: user.email!,
          firstName: firstName,
          lastName: lastName,
          email: user.email!,
          role: 'student',
          profileImage: user.photoURL || undefined,
          credits: 0,
          referralCode: generateReferralCode(firstName, lastName),
          authProvider: 'google',
          googleUid: user.uid,
          preferences: {
            notifications: {
              email: true,
              whatsapp: true,
              website: true,
            },
            twoFactorEnabled: false,
          },
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        
        try {
          await setDoc(doc(db, 'users', user.email!), removeUndefinedFields(newUser));
          console.log('Created new user document from Google login');
          
          // Convert timestamps to dates before setting in state
          const userForState = {
            ...newUser,
            createdAt: convertTimestampToDate(newUser.createdAt),
            updatedAt: convertTimestampToDate(newUser.updatedAt)
          };
          setUser(userForState);
          return true;
        } catch (docError) {
          console.error('Error creating user document for Google login:', docError);
          return false;
        }
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      
      // Handle specific Google login errors
      if (error.code === 'auth/popup-closed-by-user') {
        console.log('Google login popup was closed by user');
      } else if (error.code === 'auth/cancelled-popup-request') {
        console.log('Google login popup was cancelled');
      }
      
      return false;
    }
  };

  const updateUserProfile = async (data: Partial<User>) => {
    try {
      if (!user) return false;
      
      // Only accept URL strings for profile images
      let updatedData = { ...data };
      if (data.profileImage && (!data.profileImage.startsWith('http'))) {
        delete updatedData.profileImage;
      }
      
      const updatedUser = { 
        ...user, 
        ...updatedData, 
        updatedAt: Timestamp.now() 
      };
      
      await updateDoc(doc(db, 'users', user.id), removeUndefinedFields(updatedUser));
      
      // Convert timestamp to date before setting in state
      const userForState = {
        ...updatedUser,
        updatedAt: convertTimestampToDate(updatedUser.updatedAt)
      };
      setUser(userForState);
      return true;
    } catch (error) {
      console.error('Update profile error:', error);
      return false;
    }
  };

  const updateProfileImage = async (imageUrl: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const success = await updateUserProfile({ profileImage: imageUrl });
      if (success) {
        setUser(prev => prev ? { ...prev, profileImage: imageUrl } : null);
      }
      return success;
    } catch (error) {
      console.error('Error updating profile image:', error);
      return false;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      if (!user || !auth.currentUser) return false;
      
      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      // Update password
      await updatePassword(auth.currentUser, newPassword);
      
      return true;
    } catch (error) {
      console.error('Change password error:', error);
      throw error; // Re-throw to handle specific error messages in component
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register, updateUserProfile, updateProfileImage, changePassword, loginWithGoogle }}>
      {authInitialized ? children : (
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-[#D91CD2] border-t-transparent rounded-full animate-spin"></div>
          <p className="ml-4 text-lg">Initializing authentication...</p>
        </div>
      )}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};