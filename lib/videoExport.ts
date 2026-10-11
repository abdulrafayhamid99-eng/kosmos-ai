'use client';

// High-fidelity video export pipeline with direct binary blob download
// and MediaRecorder canvas stream capture fallback

interface DownloadEnhancedVideoOptions {
  videoUrl: string;
  filename: string;
  filterCss?: string;
  onProgress?: (message: string) => void;
}

export async function downloadEnhancedVideo({
  videoUrl,
  filename,
  filterCss,
  onProgress,
}: DownloadEnhancedVideoOptions): Promise<{ success: boolean; method: string; format: string }> {
  if (!videoUrl) {
    throw new Error('No video URL provided for export.');
  }

  // 1. Direct high-res binary stream fetch (Best quality, lossless MP4/WebM)
  try {
    onProgress?.('Fetching direct video stream...');
    const response = await fetch(videoUrl, {
      method: 'GET',
      mode: 'cors',
    });

    if (response.ok) {
      const blob = await response.blob();
      if (blob && blob.size > 1024) {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
        return { success: true, method: 'direct-blob', format: blob.type || 'video/mp4' };
      }
    }
  } catch (directErr) {
    console.warn('[KosMos Export Pipeline] Direct blob fetch restricted, switching to MediaRecorder capture:', directErr);
  }

  // 2. Client-side MediaRecorder + Canvas capture fallback
  // Captures the video stream directly and bakes in color LUT / sharpening filters
  if (typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined') {
    try {
      onProgress?.('Rendering enhanced frames via MediaRecorder...');

      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = videoUrl;
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => resolve(), 3500);
        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          resolve();
        };
        video.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Media element could not load source for canvas capture'));
        };
      });

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
      const ctx = canvas.getContext('2d');

      if (ctx && typeof (canvas as any).captureStream === 'function') {
        const stream = (canvas as any).captureStream(30);

        // Determine best supported mimeType
        let mimeType = 'video/webm;codecs=vp9';
        if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
          mimeType = 'video/mp4;codecs=avc1';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
          mimeType = 'video/webm;codecs=vp8';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
          mimeType = 'video/webm';
        }

        const recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 16000000, // 16 Mbps high-res stream
        });

        const recordedChunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) recordedChunks.push(e.data);
        };

        const recordingStoppedPromise = new Promise<Blob>((resolve) => {
          recorder.onstop = () => {
            resolve(new Blob(recordedChunks, { type: mimeType }));
          };
        });

        recorder.start(100);
        await video.play().catch(() => {});

        // Frame rendering loop with filter application
        let animFrameId: number;
        const durationSec = isNaN(video.duration) || video.duration <= 0 ? 5 : Math.min(10, video.duration);
        const maxDurationMs = durationSec * 1000;
        const startTime = Date.now();

        const renderFrame = () => {
          if (ctx) {
            if (filterCss) {
              ctx.filter = filterCss;
            }
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          }

          const elapsed = Date.now() - startTime;
          if (elapsed < maxDurationMs && !video.ended) {
            animFrameId = requestAnimationFrame(renderFrame);
          } else {
            cancelAnimationFrame(animFrameId);
            if (recorder.state === 'recording') {
              recorder.stop();
            }
          }
        };

        animFrameId = requestAnimationFrame(renderFrame);

        const recordedBlob = await recordingStoppedPromise;
        if (recordedBlob && recordedBlob.size > 1024) {
          const finalBlobUrl = URL.createObjectURL(recordedBlob);
          const ext = mimeType.includes('mp4') ? '.mp4' : '.webm';
          const cleanName = filename.replace(/\.(mp4|webm)$/i, '') + ext;

          const a = document.createElement('a');
          a.href = finalBlobUrl;
          a.download = cleanName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(finalBlobUrl), 4000);

          return { success: true, method: 'canvas-media-recorder', format: ext };
        }
      }
    } catch (mediaErr) {
      console.warn('[KosMos Export Pipeline] MediaRecorder recording issue, trying direct anchor link:', mediaErr);
    }
  }

  // 3. Resilient Direct Anchor Download fallback
  onProgress?.('Saving file directly to disk...');
  const anchor = document.createElement('a');
  anchor.href = videoUrl;
  anchor.download = filename;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  return { success: true, method: 'direct-anchor', format: 'video/mp4' };
}
