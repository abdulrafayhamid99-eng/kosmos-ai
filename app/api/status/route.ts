import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { modalEndpoint, modalHeaders, validRenderId } from '@/lib/modalGateway';
import { balance, finishRender, renderForUser } from '@/lib/studioAccount';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Sign in to view your renders.' }, { status: 401 });

    const id = req.nextUrl.searchParams.get('job_id') || req.nextUrl.searchParams.get('jobId') || '';
    if (!validRenderId(id)) return NextResponse.json({ error: 'Invalid render identifier.' }, { status: 400 });
    const job = await renderForUser(id, userId);
    if (!job) return NextResponse.json({ error: 'Render not found.' }, { status: 404 });

    const base = { jobId: id, creditCost: job.credits };
    const failed = async () => NextResponse.json({
      ...base, success: false, status: 'failed', error: 'The render failed. Reserved credits were released.',
      availableCredits: await balance(userId),
    });
    if (job.state === 'failed') return failed();

    const endpoint = modalEndpoint('status');
    endpoint.searchParams.set('job_id', id);
    let upstream: Response;
    try {
      upstream = await fetch(endpoint, { headers: modalHeaders(), cache: 'no-store', signal: AbortSignal.timeout(6000), redirect: 'error' });
    } catch {
      return NextResponse.json({ ...base, success: true, status: 'processing', stage: 'Reconnecting to the render worker.' });
    }

    // Allow time for an accepted dispatch to become visible. A worker 404 after
    // this window means the reservation never produced a queued worker job.
    if (upstream.status === 404 && job.state === 'processing' && Date.now() - job.created_at.getTime() > 5 * 60_000) {
      const released = await finishRender(id, userId, 'failed');
      if (released) return failed();
    }
    if (!upstream.ok) return NextResponse.json({ ...base, success: true, status: 'processing' });

    const data = await upstream.json();
    if (data.status === 'failed' && job.state === 'processing') {
      const released = await finishRender(id, userId, 'failed');
      if (released || (await renderForUser(id, userId))?.state === 'failed') return failed();
    }

    if (data.status === 'completed' || data.status === 'succeeded') {
      const completed = await finishRender(id, userId, 'completed');
      if (!completed && (await renderForUser(id, userId))?.state !== 'completed') return failed();
      const master = `/api/download?job_id=${id}&type=master`;
      const preview = `/api/download?job_id=${id}&type=preview`;
      const {
        master_url, master_video_url, masterUrl, masterVideoUrl, download_url, downloadUrl,
        output_url, outputUrl, output, preview_url, previewUrl, video_url, videoUrl,
        stream_url, streamUrl, enhanced_video_url, enhancedVideoUrl,
        master_video_data, preview_video_data, video_base64, ...metadata
      } = data;
      return NextResponse.json({
        ...base, success: true, status: 'completed', progress: 100,
        result: { ...metadata, master_video_url: master, masterUrl: master, downloadUrl: master, preview_url: preview, previewUrl: preview, videoUrl: preview },
        availableCredits: await balance(userId),
      });
    }

    return NextResponse.json({ ...base, success: true, status: 'processing', progress: data.progress, stage: data.stage });
  } catch (error) {
    console.error('[Render status]', error);
    return NextResponse.json({ error: 'Render status is temporarily unavailable.' }, { status: 503 });
  }
}
