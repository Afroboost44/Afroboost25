import { Timestamp } from 'firebase/firestore';

// Type for handling both Date and Firestore Timestamp
export type DateOrTimestamp = Date | Timestamp;

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string; // Optional for password updates
  role: 'student' | 'coach' | 'admin';
  profileImage?: string;
  phone?: string;
  credits: number;
  referralCode: string;
  referredBy?: string;
  resetCode?: {
    code: string;
    expires: number;
  };
  customEmoji?: string; // URL to custom emoji image
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  duration: number; // in minutes
  maxStudents: number;
  currentStudents: number;
  coachId: string;
  coachName: string;
  coachImage?: string;
  imageUrl: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  boosted: boolean;
  boostLevel?: 'basic' | 'premium' | 'featured';
  boostEndDate?: DateOrTimestamp;
  averageRating: number;
  totalReviews: number;
  courseContent?: string[]; // What you will learn
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

export interface Booking {
  id: string;
  courseId: string;
  studentId: string;
  coachId: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'completed' | 'failed';
  paymentAmount: number;
  scheduledDate: DateOrTimestamp;
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

export interface Review {
  id: string;
  courseId: string;
  studentId: string;
  studentName: string;
  studentImage?: string;
  rating: number;
  comment: string;
  helpful?: number;
  coachId?: string;
  createdAt: DateOrTimestamp;
}

export interface ChatMessage {
  id: string;
  courseId: string;
  senderId: string;
  senderName: string;
  senderRole: 'student' | 'coach' | 'admin';
  message: string;
  imageUrl?: string; // URL to attached image
  timestamp: DateOrTimestamp;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  receiverName: string;
  message: string;
  imageUrl?: string; // URL to attached image
  read: boolean;
  timestamp: DateOrTimestamp;
}

export interface GroupChat {
  id: string;
  name: string;
  description?: string;
  creatorId: string;
  members: string[]; // Array of user IDs
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

export interface GroupChatMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderRole: 'student' | 'coach' | 'admin';
  message: string;
  imageUrl?: string; // URL to attached image
  timestamp: DateOrTimestamp;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'booking' | 'payment' | 'course' | 'referral' | 'system' | 'review' | 'session';
  read: boolean;
  createdAt: DateOrTimestamp;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'topup' | 'course_purchase' | 'referral_bonus' | 'boost_payment' | 'course_boost' | 'subscription_purchase';
  amount: number;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: DateOrTimestamp;
}

export interface PaymentDetails {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  holderName: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  category: string;
}

export interface EditableContent {
  id: string;
  type: 'about' | 'privacy' | 'terms';
  title: string;
  content: string;
  imageUrl?: string;
  lastUpdated: DateOrTimestamp;
  lastUpdatedBy: string;
}

export interface CustomEmoji {
  id: string;
  name: string;
  imageUrl: string;
  createdBy: string;
  createdAt: DateOrTimestamp;
}

export interface CourseSchedule {
  id: string;
  courseId: string;
  title: string;
  startTime: DateOrTimestamp;
  endTime: DateOrTimestamp;
  level: 'beginner' | 'intermediate' | 'advanced' | 'all';
  location?: string;
  description?: string;
  createdBy: string;
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

// Subscription and Session Management Types
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  type: 'session_pack' | 'annual';
  sessionCount?: number; // for session packs
  price: number;
  isActive: boolean;
  createdBy: string;
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  planType: 'session_pack' | 'annual';
  totalSessions?: number; // only for session packs
  remainingSessions?: number; // only for session packs
  startDate: DateOrTimestamp;
  endDate?: DateOrTimestamp; // for annual subscriptions
  status: 'active' | 'expired' | 'cancelled';
  paymentId: string;
  paymentMethod: 'stripe' | 'paypal';
  amount: number;
  createdAt: DateOrTimestamp;
  updatedAt: DateOrTimestamp;
}

export interface SessionUsage {
  id: string;
  userId: string;
  subscriptionId: string;
  courseId: string;
  courseName: string;
  coachId: string;
  coachName: string;
  sessionDate: DateOrTimestamp;
  status: 'scheduled' | 'attended' | 'missed' | 'cancelled';
  deductedAt: DateOrTimestamp;
  createdAt: DateOrTimestamp;
}

export interface SubscriptionSettings {
  id: string;
  sessionPackPlans: Array<{
    sessionCount: number;
    price: number;
    isActive: boolean;
  }>;
  singleSessionPrice: number;
  annualSubscriptionPrice: number;
  currency: string;
  lastUpdatedBy: string;
  lastUpdatedAt: DateOrTimestamp;
}

export interface BackgroundSettings {
  id: string;
  backgroundImageUrl: string;
  updatedAt?: DateOrTimestamp;
  updatedBy?: string;
}
