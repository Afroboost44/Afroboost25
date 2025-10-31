import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { userService } from '@/lib/database';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Email configuration interface
interface EmailSettings {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  isEnabled: boolean;
  isConfigured: boolean;
  senderName: string;
}

// Notification email template
const getEmailTemplate = (title: string, message: string, type: string) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'booking': return '#3B82F6'; // Blue
      case 'payment': return '#10B981'; // Green
      case 'course': return '#8B5CF6'; // Purple
      case 'referral': return '#F59E0B'; // Orange
      case 'review': return '#EF4444'; // Red
      case 'session': return '#6366F1'; // Indigo
      default: return '#D91CD2'; // Primary pink
    }
  };

  const getTypeIcon = (type: string, title?: string) => {
    // Check if it's a message notification based on title
    if (title && title.includes('New message from')) {
      return '💬';
    }
    
    switch (type) {
      case 'booking': return '📅';
      case 'payment': return '💳';
      case 'course': return '🎯';
      case 'referral': return '👥';
      case 'review': return '⭐';
      case 'session': return '🕐';
      default: return '📢';
    }
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f8f9fa;
        }
        .container {
          background-color: white;
          border-radius: 12px;
          padding: 30px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #f0f0f0;
          padding-bottom: 20px;
        }
        .logo {
          font-size: 32px;
          font-weight: bold;
          color: #D91CD2;
          margin-bottom: 10px;
        }
        .notification-icon {
          font-size: 48px;
          margin-bottom: 20px;
        }
        .notification-title {
          font-size: 24px;
          font-weight: bold;
          color: ${getTypeColor(type)};
          margin-bottom: 15px;
        }
        .notification-message {
          font-size: 16px;
          color: #555;
          margin-bottom: 30px;
          line-height: 1.6;
        }
        .cta-button {
          display: inline-block;
          background-color: #D91CD2;
          color: white;
          padding: 12px 30px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: bold;
          transition: background-color 0.3s;
        }
        .cta-button:hover {
          background-color: #B515A8;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
          text-align: center;
          color: #666;
          font-size: 14px;
        }
        .footer a {
          color: #D91CD2;
          text-decoration: none;
        }
        .unsubscribe {
          margin-top: 20px;
          font-size: 12px;
          color: #999;
        }
        .timestamp {
          color: #999;
          font-size: 14px;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">AfroBoost</div>
          <div class="notification-icon">${getTypeIcon(type, title)}</div>
        </div>
        
        <div class="notification-title">${title}</div>
        <div class="notification-message">${message}</div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://afroboost.com'}/dashboard" class="cta-button">
            View Dashboard
          </a>
        </div>
        
        <div class="timestamp">
          Sent on ${new Date().toLocaleString()}
        </div>
        
        <div class="footer">
          <p>This notification was sent from <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://afroboost.com'}">AfroBoost</a></p>
          <p>You're receiving this because you have email notifications enabled in your account settings.</p>
          <div class="unsubscribe">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://afroboost.com'}/profile">Update your notification preferences</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Create email transporter
const createTransporter = (config: EmailSettings) => {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.auth.user,
      pass: config.auth.pass
    }
  });
};

// Get email configuration from database
const getEmailConfig = async (): Promise<EmailSettings | null> => {
  try {
    const settingsDoc = await getDoc(doc(db, 'admin_settings', 'email'));
    
    if (!settingsDoc.exists()) {
      return null;
    }

    const settings = settingsDoc.data() as EmailSettings;
    
    if (!settings.isConfigured || !settings.isEnabled) {
      return null;
    }

    return settings;
  } catch (error) {
    console.error('Error fetching email configuration:', error);
    return null;
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, title, message, type = 'system' } = body;

    // Validate required fields
    if (!userId || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, title, message' },
        { status: 400 }
      );
    }

    // Get user details
    const user = await userService.getById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has email notifications enabled
    if (!user.preferences?.notifications?.email) {
      return NextResponse.json(
        { message: 'Email notifications disabled for this user' },
        { status: 200 }
      );
    }

    // Get email configuration from database
    const emailConfig = await getEmailConfig();
    if (!emailConfig) {
      return NextResponse.json(
        { error: 'Email service not configured or disabled' },
        { status: 503 }
      );
    }

    // Create transporter
    const transporter = createTransporter(emailConfig);
    // Prepare email content
    const htmlContent = getEmailTemplate(title, message, type);
    const textContent = `${title}\n\n${message}\n\nSent from AfroBoost\nView your dashboard: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://afroboost.com'}/dashboard`;
    // Send email
    const info = await transporter.sendMail({
      from: {
        name: emailConfig.senderName || 'AfroBoost',
        address: emailConfig.auth.user
      },
      to: user.email,
      subject: `AfroBoost - ${title}`,
      text: textContent,
      html: htmlContent
    });

    console.log('Email sent successfully:', info.messageId);

    return NextResponse.json({
      success: true,
      message: 'Email notification sent successfully',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Error sending email notification:', error);
    return NextResponse.json(
      { error: 'Failed to send email notification' },
      { status: 500 }
    );
  }
}

// GET endpoint to test email configuration
export async function GET() {
  try {
    const emailConfig = await getEmailConfig();
    
    if (!emailConfig) {
      return NextResponse.json({
        configured: false,
        message: 'Email service not configured or disabled'
      });
    }
    
    return NextResponse.json({
      configured: true,
      host: emailConfig.host,
      port: emailConfig.port,
      user: emailConfig.auth.user.replace(/(.{3}).*@/, '$1***@'), // Mask email for security
      senderName: emailConfig.senderName,
      message: 'Email service is configured and ready to use'
    });
  } catch (error) {
    console.error('Error checking email configuration:', error);
    return NextResponse.json(
      { error: 'Email service configuration error' },
      { status: 500 }
    );
  }
}
