"""Produce a timestamped WebVTT transcript from a local source video."""

import argparse
import math
from pathlib import Path


def timestamp(seconds):
    time = round(seconds * 1000)
    hours, remainder = divmod(time, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    secs, millis = divmod(remainder, 1000)
    return f"{hours:02}:{minutes:02}:{secs:02}.{millis:03}"


def timed_phrases(segment):
    phrase = []
    for word in segment.words or []:
        if phrase and (word.start - phrase[-1].end > 0.65 or len(phrase) >= 16):
            yield phrase[0].start, phrase[-1].end, "".join(item.word for item in phrase)
            phrase = []
        phrase.append(word)
        if len(phrase) >= 4 and word.word.rstrip().endswith((".", ",", "?", "!", "؛", "۔", "،", "؟")):
            yield phrase[0].start, phrase[-1].end, "".join(item.word for item in phrase)
            phrase = []
    if phrase:
        yield phrase[0].start, phrase[-1].end, "".join(item.word for item in phrase)
    elif not segment.words:
        yield segment.start, segment.end, segment.text


def transcribe(source, output, model_name, language=None, cache_dir=None):
    try:
        from faster_whisper import WhisperModel
    except ImportError as exc:
        raise RuntimeError("Install worker/requirements-editor.txt first.") from exc

    if output.exists():
        raise FileExistsError(f"Output already exists: {output}")
    source = source.resolve(strict=True)
    model = WhisperModel(model_name, device="cpu", compute_type="int8", download_root=cache_dir)
    segments, info = model.transcribe(
        str(source), language=language, vad_filter=True, beam_size=5, word_timestamps=True
    )
    cues = []
    for segment in segments:
        for start, end, raw_text in timed_phrases(segment):
            text = " ".join(raw_text.split())
            if text and math.isfinite(start) and math.isfinite(end) and 0 <= start < end:
                if timestamp(start) != timestamp(end):
                    cues.append(f"{timestamp(start)} --> {timestamp(end)}\n{text}")
    if not cues:
        raise ValueError("No speech was transcribed.")
    with output.open("x", encoding="utf-8") as transcript:
        transcript.write("WEBVTT\n\n" + "\n\n".join(cues) + "\n")
    return len(cues), info.language


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("transcript", type=Path)
    parser.add_argument("--model", default="tiny", help="Multilingual model name or a local CTranslate2 model directory")
    parser.add_argument("--language", help="Spoken language code, e.g. en or ur. Defaults to detection.")
    parser.add_argument("--model-cache", help="Optional model cache directory")
    args = parser.parse_args()
    try:
        count, language = transcribe(args.source, args.transcript, args.model, args.language, args.model_cache)
    except (OSError, RuntimeError, ValueError) as error:
        parser.exit(1, f"Could not transcribe: {error}\n")
    print(f"Saved {count} cues ({language}) to {args.transcript}.")


if __name__ == "__main__":
    main()
