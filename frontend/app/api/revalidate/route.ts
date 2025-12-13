/**
 * API Route: Revalidate Pages
 * POST /api/revalidate
 * Secured by secret token
 */

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET || 'change-me-in-production';

export async function POST(request: NextRequest) {
  try {
    // Check secret token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || request.headers.get('x-revalidate-token');

    if (token !== REVALIDATE_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { path, type } = body;

    if (type === 'path' && path) {
      revalidatePath(path);
      return NextResponse.json({ revalidated: true, path });
    }

    if (type === 'tag' && path) {
      revalidatePath(path, 'page');
      return NextResponse.json({ revalidated: true, tag: path });
    }

    return NextResponse.json({ error: 'Invalid type or path' }, { status: 400 });
  } catch (error: any) {
    console.error('Revalidation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

