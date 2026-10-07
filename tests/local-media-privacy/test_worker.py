import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts/local-media-privacy'))
from PIL import Image
from privacy_core import Store, PrivacyBlocked
from worker import Detector, inspect_file, scan


class FixtureDetector:
    identity = 'synthetic-only'
    def verify_model(self):
        pass
    def signal(self, image):
        return 'no_signal'


class WorkerTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.source = self.root / 'source'
        self.source.mkdir()
        self.path = self.source / 'fixture.png'
        Image.new('RGB', (32, 32), 'green').save(self.path)
        self.store = Store(self.root / 'private-runtime')

    def tearDown(self):
        self.store.close()
        self.tmp.cleanup()

    def test_unknown_format_is_not_clear(self):
        file = self.source / 'fixture.heic'
        file.write_bytes(b'harmless unsupported fixture')
        signal, coverage = inspect_file(file, FixtureDetector())
        self.assertEqual(signal, 'unknown')
        self.assertEqual(coverage['status'], 'unsupported')

    def test_bad_decoder_is_not_clear(self):
        self.path.write_bytes(b'harmless invalid png')
        signal, coverage = inspect_file(self.path, FixtureDetector())
        self.assertEqual(signal, 'unknown')
        self.assertEqual(coverage['status'], 'failed')

    def test_timeout_never_clears(self):
        detector = FixtureDetector()
        detector.signal = lambda _: (_ for _ in ()).throw(TimeoutError())
        signal, coverage = inspect_file(self.path, detector)
        self.assertEqual(signal, 'unknown')
        self.assertEqual(coverage['status'], 'failed')

    def test_animated_media_records_partial_coverage(self):
        file = self.source / 'animation.gif'
        Image.new('RGB', (32, 32), 'green').save(file, save_all=True,
            append_images=[Image.new('RGB', (32, 32), 'blue')], duration=100)
        signal, coverage = inspect_file(file, FixtureDetector(), frame_limit=1)
        self.assertEqual(signal, 'unknown')
        self.assertEqual(coverage['status'], 'partial')
        self.assertEqual(coverage['frames'], 1)
        self.assertEqual(coverage['total_frames'], 2)

    def test_restart_skips_unchanged_inference_and_reaches_new_files(self):
        first = scan(self.store, self.source, 'fixture', FixtureDetector(), batch_limit=1)
        Image.new('RGB', (32, 32), 'red').save(self.source / 'new.png')
        second = scan(self.store, self.source, 'fixture', FixtureDetector(), batch_limit=1)
        self.assertEqual(first['inspected'], 1)
        self.assertEqual(second['inspected'], 1)
        self.assertEqual(self.store.counts()['inventoried'], 2)
        self.assertEqual(self.store.counts()['human_approved'], 0)

    def test_missing_model_keeps_unknown_and_never_approves(self):
        detector = FixtureDetector()
        detector.verify_model = lambda: (_ for _ in ()).throw(PrivacyBlocked())
        scan(self.store, self.source, 'fixture', detector)
        self.assertEqual(self.store.counts()['failed'], 1)
        self.assertEqual(self.store.counts()['human_approved'], 0)

    def test_source_mutation_during_inspection_not_recorded_as_complete(self):
        detector = FixtureDetector()
        def change(_):
            Image.new('RGB', (32, 32), 'yellow').save(self.path)
            return 'no_signal'
        detector.signal = change
        report = scan(self.store, self.source, 'fixture', detector)
        self.assertEqual(report['failed'], 1)
        self.assertEqual(self.store.counts()['inspected'], 0)

    def test_second_worker_cannot_enter(self):
        with self.store.worker_lock():
            with self.assertRaises(PrivacyBlocked):
                with self.store.worker_lock():
                    self.fail('second worker acquired lock')

    def test_low_disk_stops_without_source_changes(self):
        before = self.path.read_bytes()
        with patch('worker.shutil.disk_usage') as disk:
            disk.return_value.free = 0
            result = scan(self.store, self.source, 'fixture', FixtureDetector())
        self.assertTrue(result['paused'])
        self.assertEqual(self.path.read_bytes(), before)

    def test_cloud_model_name_rejected_without_a_request(self):
        with self.assertRaises(PrivacyBlocked):
            Detector(model='fixture-cloud')

    def test_model_returning_remote_host_is_rejected(self):
        detector = Detector()
        detector.request = lambda route, body=None: ({'models': [{'name': detector.model, 'size': 200000000, 'digest': 'fixture'}]}
            if route == '/api/tags' else {'capabilities': ['vision'], 'remote_host': 'https://example.invalid'})
        with self.assertRaises(PrivacyBlocked):
            detector.verify_model()

    def test_provenance_receipt_binds_text_and_current_decision(self):
        asset = self.store.inventory(self.path, 'fixture')
        for unit in self.store.review_plan(asset):
            self.store.mark_review_unit(asset, unit['id'])
            self.store.mark_review_unit(asset, unit['id'], confirmed=True)
        self.store.decide(asset, 'approved_local_archive', complete_review=True)
        receipt = self.store.receipt(self.path, 'harmless OCR text')
        self.store.verify_receipt(self.path, 'harmless OCR text', receipt)
        with self.assertRaises(PrivacyBlocked):
            self.store.verify_receipt(self.path, 'changed OCR text', receipt)
        self.store.decide(asset, 'private')
        with self.assertRaises(PrivacyBlocked):
            self.store.verify_receipt(self.path, 'harmless OCR text', receipt)


if __name__ == '__main__':
    unittest.main()
