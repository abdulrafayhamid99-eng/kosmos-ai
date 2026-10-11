'use client';

// High-fidelity video export pipeline: Downloads genuine AI video files directly to disk
// without silent canvas re-encodings of unenhanced clips.

interface DownloadEnhancedVideoOptions {
  videoUrl: string;
  filename: string;
  filterCss?: string;
  onProgress?: (message: string) => void;
}

export async function downloadEnhancedVideo({
  videoUrl,
  filename,
  onProgress,
}: DownloadEnhancedVideoOptions): Promise<{ success: boolean; method: string; format: string }> {
  if (!videoUrl) {
    throw new Error('No enhanced video URL provided for export.');
  }

  onProgress?.('Fetching genuine AI enhanced video stream...');

  // 1. Direct high-res binary stream fetch (Best quality, lossless MP4 file)
  try {
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
        setTimeout(() => URL.revokeObjectURL(blobUrl), 8000);
        return { success: true, method: 'direct-blob', format: blob.type || 'video/mp4' };
      }
    }
  } catch (directErr) {
    console.warn('[KosMos Export] Direct blob download restricted by CORS/network, using direct anchor download:', directErr);
  }

  // 2. Direct browser anchor download (Downloads exact high-res file from CDN/Replicate)
  onProgress?.('Initiating direct file download...');
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
