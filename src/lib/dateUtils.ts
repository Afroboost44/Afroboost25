import { DateOrTimestamp } from '@/types';

/**
 * Converts a DateOrTimestamp to a JavaScript Date object
 * @param dateOrTimestamp - A Date object or Firestore Timestamp
 * @returns JavaScript Date object
 */
export function toDate(dateOrTimestamp: DateOrTimestamp): Date {
  if (dateOrTimestamp instanceof Date) {
    return dateOrTimestamp;
  }
  // Check if it's a Firestore Timestamp
  if (typeof dateOrTimestamp === 'object' && dateOrTimestamp !== null && 'toDate' in dateOrTimestamp && typeof dateOrTimestamp.toDate === 'function') {
    return dateOrTimestamp.toDate();
  }
  // Fallback to creating a new Date
  return new Date(dateOrTimestamp as any);
}

/**
 * Formats a DateOrTimestamp to a localized date string
 * @param dateOrTimestamp - A Date object or Firestore Timestamp
 * @param locale - Optional locale string (defaults to 'en-US')
 * @returns Formatted date string
 */
export function formatDate(dateOrTimestamp: DateOrTimestamp, locale: string = 'en-US'): string {
  const date = toDate(dateOrTimestamp);
  return date.toLocaleDateString(locale);
}

/**
 * Formats a DateOrTimestamp to a localized date and time string
 * @param dateOrTimestamp - A Date object or Firestore Timestamp
 * @param locale - Optional locale string (defaults to 'en-US')
 * @returns Formatted date and time string
 */
export function formatDateTime(dateOrTimestamp: DateOrTimestamp, locale: string = 'en-US'): string {
  const date = toDate(dateOrTimestamp);
  return date.toLocaleString(locale);
}

/**
 * Formats a DateOrTimestamp to a full date format (e.g., "Monday, January 1, 2023")
 * @param dateOrTimestamp - A Date object or Firestore Timestamp
 * @returns Formatted full date string
 */
export function formatFullDate(dateOrTimestamp: DateOrTimestamp): string {
  const date = toDate(dateOrTimestamp);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

/**
 * Checks if a date is in the future
 * @param dateOrTimestamp - A Date object or Firestore Timestamp
 * @returns Boolean indicating if the date is in the future
 */
export function isFutureDate(dateOrTimestamp: DateOrTimestamp): boolean {
  const date = toDate(dateOrTimestamp);
  return date > new Date();
}

/**
 * Checks if a date is in the past
 * @param dateOrTimestamp - A Date object or Firestore Timestamp
 * @returns Boolean indicating if the date is in the past
 */
export function isPastDate(dateOrTimestamp: DateOrTimestamp): boolean {
  const date = toDate(dateOrTimestamp);
  return date < new Date();
} 