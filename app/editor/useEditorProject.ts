'use client';

import { useEffect, useReducer, useState } from 'react';
import { emptyProject, restoreProject, type EditorProject } from '@/lib/editor/project';
import type { Beat } from '@/lib/editor/timeline';

const storageKey = 'kosmos-editor-project-v1';
const historyLimit = 30;
type Draft = { beats: Beat[]; draftRevision: number };
type History = { project: EditorProject; past: Draft[]; future: Draft[] };
type Inputs = Pick<EditorProject, 'script' | 'transcript' | 'transcriptName'>;
type Action =
  | { type: 'load'; project: EditorProject }
  | { type: 'source'; source: EditorProject['source'] }
  | { type: 'inputs'; patch: Partial<Inputs> }
  | { type: 'edit'; edit: (beats: Beat[]) => Beat[]; rebuild?: boolean }
  | { type: 'undo' | 'redo' };

function reducer(state: History, action: Action): History {
  const { project, past, future } = state;
  const draft = { beats: project.beats, draftRevision: project.draftRevision };
  switch (action.type) {
    case 'load':
      return { project: action.project, past: [], future: [] };
    case 'source':
      return { ...state, project: { ...project, source: action.source } };
    case 'inputs':
      return { ...state, project: { ...project, ...action.patch, inputRevision: project.inputRevision + 1 } };
    case 'edit': {
      const beats = action.edit(project.beats);
      if (beats === project.beats) return state;
      return {
        project: { ...project, beats, draftRevision: action.rebuild ? project.inputRevision : project.draftRevision },
        past: [...past.slice(1 - historyLimit), draft],
        future: [],
      };
    }
    case 'undo':
      return past.length ? {
        project: { ...project, ...past[past.length - 1] },
        past: past.slice(0, -1),
        future: [draft, ...future],
      } : state;
    case 'redo':
      return future.length ? {
        project: { ...project, ...future[0] },
        past: [...past, draft],
        future: future.slice(1),
      } : state;
  }
}

export function useEditorProject() {
  const [history, dispatch] = useReducer(reducer, { project: emptyProject, past: [], future: [] });
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<'local' | 'saved' | 'unavailable'>('local');
  const [restoreError, setRestoreError] = useState('');

  useEffect(() => {
    try {
      dispatch({ type: 'load', project: restoreProject(localStorage.getItem(storageKey)) });
    } catch {
      setRestoreError('A saved project could not be restored. You can start a new one.');
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      if (history.project === emptyProject) {
        if (!restoreError) localStorage.removeItem(storageKey);
        setSaveState('local');
      } else {
        localStorage.setItem(storageKey, JSON.stringify({ version: 1, project: history.project }));
        setSaveState('saved');
      }
    } catch {
      setSaveState('unavailable');
    }
  }, [history.project, loaded, restoreError]);

  function reset(project = emptyProject) {
    setRestoreError('');
    dispatch({ type: 'load', project });
  }

  return { ...history, dispatch, loaded, saveState, restoreError, reset };
}
