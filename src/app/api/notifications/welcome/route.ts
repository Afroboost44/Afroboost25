import { NextRequest, NextResponse } from 'next/server';
import { userService, notificationService } from '@/lib/database';
import { Notification } from '@/types';

// Welcome email template
const getWelcomeEmailTemplate = (firstName: string, lastName: string) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to AfroBoost!</title>
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
          padding: 40px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
          border-bottom: 2px solid #f0f0f0;
          padding-bottom: 30px;
        }
        .logo {
          font-size: 42px;
          font-weight: bold;
          color: #D91CD2;
          margin-bottom: 20px;
        }
        .welcome-icon {
          font-size: 64px;
          margin-bottom: 20px;
        }
        .welcome-title {
          font-size: 28px;
          font-weight: bold;
          color: #D91CD2;
          margin-bottom: 15px;
        }
        .welcome-subtitle {
          font-size: 18px;
          color: #666;
          margin-bottom: 30px;
        }
        .benefits-section {
          margin: 30px 0;
          padding: 20px;
          background-color: #f8f9fa;
          border-radius: 8px;
        }
        .benefits-title {
          font-size: 20px;
          font-weight: bold;
          color: #333;
          margin-bottom: 20px;
          text-align: center;
        }
        .benefit-item {
          display: flex;
          align-items: center;
          margin-bottom: 15px;
          padding: 10px 0;
        }
        .benefit-icon {
          font-size: 24px;
          margin-right: 15px;
          width: 30px;
        }
        .benefit-text {
          flex: 1;
          font-size: 16px;
          color: #555;
        }
        .cta-section {
          text-align: center;
          margin: 40px 0;
        }
        .cta-button {
          display: inline-block;
          background-color: #D91CD2;
          color: white;
          padding: 15px 40px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: bold;
          font-size: 18px;
          transition: background-color 0.3s;
          margin: 0 10px 10px 0;
        }
        .cta-button:hover {
          background-color: #B515A8;
        }
        .cta-button.secondary {
          background-color: #6c757d;
        }
        .cta-button.secondary:hover {
          background-color: #5a6268;
        }
        .footer {
          margin-top: 50px;
          padding-top: 30px;
          border-top: 1px solid #e0e0e0;
          text-align: center;
          color: #666;
          font-size: 14px;
        }
        .footer a {
          color: #D91CD2;
          text-decoration: none;
        }
        .social-links {
          margin: 20px 0;
        }
        .social-links a {
          display: inline-block;
          margin: 0 10px;
          color: #D91CD2;
          font-size: 18px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">AfroBoost</div>
          <div class="welcome-icon">🎉</div>
        </div>
        
        <div class="welcome-title">Welcome to AfroBoost, ${firstName}!</div>
        <div class="welcome-subtitle">
          We're excited to have you join our vibrant dance community. Get ready to boost your dance skills and connect with amazing instructors and fellow dancers!
        </div>
        
        <div class="benefits-section">
          <div class="benefits-title">What You Can Do Now:</div>
          
          <div class="benefit-item">
            <div class="benefit-icon">🎯</div>
            <div class="benefit-text">
              <strong>Explore Courses:</strong> Browse our wide range of dance classes from beginner to advanced levels
            </div>
          </div>
          
          <div class="benefit-item">
            <div class="benefit-icon">👨‍🏫</div>
            <div class="benefit-text">
              <strong>Connect with Coaches:</strong> Find the perfect instructor to guide your dance journey
            </div>
          </div>
          
          <div class="benefit-item">
            <div class="benefit-icon">💬</div>
            <div class="benefit-text">
              <strong>Join Community:</strong> Chat with other dancers and share your experience
            </div>
          </div>
          
          <div class="benefit-item">
            <div class="benefit-icon">🎁</div>
            <div class="benefit-text">
              <strong>Referral Program:</strong> Invite friends and earn credits for every successful referral
            </div>
          </div>
          
          <div class="benefit-item">
            <div class="benefit-icon">💳</div>
            <div class="benefit-text">
              <strong>Flexible Payment:</strong> Pay per session, use tokens, or get a subscription
            </div>
          </div>
          
          <div class="benefit-item">
            <div class="benefit-icon">📊</div>
            <div class="benefit-text">
              <strong>Track Progress:</strong> Monitor your dance journey and skill development
            </div>
          </div>
        </div>
        
        <div class="cta-section">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://afroboost.com'}/dashboard" class="cta-button">
            Go to Dashboard
          </a>
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://afroboost.com'}/courses" class="cta-button secondary">
            Browse Courses
          </a>
        </div>
        
        <div class="footer">
          <p>Welcome to the AfroBoost family! 🚀</p>
          <p>If you have any questions, don't hesitate to reach out to our <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://afroboost.com'}/contact">support team</a>.</p>
          
          <div class="social-links">
            <a href="#" title="Follow us on social media">📱</a>
            <a href="#" title="Join our community">👥</a>
            <a href="#" title="Latest updates">📧</a>
          </div>
          
          <p>Happy dancing!</p>
          <p><strong>The AfroBoost Team</strong></p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, referralCode } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
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

    const { firstName, lastName, email } = user;

    // Send welcome email
    try {
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/notifications/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          title: `Welcome to AfroBoost, ${firstName}!`,
          message: `Hi ${firstName},\n\nWelcome to AfroBoost! We're thrilled to have you join our dance community.\n\nYour account has been successfully created and you can now:\n• Browse and book dance courses\n• Connect with professional instructors\n• Join our community chat\n• Track your progress\n• Refer friends and earn credits\n\nReady to start your dance journey? Visit your dashboard to explore all available courses and connect with amazing coaches.\n\nHappy dancing!\nThe AfroBoost Team`,
          type: 'welcome'
        }),
      });

      if (!emailResponse.ok) {
        console.error('Failed to send welcome email:', await emailResponse.text());
      }
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
    }

    // Create welcome notification in dashboard
    try {
      const welcomeNotification: Omit<Notification, 'id'> = {
        userId,
        title: `Welcome to AfroBoost! 🎉`,
        message: `Hi ${firstName}! Your account has been successfully created. Explore courses, connect with coaches, and start your dance journey today!`,
        type: 'welcome',
        read: false,
        createdAt: new Date(),
        priority: 'high'
      };

      await notificationService.create(welcomeNotification);
    } catch (notificationError) {
      console.error('Error creating welcome notification:', notificationError);
    }

    // Send admin notification about new registration
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/notifications/admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'new_registration',
          data: {
            userId,
            firstName,
            lastName,
            email,
            registrationDate: new Date().toISOString(),
            referralCode: referralCode || null
          }
        }),
      });
    } catch (adminNotificationError) {
      console.error('Error sending admin notification:', adminNotificationError);
    }

    return NextResponse.json({
      success: true,
      message: 'Welcome notifications sent successfully'
    });

  } catch (error) {
    console.error('Error sending welcome notifications:', error);
    return NextResponse.json(
      { error: 'Failed to send welcome notifications' },
      { status: 500 }
    );
  }
}