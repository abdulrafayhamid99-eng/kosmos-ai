import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Universal video delivery & download route:
 * 1. Serves locally rendered job MP4s by jobId with HTTP 206 Range seeking for HTML5 <video>
 * 2. Provides direct browser attachment download via ?download=true
 * 3. Proxies remote S3 / CDN URLs to avoid browser CORS/cross-origin restrictions
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('job_id') || searchParams.get('jobId');
    const type = (searchParams.get('type') || 'master').toLowerCase();
    const isDownload = searchParams.get('download') === 'true';
    const requestedFilename = searchParams.get('filename');

    // --------------------------------------------------------------------------
    // CASE A: Local Server Job File Delivery & Range Streaming
    // --------------------------------------------------------------------------
    if (jobId) {
      const safeJobId = jobId.replace(/[^a-zA-Z0-9_-]/g, '');
      const safeType = type.includes('preview') ? 'preview' : 'master';

      const candidatePaths = [
        path.join(process.cwd(), '.renders', `${safeJobId}_${safeType}.mp4`),
        path.join(process.cwd(), 'scratch', 'renders', `${safeJobId}_${safeType}.mp4`),
        path.join(process.cwd(), 'public', 'renders', `${safeJobId}_${safeType}.mp4`),
        path.join(process.cwd(), 'scratch', `${safeJobId}_${safeType}.mp4`),
      ];

      let filePath = candidatePaths.find((p) => fs.existsSync(p));

      // Fallback: If preview requested but only master exists, use master
      if (!filePath && safeType === 'preview') {
        const masterCandidates = [
          path.join(process.cwd(), '.renders', `${safeJobId}_master.mp4`),
          path.join(process.cwd(), 'scratch', 'renders', `${safeJobId}_master.mp4`),
          path.join(process.cwd(), 'public', 'renders', `${safeJobId}_master.mp4`),
          path.join(process.cwd(), 'scratch', `${safeJobId}_master.mp4`),
        ];
        filePath = masterCandidates.find((p) => fs.existsSync(p));
      }

      if (!filePath || !fs.existsSync(filePath)) {
        const modalDownloadBase =
          process.env.MODAL_DOWNLOAD_URL ||
          'https://abdulrafayhamid99--kosmos-ai-pipeline-download-video-endpoint.us-east.modal.run';
        const remoteTarget = `${modalDownloadBase}?job_id=${encodeURIComponent(safeJobId)}&type=${encodeURIComponent(safeType)}${isDownload ? '&download=true' : ''}`;

        console.log(`[Download API] File not on local filesystem; streaming from persistent Modal volume: ${remoteTarget}`);

        const forwardHeaders: Record<string, string> = {};
        const range = req.headers.get('range');
        if (range) {
          forwardHeaders['Range'] = range;
        }

        try {
          const modalResp = await fetch(remoteTarget, {
            headers: forwardHeaders,
            cache: 'no-store',
          });

          if (!modalResp.ok || !modalResp.body) {
            console.warn(`[Download API] Modal volume reported HTTP ${modalResp.status} for ${safeJobId}`);
            return NextResponse.json(
              { error: `Rendered video for job ${safeJobId} not found on server or persistent storage volume.` },
              { status: modalResp.status === 404 ? 404 : 502 }
            );
          }

          const responseHeaders = new Headers();
          modalResp.headers.forEach((val, key) => {
            const k = key.toLowerCase();
            if (['content-type', 'content-length', 'content-range', 'accept-ranges', 'content-disposition', 'cache-control'].includes(k)) {
              responseHeaders.set(key, val);
            }
          });
          if (!responseHeaders.has('Accept-Ranges')) {
            responseHeaders.set('Accept-Ranges', 'bytes');
          }

          return new NextResponse(modalResp.body as any, {
            status: modalResp.status,
            headers: responseHeaders,
          });
        } catch (fetchErr: any) {
          console.error(`[Download API] Error proxying video from Modal volume for ${safeJobId}:`, fetchErr);
          return NextResponse.json(
            { error: `Failed to stream video from persistent storage: ${fetchErr?.message || fetchErr}` },
            { status: 502 }
          );
        }
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const cleanFilename = requestedFilename || `KosMos_Enhanced_${safeJobId}_${safeType}.mp4`;

      // A1. Direct attachment download trigger
      if (isDownload) {
        console.log(`[Download API] Serving attachment download: ${cleanFilename} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)`);
        const nodeStream = fs.createReadStream(filePath);
        const webStream = new ReadableStream({
          start(controller) {
            nodeStream.on('data', (chunk) => controller.enqueue(chunk));
            nodeStream.on('end', () => controller.close());
            nodeStream.on('error', (err) => controller.error(err));
          },
          cancel() {
            nodeStream.destroy();
          },
        });

        return new NextResponse(webStream, {
          status: 200,
          headers: {
            'Content-Type': 'video/mp4',
            'Content-Length': fileSize.toString(),
            'Content-Disposition': `attachment; filename="${cleanFilename}"`,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=86400',
          },
        });
      }

      // A2. HTTP 206 Partial Content Range streaming for interactive <video> seeking
      const range = req.headers.get('range');
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize || end >= fileSize) {
          return new NextResponse(null, {
            status: 416,
            headers: {
              'Content-Range': `bytes */${fileSize}`,
            },
          });
        }

        const chunkSize = end - start + 1;
        const nodeStream = fs.createReadStream(filePath, { start, end });
        const webStream = new ReadableStream({
          start(controller) {
            nodeStream.on('data', (chunk) => controller.enqueue(chunk));
            nodeStream.on('end', () => controller.close());
            nodeStream.on('error', (err) => controller.error(err));
          },
          cancel() {
            nodeStream.destroy();
          },
        });

        return new NextResponse(webStream, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize.toString(),
            'Content-Type': 'video/mp4',
            'Cache-Control': 'public, max-age=86400',
          },
        });
      }

      // A3. Standard video/mp4 stream
      const nodeStream = fs.createReadStream(filePath);
      const webStream = new ReadableStream({
        start(controller) {
          nodeStream.on('data', (chunk) => controller.enqueue(chunk));
          nodeStream.on('end', () => controller.close());
          nodeStream.on('error', (err) => controller.error(err));
        },
        cancel() {
          nodeStream.destroy();
        },
      });

      return new NextResponse(webStream, {
        status: 200,
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': fileSize.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // --------------------------------------------------------------------------
    // CASE B: Remote URL Proxy Streaming (S3 / CDN)
    // --------------------------------------------------------------------------
    const videoUrl = searchParams.get('url');
    const filename = requestedFilename || 'kosmos-ai-enhanced.mp4';

    if (!videoUrl) {
      return NextResponse.json(
        { error: 'Missing required parameter: job_id or url' },
        { status: 400 }
      );
    }

    console.log(`[Download Proxy] Streaming master video from: ${videoUrl.slice(0, 60)}... for ${filename}`);

    const upstreamRes = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'KosMos-AI-Studio-Master-Downloader',
      },
    });

    if (!upstreamRes.ok || !upstreamRes.body) {
      console.error(`[Download Proxy] Upstream returned status ${upstreamRes.status}`);
      return NextResponse.json(
        { error: `Upstream storage returned ${upstreamRes.status}` },
        { status: upstreamRes.status }
      );
    }

    const contentType = upstreamRes.headers.get('content-type') || 'video/mp4';
    const contentLength = upstreamRes.headers.get('content-length');

    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'public, max-age=3600',
    };

    if (contentLength) {
      headers['Content-Length'] = contentLength;
    }

    return new NextResponse(upstreamRes.body as any, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error('[Download Route Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to download video file' },
      { status: 500 }
    );
  }
}
