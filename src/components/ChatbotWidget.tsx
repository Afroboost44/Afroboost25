'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMessageCircle, FiX, FiSend, FiUser, FiHelpCircle, FiBox, FiRefreshCw } from 'react-icons/fi';
import { ChatBot } from '@/lib/chatbot';
import { FAQItem } from '@/types';

interface ChatMessage {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  faqs?: FAQItem[];
  suggestions?: string[];
}

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatBot, setChatBot] = useState<ChatBot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize chatbot with database FAQs
  useEffect(() => {
    const initializeChatBot = async () => {
      setIsLoading(true);
      try {
        const bot = await ChatBot.create();
        setChatBot(bot);
      } catch (error) {
        console.error('Error initializing chatbot:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeChatBot();
  }, []);

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

  return (
    <>
      {/* Chat Widget Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-r from-[#D91CD2] to-[#7000FF] rounded-full shadow-lg flex items-center justify-center text-white ${isOpen ? 'hidden' : 'block'}`}
      >
        <FiMessageCircle size={24} />
        {/* Notification pulse */}
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-black border border-[#D91CD2]/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#D91CD2] to-[#7000FF] p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <FiBox size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Afroboosteur Assistant</h3>
                  <p className="text-xs text-white/80">Always here to help! 💃</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={clearChat}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                  title="Clear chat"
                >
                  <FiRefreshCw size={16} className="text-white" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                >
                  <FiX size={18} className="text-white" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-[#D91CD2]/20">
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D91CD2]"></div>
                  <span className="ml-2 text-gray-400">Loading assistant...</span>
                </div>
              )}
              
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[85%] ${message.isBot ? 'bg-gray-800' : 'bg-gradient-to-r from-[#D91CD2] to-[#7000FF]'} rounded-2xl p-3`}>
                    {message.isBot && (
                      <div className="flex items-center space-x-2 mb-2">
                        <FiBox size={14} className="text-[#D91CD2]" />
                        <span className="text-xs text-gray-400">Assistant</span>
                      </div>
                    )}
                    <p className="text-sm text-white whitespace-pre-wrap">{message.text}</p>
                    
                    {/* Additional FAQs */}
                    {message.faqs && message.faqs.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-gray-400">Related questions:</p>
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
                        <p className="text-xs text-gray-400">Try asking:</p>
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
                </div>
              ))}
              
              {/* Typing indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 rounded-2xl p-3 max-w-[85%]">
                    <div className="flex items-center space-x-2">
                      <FiBox size={14} className="text-[#D91CD2]" />
                      <span className="text-xs text-gray-400">Assistant is typing</span>
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

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-gray-800">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ask me anything about Afroboosteur..."
                  className="flex-1 bg-gray-800 border border-gray-600 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-[#D91CD2] text-white placeholder-gray-400"
                  disabled={isTyping || isLoading}
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isTyping || isLoading}
                  className="w-10 h-10 bg-gradient-to-r from-[#D91CD2] to-[#7000FF] rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiSend size={16} className="text-white" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
