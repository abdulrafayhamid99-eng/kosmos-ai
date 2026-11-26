import { formatTime, type Beat, type Cue } from './timeline';

export type SourceIdentity = { name: string; size: number; modified: number };
export type EditorProject = {
  source: SourceIdentity | null;
  script: string;
  transcript: string;
  transcriptName: string;
  beats: Beat[];
  inputRevision: number;
  draftRevision: number;
};

export const emptyProject: EditorProject = {
  source: null, script: '', transcript: '', transcriptName: '', beats: [], inputRevision: 0, draftRevision: 0,
};

export function identity(file: File): SourceIdentity {
  return { name: file.name, size: file.size, modified: file.lastModified };
}

export function sameSource(a: SourceIdentity | null, b: SourceIdentity | null) {
  return Boolean(a && b && a.name === b.name && a.size === b.size && a.modified === b.modified);
}

export function validRange(start: number, end: number, limit = Infinity) {
  return Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end - start >= 0.001 - 1e-9 && end <= limit + 1e-9;
}

export function restoreProject(raw: string | null): EditorProject {
  if (!raw) return emptyProject;
  const { version, project } = JSON.parse(raw);
  if (version !== 1 || !project || typeof project.script !== 'string' ||
      typeof project.transcript !== 'string' || typeof project.transcriptName !== 'string' ||
      !Number.isSafeInteger(project.inputRevision) || !Number.isSafeInteger(project.draftRevision) ||
      !Array.isArray(project.beats)) {
    throw new Error('The saved project could not be opened.');
  }
  const source = project.source;
  if (source !== null && (!source || typeof source.name !== 'string' ||
      !Number.isSafeInteger(source.size) || source.size < 0 || !Number.isFinite(source.modified))) {
    throw new Error('The saved source could not be identified.');
  }
  const ids = new Set<number>();
  for (const beat of project.beats as Beat[]) {
    if (!beat || !Number.isSafeInteger(beat.id) || ids.has(beat.id) || typeof beat.text !== 'string' ||
        !['pending', 'confirmed', 'omitted'].includes(beat.review) || !Array.isArray(beat.matches) ||
        (beat.choice !== null && (!Number.isInteger(beat.choice) || !beat.matches[beat.choice])) ||
        (beat.review === 'confirmed' && beat.choice === null) ||
        beat.matches.some((match) => !match || typeof match.text !== 'string' ||
          typeof match.exact !== 'boolean' || !Number.isFinite(match.score) || !validRange(match.start, match.end))) {
      throw new Error('The saved timeline could not be opened.');
    }
    ids.add(beat.id);
  }
  return project;
}

export function moveBeat(beats: Beat[], id: number, offset: -1 | 1) {
  const from = beats.findIndex((beat) => beat.id === id);
  const to = from + offset;
  if (from < 0 || to < 0 || to >= beats.length) return beats;
  const next = [...beats];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

export function cutCaptions(cues: Cue[], clips: Pick<Cue, 'start' | 'end'>[]) {
  let offset = 0;
  const output: Cue[] = [];
  for (const clip of clips) {
    for (const cue of cues) {
      const start = Math.max(cue.start, clip.start);
      const end = Math.min(cue.end, clip.end);
      if (validRange(start, end)) output.push({ start: offset + start - clip.start, end: offset + end - clip.start, text: cue.text });
    }
    offset += clip.end - clip.start;
  }
  return output.sort((a, b) => a.start - b.start);
}

function srtTime(seconds: number) {
  const time = formatTime(seconds);
  return (time.length === 9 ? '00:' + time : time.padStart(12, '0')).replace('.', ',');
}

export function toSrt(cues: Cue[]) {
  return cues.map((cue, index) =>
    `${index + 1}\n${srtTime(cue.start)} --> ${srtTime(cue.end)}\n${cue.text}\n`,
  ).join('\n');
}
