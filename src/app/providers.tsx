'use client';

import { ReactNode, createContext, useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
export const translations = {
  en: {
    // Navbar
    home: 'Home',
    courses: 'Courses',
    dashboard: 'Dashboard',
    login: 'Login',
    signup: 'Sign Up',
    logout: 'Logout',
    profile: 'Profile',
    chat: 'Chat',
    
    // Auth
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    firstName: 'First Name',
    lastName: 'Last Name',
    phone: 'Phone (Optional)',
    forgotPassword: 'Forgot Password?',
    noAccount: 'Don\'t have an account?',
    haveAccount: 'Already have an account?',
    signIn: 'Sign In',
    signUp: 'Sign Up',
    
    // Dashboard
    myDashboard: 'My Dashboard',
    mySessions: 'My Sessions',
    sessionHistory: 'Session History',
    notifications: 'Notifications',
    communityChat: 'Community Chat',
    myProgress: 'My Progress',
    bookNewSession: 'Book a New Session',
    payRenew: 'Pay / Renew',
    purchased: 'Purchased',
    remaining: 'Remaining',
    noNotifications: 'No new notifications.',
    accessChat: 'Access Chat',
    messages: 'Messages',
    searchUsers: 'Search for users',
    
    // Courses
    courseSearch: 'Course Search',
    filter: 'Filter',
    type: 'Type',
    location: 'Location',
    day: 'Day',
    level: 'Level',
    keyword: 'Keyword',
    availableSpots: 'Available Spots',
    bookNow: 'Book Now',
    readyToJoin: 'Ready to Join the Movement?',
    bookSpot: 'Book your spot now and feel the Afroboost vibe!',
    
    // Referral
    referFriend: 'Refer a Friend',
    referralLink: 'Your Referral Link',
    shareVia: 'Share via',
    close: 'Close',
    referralsStats: 'Referrals Statistics',
    rewardsModel: 'Rewards Model',
    
    // Pricing
    chooseYourPlan: 'Our Afroboost Plans',
    selectPaymentMethod: 'Select Payment Method',
    twint: 'TWINT',
    creditCard: 'Credit Card',
    directDebit: 'Direct Debit',
    orderSummary: 'Order Summary',
    validateAndPay: 'Validate and Pay',
    downloadMandate: 'Download Mandate Form',
    
    // Coach
    courseManagement: 'Course Management',
    createCourse: 'Create Course',
    editCourse: 'Edit Course',
    deleteCourse: 'Delete Course',
    participantList: 'Participant List',
    
    // Admin
    userManagement: 'User Management',
    contentManagement: 'Content Management',
    adminDashboard: 'Admin Dashboard',
    translationManagement: 'Translation Management',
    activityLog: 'Activity Log',
    
    // Profile
    editProfile: 'Edit Profile',
    savePreferences: 'Save Preferences',
    pushNotifications: 'Push Notifications',
    enableTwoFactor: 'Enable Two-Factor Authentication',
    changePassword: 'Change Password',
    applyAsCoach: 'Apply as Coach',
    
    // Footer
    aboutUs: 'About Us',
    contactUs: 'Contact Us',
    termsConditions: 'Terms & Conditions',
    privacyPolicy: 'Privacy Policy',
    followUs: 'Follow Us',
    
    // Home Page
    heroTitle: "Your shot of <span>Afrobeat</span> energy",
    heroSubtitle: "Dance, sweat, smile! Join our vibrant community and discover the joy of Afrobeat dance.",
    bookClass: "Book a Class",
    joinUs: "Join Us",
    
    whyChoose: "Why Choose <span>Afroboosteur</span>",
    whyChooseSubtitle: "Experience the perfect blend of traditional African dance and modern fitness.",
    
    authenticRhythms: "Authentic Rhythms",
    authenticRhythmsDesc: "Experience the true essence of African beats and movements.",
    vibrantCommunity: "Vibrant Community",
    vibrantCommunityDesc: "Join a supportive group of dancers from all backgrounds and levels.",
    flexibleSchedule: "Flexible Schedule",
    flexibleScheduleDesc: "Choose from various class times that fit your busy lifestyle.",
    expertCoaches: "Expert Coaches",
    expertCoachesDesc: "Learn from passionate professionals with years of experience.",
    
    popularClasses: "Popular <span>Classes</span>",
    popularClassesSubtitle: "Find the perfect class for your level",
    viewAllClasses: "View All Classes",
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
    
    afrobeatBasics: "Afrobeat Basics",
    afrobeatBasicsDesc: "Perfect introduction to Afrobeat dance for absolute beginners.",
    intermediateChoreography: "Intermediate Choreography",
    intermediateChoreographyDesc: "Take your dance skills to the next level with complex routines.",
    advancedWorkshop: "Advanced Workshop",
    advancedWorkshopDesc: "Masterclass for experienced dancers looking to perfect their craft.",
    pricePerSession: "€{price} / session",
    
    
    testimonials: "What Our <span>Dancers Say</span>",
    testimonialsSubtitle: "Join hundreds of satisfied dancers who have found their rhythm with us.",
    student: "Student",
    months: "months",
    year: "year",
    sarahTestimonial: "\"Afroboosteur has completely transformed my confidence. The instructors are amazing and the community is so supportive!\"",
    davidTestimonial: "\"I never thought I could dance before joining Afroboosteur. Now I can't imagine my life without these classes. Best decision ever!\"",
    michelleTestimonial: "\"The energy in these classes is unmatched! I've tried many dance studios but Afroboosteur truly feels like home.\"",
    
    readyToFeel: "Ready to Feel the <span>Rhythm</span>?",
    readyToFeelSubtitle: "Join our community today and discover the joy of Afrobeat dance.",
    exploreClasses: "Explore Classes",
    signUpNow: "Sign Up Now",
    
    // Profile Page
    settings: "Settings",
    role: "Role",
    cancel: "Cancel",
    submit: "Submit",
    readonly: "Read Only",
    notProvided: "Not provided",
    
    // Coach Application
    
    coachApplication: "Apply as Coach",
    linkedinProfile: "LinkedIn Profile",
    experience: "Experience (years)",
    danceStyles: "Dance Styles",
    whyCoach: "Why do you want to be a coach?",
    submitApplication: "Submit Application",
    
    // Referral System
    referralProgram: "Referral Program",
    shareReferral: "Share your referral code with friends and earn credits!",
    copyCode: "Copy",
    totalEarnings: "Total Earnings:",
    
    // Notifications
    emailNotifications: "Email Notifications",
    whatsappNotifications: "WhatsApp Notifications",
    websiteNotifications: "Website Notifications",
    
    // Security
    security: "Security",
    twoFactorAuth: "Enable Two-Factor Authentication",
    twoFactorVerify: "We've sent a verification code to your email address. Please enter it below to enable two-factor authentication.",
    verificationCode: "Verification Code",
    demoCode: "Use code 123456 for demo purposes",
    verify: "Verify",
  },
  fr: {
    // Navbar
    home: 'Accueil',
    courses: 'Cours',
    dashboard: 'Tableau de Bord',
    login: 'Connexion',
    signup: 'Inscription',
    logout: 'Déconnexion',
    profile: 'Profil',
    chat: 'Chat',
    
    // Auth
    email: 'Email',
    password: 'Mot de Passe',
    confirmPassword: 'Confirmer le Mot de Passe',
    firstName: 'Prénom',
    lastName: 'Nom',
    phone: 'Téléphone (Optionnel)',
    forgotPassword: 'Mot de passe oublié?',
    noAccount: 'Vous n\'avez pas de compte?',
    haveAccount: 'Vous avez déjà un compte?',
    signIn: 'Se Connecter',
    signUp: 'S\'inscrire',
    
    // Dashboard
    myDashboard: 'Mon Tableau de Bord',
    mySessions: 'Mes Sessions',
    sessionHistory: 'Historique des Sessions',
    notifications: 'Notifications',
    communityChat: 'Chat Communautaire',
    myProgress: 'Ma Progression',
    bookNewSession: 'Réserver une Nouvelle Session',
    payRenew: 'Payer / Renouveler',
    purchased: 'Achetées',
    remaining: 'Restantes',
    noNotifications: 'Pas de nouvelles notifications.',
    accessChat: 'Accéder au Chat',
    messages: 'Messages',
    searchUsers: 'Rechercher des utilisateurs',
    
    // Courses
    courseSearch: 'Recherche de Cours',
    filter: 'Filtrer',
    type: 'Type',
    location: 'Lieu',
    day: 'Jour',
    level: 'Niveau',
    keyword: 'Mot-clé',
    availableSpots: 'Places Disponibles',
    bookNow: 'Réserver Maintenant',
    readyToJoin: 'Prêt à Rejoindre le Mouvement?',
    bookSpot: 'Réservez votre place maintenant et ressentez l\'ambiance Afroboost!',
    
    // Referral
    referFriend: 'Parrainer un Ami',
    referralLink: 'Votre Lien de Parrainage',
    shareVia: 'Partager via',
    close: 'Fermer',
    referralsStats: 'Statistiques de Parrainage',
    rewardsModel: 'Modèle de Récompenses',
    
    // Pricing
    chooseYourPlan: 'Nos Forfaits Afroboost',
    selectPaymentMethod: 'Sélectionner un Moyen de Paiement',
    twint: 'TWINT',
    creditCard: 'Carte de Crédit',
    directDebit: 'Prélèvement Direct',
    orderSummary: 'Récapitulatif de la Commande',
    validateAndPay: 'Valider et Payer',
    downloadMandate: 'Télécharger le Formulaire de Mandat',
    
    // Coach
    courseManagement: 'Gestion des Cours',
    createCourse: 'Créer un Cours',
    editCourse: 'Modifier un Cours',
    deleteCourse: 'Supprimer un Cours',
    participantList: 'Liste des Participants',
    
    // Admin
    userManagement: 'Gestion des Utilisateurs',
    contentManagement: 'Gestion du Contenu',
    adminDashboard: 'Tableau de Bord Admin',
    translationManagement: 'Gestion des Traductions',
    activityLog: 'Journal d\'Activité',
    
    // Profile
    editProfile: 'Modifier le Profil',
    savePreferences: 'Enregistrer les Préférences',
    pushNotifications: 'Notifications Push',
    enableTwoFactor: 'Activer l\'Authentification à Deux Facteurs',
    changePassword: 'Changer le Mot de Passe',
    applyAsCoach: 'Postuler comme Coach',
    
    // Footer
    aboutUs: 'À Propos de Nous',
    contactUs: 'Contactez-Nous',
    termsConditions: 'Conditions Générales',
    privacyPolicy: 'Politique de Confidentialité',
    followUs: 'Suivez-Nous',
    
    // Home Page
    heroTitle: "Votre dose d'énergie <span>Afrobeat</span>",
    heroSubtitle: "Dansez, transpirez, souriez ! Rejoignez notre communauté vibrante et découvrez la joie de la danse Afrobeat.",
    bookClass: "Réserver un Cours",
    joinUs: "Rejoignez-nous",
    
    whyChoose: "Pourquoi Choisir <span>Afroboosteur</span>",
    whyChooseSubtitle: "Expérimentez le mélange parfait entre danse africaine traditionnelle et fitness moderne.",
    
    authenticRhythms: "Rythmes Authentiques",
    authenticRhythmsDesc: "Découvrez l'essence véritable des rythmes et mouvements africains.",
    vibrantCommunity: "Communauté Vibrante",
    vibrantCommunityDesc: "Rejoignez un groupe solidaire de danseurs de tous horizons et niveaux.",
    flexibleSchedule: "Horaires Flexibles",
    flexibleScheduleDesc: "Choisissez parmi divers horaires de cours qui s'adaptent à votre emploi du temps chargé.",
    expertCoaches: "Coachs Experts",
    expertCoachesDesc: "Apprenez avec des professionnels passionnés ayant des années d'expérience.",
    
    popularClasses: "Cours <span>Populaires</span>",
    popularClassesSubtitle: "Trouvez le cours parfait pour votre niveau",
    viewAllClasses: "Voir Tous les Cours",
    beginner: "Débutant",
    intermediate: "Intermédiaire",
    advanced: "Avancé",
    
    afrobeatBasics: "Bases d'Afrobeat",
    afrobeatBasicsDesc: "Introduction parfaite à la danse Afrobeat pour les débutants absolus.",
    intermediateChoreography: "Chorégraphie Intermédiaire",
    intermediateChoreographyDesc: "Faites passer vos compétences de danse au niveau supérieur avec des routines complexes.",
    advancedWorkshop: "Atelier Avancé",
    advancedWorkshopDesc: "Masterclass pour les danseurs expérimentés qui cherchent à perfectionner leur art.",
    pricePerSession: "€{price} / séance",
    
    
    testimonials: "Ce que Disent Nos <span>Danseurs</span>",
    testimonialsSubtitle: "Rejoignez des centaines de danseurs satisfaits qui ont trouvé leur rythme avec nous.",
    student: "Élève",
    months: "mois",
    year: "an",
    sarahTestimonial: "\"Afroboosteur a complètement transformé ma confiance. Les instructeurs sont incroyables et la communauté est tellement encourageante !\"",
    davidTestimonial: "\"Je n'ai jamais pensé pouvoir danser avant de rejoindre Afroboosteur. Maintenant, je ne peux pas imaginer ma vie sans ces cours. Meilleure décision !\"",
    michelleTestimonial: "\"L'énergie dans ces cours est incomparable ! J'ai essayé plusieurs écoles de danse mais Afroboosteur se sent vraiment comme à la maison.\"",
    
    readyToFeel: "Prêt à Ressentir le <span>Rythme</span> ?",
    readyToFeelSubtitle: "Rejoignez notre communauté aujourd'hui et découvrez la joie de la danse Afrobeat.",
    exploreClasses: "Explorer les Cours",
    signUpNow: "S'inscrire Maintenant",
    
    // Profile Page
    settings: "Paramètres",
    role: "Rôle",
    cancel: "Annuler",
    submit: "Soumettre",
    readonly: "Lecture seule",
    notProvided: "Non fourni",
    
    // Coach Application
    
    coachApplication: "Postuler comme Coach",
    linkedinProfile: "Profil LinkedIn",
    experience: "Expérience (années)",
    danceStyles: "Styles de danse",
    whyCoach: "Pourquoi voulez-vous être coach?",
    submitApplication: "Soumettre la candidature",
    
    // Referral System
    referralProgram: "Programme de parrainage",
    shareReferral: "Partagez votre code de parrainage avec vos amis et gagnez des crédits!",
    copyCode: "Copier",
    totalEarnings: "Gains totaux:",
    
    // Notifications
    emailNotifications: "Notifications par e-mail",
    whatsappNotifications: "Notifications WhatsApp",
    websiteNotifications: "Notifications sur le site web",
    
    // Security
    security: "Sécurité",
    twoFactorAuth: "Activer l'authentification à deux facteurs",
    twoFactorVerify: "Nous avons envoyé un code de vérification à votre adresse e-mail. Veuillez le saisir ci-dessous pour activer l'authentification à deux facteurs.",
    verificationCode: "Code de vérification",
    demoCode: "Utilisez le code 123456 à des fins de démonstration",
    verify: "Vérifier",
  },
  de: {
    // Navbar
    home: 'Startseite',
    courses: 'Kurse',
    dashboard: 'Dashboard',
    login: 'Anmelden',
    signup: 'Registrieren',
    logout: 'Abmelden',
    profile: 'Profil',
    chat: 'Chat',
    
    // Auth
    email: 'E-Mail',
    password: 'Passwort',
    confirmPassword: 'Passwort bestätigen',
    firstName: 'Vorname',
    lastName: 'Nachname',
    phone: 'Telefon (Optional)',
    forgotPassword: 'Passwort vergessen?',
    noAccount: 'Noch kein Konto?',
    haveAccount: 'Bereits ein Konto?',
    signIn: 'Anmelden',
    signUp: 'Registrieren',
    
    // Dashboard
    myDashboard: 'Mein Dashboard',
    mySessions: 'Meine Sitzungen',
    sessionHistory: 'Sitzungsverlauf',
    notifications: 'Benachrichtigungen',
    communityChat: 'Community-Chat',
    myProgress: 'Mein Fortschritt',
    bookNewSession: 'Neue Sitzung buchen',
    payRenew: 'Bezahlen / Erneuern',
    purchased: 'Gekauft',
    remaining: 'Verbleibend',
    noNotifications: 'Keine neuen Benachrichtigungen.',
    accessChat: 'Chat öffnen',
    messages: 'Nachrichten',
    searchUsers: 'Benutzer suchen',
    
    // Courses
    courseSearch: 'Kurssuche',
    filter: 'Filter',
    type: 'Typ',
    location: 'Ort',
    day: 'Tag',
    level: 'Niveau',
    keyword: 'Stichwort',
    availableSpots: 'Verfügbare Plätze',
    bookNow: 'Jetzt buchen',
    readyToJoin: 'Bereit, der Bewegung beizutreten?',
    bookSpot: 'Buche jetzt deinen Platz und spüre den Afroboost-Vibe!',
    
    // Referral
    referFriend: 'Freund empfehlen',
    referralLink: 'Dein Empfehlungslink',
    shareVia: 'Teilen über',
    close: 'Schließen',
    referralsStats: 'Empfehlungsstatistiken',
    rewardsModel: 'Belohnungsmodell',
    
    // Pricing
    chooseYourPlan: 'Unsere Afroboost-Pläne',
    selectPaymentMethod: 'Zahlungsmethode auswählen',
    twint: 'TWINT',
    creditCard: 'Kreditkarte',
    directDebit: 'Lastschrift',
    orderSummary: 'Bestellübersicht',
    validateAndPay: 'Bestätigen und Bezahlen',
    downloadMandate: 'Mandatsformular herunterladen',
    
    // Coach
    courseManagement: 'Kursverwaltung',
    createCourse: 'Kurs erstellen',
    editCourse: 'Kurs bearbeiten',
    deleteCourse: 'Kurs löschen',
    participantList: 'Teilnehmerliste',
    
    // Admin
    userManagement: 'Benutzerverwaltung',
    contentManagement: 'Inhaltsverwaltung',
    adminDashboard: 'Admin-Dashboard',
    translationManagement: 'Übersetzungsverwaltung',
    activityLog: 'Aktivitätsprotokoll',
    
    // Profile
    editProfile: 'Profil bearbeiten',
    savePreferences: 'Einstellungen speichern',
    pushNotifications: 'Push-Benachrichtigungen',
    enableTwoFactor: 'Zwei-Faktor-Authentifizierung aktivieren',
    changePassword: 'Passwort ändern',
    applyAsCoach: 'Als Coach bewerben',
    
    // Footer
    aboutUs: 'Über Uns',
    contactUs: 'Kontaktiere Uns',
    termsConditions: 'AGB',
    privacyPolicy: 'Datenschutzrichtlinie',
    followUs: 'Folge Uns',
    
    // Home Page
    heroTitle: "Dein Schuss <span>Afrobeat</span> Energie",
    heroSubtitle: "Tanze, schwitze, lächle! Tritt unserer lebendigen Gemeinschaft bei und entdecke die Freude am Afrobeat-Tanz.",
    bookClass: "Kurs buchen",
    joinUs: "Mach mit",
    
    whyChoose: "Warum <span>Afroboosteur</span> wählen",
    whyChooseSubtitle: "Erlebe die perfekte Mischung aus traditionellem afrikanischem Tanz und modernem Fitness.",
    
    authenticRhythms: "Authentische Rhythmen",
    authenticRhythmsDesc: "Erlebe die wahre Essenz afrikanischer Beats und Bewegungen.",
    vibrantCommunity: "Lebendige Gemeinschaft",
    vibrantCommunityDesc: "Schließe dich einer unterstützenden Gruppe von Tänzern aus allen Hintergründen und Niveaus an.",
    flexibleSchedule: "Flexibler Zeitplan",
    flexibleScheduleDesc: "Wähle aus verschiedenen Kurszeiten, die zu deinem vollen Terminkalender passen.",
    expertCoaches: "Erfahrene Trainer",
    expertCoachesDesc: "Lerne von leidenschaftlichen Profis mit jahrelanger Erfahrung.",
    
    popularClasses: "Beliebte <span>Kurse</span>",
    popularClassesSubtitle: "Finde den perfekten Kurs für dein Level",
    viewAllClasses: "Alle Kurse anzeigen",
    beginner: "Anfänger",
    intermediate: "Fortgeschritten",
    advanced: "Experte",
    
    afrobeatBasics: "Afrobeat Grundlagen",
    afrobeatBasicsDesc: "Perfekte Einführung in den Afrobeat-Tanz für absolute Anfänger.",
    intermediateChoreography: "Mittelstufen-Choreographie",
    intermediateChoreographyDesc: "Bringe deine Tanzkünste mit komplexen Routinen auf die nächste Stufe.",
    advancedWorkshop: "Fortgeschrittenen-Workshop",
    advancedWorkshopDesc: "Meisterklasse für erfahrene Tänzer, die ihr Können perfektionieren möchten.",
    pricePerSession: "€{price} / Einheit",
    
    
    testimonials: "Was unsere <span>Tänzer</span> sagen",
    testimonialsSubtitle: "Schließe dich Hunderten zufriedener Tänzer an, die mit uns ihren Rhythmus gefunden haben.",
    student: "Schüler",
    months: "Monate",
    year: "Jahr",
    sarahTestimonial: "\"Afroboosteur hat mein Selbstvertrauen komplett verändert. Die Trainer sind toll und die Gemeinschaft ist so unterstützend!\"",
    davidTestimonial: "\"Ich hätte nie gedacht, dass ich tanzen könnte, bevor ich zu Afroboosteur kam. Jetzt kann ich mir mein Leben ohne diese Kurse nicht mehr vorstellen. Beste Entscheidung!\"",
    michelleTestimonial: "\"Die Energie in diesen Kursen ist unvergleichlich! Ich habe viele Tanzstudios ausprobiert, aber Afroboosteur fühlt sich wirklich wie zu Hause an.\"",
    
    readyToFeel: "Bereit, den <span>Rhythmus</span> zu spüren?",
    readyToFeelSubtitle: "Tritt unserer Gemeinschaft heute bei und entdecke die Freude am Afrobeat-Tanz.",
    exploreClasses: "Kurse entdecken",
    signUpNow: "Jetzt anmelden",
    
    // Profile Page
    settings: "Einstellungen",
    role: "Rolle",
    cancel: "Abbrechen",
    submit: "Absenden",
    readonly: "Nur Lesen",
    notProvided: "Nicht angegeben",
    
    // Coach Application
    
    coachApplication: "Als Coach bewerben",
    linkedinProfile: "LinkedIn-Profil",
    experience: "Erfahrung (Jahre)",
    danceStyles: "Tanzstile",
    whyCoach: "Warum möchten Sie Coach werden?",
    submitApplication: "Bewerbung absenden",
    
    // Referral System
    referralProgram: "Empfehlungsprogramm",
    shareReferral: "Teilen Sie Ihren Empfehlungscode mit Freunden und verdienen Sie Guthaben!",
    copyCode: "Kopieren",
    totalEarnings: "Gesamtverdienst:",
    
    // Notifications
    emailNotifications: "E-Mail-Benachrichtigungen",
    whatsappNotifications: "WhatsApp-Benachrichtigungen",
    websiteNotifications: "Website-Benachrichtigungen",
    
    // Security
    security: "Sicherheit",
    twoFactorAuth: "Zwei-Faktor-Authentifizierung aktivieren",
    twoFactorVerify: "Wir haben einen Bestätigungscode an Ihre E-Mail-Adresse gesendet. Bitte geben Sie ihn unten ein, um die Zwei-Faktor-Authentifizierung zu aktivieren.",
    verificationCode: "Bestätigungscode",
    demoCode: "Verwenden Sie den Code 123456 zu Demonstrationszwecken",
    verify: "Verifizieren",
  }
};

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
            setLanguage(userDoc.data().language as Language);
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