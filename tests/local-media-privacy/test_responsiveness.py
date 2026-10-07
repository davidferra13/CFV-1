"""Native event-loop proof using generated fixtures and delayed local checks."""
import os
from pathlib import Path
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts/local-media-privacy'))


class FixtureAuthority:
    def __init__(self, directory):
        self.directory = directory

    def __getattr__(self, name):
        def call(*args, **kwargs):
            from privacy_core import Store
            store = Store(self.directory)
            try:
                return getattr(store, name)(*args, **kwargs)
            finally:
                store.close()
        return call


def fixture(window):
    return FixtureAuthority(window.directory)


def settle(root, predicate, timeout=6):
    deadline = time.monotonic() + timeout
    while not predicate() and time.monotonic() < deadline:
        root.update()
        time.sleep(.005)
    if not predicate():
        raise AssertionError('Local UI operation did not settle')


@unittest.skipUnless(os.name == 'nt', 'Native Windows event loop')
class ResponsivenessTests(unittest.TestCase):
    def test_catalog_write_lock_keeps_refresh_responsive(self):
        import tkinter as tk
        from privacy_core import Store
        from review import ReviewWindow, demo_fixture
        with tempfile.TemporaryDirectory() as directory:
            root = tk.Tk()
            window = ReviewWindow(root, demo_fixture(Path(directory)), demo=True)
            settle(root, lambda: not window.busy)
            blocker = Store(window.directory)
            try:
                blocker.db.execute('PRAGMA journal_mode=DELETE')
                blocker.db.execute('BEGIN EXCLUSIVE')
                started = time.monotonic()
                window.refresh()
                self.assertLess(time.monotonic() - started, .3)
                beats = []
                root.after(20, lambda: beats.append(True))
                settle(root, lambda: bool(beats), timeout=.3)
                self.assertTrue(window.busy or 'held' in window.status.get(),
                                'a locked catalog must wait or show a held operation')
                if window.busy:
                    window.close()
                    self.assertTrue(root.winfo_exists())
            finally:
                blocker.db.rollback()
                blocker.close()
                settle(root, lambda: not window.busy, timeout=15)
                window.close()

    def test_large_generated_image_preparation_keeps_heartbeat(self):
        import tkinter as tk
        from PIL import Image
        from review import ReviewWindow, demo_fixture
        with tempfile.TemporaryDirectory() as directory:
            root = tk.Tk()
            window = ReviewWindow(root, demo_fixture(Path(directory)), demo=True)
            settle(root, lambda: not window.busy)
            source = Path(directory) / 'generated-large.png'
            with Image.new('RGB', (4000, 3000), '#47775a') as generated:
                generated.save(source)
            asset = fixture(window).inventory(source, 'generated-workload')
            window.refresh()
            settle(root, lambda: not window.busy)
            window.tree.selection_set(asset)
            window.open_full_review()
            dialog = window.review_dialog
            settle(root, lambda: not dialog.task.busy)
            unit = dialog.tree.get_children()[0]
            dialog.tree.selection_set(unit)
            beats, timer = [], [None]
            def beat():
                beats.append(time.monotonic())
                timer[0] = root.after(10, beat)
            try:
                beat()
                started = time.monotonic()
                dialog.open_selected()
                self.assertLess(time.monotonic() - started, .3)
                settle(root, lambda: not dialog.task.busy, timeout=15)
                self.assertGreater(len(beats), 1)
                gap = max(b - a for a, b in zip(beats, beats[1:]))
                self.assertLess(gap, .3)
                self.assertEqual(fixture(window)._review_state(asset, unit), 'opened')
                self.assertEqual(fixture(window).row(asset)['decision'], 'unreviewed')
                print(f'generated_image_pixels=12000000 heartbeat_max_ms={gap * 1000:.1f}')
            finally:
                if timer[0] is not None:
                    root.after_cancel(timer[0])
                settle(root, lambda: not dialog.task.busy, timeout=15)
                dialog.close()
                settle(root, lambda: not window.busy)
                window.close()

    def test_worker_start_failure_allows_refresh_and_close(self):
        import tkinter as tk
        from review import ReviewWindow, demo_fixture
        with tempfile.TemporaryDirectory() as directory:
            root = tk.Tk()
            window = ReviewWindow(root, demo_fixture(Path(directory)), demo=True)
            settle(root, lambda: not window.busy)
            with patch('threading.Thread.start', side_effect=RuntimeError('test start failure')):
                window.refresh()
                self.assertFalse(window.busy)
                self.assertFalse(window.ui_task.busy)
            window.refresh()
            settle(root, lambda: not window.busy)
            self.assertTrue(window.tree.get_children())
            window.tree.selection_set(window.tree.get_children()[0])
            with patch('threading.Thread.start', side_effect=RuntimeError('test start failure')):
                window.open_full_review()
                dialog = window.review_dialog
                self.assertFalse(dialog.task.busy)
                self.assertTrue(dialog.close())
            self.assertFalse(window.busy)
            window.close()

    def test_cyclic_finalizers_run_on_tk_owner_thread(self):
        import tkinter as tk
        from review import ReviewWindow, demo_fixture
        with tempfile.TemporaryDirectory() as directory:
            root = tk.Tk()
            window = ReviewWindow(root, demo_fixture(Path(directory)), demo=True)
            settle(root, lambda: not window.busy)
            finalized = []
            class Cycle:
                def __init__(self):
                    self.cycle = self
                def __del__(self):
                    finalized.append(threading.get_ident())
            def allocate(_):
                for _ in range(2000):
                    Cycle()
            window.submit(allocate, lambda _: None, 'testing_generated_cycles')
            settle(root, lambda: not window.busy)
            settle(root, lambda: bool(finalized), timeout=3)
            self.assertEqual(set(finalized), {threading.get_ident()})
            window.close()

    def test_changed_bundle_cannot_be_approved_while_save_is_pending(self):
        import tkinter as tk
        from privacy_core import Store
        from review import ReviewWindow, demo_fixture
        with tempfile.TemporaryDirectory() as directory:
            root = tk.Tk()
            window = ReviewWindow(root, demo_fixture(Path(directory)), demo=True)
            settle(root, lambda: not window.busy)
            asset = window.tree.get_children()[0]
            for unit in fixture(window).review_plan(asset):
                fixture(window).mark_review_unit(asset, unit['id'])
                fixture(window).mark_review_unit(asset, unit['id'], confirmed=True)
            window.tree.selection_set(asset)
            # Deliver the selection event before entering the final attestation.
            root.update()
            window.attest.set(True)
            original = Store.decide
            entered, release = threading.Event(), threading.Event()
            def slow_save(store, *args):
                entered.set()
                release.wait(2)
                return original(store, *args)
            try:
                with patch.object(Store, 'decide', slow_save):
                    window.decide('approved_local_archive')
                    settle(root, entered.is_set)
                    self.assertTrue(window.busy)
                    self.assertEqual(fixture(window).row(asset)['decision'], 'unreviewed')
                    source = Path(fixture(window).row(asset)['path'])
                    source.with_suffix('.json').write_text('{"generated_change":true}')
                    window.close()
                    self.assertTrue(root.winfo_exists())
                    release.set()
                    settle(root, lambda: not window.busy)
                    self.assertEqual(fixture(window).row(asset)['decision'], 'unreviewed')
                    self.assertFalse(window.attest.get())
            finally:
                release.set()
                settle(root, lambda: not window.busy)
                window.close()

    def test_failed_checklist_has_no_review_controls_and_can_close(self):
        import tkinter as tk
        from privacy_core import PrivacyBlocked
        from review import ReviewWindow, demo_fixture
        with tempfile.TemporaryDirectory() as directory:
            root = tk.Tk()
            window = ReviewWindow(root, demo_fixture(Path(directory)), demo=True)
            settle(root, lambda: not window.busy)
            window.tree.selection_set(window.tree.get_children()[0])
            with patch('privacy_core.Store.review_plan', side_effect=PrivacyBlocked('stale_review')):
                window.open_full_review()
                dialog = window.review_dialog
                settle(root, lambda: not dialog.task.busy)
                self.assertFalse(dialog.tree.get_children())
                self.assertTrue(dialog.open_button.instate(['disabled']))
                self.assertTrue(dialog.mark_button.instate(['disabled']))
                self.assertIn('changed', dialog.status.get())
            self.assertTrue(dialog.close())
            settle(root, lambda: not window.busy)
            with fixture(window).worker_lock():
                pass
            window.close()

    def test_startup_protection_does_not_block_window(self):
        import tkinter as tk
        from review import ReviewWindow, demo_fixture
        with tempfile.TemporaryDirectory() as directory:
            runtime = demo_fixture(Path(directory))
            root = tk.Tk()
            release = threading.Event()
            def slow_check(_):
                release.wait(2)
            timer = threading.Timer(.5, release.set)
            timer.start()
            window = None
            try:
                with patch('review.require_isolation', side_effect=slow_check):
                    started = time.monotonic()
                    window = ReviewWindow(root, runtime)
                    elapsed = time.monotonic() - started
                    self.assertLess(elapsed, .3, 'protection check blocked window creation')
                    beats = []
                    root.after(10, lambda: beats.append(True))
                    settle(root, lambda: bool(beats), timeout=.3)
                    self.assertFalse(release.is_set())
                    release.set()
                    settle(root, lambda: not window.busy)
            finally:
                release.set()
                timer.join()
                if window:
                    settle(root, lambda: not window.busy)
                    window.close()
                else:
                    root.destroy()

    def test_checklist_hashing_keeps_ui_alive_and_close_retains_lock(self):
        import tkinter as tk
        from privacy_core import Store, PrivacyBlocked
        from review import ReviewWindow, demo_fixture
        with tempfile.TemporaryDirectory() as directory:
            root = tk.Tk()
            window = ReviewWindow(root, demo_fixture(Path(directory)), demo=True)
            settle(root, lambda: not window.busy)
            asset = window.tree.get_children()[0]
            window.tree.selection_set(asset)
            original = Store.review_plan
            release, entered = threading.Event(), threading.Event()
            def slow_plan(store, asset_id):
                entered.set()
                release.wait(2)
                return original(store, asset_id)
            timer = threading.Timer(.6, release.set)
            timer.start()
            dialog = None
            try:
                with patch.object(Store, 'review_plan', slow_plan):
                    started = time.monotonic()
                    window.open_full_review()
                    elapsed = time.monotonic() - started
                    dialog = window.review_dialog
                    self.assertLess(elapsed, .3, 'checklist preparation blocked its window')
                    settle(root, entered.is_set, timeout=.3)
                    beats = []
                    root.after(10, lambda: beats.append(True))
                    settle(root, lambda: bool(beats), timeout=.3)
                    self.assertFalse(release.is_set())
                    self.assertFalse(dialog.close())
                    self.assertTrue(window.busy)
                    with self.assertRaises(PrivacyBlocked):
                        with fixture(window).worker_lock():
                            self.fail('pending review released its worker slot')
                    release.set()
                    settle(root, lambda: not dialog.task.busy)
                    self.assertEqual(fixture(window).row(asset)['decision'], 'unreviewed')
            finally:
                release.set()
                timer.join()
                if dialog:
                    if hasattr(dialog, 'task'):
                        settle(root, lambda: not dialog.task.busy)
                    dialog.close()
                settle(root, lambda: not window.busy)
                window.close()
