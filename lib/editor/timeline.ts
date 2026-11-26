export type Cue = { start: number; end: number; text: string };
export type Match = Cue & { score: number; exact: boolean };
export type Beat = {
  id: number;
  text: string;
  matches: Match[];
  choice: number | null;
  review: 'pending' | 'confirmed' | 'omitted';
};

export function readTime(value: string): number {
  const match = value.trim().match(/^(?:(\d+):)?([0-5]\d):([0-5]\d)[.,](\d{3})$/);
  if (!match) return NaN;
  return Number(match[1] || 0) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
}

export function formatTime(value: number): string {
  const total = Math.round(Math.max(0, value) * 1000);
  const hours = Math.floor(total / 3_600_000);
  const minutes = Math.floor(total / 60_000) % 60;
  const seconds = Math.floor(total / 1000) % 60;
  return `${hours ? `${hours}:` : ''}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(total % 1000).padStart(3, '0')}`;
}

export function parseTranscript(source: string): Cue[] {
  const raw = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const cues: Cue[] = [];
  for (const block of raw.trim().split(/\n[ \t]*\n+/)) {
    const lines = block.split('\n');
    if (/^(WEBVTT|NOTE\b|STYLE\b|REGION\b)/.test(lines[0])) continue;
    const times = lines.findIndex((line) => line.includes('-->'));
    if (times < 0) continue;
    const [inPoint = '', outPoint = ''] = lines[times].split('-->', 2);
    const start = readTime(inPoint);
    const end = readTime(outPoint.trim().split(/\s+/)[0]);
    const text = lines.slice(times + 1).join(' ').replace(/<[^>]*>/g, '').trim();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !text) {
      throw new Error('A transcript cue has an invalid timestamp or no text.');
    }
    cues.push({ start, end, text });
  }
  if (!cues.length) throw new Error('Add a timestamped .srt or .vtt transcript.');
  return cues.sort((a, b) => a.start - b.start);
}

function tokens(value: string) {
  return value.normalize('NFKD').toLowerCase().replace(/\p{M}/gu, '')
    .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/ه/g, 'ہ')
    .match(/[\p{L}\p{N}]+/gu) ?? [];
}

function windowsFor(cues: Cue[]) {
  const windows: Array<Cue & { terms: Set<string>; phrase: string }> = [];
  for (let start = 0; start < cues.length; start += 1) {
    let merged = { ...cues[start] };
    for (let end = start; end < Math.min(start + 4, cues.length); end += 1) {
      const next = cues[end];
      if (end > start) {
        if (next.start - merged.end > 2 || next.end - merged.start > 35) break;
        merged = { ...merged, end: Math.max(merged.end, next.end), text: `${merged.text} ${next.text}` };
      }
      const words = tokens(merged.text);
      windows.push({ ...merged, terms: new Set(words), phrase: ` ${words.join(' ')} ` });
    }
  }
  return windows;
}

export function cutScript(script: string, cues: Cue[]): Beat[] {
  const lines = script.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) throw new Error('Add your script with one beat per line.');
  const windows = windowsFor(cues);
  const frequency = new Map<string, number>();
  for (const cue of cues) {
    for (const token of new Set(tokens(cue.text))) frequency.set(token, (frequency.get(token) ?? 0) + 1);
  }

  return lines.map((text, id) => {
    const manual = /^\s*\[(?:b[ -]?roll|vo|voice[ -]?over|narration|visual)\b/i.test(text);
    const allWords = tokens(text);
    const words = [...new Set(allWords)];
    const weights = words.map((word) => Math.log((cues.length + 1) / ((frequency.get(word) ?? 0) + 1)) + 1);
    const total = weights.reduce((a, b) => a + b, 0);
    const matches: Match[] = [];

    if (!manual && words.length >= 2) {
      const phrase = ` ${allWords.join(' ')} `;
      const ranked = windows.flatMap((window) => {
        let count = 0;
        let weight = 0;
        for (const [i, word] of words.entries()) {
          if (window.terms.has(word)) {
            count += 1;
            weight += weights[i];
          }
        }
        const exact = window.phrase.includes(phrase);
        const coverage = weight / total;
        if (!exact && (count < 2 || coverage < 0.63)) return [];
        const score = exact
          ? 1 + (window.phrase === phrase ? 0.1 : 0)
          : coverage * 0.8 + (count / Math.max(words.length, window.terms.size)) * 0.2;
        return [{ start: window.start, end: window.end, text: window.text, score, exact }];
      }).sort((a, b) => b.score - a.score || (a.end - a.start) - (b.end - b.start) || a.start - b.start);

      for (const match of ranked) {
        if (matches.some((previous) => match.start < previous.end && previous.start < match.end)) continue;
        matches.push(match);
        if (matches.length === 4) break;
      }
    }
    return { id, text, matches, choice: matches.length ? 0 : null, review: 'pending' };
  });
}

export function selectedCut(beats: Beat[]) {
  return beats.flatMap((beat) => {
    if (beat.review !== 'confirmed' || beat.choice === null) return [];
    const cue = beat.matches[beat.choice];
    if (!cue) return [];
    return [{ script: beat.text, start: cue.start, end: cue.end, transcript: cue.text }];
  });
}
