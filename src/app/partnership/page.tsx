'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  FiCalendar, 
  FiUsers, 
  FiStar, 
  FiMapPin, 
  FiMail, 
  FiPhone, 
  FiUpload,
  FiCheck,
  FiClock,
  FiAlertCircle,
  FiX,
  FiLinkedin,
  FiEye,
  FiArrowLeft,
  FiArrowRight,
  FiEdit,
  FiUser,
  FiFileText,
  FiGlobe,
  FiShare2,
  FiCopy
} from 'react-icons/fi';
import { FaBuilding, FaWhatsapp } from 'react-icons/fa';
import Card from '@/components/Card';
import { partnershipService, partnershipContentService } from '@/lib/database';
import { PartnershipRequest, PartnershipContent } from '@/types';
import PartnershipCalendar from '@/components/PartnershipCalendar';

export default function PartnershipPage() {
  const { t } = useTranslation();
  const [content, setContent] = useState<PartnershipContent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [occupiedSlots, setOccupiedSlots] = useState<Array<{ date: string; startTime: string; endTime: string; title: string }>>([]);
  const [socialProfiles, setSocialProfiles] = useState<{ linkedin?: string; website?: string }>({});
  const [showShareModal, setShowShareModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const totalSteps = 6;

  const [formData, setFormData] = useState<Partial<PartnershipRequest>>({
    partnershipType: [],
    partnershipTypeOther: '',
    organizationName: '',
    contactName: '',
    email: '',
    phone: '',
    entityType: '',
    message: '',
    meetingDate: '',
    meetingStartTime: '',
    meetingEndTime: '',
    attachments: []
  });

  const steps = [
    {
      id: 1,
      title: t('partnershipType'),
      subtitle: t('selectPartnershipTypes'),
      icon: FiUsers,
      fields: ['partnershipType', 'partnershipTypeOther']
    },
    {
      id: 2,
      title: t('organizationDetails'),
      subtitle: t('aboutYourOrganization'),
      icon: FaBuilding,
      fields: ['organizationName', 'contactName', 'entityType']
    },
    {
      id: 3,
      title: t('contactInformation'),
      subtitle: t('howCanWeReachYou'),
      icon: FiUser,
      fields: ['email', 'phone']
    },
    {
      id: 4,
      title: t('projectDescription'),
      subtitle: t('tellUsAboutProject'),
      icon: FiFileText,
      fields: ['message']
    },
    {
      id: 5,
      title: t('scheduleMeeting'),
      subtitle: t('pickConvenientTime'),
      icon: FiCalendar,
      fields: ['meetingDate', 'meetingStartTime', 'meetingEndTime']
    },
    {
      id: 6,
      title: t('finalDetails'),
      subtitle: t('additionalInformation'),
      icon: FiGlobe,
      fields: ['attachments']
    }
  ];

  const getCurrentStepProgress = () => {
    return (currentStep / totalSteps) * 100;
  };

  const getStepFieldsCompletion = (stepId: number) => {
    const step = steps.find(s => s.id === stepId);
    if (!step) return 0;
    
    const requiredFields = step.fields.filter(field => {
      // Define which fields are required for each step
      const requiredFieldsList = ['partnershipType', 'organizationName', 'contactName', 'email', 'entityType', 'message', 'meetingDate', 'meetingStartTime', 'meetingEndTime'];
      return requiredFieldsList.includes(field);
    });
    
    const completedFields = requiredFields.filter(field => {
      const value = formData[field as keyof typeof formData];
      return value && (Array.isArray(value) ? value.length > 0 : true);
    });
    
    return requiredFields.length > 0 ? (completedFields.length / requiredFields.length) * 100 : 100;
  };

  useEffect(() => {
    fetchContent();
    fetchOccupiedSlots();
  }, []);

  const validateCurrentStep = useCallback(() => {
    const step = steps.find(s => s.id === currentStep);
    if (!step) return { isValid: true, errors: {} };
    
    const stepErrors: { [key: string]: string } = {};
    
    step.fields.forEach(field => {
      const value = formData[field as keyof typeof formData];
      
      // Check required fields
      const requiredFields = ['partnershipType', 'organizationName', 'contactName', 'email', 'entityType', 'message', 'meetingDate', 'meetingStartTime', 'meetingEndTime'];
      
      if (requiredFields.includes(field)) {
        if (!value || (Array.isArray(value) && value.length === 0)) {
          stepErrors[field] = t('fieldRequired');
        }
      }
      
      // Specific validations
      if (field === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value as string)) {
          stepErrors[field] = t('invalidEmailFormat');
        }
      }
      
      if (field === 'phone' && value) {
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        if (!phoneRegex.test((value as string).replace(/\s/g, ''))) {
          stepErrors[field] = t('invalidPhoneFormat');
        }
      }
      
      if (field === 'meetingDate' && value) {
        const selectedDate = new Date(value as string);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) {
          stepErrors[field] = t('dateCannotBeInPast');
        }
      }
    });
    
    // Check time slot availability for scheduling step
    if (currentStep === 5 && formData.meetingDate && formData.meetingStartTime && formData.meetingEndTime) {
      const conflictingSlot = occupiedSlots.find(slot => 
        slot.date === formData.meetingDate && 
        ((formData.meetingStartTime! >= slot.startTime && formData.meetingStartTime! < slot.endTime) ||
         (formData.meetingEndTime! > slot.startTime && formData.meetingEndTime! <= slot.endTime) ||
         (formData.meetingStartTime! <= slot.startTime && formData.meetingEndTime! >= slot.endTime))
      );
      
      if (conflictingSlot) {
        stepErrors.meetingTime = t('timeSlotOccupied', { time: `${conflictingSlot.startTime}-${conflictingSlot.endTime}` });
      }
    }
    
    return { isValid: Object.keys(stepErrors).length === 0, errors: stepErrors };
  }, [currentStep, formData, occupiedSlots, steps, t]);

  const canProceedToNext = useCallback(() => {
    const validation = validateCurrentStep();
    return validation.isValid;
  }, [validateCurrentStep]);

  const handleNext = () => {
    const validation = validateCurrentStep();
    if (validation.isValid && currentStep < totalSteps) {
      setErrors({}); // Clear errors when moving forward
      setCurrentStep(currentStep + 1);
    } else {
      setErrors(validation.errors); // Set validation errors
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrors({}); // Clear errors when going back
    }
  };

  const goToStep = (stepNumber: number) => {
    if (stepNumber >= 1 && stepNumber <= totalSteps) {
      setCurrentStep(stepNumber);
      setErrors({});
    }
  };

  const fetchContent = async () => {
    try {
      const partnershipContent = await partnershipContentService.get();
      setContent(partnershipContent);
    } catch (error) {
      console.error('Error fetching partnership content:', error);
    }
  };

  const fetchOccupiedSlots = async () => {
    try {
      const slots = await partnershipService.getOccupiedSlots();
      setOccupiedSlots(slots);
    } catch (error) {
      console.error('Error fetching occupied slots:', error);
    }
  };

  const handleInputChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear errors for the changed field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async () => {
    // Final validation before submission
    const validation = validateCurrentStep();
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    
    // Validate all required fields across all steps
    const requiredFields = ['partnershipType', 'organizationName', 'contactName', 'email', 'entityType', 'message', 'meetingDate', 'meetingStartTime', 'meetingEndTime'];
    const finalErrors: { [key: string]: string } = {};
    
    requiredFields.forEach(field => {
      const value = formData[field as keyof typeof formData];
      if (!value || (Array.isArray(value) && value.length === 0)) {
        finalErrors[field] = t('fieldRequired');
      }
    });
    
    if (Object.keys(finalErrors).length > 0) {
      setErrors(finalErrors);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Upload files to Cloudinary if any
      let attachmentUrls: string[] = [];
      if (selectedFiles.length > 0) {
        attachmentUrls = await uploadFilesToCloudinary(selectedFiles);
      }
      
      const requestData: Omit<PartnershipRequest, 'id' | 'createdAt' | 'updatedAt'> = {
        ...(formData as Required<typeof formData>),
        ...(socialProfiles.linkedin ? { linkedinProfile: socialProfiles.linkedin } : {}),
        ...(socialProfiles.website ? { organizationWebsite: socialProfiles.website } : {}),
        attachments: attachmentUrls,
        status: 'pending'
      };
      
      await partnershipService.create(requestData);
      setShowSuccess(true);
      
      // Reset form
      setFormData({
        partnershipType: [],
        partnershipTypeOther: '',
        organizationName: '',
        contactName: '',
        email: '',
        phone: '',
        entityType: '',
        message: '',
        meetingDate: '',
        meetingStartTime: '',
        meetingEndTime: '',
        attachments: []
      });
      setSelectedFiles([]);
      setCurrentStep(1);
      setSocialProfiles({});
      
    } catch (error) {
      console.error('Error submitting partnership request:', error);
      setErrors({ submit: t('submitError') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadFilesToCloudinary = async (files: File[]): Promise<string[]> => {
    const uploadPromises = files.map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'afroboosteur_uploads'); // Configure this in Cloudinary
      
      const response = await fetch('https://api.cloudinary.com/v1_1/dgzsfe5ci/auto/upload', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      return data.secure_url;
    });
    
    return Promise.all(uploadPromises);
  };

  const partnershipTypes = [
    { value: 'dance_sports', label: t('danceAndSportsCourses') },
    { value: 'event_organization', label: t('eventOrganization') },
    { value: 'coach_collaboration', label: t('coachCollaboration') },
    { value: 'other', label: t('other') }
  ];

  const entityTypes = [
    { value: 'dance_school', label: t('danceSchool') },
    { value: 'fitness', label: t('fitness') },
    { value: 'association', label: t('association') },
    { value: 'company', label: t('company') },
    { value: 'festival', label: t('festival') },
    { value: 'individual', label: t('individual') },
    { value: 'other', label: t('other') }
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    files.forEach(file => {
      if (!allowedTypes.includes(file.type)) {
        setErrors(prev => ({ ...prev, files: t('invalidFileType') }));
        return;
      }
      if (file.size > maxSize) {
        setErrors(prev => ({ ...prev, files: t('fileTooLarge') }));
        return;
      }
      validFiles.push(file);
    });

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.files;
        return newErrors;
      });
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Share functionality
  const shareUrl = 'https://afroboost.com/partnership';
  const shareTitle = t('partnershipPageTitle') || 'AfroBoost Partnership - Join Our Community';
  const shareText = t('partnershipShareText') || 'Join AfroBoost as a partner and grow your dance or fitness business with us!';

  const handleShareWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
    window.open(whatsappUrl, '_blank');
    setShowShareModal(false);
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(shareTitle);
    const body = encodeURIComponent(`${shareText}\n\n${shareUrl}`);
    const emailUrl = `mailto:?subject=${subject}&body=${body}`;
    window.open(emailUrl);
    setShowShareModal(false);
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => {
        setCopySuccess(false);
        setShowShareModal(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => {
        setCopySuccess(false);
        setShowShareModal(false);
      }, 2000);
    }
  };

  // Step Components
  const renderStep1 = () => (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#D91CD2]/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <FiUsers className="text-[#D91CD2] text-2xl" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{t('partnershipType')}</h2>
        <p className="text-gray-400">{t('selectPartnershipTypes')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {partnershipTypes.map(type => (
          <label key={type.value} className="relative group cursor-pointer">
            <input
              type="checkbox"
              checked={formData.partnershipType?.includes(type.value) || false}
              onChange={(e) => {
                const currentTypes = formData.partnershipType || [];
                if (e.target.checked) {
                  handleInputChange('partnershipType', [...currentTypes, type.value]);
                } else {
                  handleInputChange('partnershipType', currentTypes.filter(t => t !== type.value));
                }
              }}
              className="sr-only"
            />
            <div className={`
              border-2 rounded-lg p-4 transition-all duration-200
              ${formData.partnershipType?.includes(type.value) 
                ? 'border-[#D91CD2] bg-[#D91CD2]/10' 
                : 'border-gray-600 hover:border-gray-500'
              }
            `}>
              <div className="flex items-center space-x-3">
                <div className={`
                  w-4 h-4 rounded border-2 flex items-center justify-center
                  ${formData.partnershipType?.includes(type.value)
                    ? 'border-[#D91CD2] bg-[#D91CD2]'
                    : 'border-gray-400'
                  }
                `}>
                  {formData.partnershipType?.includes(type.value) && (
                    <FiCheck className="text-white text-xs" />
                  )}
                </div>
                <span className="text-gray-300 font-medium">{type.label}</span>
              </div>
            </div>
          </label>
        ))}
      </div>

      {formData.partnershipType?.includes('other') && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4"
        >
          <input
            type="text"
            placeholder={t('pleaseSpecify')}
            value={formData.partnershipTypeOther || ''}
            onChange={(e) => handleInputChange('partnershipTypeOther', e.target.value)}
            className="input-primary w-full"
          />
        </motion.div>
      )}

      {errors.partnershipType && (
        <p className="text-red-500 text-sm">{errors.partnershipType}</p>
      )}

      {/* Dynamic Fields Based on Partnership Type */}
      <AnimatePresence>
        {formData.partnershipType?.includes('dance_sports') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gray-800/50 p-6 rounded-lg"
          >
            <h4 className="text-white font-medium mb-4 flex items-center">
              <FiUsers className="mr-2" />
              {t('danceSpecificDetails')}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-white font-medium mb-2">
                  {t('danceStyles')}
                </label>
                <input
                  type="text"
                  value={formData.danceStyles || ''}
                  onChange={(e) => handleInputChange('danceStyles', e.target.value)}
                  className="input-primary w-full"
                  placeholder={t('enterDanceStyles')}
                />
              </div>
              <div>
                <label className="block text-white font-medium mb-2">
                  {t('expectedStudents')}
                </label>
                <input
                  type="number"
                  value={formData.expectedStudents || ''}
                  onChange={(e) => handleInputChange('expectedStudents', e.target.value)}
                  className="input-primary w-full"
                  placeholder="0"
                />
              </div>
            </div>
          </motion.div>
        )}

        {formData.partnershipType?.includes('event_organization') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gray-800/50 p-6 rounded-lg"
          >
            <h4 className="text-white font-medium mb-4 flex items-center">
              <FiCalendar className="mr-2" />
              {t('eventDetails')}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-white font-medium mb-2">
                  {t('eventType')}
                </label>
                <select
                  value={formData.eventType || ''}
                  onChange={(e) => handleInputChange('eventType', e.target.value)}
                  className="input-primary w-full"
                >
                  <option value="">{t('selectEventType')}</option>
                  <option value="competition">{t('competition')}</option>
                  <option value="workshop">{t('workshop')}</option>
                  <option value="festival">{t('festival')}</option>
                  <option value="conference">{t('conference')}</option>
                </select>
              </div>
              <div>
                <label className="block text-white font-medium mb-2">
                  {t('expectedAttendees')}
                </label>
                <input
                  type="number"
                  value={formData.expectedAttendees || ''}
                  onChange={(e) => handleInputChange('expectedAttendees', e.target.value)}
                  className="input-primary w-full"
                  placeholder="0"
                />
              </div>
            </div>
          </motion.div>
        )}

        {formData.partnershipType?.includes('coach_collaboration') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gray-800/50 p-6 rounded-lg"
          >
            <h4 className="text-white font-medium mb-4 flex items-center">
              <FiStar className="mr-2" />
              {t('coachCollaborationDetails')}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-white font-medium mb-2">
                  {t('specialization')}
                </label>
                <input
                  type="text"
                  value={formData.specialization || ''}
                  onChange={(e) => handleInputChange('specialization', e.target.value)}
                  className="input-primary w-full"
                  placeholder={t('enterSpecialization')}
                />
              </div>
              <div>
                <label className="block text-white font-medium mb-2">
                  {t('yearsOfExperience')}
                </label>
                <input
                  type="number"
                  value={formData.yearsOfExperience || ''}
                  onChange={(e) => handleInputChange('yearsOfExperience', e.target.value)}
                  className="input-primary w-full"
                  placeholder="0"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#D91CD2]/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <FaBuilding className="text-[#D91CD2] text-2xl" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{t('organizationDetails')}</h2>
        <p className="text-gray-400">{t('aboutYourOrganization')}</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-white font-medium mb-3">
            {t('organizationName')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.organizationName || ''}
            onChange={(e) => handleInputChange('organizationName', e.target.value)}
            className="input-primary w-full"
            placeholder={t('enterOrganizationName')}
          />
          {errors.organizationName && (
            <p className="text-red-500 text-sm mt-1">{errors.organizationName}</p>
          )}
        </div>

        <div>
          <label className="block text-white font-medium mb-3">
            {t('contactName')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.contactName || ''}
            onChange={(e) => handleInputChange('contactName', e.target.value)}
            className="input-primary w-full"
            placeholder={t('enterContactName')}
          />
          {errors.contactName && (
            <p className="text-red-500 text-sm mt-1">{errors.contactName}</p>
          )}
        </div>

        <div>
          <label className="block text-white font-medium mb-3">
            {t('entityType')} <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.entityType || ''}
            onChange={(e) => handleInputChange('entityType', e.target.value)}
            className="input-primary w-full"
          >
            <option value="">{t('selectEntityType')}</option>
            {entityTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          {errors.entityType && (
            <p className="text-red-500 text-sm mt-1">{errors.entityType}</p>
          )}
        </div>
      </div>
    </motion.div>
  );

  const renderStep3 = () => (
    <motion.div
      key="step3"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#D91CD2]/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <FiUser className="text-[#D91CD2] text-2xl" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{t('contactInformation')}</h2>
        <p className="text-gray-400">{t('howCanWeReachYou')}</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-white font-medium mb-3">
            {t('email')} <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="input-primary pl-10 w-full"
              placeholder={t('enterProfessionalEmail')}
            />
          </div>
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email}</p>
          )}
        </div>

        <div>
          <label className="block text-white font-medium mb-3">
            {t('phone')} <span className="text-gray-500">({t('optional')})</span>
          </label>
          <div className="relative">
            <FiPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="input-primary pl-10 w-full"
              placeholder="+1 234 567 8900"
            />
          </div>
          {errors.phone && (
            <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
          )}
        </div>

        {/* Social Media Integration */}
        <div className="bg-gray-800/50 p-6 rounded-lg">
          <h4 className="text-white font-medium mb-4 flex items-center">
            <FiLinkedin className="mr-2" />
            {t('professionalProfiles')} <span className="text-gray-500 ml-2">({t('optional')})</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-white font-medium mb-2">
                {t('linkedinProfile')}
              </label>
              <input
                type="url"
                value={socialProfiles.linkedin || ''}
                onChange={(e) => setSocialProfiles(prev => ({ ...prev, linkedin: e.target.value }))}
                className="input-primary w-full"
                placeholder="https://linkedin.com/in/yourprofile"
              />
            </div>
            <div>
              <label className="block text-white font-medium mb-2">
                {t('organizationWebsite')}
              </label>
              <input
                type="url"
                value={socialProfiles.website || ''}
                onChange={(e) => setSocialProfiles(prev => ({ ...prev, website: e.target.value }))}
                className="input-primary w-full"
                placeholder="https://yourorganization.com"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderStep4 = () => (
    <motion.div
      key="step4"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#D91CD2]/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <FiFileText className="text-[#D91CD2] text-2xl" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{t('projectDescription')}</h2>
        <p className="text-gray-400">{t('tellUsAboutProject')}</p>
      </div>

      <div>
        <label className="block text-white font-medium mb-3">
          {t('projectDescription')} <span className="text-red-500">*</span>
        </label>
        <textarea
          value={formData.message || ''}
          onChange={(e) => handleInputChange('message', e.target.value)}
          rows={8}
          className="input-primary resize-none w-full"
          placeholder={t('describeYourProposal')}
        />
        {errors.message && (
          <p className="text-red-500 text-sm mt-1">{errors.message}</p>
        )}
        <p className="text-gray-500 text-sm mt-2">
          {t('includeProjectDetails')}
        </p>
      </div>
    </motion.div>
  );

  const renderStep5 = () => (
    <motion.div
      key="step5"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#D91CD2]/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <FiCalendar className="text-[#D91CD2] text-2xl" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{t('scheduleMeeting')}</h2>
        <p className="text-gray-400">{t('pickConvenientTime')}</p>
      </div>

      {/* Calendar Component */}
      <PartnershipCalendar 
        occupiedSlots={occupiedSlots}
        onSlotSelect={(date, startTime, endTime) => {
          handleInputChange('meetingDate', date);
          handleInputChange('meetingStartTime', startTime);
          handleInputChange('meetingEndTime', endTime);
        }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-white font-medium mb-2">
            {t('meetingDate')} <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.meetingDate || ''}
            onChange={(e) => handleInputChange('meetingDate', e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="input-primary w-full"
          />
          {errors.meetingDate && (
            <p className="text-red-500 text-sm mt-1">{errors.meetingDate}</p>
          )}
        </div>
        
        <div>
          <label className="block text-white font-medium mb-2">
            {t('partnershipStartTime')} <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            value={formData.meetingStartTime || ''}
            onChange={(e) => handleInputChange('meetingStartTime', e.target.value)}
            className="input-primary w-full"
          />
          {errors.meetingStartTime && (
            <p className="text-red-500 text-sm mt-1">{errors.meetingStartTime}</p>
          )}
        </div>
        
        <div>
          <label className="block text-white font-medium mb-2">
            {t('partnershipEndTime')} <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            value={formData.meetingEndTime || ''}
            onChange={(e) => handleInputChange('meetingEndTime', e.target.value)}
            className="input-primary w-full"
          />
          {errors.meetingEndTime && (
            <p className="text-red-500 text-sm mt-1">{errors.meetingEndTime}</p>
          )}
        </div>
      </div>
      
      {errors.meetingTime && (
        <div className="flex items-center space-x-2 text-red-500 text-sm">
          <FiAlertCircle />
          <span>{errors.meetingTime}</span>
        </div>
      )}
    </motion.div>
  );

  const renderStep6 = () => (
    <motion.div
      key="step6"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#D91CD2]/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <FiGlobe className="text-[#D91CD2] text-2xl" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">{t('finalDetails')}</h2>
        <p className="text-gray-400">{t('additionalInformation')}</p>
      </div>

      {/* File Attachments */}
      <div>
        <label className="block text-white font-medium mb-3">
          {t('attachments')} <span className="text-gray-500">({t('optional')})</span>
        </label>
        <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-gray-500 transition-colors">
          <FiUpload className="text-gray-400 text-4xl mx-auto mb-4" />
          <p className="text-gray-400 mb-2 text-lg">{t('partnershipDragDropFiles')}</p>
          <p className="text-gray-500 text-sm mb-6">
            {t('partnershipSupportedFormats')}: PDF, DOCX, JPG, PNG (Max: 10MB)
          </p>
          <input
            type="file"
            multiple
            accept=".pdf,.docx,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="btn-secondary cursor-pointer inline-flex items-center">
            <FiUpload className="mr-2" />
            {t('selectFiles')}
          </label>
        </div>
        
        {selectedFiles.length > 0 && (
          <div className="mt-6 space-y-3">
            <h4 className="text-white font-medium">{t('selectedFiles')}:</h4>
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FiFileText className="text-gray-400" />
                  <span className="text-gray-300">{file.name}</span>
                  <span className="text-gray-500 text-sm">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-400 transition-colors"
                >
                  <FiX />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {errors.files && (
          <p className="text-red-500 text-sm mt-2">{errors.files}</p>
        )}
      </div>

      {/* Preview Section */}
      <div className="bg-gray-800/50 p-6 rounded-lg">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <FiEye className="mr-2" />
          {t('requestPreview')}
        </h3>
        
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400">{t('organizationName')}:</p>
              <p className="text-white font-medium">{formData.organizationName || '-'}</p>
            </div>
            <div>
              <p className="text-gray-400">{t('contactName')}:</p>
              <p className="text-white font-medium">{formData.contactName || '-'}</p>
            </div>
            <div>
              <p className="text-gray-400">{t('email')}:</p>
              <p className="text-white font-medium">{formData.email || '-'}</p>
            </div>
            {formData.phone && (
              <div>
                <p className="text-gray-400">{t('phone')}:</p>
                <p className="text-white font-medium">{formData.phone}</p>
              </div>
            )}
            <div>
              <p className="text-gray-400">{t('entityType')}:</p>
              <p className="text-white font-medium">{formData.entityType || '-'}</p>
            </div>
          </div>
          
          <div>
            <p className="text-gray-400">{t('partnershipType')}:</p>
            <p className="text-white font-medium">
              {formData.partnershipType?.map(type => 
                partnershipTypes.find(pt => pt.value === type)?.label
              ).join(', ') || '-'}
            </p>
            {formData.partnershipTypeOther && (
              <p className="text-white font-medium mt-1">{t('otherType')}: {formData.partnershipTypeOther}</p>
            )}
          </div>
          
          {/* Dynamic fields preview */}
          {formData.partnershipType?.includes('dance_sports') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.danceStyles && (
                <div>
                  <p className="text-gray-400">{t('danceStyles')}:</p>
                  <p className="text-white font-medium">{formData.danceStyles}</p>
                </div>
              )}
              {formData.expectedStudents && (
                <div>
                  <p className="text-gray-400">{t('expectedStudents')}:</p>
                  <p className="text-white font-medium">{formData.expectedStudents}</p>
                </div>
              )}
            </div>
          )}
          {formData.partnershipType?.includes('event_organization') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.eventType && (
                <div>
                  <p className="text-gray-400">{t('eventType')}:</p>
                  <p className="text-white font-medium">{formData.eventType}</p>
                </div>
              )}
              {formData.expectedAttendees && (
                <div>
                  <p className="text-gray-400">{t('expectedAttendees')}:</p>
                  <p className="text-white font-medium">{formData.expectedAttendees}</p>
                </div>
              )}
            </div>
          )}
          {formData.partnershipType?.includes('coach_collaboration') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.specialization && (
                <div>
                  <p className="text-gray-400">{t('specialization')}:</p>
                  <p className="text-white font-medium">{formData.specialization}</p>
                </div>
              )}
              {formData.yearsOfExperience && (
                <div>
                  <p className="text-gray-400">{t('yearsOfExperience')}:</p>
                  <p className="text-white font-medium">{formData.yearsOfExperience}</p>
                </div>
              )}
            </div>
          )}
          
          <div>
            <p className="text-gray-400">{t('meetingSchedule')}:</p>
            <p className="text-white font-medium">
              {formData.meetingDate && formData.meetingStartTime && formData.meetingEndTime
                ? `${formData.meetingDate} | ${formData.meetingStartTime} - ${formData.meetingEndTime}`
                : '-'
              }
            </p>
          </div>
          
          <div>
            <p className="text-gray-400">{t('projectDescription')}:</p>
            <p className="text-white font-medium">{formData.message || '-'}</p>
          </div>
          
          {(socialProfiles.linkedin || socialProfiles.website) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {socialProfiles.linkedin && (
                <div>
                  <p className="text-gray-400">{t('linkedinProfile')}:</p>
                  <a
                    href={socialProfiles.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0A66C2] hover:underline break-words"
                  >
                    {socialProfiles.linkedin}
                  </a>
                </div>
              )}
              {socialProfiles.website && (
                <div>
                  <p className="text-gray-400">{t('organizationWebsite')}:</p>
                  <a
                    href={socialProfiles.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline break-words"
                  >
                    {socialProfiles.website}
                  </a>
                </div>
              )}
            </div>
          )}
          
          {selectedFiles.length > 0 && (
            <div>
              <p className="text-gray-400">{t('attachments')}:</p>
              <div className="space-y-1">
                {selectedFiles.map((file, index) => (
                  <p key={index} className="text-white font-medium text-xs">
                    {file.name}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-black py-10 mt-16">
        <div className="content-spacing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto text-center"
          >
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiCheck className="text-white text-3xl" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">
              {t('requestSubmittedSuccessfully')}
            </h1>
            <p className="text-gray-400 mb-8 text-lg">
              {t('partnershipRequestConfirmation')}
            </p>
            
            {/* Next Steps */}
            <div className="bg-gray-800 p-6 rounded-lg mb-8 text-left">
              <h3 className="text-xl font-bold text-white mb-4">{t('nextSteps')}</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-[#D91CD2] rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                    <span className="text-white font-bold text-sm">1</span>
                  </div>
                  <p className="text-gray-300">{t('reviewProcess')}</p>
                </div>
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-[#D91CD2] rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                    <span className="text-white font-bold text-sm">2</span>
                  </div>
                  <p className="text-gray-300">{t('responseTimeframe')}</p>
                </div>
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-[#D91CD2] rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                    <span className="text-white font-bold text-sm">3</span>
                  </div>
                  <p className="text-gray-300">{t('meetingScheduling')}</p>
                </div>
              </div>
            </div>
            
            {/* Contact Information */}
            <div className="bg-gray-800/50 p-6 rounded-lg mb-8">
              <h4 className="text-white font-medium mb-3">{t('questionsContact')}</h4>
              <p className="text-gray-400">{t('contactEmail')}: partnerships@afroboosteur.com</p>
              <p className="text-gray-400">{t('responseTime')}: 24-48 {t('hours')}</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowSuccess(false)}
                className="btn-primary"
              >
                {t('submitAnotherRequest')}
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="btn-secondary"
              >
                {t('backToHome')}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-10 mt-12 overflow-x-hidden">
      <div className="content-spacing">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold gradient-text mb-4">
              {content?.title || t('becomePartner')}
            </h1>
            <p className="text-gray-400 text-lg max-w-3xl mx-auto">
              {content?.subtitle || t('partnershipDescription')}
            </p>
          </div>

          {/* Step Progress Indicator */}
          <div className="mb-12 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <span className="text-sm text-gray-400">{t('step')} {currentStep} {t('of')} {totalSteps}</span>
              <span className="text-sm text-[#D91CD2]">{Math.round(getCurrentStepProgress())}% {t('partnershipCompleted')}</span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-800 rounded-full h-3 mb-8 overflow-hidden">
              <motion.div
                className="bg-gradient-to-r from-[#D91CD2] to-[#FF6B00] h-3 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${getCurrentStepProgress()}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {/* Step Indicators */}
            <div className="lg:grid lg:grid-cols-6 lg:gap-4 lg:items-center lg:relative lg:overflow-hidden flex flex-col space-y-4 lg:space-y-0">
              {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              const stepCompletion = getStepFieldsCompletion(step.id);
              
              return (
              <div key={step.id} className="flex lg:flex-col items-center lg:items-center relative">
              <button
                type="button"
                onClick={() => goToStep(step.id)}
                className={`
                w-12 h-12 rounded-full flex items-center justify-center relative transition-all duration-200 lg:mb-2 z-10 flex-shrink-0
                ${isActive 
                ? 'bg-[#D91CD2] text-white' 
                : isCompleted 
                ? 'bg-green-500 text-white' 
                : stepCompletion > 0 
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }
                `}
              >
                {isCompleted ? (
                <FiCheck className="text-lg" />
                ) : (
                <StepIcon className="text-lg" />
                )}
                
                {stepCompletion > 0 && stepCompletion < 100 && !isCompleted && (
                <div className="absolute inset-0 rounded-full border-4 border-orange-500">
                <div 
                className="absolute inset-0 rounded-full border-r-4 border-orange-300"
                style={{ 
                  transform: `rotate(${(stepCompletion / 100) * 360}deg)`,
                  transformOrigin: '50% 50%'
                }}
                />
                </div>
                )}
              </button>
              
              <div className="ml-4 lg:ml-0 lg:text-center">
                <span className={`text-xs lg:text-center leading-tight ${isActive ? 'text-white' : 'text-gray-400'}`}>
                {step.title}
                </span>
                <p className={`text-xs lg:hidden mt-1 ${isActive ? 'text-gray-300' : 'text-gray-500'}`}>
                {step.subtitle}
                </p>
              </div>
              
              {index < steps.length - 1 && (
                <>
                {/* Desktop connector */}
                <div 
                  className={`
                  hidden lg:block absolute h-0.5 top-6 left-1/2 w-full z-0
                  ${isCompleted ? 'bg-green-500' : 'bg-gray-700'}
                  `}
                />
                {/* Mobile connector */}
                <div 
                  className={`
                  lg:hidden absolute w-0.5 h-full left-6 top-12 z-0
                  ${isCompleted ? 'bg-green-500' : 'bg-gray-700'}
                  `}
                />
                </>
              )}
              </div>
              );
              })}
            </div>
          </div>

          {/* Partnership Request Form */}
          <Card className="p-8 overflow-hidden">
            <div className="min-h-[500px] w-full">
              <AnimatePresence mode="wait">
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}
                {currentStep === 4 && renderStep4()}
                {currentStep === 5 && renderStep5()}
                {currentStep === 6 && renderStep6()}
              </AnimatePresence>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-700">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className={`
                  btn-secondary flex items-center min-w-[120px]
                  ${currentStep === 1 ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <FiArrowLeft className="mr-2" />
                {t('previous')}
              </button>

              <div className="flex space-x-4">
                {currentStep < totalSteps ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!canProceedToNext()}
                    className={`
                      btn-primary flex items-center min-w-[120px]
                      ${!canProceedToNext() ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {t('next')}
                    <FiArrowRight className="ml-2" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !canProceedToNext()}
                    className={`
                      btn-primary flex items-center min-w-[120px]
                      ${isSubmitting || !canProceedToNext() ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        {t('partnershipSubmitting')}
                      </>
                    ) : (
                      <>
                        <FiCheck className="mr-2" />
                        {t('submitRequest')}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {errors.submit && (
              <p className="text-red-500 text-sm mt-4 text-center">{errors.submit}</p>
            )}
          </Card>

          {/* Additional Info Sections */}
          {currentStep <= 2 && content?.opportunities && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-12"
            >
              <h2 className="text-2xl font-bold text-white mb-6 text-center">
                {t('partnershipOpportunities')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {content && Object.values(content.opportunities).map((opportunity: any, index) => (
                  <Card key={index} className="p-6 text-center">
                    <div className="w-12 h-12 bg-[#D91CD2]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FiUsers className="text-[#D91CD2] text-xl" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {opportunity.title}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {opportunity.description}
                    </p>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {/* Social Proof Section */}
          {currentStep <= 3 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-12"
            >
              <h2 className="text-2xl font-bold text-white mb-8 text-center">
                {t('successfulPartnerships')}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <FiStar key={i} className="fill-current" />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-300 mb-4 italic">
                    "{t('testimonial1')}"
                  </p>
                  <div className="text-sm">
                    <p className="text-white font-medium">Sarah Johnson</p>
                    <p className="text-gray-400">Dance Academy Director</p>
                  </div>
                </Card>
                
                <Card className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <FiStar key={i} className="fill-current" />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-300 mb-4 italic">
                    "{t('testimonial2')}"
                  </p>
                  <div className="text-sm">
                    <p className="text-white font-medium">Marcus Thompson</p>
                    <p className="text-gray-400">Fitness Center Owner</p>
                  </div>
                </Card>
                
                <Card className="p-6 md:col-span-2 lg:col-span-1">
                  <div className="flex items-center mb-4">
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <FiStar key={i} className="fill-current" />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-300 mb-4 italic">
                    "{t('testimonial3')}"
                  </p>
                  <div className="text-sm">
                    <p className="text-white font-medium">Elena Rodriguez</p>
                    <p className="text-gray-400">Cultural Association President</p>
                  </div>
                </Card>
              </div>
            </motion.div>
          )}

          {/* Share Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-12"
          >
            <Card className="p-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-4">
                {t('shareWithOthers') || 'Share with Others'}
              </h2>
              <p className="text-gray-400 mb-6">
                {t('sharePartnershipPage') || 'Help others discover partnership opportunities with AfroBoost'}
              </p>
              <button
                onClick={() => setShowShareModal(true)}
                className="btn-primary flex items-center mx-auto"
              >
                <FiShare2 className="mr-2" />
                {t('share') || 'Share'}
              </button>
            </Card>
          </motion.div>
        </motion.div>
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-lg p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-[#D91CD2]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiShare2 className="text-[#D91CD2] text-2xl" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {t('sharePartnership') || 'Share Partnership'}
                </h3>
                <p className="text-gray-400 text-sm">
                  {t('chooseShareMethod') || 'Choose how you want to share'}
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleShareWhatsApp}
                  className="w-full flex items-center justify-center space-x-3 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg transition-colors"
                >
                  <FaWhatsapp className="text-xl" />
                  <span>{t('shareViaWhatsApp') || 'Share via WhatsApp'}</span>
                </button>

                <button
                  onClick={handleShareEmail}
                  className="w-full flex items-center justify-center space-x-3 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors"
                >
                  <FiMail className="text-xl" />
                  <span>{t('shareViaEmail') || 'Share via Email'}</span>
                </button>

                <button
                  onClick={handleCopyToClipboard}
                  className={`w-full flex items-center justify-center space-x-3 py-3 px-4 rounded-lg transition-colors ${
                    copySuccess 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                  disabled={copySuccess}
                >
                  {copySuccess ? (
                    <>
                      <FiCheck className="text-xl" />
                      <span>{t('copiedToClipboard') || 'Copied to Clipboard!'}</span>
                    </>
                  ) : (
                    <>
                      <FiCopy className="text-xl" />
                      <span>{t('copyToClipboard') || 'Copy to Clipboard'}</span>
                    </>
                  )}
                </button>
              </div>

              <button
                onClick={() => setShowShareModal(false)}
                className="w-full mt-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                {t('cancel') || 'Cancel'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}