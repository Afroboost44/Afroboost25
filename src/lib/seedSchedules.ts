import { Course, CourseSchedule } from '@/types';

export const sampleSchedules: Partial<CourseSchedule>[] = [
  {
    courseId: 'course1',
    title: 'Afrobeat Basics',
    startTime: new Date(2024, 11, 15, 10, 0), // December 15, 2024, 10:00 AM
    endTime: new Date(2024, 11, 15, 11, 30), // December 15, 2024, 11:30 AM
    level: 'beginner',
    location: 'Studio A',
    description: 'Learn the fundamental movements of Afrobeat dance',
    createdBy: 'coach1'
  },
  {
    courseId: 'course2',
    title: 'Hip-Hop Intermediate',
    startTime: new Date(2024, 11, 16, 14, 0), // December 16, 2024, 2:00 PM
    endTime: new Date(2024, 11, 16, 15, 30), // December 16, 2024, 3:30 PM
    level: 'intermediate',
    location: 'Studio B',
    description: 'Take your Hip-Hop skills to the next level',
    createdBy: 'coach2'
  },
  {
    courseId: 'course3',
    title: 'Contemporary Advanced',
    startTime: new Date(2024, 11, 17, 18, 0), // December 17, 2024, 6:00 PM
    endTime: new Date(2024, 11, 17, 19, 30), // December 17, 2024, 7:30 PM
    level: 'advanced',
    location: 'Online',
    description: 'Master advanced contemporary dance techniques',
    createdBy: 'coach3'
  },
  {
    courseId: 'course1',
    title: 'Afrobeat Basics',
    startTime: new Date(2024, 11, 18, 16, 0), // December 18, 2024, 4:00 PM
    endTime: new Date(2024, 11, 18, 17, 30), // December 18, 2024, 5:30 PM
    level: 'beginner',
    location: 'Studio A',
    description: 'Another session for beginners to practice basics',
    createdBy: 'coach1'
  },
  {
    courseId: 'course4',
    title: 'Salsa Night',
    startTime: new Date(2024, 11, 19, 19, 0), // December 19, 2024, 7:00 PM
    endTime: new Date(2024, 11, 19, 21, 0), // December 19, 2024, 9:00 PM
    level: 'all',
    location: 'Main Hall',
    description: 'Join us for an exciting Salsa dancing session',
    createdBy: 'coach4'
  },
  {
    courseId: 'course5',
    title: 'Jazz Fundamentals',
    startTime: new Date(2024, 11, 20, 11, 0), // December 20, 2024, 11:00 AM
    endTime: new Date(2024, 11, 20, 12, 30), // December 20, 2024, 12:30 PM
    level: 'beginner',
    location: 'Studio C',
    description: 'Introduction to Jazz dance movements and techniques',
    createdBy: 'coach5'
  },
  {
    courseId: 'course2',
    title: 'Hip-Hop Freestyle',
    startTime: new Date(2024, 11, 21, 15, 0), // December 21, 2024, 3:00 PM
    endTime: new Date(2024, 11, 21, 16, 30), // December 21, 2024, 4:30 PM
    level: 'intermediate',
    location: 'Studio B',
    description: 'Express yourself through Hip-Hop freestyle',
    createdBy: 'coach2'
  },
  {
    courseId: 'course6',
    title: 'Bachata Passion',
    startTime: new Date(2024, 11, 22, 20, 0), // December 22, 2024, 8:00 PM
    endTime: new Date(2024, 11, 22, 21, 30), // December 22, 2024, 9:30 PM
    level: 'intermediate',
    location: 'Dance Floor',
    description: 'Feel the rhythm and passion of Bachata',
    createdBy: 'coach6'
  }
];

export const seedScheduleData = async () => {
  // This function can be used to seed the database with sample schedules
  // It would need to be called from an admin interface or setup script
  console.log('Sample schedules ready for seeding:', sampleSchedules);
};
