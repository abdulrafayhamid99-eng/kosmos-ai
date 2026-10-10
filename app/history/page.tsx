'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ComparisonSlider from '@/components/ComparisonSlider';
import {
  Clock,
  Film,
  Download,
  Trash2,
  Sparkles,
  ExternalLink,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';
import type { HistoryItem } from '@/types';

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedForComparison, setSelectedForComparison] = useState<HistoryItem | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    try {
      const stored = localStorage.getItem('kosmos_video_history');
      if (stored) {
        setHistory(JSON.parse(stored));
      } else {
        // Provide sample starter history if completely empty
        const sampleHistory: HistoryItem[] = [
          {
            id: 'sample-001',
            filename: 'Cinematic_Drone_Sunset.mp4',
            fileSizeFormatted: '48.2 MB',
            originalDuration: '00:14',
            resolution: '4K Ultra HD',
            fps: '120 FPS',
            preset: 'Cinematic Motion (60 FPS - 240 FPS Interpolation)',
            timestamp: new Date(Date.now() - 3600000 * 2).toLocaleString(),
            processingTimeFormatted: '1.42s',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            originalVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          },
          {
            id: 'sample-002',
            filename: 'Mobile_Wildlife_Action.mp4',
            fileSizeFormatted: '18.7 MB',
            originalDuration: '00:08',
            resolution: '8K Cinematic',
            fps: '240 FPS',
            preset: 'Slow-Mo Cinema (120 FPS Extreme Smooth)',
            timestamp: new Date(Date.now() - 3600000 * 24).toLocaleString(),
            processingTimeFormatted: '2.10s',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
            originalVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
          },
        ];
        localStorage.setItem('kosmos_video_history', JSON.stringify(sampleHistory));
        setHistory(sampleHistory);
      }
    } catch (e) {
      console.error('Error loading history:', e);
    }
  };

  const deleteItem = (id: string) => {
    const updated = history.filter((item) => item.id !== id);
    setHistory(updated);
    localStorage.setItem('kosmos_video_history', JSON.stringify(updated));
  };

  const clearAllHistory = () => {
    if (confirm('Are you sure you want to clear your local render history?')) {
      setHistory([]);
      localStorage.removeItem('kosmos_video_history');
    }
  };

  const handleDownload = async (videoUrl: string, filename: string) => {
    const safeName = (filename || 'video.mp4')
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_");
    const downloadFilename = `KosMos_AI_Archive_${safeName}.mp4`;

    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = downloadFilename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    } catch (err) {
      const anchor = document.createElement('a');
      anchor.href = videoUrl;
      anchor.download = downloadFilename;
      anchor.target = '_blank';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    }
  };


  return (
    <div className="min-h-screen flex flex-col bg-[#030712] text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
                Rendering History & Archive
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Locally persisted records of your processed neural upscales and frame interpolations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {history.length > 0 && (
              <button
                onClick={clearAllHistory}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-900/50 text-xs transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear History</span>
              </button>
            )}

            <Link
              href="/"
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-900/30 transition flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>New AI Render</span>
            </Link>
          </div>
        </div>

        {/* List of items */}
        {history.length === 0 ? (
          <div className="my-20 max-w-md mx-auto text-center p-8 rounded-3xl bg-slate-900/40 border border-slate-800">
            <Film className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white font-display">No Rendered Videos Yet</h3>
            <p className="text-xs text-slate-400 mt-1 mb-6">
              Videos processed in the KosMos AI Studio will automatically appear here for instant replay and download.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={loadHistory}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
              >
                Load Demo Archives
              </button>
              <Link
                href="/"
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition"
              >
                Launch Studio
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {history.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/90 hover:border-cyan-500/40 transition group flex flex-col justify-between"
              >
                <div>
                  {/* Video Thumbnail Preview */}
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-slate-800 mb-4 group-hover:border-slate-700 transition">
                    <video
                      src={item.videoUrl}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-bold text-cyan-400 border border-cyan-500/30">
                      {item.resolution} @ {item.fps}
                    </div>
                  </div>

                  {/* Title & Metadata */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="truncate">
                      <h4 className="text-sm font-bold text-white truncate" title={item.filename}>
                        {item.filename}
                      </h4>
                      <p className="text-[11px] text-cyan-400 font-medium mt-0.5 truncate">
                        {item.preset}
                      </p>
                    </div>

                    <button
                      onClick={() => deleteItem(item.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/20 transition flex-shrink-0"
                      title="Remove from history"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Badges Bar */}
                  <div className="grid grid-cols-3 gap-2 mt-4 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Render Time</span>
                      <span className="font-semibold text-slate-300">{item.processingTimeFormatted}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">File Size</span>
                      <span className="font-semibold text-slate-300">{item.fileSizeFormatted || 'Adaptive'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Date</span>
                      <span className="font-semibold text-slate-400 truncate block">{item.timestamp.split(',')[0]}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="mt-5 pt-4 border-t border-slate-800/70 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedForComparison(item)}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Split Inspector</span>
                  </button>

                  <button
                    onClick={() => handleDownload(item.videoUrl, item.filename)}
                    className="flex-1 py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-900/30"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>

      {/* Comparison Modal */}
      {selectedForComparison && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-4xl p-6 bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl cosmic-glow-cyan">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white font-display">
                  Split Comparison: {selectedForComparison.filename}
                </h3>
                <p className="text-xs text-slate-400">
                  Target: {selectedForComparison.resolution} @ {selectedForComparison.fps}
                </p>
              </div>

              <button
                onClick={() => setSelectedForComparison(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ComparisonSlider
              originalVideoSrc={selectedForComparison.originalVideoUrl || selectedForComparison.videoUrl}
              enhancedVideoSrc={selectedForComparison.videoUrl}
              presetName={selectedForComparison.preset}
              resolution={selectedForComparison.resolution}
              fps={selectedForComparison.fps}
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setSelectedForComparison(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:bg-slate-700"
              >
                Close
              </button>
              <button
                onClick={() => handleDownload(selectedForComparison.videoUrl, selectedForComparison.filename)}
                className="px-4 py-2 rounded-xl bg-cyan-600 text-xs font-bold text-white hover:bg-cyan-500 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Video</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
