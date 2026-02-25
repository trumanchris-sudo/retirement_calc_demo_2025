/**
 * Analytics API endpoint
 * Receives Web Vitals and other performance metrics
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    let metric;
    try {
      metric = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate metric has required structure
    if (!metric || typeof metric !== 'object') {
      return NextResponse.json(
        { error: 'Metric must be a valid object' },
        { status: 400 }
      );
    }

    // TODO: Send to analytics service
    // In production, send to Google Analytics, Datadog, New Relic, etc.
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
