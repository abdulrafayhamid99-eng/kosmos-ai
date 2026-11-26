"""Render a reviewed KosMos Script Editor timeline against a local source file."""

import argparse
import json
import math
import os
import subprocess
import tempfile
from pathlib import Path


def run(*args, **options):
    return subprocess.run(args, check=True, **options)


def inspect(path):
    return json.loads(run(
        "ffprobe", "-v", "error", "-show_streams", "-show_format",
        "-of", "json", str(path), capture_output=True, text=True,
    ).stdout)


def load_timeline(manifest, source, duration):
    project = json.loads(manifest.read_text(encoding="utf-8"))
    recorded = project.get("source", {})
    if project.get("version") != 1 or recorded.get("filename") != source.name or recorded.get("bytes") != source.stat().st_size:
        raise ValueError("Choose the original file listed in this timeline.")
    clips = project.get("clips")
    if not isinstance(clips, list) or not clips:
        raise ValueError("This timeline has no confirmed clips.")
    cuts = []
    for index, clip in enumerate(clips, start=1):
        start = float(clip["start"])
        end = float(clip["end"])
        if not math.isfinite(start) or not math.isfinite(end) or not 0 <= start < end <= duration + 0.001:
            raise ValueError(f"Clip {index} is outside the source duration.")
        cuts.append((start, min(end, duration)))
    return cuts


def render_cut(manifest, source, target):
    source = source.resolve(strict=True)
    target = target.absolute()
    if target.suffix.lower() != ".mp4":
        raise ValueError("The output filename must end in .mp4.")
    if target.exists():
        raise FileExistsError(f"Output already exists: {target}")

    original = inspect(source)
    streams = original["streams"]
    if not any(stream["codec_type"] == "video" for stream in streams):
        raise ValueError("The source file has no video stream.")
    has_audio = any(stream["codec_type"] == "audio" for stream in streams)
    duration = next((stream.get("duration") for stream in streams if stream["codec_type"] == "video"), None)
    if not duration or duration == "N/A":
        duration = original["format"].get("duration")
    cuts = load_timeline(manifest, source, float(duration))

    with tempfile.TemporaryDirectory(prefix=".kosmos-cut-", dir=target.parent) as directory:
        work = Path(directory)
        paths = []
        for index, (start, end) in enumerate(cuts):
            name = f"clip-{index:05d}.mkv"
            run(
                "ffmpeg", "-nostdin", "-v", "error", "-xerror", "-ss", f"{start:.6f}",
                "-i", str(source), "-t", f"{end - start:.6f}",
                "-map", "0:v:0", "-map", "0:a:0?", "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2",
                "-c:v", "libx264", "-crf", "18", "-preset", "fast", "-pix_fmt", "yuv420p",
                "-c:a", "pcm_s16le", str(work / name),
            )
            paths.append(f"file '{name}'")
        (work / "concat.txt").write_text("\n".join(paths) + "\n", encoding="utf-8")
        master = work / "master.mp4"
        run(
            "ffmpeg", "-nostdin", "-v", "error", "-xerror", "-f", "concat",
            "-safe", "1", "-i", "concat.txt", "-map", "0:v:0", "-map", "0:a:0?",
            "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", master.name, cwd=work,
        )
        run("ffmpeg", "-nostdin", "-v", "error", "-xerror", "-i", str(master),
            "-map", "0:v:0", "-map", "0:a:0?", "-f", "null", "-")
        output = inspect(master)
        output_audio = any(stream["codec_type"] == "audio" for stream in output["streams"])
        expected = sum(end - start for start, end in cuts)
        actual = float(output["format"]["duration"])
        if output_audio != has_audio or abs(actual - expected) > max(0.15, len(cuts) * 0.09):
            raise ValueError(f"Output verification failed. Expected {expected:.3f}s, got {actual:.3f}s.")
        # The work directory is on the same filesystem. Link fails safely if the
        # filename was taken while FFmpeg was rendering.
        os.link(master, target)
    return actual


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("timeline", type=Path)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    options = parser.parse_args()
    try:
        duration = render_cut(options.timeline, options.source, options.output)
    except (OSError, ValueError, KeyError, TypeError, subprocess.CalledProcessError) as error:
        parser.exit(1, f"Could not export the cut: {error}\n")
    print(f"Exported {options.output} ({duration:.3f}s).")


if __name__ == "__main__":
    main()
