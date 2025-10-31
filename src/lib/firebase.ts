import { initializeApp } from 'firebase/app';
import { Firestore, getFirestore } from 'firebase/firestore';
import { Auth, getAuth } from 'firebase/auth';

// Check if environment variables are missing and provide fallback values
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

// Log missing environment variables
if (!apiKey || !authDomain || !projectId) {
  console.error('Firebase configuration is incomplete. Missing:', {
    apiKey: !apiKey,
    authDomain: !authDomain,
    projectId: !projectId
  });
}

const firebaseConfig = {
  apiKey: apiKey || 'AIzaSyDummyKeyForDevEnvironment',
  authDomain: authDomain || 'demo-project.firebaseapp.com',
  projectId: projectId || 'demo-project',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:abcdef',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

console.log('Firebase config check:', {
  apiKeyExists: !!firebaseConfig.apiKey,
  authDomainExists: !!firebaseConfig.authDomain,
  projectIdExists: !!firebaseConfig.projectId,
});

// Initialize Firebase and services
let app;
let db: Firestore; // Explicitly type db
let auth: Auth; // Explicitly type auth

try {
  console.log('Initializing Firebase app');
  app = initializeApp(firebaseConfig);
  
  // Initialize Firebase services
  console.log('Initializing Firebase services');
  db = getFirestore(app);
  auth = getAuth(app);
  
  console.log('Firebase initialization successful');
} catch (error) {
  console.error('Error initializing Firebase:', error);
  // Provide mock implementations to prevent app from crashing
  app = {} as any;
  db = {} as any; // keep fallback as any for error case
  auth = {
    currentUser: null,
    onAuthStateChanged: () => () => {},
  } as unknown as Auth; // Explicitly cast as Auth
}

export { auth, db, app };
