'use client';

/**
 * Trims/slices video on the client to the target 5-10 second clip window,
 * compressing the payload to ~1.5 - 3 MB and preventing HTTP 413
 * (Request Entity Too Large) serverless limits on Vercel.
 */
export async function trimVideoForCloudProcessing(
  file: File,
  maxDurationSeconds: number = 10,
  onProgress?: (message: string) => void
): Promise<File> {
  // If the file is already small (<= 3.5 MB), no need to re-encode if duration is acceptable
  if (file.size <= 3.5 * 1024 * 1024 && maxDurationSeconds >= 10) {
    return file;
  }

  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return file;
  }

  onProgress?.(`Extracting target ${maxDurationSeconds}s segment for Cloud GPU (< 4MB payload)...`);

  const objectUrl = URL.createObjectURL(file);

  return new Promise<File>((resolve) => {
    const video = document.createElement('video');
    video.src = objectUrl;
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    let isDone = false;
    const cleanup = () => {
      if (!isDone) {
        isDone = true;
        try {
          video.pause();
          video.removeAttribute('src');
          video.load();
          URL.revokeObjectURL(objectUrl);
        } catch (e) {}
      }
    };

    // Failsafe timeout: if browser cannot decode in time, fall back safely
    const timeoutId = setTimeout(() => {
      cleanup();
      console.warn('[KosMos Video Trimmer] Trimming timed out, proceeding with original file');
      resolve(file);
    }, (maxDurationSeconds + 6) * 1000);

    video.onloadedmetadata = async () => {
      try {
        // If the video duration is already under maxDurationSeconds and file is small, keep as-is
        if (video.duration <= maxDurationSeconds && file.size <= 3.8 * 1024 * 1024) {
          clearTimeout(timeoutId);
          cleanup();
          resolve(file);
          return;
        }

        // Check for native video.captureStream
        const stream: MediaStream | null =
          typeof (video as any).captureStream === 'function'
            ? (video as any).captureStream(30)
            : typeof (video as any).mozCaptureStream === 'function'
            ? (video as any).mozCaptureStream(30)
            : null;

        let recorderStream = stream;
        let canvas: HTMLCanvasElement | null = null;
        let ctx: CanvasRenderingContext2D | null = null;

        // If direct video captureStream is not available, render to canvas
        if (!recorderStream) {
          canvas = document.createElement('canvas');
          const maxDim = 1280;
          let w = video.videoWidth || 1280;
          let h = video.videoHeight || 720;
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }
          canvas.width = w;
          canvas.height = h;
          ctx = canvas.getContext('2d');
          if (ctx && typeof canvas.captureStream === 'function') {
            recorderStream = canvas.captureStream(30);
          }
        }

        if (!recorderStream) {
          clearTimeout(timeoutId);
          cleanup();
          resolve(file);
          return;
        }

        // Determine best supported mimeType
        let mimeType = 'video/webm;codecs=vp8';
        if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
          mimeType = 'video/mp4;codecs=avc1';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
          mimeType = 'video/webm;codecs=vp9';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
          mimeType = 'video/webm';
        }

        // Target 2.2 Mbps: 10s = ~2.75 MB, 5s = ~1.4 MB (Strictly below 4.5 MB limit)
        const recorder = new MediaRecorder(recorderStream, {
          mimeType,
          videoBitsPerSecond: 2200000,
        });

        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          clearTimeout(timeoutId);
          cleanup();
          const recordedBlob = new Blob(chunks, { type: mimeType });
          if (recordedBlob.size > 1024) {
            const ext = mimeType.includes('mp4') ? '.mp4' : '.webm';
            const cleanName = file.name.replace(/\.[^/.]+$/, '') + `_${maxDurationSeconds}s_clip` + ext;
            const trimmedFile = new File([recordedBlob], cleanName, { type: mimeType });
            console.log(
              `[KosMos Video Trimmer] Sliced payload from ${(file.size / 1024 / 1024).toFixed(2)} MB to ${(trimmedFile.size / 1024 / 1024).toFixed(2)} MB`
            );
            resolve(trimmedFile);
          } else {
            resolve(file);
          }
        };

        recorder.start(100);

        // Accelerated playback to extract frames rapidly
        video.playbackRate = 1.75;
        await video.play().catch(() => {});

        let animId: number;
        const renderLoop = () => {
          if (ctx && canvas) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          }
          if (video.currentTime >= maxDurationSeconds || video.ended) {
            cancelAnimationFrame(animId);
            if (recorder.state === 'recording') {
              recorder.stop();
            }
          } else {
            animId = requestAnimationFrame(renderLoop);
          }
        };

        if (canvas) {
          animId = requestAnimationFrame(renderLoop);
        } else {
          // Monitor playback for direct stream
          const checkInterval = setInterval(() => {
            if (video.currentTime >= maxDurationSeconds || video.ended) {
              clearInterval(checkInterval);
              if (recorder.state === 'recording') {
                recorder.stop();
              }
            }
          }, 60);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        cleanup();
        console.warn('[KosMos Video Trimmer] Error during client trim:', err);
        resolve(file);
      }
    };

    video.onerror = () => {
      clearTimeout(timeoutId);
      cleanup();
      resolve(file);
    };
  });
}
