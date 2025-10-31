import { Server } from 'socket.io';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Server as HTTPServer } from 'http';
import type { Socket as NetSocket } from 'net';

interface SocketServer extends HTTPServer {
  io?: Server;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}

interface ConnectedUser {
  id: string;
  name: string;
  role: string;
  socketId: string;
}

// Store for connected users and their courses
const connectedUsers = new Map<string, ConnectedUser>();
const courseRooms = new Map<string, Set<string>>(); // courseId -> Set of userIds
const userCourses = new Map<string, Set<string>>(); // userId -> Set of courseIds

export default function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (res.socket.server.io) {
    console.log('Socket is already running');
    res.end();
    return;
  }

  console.log('Socket is initializing');
  const io = new Server(res.socket.server, {
    path: '/api/socket',
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? [process.env.NEXTAUTH_URL, process.env.NEXT_PUBLIC_APP_URL].filter((url): url is string => Boolean(url))
        : ["http://localhost:3000"],
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  res.socket.server.io = io;

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle user authentication and registration
    socket.on('authenticate', (authData) => {
      const { userId, userRole, userName } = authData;
      
      if (userId) {
        connectedUsers.set(userId, {
          id: userId,
          name: userName,
          role: userRole,
          socketId: socket.id,
        });

        console.log(`User ${userName} (${userId}) authenticated`);
        
        // Join user to their personal notification room
        socket.join(`user_${userId}`);
        
        // Update online users count for all courses this user might be in
        updateOnlineUsersForAllCourses();
      }
    });

    // Handle joining a course room
    socket.on('join_course', ({ courseId, userId }) => {
      if (!courseId || !userId) return;

      socket.join(`course_${courseId}`);
      
      // Add user to course room tracking
      if (!courseRooms.has(courseId)) {
        courseRooms.set(courseId, new Set());
      }
      courseRooms.get(courseId)!.add(userId);
      
      // Add course to user's courses
      if (!userCourses.has(userId)) {
        userCourses.set(userId, new Set());
      }
      userCourses.get(userId)!.add(courseId);

      console.log(`User ${userId} joined course ${courseId}`);
      
      // Notify course about online users update
      updateOnlineUsersForCourse(courseId);
    });

    // Handle leaving a course room
    socket.on('leave_course', ({ courseId, userId }) => {
      if (!courseId || !userId) return;

      socket.leave(`course_${courseId}`);
      
      // Remove user from course room tracking
      const courseUsers = courseRooms.get(courseId);
      if (courseUsers) {
        courseUsers.delete(userId);
        if (courseUsers.size === 0) {
          courseRooms.delete(courseId);
        }
      }
      
      // Remove course from user's courses
      const courses = userCourses.get(userId);
      if (courses) {
        courses.delete(courseId);
        if (courses.size === 0) {
          userCourses.delete(userId);
        }
      }

      console.log(`User ${userId} left course ${courseId}`);
      
      // Notify course about online users update
      updateOnlineUsersForCourse(courseId);
    });

    // Handle sending messages
    socket.on('send_message', async (messageData) => {
      const { courseId, senderId, senderName, senderRole, message, imageUrl } = messageData;
      
      if (!courseId || !senderId) return;

      const timestamp = new Date();
      const fullMessageData = {
        id: `${Date.now()}_${senderId}`,
        courseId,
        senderId,
        senderName,
        senderRole,
        message,
        imageUrl,
        timestamp,
        likes: 0,
        likedBy: [],
      };

      // Broadcast to all users in the course
      socket.to(`course_${courseId}`).emit('new_message', fullMessageData);
      
      // Create notifications for course participants (except sender)
      const courseUsers = courseRooms.get(courseId);
      if (courseUsers) {
        courseUsers.forEach((userId) => {
          if (userId !== senderId) {
            const notification = {
              id: `notif_${Date.now()}_${userId}`,
              userId,
              type: 'message' as const,
              title: `New message in course`,
              message: `${senderName}: ${message || 'Sent an image'}`,
              data: { courseId, messageId: fullMessageData.id },
              read: false,
              createdAt: timestamp,
            };
            
            // Send real-time notification
            io.to(`user_${userId}`).emit('new_notification', notification);
          }
        });
      }

      console.log(`Message sent in course ${courseId} by ${senderName}`);
    });

    // Handle typing indicators
    socket.on('typing_start', ({ courseId, userId, userName }) => {
      socket.to(`course_${courseId}`).emit('user_typing', {
        userId,
        userName,
        courseId,
        isTyping: true,
      });
    });

    socket.on('typing_stop', ({ courseId, userId, userName }) => {
      socket.to(`course_${courseId}`).emit('user_typing', {
        userId,
        userName,
        courseId,
        isTyping: false,
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      
      // Find and remove the disconnected user
      let disconnectedUserId: string | null = null;
      for (const [userId, userData] of connectedUsers.entries()) {
        if (userData.socketId === socket.id) {
          disconnectedUserId = userId;
          connectedUsers.delete(userId);
          break;
        }
      }

      if (disconnectedUserId) {
        // Remove user from all course rooms
        const userCourseList = userCourses.get(disconnectedUserId);
        if (userCourseList) {
          userCourseList.forEach((courseId) => {
            const courseUsers = courseRooms.get(courseId);
            if (courseUsers) {
              courseUsers.delete(disconnectedUserId!);
              if (courseUsers.size === 0) {
                courseRooms.delete(courseId);
              } else {
                updateOnlineUsersForCourse(courseId);
              }
            }
          });
          userCourses.delete(disconnectedUserId);
        }

        console.log(`User ${disconnectedUserId} disconnected and cleaned up`);
      }
    });

    // Send initial authentication request
    socket.emit('request_auth');
  });

  // Helper function to update online users for a specific course
  function updateOnlineUsersForCourse(courseId: string) {
    const courseUsers = courseRooms.get(courseId);
    const onlineCount = courseUsers ? courseUsers.size : 0;
    
    io.to(`course_${courseId}`).emit('online_users_update', {
      [courseId]: onlineCount,
    });
  }

  // Helper function to update online users for all courses
  function updateOnlineUsersForAllCourses() {
    const onlineUsersCounts: Record<string, number> = {};
    
    courseRooms.forEach((users, courseId) => {
      onlineUsersCounts[courseId] = users.size;
    });
    
    // Broadcast to all connected clients
    io.emit('online_users_update', onlineUsersCounts);
  }

  console.log('Socket server initialized');
  res.end();
}
