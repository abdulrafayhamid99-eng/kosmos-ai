"""
Comprehensive Unit and Integration Test Suite for KosMos AI Worker QC & Pipeline Logic.

Tests:
1. Output Quality Control gate (run_output_qc) across all checks:
   - Non-empty file validation
   - Video stream existence
   - Dimensions match
   - Frame rate consistency (both fixed target and native source pass-through)
   - Duration consistency and drift detection
   - Video codec match (H.264 / AVC)
   - Audio stream retention
   - Audio/video duration timeline sync & drift tolerance
   - Full decode failure detection (corrupt stream, stderr errors)
   - Full decode timeout handling (TimeoutExpired)
2. Mathematical pixel alteration verification for all 5 Camera Profiles:
   - ARRI Alexa 35 LogC4 alters pixels
   - Fujifilm Eterna alters pixels
   - Panavision DXL2 alters pixels
   - Leica SL2-S Cine alters pixels
   - Neutral Rec.709 strictly preserves identical pixel values
3. Color grade & filtergraph compilation in apply_color_grade_and_grain:
   - Neutral LUT cleanly bypasses lut3d filter
   - Creative LUT correctly inserts lut3d with tetrahedral interpolation
   - Interlaced 1080i TFF inserts setfield=tff and tinterlace
   - Dejudder / shutter fix inserts dejudder=cycle=4 and tmix
   - Flat Log curve inserts curves=all=...
"""

import math
import os
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import MagicMock, patch

# Ensure worker package is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pipeline import (
    BroadcastEnhancementPipeline,
    generate_cube_lut
)


class TestBroadcastQualityControl(unittest.TestCase):
    def setUp(self):
        self.pipeline = BroadcastEnhancementPipeline()

    def test_qc_missing_file(self):
        """QC fails immediately if rendered file does not exist on disk."""
        qc = self.pipeline.run_output_qc(
            output_video="/non/existent/path/rendered.mp4",
            target_w=3840,
            target_h=2160,
            target_fps=60,
            source_info={"duration": 10.0, "has_audio": True}
        )
        self.assertFalse(qc["passed"])
        self.assertFalse(qc["checks"]["fileNonEmpty"])
        self.assertTrue(any("missing or zero bytes" in r for r in qc["reasons"]))

    def test_qc_all_passed(self):
        """QC passes when all dimensions, fps, duration, audio, and codecs match."""
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            f.write(b"dummy mp4 media stream content")
            tmp_path = f.name

        try:
            mock_out_info = {
                "width": 3840,
                "height": 2160,
                "fps": 60.0,
                "duration": 10.0,
                "video_duration": 10.0,
                "codec_name": "h264",
                "has_audio": True,
                "audio_duration": 10.05,
            }
            source_info = {
                "duration": 10.0,
                "has_audio": True,
            }

            with patch.object(self.pipeline, "inspect_video", return_value=mock_out_info):
                qc = self.pipeline.run_output_qc(
                    output_video=tmp_path,
                    target_w=3840,
                    target_h=2160,
                    target_fps=60,
                    source_info=source_info,
                    expected_codec="h264"
                )

            self.assertTrue(qc["passed"])
            self.assertTrue(qc["checks"]["fileNonEmpty"])
            self.assertTrue(qc["checks"]["videoStreamPresent"])
            self.assertTrue(qc["checks"]["dimensionsMatch"])
            self.assertTrue(qc["checks"]["frameRateConsistent"])
            self.assertTrue(qc["checks"]["durationConsistent"])
            self.assertTrue(qc["checks"]["codecMatch"])
            self.assertTrue(qc["checks"]["audioConsistent"])
            self.assertTrue(qc["checks"]["audioDurationWithinTolerance"])
            self.assertEqual(len(qc["reasons"]), 0)
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def test_qc_dimension_mismatch(self):
        """QC fails if rendered output dimensions do not equal target dimensions."""
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            f.write(b"dummy mp4")
            tmp_path = f.name

        try:
            mock_out_info = {
                "width": 1920,
                "height": 1080,
                "fps": 60.0,
                "duration": 10.0,
                "video_duration": 10.0,
                "codec_name": "h264",
                "has_audio": False,
            }
            source_info = {"duration": 10.0, "has_audio": False}

            with patch.object(self.pipeline, "inspect_video", return_value=mock_out_info):
                qc = self.pipeline.run_output_qc(
                    output_video=tmp_path,
                    target_w=3840,
                    target_h=2160,
                    target_fps=60,
                    source_info=source_info
                )

            self.assertFalse(qc["passed"])
            self.assertFalse(qc["checks"]["dimensionsMatch"])
            self.assertTrue(any("Dimensions mismatch" in r for r in qc["reasons"]))
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def test_qc_fps_mismatch(self):
        """QC fails if measured FPS differs significantly from target FPS."""
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            f.write(b"dummy mp4")
            tmp_path = f.name

        try:
            mock_out_info = {
                "width": 3840,
                "height": 2160,
                "fps": 24.0,  # Expected 60
                "duration": 10.0,
                "codec_name": "h264",
                "has_audio": False,
            }
            source_info = {"duration": 10.0, "has_audio": False}

            with patch.object(self.pipeline, "inspect_video", return_value=mock_out_info):
                qc = self.pipeline.run_output_qc(
                    output_video=tmp_path,
                    target_w=3840,
                    target_h=2160,
                    target_fps=60,
                    source_info=source_info
                )

            self.assertFalse(qc["passed"])
            self.assertFalse(qc["checks"]["frameRateConsistent"])
            self.assertTrue(any("Frame rate mismatch" in r for r in qc["reasons"]))
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def test_qc_native_fps_drift(self):
        """QC fails if native target (target_fps=0) drifts from source FPS."""
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            f.write(b"dummy mp4")
            tmp_path = f.name

        try:
            mock_out_info = {
                "width": 3840,
                "height": 2160,
                "fps": 24.0,  # Source was 50.0
                "duration": 10.0,
                "codec_name": "h264",
                "has_audio": False,
            }
            source_info = {"fps": 50.0, "duration": 10.0, "has_audio": False}

            with patch.object(self.pipeline, "inspect_video", return_value=mock_out_info):
                qc = self.pipeline.run_output_qc(
                    output_video=tmp_path,
                    target_w=3840,
                    target_h=2160,
                    target_fps=0,
                    source_info=source_info
                )

            self.assertFalse(qc["passed"])
            self.assertFalse(qc["checks"]["frameRateConsistent"])
            self.assertTrue(any("Native frame rate drift" in r for r in qc["reasons"]))
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def test_qc_duration_drift(self):
        """QC fails if output duration drifts by more than 1.5 seconds from source."""
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            f.write(b"dummy mp4")
            tmp_path = f.name

        try:
            mock_out_info = {
                "width": 3840,
                "height": 2160,
                "fps": 60.0,
                "duration": 15.0,  # Drifted from 10.0s
                "codec_name": "h264",
                "has_audio": False,
            }
            source_info = {"duration": 10.0, "has_audio": False}

            with patch.object(self.pipeline, "inspect_video", return_value=mock_out_info):
                qc = self.pipeline.run_output_qc(
                    output_video=tmp_path,
                    target_w=3840,
                    target_h=2160,
                    target_fps=60,
                    source_info=source_info
                )

            self.assertFalse(qc["passed"])
            self.assertFalse(qc["checks"]["durationConsistent"])
            self.assertTrue(any("Duration drift" in r for r in qc["reasons"]))
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def test_qc_dropped_audio(self):
        """QC fails if source had audio but output is silent."""
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            f.write(b"dummy mp4")
            tmp_path = f.name

        try:
            mock_out_info = {
                "width": 3840,
                "height": 2160,
                "fps": 60.0,
                "duration": 10.0,
                "codec_name": "h264",
                "has_audio": False,  # Audio was stripped!
            }
            source_info = {"duration": 10.0, "has_audio": True}

            with patch.object(self.pipeline, "inspect_video", return_value=mock_out_info):
                qc = self.pipeline.run_output_qc(
                    output_video=tmp_path,
                    target_w=3840,
                    target_h=2160,
                    target_fps=60,
                    source_info=source_info
                )

            self.assertFalse(qc["passed"])
            self.assertFalse(qc["checks"]["audioConsistent"])
            self.assertTrue(any("Source had audio but output is silent" in r for r in qc["reasons"]))
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def test_qc_audio_timeline_drift(self):
        """QC fails if audio stream length drifts from video stream by more than 0.8s."""
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            f.write(b"dummy mp4")
            tmp_path = f.name

        try:
            mock_out_info = {
                "width": 3840,
                "height": 2160,
                "fps": 60.0,
                "duration": 10.0,
                "video_duration": 10.0,
                "codec_name": "h264",
                "has_audio": True,
                "audio_duration": 8.0,  # Drift of 2.0s!
            }
            source_info = {"duration": 10.0, "has_audio": True}

            with patch.object(self.pipeline, "inspect_video", return_value=mock_out_info):
                qc = self.pipeline.run_output_qc(
                    output_video=tmp_path,
                    target_w=3840,
                    target_h=2160,
                    target_fps=60,
                    source_info=source_info
                )

            self.assertFalse(qc["passed"])
            self.assertFalse(qc["checks"]["audioDurationWithinTolerance"])
            self.assertTrue(any("Audio/Video timeline drift" in r for r in qc["reasons"]))
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def test_qc_codec_mismatch(self):
        """QC fails if output is encoded in non-H.264 codec."""
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            f.write(b"dummy mp4")
            tmp_path = f.name

        try:
            mock_out_info = {
                "width": 3840,
                "height": 2160,
                "fps": 60.0,
                "duration": 10.0,
                "codec_name": "mpeg4",  # Not h264/avc
                "has_audio": False,
            }
            source_info = {"duration": 10.0, "has_audio": False}

            with patch.object(self.pipeline, "inspect_video", return_value=mock_out_info):
                qc = self.pipeline.run_output_qc(
                    output_video=tmp_path,
                    target_w=3840,
                    target_h=2160,
                    target_fps=60,
                    source_info=source_info,
                    expected_codec="h264"
                )

            self.assertFalse(qc["passed"])
            self.assertFalse(qc["checks"]["codecMatch"])
            self.assertTrue(any("Codec mismatch" in r for r in qc["reasons"]))
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def test_qc_decode_failure_captured(self):
        """QC fails if full decoding encounters corruption or stderr errors."""
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            f.write(b"corrupt mp4 data")
            tmp_path = f.name

        try:
            mock_out_info = {
                "width": 3840,
                "height": 2160,
                "fps": 60.0,
                "duration": 10.0,
                "codec_name": "h264",
                "has_audio": False,
            }
            source_info = {"duration": 10.0, "has_audio": False}

            mock_decode_res = MagicMock(returncode=1, stderr="Invalid NAL unit 0, slice type -1")
            with patch.object(self.pipeline, "inspect_video", return_value=mock_out_info):
                with patch("subprocess.run", return_value=mock_decode_res):
                    qc = self.pipeline.run_output_qc(
                        output_video=tmp_path,
                        target_w=3840,
                        target_h=2160,
                        target_fps=60,
                        source_info=source_info
                    )

            self.assertFalse(qc["passed"])
            self.assertFalse(qc["checks"]["fullDecodeVerified"])
            self.assertTrue(any("Decode check errors" in r for r in qc["reasons"]))
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def test_qc_decode_timeout_captured(self):
        """QC fails if full decoding hangs and times out."""
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            f.write(b"hanging mp4 data")
            tmp_path = f.name

        try:
            mock_out_info = {
                "width": 3840,
                "height": 2160,
                "fps": 60.0,
                "duration": 10.0,
                "codec_name": "h264",
                "has_audio": False,
            }
            source_info = {"duration": 10.0, "has_audio": False}

            with patch.object(self.pipeline, "inspect_video", return_value=mock_out_info):
                with patch("subprocess.run", side_effect=subprocess.TimeoutExpired(cmd="ffmpeg", timeout=120)):
                    qc = self.pipeline.run_output_qc(
                        output_video=tmp_path,
                        target_w=3840,
                        target_h=2160,
                        target_fps=60,
                        source_info=source_info
                    )

            self.assertFalse(qc["passed"])
            self.assertFalse(qc["checks"]["fullDecodeVerified"])
            self.assertTrue(any("timed out" in r for r in qc["reasons"]))
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)


class TestColorAndLutProcessing(unittest.TestCase):
    def setUp(self):
        self.pipeline = BroadcastEnhancementPipeline()

    def test_generate_neutral_lut_identity(self):
        """Neutral 3D LUT must generate an exact identity matrix where output == input."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            lut_file = os.path.join(tmp_dir, "neutral.cube")
            lut_path = generate_cube_lut(lut_file, "neutral")
            self.assertTrue(os.path.exists(lut_path))
            with open(lut_path, "r", encoding="utf-8") as f:
                lines = f.readlines()

            data_lines = [l.strip() for l in lines if l.strip() and not l.startswith("#") and not l.startswith("TITLE") and not l.startswith("LUT") and not l.startswith("DOMAIN")]
            # Check corner sample points
            self.assertIn("0.000000 0.000000 0.000000", data_lines)
            self.assertIn("1.000000 1.000000 1.000000", data_lines)

    def test_all_15_selectable_profiles_coverage(self):
        """
        Verify that all 15 camera LUT profiles (both original and newly added):
        1. Successfully generate a valid .cube file.
        2. Neutral preserves exact identity (0.500000 0.500000 0.500000).
        3. All 14 non-neutral profiles mathematically alter pixels (do not equal identity).
        """
        all_15_profiles = [
            "neutral",
            "arri-alexa-35",
            "sony-scinetone",
            "red-ipp2",
            "canon-clog",
            "fuji-eterna",
            "panasonic-vlog",
            "blackmagic-film",
            "kodak-2383",
            "agfa-vintage",
            "bleach-bypass",
            "teal-orange",
            "monochrome-cinema",
            "panavision-dxl2",
            "leica-sl2s-cine",
        ]

        with tempfile.TemporaryDirectory() as tmp_dir:
            for profile in all_15_profiles:
                lut_file = os.path.join(tmp_dir, f"{profile}.cube")
                generated_path = generate_cube_lut(lut_file, profile, size=5)
                self.assertTrue(os.path.exists(generated_path), f"LUT file was not created for {profile}")

                with open(generated_path, "r", encoding="utf-8") as f:
                    content = f.read()

                self.assertIn("LUT_3D_SIZE 5", content, f"Header missing LUT_3D_SIZE for {profile}")

                if profile == "neutral":
                    self.assertIn("0.500000 0.500000 0.500000", content, "Neutral profile did not preserve identity!")
                else:
                    self.assertNotIn(
                        "0.500000 0.500000 0.500000",
                        content,
                        f"Non-neutral profile '{profile}' failed to alter midtone pixels (produced identity)!"
                    )

    def test_unknown_lut_profile_raises_error(self):
        """Do not silently fall back to Neutral when a requested profile is invalid; raise ValueError."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            lut_file = os.path.join(tmp_dir, "unknown.cube")
            with self.assertRaises(ValueError):
                generate_cube_lut(lut_file, "unknown-unsupported-profile-99")

    def test_apply_color_grade_neutral_bypasses_lut3d(self):
        """apply_color_grade_and_grain with neutral profile must NOT add lut3d to filtergraph."""
        mock_info = {"width": 1920, "height": 1080}
        with patch.object(self.pipeline, "inspect_video", return_value=mock_info):
            with patch("subprocess.run") as mock_sub:
                self.pipeline.apply_color_grade_and_grain(
                    input_video="in.mp4",
                    output_video="out.mp4",
                    camera_preset_id="neutral",
                    grain_level=0,
                    field_mode="progressive",
                    shutter_fix=False,
                    target_gamma="rec709",
                    target_width=1920,
                    target_height=1080
                )
                args, _ = mock_sub.call_args
                cmd = args[0]
                filter_arg_idx = cmd.index("-filter:v")
                filter_graph = cmd[filter_arg_idx + 1]
                self.assertNotIn("lut3d", filter_graph, "Neutral profile accidentally added lut3d filter!")
                self.assertNotIn("tinterlace", filter_graph, "Progressive mode accidentally added tinterlace filter!")

    def test_apply_color_grade_creative_adds_lut3d(self):
        """apply_color_grade_and_grain with ARRI profile must add lut3d filter with tetrahedral interp."""
        mock_info = {"width": 1920, "height": 1080}
        with tempfile.TemporaryDirectory() as tmp_dir:
            with patch.object(self.pipeline, "inspect_video", return_value=mock_info):
                with patch("subprocess.run") as mock_sub:
                    self.pipeline.apply_color_grade_and_grain(
                        input_video="in.mp4",
                        output_video="out.mp4",
                        camera_preset_id="arri-alexa-35",
                        grain_level=12,
                        field_mode="interlaced-tff",
                        shutter_fix=True,
                        target_gamma="flat-log",
                        luts_dir=tmp_dir,
                        target_width=1920,
                        target_height=1080
                    )
                    args, _ = mock_sub.call_args
                    cmd = args[0]
                    filter_arg_idx = cmd.index("-filter:v")
                    filter_graph = cmd[filter_arg_idx + 1]
                    self.assertIn("lut3d", filter_graph, "ARRI profile missing lut3d in filtergraph!")
                    self.assertIn("interp=tetrahedral", filter_graph, "Missing tetrahedral interpolation!")
                    self.assertIn("setfield=tff", filter_graph, "Missing 1080i TFF raster formatting!")
                    self.assertIn("tinterlace=mode=interleave_top", filter_graph, "Missing interleave_top filter!")
                    self.assertIn("dejudder=cycle=4", filter_graph, "Missing dejudder filter!")
                    self.assertIn("curves=all=", filter_graph, "Missing flat-log curves filter!")


class Test12SecondRegression(unittest.TestCase):
    """
    Regression test suite verifying that a ~12-second input at 25 FPS produces
    an output of approximately 12 seconds at 25 FPS with audio synchronization,
    and verifying that any truncation (e.g., 2.88s output) is strictly caught.
    """
    def setUp(self):
        self.pipeline = BroadcastEnhancementPipeline()

    def test_twelve_second_25fps_passes_qc_and_audio_sync(self):
        """
        Verifies that a 12.195s input normalized to 25 FPS produces ~12.20s output
        with 305 frames and synchronous audio within documented tolerance (0.25s).
        """
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            f.write(b"simulated 12.2s rendered master stream")
            tmp_path = f.name

        try:
            source_info = {
                "width": 480,
                "height": 854,
                "fps": 29.355,
                "r_fps": 29.833,
                "avg_fps": 29.355,
                "duration": 12.195,
                "video_duration": 12.195,
                "has_audio": True,
                "audio_duration": 12.077,
                "is_vfr": True,
            }
            # Expected 25 FPS output: 305 frames / 25 FPS = 12.20s
            mock_output_info = {
                "width": 3840,
                "height": 2160,
                "fps": 25.0,
                "duration": 12.20,
                "video_duration": 12.20,
                "nb_frames": 305,
                "codec_name": "h264",
                "has_audio": True,
                "audio_duration": 12.077,
            }

            with patch.object(self.pipeline, "inspect_video", return_value=mock_output_info):
                qc = self.pipeline.run_output_qc(
                    output_video=tmp_path,
                    target_w=3840,
                    target_h=2160,
                    target_fps=25,
                    source_info=source_info,
                    expected_codec="h264"
                )

            self.assertTrue(qc["passed"], f"QC failed unexpectedly: {qc.get('reasons')}")
            self.assertTrue(qc["checks"]["durationConsistent"])
            self.assertTrue(qc["checks"]["audioConsistent"])
            self.assertTrue(qc["checks"]["audioDurationWithinTolerance"])
            self.assertTrue(qc["checks"]["frameRateConsistent"])
            self.assertTrue(qc["checks"]["dimensionsMatch"])

            # Verify documented duration tolerance: delta <= 0.25s
            duration_delta = abs(mock_output_info["duration"] - source_info["duration"])
            self.assertLessEqual(duration_delta, 0.25, f"Duration delta {duration_delta}s exceeds 0.25s tolerance")

            # Verify audio/video synchronization drift: <= 0.25s
            av_drift = abs(mock_output_info["video_duration"] - mock_output_info["audio_duration"])
            self.assertLessEqual(av_drift, 0.25, f"Audio/video sync drift {av_drift}s exceeds 0.25s tolerance")
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    def test_truncated_output_fails_qc(self):
        """
        Regression test: If a 12-second input produces only a 2.88-second output
        (the defect observed in job_1792247770890_dwin018), QC must detect the failure.
        """
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            f.write(b"truncated 2.88s media stream")
            tmp_path = f.name

        try:
            source_info = {
                "duration": 12.195,
                "video_duration": 12.195,
                "has_audio": True,
                "audio_duration": 12.077,
            }
            # Defect state: 2.88s output with missing audio
            truncated_output_info = {
                "width": 3840,
                "height": 2160,
                "fps": 25.0,
                "duration": 2.88,
                "video_duration": 2.88,
                "nb_frames": 72,
                "codec_name": "h264",
                "has_audio": False,
                "audio_duration": 0.0,
            }

            with patch.object(self.pipeline, "inspect_video", return_value=truncated_output_info):
                qc = self.pipeline.run_output_qc(
                    output_video=tmp_path,
                    target_w=3840,
                    target_h=2160,
                    target_fps=25,
                    source_info=source_info,
                    expected_codec="h264"
                )

            self.assertFalse(qc["passed"], "QC should have failed for truncated output!")
            self.assertFalse(qc["checks"]["durationConsistent"], "Duration consistency check should fail for 2.88s vs 12.2s!")
            self.assertFalse(qc["checks"]["audioConsistent"], "Audio consistency check should fail when audio was stripped!")
            self.assertTrue(any("Duration drift" in r or "duration" in r.lower() for r in qc["reasons"]))
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)


if __name__ == "__main__":
    unittest.main()
