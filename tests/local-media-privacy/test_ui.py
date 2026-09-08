import os
from pathlib import Path
import sys
import tempfile
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts/local-media-privacy'))


@unittest.skipUnless(os.name == 'nt', 'Native Windows GUI verification')
class NativeWindowTests(unittest.TestCase):
    def test_visible_fixture_review_flow_and_reopen(self):
        import tkinter as tk
        from review import ReviewWindow, demo_fixture
        with tempfile.TemporaryDirectory() as directory:
            runtime = demo_fixture(Path(directory))
            root = tk.Tk()
            window = ReviewWindow(root, runtime, demo=True)
            try:
                root.update_idletasks()
                self.assertGreaterEqual(root.winfo_width(), 900)
                asset = window.tree.get_children()[0]
                window.tree.selection_set(asset)
                window.select()
                self.assertIsNone(window.photo)
                window.reveal()
                self.assertIsNotNone(window.photo)
                window.decide('approved_local_archive')
                self.assertEqual(window.store.row(asset)['decision'], 'unreviewed')
                window.attest.set(True)
                window.decide('approved_local_archive')
                self.assertEqual(window.store.row(asset)['decision'], 'approved_local_archive')
                self.assertIsNone(window.photo)
                window.tree.selection_set(asset)
                window.decide('private')
                self.assertEqual(window.store.row(asset)['decision'], 'private')
            finally:
                window.close()

    def test_unconfigured_storage_stays_locked(self):
        import tkinter as tk
        from review import ReviewWindow
        with tempfile.TemporaryDirectory() as directory:
            root = tk.Tk()
            window = ReviewWindow(root, Path(directory) / 'not-configured')
            try:
                root.update_idletasks()
                self.assertIsNone(window.store)
                self.assertIn('locked', window.status.get())
                self.assertEqual(len(window.tree.get_children()), 0)
            finally:
                window.close()
