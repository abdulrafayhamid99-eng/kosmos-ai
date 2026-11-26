# KosMos AI — Next-Gen AI Video Upscaler & Cinematic Frame Interpolation

KosMos AI is a state-of-the-art neural video enhancement platform engineered for digital cinematographers, VFX editors, and content creators. It elevates footage up to **8K Cinematic clarity** and converts output cadence up to **240 FPS** by frame resampling.

## Core Features

- **8K Super-Resolution & Real-ESRGAN**: Hallucinates lost micro-textures and scales resolution up to 8K Cinematic (7680x4320).
- **Frame-rate conversion**: FFmpeg resamples cadence up to 240 FPS using frame repetition or dropping.
- **Interactive Before/After Split Comparison Slider**: Live pixel-level inspection across original and enhanced footage.
- **Noise & Artifact Cleanup**: Removes compression macroblocks, banding, and sensor grain from mobile & WhatsApp clips.
- **Persistent GPU Credit System**: Integrated studio credit balance and flexible top-up bundles.
- **Rendering History & Archive**: Locally persisted library with instant re-download and split inspector replay.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Setup environment variables:
   Copy `.env.example` to `.env.local`, then configure Clerk, PostgreSQL, Stripe and the protected Modal endpoints using the [staging instructions](db/README.md).
   ```bash
   cp .env.example .env.local
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Navigate to `http://localhost:3000`.

---
© 2026 KosMos AI. All rights reserved.

## Script Editor

Open `/editor` to build a draft from one local source video and a script with one beat per line. An optional SRT or WebVTT transcript supplies ranked quote matches and lets you find and assign source cues. Mark visual or narration lines with `[B-roll]` or `[VO]` to review them manually. Move the source playhead to mark in and out points, confirm or omit each line, and reorder the cut. The timeline supports undo and redo during the session.

The browser saves your script, transcript, and timeline on the device. Reconnect the same source file after reopening the editor to preview or export the cut. Select **New project → Clear project** to remove that draft. Download SRT captions to get source cues retimed to the confirmed cut.

If you do not have a transcript, the optional local transcription worker produces one from the source audio. It downloads model weights on first use unless you point it at a local model directory. Review the generated transcript before confirming quotes.

```bash
python -m pip install -r worker/requirements-editor.txt
python worker/transcribe_source.py source.mp4 source.vtt
```

The editor exports a timeline manifest. With FFmpeg and FFprobe installed, run:

```bash
python worker/render_script_cut.py kosmos-cut.json source.mp4 edited.mp4
```

The renderer uses the original source, preserves the reviewed clip order, and checks the resulting video and audio streams. Hosted transcription and rendering, visual B-roll matching, and a multiple-source timeline remain outside this first workflow.

Run the transcript and timeline regression checks with Node.js 22.18 or newer:

```bash
node scripts/test-editor-timeline.mjs
```
