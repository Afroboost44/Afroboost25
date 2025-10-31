import { NextRequest, NextResponse } from 'next/server';
import { userService, notificationService } from '@/lib/database';
import { Notification, User } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    // Validate required fields
    if (!type || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: type, data' },
        { status: 400 }
      );
    }

    // Get all admin and superadmin users
    const allUsers = await userService.getAll();
    const adminUsers = allUsers.filter(user => user.role === 'admin' || user.role === 'superadmin');
    
    if (!adminUsers || adminUsers.length === 0) {
      return NextResponse.json(
        { message: 'No admin users found' },
        { status: 200 }
      );
    }

    let notificationTitle = '';
    let notificationMessage = '';
    let emailTitle = '';
    let emailMessage = '';

    // Handle different notification types
    switch (type) {
      case 'new_registration':
        const { firstName, lastName, email, registrationDate, referralCode } = data;
        
        notificationTitle = '🎉 New User Registration';
        notificationMessage = `${firstName} ${lastName} (${email}) has joined AfroBoost${referralCode ? ` with referral code: ${referralCode}` : ''}`;
        
        emailTitle = 'New User Registration - AfroBoost';
        emailMessage = `A new user has registered on AfroBoost!\n\nUser Details:\n• Name: ${firstName} ${lastName}\n• Email: ${email}\n• Registration Date: ${new Date(registrationDate).toLocaleString()}${referralCode ? `\n• Referral Code: ${referralCode}` : ''}\n\nThe user has been automatically sent a welcome email and notification.\n\nView the user in the admin dashboard to manage their account.`;
        break;

      case 'referral_pending':
        const { referrerName, newUserName, referralCodeUsed } = data;
        
        notificationTitle = '👥 New Referral Pending Approval';
        notificationMessage = `${referrerName} referred ${newUserName} using code ${referralCodeUsed}. Approval required for reward distribution.`;
        
        emailTitle = 'New Referral Pending Approval - AfroBoost';
        emailMessage = `A new referral is pending approval!\n\nReferral Details:\n• Referrer: ${referrerName}\n• New User: ${newUserName}\n• Referral Code: ${referralCodeUsed}\n\nPlease review and approve/reject this referral in the admin dashboard.`;
        break;

      case 'high_value_transaction':
        const { amount, userEmail, transactionType } = data;
        
        notificationTitle = '💰 High Value Transaction Alert';
        notificationMessage = `High value ${transactionType} of CHF ${amount} by ${userEmail}`;
        
        emailTitle = 'High Value Transaction Alert - AfroBoost';
        emailMessage = `A high value transaction has occurred:\n\nTransaction Details:\n• Type: ${transactionType}\n• Amount: CHF ${amount}\n• User: ${userEmail}\n• Time: ${new Date().toLocaleString()}\n\nPlease review this transaction in the admin dashboard.`;
        break;

      default:
        return NextResponse.json(
          { error: 'Unknown notification type' },
          { status: 400 }
        );
    }

    // Send notifications to all admins
    const results = await Promise.allSettled(
      adminUsers.map(async (admin: User) => {
        // Create dashboard notification
        const notification: Omit<Notification, 'id'> = {
          userId: admin.id,
          title: notificationTitle,
          message: notificationMessage,
          type: 'system',
          read: false,
          createdAt: new Date(),
          priority: type === 'high_value_transaction' ? 'high' : 'medium'
        };

        await notificationService.create(notification);

        // Send email notification if enabled
        if (admin.preferences?.notifications?.email) {
          try {
            const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/notifications/email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: admin.id,
                title: emailTitle,
                message: emailMessage,
                type: 'system'
              }),
            });

            if (!emailResponse.ok) {
              console.error(`Failed to send email to admin ${admin.email}:`, await emailResponse.text());
            }
          } catch (emailError) {
            console.error(`Error sending email to admin ${admin.email}:`, emailError);
          }
        }

        return { adminId: admin.id, success: true };
      })
    );

    // Count successful notifications
    const successful = results.filter((result: any) => 
      result.status === 'fulfilled' && result.value.success
    ).length;

    const failed = results.length - successful;

    return NextResponse.json({
      success: true,
      message: `Admin notifications sent successfully`,
      stats: {
        total: adminUsers.length,
        successful,
        failed
      }
    });

  } catch (error) {
    console.error('Error sending admin notifications:', error);
    return NextResponse.json(
      { error: 'Failed to send admin notifications' },
      { status: 500 }
    );
  }
}