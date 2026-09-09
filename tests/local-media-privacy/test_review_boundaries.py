"""Regressions for reproduced exclusion, decoder reporting and shutdown failures."""
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import MagicMock, patch
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts/local-media-privacy'))
from PIL import Image
from privacy_core import Store, PrivacyBlocked
from review_media import LocalPlayer, probe_tracks
from video_frames import VideoFrames, video_streams
from worker import scan, restart_inspection


class Detector:
    identity = 'synthetic-only'
    def __init__(self):
        self.calls = 0
    def verify_model(self):
        pass
    def signal(self, image):
        self.calls += 1
        return 'no_signal'


class ReviewBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.source = self.root / 'source'
        self.source.mkdir()
        self.path = self.source / 'geometry.png'
        Image.new('RGB', (32, 32), 'green').save(self.path)
        self.store = Store(self.root / 'runtime')
        self.asset = self.store.inventory(self.path, 'synthetic')
        self.detector = Detector()

    def tearDown(self):
        self.store.close()
        self.tmp.cleanup()

    def test_exclusion_survives_companion_and_source_changes_and_reopen(self):
        self.store.decide(self.asset, 'removal_review')
        (self.source / 'geometry.json').write_text('{"generated":true}', encoding='utf-8')
        Image.new('RGB', (32, 32), 'blue').save(self.path)
        scan(self.store, self.source, 'synthetic', self.detector)
        self.assertEqual(self.store.row(self.asset)['decision'], 'removal_review')
        self.assertEqual(self.detector.calls, 0)
        self.store.close()
        self.store = Store(self.root / 'runtime')
        with self.assertRaises(PrivacyBlocked):
            self.store.review_plan(self.asset)
        with self.assertRaises(PrivacyBlocked):
            restart_inspection(self.store, self.asset, self.detector)
        self.assertEqual(self.detector.calls, 0)

    def test_excluded_companion_blocks_existing_approval_review_scan_and_restart(self):
        companion = self.source / 'geometry.gif'
        Image.new('RGB', (32, 32), 'red').save(companion)
        other = self.store.inventory(companion, 'synthetic')
        self.store.inventory(self.path, 'synthetic')
        for unit in self.store.review_plan(other):
            self.store.mark_review_unit(other, unit['id'])
            self.store.mark_review_unit(other, unit['id'], confirmed=True)
        self.store.decide(other, 'approved_local_archive', complete_review=True)
        self.store.decide(self.asset, 'removal_review')
        with self.assertRaises(PrivacyBlocked):
            self.store.authorize(companion)
        with self.assertRaises(PrivacyBlocked):
            self.store.review_plan(other)
        with self.assertRaises(PrivacyBlocked):
            restart_inspection(self.store, other, self.detector)
        scan(self.store, self.source, 'synthetic', self.detector)
        self.assertEqual(self.detector.calls, 0)
        self.store.decide(other, 'private')
        self.assertTrue(self.store.is_excluded(companion))
        self.store.decide(self.asset, 'private')
        self.assertFalse(self.store.is_excluded(companion))

    def test_missing_original_does_not_release_companion_exclusion(self):
        self.store.decide(self.asset, 'removal_review')
        self.path.unlink()  # Only a generated fixture.
        companion = self.source / 'geometry.gif'
        Image.new('RGB', (32, 32), 'red').save(companion)
        scan(self.store, self.source, 'synthetic', self.detector)
        self.assertTrue(self.store.is_excluded(companion))
        self.assertEqual(self.detector.calls, 0)

    def test_sidecar_exclusion_applies_through_overlapping_bundle(self):
        sidecar = self.source / 'geometry.png.json'
        sidecar.write_text('{}', encoding='utf-8')
        excluded = self.store.inventory(sidecar, 'synthetic')
        self.store.decide(excluded, 'removal_review')
        companion = self.source / 'geometry.gif'
        Image.new('RGB', (32, 32), 'red').save(companion)
        other = self.store.inventory(companion, 'synthetic')
        with self.assertRaises(PrivacyBlocked):
            self.store.review_plan(other)
        scan(self.store, self.source, 'synthetic', self.detector)
        self.assertEqual(self.detector.calls, 0)

    def test_legacy_exclusion_migrates_without_opening_media(self):
        self.store.decide(self.asset, 'removal_review')
        with self.store.db:
            self.store.db.execute('DELETE FROM excluded_components')
        self.store.close()
        with patch('privacy_core.fingerprint', side_effect=AssertionError('must use metadata')):
            self.store = Store(self.root / 'runtime')
        self.assertTrue(self.store.is_excluded(self.path))

    @unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'installed decoders required')
    def test_probe_and_frame_extraction_cannot_create_inherited_report(self):
        video = self.source / 'synthetic.mkv'
        subprocess.run([shutil.which('ffmpeg'), '-nostdin', '-v', 'error', '-f', 'lavfi', '-i',
            'color=c=blue:s=32x32:r=2:d=1', '-c:v', 'ffv1', '-threads', '1', str(video)],
            capture_output=True, check=True, timeout=20)
        previous = Path.cwd()
        try:
            os.chdir(self.root)
            with patch.dict(os.environ, {'FFREPORT': 'file=decoder-leak.log:level=48',
                                         'http_proxy': 'http://example.invalid'}):
                self.assertEqual(len(probe_tracks(video)), 1)
                self.assertEqual(video_streams(video)[0], [0])
                with VideoFrames(video, 0, 0) as frames:
                    for frame in frames:
                        frame.close()
            self.assertFalse((self.root / 'decoder-leak.log').exists())
        finally:
            os.chdir(previous)

    def test_player_shutdown_timeout_keeps_handle_and_allows_retry(self):
        player = LocalPlayer.__new__(LocalPlayer)
        player.process = MagicMock()
        player.process.stdin.closed = False
        player.process.wait.side_effect = [subprocess.TimeoutExpired('synthetic', 6), 0, 0]
        process = player.process
        with self.assertRaisesRegex(PrivacyBlocked, 'player_shutdown_pending'):
            player.close()
        self.assertIs(player.process, process)
        player.close()
        player.close()
        self.assertEqual(process.wait.call_count, 3)
