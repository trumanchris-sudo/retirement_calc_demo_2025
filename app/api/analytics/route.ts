/**
 * Analytics API endpoint
 * Receives Web Vitals and other performance metrics
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const metric = await request.json();

    // Log metric (in production, you'd send to a service like Google Analytics, Datadog, etc.)
    console.log('[Analytics]', metric);

    // TODO: Send to analytics service
    // Examples:
    // - Google Analytics
    // - Datadog
    // - New Relic
    // - Custom logging service

    // For now, just acknowledge receipt
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[Analytics] Error processing metric:', error);
    return NextResponse.json(
      { error: 'Failed to process metric' },
      { status: 500 }
    );
  }
}

// Support GET for health checks
export async function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
