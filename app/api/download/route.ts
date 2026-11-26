import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { modalEndpoint, modalHeaders, validRenderId } from '@/lib/modalGateway';
import { renderForUser } from '@/lib/studioAccount';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Sign in to download your renders.' }, { status: 401 });

    const params = req.nextUrl.searchParams;
    const id = params.get('job_id') || params.get('jobId') || '';
    if (!validRenderId(id)) return NextResponse.json({ error: 'Invalid render identifier.' }, { status: 400 });
    const job = await renderForUser(id, userId);
    if (job?.state !== 'completed') return NextResponse.json({ error: 'Render not found.' }, { status: 404 });

    const endpoint = modalEndpoint('download');
    endpoint.searchParams.set('job_id', id);
    endpoint.searchParams.set('type', params.get('type') === 'preview' ? 'preview' : 'master');
    endpoint.searchParams.set('download', String(params.get('download') === 'true'));
    const headers: Record<string, string> = modalHeaders();
    const range = req.headers.get('range');
    if (range) headers.Range = range;
    const response = await fetch(endpoint, { headers, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(30000) });

    if (response.status === 416) {
      const contentRange = response.headers.get('content-range');
      return new NextResponse(null, { status: 416, headers: contentRange ? { 'Content-Range': contentRange } : undefined });
    }
    if (!response.ok || !response.body) {
      return NextResponse.json({ error: 'Rendered media is unavailable.' }, { status: response.status === 404 ? 404 : 502 });
    }
    const outgoing = new Headers({ 'Cache-Control': 'private, no-store' });
    for (const name of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'content-disposition']) {
      const value = response.headers.get(name);
      if (value) outgoing.set(name, value);
    }
    return new NextResponse(response.body, { status: response.status, headers: outgoing });
  } catch (error) {
    console.error('[Render download]', error);
    return NextResponse.json({ error: 'Download is temporarily unavailable.' }, { status: 503 });
  }
}
