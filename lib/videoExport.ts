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

  const cleanFilename = filename.endsWith('.mp4') ? filename : `${filename}.mp4`;
  onProgress?.('Preparing genuine AI enhanced broadcast master...');

  // 1. Direct Blob URL handling (already a local binary object in memory)
  if (videoUrl.startsWith('blob:')) {
    onProgress?.('Saving rendered video blob...');
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = cleanFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return { success: true, method: 'blob-url', format: 'video/mp4' };
  }

  // 2. Direct Base64 Data URL decoding (handles large serverless payload directly)
  if (videoUrl.startsWith('data:video') || (videoUrl.startsWith('data:') && videoUrl.includes(';base64,'))) {
    onProgress?.('Decoding full broadcast master stream...');
    try {
      const parts = videoUrl.split(';base64,');
      const contentType = parts[0].replace('data:', '') || 'video/mp4';
      const rawBase64 = parts[1].replace(/\s/g, ''); // strip any whitespace/newlines

      // Decode base64 to typed binary chunks (1MB slices, multiple of 4) to prevent memory allocation / call stack overflow
      const chunkSize = 1048576; // 1 MB chunk (guaranteed multiple of 4 for valid base64 slicing)
      const byteArrays: Uint8Array[] = [];
      for (let offset = 0; offset < rawBase64.length; offset += chunkSize) {
        const slice = rawBase64.slice(offset, offset + chunkSize);
        const binaryChunk = atob(slice);
        const chunkLen = binaryChunk.length;
        const chunkBytes = new Uint8Array(chunkLen);
        for (let i = 0; i < chunkLen; i++) {
          chunkBytes[i] = binaryChunk.charCodeAt(i);
        }
        byteArrays.push(chunkBytes);
      }

      const fullBlob = new Blob(byteArrays as BlobPart[], { type: contentType });
      const sizeMb = (fullBlob.size / (1024 * 1024)).toFixed(2);
      console.log(`[KosMos Export] Decoded full binary video blob: ${sizeMb} MB`);

      if (fullBlob.size < 1000) {
        throw new Error('Decoded video file is empty or corrupted.');
      }

      const blobUrl = URL.createObjectURL(fullBlob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = cleanFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 20000);

      return {
        success: true,
        method: 'data-url-binary-blob',
        format: contentType,
      };
    } catch (base64Err) {
      console.warn('[KosMos Export] Base64 array conversion notice, attempting anchor fallback:', base64Err);
    }
  }

  // 3. Direct high-res binary stream fetch (lossless MP4 file)
  try {
    const response = await fetch(videoUrl, {
      method: 'GET',
      mode: 'cors',
    });

    if (response.ok) {
      const blob = await response.blob();
      if (blob && blob.size > 1024) {
        const sizeMb = (blob.size / (1024 * 1024)).toFixed(2);
        console.log(`[KosMos Export] Fetched genuine video blob: ${sizeMb} MB`);
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = cleanFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 20000);
        return { success: true, method: 'direct-blob', format: blob.type || 'video/mp4' };
      }
    }
  } catch (directErr) {
    console.warn('[KosMos Export] Direct blob fetch restricted by CORS or network, trying download proxy...');
  }

  // 4. Server-Side Proxy Download (Bypasses CORS restrictions on S3/Modal CDN and triggers genuine file download)
  if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) {
    try {
      onProgress?.('Streaming master video via secure download channel...');
      const proxyUrl = `/api/download?url=${encodeURIComponent(videoUrl)}&filename=${encodeURIComponent(cleanFilename)}`;
      const proxyRes = await fetch(proxyUrl);
      if (proxyRes.ok) {
        const blob = await proxyRes.blob();
        if (blob && blob.size > 1024) {
          const sizeMb = (blob.size / (1024 * 1024)).toFixed(2);
          console.log(`[KosMos Export] Downloaded via proxy: ${sizeMb} MB`);
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = cleanFilename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 20000);
          return { success: true, method: 'proxy-blob', format: blob.type || 'video/mp4' };
        }
      }
    } catch (proxyErr) {
      console.warn('[KosMos Export] Proxy download fallback error:', proxyErr);
    }
  }

  // 5. Direct browser anchor fallback (Triggers browser download mechanism)
  onProgress?.('Initiating direct file download...');
  const anchor = document.createElement('a');
  anchor.href = videoUrl;
  anchor.download = cleanFilename;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  return { success: true, method: 'direct-anchor', format: 'video/mp4' };
}
