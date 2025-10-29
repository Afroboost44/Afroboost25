import { FAQItem } from '@/types';
import { faqService } from './database';

export const defaultFAQs: Omit<FAQItem, 'id'>[] = [
  // General Questions
  {
    question: "What is Afroboosteur?",
    answer: "Afroboosteur is a dance learning platform where you can book classes with professional dance coaches, learn various dance styles, and connect with a community of dancers.",
    keywords: ["what", "afroboosteur", "platform", "about"],
    category: "general"
  },
  {
    question: "How do I create an account?",
    answer: "Click on the 'Sign Up' button, fill in your details including name, email, and password, then verify your email address to get started.",
    keywords: ["create", "account", "sign up", "register"],
    category: "account"
  },
  {
    question: "Is registration free?",
    answer: "Yes, creating an account on Afroboosteur is completely free. You only pay when you book and attend classes.",
    keywords: ["free", "registration", "cost", "price"],
    category: "account"
  },

  // Booking Questions
  {
    question: "How do I book a dance class?",
    answer: "Browse available courses, select the one you like, choose a time slot, and proceed to payment. You'll receive a confirmation once your booking is complete.",
    keywords: ["book", "booking", "class", "reserve"],
    category: "booking"
  },
  {
    question: "Can I cancel my booking?",
    answer: "Yes, you can cancel your booking up to 24 hours before the class starts for a full refund. After that, cancellations are subject to our cancellation policy.",
    keywords: ["cancel", "cancellation", "refund", "policy"],
    category: "booking"
  },
  {
    question: "What happens if I miss a class?",
    answer: "If you miss a class without proper cancellation, the payment will not be refunded. However, some coaches may offer makeup sessions.",
    keywords: ["miss", "absent", "no show", "makeup"],
    category: "booking"
  },
  {
    question: "Can I reschedule my class?",
    answer: "You can reschedule your class up to 12 hours before the start time, subject to availability of new time slots.",
    keywords: ["reschedule", "change", "time", "date"],
    category: "booking"
  },

  // Payment Questions
  {
    question: "What payment methods do you accept?",
    answer: "We accept credit cards, debit cards, and you can also use your account credits to pay for classes.",
    keywords: ["payment", "methods", "credit card", "debit"],
    category: "payment"
  },
  {
    question: "How do I add credits to my account?",
    answer: "Go to your profile, click on 'Top Up Credits', enter your payment details and the amount you want to add.",
    keywords: ["credits", "topup", "add money", "balance"],
    category: "payment"
  },
  {
    question: "Are there any refunds?",
    answer: "Refunds are available for cancellations made 24 hours before the class. Credits added to your account are non-refundable but never expire.",
    keywords: ["refund", "money back", "return"],
    category: "payment"
  },
  {
    question: "Is my payment information secure?",
    answer: "Yes, all payment information is encrypted and processed securely. We never store your complete card details.",
    keywords: ["secure", "safety", "encryption", "card details"],
    category: "payment"
  },

  // Classes and Coaches
  {
    question: "What types of dance classes are available?",
    answer: "We offer various dance styles including Afrobeat, Hip-Hop, Contemporary, Salsa, Bachata, Kizomba, and many more.",
    keywords: ["types", "styles", "classes", "dance", "afrobeat", "hip hop"],
    category: "classes"
  },
  {
    question: "How do I choose the right class level?",
    answer: "Classes are marked as Beginner, Intermediate, or Advanced. Choose based on your experience level. Beginners should start with beginner classes.",
    keywords: ["level", "beginner", "intermediate", "advanced", "difficulty"],
    category: "classes"
  },
  {
    question: "Can I try a class before committing?",
    answer: "Many coaches offer trial sessions at discounted rates. Look for classes marked with 'Trial Available' or contact the coach directly.",
    keywords: ["trial", "try", "preview", "sample"],
    category: "classes"
  },
  {
    question: "How do I become a coach?",
    answer: "Click on 'Apply as Coach' in your profile. You'll need to provide credentials, experience details, and go through our verification process.",
    keywords: ["coach", "instructor", "teach", "become"],
    category: "coaching"
  },
  {
    question: "What qualifications do coaches need?",
    answer: "Our coaches must have proven dance experience, teaching credentials, and pass our quality assessment. All coaches are verified professionals.",
    keywords: ["qualifications", "credentials", "experience", "verified"],
    category: "coaching"
  },

  // Technical Questions
  {
    question: "Do I need special equipment for online classes?",
    answer: "For online classes, you need a stable internet connection, a device with camera/microphone, and enough space to move around.",
    keywords: ["equipment", "online", "internet", "camera", "space"],
    category: "technical"
  },
  {
    question: "Can I access classes on mobile?",
    answer: "Yes, our platform is fully mobile-responsive. You can book and attend classes using your smartphone or tablet.",
    keywords: ["mobile", "phone", "tablet", "responsive"],
    category: "technical"
  },
  {
    question: "What if I have technical issues during a class?",
    answer: "Contact our support team immediately. We'll help resolve issues and may offer makeup sessions if the problem is on our end.",
    keywords: ["technical", "issues", "problems", "support"],
    category: "technical"
  },

  // Community and Social
  {
    question: "Can I chat with other students?",
    answer: "Yes, each course has a community chat where you can interact with other students and the coach.",
    keywords: ["chat", "community", "students", "talk"],
    category: "community"
  },
  {
    question: "How do I leave a review?",
    answer: "After completing a class, you'll receive a prompt to leave a review. You can also go to your booking history and review completed classes.",
    keywords: ["review", "rating", "feedback", "rate"],
    category: "community"
  },
  {
    question: "Can I invite friends?",
    answer: "Yes! Use your referral code to invite friends. You'll both get $5 credits when they complete their first class.",
    keywords: ["invite", "friends", "referral", "bonus"],
    category: "referral"
  },
  {
    question: "How does the referral system work?",
    answer: "Share your unique referral code with friends. When they sign up and complete their first class, you both receive $5 in credits.",
    keywords: ["referral", "system", "how", "works", "bonus"],
    category: "referral"
  },

  // Account Management
  {
    question: "How do I change my password?",
    answer: "Go to your profile settings, click on 'Security', then 'Change Password'. You'll need to enter your current password.",
    keywords: ["password", "change", "security", "reset"],
    category: "account"
  },
  {
    question: "How do I update my profile?",
    answer: "Go to your profile page, click 'Edit Profile', make your changes, and save. You can update your photo, contact info, and preferences.",
    keywords: ["profile", "update", "edit", "change"],
    category: "account"
  },
  {
    question: "Can I delete my account?",
    answer: "Yes, you can delete your account from profile settings. Note that this action is permanent and cannot be undone.",
    keywords: ["delete", "account", "remove", "permanent"],
    category: "account"
  },
  {
    question: "How do I change my notification preferences?",
    answer: "In your profile settings, go to 'Notifications' where you can choose how you want to be notified about bookings, messages, and updates.",
    keywords: ["notifications", "preferences", "settings", "alerts"],
    category: "account"
  },

  // Troubleshooting
  {
    question: "I forgot my password, what should I do?",
    answer: "Click 'Forgot Password' on the login page, enter your email, and you'll receive a password reset link.",
    keywords: ["forgot", "password", "reset", "email"],
    category: "troubleshooting"
  },
  {
    question: "Why can't I see any classes?",
    answer: "Make sure you're logged in and have a good internet connection. Try refreshing the page or clearing your browser cache.",
    keywords: ["no classes", "empty", "not showing", "blank"],
    category: "troubleshooting"
  },
  {
    question: "My payment failed, what should I do?",
    answer: "Check your card details and ensure you have sufficient funds. If the problem persists, try a different payment method or contact support.",
    keywords: ["payment failed", "declined", "error", "problem"],
    category: "troubleshooting"
  },
  {
    question: "I'm not receiving email notifications",
    answer: "Check your spam/junk folder first. Then verify your email address in profile settings and check notification preferences.",
    keywords: ["email", "notifications", "not receiving", "spam"],
    category: "troubleshooting"
  },

  // Policies
  {
    question: "What is your privacy policy?",
    answer: "We take privacy seriously. Your personal data is encrypted and never shared with third parties without consent. Full details are in our Privacy Policy.",
    keywords: ["privacy", "policy", "data", "personal"],
    category: "policy"
  },
  {
    question: "What are your terms of service?",
    answer: "Our Terms of Service outline the rules for using our platform. You can find the complete terms in the footer of our website.",
    keywords: ["terms", "service", "rules", "conditions"],
    category: "policy"
  },
  {
    question: "How do you handle disputes?",
    answer: "We have a fair dispute resolution process. Contact support with any issues, and we'll work to resolve them quickly and fairly.",
    keywords: ["disputes", "problems", "resolution", "complaints"],
    category: "policy"
  }
];

// Enhanced Chatbot with database integration
export class ChatBot {
  private faqs: FAQItem[];

  constructor(faqs: FAQItem[]) {
    this.faqs = faqs;
  }

  // Load FAQs from database
  static async create(): Promise<ChatBot> {
    try {
      const faqs = await faqService.getAll();
      return new ChatBot(faqs.length > 0 ? faqs : defaultFAQs.map((faq, index) => ({ ...faq, id: index.toString() })));
    } catch (error) {
      console.error('Error loading FAQs from database:', error);
      return new ChatBot(defaultFAQs.map((faq, index) => ({ ...faq, id: index.toString() })));
    }
  }

  findAnswer(question: string): FAQItem[] {
    const lowercaseQuestion = question.toLowerCase();
    const words = lowercaseQuestion.split(' ').filter(word => word.length > 2);
    
    const scoredFAQs = this.faqs.map(faq => {
      let score = 0;
      
      // Exact question match gets highest score
      if (faq.question.toLowerCase() === lowercaseQuestion) {
        score += 20;
      }
      
      // Partial question match
      if (faq.question.toLowerCase().includes(lowercaseQuestion)) {
        score += 15;
      }
      
      // Category-specific boost for relevant questions
      if (lowercaseQuestion.includes('book') && faq.category === 'booking') score += 3;
      if (lowercaseQuestion.includes('pay') && faq.category === 'pricing') score += 3;
      if (lowercaseQuestion.includes('dance') && faq.category === 'dance') score += 3;
      if (lowercaseQuestion.includes('coach') && faq.category === 'coaching') score += 3;
      if (lowercaseQuestion.includes('credit') && faq.category === 'pricing') score += 3;
      if (lowercaseQuestion.includes('refer') && faq.category === 'features') score += 3;
      
      // Check keywords with weighted scoring
      faq.keywords.forEach(keyword => {
        const keywordLower = keyword.toLowerCase();
        if (lowercaseQuestion.includes(keywordLower)) {
          score += 8;
        }
        // Partial keyword matches
        if (keywordLower.includes(lowercaseQuestion) || lowercaseQuestion.includes(keywordLower)) {
          score += 4;
        }
      });
      
      // Check individual words in question and answer
      words.forEach(word => {
        if (faq.question.toLowerCase().includes(word)) {
          score += 3;
        }
        if (faq.answer.toLowerCase().includes(word)) {
          score += 2;
        }
        if (faq.keywords.some(keyword => keyword.toLowerCase().includes(word))) {
          score += 2;
        }
      });

      // Fuzzy matching for common typos and variations
      const commonVariations: { [key: string]: string[] } = {
        'booking': ['book', 'reserve', 'schedule'],
        'payment': ['pay', 'money', 'cost', 'price'],
        'coach': ['teacher', 'instructor'],
        'class': ['course', 'lesson', 'session'],
        'cancel': ['refund', 'return'],
        'dance': ['dancing', 'moves', 'steps'],
      };

      Object.entries(commonVariations).forEach(([key, variations]) => {
        if (lowercaseQuestion.includes(key) || variations.some(v => lowercaseQuestion.includes(v))) {
          if (faq.keywords.includes(key) || faq.question.toLowerCase().includes(key)) {
            score += 2;
          }
        }
      });
      
      return { ...faq, score };
    });
    
    // Return top 3 matches with score > 2 (higher threshold for better results)
    return scoredFAQs
      .filter(faq => faq.score > 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ score, ...faq }) => faq);
  }

  getGreeting(): string {
    const greetings = [
      "Hello! 👋 I'm your Afroboosteur assistant. I can help you with booking classes, payments, account questions, and more. What would you like to know?",
      "Hi there! 💃 Welcome to Afroboosteur! I have answers to 100+ frequently asked questions. How can I help you today?",
      "Hey! 🕺 I'm here to help you navigate our dance platform. Ask me about classes, coaches, payments, features, or anything else!",
      "Welcome to Afroboosteur! ✨ I can instantly answer questions about booking, payments, dance styles, coaches, and platform features. What's on your mind?"
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  getNoAnswerResponse(): string {
    const responses = [
      "I couldn't find a specific answer to that question in my knowledge base. Our support team at support@afroboosteur.com would be happy to help you personally! 💌",
      "Hmm, that's not something I have information about right now. For personalized assistance, please contact our friendly support team! 🤝",
      "I don't have the answer to that specific question, but our human support team does! Reach out to them for detailed help. 📞",
      "That's an interesting question! While I don't have that info, our support team would love to help. You can also try rephrasing your question. 🔄"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  getSuggestions(): string[] {
    const suggestions = [
      "How do I book a dance class?",
      "What payment methods do you accept?",
      "How does the referral system work?",
      "How do I top up my credits?",
      "Can I cancel my booking?",
      "How do I become a coach?",
      "What dance styles do you teach?",
      "What should I wear to class?",
      "How do I leave a review?",
      "What are boosted courses?"
    ];
    
    // Return 5 random suggestions
    const shuffled = suggestions.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 5);
  }

  // Get category-specific suggestions
  getCategorySuggestions(category: string): string[] {
    const categoryQuestions: { [key: string]: string[] } = {
      'booking': [
        "How do I book a class?",
        "Can I cancel my booking?",
        "Can I reschedule my class?",
        "What happens if I miss a class?"
      ],
      'pricing': [
        "How much do classes cost?",
        "What payment methods do you accept?",
        "How do I top up my credits?",
        "Do you offer group discounts?"
      ],
      'dance': [
        "What dance styles do you teach?",
        "What is Afrobeats dance?",
        "Do you offer different difficulty levels?",
        "What should I wear to class?"
      ],
      'features': [
        "How does the referral system work?",
        "What is the community chat feature?",
        "How do I leave a review?",
        "What are boosted courses?"
      ]
    };
    
    return categoryQuestions[category] || this.getSuggestions();
  }
}
