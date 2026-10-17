export interface CameraPreset {
  id: string;
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
  category?: 'cinema' | 'film' | 'creative' | 'neutral';
  lookType?: 'Technical Inspired' | 'Creative Emulation' | 'Authentic Neutral';
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
  cameraPresetId: string;
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
    id: 'neutral',
    name: 'Neutral Rec.709 (No LUT)',
    brand: 'Standard',
    sensorModel: 'Broadcast Rec.709 Natural Color',
    lutFile: 'neutral_rec709.cube',
    description: 'Clean video passthrough preserving authentic camera colors without creative grading.',
    highlightRollOff: 'Original capture dynamic range',
    dynamicRange: 'Native capture range',
    colorFoundation: 'Rec.709 standard colorimetry',
    badge: 'Newsroom Default',
    swatchColors: ['#06b6d4', '#3b82f6', '#64748b'],
    defaultGrain: 0,
    contrastCurve: 'Linear / Rec.709 Standard',
    gamutSpace: 'BT.709',
    category: 'neutral',
    lookType: 'Authentic Neutral',
  },
  {
    id: 'arri-alexa-35',
    name: 'ARRI LogC / Alexa-Inspired',
    brand: 'ARRI',
    sensorModel: 'ALEV 4 Super 35 CMOS (Creative Approximation)',
    lutFile: 'ARRI_LogC4_v1_EI0800_WideGamut4.cube',
    description: 'Restrained highlight roll-off, broad dynamic shoulder, and natural Hollywood skin tone fidelity.',
    highlightRollOff: 'Sub-linear soft compression with pristine spectral preservation',
    dynamicRange: '17 Stops Dynamic Range',
    colorFoundation: 'ARRI LogC-inspired Cinema Curve',
    badge: 'Industry Standard',
    swatchColors: ['#B8860B', '#D2B48C', '#2F4F4F'],
    defaultGrain: 12,
    contrastCurve: 'LogC Natural Cine Tone',
    gamutSpace: 'Wide Gamut Cine',
    category: 'cinema',
    lookType: 'Technical Inspired',
  },
  {
    id: 'sony-scinetone',
    name: 'Sony S-Cinetone-Inspired',
    brand: 'Sony',
    sensorModel: 'Venice / FX9 Dual Base ISO (Creative Approximation)',
    lutFile: 'Sony_SCinetone_Venice_Inspired.cube',
    description: 'Neutral-to-cinematic color rendition, soft delicate midtones, and healthy skin tones.',
    highlightRollOff: 'Velvety highlight compression with controlled saturation in hot peaks',
    dynamicRange: '15+ Stops Dynamic Range',
    colorFoundation: 'S-Cinetone / Venice Film Color Matrix',
    badge: 'Venice Broadcast',
    swatchColors: ['#3b82f6', '#93c5fd', '#1e3a8a'],
    defaultGrain: 14,
    contrastCurve: 'S-Cinetone Smooth Midtone Curve',
    gamutSpace: 'S-Gamut3.Cine',
    category: 'cinema',
    lookType: 'Technical Inspired',
  },
  {
    id: 'red-ipp2',
    name: 'RED IPP2-Inspired',
    brand: 'RED',
    sensorModel: 'V-Raptor / Monstro 8K (Creative Approximation)',
    lutFile: 'RED_IPP2_RedColor4_Inspired.cube',
    description: 'Controlled contrast, deep rich shadows, micro-texture clarity, and punchy saturated highlights.',
    highlightRollOff: 'Roll-off with hard knee highlight protection',
    dynamicRange: '16.5 Stops Dynamic Range',
    colorFoundation: 'RED IPP2 / RedColor4 Cine Foundation',
    badge: 'High Dynamic Punch',
    swatchColors: ['#ef4444', '#fca5a5', '#7f1d1d'],
    defaultGrain: 16,
    contrastCurve: 'IPP2 Medium Contrast / High Detail',
    gamutSpace: 'REDWideGamutRGB',
    category: 'cinema',
    lookType: 'Technical Inspired',
  },
  {
    id: 'canon-clog',
    name: 'Canon Cinema C-Log-Inspired',
    brand: 'Canon',
    sensorModel: 'Cinema EOS C500 / C300 Super 35 (Creative Approximation)',
    lutFile: 'Canon_Cinema_CLog3_Inspired.cube',
    description: 'Warm golden skin rendition, pleasing facial tonality, and balanced cinematic contrast.',
    highlightRollOff: 'Warm acoustic highlight gradient with smooth rolloff',
    dynamicRange: '16 Stops Dynamic Range',
    colorFoundation: 'Canon Cinema Gamut / C-Log3 Matrix',
    badge: 'Warm Portraiture',
    swatchColors: ['#dc2626', '#f87171', '#450a0a'],
    defaultGrain: 14,
    contrastCurve: 'Canon Log 3 Filmic S-Curve',
    gamutSpace: 'Canon Cinema Gamut',
    category: 'cinema',
    lookType: 'Technical Inspired',
  },
  {
    id: 'fuji-eterna',
    name: 'Fujifilm Eterna-Inspired',
    brand: 'Fujifilm',
    sensorModel: 'GFX 100 II High-Speed Medium Format (Creative Approximation)',
    lutFile: 'Fuji_GFX_Eterna_Cinematic_3D.cube',
    description: 'Organic cinematic emulsion, soft pastel contrast, muted shadows, and authentic analog feel.',
    highlightRollOff: 'Gentle shoulder with analog film stock saturation roll-off',
    dynamicRange: '16 Stops Dynamic Range',
    colorFoundation: 'F-Log2 to Eterna Film Simulation Rec.709',
    badge: 'Organic Emulsion',
    swatchColors: ['#2E8B57', '#8FBC8F', '#4A5D4E'],
    defaultGrain: 24,
    contrastCurve: 'Eterna Soft Cine Contrast',
    gamutSpace: 'ITU-R BT.2020 / F-Gamut',
    category: 'film',
    lookType: 'Creative Emulation',
  },
  {
    id: 'panasonic-vlog',
    name: 'Panasonic V-Log-Inspired',
    brand: 'Panasonic',
    sensorModel: 'Varicam 35 / Lumix S1H (Creative Approximation)',
    lutFile: 'Panasonic_VLog_Varicam_Inspired.cube',
    description: 'Balanced highlights, restrained saturation, flat natural baseline, and neutral documentary tone.',
    highlightRollOff: 'Linear-to-logarithmic extended highlight taper',
    dynamicRange: '15+ Stops Dynamic Range',
    colorFoundation: 'V-Log / V-Gamut Broadcast Standard',
    badge: 'Documentary Truth',
    swatchColors: ['#0d9488', '#5eead4', '#134e4a'],
    defaultGrain: 12,
    contrastCurve: 'Varicam Documentary Standard',
    gamutSpace: 'V-Gamut',
    category: 'cinema',
    lookType: 'Technical Inspired',
  },
  {
    id: 'blackmagic-film',
    name: 'Blackmagic Film-Inspired',
    brand: 'Blackmagic',
    sensorModel: 'URSA Mini Pro 12K RGB (Creative Approximation)',
    lutFile: 'Blackmagic_Gen5_Film_Inspired.cube',
    description: 'Filmic contrast, controlled color separation, rich greens and blues, and natural roll-off.',
    highlightRollOff: 'Generation 5 color science highlight roll-off',
    dynamicRange: '16 Stops Dynamic Range',
    colorFoundation: 'Blackmagic Design Generation 5 Film',
    badge: 'Gen 5 Film',
    swatchColors: ['#f97316', '#fdba74', '#7c2d12'],
    defaultGrain: 20,
    contrastCurve: 'BMD Film Gen 5 Organic Curve',
    gamutSpace: 'Blackmagic Wide Gamut',
    category: 'cinema',
    lookType: 'Technical Inspired',
  },
  {
    id: 'panavision-dxl2',
    name: 'Panavision DXL2 Light Iron Color 2',
    brand: 'Panavision',
    sensorModel: 'RED MONSTRO 35.4MP Large Format Sensor (Creative Approximation)',
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
    category: 'cinema',
    lookType: 'Technical Inspired',
  },
  {
    id: 'leica-sl2s-cine',
    name: 'Leica SL2-S Cine Profile',
    brand: 'Leica',
    sensorModel: '24.6MP BSI-CMOS Maestro III (Creative Approximation)',
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
    category: 'cinema',
    lookType: 'Technical Inspired',
  },
  {
    id: 'kodak-2383',
    name: 'Kodak 2383-Inspired Print Film',
    brand: 'Kodak',
    sensorModel: '35mm Theatrical Release Print Film (Creative Approximation)',
    lutFile: 'Kodak_2383_Print_Film_Inspired.cube',
    description: 'Classic film-print contrast, warm luminous highlights, deep D-Max density, and Hollywood luster.',
    highlightRollOff: 'Analog photochemical emulsion saturation roll-off',
    dynamicRange: 'Photochemical Print Dynamic Range',
    colorFoundation: 'Eastman Color Print 2383 Characteristics',
    badge: 'Print Film Look',
    swatchColors: ['#d97706', '#fbbf24', '#78350f'],
    defaultGrain: 28,
    contrastCurve: 'Photochemical Positive Print Curve',
    gamutSpace: 'DCI-P3 Theatrical',
    category: 'film',
    lookType: 'Creative Emulation',
  },
  {
    id: 'agfa-vintage',
    name: 'Agfa-Inspired Vintage Film',
    brand: 'Agfa',
    sensorModel: '1970s European Color Negative Film (Creative Approximation)',
    lutFile: 'Agfa_Vintage_Film_Inspired.cube',
    description: 'Subtle vintage color character, nostalgic cyan-tinted shadows, and soft amber pastel highlights.',
    highlightRollOff: 'Compressed vintage highlight knee with gentle softness',
    dynamicRange: 'Vintage Color Negative Range',
    colorFoundation: 'Agfacolor Photochemical Emulsion',
    badge: 'Retro Vintage',
    swatchColors: ['#ca8a04', '#fde047', '#713f12'],
    defaultGrain: 32,
    contrastCurve: 'Analog Soft Shadow S-Curve',
    gamutSpace: 'Rec.709 Vintage',
    category: 'film',
    lookType: 'Creative Emulation',
  },
  {
    id: 'bleach-bypass',
    name: 'Bleach Bypass Look',
    brand: 'Creative',
    sensorModel: 'Silver Retention Chemical Process (Creative Look)',
    lutFile: 'Bleach_Bypass_HighContrast_Creative.cube',
    description: 'Reduced color saturation and stark, gritty high contrast for intense drama and gritty action.',
    highlightRollOff: 'Steep highlight clipping with harsh dynamic transition',
    dynamicRange: 'Compressed High-Contrast Range',
    colorFoundation: 'Skip-Bleach Chemical Processing',
    badge: 'Dramatic Action',
    swatchColors: ['#475569', '#94a3b8', '#0f172a'],
    defaultGrain: 36,
    contrastCurve: 'Hard Silver Retention Curve',
    gamutSpace: 'Desaturated Rec.709',
    category: 'creative',
    lookType: 'Creative Emulation',
  },
  {
    id: 'teal-orange',
    name: 'Teal & Orange Cinema Look',
    brand: 'Creative',
    sensorModel: 'Contemporary Blockbuster Color Grade (Creative Look)',
    lutFile: 'Teal_Orange_Blockbuster_Creative.cube',
    description: 'Restrained cinematic complementary treatment: deep cyan/teal shadows paired with warm glowing skin tones.',
    highlightRollOff: 'Warm golden highlight roll-off with controlled skin preservation',
    dynamicRange: 'Modern Theatrical Dynamic Range',
    colorFoundation: 'Complementary Color Split Toning',
    badge: 'Blockbuster Look',
    swatchColors: ['#0891b2', '#f97316', '#164e63'],
    defaultGrain: 15,
    contrastCurve: 'Commercial Blockbuster Split Curve',
    gamutSpace: 'DCI-P3 Theatrical',
    category: 'creative',
    lookType: 'Creative Emulation',
  },
  {
    id: 'monochrome-cinema',
    name: 'Monochrome Cinema Look',
    brand: 'Creative',
    sensorModel: 'Black & White Silver Gelatin Emulsion (Creative Look)',
    lutFile: 'Monochrome_Cinema_BlackAndWhite_Creative.cube',
    description: 'Carefully balanced black-and-white tonal contrast, rich grayscale graduation, and timeless editorial elegance.',
    highlightRollOff: 'Extended silver highlight taper with deep shadow separation',
    dynamicRange: 'Silver Halide Monochromatic Dynamic Range',
    colorFoundation: 'Panatomic-X / Tri-X Spectral Sensitivity',
    badge: 'Noir Editorial',
    swatchColors: ['#ffffff', '#64748b', '#000000'],
    defaultGrain: 26,
    contrastCurve: 'Classic B&W Silver S-Curve',
    gamutSpace: 'Monochrome Luminance',
    category: 'creative',
    lookType: 'Creative Emulation',
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
    description: 'Extreme High-Speed Slow-Motion via Standard Frame Resampling.',
    shutterAngle: '180° (1/480s Exposure)',
    motionProfile: 'High-speed cadence retiming & standard resampling',
    opticalFlowMultiplier: 10.0,
    targetDomain: 'Macro Cinematography & Extreme Slow-Mo FX',
  },
];
