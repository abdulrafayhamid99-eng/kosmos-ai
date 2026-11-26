'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Clapperboard, Download, FileText, Film, Play, Scissors, UploadCloud } from 'lucide-react';
import { cutScript, formatTime, parseTranscript, selectedCut, type Beat, type Cue } from '@/lib/editor/timeline';

type Playback = { clips: Cue[]; index: number };

export default function ScriptEditor() {
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState('');
  const [duration, setDuration] = useState(0);
  const [script, setScript] = useState('');
  const [transcript, setTranscript] = useState('');
  const [beats, setBeats] = useState<Beat[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [error, setError] = useState('');
  const video = useRef<HTMLVideoElement>(null);
  const playback = useRef<Playback | null>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSource(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const approved = selectedCut(beats);
  const pending = beats.filter((beat) => beat.review === 'pending').length;
  const total = approved.reduce((time, clip) => time + clip.end - clip.start, 0);
  const ready = !!file && pending === 0 && approved.length > 0;

  function stop() {
    playback.current = null;
    video.current?.pause();
  }

  function resetDraft() {
    stop();
    setBeats([]);
    setActive(null);
    setError('');
  }

  async function loadTranscript(input: File | undefined) {
    if (!input) return;
    resetDraft();
    try {
      const text = await input.text();
      parseTranscript(text);
      setTranscript(text);
    } catch (err) {
      setTranscript('');
      setError(err instanceof Error ? err.message : 'Could not read the transcript.');
    }
  }

  function buildDraft() {
    stop();
    try {
      const cues = parseTranscript(transcript);
      if (cues.some((cue) => cue.end > duration + 0.25)) {
        throw new Error('The transcript extends beyond this video. Choose the transcript for this source.');
      }
      setBeats(cutScript(script, cues.map((cue) => ({ ...cue, end: Math.min(cue.end, duration) }))
        .filter((cue) => cue.end > cue.start)));
      setActive(null);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build the draft.');
    }
  }

  function play(clips: Cue[], activeId: number | null) {
    const element = video.current;
    if (!element || !clips.length) return;
    playback.current = { clips, index: 0 };
    setActive(activeId);
    element.currentTime = clips[0].start;
    void element.play().catch(() => {
      playback.current = null;
      setError('This browser could not play the footage.');
    });
  }

  function advance(force = false) {
    const state = playback.current;
    const element = video.current;
    if (!state || !element || (!force && (element.seeking || element.currentTime < state.clips[state.index].end))) return;
    state.index += 1;
    const next = state.clips[state.index];
    if (next) {
      element.currentTime = next.start;
      if (element.paused) void element.play().catch(stop);
    } else {
      stop();
    }
  }

  function updateBeat(id: number, change: Partial<Beat>) {
    stop();
    setBeats((current) => current.map((beat) => beat.id === id ? { ...beat, ...change } : beat));
  }

  function addManual(beat: Beat, data: FormData) {
    const start = Number(data.get('start'));
    const end = Number(data.get('end'));
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || end > duration) {
      setError('Set an in and out point within the source video.');
      return;
    }
    setError('');
    updateBeat(beat.id, {
      matches: [...beat.matches, { start, end, text: 'Editor-selected footage', exact: false, score: 0 }],
      choice: beat.matches.length,
      review: 'pending',
    });
  }

  function exportTimeline() {
    if (!file || !ready) return;
    const manifest = {
      version: 1,
      source: { filename: file.name, bytes: file.size },
      clips: approved,
      omitted: beats.filter((beat) => beat.review === 'omitted').map((beat) => beat.text),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(manifest, null, 2) + '\n'], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'kosmos-cut.json';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <>
      <div className="editor-grid">
        <section className="editor-panel editor-source" aria-labelledby="source-heading">
          <div className="editor-panel-heading">
            <h2 id="source-heading"><Film size={19} /> Source footage</h2>
            {duration > 0 && <span className="editor-time">{formatTime(duration)}</span>}
          </div>
          {source ? (
            <video
              ref={video}
              src={source}
              controls
              playsInline
              preload="metadata"
              onLoadedMetadata={(event) => {
                const seconds = event.currentTarget.duration;
                setDuration(Number.isFinite(seconds) ? seconds : 0);
              }}
              onTimeUpdate={() => advance()}
              onEnded={() => advance(true)}
              onError={() => setError('This browser cannot read the selected video. Try an H.264 MP4 file.')}
            />
          ) : (
            <div className="editor-monitor">
              <Clapperboard size={34} strokeWidth={1.4} />
              <span>Choose footage to inspect the source.</span>
            </div>
          )}
          <div className="editor-file-row">
            <label className="editor-button editor-file-button">
              <UploadCloud size={17} /> {file ? 'Change footage' : 'Choose footage'}
              <input type="file" accept="video/*,.mp4,.mov,.webm" onChange={(event) => {
                const selected = event.target.files?.[0];
                if (!selected) return;
                resetDraft();
                setDuration(0);
                setSource('');
                setFile(selected);
              }} />
            </label>
            <span title={file?.name}>{file?.name || 'Video stays in this browser during review'}</span>
          </div>
        </section>

        <section className="editor-panel editor-script" aria-labelledby="script-heading">
          <div className="editor-panel-heading"><h2 id="script-heading"><FileText size={19} /> Script and transcript</h2></div>
          <label htmlFor="editor-script">Script</label>
          <textarea id="editor-script" value={script} dir="auto" placeholder={'One quote or beat per line\n[B-roll] Exterior of the building'}
            onChange={(event) => {
              resetDraft();
              setScript(event.target.value);
            }} />
          <div className="editor-file-row">
            <label className="editor-button editor-file-button">
              <FileText size={17} /> Choose transcript
              <input type="file" accept=".srt,.vtt" onChange={(event) => void loadTranscript(event.target.files?.[0])} />
            </label>
            <span>{transcript ? 'Transcript loaded' : '.srt or .vtt'}</span>
          </div>
          <p>Spoken lines get transcript matches. Use source timecodes for B-roll or narration.</p>
          <button className="editor-button editor-primary" type="button" onClick={buildDraft}
            disabled={!duration || !script.trim() || !transcript}><Scissors size={17} /> Build draft timeline</button>
        </section>
      </div>
      {error && <p className="editor-error" role="alert">{error}</p>}

      <section className="editor-panel editor-timeline" aria-labelledby="timeline-heading">
        <div className="editor-panel-heading editor-timeline-heading">
          <div>
            <h2 id="timeline-heading"><Clapperboard size={19} /> Draft timeline</h2>
            <p>{beats.length ? `${approved.length} confirmed · ${pending} to review · ${formatTime(total)} confirmed duration` : 'Your chosen clips appear here in script order.'}</p>
          </div>
          <div className="editor-actions">
            <button className="editor-button" type="button" disabled={!approved.length}
              onClick={() => play(approved.map(({ start, end, transcript: text }) => ({ start, end, text })), null)}><Play size={16} /> Play confirmed cut</button>
            <button className="editor-button editor-primary" type="button" disabled={!ready}
              onClick={exportTimeline}><Download size={17} /> Download timeline</button>
          </div>
        </div>
        {!!beats.length && !ready && <p className="editor-timeline-note">Confirm or omit every line before export.</p>}
        <ol>
          {beats.map((beat) => {
            const match = beat.choice === null ? undefined : beat.matches[beat.choice];
            const status = beat.review === 'confirmed' ? 'Confirmed' : beat.review === 'omitted' ? 'Omitted' : match ? 'Needs review' : 'Footage needed';
            return (
              <li key={beat.id} data-active={active === beat.id} className="editor-beat">
                <div className="editor-beat-title">
                  <span className="editor-beat-index">{beat.id + 1}</span>
                  <p dir="auto">{beat.text}</p>
                  <span className="editor-status" data-state={beat.review} data-missing={!match}>{status}</span>
                </div>
                {match && beat.review !== 'omitted' && (
                  <div className="editor-match">
                    <label>
                      Source clip
                      <select value={beat.choice ?? ''} onChange={(event) => updateBeat(beat.id, { choice: Number(event.target.value), review: 'pending' })}>
                        {beat.matches.map((option, index) => <option value={index} key={index}>
                          {formatTime(option.start)} – {formatTime(option.end)}{option.exact ? ' · Quote match' : ''}
                        </option>)}
                      </select>
                    </label>
                    <blockquote dir="auto">{match.text}</blockquote>
                  </div>
                )}
                <div className="editor-actions editor-beat-actions">
                  {match && beat.review !== 'omitted' && <>
                    <button className="editor-button" type="button" onClick={() => play([match], beat.id)}><Play size={15} /> Preview clip</button>
                    <button className="editor-button" type="button" disabled={beat.review === 'confirmed'}
                      onClick={() => updateBeat(beat.id, { review: 'confirmed' })}><Check size={16} /> Confirm</button>
                  </>}
                  <button className="editor-button editor-quiet" type="button" onClick={() => updateBeat(beat.id, {
                    review: beat.review === 'omitted' ? 'pending' : 'omitted',
                  })}>{beat.review === 'omitted' ? 'Restore line' : 'Omit line'}</button>
                  {beat.review !== 'omitted' && (
                    <details className="editor-manual">
                      <summary>Set source range</summary>
                      <form action={(data) => addManual(beat, data)}>
                        <label>In (seconds)<input type="number" name="start" min="0" max={duration} step="0.001" required /></label>
                        <label>Out (seconds)<input type="number" name="end" min="0.001" max={duration} step="0.001" required /></label>
                        <button className="editor-button" type="submit">Use range</button>
                      </form>
                    </details>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        {ready && <p className="editor-timeline-note">Download the timeline for local MP4 rendering. The export keeps the selected source timecodes.</p>}
      </section>
    </>
  );
}
