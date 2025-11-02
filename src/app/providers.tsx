'use client';

import { ReactNode, createContext, useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import '@/lib/i18n'; // Initialize i18n
import i18n from 'i18next';

// Language context
type Language = 'en' | 'fr' | 'de';

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const AppContext = createContext<AppContextType>({
  language: 'en',
  setLanguage: () => {},
});

// Mock translations


export function Providers({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const { user } = useAuth();

  // Load language preference from database when user logs in
  useEffect(() => {
    const loadLanguagePreference = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.id));
          if (userDoc.exists() && userDoc.data().language) {
            const userLang = userDoc.data().language as Language;
            setLanguage(userLang);
            i18n.changeLanguage(userLang);
          }
        } catch (error) {
          console.error('Error loading language preference:', error);
        }
      }
    };

    loadLanguagePreference();
  }, [user]);

  // Update language preference in database when it changes
  const handleSetLanguage = async (lang: Language) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
    
    // Save to database if user is logged in
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.id), {
          language: lang
        });
      } catch (error) {
        console.error('Error saving language preference:', error);
      }
    }
  };

  return (
    <AuthProvider>
      <AppContext.Provider
        value={{
          language,
          setLanguage: handleSetLanguage,
        }}
      >
        {children}
      </AppContext.Provider>
    </AuthProvider>
  );
} 