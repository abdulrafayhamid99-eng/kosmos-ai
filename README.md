# KosMos AI — Next-Gen AI Video Upscaler & Cinematic Frame Interpolation

KosMos AI is a state-of-the-art neural video enhancement platform engineered for digital cinematographers, VFX editors, and content creators. It elevates footage up to **8K Cinematic clarity** and synthesizes missing frames up to **240 FPS** via deep neural optical flow.

## Core Features

- **8K Super-Resolution & Real-ESRGAN**: Hallucinates lost micro-textures and scales resolution up to 8K Cinematic (7680x4320).
- **RIFE Optical Flow Interpolation**: Synthesizes intermediate frames (60 FPS, 120 FPS, 240 FPS) with zero artifact tearing.
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
   Copy `.env.example` to `.env.local` and add your Replicate API key:
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
