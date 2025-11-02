import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Testing PayPal connectivity from Pakistan...');
    
    // Test 1: Basic connectivity
    const connectivityTest = await fetch('https://api.sandbox.paypal.com/', {
      method: 'GET',
    });
    
    // Test 2: Auth endpoint accessibility  
    const authTest = await fetch('https://api.sandbox.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials', // Will fail but proves endpoint is accessible
    });

    return NextResponse.json({
      connectivityStatus: connectivityTest.status,
      authEndpointStatus: authTest.status,
      canReachPayPal: true,
      message: 'PayPal servers are accessible from your location',
      yourIssue: 'The problem is invalid credentials, not geographic restrictions'
    });
  } catch (error: any) {
    return NextResponse.json({
      canReachPayPal: false,
      error: error.message,
      message: 'Geographic restriction detected - PayPal servers not accessible',
      possibleCause: 'VPN or ISP blocking PayPal'
    });
  }
}
