'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import {
  ArrowDown, ArrowDownToLine, ArrowUp, Captions, Check, ChevronRight, Clapperboard, FileText,
  Film, HardDrive, ListChecks, Pause, Play, Redo2, Scissors, Search, Undo2, UploadCloud,
} from 'lucide-react';
import { cutCaptions, identity, moveBeat, sameSource, toSrt, validRange } from '@/lib/editor/project';
import { cutScript, formatTime, parseTranscript, selectedCut, type Beat, type Cue } from '@/lib/editor/timeline';
import { useEditorProject } from './useEditorProject';

type Playback = { clips: Cue[]; index: number };
type ReviewFilter = 'all' | Beat['review'];
const minimumStep = 0.001;

function FilePicker({ children, accept, onChange }: {
  children: ReactNode;
  accept: string;
  onChange: (file: File) => void;
}) {
  return (
    <label className="editor-button editor-file-button">
      {children}
      <input type="file" accept={accept} onChange={(event) => {
        const file = event.currentTarget.files?.[0];
        if (file) onChange(file);
        event.currentTarget.value = '';
      }} />
    </label>
  );
}

function download(name: string, content: string, type: string) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

export default function ScriptEditor() {
  const { project, past, future, dispatch, loaded, saveState, restoreError, reset } = useEditorProject();
  const { script, transcript, transcriptName, beats } = project;
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState('');
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [query, setQuery] = useState('');
  const [cuePage, setCuePage] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const playback = useRef<Playback | null>(null);
  const transcriptRead = useRef(0);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSource(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const cues = useMemo(() => {
    try {
      return transcript ? parseTranscript(transcript) : [];
    } catch {
      return [];
    }
  }, [transcript]);

  const approved = useMemo(() => selectedCut(beats), [beats]);
  const counts = useMemo(() => ({
    pending: beats.filter((beat) => beat.review === 'pending').length,
    confirmed: approved.length,
    omitted: beats.filter((beat) => beat.review === 'omitted').length,
  }), [beats, approved]);
  const total = approved.reduce((time, clip) => time + clip.end - clip.start, 0);
  const sourceReady = Boolean(file && duration > 0);
  const draftOutdated = beats.length > 0 && project.draftRevision !== project.inputRevision;
  const ready = sourceReady && !draftOutdated && !counts.pending && approved.length > 0 &&
    approved.every((clip) => validRange(clip.start, clip.end, duration));
  const visibleBeats = filter === 'all' ? beats : beats.filter((beat) => beat.review === filter);
  const active = visibleBeats.find((beat) => beat.id === activeId) ?? visibleBeats[0];
  const activeIndex = active ? beats.findIndex((beat) => beat.id === active.id) : -1;
  const match = active?.choice == null ? undefined : active.matches[active.choice];
  const matchingCues = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return term ? cues.filter((cue) => cue.text.toLocaleLowerCase().includes(term)) : cues;
  }, [cues, query]);
  const captionTrack = useMemo(() => cutCaptions(cues, approved), [cues, approved]);

  function stop() {
    playback.current = null;
    video.current?.pause();
  }

  function seek(seconds: number) {
    stop();
    if (!video.current || !duration) return;
    const time = Math.max(0, Math.min(duration, seconds));
    video.current.currentTime = time;
    setPosition(time);
  }

  function loadFootage(input: File) {
    const nextSource = identity(input);
    if (project.source && !sameSource(project.source, nextSource) && beats.length) {
      setError('This file differs from the saved source. Reopen the original footage or start a new project to replace it.');
      return;
    }
    stop();
    setError('');
    setNotice('');
    setDuration(0);
    setPosition(0);
    setSource('');
    dispatch({ type: 'source', source: nextSource });
    setFile(input);
  }

  async function loadTranscript(input: File) {
    const request = ++transcriptRead.current;
    setError('');
    try {
      if (input.size > 1_000_000) throw new Error('Use a transcript under 1 MB.');
      const text = await input.text();
      if (transcriptRead.current !== request) return;
      parseTranscript(text);
      dispatch({ type: 'inputs', patch: { transcript: text, transcriptName: input.name } });
      setQuery('');
      setCuePage(0);
      setNotice('Transcript imported.');
    } catch (err) {
      if (transcriptRead.current === request) setError(err instanceof Error ? err.message : 'Could not read the transcript.');
    }
  }

  function buildDraft() {
    stop();
    setNotice('');
    try {
      if (transcript && !cues.length) throw new Error('Choose a timestamped SRT or VTT transcript.');
      if (cues.some((cue) => cue.end > duration + 0.25)) {
        throw new Error('The transcript extends beyond this video. Choose the transcript for this source.');
      }
      const ranges = cues.map((cue) => ({ ...cue, end: Math.min(cue.end, duration) }))
        .filter((cue) => validRange(cue.start, cue.end, duration));
      const next = cutScript(script, ranges);
      dispatch({ type: 'edit', edit: () => next, rebuild: true });
      setActiveId(next[0]?.id ?? null);
      setFilter('all');
      setError('');
      setNotice(cues.length ? 'Draft built. Review the suggested ranges.' : 'Draft built. Set source ranges for your script lines.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build the draft.');
    }
  }

  function play(clips: Cue[], id?: number) {
    const element = video.current;
    if (!element || !sourceReady || !clips.length) return;
    playback.current = { clips, index: 0 };
    if (id !== undefined) setActiveId(id);
    element.currentTime = clips[0].start;
    const rect = element.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= window.innerHeight) {
      element.scrollIntoView({ block: 'center' });
    }
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

  function updateBeat(id: number, update: (beat: Beat) => Beat) {
    stop();
    dispatch({ type: 'edit', edit: (current) => current.map((beat) => beat.id === id ? update(beat) : beat) });
  }

  function saveRange(beat: Beat, start: number, end: number, text = 'Editor-selected footage') {
    if (!sourceReady || !validRange(start, end, duration)) {
      setError('Set an in and out point within the source video.');
      return;
    }
    setError('');
    updateBeat(beat.id, (current) => {
      const existing = current.matches.findIndex((candidate) =>
        candidate.start === start && candidate.end === end && candidate.text === text);
      return {
        ...current,
        matches: existing >= 0 ? current.matches : [...current.matches, { start, end, text, score: 0, exact: false }],
        choice: existing >= 0 ? existing : current.matches.length,
        review: 'pending',
      };
    });
  }

  function resetProject() {
    stop();
    ++transcriptRead.current;
    setFile(null);
    setSource('');
    setDuration(0);
    setPosition(0);
    setActiveId(null);
    setFilter('all');
    setQuery('');
    setCuePage(0);
    setShowTranscript(false);
    setConfirmReset(false);
    setError('');
    setNotice('');
    reset();
  }

  function exportTimeline() {
    if (!file || !ready) return;
    const manifest = {
      version: 1,
      source: { filename: file.name, bytes: file.size },
      clips: approved,
      omitted: beats.filter((beat) => beat.review === 'omitted').map((beat) => beat.text),
    };
    download('kosmos-cut.json', JSON.stringify(manifest, null, 2) + '\n', 'application/json');
    setNotice('Timeline downloaded.');
  }

  function handleKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (!['z', 'y'].includes(event.key.toLowerCase()) || !(event.metaKey || event.ctrlKey)) return;
    if ((event.target as HTMLElement).closest('input, textarea, [contenteditable], select')) return;
    const redo = event.key.toLowerCase() === 'y' || event.shiftKey;
    if (redo ? !future.length : !past.length) return;
    event.preventDefault();
    stop();
    dispatch({ type: redo ? 'redo' : 'undo' });
  }

  return (
    <div className="editor-workbench" onKeyDown={handleKeyboard}>
      <div className="editor-project-bar">
        <p><HardDrive size={15} /> {saveState === 'saved' ? 'Saved in this browser' : saveState === 'unavailable' ? 'Local autosave unavailable' : 'Local project'} <span>· Footage stays on your device</span></p>
        {confirmReset ? (
          <div className="editor-actions">
            <span>Clear this draft?</span>
            <button className="editor-button" type="button" onClick={() => setConfirmReset(false)}>Cancel</button>
            <button className="editor-button editor-danger" type="button" onClick={resetProject}>Clear project</button>
          </div>
        ) : (
          <button className="editor-button editor-quiet" type="button" disabled={!loaded || (!project.source && !script && !transcript && !restoreError)}
            onClick={() => setConfirmReset(true)}>New project</button>
        )}
      </div>

      <div className="editor-grid">
        <section className="editor-panel editor-source" aria-labelledby="source-heading">
          <div className="editor-panel-heading">
            <h2 id="source-heading"><Film size={17} /> Source monitor</h2>
            <span className="editor-time">{formatTime(position)} / {formatTime(duration)}</span>
          </div>
          {source ? (
            <video
              ref={video} src={source} controls playsInline preload="metadata"
              onLoadedMetadata={(event) => {
                const seconds = event.currentTarget.duration;
                setDuration(Number.isFinite(seconds) ? seconds : 0);
              }}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onTimeUpdate={(event) => { setPosition(event.currentTarget.currentTime); advance(); }}
              onEnded={() => advance(true)}
              onError={() => setError('This browser cannot read the selected video. Try an H.264 MP4 file.')}
            />
          ) : (
            <div className="editor-monitor">
              <div className="editor-monitor-icon"><Clapperboard size={29} strokeWidth={1.5} /></div>
              <strong>{project.source ? 'Reconnect your footage' : 'No footage loaded'}</strong>
              <span>{project.source ? project.source.name : 'Choose a source video to start reviewing clips.'}</span>
              {loaded && <FilePicker accept="video/*,.mp4,.mov,.webm" onChange={loadFootage}>
                <UploadCloud size={16} /> {project.source ? 'Reconnect footage' : 'Choose footage'}
              </FilePicker>}
            </div>
          )}
          {file && <div className="editor-file-row">
            <FilePicker accept="video/*,.mp4,.mov,.webm" onChange={loadFootage}><UploadCloud size={16} /> Change footage</FilePicker>
            <span title={file.name}>{file.name}</span>
          </div>}
          <div className="editor-source-ruler">
            <div className="editor-source-track">
              {match && sourceReady && <span className="editor-source-range"
                style={{ left: `${match.start / duration * 100}%`, width: `${(match.end - match.start) / duration * 100}%` }} />}
              <input type="range" aria-label="Source playhead" min="0" max={duration || 1} step={minimumStep}
                value={position} disabled={!sourceReady} onChange={(event) => seek(Number(event.target.value))} />
            </div>
            <div className="editor-ruler-labels"><span>00:00</span><span>{formatTime(duration)}</span></div>
          </div>
        </section>

        <section className="editor-panel editor-script" aria-labelledby="script-heading">
          <div className="editor-panel-heading"><h2 id="script-heading"><FileText size={17} /> Script and transcript</h2></div>
          <label htmlFor="editor-script">Script</label>
          <textarea id="editor-script" value={script} dir="auto" maxLength={40000}
            placeholder={'One quote or beat per line\n[B-roll] Exterior of the building'}
            disabled={!loaded}
            onChange={(event) => dispatch({ type: 'inputs', patch: { script: event.target.value } })} />
          <div className="editor-file-row">
            <FilePicker accept=".srt,.vtt" onChange={(input) => void loadTranscript(input)}><Captions size={16} /> {transcript ? 'Replace transcript' : 'Import transcript'}</FilePicker>
            <span title={transcriptName}>{transcript ? `${cues.length} cues · ${transcriptName}` : 'Optional SRT or VTT'}</span>
            {transcript && <button type="button" className="editor-button editor-quiet" onClick={() => {
              ++transcriptRead.current;
              dispatch({ type: 'inputs', patch: { transcript: '', transcriptName: '' } });
              setShowTranscript(false);
              setQuery('');
              setCuePage(0);
              setError('');
            }}>Remove transcript</button>}
          </div>
          {transcript && <button className="editor-button editor-quiet editor-transcript-toggle" type="button"
            aria-expanded={showTranscript} onClick={() => setShowTranscript(!showTranscript)}>
            <Search size={15} /> {showTranscript ? 'Hide transcript' : 'Browse transcript'}
          </button>}
          {showTranscript && transcript && <div className="editor-transcript">
            <input aria-label="Search transcript" placeholder="Find a word or quote…" value={query} onChange={(event) => { setQuery(event.target.value); setCuePage(0); }} />
            <ul>
              {matchingCues.slice(cuePage * 12, cuePage * 12 + 12).map((cue, index) => (
                <li key={`${cue.start}-${index}`}>
                  <button type="button" disabled={!sourceReady || cue.start >= duration} onClick={() => seek(cue.start)} title="Seek to cue">
                    <time>{formatTime(cue.start)}</time><span dir="auto">{cue.text}</span>
                  </button>
                  {active && active.review !== 'omitted' && <button type="button" className="editor-cue-use"
                    disabled={!sourceReady || !validRange(cue.start, Math.min(duration, cue.end), duration)}
                    onClick={() => saveRange(active, cue.start, Math.min(duration, cue.end), cue.text)}
                    aria-label={`Use cue at ${formatTime(cue.start)} for selected beat`} title="Use cue for selected beat"><ChevronRight size={15} /></button>}
                </li>
              ))}
            </ul>
            {!matchingCues.length && <p>No matching cues.</p>}
            {matchingCues.length > 12 && <div className="editor-cue-pages">
              <button type="button" className="editor-button" disabled={!cuePage} onClick={() => setCuePage(cuePage - 1)}>Previous</button>
              <span>{cuePage + 1} / {Math.ceil(matchingCues.length / 12)}</span>
              <button type="button" className="editor-button" disabled={(cuePage + 1) * 12 >= matchingCues.length} onClick={() => setCuePage(cuePage + 1)}>Next</button>
            </div>}
          </div>}
          <div className="editor-script-footer">
            <p>{draftOutdated ? 'Inputs changed. Rebuild to match the updated script and transcript.' : 'Import a transcript for suggested quote matches, or mark clip ranges yourself.'}</p>
            <button className="editor-button editor-primary" type="button" onClick={buildDraft}
              disabled={!sourceReady || !script.trim()}><Scissors size={16} /> {beats.length ? 'Rebuild draft' : 'Build draft timeline'}</button>
          </div>
        </section>
      </div>

      {(error || restoreError) && <p className="editor-error" role="alert">{error || restoreError}</p>}
      <p className="sr-only" role="status">{notice}</p>

      <section className="editor-panel editor-timeline" aria-labelledby="timeline-heading">
        <div className="editor-panel-heading editor-timeline-heading">
          <div>
            <h2 id="timeline-heading"><ListChecks size={17} /> Draft timeline</h2>
            <p>{beats.length ? `${counts.confirmed} confirmed · ${counts.pending} to review · ${formatTime(total)} cut duration` : 'Build a draft to start reviewing your cut.'}</p>
          </div>
          <div className="editor-actions">
            <button className="editor-button editor-icon-button" type="button" disabled={!past.length} aria-label="Undo timeline change" title="Undo (Ctrl/⌘ Z)"
              onClick={() => { stop(); dispatch({ type: 'undo' }); }}><Undo2 size={17} /></button>
            <button className="editor-button editor-icon-button" type="button" disabled={!future.length} aria-label="Redo timeline change" title="Redo (Ctrl/⌘ Shift Z)"
              onClick={() => { stop(); dispatch({ type: 'redo' }); }}><Redo2 size={17} /></button>
            <button className="editor-button" type="button" disabled={!sourceReady || !approved.length}
              onClick={() => playing && playback.current ? stop() : play(approved.map(({ start, end, transcript: text }) => ({ start, end, text })))}>
              {playing && playback.current ? <><Pause size={16} /> Stop playback</> : <><Play size={16} /> Play confirmed cut</>}
            </button>
            <button className="editor-button editor-primary" type="button" disabled={!ready} onClick={exportTimeline}>
              <ArrowDownToLine size={16} /> Download timeline
            </button>
          </div>
        </div>

        {beats.length ? <>
          <div className="editor-sequence" aria-label="Cut sequence">
            {beats.map((beat, index) => (
              <button key={beat.id} type="button" data-state={beat.review} aria-pressed={beat.id === active?.id}
                onClick={() => { setActiveId(beat.id); setFilter('all'); }}
                title={beat.text}><span>{String(index + 1).padStart(2, '0')}</span>{beat.text}</button>
            ))}
          </div>
          <div className="editor-review-grid">
            <div className="editor-review-list">
              <div className="editor-review-filters" role="group" aria-label="Filter script beats">
                {(['all', 'pending', 'confirmed', 'omitted'] as const).map((value) => (
                  <button key={value} type="button" aria-pressed={filter === value} onClick={() => {
                    setFilter(value);
                    setActiveId((value === 'all' ? beats : beats.filter((beat) => beat.review === value))[0]?.id ?? activeId);
                  }}>{value === 'all' ? 'All' : value === 'pending' ? 'To review' : value === 'confirmed' ? 'Confirmed' : 'Omitted'}
                    <span>{value === 'all' ? beats.length : counts[value]}</span>
                  </button>
                ))}
              </div>
              <ol>
                {visibleBeats.map((beat) => (
                  <li key={beat.id}>
                    <button className="editor-review-row" type="button" aria-pressed={beat.id === active?.id} onClick={() => setActiveId(beat.id)}>
                      <span className="editor-beat-index">{String(beats.indexOf(beat) + 1).padStart(2, '0')}</span>
                      <span dir="auto">{beat.text}</span>
                      <span className="editor-status" data-state={beat.review}>
                        {beat.review === 'pending' ? beat.choice === null ? 'Needs footage' : 'Review' : beat.review === 'confirmed' ? 'Confirmed' : 'Omitted'}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
              {!visibleBeats.length && <p className="editor-empty-filter">No lines in this view.</p>}
            </div>
            {active && (
              <section className="editor-inspector" aria-label="Selected clip inspector">
                <div className="editor-inspector-heading">
                  <h3>Clip {String(activeIndex + 1).padStart(2, '0')}</h3>
                  <div className="editor-actions">
                    <button className="editor-button editor-icon-button" type="button" aria-label="Move clip earlier" disabled={activeIndex <= 0}
                      onClick={() => { stop(); dispatch({ type: 'edit', edit: (current) => moveBeat(current, active.id, -1) }); }}><ArrowUp size={16} /></button>
                    <button className="editor-button editor-icon-button" type="button" aria-label="Move clip later" disabled={activeIndex >= beats.length - 1}
                      onClick={() => { stop(); dispatch({ type: 'edit', edit: (current) => moveBeat(current, active.id, 1) }); }}><ArrowDown size={16} /></button>
                  </div>
                </div>
                <p className="editor-line" dir="auto">{active.text}</p>
                {active.review !== 'omitted' && <>
                  {match && <label className="editor-field">
                    Source clip
                    <select value={active.choice ?? ''} onChange={(event) => {
                      const index = Number(event.target.value);
                      updateBeat(active.id, (beat) => ({ ...beat, choice: index, review: 'pending' }));
                    }}>
                      {active.matches.map((option, index) => <option value={index} key={index}>
                        {formatTime(option.start)} – {formatTime(option.end)}{option.exact ? ' · Quote match' : ''}
                      </option>)}
                    </select>
                  </label>}
                  {match && <blockquote dir="auto">{match.text}</blockquote>}
                  <RangeEditor key={`${active.id}:${active.choice}:${duration}`} match={match} duration={duration}
                    position={position} onSave={(start, end) => saveRange(active, start, end, match?.text)} />
                </>}
                <div className="editor-actions editor-inspector-actions">
                  {match && active.review !== 'omitted' && <>
                    <button className="editor-button" type="button" disabled={!sourceReady || !validRange(match.start, match.end, duration)}
                      onClick={() => play([match], active.id)}><Play size={15} /> Preview clip</button>
                    <button className="editor-button editor-primary" type="button" disabled={!sourceReady || active.review === 'confirmed' || !validRange(match.start, match.end, duration)}
                      onClick={() => {
                        updateBeat(active.id, (beat) => ({ ...beat, review: 'confirmed' }));
                        if (filter === 'pending') setActiveId(beats.find((beat) => beat.id !== active.id && beat.review === 'pending')?.id ?? active.id);
                      }}><Check size={16} /> {active.review === 'confirmed' ? 'Confirmed' : 'Confirm clip'}</button>
                  </>}
                  <button className="editor-button editor-quiet" type="button" onClick={() => updateBeat(active.id, (beat) => ({
                    ...beat, review: beat.review === 'omitted' ? 'pending' : 'omitted',
                  }))}>{active.review === 'omitted' ? 'Restore line' : 'Omit line'}</button>
                </div>
              </section>
            )}
          </div>
          <div className="editor-export-note">
            <p>{ready
              ? 'Use the timeline JSON with the local MP4 renderer.'
              : !sourceReady
                ? 'Reconnect the source to preview or export this cut.'
                : draftOutdated
                  ? 'Rebuild the draft to include your updated inputs.'
                  : 'Confirm or omit every line before export.'}
              {ready && <a href="https://github.com/abdulrafayhamid99-eng/kosmos-ai/blob/phase-2-script-editor/README.md#script-editor" target="_blank" rel="noreferrer"> Rendering instructions <ChevronRight size={13} /></a>}
            </p>
            {captionTrack.length > 0 && <button type="button" className="editor-button" disabled={!ready} onClick={() => {
              download('kosmos-cut.srt', toSrt(captionTrack), 'application/x-subrip');
              setNotice('Cut captions downloaded.');
            }}><Captions size={16} /> Download captions</button>}
          </div>
        </> : <div className="editor-empty-timeline" aria-hidden="true"><div /><div /><div /></div>}
      </section>
    </div>
  );
}

function RangeEditor({ match, duration, position, onSave }: {
  match?: Cue;
  duration: number;
  position: number;
  onSave: (start: number, end: number) => void;
}) {
  const [start, setStart] = useState(match ? match.start.toFixed(3) : '');
  const [end, setEnd] = useState(match ? (Math.floor(Math.min(match.end, duration || match.end) * 1000) / 1000).toFixed(3) : '');

  function setPoint(set: (value: string) => void) {
    set((Math.floor(Math.min(duration, position) * 1000) / 1000).toFixed(3));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave(Number(start), Number(end));
  }

  return (
    <form className="editor-range-form" onSubmit={submit}>
      <label className="editor-field">In (seconds)
        <input type="number" min="0" max={duration} step={minimumStep} value={start} required disabled={!duration}
          onChange={(event) => setStart(event.target.value)} />
      </label>
      <button className="editor-button editor-quiet" type="button" disabled={!duration} onClick={() => setPoint(setStart)}>Mark In</button>
      <label className="editor-field">Out (seconds)
        <input type="number" min={minimumStep} max={duration} step={minimumStep} value={end} required disabled={!duration}
          onChange={(event) => setEnd(event.target.value)} />
      </label>
      <button className="editor-button editor-quiet" type="button" disabled={!duration} onClick={() => setPoint(setEnd)}>Mark Out</button>
      <button className="editor-button editor-range-submit" type="submit" disabled={!duration || !start || !end || (match?.start === Number(start) && match.end === Number(end))}>
        <Scissors size={15} /> Apply range
      </button>
    </form>
  );
}
