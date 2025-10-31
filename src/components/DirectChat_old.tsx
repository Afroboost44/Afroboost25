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
    if ((!newMessage.trim() && !selectedImage) || !user || !activeConversation || isLoading) return;

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
        senderId: user.id,
        receiverId: activeConversation,
        senderName: `${user.firstName} ${user.lastName}`,
        receiverName: activeName,
        message: messageText,
        imageUrl
      };

      await directMessageService.sendMessage(messageData);
      
      // Add message to the UI immediately
      const tempMessage: DirectMessage = {
        ...messageData,
        id: 'temp-' + Date.now(),
        read: false,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, tempMessage]);
      
      // Reload conversations to update the list
      loadConversations();
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
      return diffInMinutes < 1 ? t('justNow') : `${diffInMinutes}${t('minutesAgo')}`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}${t('hoursAgo')}`;
    } else {
      return messageDate.toLocaleDateString();
    }
  };

  if (!user) {
    return (
      <div className="card text-center py-12">
        <FiMessageCircle className="mx-auto text-4xl text-gray-500 mb-4" />
        <h3 className="text-xl font-semibold mb-2">{t('joinConversation')}</h3>
        <p className="text-gray-400 mb-6">{t('signInToChatWithUsers')}</p>
        <button className="btn-primary">{t('signIn')}</button>
      </div>
    );
  }

  return (
    <div className={`h-[calc(100vh-150px)] flex flex-col md:flex-row ${className}`}>
      {/* Conversations List */}
      <div className="w-full md:w-1/3 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-xl font-semibold mb-4">{t('messages')}</h2>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('searchForUsersByName')}
              className="input-primary w-full pl-10"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="text-gray-400" />
            </div>
          </div>
        </div>
        
        {/* Search Results */}
        <AnimatePresence>
          {searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border-b border-gray-800 overflow-hidden"
            >
              <div className="p-2 bg-gray-900">
                <p className="text-xs text-gray-400 px-2 py-1">{t('searchResults')}</p>
                {searchResults.map(result => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => startConversation(result)}
                    className="flex items-center p-3 hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#D91CD2] flex items-center justify-center mr-3 overflow-hidden">
                      {result.profileImage ? (
                        <Image
                          src={result.profileImage}
                          alt={`${result.firstName} ${result.lastName}`}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-bold">
                          {result.firstName.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{result.firstName} {result.lastName}</p>
                      <p className="text-xs text-gray-400">{result.role}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && conversations.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-[#D91CD2] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">{t('loadingConversations')}</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8">
              <FiMessageCircle className="mx-auto text-4xl text-gray-500 mb-4" />
              <p className="text-gray-400 mb-2">{t('noConversationsYet')}</p>
              <p className="text-sm text-gray-500">{t('searchForUsersToStartChatting')}</p>
            </div>
          ) : (
            <div className="p-2">
              {conversations.map(conversation => (
                <div
                  key={conversation.userId}
                  onClick={() => selectConversation(conversation)}
                  className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                    activeConversation === conversation.userId
                      ? 'bg-[#D91CD2]/20'
                      : 'hover:bg-gray-800'
                  }`}
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center mr-3 overflow-hidden">
                      {conversation.profileImage ? (
                        <Image
                          src={conversation.profileImage}
                          alt={conversation.name}
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-bold">
                          {conversation.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    {conversation.unread > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#D91CD2] rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">{conversation.unread}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="font-medium truncate">{conversation.name}</p>
                      <p className="text-xs text-gray-400">{conversation.lastMessageTime}</p>
                    </div>
                    <p className="text-sm text-gray-400 truncate">{conversation.lastMessage}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3 overflow-hidden">
                  {activeUserData?.profileImage ? (
                    <Image
                      src={activeUserData.profileImage}
                      alt={activeName}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (activeUserData?.role === 'admin' || activeUserData?.role === 'superadmin') && activeUserData?.customEmoji ? (
                    <Image
                      src={activeUserData.customEmoji}
                      alt="Admin Emoji"
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                      (activeUserData?.role === 'admin' || activeUserData?.role === 'superadmin') ? 'bg-purple-600' :
                      activeUserData?.role === 'coach' ? 'bg-[#D91CD2]' : 'bg-gray-700'
                    }`}>
                      {activeName.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-medium flex items-center">
                    {activeName}
                    {(activeUserData?.role === 'admin' || activeUserData?.role === 'superadmin') && (
                      <span className="ml-2 text-xs bg-purple-600 px-1 rounded">{t('admin')}</span>
                    )}
                    {activeUserData?.role === 'coach' && (
                      <span className="ml-2 text-xs bg-[#D91CD2] px-1 rounded">{t('coach')}</span>
                    )}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {isTyping ? t('typing') : t('online')}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <FiMessageCircle className="mx-auto text-4xl text-gray-500 mb-4" />
                  <h4 className="text-lg font-medium mb-2">{t('startConversation')}</h4>
                  <p className="text-gray-400">{t('sendMessageToBeginChatting')}</p>
                </div>
              ) : (
                messages.map(message => {
                  const isCurrentUser = message.senderId === user.id;
                  const hasImage = message.imageUrl && message.imageUrl.length > 0;
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] ${isCurrentUser ? 'order-2' : 'order-1'}`}>
                        <div className={`rounded-2xl p-3 ${
                          isCurrentUser 
                            ? 'bg-gradient-to-r from-[#D91CD2] to-[#7000FF] text-white' 
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
                                  alt="Shared image"
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
                    </div>
                  );
                })
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
            
            {/* Message Input */}
            <form onSubmit={sendMessage} className="border-t border-gray-800 p-4">
              <div className="flex space-x-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={t('typeYourMessage')}
                    className="input-primary w-full pr-10"
                    disabled={isLoading || isUploading}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
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
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-8">
              <FiMessageCircle className="mx-auto text-6xl text-gray-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">{t('selectConversation')}</h3>
              <p className="text-gray-400">
                {t('chooseExistingConversationOrSearch')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}