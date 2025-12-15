/**
 * API Route: Revalidate Pages
 * POST /api/revalidate
 * Secured by secret token
 * Supports both path-based and tag-based revalidation
 */

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

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
    const { path, type, tag } = body;

    // Path-based revalidation
    if (type === 'path' && path) {
      revalidatePath(path);
      return NextResponse.json({ revalidated: true, path, type: 'path' });
    }

    // Tag-based revalidation (for cache tags)
    if (type === 'tag' && tag) {
      revalidateTag(tag);
      return NextResponse.json({ revalidated: true, tag, type: 'tag' });
    }

    // Support legacy format
    if (type === 'tag' && path) {
      revalidateTag(path);
      return NextResponse.json({ revalidated: true, tag: path, type: 'tag' });
    }

    return NextResponse.json({ error: 'Invalid type. Use "path" with path or "tag" with tag' }, { status: 400 });
  } catch (error: any) {
    console.error('Revalidation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

