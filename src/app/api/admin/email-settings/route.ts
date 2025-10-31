import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { userService } from '@/lib/database';

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

// GET - Retrieve email settings (admin only)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    // In a real implementation, you'd validate the token here
    // For now, we'll just check if it's provided
    
    const settingsDoc = await getDoc(doc(db, 'admin_settings', 'email'));
    
    if (!settingsDoc.exists()) {
      return NextResponse.json({
        configured: false,
        settings: {
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: {
            user: '',
            pass: ''
          },
          isEnabled: true,
          isConfigured: true,
          senderName: 'AfroBoost'
        }
      });
    }

    const settings = settingsDoc.data() as EmailSettings;
    
    // Don't expose password in response
    const responseSettings = {
      ...settings,
      auth: {
        user: settings.auth.user,
        pass: settings.auth.pass ? '••••••••••••••••' : ''
      }
    };

    return NextResponse.json({
      configured: settings.isConfigured,
      settings: responseSettings
    });

  } catch (error) {
    console.error('Error fetching email settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email settings' },
      { status: 500 }
    );
  }
}

// POST - Update email settings (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { host, port, secure, auth, isEnabled, senderName } = body;
    console.log(request.body)

    // Validate required fields
    if (!host || !port || !auth?.user || !auth?.pass) {
      return NextResponse.json(
        { error: 'Missing required fields: host, port, auth.user, auth.pass' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(auth.user)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate port
    if (typeof port !== 'number' || port < 1 || port > 65535) {
      return NextResponse.json(
        { error: 'Invalid port number' },
        { status: 400 }
      );
    }

    // Test email configuration before saving
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user: auth.user,
          pass: auth.pass
        }
      });

      // Verify connection
      await transporter.verify();
      
      // Send test email
      await transporter.sendMail({
        from: {
          name: senderName || 'AfroBoost',
          address: auth.user
        },
        to: auth.user,
        subject: 'Email Configuration Test - AfroBoost',
        html: `
          <h2>Email Configuration Successful!</h2>
          <p>Your email settings have been configured successfully.</p>
          <p>Host: ${host}</p>
          <p>Port: ${port}</p>
          <p>Security: ${secure ? 'SSL/TLS' : 'STARTTLS'}</p>
          <p>This is a test email sent from AfroBoost.</p>
        `,
        text: `Email Configuration Successful! Your email settings have been configured successfully. Host: ${host}, Port: ${port}, Security: ${secure ? 'SSL/TLS' : 'STARTTLS'}`
      });

    } catch (emailError) {
      console.error('Email configuration test failed:', emailError);
      return NextResponse.json(
        { error: 'Email configuration test failed. Please check your settings.' },
        { status: 400 }
      );
    }

    // Save settings to database
    const emailSettings: EmailSettings = {
      host,
      port,
      secure: Boolean(secure),
      auth: {
        user: auth.user,
        pass: auth.pass // In production, encrypt this password
      },
      isEnabled: Boolean(isEnabled),
      isConfigured: true,
      senderName: senderName || 'AfroBoost'
    };

    await setDoc(doc(db, 'admin_settings', 'email'), emailSettings);

    return NextResponse.json({
      success: true,
      message: 'Email settings saved and tested successfully'
    });

  } catch (error) {
    console.error('Error saving email settings:', error);
    return NextResponse.json(
      { error: 'Failed to save email settings' },
      { status: 500 }
    );
  }
}

// PUT - Test email configuration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { testEmail } = body;

    if (!testEmail) {
      return NextResponse.json(
        { error: 'Test email address is required' },
        { status: 400 }
      );
    }

    // Get current email settings
    const settingsDoc = await getDoc(doc(db, 'admin_settings', 'email'));
    
    if (!settingsDoc.exists()) {
      return NextResponse.json(
        { error: 'Email settings not configured' },
        { status: 400 }
      );
    }

    const settings = settingsDoc.data() as EmailSettings;

    if (!settings.isConfigured) {
      return NextResponse.json(
        { error: 'Email settings not configured' },
        { status: 400 }
      );
    }

    // Send test email
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.secure,
        auth: {
          user: settings.auth.user,
          pass: settings.auth.pass
        }
      });

      await transporter.verify();

      await transporter.sendMail({
        from: {
          name: settings.senderName || 'AfroBoost',
          address: settings.auth.user
        },
        to: testEmail,
        subject: 'Test Email from AfroBoost',
        html: `
          <h2>Test Email Successful!</h2>
          <p>This is a test email from AfroBoost notification system.</p>
          <p>Your email notifications are working correctly!</p>
          <p>Sent at: ${new Date().toLocaleString()}</p>
        `,
        text: `Test Email Successful! This is a test email from AfroBoost notification system. Your email notifications are working correctly! Sent at: ${new Date().toLocaleString()}`
      });

      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully'
      });

    } catch (emailError) {
      console.error('Test email failed:', emailError);
      return NextResponse.json(
        { error: 'Failed to send test email' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error testing email:', error);
    return NextResponse.json(
      { error: 'Failed to test email configuration' },
      { status: 500 }
    );
  }
}
