import { faqService } from './database';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export async function createAdminUser() {
  try {
    console.log('Creating admin user...');
    
    // Check if admin already exists
    try {
      // Try to sign in with admin credentials to see if it exists
      await createUserWithEmailAndPassword(auth, 'admin@gmail.com', '12345678');
      
      // If we get here, the user was created successfully
      // Now add the user document with admin role
      const adminUser = auth.currentUser;
      
      if (adminUser) {
        await setDoc(doc(db, 'users', adminUser.uid), {
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@gmail.com',
          role: 'admin',
          credits: 100,
          referralCode: 'ADMIN',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        console.log('✅ Admin user created successfully!');
        return true;
      }
    } catch (error: any) {
      // If error code is 'auth/email-already-in-use', admin already exists
      if (error.code === 'auth/email-already-in-use') {
        console.log('Admin user already exists');
        return true;
      }
      throw error;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    return false;
  }
}

export const comprehensiveFAQs = [
  // Dance Related
  {
    question: "What is Afrobeats dance?",
    answer: "Afrobeats dance is a vibrant and energetic dance style that originated from West Africa, characterized by hip movements, footwork, and rhythmic body isolations. It's a fusion of traditional African dances with contemporary movements that celebrates African culture and music.",
    keywords: ["afrobeats", "dance", "style", "african", "movement", "hip", "footwork", "west africa", "traditional"],
    category: "dance"
  },
  {
    question: "What dance styles do you teach?",
    answer: "We offer various dance styles including Afrobeats, Hip-Hop, Contemporary, Salsa, Bachata, Kizomba, Jazz, Ballet, Breakdance, Latin, and fusion styles. Each style is taught by specialized and verified instructors with professional experience.",
    keywords: ["styles", "hip-hop", "contemporary", "salsa", "bachata", "kizomba", "jazz", "ballet", "breakdance", "latin", "fusion"],
    category: "dance"
  },
  {
    question: "Do you offer different difficulty levels?",
    answer: "Yes! We have three clear levels: Beginner (perfect for first-timers with no experience), Intermediate (for those with some dance background), and Advanced (for experienced dancers). Each class is clearly marked with its difficulty level.",
    keywords: ["levels", "difficulty", "beginner", "intermediate", "advanced", "experience", "first-timer"],
    category: "levels"
  },
  {
    question: "Can complete beginners join any class?",
    answer: "Absolutely! We warmly welcome complete beginners. Look for classes marked as 'Beginner' level. Our instructors are experienced in teaching newcomers and will guide you through each step with patience and encouragement.",
    keywords: ["beginner", "new", "start", "first", "newcomer", "complete beginner", "no experience"],
    category: "levels"
  },
  {
    question: "What should I wear to dance class?",
    answer: "Wear comfortable athletic clothing that allows freedom of movement (leggings, shorts, t-shirts). For footwear, choose comfortable sneakers with good grip. Avoid loose jewelry and bring a water bottle to stay hydrated.",
    keywords: ["wear", "clothing", "attire", "dress", "outfit", "shoes", "sneakers", "comfortable"],
    category: "preparation"
  },
  {
    question: "What should I bring to class?",
    answer: "Bring a water bottle to stay hydrated, a small towel for sweat, and wear appropriate dance attire. Some students also bring a yoga mat for floor work, but it's not always necessary. Most importantly, bring your enthusiasm!",
    keywords: ["bring", "water", "towel", "mat", "requirements", "needed", "essentials"],
    category: "preparation"
  },

  // Booking & Payment
  {
    question: "How do I book a class?",
    answer: "To book a class: 1) Browse available classes on the courses page, 2) Select your preferred class, 3) Click 'Book Now', 4) Complete payment using credits or card, 5) You'll receive a confirmation notification. It's that simple!",
    keywords: ["book", "booking", "class", "session", "schedule", "reserve", "how to book"],
    category: "booking"
  },
  {
    question: "How much do classes cost?",
    answer: "Class prices vary by type: Regular classes ($20-35), Workshops ($40-60), Kids classes ($15-25), and Fitness sessions ($20-35). Coaches set their own prices. You can pay with credits from your account balance or directly with a card.",
    keywords: ["cost", "price", "payment", "money", "fee", "credits", "expensive", "cheap", "rates"],
    category: "pricing"
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit/debit cards (Visa, MasterCard, American Express) and account credits. You can top up your credit balance anytime. We also have a referral system where you earn $5 for each friend who joins!",
    keywords: ["payment", "card", "credit", "debit", "visa", "mastercard", "credits", "topup", "referral"],
    category: "pricing"
  },
  {
    question: "How do I top up my credits?",
    answer: "Go to your dashboard and click on the Credit System section. You can choose from quick top-up amounts ($5, $10, $25, $50, $100) or enter a custom amount. Payment is processed securely via credit/debit card instantly.",
    keywords: ["topup", "credits", "balance", "add money", "recharge", "reload"],
    category: "pricing"
  },
  {
    question: "Can I cancel or reschedule a booking?",
    answer: "Yes, you can cancel bookings up to 24 hours before the class starts for a full refund. For rescheduling, please contact your coach directly through the community chat. Cancellation policies may vary by individual coach.",
    keywords: ["cancel", "reschedule", "change", "modify", "refund", "policy"],
    category: "booking"
  },
  {
    question: "What happens if I miss a class?",
    answer: "If you miss a class without proper cancellation (24+ hours notice), the payment generally won't be refunded. However, some coaches may offer makeup sessions. Check with your coach about their specific policy.",
    keywords: ["miss", "missed", "absent", "no show", "makeup", "late"],
    category: "booking"
  },

  // Platform Features
  {
    question: "How does the referral system work?",
    answer: "Share your unique referral code with friends. When they sign up using your code and complete their first class booking, you both get $5 in credits! You can share directly via WhatsApp from your dashboard.",
    keywords: ["referral", "invite", "friends", "share", "earn", "bonus", "whatsapp", "$5", "code"],
    category: "features"
  },
  {
    question: "What is the community chat feature?",
    answer: "Each course has its own community chat where students and coaches can interact, share experiences, ask questions, and build connections. It's a great way to stay engaged with your dance community and get tips from others!",
    keywords: ["chat", "community", "talk", "communicate", "students", "coach", "interact", "connect"],
    category: "features"
  },
  {
    question: "How do I leave a review for a class?",
    answer: "After completing a class, you can leave a review and 1-5 star rating in your dashboard under 'Session History'. Your honest feedback helps other students choose classes and helps coaches improve their teaching.",
    keywords: ["review", "rating", "feedback", "comment", "experience", "stars", "rate"],
    category: "features"
  },
  {
    question: "What are boosted courses?",
    answer: "Boosted courses are promoted classes that appear at the top of course listings and get more visibility. Coaches can boost their courses by paying a small fee for better reach. Look for the 'BOOSTED' label on course cards.",
    keywords: ["boost", "boosted", "featured", "promoted", "top", "visibility", "highlight"],
    category: "features"
  },
  {
    question: "How do notifications work?",
    answer: "You'll receive notifications for booking confirmations, class reminders (24h and 1h before), new messages in community chat, referral bonuses, payment confirmations, and important updates. You can manage preferences in your profile.",
    keywords: ["notifications", "alerts", "reminders", "messages", "updates", "settings"],
    category: "features"
  },

  // Account & Technical
  {
    question: "How do I create an account?",
    answer: "Click 'Sign Up' and fill in your details including first name, last name, email, and password. You can also enter a referral code if you have one. Students and coaches have different features once verified.",
    keywords: ["sign up", "register", "account", "create", "join", "new user"],
    category: "account"
  },
  {
    question: "I forgot my password, what should I do?",
    answer: "On the login page, click 'Forgot Password' and enter your email. You'll receive a password reset link within minutes. If you continue having issues, contact our support team for assistance.",
    keywords: ["password", "forgot", "reset", "login", "access", "recover"],
    category: "account"
  },
  {
    question: "How do I update my profile?",
    answer: "Go to your profile page from the dashboard menu. You can update your personal information, profile picture, contact details, and notification preferences. Don't forget to save your changes!",
    keywords: ["profile", "update", "edit", "change", "information", "picture", "details"],
    category: "account"
  },
  {
    question: "Can I change my email address?",
    answer: "Yes, you can change your email in profile settings. You'll need to verify the new email address. Your login credentials will be updated automatically to use the new email.",
    keywords: ["email", "change", "update", "verify", "login"],
    category: "account"
  },

  // Coaches & Teaching
  {
    question: "How do I become a coach?",
    answer: "Apply to become a coach through the 'Apply as Coach' option in your profile settings. Provide your dance credentials, experience, and teaching background. Our team reviews applications and contacts qualified candidates.",
    keywords: ["coach", "teacher", "instructor", "apply", "teach", "become", "application"],
    category: "coaching"
  },
  {
    question: "How do coaches create classes?",
    answer: "Verified coaches can create classes through their dashboard. Set the title, description, price, duration, max students, difficulty level, category, and upload attractive images. Classes appear in listings once published.",
    keywords: ["create", "add", "course", "class", "schedule", "coach", "setup", "publish"],
    category: "coaching"
  },
  {
    question: "Can coaches set their own prices?",
    answer: "Yes! Coaches have complete control over their class pricing. They can set different prices for different types of classes (regular, workshop, private) based on their experience and market demand.",
    keywords: ["price", "pricing", "cost", "set", "coach", "control", "fees"],
    category: "coaching"
  },
  {
    question: "How do coaches get paid?",
    answer: "Coaches receive payment for each booked class automatically. Payments are processed weekly and transferred to their registered bank account. We handle all payment processing securely.",
    keywords: ["payment", "paid", "money", "earnings", "transfer", "bank", "coach"],
    category: "coaching"
  },
  {
    question: "Can I book private lessons?",
    answer: "Many coaches offer private lessons! Contact coaches directly through the community chat or their profile to inquire about private lesson availability, pricing, and scheduling. Rates vary by coach.",
    keywords: ["private", "one-on-one", "personal", "individual", "lesson", "coaching"],
    category: "booking"
  },

  // General Info & Support
  {
    question: "What age groups can participate?",
    answer: "We welcome all ages! We have specific Kids classes for children (7-14 years), teen programs (13-17), and adult classes (18+). Age recommendations and requirements are clearly mentioned in each class description.",
    keywords: ["age", "kids", "children", "teens", "adults", "young", "old", "family"],
    category: "general"
  },
  {
    question: "Do you offer group discounts?",
    answer: "Yes! Contact our support team for group bookings of 5 or more people. We offer special rates for corporate events, birthday parties, team building activities, and dance groups.",
    keywords: ["group", "discount", "bulk", "corporate", "party", "team", "special", "rates"],
    category: "pricing"
  },
  {
    question: "Is there a mobile app?",
    answer: "Currently, we operate through our web platform which is fully mobile-optimized and works perfectly on all devices. You can access all features through your mobile browser. A dedicated mobile app is in development!",
    keywords: ["mobile", "app", "phone", "android", "ios", "browser", "responsive"],
    category: "technical"
  },
  {
    question: "How can I contact support?",
    answer: "You can reach our support team through this chatbot for instant help, email us at support@afroboosteur.com, or use the contact form on our website. We typically respond within 24 hours during business days.",
    keywords: ["support", "help", "contact", "assistance", "problem", "customer service"],
    category: "support"
  },
  {
    question: "What if I have technical issues?",
    answer: "For technical problems like login issues, payment problems, booking errors, or website bugs, please contact our support team with details about the issue. Include your browser type and any error messages you see.",
    keywords: ["technical", "bug", "error", "problem", "website", "issue", "glitch", "broken"],
    category: "technical"
  },
  {
    question: "Do you offer gift cards?",
    answer: "While we don't currently offer traditional gift cards, you can purchase credits for someone else by contacting our support team. They can help you set up a credit transfer to another user's account.",
    keywords: ["gift", "card", "present", "credits", "someone else", "transfer"],
    category: "features"
  },
  {
    question: "Are classes held online or in-person?",
    answer: "We support both online and in-person classes! Coaches specify the format when creating classes. Online classes require a good internet connection and camera. In-person classes include location details.",
    keywords: ["online", "in-person", "location", "virtual", "physical", "where", "zoom"],
    category: "general"
  },
  {
    question: "What equipment do I need for online classes?",
    answer: "For online classes, you need: stable internet connection, device with camera and microphone (computer/tablet/phone), good lighting, and enough space to move around (6x6 feet minimum).",
    keywords: ["equipment", "online", "internet", "camera", "microphone", "space", "computer"],
    category: "technical"
  },
  {
    question: "Can I get a refund if I'm not satisfied?",
    answer: "We want you to be happy with your experience! If you're not satisfied with a class, please contact the coach first. If the issue isn't resolved, contact our support team for assistance with potential refunds or credits.",
    keywords: ["refund", "satisfied", "unhappy", "money back", "guarantee", "return"],
    category: "policy"
  },
  {
    question: "How do I know if a coach is qualified?",
    answer: "All coaches go through our verification process. They must provide dance credentials, teaching experience, and references. Verified coaches have a badge on their profile. You can also check reviews from other students.",
    keywords: ["qualified", "verification", "credentials", "experience", "verified", "badge", "quality"],
    category: "coaching"
  }
];

export const seedFAQs = async () => {
  try {
    console.log('Seeding FAQ database...');
    for (const faq of comprehensiveFAQs) {
      await faqService.create(faq);
    }
    console.log('FAQ seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding FAQs:', error);
  }
};
