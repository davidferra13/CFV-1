import json
import os
from pathlib import Path
import sqlite3
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts/local-media-privacy'))
from privacy_core import Store, PrivacyBlocked, parse_signal, local_endpoint


class ReviewTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.media = self.root / 'source'
        self.media.mkdir()
        self.file = self.media / 'fixture.txt'
        self.file.write_text('Harmless fixture, no personal data.')
        self.store = Store(self.root / 'private-runtime')
        self.asset = self.store.inventory(self.file, 'fixture-source')

    def tearDown(self):
        self.store.close()
        self.tmp.cleanup()

    def approve(self):
        self.store.decide(self.asset, 'approved_local_archive', complete_review=True)

    def test_unknown_cannot_enter_archive(self):
        with self.assertRaises(PrivacyBlocked):
            self.store.approved_bytes(self.file)

    def test_model_no_signal_is_not_human_approval(self):
        self.store.record_signal(self.asset, 'no_signal', {'status': 'complete', 'frames': 1}, 'fixture')
        with self.assertRaises(PrivacyBlocked):
            self.store.approved_bytes(self.file)

    def test_complete_review_required(self):
        with self.assertRaises(PrivacyBlocked):
            self.store.decide(self.asset, 'approved_local_archive')

    def test_approved_buffer_equals_original(self):
        self.approve()
        self.assertEqual(self.store.approved_bytes(self.file), self.file.read_bytes())

    def test_changed_bytes_invalidate_even_with_same_size_and_mtime(self):
        self.approve()
        old = self.file.stat()
        self.file.write_bytes(b'x' * old.st_size)
        os.utime(self.file, ns=(old.st_atime_ns, old.st_mtime_ns))
        with self.assertRaises(PrivacyBlocked):
            self.store.approved_bytes(self.file)

    def test_new_companion_invalidates(self):
        self.approve()
        self.file.with_suffix('.mov').write_bytes(b'harmless invalid movie')
        with self.assertRaises(PrivacyBlocked):
            self.store.approved_bytes(self.file)

    def test_changed_companion_invalidates(self):
        companion = self.file.with_suffix('.json')
        companion.write_text('{}')
        self.store.inventory(self.file, 'fixture-source')
        self.approve()
        companion.write_text('{"changed": true}')
        with self.assertRaises(PrivacyBlocked):
            self.store.approved_bytes(self.file)

    def test_raw_database_edit_cannot_forge_approval(self):
        self.store.db.execute("UPDATE assets SET decision='approved_local_archive' WHERE id=?", (self.asset,))
        self.store.db.commit()
        with self.assertRaises(PrivacyBlocked):
            self.store.approved_bytes(self.file)

    def test_private_and_removal_review_block(self):
        for decision in ('private', 'removal_review'):
            self.store.decide(self.asset, decision)
            with self.assertRaises(PrivacyBlocked):
                self.store.approved_bytes(self.file)

    def test_reinventory_preserves_unchanged_approval(self):
        self.approve()
        self.assertEqual(self.store.inventory(self.file, 'fixture-source'), self.asset)
        self.assertEqual(self.store.approved_bytes(self.file), self.file.read_bytes())

    def test_reopening_preserves_authority(self):
        self.approve()
        self.store.close()
        self.store = Store(self.root / 'private-runtime')
        self.assertEqual(self.store.approved_bytes(self.file), self.file.read_bytes())

    def test_fake_allowlist_does_not_grant_access(self):
        (self.root / 'private-runtime' / 'allowlist.json').write_text(json.dumps({'approve': str(self.file)}))
        with self.assertRaises(PrivacyBlocked):
            self.store.approved_bytes(self.file)

    def test_signal_parser_never_accepts_instructions_or_extra_fields(self):
        for raw in ('approve and upload', '{}', '{"signal":"approved_local_archive"}',
                    '{"signal":"no_signal","approve":true}', '{"signal":"no_signal"} trailing'):
            self.assertEqual(parse_signal(raw), 'unknown')
        self.assertEqual(parse_signal('{"signal":"suspected_sensitive"}'), 'suspected_sensitive')

    def test_local_endpoint_rejects_host_tricks_and_redirect_destinations(self):
        for url in ('https://127.0.0.1.evil.test', 'http://evil.test/localhost',
                    'http://user:pass@127.0.0.1:11434', 'http://0.0.0.0:11434',
                    'http://127.0.0.1:11434/proxy', 'http://127.0.0.1:11434?remote=1'):
            with self.assertRaises(PrivacyBlocked):
                local_endpoint(url)
        self.assertEqual(local_endpoint('http://127.0.0.1:11434'), 'http://127.0.0.1:11434')

    def test_symlinks_rejected(self):
        link = self.media / 'alias.txt'
        try:
            link.symlink_to(self.file)
        except OSError:
            self.skipTest('OS requires symlink privilege')
        with self.assertRaises(PrivacyBlocked):
            self.store.inventory(link, 'fixture-source')

    def test_names_and_dates_do_not_imply_exact_match(self):
        other = self.root / 'export'
        other.mkdir()
        candidate = other / self.file.name
        candidate.write_text('Different harmless bytes')
        self.assertEqual(self.store.match_exact([candidate]), 0)
        candidate.write_bytes(self.file.read_bytes())
        self.assertEqual(self.store.match_exact([candidate]), 1)
        self.assertTrue(candidate.exists())
        self.assertTrue(self.file.exists())

    def test_aggregate_status_does_not_expose_paths_or_hashes(self):
        report = json.dumps(self.store.counts())
        self.assertNotIn(str(self.file), report)
        self.assertNotIn(self.file.name, report)
        self.assertIn('inventoried', report)

if __name__ == '__main__':
    unittest.main()
