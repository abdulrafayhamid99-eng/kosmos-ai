import assert from 'node:assert/strict';
import { cutScript, formatTime, parseTranscript, selectedCut } from '../lib/editor/timeline.ts';

const srt = [
  '1\n00:00:00,100 --> 00:00:01,000\nRelief teams reached the district hospital.',
  '2\n00:00:02,000 --> 00:00:03,000\nہم آج یہاں پہنچے۔',
  '3\n00:00:04,000 --> 00:00:05,000\nRelief teams reached the district hospital.',
].join('\n\n');
const cues = parseTranscript(srt);
assert.equal(cues.length, 3);
const beats = cutScript('ہم آج یہاں پہنچے۔\nRelief teams reached the district hospital.\n[B-roll] Hospital exterior\nPrime minister announced the budget.', cues);
assert.equal(beats[0].matches[0].start, 2);
assert.deepEqual(beats[1].matches.filter((cue) => cue.exact).map((cue) => cue.start), [0.1, 4]);
assert.equal(beats[2].matches.length, 0);
assert.equal(beats[3].matches.length, 0);
assert.deepEqual(selectedCut(beats), []);
beats[0].review = beats[1].review = 'confirmed';
beats[1].choice = 1;
assert.deepEqual(selectedCut(beats).map((cue) => cue.start), [2, 4]);
assert.equal(formatTime(3690.15), '1:01:30.150');
assert.equal(parseTranscript('WEBVTT\n\n00:01.500 --> 00:03.000 line:90%\n<v Reporter>Good evening</v>')[0].text, 'Good evening');
assert.throws(() => parseTranscript('1\n00:00:02,000 --> 00:00:01,000\nBackwards cue.'));
console.log('Script Editor timeline tests passed.');
