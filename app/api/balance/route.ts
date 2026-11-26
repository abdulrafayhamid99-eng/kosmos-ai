import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { balance } from '@/lib/studioAccount';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Sign in to view your credits.' }, { status: 401 });
  try {
    return NextResponse.json({ credits: await balance(userId) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[Account balance]', error);
    return NextResponse.json({ error: 'Balance is temporarily unavailable.' }, { status: 503 });
  }
}
