export interface CameraPreset {
  id: 'arri-alexa-35' | 'fuji-eterna' | 'panavision-dxl2' | 'leica-sl2s-cine';
  name: string;
  brand: string;
  sensorModel: string;
  lutFile: string;
  description: string;
  highlightRollOff: string;
  dynamicRange: string;
  colorFoundation: string;
  badge: string;
  swatchColors: [string, string, string];
  defaultGrain: number; // 0 - 100 scale
  contrastCurve: string;
  gamutSpace: string;
}

export type FrameRateCategory = 'Cinema' | 'Broadcast' | 'HFR' | 'Super Slow-Mo';

export interface FrameRatePreset {
  fps: 24 | 25 | 30 | 48 | 50 | 60 | 120 | 240;
  label: string;
  standard: string;
  category: FrameRateCategory;
  description: string;
  shutterAngle: string;
  motionProfile: string;
  opticalFlowMultiplier: number; // Reference multiplier for RIFE synthesis
  targetDomain: string;
}

export type FieldScanMode = 'progressive' | 'interlaced-tff' | 'interlaced-bff';

export interface FieldPreset {
  id: FieldScanMode;
  label: string;
  name: string;
  description: string;
  standard: string;
  badge: string;
  fieldsPerSecondMultiplier: number;
}

export const FIELD_PRESETS: FieldPreset[] = [
  {
    id: 'progressive',
    label: 'Progressive (p)',
    name: 'Progressive Scan (1p)',
    description: 'Full vertical resolution frame-by-frame. Default for web, streaming, and theatrical cinema.',
    standard: 'Web / Cinema Standard',
    badge: 'Cinema / Web Default',
    fieldsPerSecondMultiplier: 1.0,
  },
  {
    id: 'interlaced-tff',
    label: 'Interlaced (Upper Field First / TFF)',
    name: 'Upper Field First (TFF)',
    description: 'Even raster lines scanned first. Global standard for 1080i high-definition television broadcast (EBU / ATSC / DVB).',
    standard: 'TV Broadcast Standard (1080i50 / 1080i59.94)',
    badge: 'Broadcast TV Standard',
    fieldsPerSecondMultiplier: 2.0,
  },
  {
    id: 'interlaced-bff',
    label: 'Interlaced (Lower Field First / BFF)',
    name: 'Lower Field First (BFF)',
    description: 'Odd raster lines scanned first. Standard for standard-definition television feeds, DV camcorders, and legacy archives.',
    standard: 'SDTV Broadcast / DV Tape Archival',
    badge: 'Legacy Archival',
    fieldsPerSecondMultiplier: 2.0,
  },
];

export interface ProcessingConfig {
  videoUrl: string;
  videoFile?: File | null;
  cameraPresetId: 'arri-alexa-35' | 'fuji-eterna' | 'panavision-dxl2' | 'leica-sl2s-cine' | string;
  lutFile: string;
  fps: 24 | 25 | 30 | 48 | 50 | 60 | 120 | 240 | number;
  grainLevel: number; // 0 - 100 percentage
  resolution?: '1080p' | '2K DCI (2048×1080)' | '2K' | '4K' | '8K' | string;
  fieldMode?: FieldScanMode;
  shutterFix?: boolean; // Universal Shutter (Rolling Shutter Fix)
  targetGamma?: 'rec709' | 'flat-log' | 'hdr-hlg' | 'hdr-pq' | string;
  enableFaceRestore?: boolean;
  faceRestoreFidelity?: number;
  enableRealEsrgan?: boolean;
  enableRifeInterpolation?: boolean;
  outputCodec?: 'h264' | 'hevc' | 'prores';
}

export const CAMERA_PRESETS: CameraPreset[] = [
  {
    id: 'arri-alexa-35',
    name: 'ARRI Alexa 35 LogC4',
    brand: 'ARRI',
    sensorModel: 'ALEV 4 Super 35 CMOS',
    lutFile: 'ARRI_LogC4_v1_EI0800_WideGamut4.cube',
    description: 'Smooth highlight roll-off, broad dynamic range, Hollywood color foundation.',
    highlightRollOff: 'Sub-linear soft compression with pristine spectral preservation',
    dynamicRange: '17 Stops Dynamic Range',
    colorFoundation: 'ARRI Wide Gamut 4 / LogC4 Master Curve',
    badge: 'Industry Standard',
    swatchColors: ['#B8860B', '#D2B48C', '#2F4F4F'],
    defaultGrain: 12,
    contrastCurve: 'LogC4 Natural Cine Tone',
    gamutSpace: 'ARRI Wide Gamut 4',
  },
  {
    id: 'fuji-eterna',
    name: 'Fujifilm GFX 100 II Eterna',
    brand: 'Fujifilm',
    sensorModel: 'Medium Format 102MP High-Speed CMOS II HS',
    lutFile: 'Fuji_GFX_Eterna_Cinematic_3D.cube',
    description: 'Organic cinematic emulsion, natural skin fidelity, soft shadows.',
    highlightRollOff: 'Gentle shoulder with analog film stock saturation roll-off',
    dynamicRange: '16 Stops Dynamic Range',
    colorFoundation: 'F-Log2 to Eterna Film Simulation Rec.709',
    badge: 'Organic Emulsion',
    swatchColors: ['#2E8B57', '#8FBC8F', '#4A5D4E'],
    defaultGrain: 24,
    contrastCurve: 'Eterna Soft Cine Contrast',
    gamutSpace: 'ITU-R BT.2020 / F-Gamut',
  },
  {
    id: 'panavision-dxl2',
    name: 'Panavision DXL2 Light Iron Color 2',
    brand: 'Panavision',
    sensorModel: 'RED MONSTRO 35.4MP Large Format Sensor',
    lutFile: 'Panavision_DXL2_LightIronColor2.cube',
    description: 'Blockbuster contrast, deep shadow clarity, sharp cinematic tone.',
    highlightRollOff: 'High dynamic peak contrast engineered for large format cinema',
    dynamicRange: '16.5 Stops Dynamic Range',
    colorFoundation: 'Light Iron Color 2 Film Matrix',
    badge: 'Blockbuster Cinema',
    swatchColors: ['#1C39BB', '#4682B4', '#191970'],
    defaultGrain: 18,
    contrastCurve: 'LIC2 Punchy Midtone & Deep Blacks',
    gamutSpace: 'REDWideGamutRGB / Log3G10',
  },
  {
    id: 'leica-sl2s-cine',
    name: 'Leica SL2-S Cine Profile',
    brand: 'Leica',
    sensorModel: '24.6MP BSI-CMOS Maestro III',
    lutFile: 'Leica_SL2S_Cine_FilmLook.cube',
    description: 'Micro-contrast richness, textured organic blacks, documentary look.',
    highlightRollOff: 'Subtle European cine tonality with warm acoustic highlights',
    dynamicRange: '15.5 Stops Dynamic Range',
    colorFoundation: 'Leica L-Log to Classic Cine 3D Transform',
    badge: 'Aesthetic Texture',
    swatchColors: ['#8B0000', '#CD5C5C', '#222222'],
    defaultGrain: 30,
    contrastCurve: 'Documentary Fine Art Micro-Contrast',
    gamutSpace: 'Leica L-Log / Rec.709 Cine',
  },
];

export const FRAME_RATE_PRESETS: FrameRatePreset[] = [
  {
    fps: 24,
    label: '24 FPS',
    standard: 'Cinematic Narrative Standard',
    category: 'Cinema',
    description: 'Cinematic Narrative Standard (180° Shutter Emulation).',
    shutterAngle: '180° (1/48s Exposure)',
    motionProfile: 'Traditional theatrical cadence with authentic cinematic motion blur',
    opticalFlowMultiplier: 1.0,
    targetDomain: 'Feature Films & Theatrical Master',
  },
  {
    fps: 25,
    label: '25 FPS',
    standard: 'Broadcast PAL Standard',
    category: 'Broadcast',
    description: 'Broadcast PAL Standard (European / Asian Television).',
    shutterAngle: '180° (1/50s Exposure)',
    motionProfile: 'Phase Alternating Line broadcast cadence without strobing',
    opticalFlowMultiplier: 1.04,
    targetDomain: 'European & Asian Television Broadcast',
  },
  {
    fps: 30,
    label: '30 FPS',
    standard: 'Digital Web / NTSC Broadcast',
    category: 'Broadcast',
    description: 'Digital Web / NTSC Broadcast Standard.',
    shutterAngle: '180° (1/60s Exposure)',
    motionProfile: 'Crisp streaming clarity tailored for commercial platforms',
    opticalFlowMultiplier: 1.25,
    targetDomain: 'North American Television & Web Master',
  },
  {
    fps: 48,
    label: '48 FPS',
    standard: 'High Frame Rate (HFR)',
    category: 'HFR',
    description: 'High Frame Rate (HFR Cinematic Action).',
    shutterAngle: '180° (1/96s Exposure)',
    motionProfile: 'Double-frequency motion clarity minimizing judder during fast pans',
    opticalFlowMultiplier: 2.0,
    targetDomain: 'HFR 3D & Rapid Action Cinematography',
  },
  {
    fps: 50,
    label: '50 FPS',
    standard: 'Broadcast High-Motion PAL',
    category: 'Broadcast',
    description: 'Broadcast High-Motion PAL Standard (European Live Sports & Television).',
    shutterAngle: '180° (1/100s Exposure)',
    motionProfile: 'Ultra-fluid sports and live broadcast temporal resolution',
    opticalFlowMultiplier: 2.08,
    targetDomain: 'European Live Sports & Television Master',
  },
  {
    fps: 60,
    label: '60 FPS',
    standard: 'Ultra-Fluid Digital / YouTube 4K',
    category: 'HFR',
    description: 'Ultra-Fluid Digital / YouTube 4K Standard.',
    shutterAngle: '180° (1/120s Exposure)',
    motionProfile: 'Hyper-responsive crystal rendering favored for digital displays',
    opticalFlowMultiplier: 2.5,
    targetDomain: 'YouTube 4K60 & Commercial Web Video',
  },
  {
    fps: 120,
    label: '120 FPS',
    standard: 'High-Speed Sports & Action',
    category: 'Super Slow-Mo',
    description: 'High-Speed Sports / Action Smooth Motion.',
    shutterAngle: '180° (1/240s Exposure)',
    motionProfile: 'Fluid high-speed capture with 5x smooth slow-motion capability',
    opticalFlowMultiplier: 5.0,
    targetDomain: 'Cinematic B-Roll & Dynamic Action Sports',
  },
  {
    fps: 240,
    label: '240 FPS',
    standard: 'Extreme High-Speed Slow-Motion',
    category: 'Super Slow-Mo',
    description: 'Extreme High-Speed Slow-Motion via Bidirectional Optical Flow.',
    shutterAngle: '180° (1/480s Exposure)',
    motionProfile: '10x ultra slow-motion neural temporal reconstruction via RIFE v4.6',
    opticalFlowMultiplier: 10.0,
    targetDomain: 'Macro Cinematography & Extreme Slow-Mo FX',
  },
];
