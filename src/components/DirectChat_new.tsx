'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiSend, 
  FiSearch, 
  FiUser, 
  FiMessageCircle, 
  FiClock, 
  FiImage, 
  FiX, 
  FiLoader,
  FiMoreVertical,
  FiArrowLeft,
  FiPhone,
  FiVideo,
  FiSmile,
  FiPaperclip
} from 'react-icons/fi';
import { DirectMessage, User } from '@/types';
import { directMessageService, userService } from '@/lib/database';
import { useAuth } from '@/lib/auth';
import Image from 'next/image';
import type { Timestamp } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';

interface DirectChatProps {
  className?: string;
}

export default function DirectChat({ className = '' }: DirectChatProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [activeName, setActiveName] = useState<string>('');
  const [activeUserData, setActiveUserData] = useState<User | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Load conversations on mount
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversation && user) {
      loadMessages(activeConversation);
      directMessageService.markConversationAsRead(user.id, activeConversation);
      
      setConversations(prevConversations => 
        prevConversations.map(conv => 
          conv.userId === activeConversation 
            ? { ...conv, unread: 0 } 
            : conv
        )
      );
      
      loadUserData(activeConversation);
    }
  }, [activeConversation, user]);

  // Search for users when search term changes
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchTerm.trim().length >= 2 && user) {
        searchUsers(searchTerm);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchTerm, user]);

  // Create preview URL when image is selected
  useEffect(() => {
    if (!selectedImage) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedImage);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedImage]);

  const loadConversations = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const userConversations = await directMessageService.getUserConversations(user.id);
      setConversations(userConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (partnerId: string) => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const conversationMessages = await directMessageService.getConversation(user.id, partnerId);
      setMessages(conversationMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserData = async (userId: string) => {
    try {
      const userData = await userService.getById(userId);
      setActiveUserData(userData);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const searchUsers = async (term: string) => {
    if (!user) return;
    
    try {
      setIsSearching(true);
      const results = await directMessageService.searchUsers(term, user.id);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const startConversation = (selectedUser: User) => {
    setActiveConversation(selectedUser.id);
    setActiveName(`${selectedUser.firstName} ${selectedUser.lastName}`);
    setActiveUserData(selectedUser);
    setMessages([]);
    setSearchTerm('');
    setSearchResults([]);
    setShowMobileChat(true);
  };

  const selectConversation = (conversation: any) => {
    setActiveConversation(conversation.userId);
    setActiveName(conversation.name);
    setShowMobileChat(true);
  };

  const handleBackToList = () => {
    setShowMobileChat(false);
    setActiveConversation(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      setSelectedImage(null);
      return;
    }

    const file = e.target.files[0];
    
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Image size should be less than 2MB');
      return;
    }

    setSelectedImage(file);
    setUploadError(null);
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'chat');

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
    if ((!newMessage.trim() && !selectedImage) || !user || !activeConversation || isLoading) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setIsLoading(true);
    setIsTyping(true);
    setUploadError(null);

    try {
      let imageUrl = undefined;
      
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
        senderId: user.id,
        receiverId: activeConversation,
        senderName: `${user.firstName} ${user.lastName}`,
        receiverName: activeName,
        message: messageText,
        imageUrl
      };

      await directMessageService.sendMessage(messageData);
      
      const tempMessage: DirectMessage = {
        ...messageData,
        id: 'temp-' + Date.now(),
        read: false,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, tempMessage]);
      loadConversations();
    } catch (error: any) {
      console.error('Error sending message:', error);
      setUploadError(error.message || 'Failed to send message');
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
      return diffInMinutes < 1 ? t('Just now') : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return messageDate.toLocaleDateString();
    }
  };

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-900/50">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8"
        >
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiMessageCircle className="text-2xl text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">{t('Join the conversation')}</h3>
          <p className="text-gray-400 mb-6">{t('Sign in to chat with users')}</p>
          <button className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200">
            {t('Sign In')}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Sidebar - Conversations List */}
      <div className={`
        ${showMobileChat ? 'hidden' : 'flex'} 
        lg:flex flex-col w-full lg:w-80 xl:w-96 
        bg-gray-900/80 backdrop-blur-sm border-r border-gray-800
      `}>
        {/* Search Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('Search conversations...')}
              className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>
        
        {/* Search Results */}
        <AnimatePresence>
          {searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-b border-gray-800 bg-gray-800/30"
            >
              <div className="p-3">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
                  {t('Search Results')}
                </p>
                <div className="space-y-2">
                  {searchResults.map(result => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => startConversation(result)}
                      className="flex items-center p-3 hover:bg-gray-700/50 rounded-xl cursor-pointer transition-all duration-200 group"
                    >
                      <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {result.profileImage ? (
                            <Image
                              src={result.profileImage}
                              alt={`${result.firstName} ${result.lastName}`}
                              width={40}
                              height={40}
                              className="rounded-full object-cover"
                            />
                          ) : (
                            `${result.firstName?.[0] || ''}${result.lastName?.[0] || ''}`
                          )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-gray-900 rounded-full"></div>
                      </div>
                      <div className="ml-3 flex-1 min-w-0">
                        <p className="text-sm font-medium text-white group-hover:text-purple-300 transition-colors">
                          {result.firstName} {result.lastName}
                        </p>
                        <p className="text-xs text-gray-400 capitalize">{result.role}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && conversations.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400 text-sm">{t('Loading conversations...')}</p>
              </div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center px-4">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiMessageCircle className="text-2xl text-gray-500" />
                </div>
                <p className="text-gray-400 mb-2">{t('No conversations yet')}</p>
                <p className="text-sm text-gray-500">{t('Search for users to start chatting')}</p>
              </div>
            </div>
          ) : (
            <div className="p-3 space-y-1">
              {conversations.map(conversation => (
                <motion.div
                  key={conversation.userId}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => selectConversation(conversation)}
                  className={`
                    flex items-center p-3 rounded-xl cursor-pointer transition-all duration-200 group
                    ${activeConversation === conversation.userId
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30'
                      : 'hover:bg-gray-700/50'
                    }
                  `}
                >
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {conversation.profileImage ? (
                        <Image
                          src={conversation.profileImage}
                          alt={conversation.name}
                          width={48}
                          height={48}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        conversation.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()
                      )}
                    </div>
                    {conversation.unread > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                        {conversation.unread > 99 ? '99+' : conversation.unread}
                      </div>
                    )}
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-white truncate group-hover:text-purple-300 transition-colors">
                        {conversation.name}
                      </p>
                      <p className="text-xs text-gray-400 flex-shrink-0">
                        {formatMessageTime(conversation.lastMessageTime)}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 truncate">
                      {conversation.lastMessage || t('No messages yet')}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`
        ${showMobileChat ? 'flex' : 'hidden'} 
        lg:flex flex-col flex-1 bg-gray-900/50
      `}>
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm">
              <div className="flex items-center">
                <button
                  onClick={handleBackToList}
                  className="lg:hidden mr-3 p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <FiArrowLeft className="text-lg text-gray-400" />
                </button>
                <div className="flex items-center">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {activeUserData?.profileImage ? (
                        <Image
                          src={activeUserData.profileImage}
                          alt={activeName}
                          width={40}
                          height={40}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        activeName?.split(' ').map(n => n[0]).join('').toUpperCase()
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-gray-900 rounded-full"></div>
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-white">{activeName}</p>
                    <p className="text-xs text-green-400">{t('Online')}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                  <FiPhone className="text-lg text-gray-400" />
                </button>
                <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                  <FiVideo className="text-lg text-gray-400" />
                </button>
                <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                  <FiMoreVertical className="text-lg text-gray-400" />
                </button>
              </div>
            </div>
            
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FiMessageCircle className="text-2xl text-gray-500" />
                    </div>
                    <p className="text-gray-400 mb-2">{t('No messages yet')}</p>
                    <p className="text-sm text-gray-500">{t('Start the conversation!')}</p>
                  </div>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isOwn = message.senderId === user.id;
                  const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId;
                  
                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}
                    >
                      <div className={`flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end max-w-xs lg:max-w-md`}>
                        {!isOwn && showAvatar && (
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-semibold mr-2 flex-shrink-0">
                            {activeUserData?.profileImage ? (
                              <Image
                                src={activeUserData.profileImage}
                                alt={activeName}
                                width={32}
                                height={32}
                                className="rounded-full object-cover"
                              />
                            ) : (
                              activeName?.split(' ').map(n => n[0]).join('').toUpperCase()
                            )}
                          </div>
                        )}
                        {!isOwn && !showAvatar && <div className="w-8 mr-2"></div>}
                        
                        <div className={`
                          relative px-4 py-2 rounded-2xl max-w-full break-words
                          ${isOwn 
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                            : 'bg-gray-800 text-white'
                          }
                          ${isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'}
                        `}>
                          {message.imageUrl && (
                            <div className="mb-2">
                              <Image
                                src={message.imageUrl}
                                alt="Shared image"
                                width={200}
                                height={200}
                                className="rounded-lg object-cover max-w-full h-auto"
                              />
                            </div>
                          )}
                          {message.message && (
                            <p className="text-sm">{message.message}</p>
                          )}
                          <p className={`text-xs mt-1 ${isOwn ? 'text-purple-100' : 'text-gray-400'}`}>
                            {formatMessageTime(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Image Preview */}
            {previewUrl && (
              <div className="border-t border-gray-800 p-4 bg-gray-900/50">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-white">{t('Image Preview')}</p>
                  <button
                    onClick={cancelImageUpload}
                    className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <FiX className="text-lg text-gray-400" />
                  </button>
                </div>
                <div className="relative bg-gray-800 rounded-lg overflow-hidden w-20 h-20">
                  <Image
                    src={previewUrl}
                    alt={t('Upload preview')}
                    fill
                    className="object-cover"
                  />
                </div>
                {uploadError && (
                  <p className="text-red-400 text-xs mt-2">{uploadError}</p>
                )}
              </div>
            )}
            
            {/* Message Input */}
            <div className="border-t border-gray-800 p-4 bg-gray-900/80 backdrop-blur-sm">
              <form onSubmit={sendMessage} className="flex items-end space-x-3">
                <div className="flex-1 relative">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(e);
                      }
                    }}
                    placeholder={t('Type a message...')}
                    rows={1}
                    className="w-full px-4 py-3 pr-24 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none transition-all duration-200"
                    style={{ minHeight: '48px', maxHeight: '120px' }}
                  />
                  <div className="absolute right-2 bottom-2 flex items-center space-x-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                      disabled={isUploading}
                    >
                      <FiPaperclip className="text-lg text-gray-400" />
                    </button>
                    <button
                      type="button"
                      className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <FiSmile className="text-lg text-gray-400" />
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={(!newMessage.trim() && !selectedImage) || isLoading || isUploading}
                  className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
                >
                  {isLoading || isUploading ? (
                    <FiLoader className="text-lg animate-spin" />
                  ) : (
                    <FiSend className="text-lg" />
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-8">
              <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <FiMessageCircle className="text-3xl text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{t('Select a conversation')}</h3>
              <p className="text-gray-400 max-w-md">
                {t('Choose from your existing conversations or search for a new user to start chatting')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
