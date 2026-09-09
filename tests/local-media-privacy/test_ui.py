import os
import shutil
import time
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
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

    def test_progress_does_not_mark_background_task_finished(self):
        import tkinter as tk
        from review import ReviewWindow, demo_fixture
        with tempfile.TemporaryDirectory() as directory:
            root = tk.Tk()
            window = ReviewWindow(root, demo_fixture(Path(directory)), demo=True)
            try:
                window.busy = True
                window.started_at = time.monotonic()
                window.report_progress({'phase': 'waiting_for_model', 'frames': 3})
                window.poll()
                self.assertTrue(window.busy)
                self.assertIn('Saved frames in current file: 3', window.status.get())
                window.events.put(('done', {'inspected': 1}))
                window.poll()
                self.assertFalse(window.busy)
            finally:
                window.busy = False
                window.close()

    def test_owner_match_window_is_local_and_contains_candidate(self):
        import tkinter as tk
        from review import ReviewWindow, demo_fixture
        with tempfile.TemporaryDirectory() as directory:
            root = tk.Tk()
            window = ReviewWindow(root, demo_fixture(Path(directory)), demo=True)
            candidate_window = None
            try:
                asset = window.tree.get_children()[0]
                source = window.store.row(asset)['path']
                candidate = Path(directory) / 'synthetic-export.png'
                shutil.copyfile(source, candidate)
                window.store.match_exact([candidate])
                window.tree.selection_set(asset)
                candidate_window = window.show_matches()
                root.update_idletasks()
                self.assertEqual(candidate_window.title(), 'Local export match candidates')
                self.assertEqual(len(window.store.match_candidates(asset)), 1)
                self.assertIsNone(window.photo)
            finally:
                if candidate_window:
                    candidate_window.destroy()
                window.close()

    def test_failed_completion_has_recovery_and_demo_controls_are_disabled(self):
        import tkinter as tk
        from review import ReviewWindow, demo_fixture
        with tempfile.TemporaryDirectory() as directory:
            root = tk.Tk()
            window = ReviewWindow(root, demo_fixture(Path(directory)), demo=True)
            try:
                self.assertTrue(all(button.instate(['disabled']) for button in window.demo_unavailable))
                self.assertEqual(window.review_button.cget('style'), 'Primary.TButton')
                window.events.put(('done', {'attempted': 1, 'failed': 1, 'inspected': 0}))
                window.poll()
                self.assertIn('Retry failed files', window.status.get())
                self.assertNotIn('Completed', window.status.get())
                window.events.put(('error', {'reason': 'worker_already_running'}))
                window.poll()
                self.assertIn('Another scan', window.status.get())
                window.events.put(('done', {'failed': 1, 'reason': 'model_unavailable'}))
                window.poll()
                self.assertIn('local model is unavailable', window.status.get())
            finally:
                window.close()

    def test_empty_and_failed_match_lists_are_distinct(self):
        import tkinter as tk
        from tkinter import ttk
        from review import ReviewWindow, demo_fixture
        with tempfile.TemporaryDirectory() as directory:
            root = tk.Tk()
            window = ReviewWindow(root, demo_fixture(Path(directory)), demo=True)
            windows = []
            try:
                window.tree.selection_set(window.tree.get_children()[0])
                windows.append(window.show_matches())
                with patch.object(window.store, 'match_candidates', side_effect=RuntimeError()):
                    windows.append(window.show_matches())
                messages = []
                for candidate_window in windows:
                    widgets = candidate_window.winfo_children()[0].winfo_children()
                    button = next(widget for widget in widgets if isinstance(widget, ttk.Button))
                    self.assertTrue(button.instate(['disabled']))
                    label = next(widget for widget in widgets if isinstance(widget, ttk.Label) and widget.cget('textvariable'))
                    messages.append(root.getvar(label.cget('textvariable')))
                self.assertIn('No matches recorded', messages[0])
                self.assertIn('Could not load matches', messages[1])
            finally:
                for candidate_window in windows:
                    candidate_window.destroy()
                window.close()
