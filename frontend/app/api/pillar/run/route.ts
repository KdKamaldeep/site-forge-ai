/**
 * API Route: Trigger Pillar Generation
 * POST /api/pillar/run
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenantIdFromHeaders } from '@/lib/tenant';
import { triggerRunPillar } from '@/lib/api';

const ADMIN_TOKEN = process.env.ADMIN_ACCESS_TOKEN || 'change-me-in-production';

export async function POST(request: NextRequest) {
  try {
    // Basic auth check
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || request.headers.get('x-admin-token');
    
    if (token !== ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tenantId, domain, count } = body;

    if (!tenantId && !domain) {
      return NextResponse.json({ error: 'tenantId or domain required' }, { status: 400 });
    }

    const result = await triggerRunPillar(domain || tenantId, count);

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Pillar run error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

