'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  FiCalendar, 
  FiUsers, 
  FiMail, 
  FiPhone, 
  FiMapPin, 
  FiClock,
  FiCheck,
  FiX,
  FiEye,
  FiTrash2,
  FiExternalLink,
  FiDownload,
  FiEdit3,
  FiSave,
  FiPlus,
  FiSearch,
  FiFilter,
  FiChevronRight,
  FiHome,
  FiMessageSquare
} from 'react-icons/fi';
import Card from '@/components/Card';
import { 
  PartnershipRequest, 
  PartnershipContent, 
  PartnershipMeeting 
} from '@/types';
import { 
  partnershipService, 
  partnershipContentService, 
  partnershipMeetingService 
} from '@/lib/database';

interface AdminPartnershipManagementProps {
  onClose?: () => void;
}

export default function AdminPartnershipManagement({ onClose }: AdminPartnershipManagementProps) {
  // For editing a single opportunity box
  const [editingBox, setEditingBox] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ [key: string]: { title: string; description: string } }>({});
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'requests' | 'meetings' | 'content'>('requests');
  const [requests, setRequests] = useState<PartnershipRequest[]>([]);
  const [meetings, setMeetings] = useState<PartnershipMeeting[]>([]);
  const [content, setContent] = useState<PartnershipContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PartnershipRequest | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [internalNotes, setInternalNotes] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [requestsData, meetingsData, contentData] = await Promise.all([
        partnershipService.getAll(),
        partnershipMeetingService.getAll(),
        partnershipContentService.get()
      ]);
      
      setRequests(requestsData);
      setMeetings(meetingsData);
      setContent(contentData);
    } catch (error) {
      console.error('Error fetching partnership data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      const request = requests.find(r => r.id === requestId);
      if (!request) return;

      // Update request status
      await partnershipService.update(requestId, { status: 'approved' });

      // Create meeting
      const meetingData = {
        partnershipRequestId: requestId,
        title: `Partnership Meeting - ${request.organizationName}`,
        description: `Meeting with ${request.contactName} from ${request.organizationName}`,
        date: request.meetingDate,
        startTime: request.meetingStartTime,
        endTime: request.meetingEndTime,
        attendeeEmail: request.email,
        attendeeName: request.contactName,
        organizationName: request.organizationName,
        status: 'scheduled' as const
      };

      await partnershipMeetingService.create(meetingData);

      // Open Google Calendar
      const title = encodeURIComponent(meetingData.title);
      const details = encodeURIComponent(meetingData.description);
      const location = encodeURIComponent('Online Meeting'); // or actual location
      const startDateTime = new Date(`${request.meetingDate}T${request.meetingStartTime}`);
      const endDateTime = new Date(`${request.meetingDate}T${request.meetingEndTime}`);
      const startFormatted = startDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const endFormatted = endDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const guestEmail = encodeURIComponent(request.email);

      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${startFormatted}/${endFormatted}&add=${guestEmail}`;
      
      window.open(url, '_blank');

      // Refresh data
      fetchData();
      setShowRequestModal(false);
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await partnershipService.update(requestId, { status: 'rejected' });
      fetchData();
      setShowRequestModal(false);
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    try {
      await partnershipMeetingService.delete(meetingId);
      fetchData();
    } catch (error) {
      console.error('Error deleting meeting:', error);
    }
  };

  const handleUpdateContent = async () => {
    if (!content) return;
    
    try {
      await partnershipContentService.update(content);
      setIsEditingContent(false);
    } catch (error) {
      console.error('Error updating content:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-400/10';
      case 'approved': return 'text-green-400 bg-green-400/10';
      case 'rejected': return 'text-red-400 bg-red-400/10';
      case 'scheduled': return 'text-blue-400 bg-blue-400/10';
      case 'completed': return 'text-green-400 bg-green-400/10';
      case 'cancelled': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getPartnershipTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'dance_sports': t('danceAndSportsCourses'),
      'event_organization': t('eventOrganization'),
      'coach_collaboration': t('coachCollaboration'),
      'other': t('other')
    };
    return labels[type] || type;
  };

  const getEntityTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'dance_school': t('danceSchool'),
      'fitness': t('fitness'),
      'association': t('association'),
      'company': t('company'),
      'festival': t('festival'),
      'individual': t('individual'),
      'other': t('other')
    };
    return labels[type] || type;
  };

  // Filter and search functions
  const filteredRequests = requests.filter(request => {
    const matchesSearch = !searchTerm || 
      request.organizationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    
    const matchesDate = dateFilter === 'all' || (() => {
      const requestDate = request.createdAt instanceof Date
        ? request.createdAt
        : typeof request.createdAt?.toDate === 'function'
          ? request.createdAt.toDate()
          : new Date();
      const today = new Date();
      const daysDiff = Math.floor((today.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24));
      switch (dateFilter) {
        case 'today': return daysDiff === 0;
        case 'week': return daysDiff <= 7;
        case 'month': return daysDiff <= 30;
        default: return true;
      }
    })();
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const filteredMeetings = meetings.filter(meeting => {
    const matchesSearch = !searchTerm || 
      meeting.organizationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meeting.attendeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meeting.attendeeEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const handleAddNote = async (requestId: string, note: string) => {
    try {
      // In a real app, you'd save this to the database
      setInternalNotes(prev => ({ ...prev, [requestId]: note }));
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#D91CD2] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center text-sm text-gray-400">
        <FiHome className="mr-2" />
        <span>{t('dashboard')}</span>
        <FiChevronRight className="mx-2" />
        <span className="text-white">{t('partnershipManagement')}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">{t('partnershipManagement')}</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <FiX size={24} />
          </button>
        )}
      </div>

      {/* Search and Filters */}
      {(activeTab === 'requests' || activeTab === 'meetings') && (
        <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('searchRequests')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-primary pl-10 w-full"
              />
              </div>
            </div>
            
            {/* Filters */}
            {activeTab === 'requests' && (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-primary w-full sm:w-auto"
              >
                <option value="all">{t('allStatuses')}</option>
                <option value="pending">{t('pending')}</option>
                <option value="approved">{t('approved')}</option>
                <option value="rejected">{t('rejected')}</option>
              </select>
              
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="input-primary w-full sm:w-auto"
              >
                <option value="all">{t('allDates')}</option>
                <option value="today">{t('today')}</option>
                <option value="week">{t('thisWeek')}</option>
                <option value="month">{t('thisMonth')}</option>
              </select>
              </div>
            )}
            </div>
          
          {/* Filter Results Summary */}
          <div className="mt-3 text-sm text-gray-400">
            {activeTab === 'requests' ? (
              <span>
                {t('showing')} {filteredRequests.length} {t('of')} {requests.length} {t('requests')}
                {searchTerm && ` ${t('for')} "${searchTerm}"`}
              </span>
            ) : (
              <span>
                {t('showing')} {filteredMeetings.length} {t('of')} {meetings.length} {t('meetings')}
                {searchTerm && ` ${t('for')} "${searchTerm}"`}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 bg-gray-800 p-1 rounded-lg">
        {[
          { key: 'requests', label: t('partnershipRequests'), count: filteredRequests.filter(r => r.status === 'pending').length },
          { key: 'meetings', label: t('scheduledMeetings'), count: filteredMeetings.filter(m => m.status === 'scheduled').length },
          { key: 'content', label: t('pageContent') }
        ].map(tab => (
          <button
        key={tab.key}
        onClick={() => setActiveTab(tab.key as any)}
        className={`
          flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all
          ${activeTab === tab.key
            ? 'bg-[#D91CD2] text-white'
            : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }
          w-full sm:w-auto
        `}
        style={{ minWidth: '120px' }}
          >
        <span>{tab.label}</span>
        {'count' in tab && typeof tab.count === 'number' && tab.count > 0 && (
          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
            {tab.count}
          </span>
        )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'requests' && (
          <motion.div
            key="requests"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {filteredRequests.length === 0 ? (
              <Card className="p-8 text-center">
                <FiUsers className="text-gray-400 text-4xl mx-auto mb-4" />
                <p className="text-gray-400">
                  {searchTerm || statusFilter !== 'all' || dateFilter !== 'all' 
                    ? t('noMatchingRequests') 
                    : t('noPartnershipRequests')}
                </p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredRequests.map(request => (
                  <Card key={request.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">
                            {request.organizationName}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {t(request.status)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
                          <div>
                            <p><span className="font-medium">{t('contact')}:</span> {request.contactName}</p>
                            <p><span className="font-medium">{t('email')}:</span> {request.email}</p>
                            {request.phone && (
                              <p><span className="font-medium">{t('phone')}:</span> {request.phone}</p>
                            )}
                            {request.linkedinProfile && (
                              <p className="break-words">
                                <span className="font-medium">{t('linkedinProfile')}:</span>{' '}
                                <a href={request.linkedinProfile} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                  {request.linkedinProfile}
                                </a>
                              </p>
                            )}
                            {request.organizationWebsite && (
                              <p className="break-words">
                                <span className="font-medium">{t('organizationWebsite')}:</span>{' '}
                                <a href={request.organizationWebsite} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                  {request.organizationWebsite}
                                </a>
                              </p>
                            )}
                            {request.attachments && Object.keys(request.attachments).length > 0 && (
                              <div className="mt-3">
                                <span className="font-medium">{t('attachments')}:</span>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {Object.entries(request.attachments).map(([key, attachment], idx) => (
                                    <a
                                      key={key}
                                      href={attachment}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center px-3 py-1 bg-gray-800 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-gray-700 transition-colors text-xs font-medium space-x-2"
                                    >
                                      <FiDownload size={14} />
                                      <span>{t('attachment')} {idx + 1}</span>
                                      <FiExternalLink size={12} />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <div>
                            <p><span className="font-medium">{t('entityType')}:</span> {getEntityTypeLabel(request.entityType)}</p>
                            <p>
                              <span className="font-medium">{t('partnershipType')}:</span>{' '}
                              {request.partnershipType && typeof request.partnershipType === 'object'
                              ? Object.values(request.partnershipType)
                                .map(type => String(getPartnershipTypeLabel(type)))
                                .join(', ')
                              : String(getPartnershipTypeLabel(request.partnershipType))}
                            </p>
                            {request.partnershipTypeOther && (
                              <p><span className="font-medium">{t('otherType')}:</span> {request.partnershipTypeOther}</p>
                            )}
                            <p><span className="font-medium">{t('meetingDate')}:</span> {request.meetingDate} {request.meetingStartTime}-{request.meetingEndTime}</p>
                            {request.danceStyles && (
                              <p><span className="font-medium">{t('danceStyles')}:</span> {request.danceStyles}</p>
                            )}
                            {request.expectedStudents && (
                              <p><span className="font-medium">{t('expectedStudents')}:</span> {request.expectedStudents}</p>
                            )}
                            {request.eventType && (
                              <p><span className="font-medium">{t('eventType')}:</span> {request.eventType}</p>
                            )}
                            {request.expectedAttendees && (
                              <p><span className="font-medium">{t('expectedAttendees')}:</span> {request.expectedAttendees}</p>
                            )}
                            {request.specialization && (
                              <p><span className="font-medium">{t('specialization')}:</span> {request.specialization}</p>
                            )}
                            {request.yearsOfExperience && (
                              <p><span className="font-medium">{t('yearsOfExperience')}:</span> {request.yearsOfExperience}</p>
                            )}
                          </div>
                        </div>
                        
                        {/* Internal Notes */}
                        <div className="mt-4 bg-gray-800/50 p-3 rounded-lg">
                          <div className="flex items-center mb-2">
                            <FiMessageSquare className="mr-2 text-gray-400" size={16} />
                            <span className="text-gray-400 text-sm font-medium">{t('internalNotes')}</span>
                          </div>
                          <textarea
                            value={internalNotes[request.id] || ''}
                            onChange={(e) => setInternalNotes(prev => ({ ...prev, [request.id]: e.target.value }))}
                            placeholder={t('addInternalNote')}
                            rows={2}
                            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#D91CD2] focus:border-transparent"
                          />
                          {internalNotes[request.id] && (
                            <button
                              onClick={() => handleAddNote(request.id, internalNotes[request.id])}
                              className="mt-2 text-xs text-[#D91CD2] hover:text-[#D91CD2]/80"
                            >
                              {t('saveNote')}
                            </button>
                          )}
                        </div>
                      </div>
                      
                        <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => {
                          setSelectedRequest(request);
                          setShowRequestModal(true);
                          }}
                          className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
                          title={t('partnershipViewDetails')}
                        >
                          <FiEye size={18} />
                        </button>
                        
                        {request.status === 'pending' && (
                          <>
                          <button
                            onClick={() => handleApproveRequest(request.id)}
                            className="p-2 text-green-400 hover:text-green-300 transition-colors"
                            title={t('partnershipApprove')}
                          >
                            <FiCheck size={18} />
                          </button>
                          <button
                            onClick={() => handleRejectRequest(request.id)}
                            className="p-2 text-red-400 hover:text-red-300 transition-colors"
                            title={t('reject')}
                          >
                            <FiX size={18} />
                          </button>
                          </>
                        )}

                        {(request.status === 'approved' || request.status === 'rejected') && (
                          <button
                          onClick={async () => {
                            try {
                            await partnershipService.delete(request.id);
                            fetchData();
                            } catch (error) {
                            console.error('Error deleting request:', error);
                            }
                          }}
                          className="p-2 text-red-400 hover:text-red-300 transition-colors"
                          title={t('deleteRequest')}
                          >
                          <FiTrash2 size={18} />
                          </button>
                        )}
                        </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'meetings' && (
          <motion.div
            key="meetings"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {filteredMeetings.length === 0 ? (
              <Card className="p-8 text-center">
                <FiCalendar className="text-gray-400 text-4xl mx-auto mb-4" />
                <p className="text-gray-400">
                  {searchTerm ? t('noMatchingMeetings') : t('noScheduledMeetings')}
                </p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredMeetings.map(meeting => (
                  <Card key={meeting.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{meeting.title}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(meeting.status)}`}>
                            {t(meeting.status)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
                          <div>
                            <p className="flex items-center"><FiCalendar className="mr-2" /> {meeting.date}</p>
                            <p className="flex items-center"><FiClock className="mr-2" /> {meeting.startTime} - {meeting.endTime}</p>
                            {meeting.location && (
                              <p className="flex items-center"><FiMapPin className="mr-2" /> {meeting.location}</p>
                            )}
                          </div>
                          <div>
                            <p className="flex items-center"><FiUsers className="mr-2" /> {meeting.attendeeName}</p>
                            <p className="flex items-center"><FiMail className="mr-2" /> {meeting.attendeeEmail}</p>
                            <p><span className="font-medium">{t('organization')}:</span> {meeting.organizationName}</p>
                          </div>
                        </div>
                        
                        {meeting.description && (
                          <p className="text-gray-300 text-sm mt-3">{meeting.description}</p>
                        )}
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleDeleteMeeting(meeting.id)}
                          className="p-2 text-red-400 hover:text-red-300 transition-colors"
                          title={t('deleteMeeting')}
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'content' && (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {content && (
              <Card className="p-4 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h3 className="text-xl font-semibold text-white">{t('editPageContent')}</h3>
            <button
              onClick={() => isEditingContent ? handleUpdateContent() : setIsEditingContent(true)}
              className={`btn-${isEditingContent ? 'primary' : 'secondary'} flex items-center space-x-2 self-start md:self-auto`}
            >
              {isEditingContent ? (
                <>
            <FiSave size={16} />
            <span>{t('saveChanges')}</span>
                </>
              ) : (
                <>
            <FiEdit3 size={16} />
            <span>{t('editContent')}</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-white font-medium mb-2">{t('pageTitle')}</label>
              {isEditingContent ? (
                <input
            type="text"
            value={content.title}
            onChange={(e) => setContent({ ...content, title: e.target.value })}
            className="input-primary w-full"
                />
              ) : (
                <p className="text-gray-300 break-words">{content.title}</p>
              )}
            </div>

            <div>
              <label className="block text-white font-medium mb-2">{t('pageSubtitle')}</label>
              {isEditingContent ? (
                <textarea
            value={content.subtitle}
            onChange={(e) => setContent({ ...content, subtitle: e.target.value })}
            rows={3}
            className="input-primary resize-none w-full"
                />
              ) : (
                <p className="text-gray-300 break-words">{content.subtitle}</p>
              )}
            </div>

            <div>
              <label className="block text-white font-medium mb-2">{t('partnershipOpportunities')}</label>
              {isEditingContent ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {Object.entries(content.opportunities).map(([key, opportunity]) => (
                      <div key={key} className="bg-gray-800 p-4 rounded-lg flex flex-col gap-3">
                        {editingBox === key ? (
                          <>
                            <input
                              type="text"
                              value={editValues[key]?.title ?? opportunity.title}
                              onChange={e => setEditValues(prev => ({ ...prev, [key]: { ...prev[key], title: e.target.value } }))}
                              placeholder={t('opportunityTitle')}
                              className="input-primary w-full"
                            />
                            <textarea
                              value={editValues[key]?.description ?? opportunity.description}
                              onChange={e => setEditValues(prev => ({ ...prev, [key]: { ...prev[key], description: e.target.value } }))}
                              placeholder={t('opportunityDescription')}
                              rows={3}
                              className="input-primary resize-none w-full"
                            />
                            <div className="flex flex-col sm:flex-row gap-2 mt-2">
                              <button
                                type="button"
                                className="btn-primary flex items-center justify-center space-x-2 flex-1 min-h-[40px]"
                                onClick={() => {
                                  const newOpportunities = { ...content.opportunities };
                                  newOpportunities[key] = {
                                    title: editValues[key]?.title ?? opportunity.title,
                                    description: editValues[key]?.description ?? opportunity.description
                                  };
                                  setContent({ ...content, opportunities: newOpportunities });
                                  setEditingBox(null);
                                }}
                              >
                                <FiSave size={16} /> 
                                <span>{t('saveChanges')}</span>
                              </button>
                              <button
                                type="button"
                                className="btn-secondary flex items-center justify-center space-x-2 flex-1 min-h-[40px]"
                                onClick={() => {
                                  setEditValues(prev => ({ ...prev, [key]: { title: opportunity.title, description: opportunity.description } }));
                                  setEditingBox(null);
                                }}
                              >
                                <FiX size={16} /> 
                                <span>{t('cancel')}</span>
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <h4 className="text-white font-medium mb-2 break-words">{opportunity.title}</h4>
                            <p className="text-gray-300 text-sm break-words flex-1">{opportunity.description}</p>
                            <div className="flex flex-col sm:flex-row gap-2 mt-auto">
                              <button
                                type="button"
                                className="btn-secondary flex items-center justify-center space-x-2 flex-1 min-h-[40px]"
                                onClick={() => {
                                  setEditingBox(key);
                                  setEditValues(prev => ({ ...prev, [key]: { title: opportunity.title, description: opportunity.description } }));
                                }}
                              >
                                <FiEdit3 size={16} /> 
                                <span>{t('edit')}</span>
                              </button>
                              <button
                                type="button"
                                className="btn-danger flex items-center justify-center space-x-2 flex-1 min-h-[40px]"
                                onClick={() => {
                                  const newOpportunities = { ...content.opportunities };
                                  delete newOpportunities[key];
                                  setContent({ ...content, opportunities: newOpportunities });
                                  setEditingBox(null);
                                }}
                              >
                                <FiTrash2 size={16} /> 
                                <span>{t('delete')}</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      const newKey = Date.now().toString();
                      setContent({
                        ...content,
                        opportunities: { ...content.opportunities, [newKey]: { title: '', description: '' } }
                      });
                      setEditingBox(newKey);
                      setEditValues(prev => ({ ...prev, [newKey]: { title: '', description: '' } }));
                    }}
                    className="btn-secondary flex items-center justify-center space-x-2 w-full sm:w-auto self-start"
                  >
                    <FiPlus size={16} />
                    <span>{t('addOpportunity')}</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {Object.values(content.opportunities).map((opportunity: any, index) => (
                    <div key={index} className="bg-gray-800 p-4 rounded-lg">
                      <h4 className="text-white font-medium mb-2 break-words">{opportunity.title}</h4>
                      <p className="text-gray-300 text-sm break-words">{opportunity.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Request Details Modal */}
      <AnimatePresence>
        {showRequestModal && selectedRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowRequestModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white">{t('requestDetails')}</h3>
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <FiX size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-white font-medium mb-3">{t('organizationDetails')}</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-400">{t('organizationName')}:</span> <span className="text-white">{selectedRequest.organizationName}</span></p>
                      <p><span className="text-gray-400">{t('entityType')}:</span> <span className="text-white">{getEntityTypeLabel(selectedRequest.entityType)}</span></p>
                      <p>
                        <span className="text-gray-400">{t('partnershipType')}:</span>
                        <span className="text-white">
                            {selectedRequest.partnershipType && typeof selectedRequest.partnershipType === 'object'
                            ? Object.values(selectedRequest.partnershipType)
                              .map(type => String(getPartnershipTypeLabel(type)))
                              .join(', ')
                            : String(getPartnershipTypeLabel(selectedRequest.partnershipType))}
                        </span>
                      </p>
                      {selectedRequest.partnershipTypeOther && (
                        <p><span className="text-gray-400">{t('otherType')}:</span> <span className="text-white">{selectedRequest.partnershipTypeOther}</span></p>
                      )}
                      {selectedRequest.linkedinProfile && (
                        <p className="break-words"><span className="text-gray-400">{t('linkedinProfile')}:</span> <a className="text-blue-400 hover:underline" href={selectedRequest.linkedinProfile} target="_blank" rel="noopener noreferrer">{selectedRequest.linkedinProfile}</a></p>
                      )}
                      {selectedRequest.organizationWebsite && (
                        <p className="break-words"><span className="text-gray-400">{t('organizationWebsite')}:</span> <a className="text-blue-400 hover:underline" href={selectedRequest.organizationWebsite} target="_blank" rel="noopener noreferrer">{selectedRequest.organizationWebsite}</a></p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-white font-medium mb-3">{t('contactInformation')}</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-400">{t('contactName')}:</span> <span className="text-white">{selectedRequest.contactName}</span></p>
                      <p><span className="text-gray-400">{t('email')}:</span> <span className="text-white">{selectedRequest.email}</span></p>
                      {selectedRequest.phone && (
                        <p><span className="text-gray-400">{t('phone')}:</span> <span className="text-white">{selectedRequest.phone}</span></p>
                      )}
                      {selectedRequest.danceStyles && (
                        <p><span className="text-gray-400">{t('danceStyles')}:</span> <span className="text-white">{selectedRequest.danceStyles}</span></p>
                      )}
                      {selectedRequest.expectedStudents && (
                        <p><span className="text-gray-400">{t('expectedStudents')}:</span> <span className="text-white">{selectedRequest.expectedStudents}</span></p>
                      )}
                      {selectedRequest.eventType && (
                        <p><span className="text-gray-400">{t('eventType')}:</span> <span className="text-white">{selectedRequest.eventType}</span></p>
                      )}
                      {selectedRequest.expectedAttendees && (
                        <p><span className="text-gray-400">{t('expectedAttendees')}:</span> <span className="text-white">{selectedRequest.expectedAttendees}</span></p>
                      )}
                      {selectedRequest.specialization && (
                        <p><span className="text-gray-400">{t('specialization')}:</span> <span className="text-white">{selectedRequest.specialization}</span></p>
                      )}
                      {selectedRequest.yearsOfExperience && (
                        <p><span className="text-gray-400">{t('yearsOfExperience')}:</span> <span className="text-white">{selectedRequest.yearsOfExperience}</span></p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-white font-medium mb-3">{t('meetingSchedule')}</h4>
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <p className="text-white flex items-center"><FiCalendar className="mr-2" /> {selectedRequest.meetingDate}</p>
                    <p className="text-white flex items-center mt-2"><FiClock className="mr-2" /> {selectedRequest.meetingStartTime} - {selectedRequest.meetingEndTime}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-white font-medium mb-3">{t('projectDescription')}</h4>
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <p className="text-gray-300 whitespace-pre-wrap">{selectedRequest.message}</p>
                  </div>
                </div>

                {selectedRequest.status === 'pending' && (
                  <div className="flex space-x-4 pt-4 border-t border-gray-700">
                    <button
                      onClick={() => handleApproveRequest(selectedRequest.id)}
                      className="btn-primary flex items-center space-x-2"
                    >
                      <FiCheck size={16} />
                      <span>{t('partnershipApprove')}</span>
                    </button>
                    <button
                      onClick={() => handleRejectRequest(selectedRequest.id)}
                      className="btn-secondary flex items-center space-x-2"
                    >
                      <FiX size={16} />
                      <span>{t('reject')}</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
