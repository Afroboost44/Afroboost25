'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSend, FiUsers, FiMessageCircle, FiClock, FiUser, FiHeart, FiImage, FiX, FiLoader } from 'react-icons/fi';
import { ChatMessage, DateOrTimestamp, User, CustomEmoji } from '@/types';
import { chatService, userService, emojiService } from '@/lib/database';
import { useAuth } from '@/lib/auth';
import { useHideFooter } from '@/hooks/useHideFooter';
import Image from 'next/image';
import type { Timestamp } from 'firebase/firestore';
import { useTranslation } from 'react-i18next'; // Import useTranslation

interface CommunityChatProps {
  courseId: string;
  courseName: string;
}

export default function CommunityChat({ courseId, courseName }: CommunityChatProps) {
  const { t } = useTranslation(); // Initialize useTranslation
  const { user } = useAuth();
  const shouldHideFooter = useHideFooter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [usersCache, setUsersCache] = useState<Record<string, User>>({});
  const [customEmojis, setCustomEmojis] = useState<CustomEmoji[]>([]);

  // Load messages and custom emojis on mount
  useEffect(() => {
    loadMessages();
    loadCustomEmojis();
    // Simulate random online users (in real app, this would be from real-time data)
    setOnlineUsers(Math.floor(Math.random() * 15) + 3);
  }, [courseId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    //messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Simulate real-time message updates (in production, use WebSocket or Firebase real-time listeners)
  useEffect(() => {
    const interval = setInterval(() => {
      loadMessages();
    }, 10000); // Check for new messages every 10 seconds

    return () => clearInterval(interval);
  }, [courseId]);

  // Create preview URL when image is selected
  useEffect(() => {
    if (!selectedImage) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedImage);
    setPreviewUrl(objectUrl);

    // Free memory when component unmounts
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedImage]);

  // Fetch user details for messages
  useEffect(() => {
    const fetchUserDetails = async () => {
      const userIds = messages
        .map(msg => msg.senderId)
        .filter((id, index, self) => self.indexOf(id) === index && !usersCache[id]);
      
      if (userIds.length === 0) return;
      
      try {
        const userPromises = userIds.map(id => userService.getById(id));
        const users = await Promise.all(userPromises);
        
        const newCache = { ...usersCache };
        users.forEach(user => {
          if (user) newCache[user.id] = user;
        });
        
        setUsersCache(newCache);
      } catch (error) {
        console.error('Error fetching user details:', error);
      }
    };
    
    fetchUserDetails();
  }, [messages, usersCache]);

  const loadMessages = async () => {
    try {
      const courseMessages = await chatService.getCourseMessages(courseId);
      setMessages(courseMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      setSelectedImage(null);
      return;
    }

    const file = e.target.files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Image size should be less than 2MB');
      return;
    }

    setSelectedImage(file);
    setUploadError(null);
  };

  const uploadImage = async (file: File): Promise<string> => {
    // Create a FormData object to send the file
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'chat');

    // Upload using our API route
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload image');
    }

    const data = await response.json();
    return data.url;
  };

  const cancelImageUpload = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if we have either text or image to send
    if ((!newMessage.trim() && !selectedImage) || !user || isLoading) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setIsLoading(true);
    setIsTyping(true);
    setUploadError(null);

    try {
      let imageUrl = undefined;
      
      // Upload image if selected
      if (selectedImage) {
        setIsUploading(true);
        imageUrl = await uploadImage(selectedImage);
        setIsUploading(false);
        setSelectedImage(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }

      const messageData = {
        courseId,
        senderId: user.id,
        senderName: `${user.firstName} ${user.lastName}`,
        senderRole: user.role as 'student' | 'coach',
        message: messageText,
        imageUrl
      };

      await chatService.sendMessage(messageData);
      await loadMessages(); // Reload to get the new message with timestamp
    } catch (error: any) {
      console.error('Error sending message:', error);
      setUploadError(error.message || 'Failed to send message');
      // Restore message on error
      setNewMessage(messageText);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      setIsUploading(false);
    }
  };

  const formatMessageTime = (timestamp: Date | Timestamp) => {
    let messageDate: Date;
    if (timestamp instanceof Date) {
      messageDate = timestamp;
    } else if (timestamp && typeof (timestamp as any).toDate === 'function') {
      messageDate = (timestamp as any).toDate();
    } else {
      messageDate = new Date(timestamp as any);
    }
    const now = new Date();
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);
  
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return messageDate.toLocaleDateString();
    }
  };

  const quickMessages = [
    t('greatClass'),
    t('thanksForTips'),
    t('seeYouNextTime'),
    t('amazingSession'),
    t('quickQuestion'),
    t('loveEnergy')
  ];

  const loadCustomEmojis = async () => {
    try {
      const emojis = await emojiService.getAll();
      setCustomEmojis(emojis);
    } catch (error) {
      console.error('Error loading custom emojis:', error);
    }
  };

  // Get custom emoji for a specific user
  const getCustomEmojiForUser = (userId: string): string | null => {
    const userEmoji = customEmojis.find(emoji => emoji.createdBy === userId);
    return userEmoji ? userEmoji.imageUrl : null;
  };

  if (!user) {
    return (
      <div className="card text-center py-12">
        <FiMessageCircle className="mx-auto text-4xl text-gray-500 mb-4" />
        <h3 className="text-xl font-semibold mb-2">{t('joinConversation')}</h3>
        <p className="text-gray-400 mb-6">{t('signInToChat')}</p>
        <button className="btn-primary">{t('signIn')}</button>
      </div>
    );
  }

  return (
    <div className={`card flex flex-col ${shouldHideFooter ? 'h-[95vh]' : 'h-[600px]'}`}>
      {/* Chat Header */}
      <div className="border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">{courseName}</h3>
            <p className="text-sm text-gray-400">{t('communityChat')}</p>
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>{onlineUsers} {t('online')}</span>
            </div>
            <div className="flex items-center space-x-1">
              <FiUsers size={16} />
              <span>{messages.length > 0 ? new Set(messages.map(m => m.senderId)).size : 0} {t('members')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-900 ${
        shouldHideFooter ? 'max-h-none' : 'max-h-[400px] md:max-h-[450px]'
      }`}>
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <FiMessageCircle className="mx-auto text-4xl text-gray-500 mb-4" />
            <h4 className="text-lg font-medium mb-2">{t('startConversation')}</h4>
            <p className="text-gray-400">{t('beFirstToSayHello')}</p>
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((message, index) => {
              const isCurrentUser = message.senderId === user.id;
              const isCoach = message.senderRole === 'coach';
              const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId;
              const hasImage = message.imageUrl && message.imageUrl.length > 0;

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} ${showAvatar ? 'mt-4' : 'mt-1'}`}
                >
                  <div className={`max-w-[70%] ${isCurrentUser ? 'order-2' : 'order-1'}`}>
                    {showAvatar && !isCurrentUser && (
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="flex items-center space-x-2">
                          {(message.senderRole === 'admin' || message.senderRole === 'superadmin') && (
                            <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                              <span className="text-[10px] text-white font-bold">A</span>
                            </div>
                          )}
                          {getCustomEmojiForUser(message.senderId) && (
                            <img 
                              src={getCustomEmojiForUser(message.senderId)!} 
                              alt={t('customEmoji')} 
                              className="w-8 h-8 object-cover rounded-full"
                            />
                          )}
                          <span className="text-sm font-medium text-[#D91CD2]">
                            {message.senderName}
                            {(message.senderRole === 'admin' || message.senderRole === 'superadmin') && ` (${t('admin')})`}
                            {message.senderRole === 'coach' && ` (${t('coach')})`}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">{formatMessageTime(message.timestamp)}</span>
                      </div>
                    )}
                    
                    <div className={`rounded-2xl p-3 ${
                      isCurrentUser 
                        ? 'bg-gradient-to-r from-[#D91CD2] to-[#7000FF] text-white' 
                        : (message.senderRole === 'admin' || message.senderRole === 'superadmin')
                        ? 'bg-purple-600/20 border border-purple-600/30'
                        : isCoach
                        ? 'bg-[#D91CD2]/20 border border-[#D91CD2]/30'
                        : 'bg-gray-800'
                    }`}>
                      {message.message && message.message.length > 0 && (
                        <p className="text-sm">{message.message}</p>
                      )}
                      
                      {hasImage && (
                        <div className="mt-2">
                          <div className="relative rounded-lg overflow-hidden bg-gray-700">
                            <Image
                              src={message.imageUrl as string}
                              alt={t('sharedImage')}
                              width={300}
                              height={200}
                              className="max-w-full object-contain"
                              style={{ maxHeight: '200px', width: 'auto' }}
                            />
                          </div>
                        </div>
                      )}
                      
                      <p className={`text-xs mt-1 ${
                        isCurrentUser ? 'text-white/70' : 'text-gray-500'
                      }`}>
                        {formatMessageTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        
        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center space-x-2 text-gray-400"
          >
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-[#D91CD2] rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-[#D91CD2] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-[#D91CD2] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-sm">{t('sendingMessage')}</span>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview */}
      {previewUrl && (
        <div className="border-t border-gray-800 p-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">{t('imagePreview')}</h4>
            <button 
              onClick={cancelImageUpload}
              className="text-gray-400 hover:text-white"
            >
              <FiX size={18} />
            </button>
          </div>
          
          <div className="relative bg-gray-800 rounded-lg overflow-hidden h-24 w-24">
            <Image
              src={previewUrl}
              alt={t('uploadPreview')}
              fill
              className="object-cover"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <FiLoader className="animate-spin text-white" size={20} />
              </div>
            )}
          </div>
          
          {uploadError && (
            <p className="text-red-400 text-xs mt-1">{uploadError}</p>
          )}
        </div>
      )}

      {/* Quick Messages */}
      <div className="border-t border-gray-800 p-2">
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {quickMessages.map((quickMsg, index) => (
            <button
              key={index}
              onClick={() => setNewMessage(quickMsg)}
              className="flex-shrink-0 text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded-full transition-colors"
            >
              {quickMsg}
            </button>
          ))}
        </div>
      </div>

      {/* Message Input */}
      <form onSubmit={sendMessage} className="border-t border-gray-800 p-4">
        <div className="flex space-x-3">
            <div className="relative flex-1 flex items-center">
            {/* Image upload button on the left */}
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center z-10">
              <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              className="hidden"
              accept="image/*"
              disabled={isLoading || isUploading}
              />
              <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-400 hover:text-white"
              disabled={isLoading || isUploading}
              >
              <FiImage size={18} />
              </button>
            </div>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={t('typeYourMessage')}
              className="input-primary w-full pl-10" // Add pl-10 for left padding
              disabled={isLoading || isUploading}
            />
            </div>
          <button
            type="submit"
            className="btn-primary px-4 flex items-center justify-center"
            disabled={(!newMessage.trim() && !selectedImage) || isLoading || isUploading}
          >
            {isLoading || isUploading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <FiSend />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
