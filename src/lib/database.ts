import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from './firebase';
import { Course, Booking, Review, ChatMessage, Notification, Transaction, FAQItem, User, DirectMessage, EditableContent, CustomEmoji, GroupChat, GroupChatMessage, CourseSchedule, SubscriptionPlan, UserSubscription, SessionUsage, SubscriptionSettings, BackgroundSettings } from '@/types';

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

// User Services
export const userService = {
  async getAll() {
    const querySnapshot = await getDocs(collection(db, 'users'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[];
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'users', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as User;
    }
    return null;
  },

  async update(id: string, data: Partial<User>) {
    await updateDoc(doc(db, 'users', id), removeUndefinedFields(data));
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'users', id));
  },

  getByEmail: async (email: string): Promise<User | null> => {
    try {
      const q = query(collection(db, 'users'), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as User;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }
};

// Course Services
export const courseService = {
  async create(courseData: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'courses'), removeUndefinedFields({
      ...courseData,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    return docRef.id;
  },

  async getAll() {
    const querySnapshot = await getDocs(collection(db, 'courses'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Course[];
  },

  async getById(id: string) {
    try {
      console.log(`Fetching course with ID: ${id}`);
      const docSnap = await getDoc(doc(db, 'courses', id));
      
      if (docSnap.exists()) {
        console.log('Course found:', docSnap.id);
        return { id: docSnap.id, ...docSnap.data() } as Course;
      } else {
        console.log('Course not found');
        return null;
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      return null;
    }
  },

  async getByCoach(coachId: string) {
    const q = query(collection(db, 'courses'), where('coachId', '==', coachId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Course[];
  },

  async getBoosted() {
    const q = query(collection(db, 'courses'), where('boosted', '==', true));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Course[];
  },

  async update(id: string, updates: Partial<Course>) {
    await updateDoc(doc(db, 'courses', id), removeUndefinedFields({
      ...updates,
      updatedAt: new Date()
    }));
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'courses', id));
  }
};

// Booking Services
export const bookingService = {
  async create(bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'bookings'), removeUndefinedFields({
      ...bookingData,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    return docRef.id;
  },

  async createWithSubscription(
    bookingData: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>,
    courseId: string,
    courseName: string,
    coachName: string
  ) {
    // Check if user has active subscription
    const activeSubscription = await userSubscriptionService.getActiveByUserId(bookingData.studentId);
    
    if (!activeSubscription) {
      throw new Error('No active subscription found');
    }

    // For session packs, check if sessions are available
    if (activeSubscription.planType === 'session_pack') {
      if (!activeSubscription.remainingSessions || activeSubscription.remainingSessions <= 0) {
        throw new Error('No sessions remaining in your package');
      }
    }

    // For annual subscriptions, check if still valid
    if (activeSubscription.planType === 'annual' && activeSubscription.endDate) {
      const endDate = activeSubscription.endDate instanceof Timestamp 
        ? activeSubscription.endDate.toDate() 
        : new Date(activeSubscription.endDate);
      
      if (endDate < new Date()) {
        throw new Error('Annual subscription has expired');
      }
    }

    // Get student details for notification
    const student = await userService.getById(bookingData.studentId);
    const studentName = student ? `${student.firstName} ${student.lastName}` : 'A student';

    // Create booking
    const bookingId = await this.create(bookingData);

    // Notify coach about the new booking
    await notificationService.create({
      userId: bookingData.coachId,
      title: 'New Session Booked!',
      message: `${studentName} has booked your course "${courseName}" using their subscription. Check your dashboard to manage this session.`,
      type: 'booking',
      read: false
    });

    // Deduct session if it's a session pack
    if (activeSubscription.planType === 'session_pack') {
      await userSubscriptionService.deductSession(activeSubscription.id);
      
      // Record session usage
      await sessionUsageService.create({
        userId: bookingData.studentId,
        subscriptionId: activeSubscription.id,
        courseId,
        courseName,
        coachId: bookingData.coachId,
        coachName,
        sessionDate: bookingData.scheduledDate,
        status: 'scheduled',
        deductedAt: Timestamp.now()
      });
    } else {
      // For annual subscription, still record usage but don't deduct
      await sessionUsageService.create({
        userId: bookingData.studentId,
        subscriptionId: activeSubscription.id,
        courseId,
        courseName,
        coachId: bookingData.coachId,
        coachName,
        sessionDate: bookingData.scheduledDate,
        status: 'attended',
        deductedAt: Timestamp.now()
      });
    }

    return bookingId;
  },

  async getAll() {
    const querySnapshot = await getDocs(collection(db, 'bookings'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[];
  },

  async getByStudent(studentId: string) {
    const q = query(collection(db, 'bookings'), where('studentId', '==', studentId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[];
  },

  async getByCoach(coachId: string) {
    const q = query(collection(db, 'bookings'), where('coachId', '==', coachId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[];
  },

  async update(id: string, updates: Partial<Booking>) {
    await updateDoc(doc(db, 'bookings', id), removeUndefinedFields({
      ...updates,
      updatedAt: new Date()
    }));
  },

  async updateSessionStatus(bookingId: string, status: 'attended' | 'missed' | 'cancelled') {
    const booking = await this.getById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    // Update booking status
    await this.update(bookingId, { status: status === 'attended' ? 'completed' : 'cancelled' });

    // Find and update session usage
    const sessions = await sessionUsageService.getByUserId(booking.studentId);
    const matchingSession = sessions.find(session => 
      session.courseId === booking.courseId && 
      session.sessionDate === booking.scheduledDate
    );

    if (matchingSession) {
      await sessionUsageService.update(matchingSession.id, { status });
      
      // If session was missed and it was from a session pack, optionally handle refund logic
      if (status === 'missed' && matchingSession.subscriptionId) {
        const subscription = await userSubscriptionService.getById(matchingSession.subscriptionId);
        if (subscription && subscription.planType === 'session_pack') {
          // Optionally add back the session to the subscription
          // This is a business decision - some gyms refund missed sessions, others don't
          // await userSubscriptionService.update(subscription.id, {
          //   remainingSessions: (subscription.remainingSessions || 0) + 1
          // });
        }
      }
    }
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'bookings', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Booking;
    }
    return null;
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'bookings', id));
  }
};

// Review Services
export const reviewService = {
  async create(reviewData: Omit<Review, 'id' | 'createdAt'>) {
    const docRef = await addDoc(collection(db, 'reviews'), removeUndefinedFields({
      ...reviewData,
      createdAt: new Date()
    }));
    
    // Update course rating
    await updateCourseRating(reviewData.courseId);
    return docRef.id;
  },

  async getAll() {
    const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Review[];
  },

  async getByCourse(courseId: string) {
    const q = query(
      collection(db, 'reviews'),
      where('courseId', '==', courseId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Review[];
  },
  
  async getByUser(userId: string): Promise<Review[]> {
    try {
      const q = query(collection(db, 'reviews'), where('studentId', '==', userId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Review[];
    } catch (error) {
      console.error('Error getting reviews by user:', error);
      throw error;
    }
  }
};

// Chat Services
export const chatService = {
  async sendMessage(messageData: Omit<ChatMessage, 'id' | 'timestamp'>) {
    const docRef = await addDoc(collection(db, 'chat'), removeUndefinedFields({
      ...messageData,
      timestamp: new Date()
    }));
    return docRef.id;
  },

  async getCourseMessages(courseId: string) {
    const q = query(
      collection(db, 'chat'),
      where('courseId', '==', courseId),
      orderBy('timestamp', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ChatMessage[];
  }
};

// Direct Message Services
export const directMessageService = {
  async sendMessage(messageData: Omit<DirectMessage, 'id' | 'timestamp' | 'read'>) {
    const docRef = await addDoc(collection(db, 'directMessages'), removeUndefinedFields({
      ...messageData,
      read: false,
      timestamp: new Date()
    }));
    return docRef.id;
  },

  async getConversation(userId1: string, userId2: string) {
    // Get messages where either user is sender and the other is receiver
    const q1 = query(
      collection(db, 'directMessages'),
      where('senderId', '==', userId1),
      where('receiverId', '==', userId2),
      orderBy('timestamp', 'asc')
    );
    
    const q2 = query(
      collection(db, 'directMessages'),
      where('senderId', '==', userId2),
      where('receiverId', '==', userId1),
      orderBy('timestamp', 'asc')
    );
    
    const [snapshot1, snapshot2] = await Promise.all([
      getDocs(q1),
      getDocs(q2)
    ]);
    
    const messages1 = snapshot1.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DirectMessage[];
    const messages2 = snapshot2.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DirectMessage[];
    
    // Combine and sort by timestamp
    return [...messages1, ...messages2].sort((a, b) => {
      const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : (a.timestamp as any).toDate().getTime();
      const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : (b.timestamp as any).toDate().getTime();
      return timeA - timeB;
    });
  },

  async getUserConversations(userId: string) {
    // Get all messages where user is either sender or receiver
    const q1 = query(
      collection(db, 'directMessages'),
      where('senderId', '==', userId)
    );
    
    const q2 = query(
      collection(db, 'directMessages'),
      where('receiverId', '==', userId)
    );
    
    const [snapshot1, snapshot2] = await Promise.all([
      getDocs(q1),
      getDocs(q2)
    ]);
    
    const sentMessages = snapshot1.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DirectMessage[];
    const receivedMessages = snapshot2.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DirectMessage[];
    
    // Combine all messages
    const allMessages = [...sentMessages, ...receivedMessages];
    
    // Get unique conversation partners
    const conversationPartners = new Map();
    
    allMessages.forEach(msg => {
      const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      const partnerName = msg.senderId === userId ? msg.receiverName : msg.senderName;
      
      // Keep track of the latest message for each conversation
      if (!conversationPartners.has(partnerId) || 
          (conversationPartners.get(partnerId).timestamp < msg.timestamp)) {
        conversationPartners.set(partnerId, {
          userId: partnerId,
          name: partnerName,
          lastMessage: msg.message,
          timestamp: msg.timestamp,
          unread: msg.receiverId === userId && !msg.read ? 1 : 0
        });
      } else if (msg.receiverId === userId && !msg.read) {
        // Increment unread count
        const partner = conversationPartners.get(partnerId);
        partner.unread = (partner.unread || 0) + 1;
        conversationPartners.set(partnerId, partner);
      }
    });
    
    // Convert to array and sort by most recent message
    return Array.from(conversationPartners.values()).sort((a, b) => {
      const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : (a.timestamp as any).toDate().getTime();
      const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : (b.timestamp as any).toDate().getTime();
      return timeB - timeA; // Descending order (newest first)
    });
  },

  async markAsRead(messageId: string) {
    await updateDoc(doc(db, 'directMessages', messageId), { read: true });
  },

  async markConversationAsRead(userId: string, partnerId: string) {
    const q = query(
      collection(db, 'directMessages'),
      where('senderId', '==', partnerId),
      where('receiverId', '==', userId),
      where('read', '==', false)
    );
    
    const snapshot = await getDocs(q);
    
    const updatePromises = snapshot.docs.map(doc => 
      updateDoc(doc.ref, { read: true })
    );
    
    await Promise.all(updatePromises);
  },

  async searchUsers(searchTerm: string, currentUserId: string, limit = 5) {
    // Search for users whose first or last name contains the search term
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    const users = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }) as User)
      .filter(user => 
        user.id !== currentUserId && // Exclude current user
        ((user.firstName?.toLowerCase().includes(searchTerm.toLowerCase())) || 
         (user.lastName?.toLowerCase().includes(searchTerm.toLowerCase())))
      )
      .slice(0, limit); // Limit results
      
    return users;
  }
};

// Notification Services
export const notificationService = {
  async create(notificationData: Omit<Notification, 'id' | 'createdAt'>) {
    const docRef = await addDoc(collection(db, 'notifications'), removeUndefinedFields({
      ...notificationData,
      createdAt: new Date()
    }));
    return docRef.id;
  },

  async getByUser(userId: string) {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notification[];
  },

  async markAsRead(id: string) {
    await updateDoc(doc(db, 'notifications', id), removeUndefinedFields({ read: true }));
  },

  async update(id: string, data: Partial<Notification>) {
    await updateDoc(doc(db, 'notifications', id), removeUndefinedFields(data));
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'notifications', id));
  }
};

// Transaction Services
export const transactionService = {
  async create(transactionData: Omit<Transaction, 'id' | 'createdAt'>) {
    const docRef = await addDoc(collection(db, 'transactions'), removeUndefinedFields({
      ...transactionData,
      createdAt: new Date()
    }));
    return docRef.id;
  },

  async getAll() {
    const querySnapshot = await getDocs(collection(db, 'transactions'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[];
  },

  async getByUser(userId: string): Promise<Transaction[]> {
    try {
      const q = query(collection(db, 'transactions'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[];
    } catch (error) {
      console.error('Error getting transactions by user:', error);
      throw error;
    }
  }
};

// FAQ Services
export const faqService = {
  async getAll() {
    const querySnapshot = await getDocs(collection(db, 'faqs'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FAQItem[];
  },

  async create(faqData: Omit<FAQItem, 'id'>) {
    const docRef = await addDoc(collection(db, 'faqs'), removeUndefinedFields(faqData));
    return docRef.id;
  }
};

// Content Services for managing editable pages
export const contentService = {
  async getAll() {
    const querySnapshot = await getDocs(collection(db, 'content'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as EditableContent[];
  },

  async getByType(type: 'about' | 'privacy' | 'terms') {
    const q = query(collection(db, 'content'), where('type', '==', type));
    const querySnapshot = await getDocs(q);
    const contents = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as EditableContent[];
    return contents.length > 0 ? contents[0] : null;
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'content', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as EditableContent;
    }
    return null;
  },

  async create(contentData: Omit<EditableContent, 'id'>) {
    const docRef = await addDoc(collection(db, 'content'), removeUndefinedFields(contentData));
    return docRef.id;
  },

  async update(id: string, data: Partial<EditableContent>) {
    await updateDoc(doc(db, 'content', id), removeUndefinedFields({
      ...data,
      lastUpdated: new Date()
    }));
  }
};

// Custom Emoji Services
export const emojiService = {
  async create(emojiData: Omit<CustomEmoji, 'id' | 'createdAt'>) {
    const docRef = await addDoc(collection(db, 'customEmojis'), removeUndefinedFields({
      ...emojiData,
      createdAt: new Date()
    }));
    return docRef.id;
  },

  async getAll() {
    const querySnapshot = await getDocs(collection(db, 'customEmojis'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CustomEmoji[];
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'customEmojis', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as CustomEmoji;
    }
    return null;
  },

  async update(id: string, data: Partial<CustomEmoji>) {
    await updateDoc(doc(db, 'customEmojis', id), removeUndefinedFields(data));
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'customEmojis', id));
  }
};

// Group Chat Services
export const groupChatService = {
  async create(groupData: Omit<GroupChat, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'groupChats'), removeUndefinedFields({
      ...groupData,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    return docRef.id;
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'groupChats', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as GroupChat;
    }
    return null;
  },

  async getByMember(userId: string) {
    const q = query(
      collection(db, 'groupChats'),
      where('members', 'array-contains', userId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as GroupChat[];
  },

  async update(id: string, data: Partial<GroupChat>) {
    await updateDoc(doc(db, 'groupChats', id), removeUndefinedFields({
      ...data,
      updatedAt: new Date()
    }));
  },

  async addMember(groupId: string, userId: string) {
    const groupRef = doc(db, 'groupChats', groupId);
    await updateDoc(groupRef, {
      members: arrayUnion(userId),
      updatedAt: new Date()
    });
  },

  async removeMember(groupId: string, userId: string) {
    const groupRef = doc(db, 'groupChats', groupId);
    await updateDoc(groupRef, {
      members: arrayRemove(userId),
      updatedAt: new Date()
    });
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'groupChats', id));
  }
};

// Group Chat Message Services
export const groupMessageService = {
  async sendMessage(messageData: Omit<GroupChatMessage, 'id' | 'timestamp'>) {
    const docRef = await addDoc(collection(db, 'groupMessages'), removeUndefinedFields({
      ...messageData,
      timestamp: new Date()
    }));
    return docRef.id;
  },

  async getGroupMessages(groupId: string) {
    const q = query(
      collection(db, 'groupMessages'),
      where('groupId', '==', groupId),
      orderBy('timestamp', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as GroupChatMessage[];
  }
};

// Course Schedule Services
export const scheduleService = {
  async create(scheduleData: Omit<CourseSchedule, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'courseSchedules'), removeUndefinedFields({
      ...scheduleData,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    return docRef.id;
  },

  async getAll() {
    const querySnapshot = await getDocs(collection(db, 'courseSchedules'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CourseSchedule[];
  },

  async getByCourse(courseId: string) {
    const q = query(
      collection(db, 'courseSchedules'),
      where('courseId', '==', courseId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CourseSchedule[];
  },

  async getByDateRange(startDate: Date, endDate: Date) {
    const q = query(
      collection(db, 'courseSchedules'),
      where('startTime', '>=', startDate),
      where('startTime', '<=', endDate)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CourseSchedule[];
  },

  async update(id: string, data: Partial<CourseSchedule>) {
    await updateDoc(doc(db, 'courseSchedules', id), removeUndefinedFields({
      ...data,
      updatedAt: new Date()
    }));
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'courseSchedules', id));
  }
};

// Dance Category Services
export const danceCategoryService = {
  async create(categoryData: { name: string; description?: string; createdBy: string }) {
    const docRef = await addDoc(collection(db, 'danceCategories'), removeUndefinedFields({
      ...categoryData,
      createdAt: new Date()
    }));
    return docRef.id;
  },

  async getAll() {
    const querySnapshot = await getDocs(collection(db, 'danceCategories'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'danceCategories', id));
  }
};

// Admin Settings Services
export const adminSettingsService = {
  async get(key: string) {
    const docSnap = await getDoc(doc(db, 'admin_settings', key));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  },

  async set(key: string, data: any) {
    const docRef = doc(db, 'admin_settings', key);
    await updateDoc(docRef, {
      ...removeUndefinedFields(data),
      updatedAt: Timestamp.now()
    });
  },

  async create(key: string, data: any) {
    const docRef = doc(db, 'admin_settings', key);
    await addDoc(collection(db, 'admin_settings'), {
      id: key,
      ...removeUndefinedFields(data),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  },

  async getBoostPricing() {
    const docSnap = await getDoc(doc(db, 'admin_settings', 'boost_pricing'));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  },

  async getBackgroundSettings(): Promise<BackgroundSettings | null> {
    const docSnap = await getDoc(doc(db, 'admin_settings', 'background'));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as BackgroundSettings;
    }
    return null;
  }
};

// Subscription Plan Services
export const subscriptionPlanService = {
  async getAll() {
    const querySnapshot = await getDocs(
      query(collection(db, 'subscription_plans'), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SubscriptionPlan[];
  },

  async getActive() {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'subscription_plans'), 
        where('isActive', '==', true),
        orderBy('price', 'asc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SubscriptionPlan[];
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'subscription_plans', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as SubscriptionPlan;
    }
    return null;
  },

  async create(data: Omit<SubscriptionPlan, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'subscription_plans'), {
      ...removeUndefinedFields(data),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  },

  async update(id: string, data: Partial<SubscriptionPlan>) {
    await updateDoc(doc(db, 'subscription_plans', id), {
      ...removeUndefinedFields(data),
      updatedAt: Timestamp.now()
    });
  },

  async delete(id: string) {
    await deleteDoc(doc(db, 'subscription_plans', id));
  }
};

// User Subscription Services
export const userSubscriptionService = {
  async getByUserId(userId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'user_subscriptions'), 
        where('userId', '==', userId),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserSubscription[];
  },

  async getActiveByUserId(userId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'user_subscriptions'), 
        where('userId', '==', userId),
        where('status', '==', 'active'),
        limit(1)
      )
    );
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as UserSubscription;
    }
    return null;
  },

  async getById(id: string) {
    const docSnap = await getDoc(doc(db, 'user_subscriptions', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as UserSubscription;
    }
    return null;
  },

  async create(data: Omit<UserSubscription, 'id' | 'createdAt' | 'updatedAt'>) {
    const docRef = await addDoc(collection(db, 'user_subscriptions'), {
      ...removeUndefinedFields(data),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  },

  async update(id: string, data: Partial<UserSubscription>) {
    await updateDoc(doc(db, 'user_subscriptions', id), {
      ...removeUndefinedFields(data),
      updatedAt: Timestamp.now()
    });
  },

  async deductSession(subscriptionId: string) {
    const subscription = await this.getById(subscriptionId);
    if (subscription && subscription.remainingSessions && subscription.remainingSessions > 0) {
      await this.update(subscriptionId, {
        remainingSessions: subscription.remainingSessions - 1
      });
      return true;
    }
    return false;
  },

  async addSession(subscriptionId: string) {
    const subscription = await this.getById(subscriptionId);
    if (subscription && subscription.planType === 'session_pack') {
      const currentSessions = subscription.remainingSessions || 0;
      await this.update(subscriptionId, {
        remainingSessions: currentSessions + 1
      });
      return true;
    }
    return false;
  },

  async getAll() {
    const querySnapshot = await getDocs(
      query(collection(db, 'user_subscriptions'), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserSubscription[];
  }
};

// Session Usage Services
export const sessionUsageService = {
  async getByUserId(userId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'session_usage'), 
        where('userId', '==', userId),
        orderBy('sessionDate', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SessionUsage[];
  },

  async getBySubscriptionId(subscriptionId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'session_usage'), 
        where('subscriptionId', '==', subscriptionId),
        orderBy('sessionDate', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SessionUsage[];
  },

  async getByCoach(coachId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'session_usage'), 
        where('coachId', '==', coachId),
        orderBy('sessionDate', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SessionUsage[];
  },

  async getByUserAndCoach(userId: string, coachId: string) {
    const querySnapshot = await getDocs(
      query(
        collection(db, 'session_usage'), 
        where('userId', '==', userId),
        where('coachId', '==', coachId),
        orderBy('sessionDate', 'desc')
      )
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SessionUsage[];
  },

  async create(data: Omit<SessionUsage, 'id' | 'createdAt'>) {
    const docRef = await addDoc(collection(db, 'session_usage'), {
      ...removeUndefinedFields(data),
      createdAt: Timestamp.now()
    });
    return docRef.id;
  },

  async update(id: string, data: Partial<SessionUsage>) {
    await updateDoc(doc(db, 'session_usage', id), data);
  },

  async getAll() {
    const querySnapshot = await getDocs(
      query(collection(db, 'session_usage'), orderBy('sessionDate', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SessionUsage[];
  }
};

// Subscription Settings Services
export const subscriptionSettingsService = {
  async get() {
    const docSnap = await getDoc(doc(db, 'admin_settings', 'subscription_settings'));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as SubscriptionSettings;
    }
    return null;
  },

  async set(data: Omit<SubscriptionSettings, 'id'>) {
    const docRef = doc(db, 'admin_settings', 'subscription_settings');
    await updateDoc(docRef, {
      ...removeUndefinedFields(data),
      lastUpdatedAt: Timestamp.now()
    });
  },

  async create(data: Omit<SubscriptionSettings, 'id'>) {
    const docRef = doc(db, 'admin_settings', 'subscription_settings');
    await addDoc(collection(db, 'admin_settings'), {
      id: 'subscription_settings',
      ...removeUndefinedFields(data),
      lastUpdatedAt: Timestamp.now()
    });
  }
};


// Helper function to update course rating
async function updateCourseRating(courseId: string) {
  const reviews = await reviewService.getByCourse(courseId);
  if (reviews.length > 0) {
    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    await courseService.update(courseId, {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: reviews.length
    });
  }
}