"""Synthetic fixtures prove checkpoint recovery, all-track coverage and stale holds."""
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts/local-media-privacy'))
from PIL import Image
from privacy_core import Store, PrivacyBlocked
from worker import scan, restart_inspection, INSPECTION_POLICY


class Detector:
    identity = 'synthetic-model@v1'
    calls = 0
    def verify_model(self):
        pass
    def signal(self, image):
        self.calls += 1
        return 'suspected_sensitive' if self.calls == 3 else 'no_signal'


class ResumeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.source = self.root / 'source'
        self.source.mkdir()
        self.store = Store(self.root / 'runtime')
        self.detector = Detector()
        self.file = self.source / 'animation.gif'
        Image.new('RGB', (32, 32), 'green').save(self.file, save_all=True,
            append_images=[Image.new('RGB', (32, 32), c) for c in ['red', 'blue', 'yellow']], duration=100)

    def tearDown(self):
        self.store.close()
        self.tmp.cleanup()

    def run_scan(self, **kwargs):
        return scan(self.store, self.source, 'synthetic', self.detector, **kwargs)

    def row(self):
        return self.store.db.execute('SELECT * FROM assets').fetchone()

    def test_legacy_complete_and_unsupported_policies_are_reinspected(self):
        asset = self.store.inventory(self.file, 'synthetic')
        for status in ['complete', 'unsupported']:
            with self.subTest(status=status):
                self.store.reset_inspection(asset)
                self.store.record_signal(asset, 'unknown', {'status': status, 'policy': 1}, self.detector.identity)
                self.detector.calls = 0
                result = self.run_scan()
                self.assertEqual(self.detector.calls, 4)
                self.assertEqual(result['attempted'], 1)
                self.assertEqual(json.loads(self.row()['coverage'])['policy'], INSPECTION_POLICY)

    def test_timeout_summary_counts_failure_once(self):
        self.detector.signal = lambda _: (_ for _ in ()).throw(TimeoutError())
        result = self.run_scan(batch_limit=1)
        self.assertEqual(result['attempted'], 1)
        self.assertEqual(result['failed'], 1)
        self.assertEqual(result['inspected'], 0)
        self.assertEqual(sum(result[key] for key in ['complete', 'partial', 'unsupported', 'failed']), 1)

    def test_unavailable_model_is_failed_with_recovery_reason(self):
        self.detector.verify_model = lambda: (_ for _ in ()).throw(PrivacyBlocked())
        result = self.run_scan()
        self.assertEqual(result['attempted'], 1)
        self.assertEqual(result['failed'], 1)
        self.assertEqual(result['inspected'], 0)
        self.assertEqual(result['reason'], 'model_unavailable')

    def test_selected_restart_low_disk_preserves_checkpoint_and_makes_no_inference(self):
        self.run_scan(frame_limit=1)
        asset = self.row()['id']
        saved = self.store.load_checkpoint(asset, self.detector.identity)
        with patch('worker.shutil.disk_usage') as disk, patch.object(self.store, 'save_checkpoint') as save:
            disk.return_value.free = 0
            result = restart_inspection(self.store, asset, self.detector)
            save.assert_not_called()
        self.assertEqual(result['reason'], 'low_disk')
        self.assertEqual(result['attempted'], 0)
        self.assertEqual(self.detector.calls, 1)
        self.assertEqual(self.store.load_checkpoint(asset, self.detector.identity), saved)

    def test_reopen_store_resumes_without_repeating_inference(self):
        self.run_scan(frame_limit=2)
        self.assertEqual(self.detector.calls, 2)
        self.store.close()
        self.store = Store(self.root / 'runtime')
        self.run_scan(frame_limit=2)
        row = self.row()
        self.assertEqual(self.detector.calls, 4)
        self.assertEqual(json.loads(row['coverage'])['status'], 'complete')
        self.assertEqual(row['signal'], 'suspected_sensitive')
        self.assertEqual(row['decision'], 'unreviewed')
        self.assertEqual(self.store.setting('last_source')['path'], str(self.source))

    def test_interrupted_final_write_uses_committed_frames_on_reopen(self):
        with patch.object(self.store, 'record_signal', side_effect=RuntimeError('synthetic interruption')):
            self.run_scan(frame_limit=2)
        self.assertIsNone(self.row()['inspected_at'])
        self.store.close()
        self.store = Store(self.root / 'runtime')
        self.run_scan()
        self.assertEqual(self.detector.calls, 4)
        self.assertEqual(json.loads(self.row()['coverage'])['status'], 'complete')

    def test_excessive_decoded_image_size_stops_before_inference(self):
        with patch('PIL.Image.open') as opened:
            image = opened.return_value.__enter__.return_value
            image.n_frames, image.width, image.height = 1, 33_000_000, 1
            self.run_scan()
        self.assertEqual(self.detector.calls, 0)
        self.assertEqual(json.loads(self.row()['coverage'])['status'], 'failed')

    def test_failed_frame_retries_at_last_committed_frame(self):
        real = self.detector.signal
        def fail(image):
            if self.detector.calls == 1:
                raise TimeoutError()
            return real(image)
        self.detector.signal = fail
        self.run_scan()
        self.assertEqual(json.loads(self.row()['coverage'])['frames'], 1)
        self.detector.signal = real
        self.run_scan(retry_failed=True)
        self.assertEqual(self.detector.calls, 4)
        self.assertEqual(json.loads(self.row()['coverage'])['status'], 'complete')

    def test_changed_bundle_invalidates_checkpoint(self):
        self.run_scan(frame_limit=1)
        Image.new('RGB', (32, 32), 'black').save(self.file)
        self.run_scan()
        self.assertEqual(json.loads(self.row()['coverage'])['frames'], 1)
        self.assertEqual(self.detector.calls, 2)

    def test_changed_model_restarts_inference(self):
        self.run_scan(frame_limit=2)
        self.detector.identity = 'synthetic-model@v2'
        self.run_scan()
        self.assertEqual(self.detector.calls, 6)
        self.assertEqual(json.loads(self.row()['coverage'])['frames'], 4)

    def test_pause_after_frame_is_durable(self):
        result = self.run_scan(paused=lambda: self.detector.calls >= 1)
        self.assertTrue(result['paused'])
        self.assertEqual(json.loads(self.row()['coverage'])['frames'], 1)
        self.run_scan()
        self.assertEqual(self.detector.calls, 4)

    def test_low_memory_holds_without_inference(self):
        with patch('worker.memory_available', return_value=0):
            self.assertTrue(self.run_scan()['paused'])
        self.assertEqual(self.detector.calls, 0)

    def test_removal_review_excluded_from_further_inference(self):
        asset = self.store.inventory(self.file, 'synthetic')
        self.store.decide(asset, 'removal_review')
        self.run_scan(retry_failed=True)
        self.assertEqual(self.detector.calls, 0)

    def test_match_confirmation_rehashes_both_files(self):
        asset = self.store.inventory(self.file, 'synthetic')
        export = self.root / 'export.gif'
        shutil.copyfile(self.file, export)
        self.assertEqual(self.store.match_exact([self.file, export]), 1)
        self.store.confirm_match(asset, str(export))
        self.assertEqual(self.store.match_candidates(asset)[0]['status'], 'confirmed')
        export.write_bytes(b'harmless changed fixture')
        with self.assertRaises(PrivacyBlocked):
            self.store.confirm_match(asset, str(export))
        self.assertEqual(self.store.match_candidates(asset)[0]['status'], 'stale')

    def make_video(self, audio=False):
        self.file.unlink()
        self.file = self.source / 'tracks.mkv'
        command = [shutil.which('ffmpeg'), '-nostdin', '-v', 'error', '-f', 'lavfi', '-i',
            'color=c=red:s=32x32:r=2:d=1', '-f', 'lavfi', '-i', 'color=c=blue:s=32x32:r=3:d=1']
        if audio:
            command += ['-f', 'lavfi', '-i', 'anullsrc=r=8000:cl=mono', '-t', '1']
        command += ['-map', '0:v', '-map', '1:v']
        if audio:
            command += ['-map', '2:a', '-c:a', 'pcm_s16le']
        command += ['-c:v', 'ffv1', '-threads', '1', str(self.file)]
        subprocess.run(command, check=True, capture_output=True, timeout=20)

    @unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'installed decoders required')
    def test_all_video_tracks_resume_and_keep_middle_positive(self):
        self.make_video()
        for _ in range(6):
            self.run_scan(frame_limit=1)
        row = self.row()
        coverage = json.loads(row['coverage'])
        self.assertEqual([s['next_frame'] for s in coverage['streams']], [2, 3])
        self.assertTrue(all(s['done'] for s in coverage['streams']))
        self.assertEqual(coverage['status'], 'complete')
        self.assertEqual(self.detector.calls, 5)
        self.assertEqual(row['signal'], 'suspected_sensitive')
        self.assertEqual(row['decision'], 'unreviewed')

    @unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'), 'installed decoders required')
    def test_uninspected_audio_never_claims_full_file_coverage(self):
        self.make_video(audio=True)
        self.run_scan()
        coverage = json.loads(self.row()['coverage'])
        self.assertTrue(coverage['visual_complete'])
        self.assertEqual(coverage['status'], 'partial')
        self.assertEqual(coverage['uninspected_stream_types'], ['audio'])
        self.run_scan()
        self.assertEqual(self.detector.calls, 5)


if __name__ == '__main__':
    unittest.main()
