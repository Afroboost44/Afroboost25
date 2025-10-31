import React from 'react';

import { FAQItem } from '@/types';
import { faqService } from './database';

export const defaultFAQs: Omit<FAQItem, 'id'>[] = [
  // General Questions
  {
    question: "What is Afroboosteur?",
    answer: "Afroboosteur is a dance learning platform where you can book classes with professional dance coaches, learn various dance styles, and connect with a community of dancers.",
    keywords: ["what", "afroboosteur", "platform", "about", "qu'est-ce que", "was ist"],
    category: "general"
  },
  {
    question: "How do I create an account?",
    answer: "Click on the Sign Up button, fill in your details including name, email, and password, then verify your email address to get started.",
    keywords: ["create", "account", "sign up", "register", "créer", "compte", "erstellen", "konto"],
    category: "account"
  },
  {
    question: "Is registration free?",
    answer: "Yes, creating an account on Afroboosteur is completely free. You only pay when you book and attend classes.",
    keywords: ["free", "registration", "cost", "price", "gratuit", "kostenlos"],
    category: "account"
  },

  // Booking Questions
  {
    question: "How do I book a dance class?",
    answer: "Browse available courses, select the one you like, choose a time slot, and proceed to payment. You will receive a confirmation once your booking is complete.",
    keywords: ["book", "booking", "class", "reserve", "réserver", "cours", "buchen", "kurs"],
    category: "booking"
  },
  {
    question: "Can I cancel my booking?",
    answer: "Yes, you can cancel your booking up to 24 hours before the class starts for a full refund. After that, cancellations are subject to our cancellation policy.",
    keywords: ["cancel", "cancellation", "refund", "policy", "annuler", "remboursement", "stornieren", "rückerstattung"],
    category: "booking"
  },
  {
    question: "What happens if I miss a class?",
    answer: "If you miss a class without proper cancellation, the payment will not be refunded. However, some coaches may offer makeup sessions.",
    keywords: ["miss", "absent", "no show", "makeup", "rater", "manquer", "verpassen"],
    category: "booking"
  },
  {
    question: "Can I reschedule my class?",
    answer: "You can reschedule your class up to 12 hours before the start time, subject to availability of new time slots.",
    keywords: ["reschedule", "change", "time", "date", "reprogrammer", "changer", "umplanen", "ändern"],
    category: "booking"
  },

  // Payment Questions
  {
    question: "What payment methods do you accept?",
    answer: "We accept credit cards, debit cards, and you can also use your account credits to pay for classes.",
    keywords: ["payment", "methods", "credit card", "debit", "paiement", "méthodes", "carte", "zahlung", "methoden", "karte"],
    category: "payment"
  },
  {
    question: "How do I add credits to my account?",
    answer: "Go to your profile, click on Top Up Credits, enter your payment details and the amount you want to add.",
    keywords: ["credits", "topup", "add money", "balance", "crédits", "ajouter", "argent", "kredite", "aufladen", "geld"],
    category: "payment"
  },
  {
    question: "Are there any refunds?",
    answer: "Refunds are available for cancellations made 24 hours before the class. Credits added to your account are non-refundable but never expire.",
    keywords: ["refund", "money back", "return", "remboursement", "rückerstattung"],
    category: "payment"
  },
  {
    question: "Is my payment information secure?",
    answer: "Yes, all payment information is encrypted and processed securely. We never store your complete card details.",
    keywords: ["secure", "safety", "encryption", "card details", "sécurisé", "sécurité", "sicher", "sicherheit"],
    category: "payment"
  },

  // Classes and Coaches
  {
    question: "What types of dance classes are available?",
    answer: "We offer various dance styles including Afrobeat, Hip-Hop, Contemporary, Salsa, Bachata, Kizomba, and many more.",
    keywords: ["types", "styles", "classes", "dance", "afrobeat", "hip hop", "types", "styles", "cours", "danse", "arten", "stile", "tanz"],
    category: "classes"
  },
  {
    question: "How do I choose the right class level?",
    answer: "Classes are marked as Beginner, Intermediate, or Advanced. Choose based on your experience level. Beginners should start with beginner classes.",
    keywords: ["level", "beginner", "intermediate", "advanced", "difficulty", "niveau", "débutant", "intermédiaire", "avancé", "level", "anfänger", "fortgeschritten"],
    category: "classes"
  },
  {
    question: "Can I try a class before committing?",
    answer: "Many coaches offer trial sessions at discounted rates. Look for classes marked with Trial Available or contact the coach directly.",
    keywords: ["trial", "try", "preview", "sample", "essai", "essayer", "aperçu", "probe", "versuchen"],
    category: "classes"
  },
  {
    question: "How do I become a coach?",
    answer: "Click on Apply as Coach in your profile. You will need to provide credentials, experience details, and go through our verification process.",
    keywords: ["coach", "instructor", "teach", "become", "professeur", "enseigner", "devenir", "lehrer", "unterrichten", "werden"],
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
    answer: "Contact our support team immediately. We will help resolve issues and may offer makeup sessions if the problem is on our end.",
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
    answer: "After completing a class, you will receive a prompt to leave a review. You can also go to your booking history and review completed classes.",
    keywords: ["review", "rating", "feedback", "rate"],
    category: "community"
  },
  {
    question: "Can I invite friends?",
    answer: "Yes! Use your referral code to invite friends. You will both get $5 credits when they complete their first class.",
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
    answer: "Go to your profile settings, click on Security, then Change Password. You will need to enter your current password.",
    keywords: ["password", "change", "security", "reset"],
    category: "account"
  },
  {
    question: "How do I update my profile?",
    answer: "Go to your profile page, click Edit Profile, make your changes, and save. You can update your photo, contact info, and preferences.",
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
    answer: "In your profile settings, go to Notifications where you can choose how you want to be notified about bookings, messages, and updates.",
    keywords: ["notifications", "preferences", "settings", "alerts"],
    category: "account"
  },

  // Troubleshooting
  {
    question: "I forgot my password, what should I do?",
    answer: "Click Forgot Password on the login page, enter your email, and you will receive a password reset link.",
    keywords: ["forgot", "password", "reset", "email"],
    category: "troubleshooting"
  },
  {
    question: "Why can I not see any classes?",
    answer: "Make sure you are logged in and have a good internet connection. Try refreshing the page or clearing your browser cache.",
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
    question: "I am not receiving email notifications",
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
    answer: "We have a fair dispute resolution process. Contact support with any issues, and we will work to resolve them quickly and fairly.",
    keywords: ["disputes", "problems", "resolution", "complaints"],
    category: "policy"
  }
];

// Enhanced Chatbot with database integration and i18n support
export class ChatBot {
  private faqs: FAQItem[];
  private t: (key: string) => string;

  constructor(faqs: FAQItem[], translateFn: (key: string) => string) {
    this.faqs = faqs;
    this.t = translateFn;
  }

  // Load FAQs from database
  static async create(translateFn: (key: string) => string): Promise<ChatBot> {
    try {
      const faqs = await faqService.getAll();
      return new ChatBot(faqs.length > 0 ? faqs : defaultFAQs.map((faq, index) => ({ ...faq, id: index.toString() })), translateFn);
    } catch (error) {
      console.error('Error loading FAQs from database:', error);
      return new ChatBot(defaultFAQs.map((faq, index) => ({ ...faq, id: index.toString() })), translateFn);
    }
  }

  // Get translated FAQ item - with fallback to original if translation doesn't exist
  private getTranslatedFAQ(faq: FAQItem): FAQItem {
    
    const formatForTranslation = (text: string) => text.replace(/ /g, '_');
    const translatedQuestion = this.t(formatForTranslation(faq.question));
    const translatedAnswer = this.t(formatForTranslation(faq.answer));
   
    
      // In browser environment, you can use alert
      // window.alert(`Question: ${translatedQuestion}\nAnswer: ${translatedAnswer}`);
    
    // If translation returns the same as input (meaning no translation found), 
    // return original FAQ
    return {
      ...faq,
      question: translatedQuestion !== faq.question ? translatedQuestion : faq.question,
      answer: translatedAnswer !== faq.answer ? translatedAnswer : faq.answer
    };
  }

  findAnswer(question: string): FAQItem[] {
    const lowercaseQuestion = question.toLowerCase();
    const words = lowercaseQuestion.split(' ').filter(word => word.length > 2);
    
    // Check for token-related questions first
    if (lowercaseQuestion.includes('token') || lowercaseQuestion.includes('credit')) {
      const tokenResponse = this.handleTokenQuestion(question);
      return [{
        id: 'token_response',
        question: question,
        answer: tokenResponse,
        keywords: ['token', 'credit', 'credits', 'tokens'],
        category: 'token'
      }];
    }

    // Check for WhatsApp contact requests
    if (lowercaseQuestion.includes('whatsapp') || lowercaseQuestion.includes('contact')) {
      const whatsappInfo = this.getWhatsAppContact();
      return [{
        id: 'whatsapp_contact',
        question: question,
        answer: whatsappInfo.message,
        keywords: ['whatsapp', 'contact', 'phone', 'support'],
        category: 'contact'
      }];
    }
    
    const scoredFAQs = this.faqs.map(faq => {
      const translatedFAQ = this.getTranslatedFAQ(faq);
      let score = 0;
      
      // Exact question match gets highest score (check both original and translated)
      if (translatedFAQ.question.toLowerCase() === lowercaseQuestion || 
          faq.question.toLowerCase() === lowercaseQuestion) {
        score += 20;
      }
      
      // Partial question match (check both original and translated)
      if (translatedFAQ.question.toLowerCase().includes(lowercaseQuestion) ||
          faq.question.toLowerCase().includes(lowercaseQuestion) ||
          lowercaseQuestion.includes(translatedFAQ.question.toLowerCase()) ||
          lowercaseQuestion.includes(faq.question.toLowerCase())) {
        score += 15;
      }
      
      // Enhanced multilingual category detection
      const categoryKeywords = {
        'booking': {
          'en': ['book', 'booking', 'reserve', 'schedule', 'class', 'appointment'],
          'fr': ['réserver', 'réservation', 'cours', 'rendez-vous', 'classe'],
          'de': ['buchen', 'buchung', 'kurs', 'termin', 'klasse', 'reservieren']
        },
        'payment': {
          'en': ['pay', 'payment', 'money', 'cost', 'price', 'credit', 'card'],
          'fr': ['payer', 'paiement', 'argent', 'coût', 'prix', 'crédit', 'carte'],
          'de': ['zahlen', 'zahlung', 'geld', 'kosten', 'preis', 'kredit', 'karte']
        },
        'classes': {
          'en': ['dance', 'class', 'lesson', 'course', 'style', 'level'],
          'fr': ['danse', 'cours', 'leçon', 'style', 'niveau'],
          'de': ['tanz', 'kurs', 'unterricht', 'stil', 'level']
        },
        'coaching': {
          'en': ['coach', 'teacher', 'instructor', 'teach', 'become'],
          'fr': ['coach', 'professeur', 'instructeur', 'enseigner', 'devenir'],
          'de': ['coach', 'lehrer', 'trainer', 'unterrichten', 'werden']
        },
        'account': {
          'en': ['account', 'profile', 'user', 'settings', 'password'],
          'fr': ['compte', 'profil', 'utilisateur', 'paramètres', 'mot de passe'],
          'de': ['konto', 'profil', 'benutzer', 'einstellungen', 'passwort']
        },
        'referral': {
          'en': ['refer', 'referral', 'invite', 'friend', 'bonus'],
          'fr': ['parrainage', 'inviter', 'ami', 'bonus', 'référer'],
          'de': ['empfehlung', 'einladen', 'freund', 'bonus', 'weiterempfehlen']
        },
        'troubleshooting': {
          'en': ['problem', 'issue', 'trouble', 'error', 'help', 'support'],
          'fr': ['problème', 'difficulté', 'erreur', 'aide', 'support'],
          'de': ['problem', 'schwierigkeiten', 'fehler', 'hilfe', 'support']
        }
      };
      
      // Check category-specific keywords for all languages
      const categoryData = categoryKeywords[faq.category as keyof typeof categoryKeywords];
      if (categoryData) {
        Object.values(categoryData).flat().forEach(keyword => {
          if (lowercaseQuestion.includes(keyword.toLowerCase())) {
            score += 8;
          }
        });
      }
      
      // Check keywords with weighted scoring (original English keywords)
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
      
      // Check individual words in both original and translated question/answer
      words.forEach(word => {
        // Check in translated content
        if (translatedFAQ.question.toLowerCase().includes(word)) {
          score += 4;
        }
        if (translatedFAQ.answer.toLowerCase().includes(word)) {
          score += 3;
        }
        // Check in original content (for fallback)
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

      // Enhanced multilingual fuzzy matching
      const multilingualVariations: { [key: string]: string[] } = {
        // Booking related
        'book': ['booking', 'réserver', 'réservation', 'buchen', 'buchung'],
        'class': ['cours', 'kurs', 'lesson', 'leçon', 'unterricht'],
        'schedule': ['horaire', 'zeitplan', 'rendez-vous', 'termin'],
        
        // Payment related  
        'pay': ['payment', 'payer', 'paiement', 'zahlen', 'zahlung'],
        'money': ['argent', 'geld', 'coût', 'kosten', 'prix', 'preis'],
        'credit': ['crédit', 'kredit', 'credits', 'crédits', 'kredite'],
        'card': ['carte', 'karte'],
        
        // Dance related
        'dance': ['danse', 'tanz', 'dancing', 'tanzen'],
        'move': ['mouvement', 'bewegung', 'mouvements', 'bewegungen'],
        'step': ['pas', 'schritt', 'steps', 'schritte'],
        
        // Account related
        'account': ['compte', 'konto'],
        'profile': ['profil'],
        'password': ['mot de passe', 'passwort'],
        'settings': ['paramètres', 'einstellungen'],
        
        // Common verbs
        'help': ['aide', 'hilfe', 'aider', 'helfen'],
        'change': ['changer', 'ändern', 'modifier'],
        'cancel': ['annuler', 'stornieren', 'annulation', 'stornierung'],
        
        // Question words
        'how': ['comment', 'wie'],
        'what': ['que', 'quoi', 'was'],
        'when': ['quand', 'wann'],
        'where': ['où', 'wo'],
        'why': ['pourquoi', 'warum'],
        'can': ['puis-je', 'peut-on', 'kann', 'können'],
        'do': ['faire', 'machen', 'tun']
      };

      // Apply multilingual fuzzy matching
      Object.entries(multilingualVariations).forEach(([baseWord, variations]) => {
        const allWords = [baseWord, ...variations];
        if (allWords.some(word => lowercaseQuestion.includes(word.toLowerCase()))) {
          // Check if this word appears in the FAQ content
          const faqContent = `${faq.question} ${faq.answer} ${translatedFAQ.question} ${translatedFAQ.answer}`.toLowerCase();
          if (allWords.some(word => faqContent.includes(word.toLowerCase()))) {
            score += 3;
          }
        }
      });
      
      return { ...translatedFAQ, score };
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
      'chatbotGreeting1',
      'chatbotGreeting2', 
      'chatbotGreeting3',
      'chatbotGreeting4'
    ];
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    return this.t(greeting);
  }

  getNoAnswerResponse(): string {
    const responses = [
      'chatbotNoAnswer1',
      'chatbotNoAnswer2',
      'chatbotNoAnswer3', 
      'chatbotNoAnswer4'
    ];
    const response = responses[Math.floor(Math.random() * responses.length)];
    return this.t(response);
  }

  getSuggestions(): string[] {
    const suggestions = [
      'How_to_book_a_class?',
      'What_payment_methods_do_you_accept?',
      'How_does_the_referral_system_work?',
      'How_do_I_add_credits_to_my_account?',
      'Can_I_cancel_my_booking?',
      'How_do_I_become_a_coach?',
      'What_types_of_dance_classes_are_available?',
      'Do_I_need_special_equipment_for_online_classes?',
      'How_do_I_leave_a_review?',
      'How_do_I_choose_the_right_class_level?',
      'Can_I_try_a_class_before_committing?',
      'How_do_I_update_my_profile?',
      'What_happens_if_I_miss_a_class?',
      'Is_my_payment_information_secure?',
      'How_do_I_change_my_password?'
    ];
    
    // Return 5 random suggestions translated
    const shuffled = suggestions.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 5).map(suggestion => this.t(suggestion));
  }

  // Get category-specific suggestions
  getCategorySuggestions(category: string): string[] {
    const categoryQuestions: { [key: string]: string[] } = {
      'booking': [
        this.t('How_do_I_book_a_dance_class?'),
        this.t('Can_I_cancel_my_booking?'),
        this.t('Can_I_reschedule_my_class?'),
        this.t('What_happens_if_I_miss_a_class?')
      ],
      'payment': [
        this.t('What_payment_methods_do_you_accept?'),
        this.t('How_do_I_add_credits_to_my_account?'),
        this.t('Is_my_payment_information_secure?'),
        this.t('Are_there_any_refunds?')
      ],
      'classes': [
        this.t('What_types_of_dance_classes_are_available?'),
        this.t('How_do_I_choose_the_right_class_level?'),
        this.t('Can_I_try_a_class_before_committing?'),
        this.t('Do_I_need_special_equipment_for_online_classes?')
      ],
      'coaching': [
        this.t('How_do_I_become_a_coach?'),
        this.t('What_qualifications_do_coaches_need?'),
        this.t('How_do_coaches_get_paid?'),
        this.t('Can_I_teach_online_classes?')
      ],
      'account': [
        this.t('How_do_I_update_my_profile?'),
        this.t('How_do_I_change_my_password?'),
        this.t('How_do_I_change_my_notification_preferences?'),
        this.t('Can_I_delete_my_account?')
      ],
      'referral': [
        this.t('How_does_the_referral_system_work?'),
        this.t('Can_I_invite_friends?'),
        this.t('How_much_referral_bonus_do_I_get?'),
        this.t('How_do_I_share_my_referral_code?')
      ],
      'community': [
        this.t('How_do_I_leave_a_review?'),
        this.t('Can_I_chat_with_other_students?'),
        this.t('How_do_I_join_the_community?'),
        this.t('What_community_features_are_available?')
      ],
      'technical': [
        this.t('Do_I_need_special_equipment_for_online_classes?'),
        this.t('Can_I_access_classes_on_mobile?'),
        this.t('What_if_I_have_technical_issues_during_a_class?'),
        this.t('What_are_the_system_requirements?')
      ],
      'troubleshooting': [
        this.t('I_forgot_my_password,_what_should_I_do?'),
        this.t('Why_can_I_not_see_any_classes?'),
        this.t('My_payment_failed,_what_should_I_do?'),
        this.t('I_am_not_receiving_email_notifications')
      ],
      'policy': [
        this.t('What_is_your_privacy_policy?'),
        this.t('How_do_you_handle_disputes?'),
        this.t('How_is_my_data_protected?')
      ]
    };
    
    return categoryQuestions[category] || [
      this.t('How_do_I_book_a_dance_class?'),
      this.t('What_payment_methods_do_you_accept?'),
      this.t('How_does_the_referral_system_work?'),
      this.t('How_do_I_add_credits_to_my_account?'),
      this.t('Can_I_cancel_my_booking?')
    ];
  }

  // Get help text for chatbot
  getHelpText(): string {
    return this.t('Ask_me_anything_about_Afroboosteur!_I_can_help with booking classes,_payments,_account_settings,_and_more.');
  }

  // Get contact support message with WhatsApp
  getContactSupportMessage(): string {
    const supportEmail = 'support@afroboosteur.com';
    const whatsappNumber = '+41765203363';
    const whatsappLink = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`;
    
    return `${this.t('contactSupportMessage')} ${supportEmail}. ${this.t('whatsappContactAvailable')} ${whatsappNumber}`;
  }

  // Get WhatsApp contact info
  getWhatsAppContact(): { number: string; link: string; message: string } {
    const whatsappNumber = '+41765203363';
    const whatsappLink = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}`;
    
    return {
      number: whatsappNumber,
      link: whatsappLink,
      message: `${this.t('whatsappContactMessage')} ${whatsappNumber}`
    };
  }

  // Get token system information
  getTokenSystemInfo(): string {
    return this.t('tokenSystemInfo');
  }

  // Handle token-related questions
  handleTokenQuestion(question: string): string {
    const lowercaseQuestion = question.toLowerCase();
    
    if (lowercaseQuestion.includes('what are tokens') || lowercaseQuestion.includes('token system')) {
      return this.t('tokenSystemExplanation');
    }
    
    if (lowercaseQuestion.includes('buy tokens') || lowercaseQuestion.includes('purchase tokens')) {
      return this.t('buyTokensExplanation');
    }
    
    if (lowercaseQuestion.includes('use tokens') || lowercaseQuestion.includes('spend tokens')) {
      return this.t('useTokensExplanation');
    }
    
    if (lowercaseQuestion.includes('token balance') || lowercaseQuestion.includes('how many tokens')) {
      return this.t('checkTokenBalance');
    }
    
    return this.t('tokenGeneralHelp');
  }

  // Get typing indicator text
  getTypingIndicator(): string {
    return this.t('Typing...');
  }

  // Get error message
  getErrorMessage(): string {
    return this.t('Something_went_wrong._Please_try_again_later.');
  }

  // Check if question is greeting
  isGreeting(question: string): boolean {
    const greetingKeywords = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'];
    const lowercaseQuestion = question.toLowerCase();
    return greetingKeywords.some(keyword => lowercaseQuestion.includes(keyword));
  }

  // Check if question is goodbye
  isGoodbye(question: string): boolean {
    const goodbyeKeywords = ['bye', 'goodbye', 'see you', 'thanks', 'thank you'];
    const lowercaseQuestion = question.toLowerCase();
    return goodbyeKeywords.some(keyword => lowercaseQuestion.includes(keyword));
  }

  // Get goodbye message
  getGoodbyeMessage(): string {
    const goodbyes = [
      'Thank_you_for_using_Afroboosteur!_Have_a_great_day!',
      'See_you_later!_Happy_dancing!',
      'Goodbye!_Feel_free_to_come_back_anytime.',
      'Thanks_for_chatting!_Come_back_soon!'
    ];
    const goodbye = goodbyes[Math.floor(Math.random() * goodbyes.length)];
    return this.t(goodbye);
  }

  // Get quick actions
  getQuickActions(): Array<{ key: string; label: string }> {
    return [
      { key: 'book_class', label: this.t('Book_a_Class') },
      { key: 'payment_help', label: this.t('Payment_Help') },
      { key: 'token_info', label: this.t('Token_Information') },
      { key: 'whatsapp_contact', label: this.t('WhatsApp_Contact') },
      { key: 'become_coach', label: this.t('Become_a_Coach') },
      { key: 'referral_info', label: this.t('Referral_Info') },
      { key: 'contact_support', label: this.t('Contact_Support') }
    ];
  }

  // Handle quick action
  handleQuickAction(actionKey: string): string {
    const quickActionResponses: { [key: string]: string } = {
      'book_class': this.t('To_book_a_class,_browse_our_available_courses_and_select_the_one_you_like!'),
      'payment_help': this.t('We_accept_credit_cards,_debit_cards,_and_account_credits_for_payments.'),
      'token_info': this.getTokenSystemInfo(),
      'whatsapp_contact': this.getWhatsAppContact().message,
      'become_coach': this.t('Click_Apply_as_Coach_in_your_profile_to_start_the_application_process.'),
      'referral_info': this.t('Share_your_referral_code_with_friends_and_you_both_get_$5_credits!'),
      'contact_support': this.getContactSupportMessage()
    };
    
    return quickActionResponses[actionKey] || this.t('Invalid_action._Please_try_again.');
  }
}