'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  FiChevronLeft, 
  FiChevronRight, 
  FiClock,
  FiCalendar,
  FiAlertCircle
} from 'react-icons/fi';

interface OccupiedSlot {
  date: string;
  startTime: string;
  endTime: string;
  title: string;
}

interface PartnershipCalendarProps {
  occupiedSlots: OccupiedSlot[];
  onSlotSelect: (date: string, startTime: string, endTime: string) => void;
}

export default function PartnershipCalendar({ occupiedSlots, onSlotSelect }: PartnershipCalendarProps) {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ start: string; end: string } | null>(null);
  const [showTimeSlots, setShowTimeSlots] = useState(false);

  // Generate time slots (9 AM to 6 PM with 1-hour intervals)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour < 18; hour++) {
      const startTime = `${hour.toString().padStart(2, '0')}:00`;
      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
      slots.push({ start: startTime, end: endTime });
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const isDateOccupied = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return occupiedSlots.some(slot => slot.date === dateString);
  };

  const isDatePast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isTimeSlotOccupied = (date: string, startTime: string, endTime: string) => {
    return occupiedSlots.some(slot => 
      slot.date === date && 
      ((startTime >= slot.startTime && startTime < slot.endTime) ||
       (endTime > slot.startTime && endTime <= slot.endTime) ||
       (startTime <= slot.startTime && endTime >= slot.endTime))
    );
  };

  const getOccupiedSlotsForDate = (date: string) => {
    return occupiedSlots.filter(slot => slot.date === date);
  };

  const handleDateSelect = (date: Date) => {
    if (isDatePast(date)) return;
    
    const dateString = date.toISOString().split('T')[0];
    setSelectedDate(dateString);
    setShowTimeSlots(true);
    setSelectedTimeSlot(null);
  };

  const handleTimeSlotSelect = (timeSlot: { start: string; end: string }) => {
    if (isTimeSlotOccupied(selectedDate, timeSlot.start, timeSlot.end)) return;
    
    setSelectedTimeSlot(timeSlot);
    onSlotSelect(selectedDate, timeSlot.start, timeSlot.end);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">{t('selectMeetingDate')}</h3>
        <p className="text-gray-400 text-sm">{t('selectAvailableDateAndTime')}</p>
      </div>

      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={() => navigateMonth('prev')}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <FiChevronLeft size={20} />
        </button>
        
        <h4 className="text-xl font-semibold text-white">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h4>
        
        <button
          type="button"
          onClick={() => navigateMonth('next')}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <FiChevronRight size={20} />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 mb-6">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-gray-400 text-sm py-2 font-medium">
            {t(day.toLowerCase())}
          </div>
        ))}
        
        {/* Calendar days */}
        {days.map((day, index) => {
          if (!day) {
            return <div key={index} className="h-10"></div>;
          }
          
          const isPast = isDatePast(day);
          const isOccupied = isDateOccupied(day);
          const dateString = day.toISOString().split('T')[0];
          const isSelected = selectedDate === dateString;
          
          return (
            <motion.button
              key={index}
              type="button"
              onClick={() => handleDateSelect(day)}
              disabled={isPast}
              whileHover={!isPast ? { scale: 1.05 } : {}}
              whileTap={!isPast ? { scale: 0.95 } : {}}
              className={`
                h-10 rounded-lg text-sm font-medium transition-all relative
                ${isPast 
                  ? 'text-gray-600 cursor-not-allowed' 
                  : isSelected
                  ? 'bg-[#D91CD2] text-white'
                  : isOccupied
                  ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                  : 'text-gray-300 hover:bg-gray-700'
                }
              `}
            >
              {day.getDate()}
              {isOccupied && !isPast && (
                <div className="absolute top-0 right-0 w-2 h-2 bg-yellow-400 rounded-full"></div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs mb-6">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-[#D91CD2] rounded"></div>
          <span className="text-gray-400">{t('selectedDate')}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-yellow-500/30 rounded relative">
            <div className="absolute top-0 right-0 w-1 h-1 bg-yellow-400 rounded-full"></div>
          </div>
          <span className="text-gray-400">{t('partiallyOccupied')}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-gray-600 rounded"></div>
          <span className="text-gray-400">{t('pastDate')}</span>
        </div>
      </div>

      {/* Time Slots */}
      {showTimeSlots && selectedDate && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
          className="border-t border-gray-700 pt-6"
        >
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
            <FiClock className="mr-2" />
            {t('availableTimeSlots')}
          </h4>
          
          {/* Show occupied slots for the selected date */}
          {getOccupiedSlotsForDate(selectedDate).length > 0 && (
            <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-center text-yellow-400 text-sm mb-2">
                <FiAlertCircle className="mr-2" />
                {t('occupiedSlots')}:
              </div>
              {getOccupiedSlotsForDate(selectedDate).map((slot, index) => (
                <div key={index} className="text-yellow-300 text-sm">
                  {slot.startTime} - {slot.endTime}: {slot.title}
                </div>
              ))}
            </div>
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {timeSlots.map((slot, index) => {
              const isOccupied = isTimeSlotOccupied(selectedDate, slot.start, slot.end);
              const isSelected = selectedTimeSlot?.start === slot.start && selectedTimeSlot?.end === slot.end;
              
              return (
                <motion.button
                  key={index}
                  type="button"
                  onClick={() => handleTimeSlotSelect(slot)}
                  disabled={isOccupied}
                  whileHover={!isOccupied ? { scale: 1.02 } : {}}
                  whileTap={!isOccupied ? { scale: 0.98 } : {}}
                  className={`
                    p-3 rounded-lg text-sm font-medium transition-all
                    ${isOccupied
                      ? 'bg-red-500/20 text-red-400 cursor-not-allowed'
                      : isSelected
                      ? 'bg-[#D91CD2] text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }
                  `}
                >
                  {slot.start} - {slot.end}
                  {isOccupied && (
                    <div className="text-xs text-red-300 mt-1">{t('occupied')}</div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
