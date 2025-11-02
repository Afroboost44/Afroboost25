'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This component will redirect to home and trigger the chatbot
export default function ContactPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to home page
    router.push('/');
    
    // Trigger the chatbot to open
    // We'll use a custom event that the ChatbotWidget will listen for
    const event = new CustomEvent('openChatbot');
    window.dispatchEvent(event);
  }, [router]);
  
  // Show a loading state while redirecting
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D91CD2]"></div>
    </div>
  );
} 