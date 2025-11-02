'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMessageCircle, FiX, FiSend, FiUser, FiHelpCircle, FiBox, FiRefreshCw, FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import { ChatBot } from '@/lib/chatbot';
import { FAQItem } from '@/types';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import { usePathname } from 'next/navigation';

interface ChatMessage {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  faqs?: FAQItem[];
  suggestions?: string[];
}

export default function ChatbotWidget() {
  const { t } = useTranslation(); // Initialize useTranslation
  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatBot, setChatBot] = useState<ChatBot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastUserActivity, setLastUserActivity] = useState(Date.now());
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Track user activity for smart notifications
  useEffect(() => {
    const handleActivity = () => {
      setLastUserActivity(Date.now());
      if (isOpen) {
        setUnreadCount(0);
      }
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, handleActivity, true));
    
    return () => {
      events.forEach(event => document.removeEventListener(event, handleActivity, true));
    };
  }, [isOpen]);

  // Auto-increment unread count for bot messages when chat is closed
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!isOpen && lastMessage?.isBot && Date.now() - lastUserActivity > 30000) {
      setUnreadCount(prev => Math.min(prev + 1, 9)); // Cap at 9
    }
  }, [messages, isOpen, lastUserActivity]);

  // Initialize chatbot with database FAQs
  useEffect(() => {
    const translateFn = (key: string, lang?: string) => t(key, { lng: lang });
    const initializeChatBot = async () => {
      setIsLoading(true);
      try {
        const bot = await ChatBot.create(translateFn); // Pass translation function
        setChatBot(bot);
      } catch (error) {
        console.error('Error initializing chatbot:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeChatBot();
  }, [t]); // Add t as dependency

  // Add event listener for opening chatbot from contact page
  useEffect(() => {
    const handleOpenChatbot = () => {
      setIsOpen(true);
    };

    // Add event listener
    window.addEventListener('openChatbot', handleOpenChatbot);

    // Cleanup
    return () => {
      window.removeEventListener('openChatbot', handleOpenChatbot);
    };
  }, []);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize with greeting when opened for the first time
  useEffect(() => {
    if (isOpen && messages.length === 0 && chatBot) {
      const greeting: ChatMessage = {
        id: Date.now().toString(),
        text: chatBot.getGreeting(),
        isBot: true,
        timestamp: new Date(),
        suggestions: chatBot.getSuggestions()
      };
      setMessages([greeting]);
    }
  }, [isOpen, messages.length, chatBot]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || !chatBot) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: text.trim(),
      isBot: false,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate typing delay for better UX
    const typingDelay = 800 + Math.random() * 1200;
    
    setTimeout(() => {
    
      const answers = chatBot.findAnswer(text);
      
      if (answers.length > 0) {
        const botMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: answers[0].answer,
          isBot: true,
          timestamp: new Date(),
          faqs: answers.length > 1 ? answers.slice(1, 3) : undefined,
          suggestions: chatBot.getSuggestions()
        };

        setMessages(prev => [...prev, botMessage]);
      } else {
        const botMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: chatBot.getNoAnswerResponse(),
          isBot: true,
          timestamp: new Date(),
          suggestions: chatBot.getSuggestions()
        };
        setMessages(prev => [...prev, botMessage]);
      }
      setIsTyping(false);
    }, typingDelay);
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const handleFaqClick = (faq: FAQItem) => {
    if (!chatBot) return;
    
    const faqMessage: ChatMessage = {
      id: Date.now().toString(),

      text: faq.answer,
      isBot: true,
      timestamp: new Date(),
      suggestions: chatBot.getCategorySuggestions(faq.category)
    };
    setMessages(prev => [...prev, faqMessage]);
  };

  const clearChat = () => {
    setMessages([]);
    if (chatBot) {
      const greeting: ChatMessage = {
        id: Date.now().toString(),
        text: chatBot.getGreeting(),
        isBot: true,
        timestamp: new Date(),
        suggestions: chatBot.getSuggestions()
      };
      setMessages([greeting]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputText);
  };

  const pathname = usePathname();
    if (
      pathname === '/chat' ||(pathname?.startsWith('/courses/'))
    ) {
      return null;
    }

  return (
    <>
      {/* Enhanced Chat Widget Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          setIsOpen(true);
          setUnreadCount(0);
        }}
        className={`fixed bottom-4 right-4 z-40 w-14 h-14 sm:bottom-6 sm:right-6 sm:w-16 sm:h-16 bg-gradient-to-r from-[#D91CD2] to-[#7000FF] rounded-full shadow-2xl flex items-center justify-center text-white border-2 border-white/20 backdrop-blur-sm ${isOpen ? 'hidden' : 'block'} hover:shadow-[0_0_30px_rgba(217,28,210,0.5)] transition-all duration-300`}
        style={{
          filter: 'drop-shadow(0 8px 32px rgba(217, 28, 210, 0.4))',
        }}
      >
        <motion.div
          animate={{ 
            rotate: isTyping ? 360 : 0,
            scale: unreadCount > 0 ? [1, 1.1, 1] : 1
          }}
          transition={{ 
            rotate: { duration: 2, repeat: isTyping ? Infinity : 0 },
            scale: { duration: 1, repeat: unreadCount > 0 ? Infinity : 0 }
          }}
        >
          <FiMessageCircle size={28} />
        </motion.div>
        
        {/* Enhanced notification badges */}
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white shadow-lg"
          >
            {unreadCount}
          </motion.div>
        )}
        
        {/* Pulsing indicator for new activity */}
        {isTyping && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"
          />
        )}
        
        {/* Larger pulse ring for better visibility */}
        <motion.div
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.7, 0, 0.7]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatDelay: 1
          }}
          className="absolute inset-0 rounded-full bg-gradient-to-r from-[#D91CD2] to-[#7000FF]"
        />
      </motion.button>

      {/* Enhanced Chat Window with Full-Screen Support */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed z-50 bg-black border border-[#D91CD2]/30 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
              isFullScreen 
                ? 'inset-2 sm:inset-4 rounded-lg' 
                : 'bottom-4 right-4 w-[90%] max-w-sm sm:bottom-6 sm:right-6 sm:w-96 sm:h-[600px] rounded-2xl'
            }`}
            style={{
              backdropFilter: 'blur(20px)',
              background: 'linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(40,0,40,0.95) 100%)',
            }}
          >
            {/* Enhanced Header */}
            <div className="bg-gradient-to-r from-[#D91CD2] to-[#7000FF] p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <FiBox size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{t('assistantTitle')}</h3>
                  <p className="text-xs text-white/80">
                    {isTyping ? t('typing') : t('alwaysHereToHelp')}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                  title={isFullScreen ? t('exitFullScreen') : t('fullScreen')}
                >
                  {isFullScreen ? 
                    <FiMinimize2 size={16} className="text-white" /> : 
                    <FiMaximize2 size={16} className="text-white" />
                  }
                </button>
                <button
                  onClick={clearChat}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                  title={t('clearChat')}
                >
                  <FiRefreshCw size={16} className="text-white" />
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setIsFullScreen(false);
                  }}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                >
                  <FiX size={18} className="text-white" />
                </button>
              </div>
            </div>

            {/* Enhanced Messages Section */}
            <div className={`flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 scrollbar-thin scrollbar-thumb-[#D91CD2]/20 ${
              isFullScreen ? 'max-h-none' : 'max-h-[70vh]'
            }`}>
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D91CD2]"></div>
                  <span className="ml-2 text-gray-400">{t('loadingAssistant')}</span>
                </div>
              )}
              
              {messages.map((message) => (
                <motion.div 
                  key={message.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-center"
                >
                  <div
                    className={`
                      min-w-[95%] max-w-[95%]
                      ${message.isBot 
                        ? 'bg-gray-800/80 backdrop-blur-sm' 
                        : 'bg-gradient-to-r from-[#D91CD2] to-[#7000FF]'
                      }
                      rounded-2xl p-3 shadow-lg
                    `}
                  >
                    {message.isBot && (
                      <div className="flex items-center space-x-2 mb-2">
                        <FiBox size={14} className="text-[#D91CD2]" />
                        <span className="text-xs text-gray-400">{t('assistant')}</span>
                      </div>
                    )}
                    {/* Enhanced message rendering with WhatsApp links */}
                    <div className="text-sm text-white whitespace-pre-wrap">
                      {message.text.includes('+41765203363') ? (
                        <span>
                          {message.text.split('+41765203363').map((part, index) => (
                            <span key={index}>
                              {part}
                              {index < message.text.split('+41765203363').length - 1 && (
                                <a
                                  href="https://wa.me/41765203363"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-green-400 hover:text-green-300 underline inline-flex items-center space-x-1 mx-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log('WhatsApp contact clicked from chatbot');
                                  }}
                                >
                                  <span>+41 76 520 33 63</span>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-green-400">
                                    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.91 13.99c-.25.56-.98.96-1.62 1.03-.46.05-.85.18-2.86-.76-2.31-1.08-3.81-3.35-3.93-3.51-.12-.16-.98-1.31-.98-2.49s.62-1.77.84-2.01c.19-.21.42-.26.56-.26s.28.01.4.01c.14 0 .32-.05.5.38.18.48.62 1.49.67 1.6.05.11.09.24.02.38-.07.17-.11.25-.22.39-.11.13-.23.3-.33.39-.11.1-.22.21-.1.41.12.2.53.86 1.13 1.4.78.69 1.43.9 1.63 1.01.2.11.31.09.43-.05.12-.17.5-.58.64-.78.14-.2.27-.17.46-.1.19.07 1.19.56 1.39.66.2.1.33.15.38.23.05.08.05.48-.2 1.04z"/>
                                  </svg>
                                </a>
                              )}
                            </span>
                          ))}
                        </span>
                      ) : (
                        message.text
                      )}
                    </div>
                    
                    {/* Additional FAQs */}
                    {message.faqs && message.faqs.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-gray-400">{t('relatedQuestions')}:</p>
                        {message.faqs.map((faq) => (
                          <button
                            key={faq.id}
                            onClick={() => handleFaqClick(faq)}
                            className="block w-full text-left text-xs bg-[#D91CD2]/20 hover:bg-[#D91CD2]/30 p-2 rounded transition-colors"
                          >
                            {faq.question}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Suggestions */}
                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-gray-400">{t('tryAsking')}:</p>
                        <div className="flex flex-wrap gap-1">
                          {message.suggestions.slice(0, 3).map((suggestion, index) => (
                            <button
                              key={index}
                              onClick={() => handleSuggestionClick(suggestion)}
                              className="text-xs bg-[#D91CD2]/20 hover:bg-[#D91CD2]/30 px-2 py-1 rounded-full transition-colors"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500 mt-2">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </motion.div>
              ))}
              
              {/* Typing indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 rounded-2xl p-3 max-w-[85%]">
                    <div className="flex items-center space-x-2">
                      <FiBox size={14} className="text-[#D91CD2]" />
                      <span className="text-xs text-gray-400">{t('assistantIsTyping')}</span>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-[#D91CD2] rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-[#D91CD2] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-[#D91CD2] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>

            {/* Enhanced Input Section */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-gray-800 bg-black/50 backdrop-blur-sm">
              <div className={`flex space-x-2 ${isFullScreen ? 'max-w-4xl mx-auto' : 'max-w-full'}`}>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={t('askMeAnything')}
                  className={`flex-1 bg-gray-800/80 border border-gray-600 rounded-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base focus:outline-none focus:border-[#D91CD2] text-white placeholder-gray-400 transition-all duration-200`}
                  disabled={isTyping || isLoading}
                />
                <motion.button
                  type="submit"
                  disabled={!inputText.trim() || isTyping || isLoading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`bg-gradient-to-r from-[#D91CD2] to-[#7000FF] rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-[0_0_20px_rgba(217,28,210,0.3)] transition-all duration-200 w-10 h-10 sm:w-12 sm:h-12`}
                >
                  <FiSend size={16} className="text-white sm:text-lg" />
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
