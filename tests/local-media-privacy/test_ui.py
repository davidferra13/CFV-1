import os
import shutil
import time
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts/local-media-privacy'))


from test_responsiveness import settle, fixture


def wait_ui(window):
    settle(window.root, lambda: not window.ui_task.busy, timeout=15)


def wait_review(dialog):
    settle(dialog.window, lambda: not dialog.task.busy, timeout=15)


def close_review(dialog):
    if dialog.closed:
        return True
    wait_review(dialog)
    deadline = time.monotonic() + 15
    while not dialog.close():
        wait_review(dialog)
        if time.monotonic() > deadline:
            raise AssertionError('Owned player did not stop')
    wait_ui(dialog.owner)
    return True


@unittest.skipUnless(os.name == 'nt', 'Native Windows GUI verification')
class NativeWindowTests(unittest.TestCase):
    def test_visible_fixture_review_flow_and_reopen(self):
        import tkinter as tk
        from review import ReviewWindow, demo_fixture
        with tempfile.TemporaryDirectory() as directory:
            runtime = demo_fixture(Path(directory))
            root = tk.Tk()
            window = ReviewWindow(root, runtime, demo=True)
            wait_ui(window)
            try:
                root.update_idletasks()
                self.assertGreaterEqual(root.winfo_width(), 900)
                asset = window.tree.get_children()[0]
                window.tree.selection_set(asset)
                window.select()
                self.assertIsNone(window.photo)
                window.reveal()
                wait_ui(window)
                self.assertIsNotNone(window.photo)
                window.decide('approved_local_archive')
                wait_ui(window)
                self.assertEqual(fixture(window).row(asset)['decision'], 'unreviewed')
                window.open_full_review()
                dialog = window.review_dialog
                wait_review(dialog)
                unit = dialog.tree.get_children()[0]
                dialog.tree.selection_set(unit)
                dialog.open_selected()
                wait_review(dialog)
                dialog.attest.set(True)
                dialog.confirm_selected()
                wait_review(dialog)
                close_review(dialog)
                window.attest.set(True)
                window.decide('approved_local_archive')
                wait_ui(window)
                self.assertEqual(fixture(window).row(asset)['decision'], 'approved_local_archive')
                self.assertIsNone(window.photo)
                window.tree.selection_set(asset)
                window.decide('private')
                wait_ui(window)
                self.assertEqual(fixture(window).row(asset)['decision'], 'private')
            finally:
                wait_ui(window)
                window.close()

    def test_unconfigured_storage_stays_locked(self):
        import tkinter as tk
        from review import ReviewWindow
        with tempfile.TemporaryDirectory() as directory:
            root = tk.Tk()
            window = ReviewWindow(root, Path(directory) / 'not-configured')
            wait_ui(window)
            try:
                root.update_idletasks()
                self.assertIsNone(window.store)
                self.assertIn('locked', window.status.get())
                self.assertEqual(len(window.tree.get_children()), 0)
            finally:
                wait_ui(window)
                window.close()

    def test_progress_does_not_mark_background_task_finished(self):
        import tkinter as tk
        from review import ReviewWindow, demo_fixture
        with tempfile.TemporaryDirectory() as directory:
            root = tk.Tk()
            window = ReviewWindow(root, demo_fixture(Path(directory)), demo=True)
            wait_ui(window)
            try:
                window.busy = True
                window.started_at = time.monotonic()
                window.report_progress({'phase': 'waiting_for_model', 'frames': 3})
                window.poll()
                wait_ui(window)
                self.assertTrue(window.busy)
                self.assertIn('Saved frames in current file: 3', window.status.get())
                window.events.put(('done', {'inspected': 1}))
                window.poll()
                wait_ui(window)
                self.assertFalse(window.busy)
            finally:
                window.busy = False
                wait_ui(window)
                window.close()

    def test_owner_match_window_is_local_and_contains_candidate(self):
        import tkinter as tk
        from review import ReviewWindow, demo_fixture
        with tempfile.TemporaryDirectory() as directory:
            root = tk.Tk()
            window = ReviewWindow(root, demo_fixture(Path(directory)), demo=True)
            wait_ui(window)
            candidate_window = None
            try:
                asset = window.tree.get_children()[0]
                source = fixture(window).row(asset)['path']
                candidate = Path(directory) / 'synthetic-export.png'
                shutil.copyfile(source, candidate)
                fixture(window).match_exact([candidate])
                window.tree.selection_set(asset)
                candidate_window = window.show_matches()
                wait_ui(window)
                root.update_idletasks()
                self.assertEqual(candidate_window.title(), 'Local export match candidates')
                self.assertEqual(len(fixture(window).match_candidates(asset)), 1)
                self.assertIsNone(window.photo)
            finally:
                if candidate_window:
                    candidate_window.destroy()
                wait_ui(window)
                window.close()

    def test_failed_completion_has_recovery_and_demo_controls_are_disabled(self):
        import tkinter as tk
        from review import ReviewWindow, demo_fixture
        with tempfile.TemporaryDirectory() as directory:
            root = tk.Tk()
            window = ReviewWindow(root, demo_fixture(Path(directory)), demo=True)
            wait_ui(window)
            try:
                self.assertTrue(all(button.instate(['disabled']) for button in window.demo_unavailable))
                self.assertEqual(window.review_button.cget('style'), 'Primary.TButton')
                window.events.put(('done', {'attempted': 1, 'failed': 1, 'inspected': 0}))
                window.poll()
                wait_ui(window)
                self.assertIn('Retry failed files', window.status.get())
                self.assertNotIn('Completed', window.status.get())
                window.events.put(('error', {'reason': 'worker_already_running'}))
                window.poll()
                wait_ui(window)
                self.assertIn('Another scan', window.status.get())
                window.events.put(('done', {'failed': 1, 'reason': 'model_unavailable'}))
                window.poll()
                wait_ui(window)
                self.assertIn('local model is unavailable', window.status.get())
            finally:
                wait_ui(window)
                window.close()

    def test_empty_and_failed_match_lists_are_distinct(self):
        import tkinter as tk
        from tkinter import ttk
        from review import ReviewWindow, demo_fixture
        with tempfile.TemporaryDirectory() as directory:
            root = tk.Tk()
            window = ReviewWindow(root, demo_fixture(Path(directory)), demo=True)
            wait_ui(window)
            windows = []
            try:
                window.tree.selection_set(window.tree.get_children()[0])
                windows.append(window.show_matches())
                wait_ui(window)
                with patch('privacy_core.Store.match_candidates', side_effect=RuntimeError()):
                    windows.append(window.show_matches())
                    wait_ui(window)
                messages = []
                for candidate_window in windows:
                    widgets = candidate_window.winfo_children()[0].winfo_children()
                    button = next(widget for widget in widgets if isinstance(widget, ttk.Button))
                    self.assertTrue(button.instate(['disabled']))
                    label = next(widget for widget in widgets if isinstance(widget, ttk.Label) and widget.cget('textvariable'))
                    messages.append(root.getvar(label.cget('textvariable')))
                self.assertIn('No matches recorded', messages[0])
                self.assertIn('Could not load or confirm matches', messages[1])
            finally:
                for candidate_window in windows:
                    candidate_window.destroy()
                wait_ui(window)
                window.close()

    def test_full_review_requires_each_companion_and_owns_worker_lock(self):
        import tkinter as tk
        from privacy_core import PrivacyBlocked
        from review import ReviewWindow, demo_fixture
        with tempfile.TemporaryDirectory() as directory:
            runtime = demo_fixture(Path(directory))
            root = tk.Tk()
            window = ReviewWindow(root, runtime, demo=True)
            wait_ui(window)
            dialog = None
            try:
                asset = window.tree.get_children()[0]
                row = fixture(window).row(asset)
                Path(row['path']).with_suffix('.json').write_text('{"generated":true}', encoding='utf-8')
                fixture(window).inventory(row['path'], row['namespace'])
                window.tree.selection_set(asset)
                window.open_full_review()
                dialog = window.review_dialog
                wait_review(dialog)
                self.assertTrue(window.busy)
                with self.assertRaises(PrivacyBlocked):
                    with fixture(window).worker_lock():
                        self.fail('review must own the single-worker slot')
                units = dialog.tree.get_children()
                self.assertEqual(len(units), 2)
                for index, unit in enumerate(units):
                    dialog.tree.selection_set(unit)
                    dialog.open_selected()
                    wait_review(dialog)
                    root.update_idletasks()
                    self.assertEqual(fixture(window)._review_state(asset, unit), 'opened')
                    dialog.confirm_selected()
                    wait_review(dialog)
                    self.assertEqual(fixture(window)._review_state(asset, unit), 'opened')
                    dialog.attest.set(True)
                    dialog.confirm_selected()
                    wait_review(dialog)
                    self.assertEqual(fixture(window)._review_state(asset, unit), 'confirmed')
                close_review(dialog)
                dialog = None
                window.attest.set(True)
                window.decide('approved_local_archive')
                wait_ui(window)
                self.assertEqual(fixture(window).row(asset)['decision'], 'approved_local_archive')
            finally:
                if dialog:
                    close_review(dialog)
                wait_ui(window)
                window.close()

    def test_native_player_closing_requires_separate_human_confirmation(self):
        import subprocess
        import tkinter as tk
        from review import ReviewWindow, demo_fixture
        with tempfile.TemporaryDirectory() as directory:
            runtime = demo_fixture(Path(directory))
            video = Path(directory) / 'synthetic-video.mkv'
            subprocess.run([shutil.which('ffmpeg'), '-nostdin', '-v', 'error', '-f', 'lavfi', '-i',
                'color=c=green:s=32x32:r=2:d=0.5', '-f', 'lavfi', '-i', 'anullsrc=r=8000:cl=mono',
                '-t', '0.5', '-c:v', 'ffv1', '-c:a', 'pcm_s16le', '-threads', '1', str(video)],
                capture_output=True, check=True, timeout=20)
            root = tk.Tk()
            window = ReviewWindow(root, runtime, demo=True)
            wait_ui(window)
            dialog = None
            try:
                asset = fixture(window).inventory(video, 'synthetic-demo')
                window.refresh()
                wait_ui(window)
                window.tree.selection_set(asset)
                window.open_full_review()
                dialog = window.review_dialog
                wait_review(dialog)
                units = dialog.tree.get_children()
                self.assertEqual({unit['kind'] for unit in dialog.units.values()}, {'video', 'audio'})
                for unit in units:
                    dialog.tree.selection_set(unit)
                    dialog.open_selected()
                    wait_review(dialog)
                    self.assertIsNotNone(dialog.player)
                    deadline = time.monotonic() + 12
                    while dialog.player and time.monotonic() < deadline:
                        root.update()
                        time.sleep(0.05)
                    self.assertIsNone(dialog.player)
                    wait_review(dialog)
                    self.assertEqual(fixture(window)._review_state(asset, unit), 'opened')
                    self.assertEqual(fixture(window).row(asset)['decision'], 'unreviewed')
                    dialog.attest.set(True)
                    dialog.confirm_selected()
                    wait_review(dialog)
                close_review(dialog)
                dialog = None
                window.attest.set(True)
                window.decide('approved_local_archive')
                wait_ui(window)
                self.assertEqual(fixture(window).row(asset)['decision'], 'approved_local_archive')
            finally:
                if dialog:
                    close_review(dialog)
                wait_ui(window)
                window.close()

    def test_player_stops_after_abrupt_parent_exit(self):
        import ctypes
        import subprocess
        import wave
        from review_media import player_path
        with tempfile.TemporaryDirectory() as directory:
            audio = Path(directory) / 'synthetic-silence.wav'
            with wave.open(str(audio), 'wb') as output:
                output.setparams((1, 1, 8000, 0, 'NONE', 'not compressed'))
                output.writeframes(b'\x80' * 8000 * 60)
            code = """import os,sys
from review_media import LocalPlayer
p=LocalPlayer({'path':sys.argv[1],'kind':'audio','stream':0})
print(p.process.pid,flush=True)
sys.stdin.buffer.read(1)
os._exit(0)
"""
            env = dict(os.environ, PYTHONPATH=str(Path(__file__).resolve().parents[2] / 'scripts/local-media-privacy'))
            parent = subprocess.Popen([sys.executable, '-c', code, str(audio)], stdin=subprocess.PIPE,
                stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, env=env, text=True)
            handles = []
            kernel = ctypes.windll.kernel32
            kernel.OpenProcess.restype = ctypes.c_void_p
            kernel.OpenProcess.argtypes = [ctypes.c_ulong, ctypes.c_int, ctypes.c_ulong]
            kernel.WaitForSingleObject.argtypes = [ctypes.c_void_p, ctypes.c_ulong]
            kernel.CloseHandle.argtypes = [ctypes.c_void_p]
            try:
                helper = int(parent.stdout.readline().strip())
                query = f"@(Get-CimInstance Win32_Process -Filter 'ParentProcessId={helper}' | Select-Object -ExpandProperty ProcessId) | ConvertTo-Json -Compress"
                deadline = time.monotonic() + 8
                children = []
                while time.monotonic() < deadline and not children:
                    found = subprocess.run(['powershell.exe', '-NoProfile', '-Command', query], capture_output=True,
                                           text=True, timeout=5)
                    import json
                    value = json.loads(found.stdout or '[]')
                    children = value if isinstance(value, list) else [value]
                self.assertTrue(children, 'owned player did not start')
                for pid in [helper, *children]:
                    handle = kernel.OpenProcess(0x100000, False, pid)
                    self.assertTrue(handle)
                    handles.append(handle)
                parent.stdin.write('x')
                parent.stdin.flush()
                parent.wait(timeout=5)
                for handle in handles:
                    self.assertEqual(kernel.WaitForSingleObject(handle, 6000), 0, 'owned child survived parent loss')
            finally:
                if parent.poll() is None:
                    parent.kill()
                parent.wait(timeout=5)
                parent.stdin.close()
                parent.stdout.close()
                for handle in handles:
                    kernel.CloseHandle(handle)

    def test_shutdown_timeout_keeps_review_usable_until_retry(self):
        import tkinter as tk
        from unittest.mock import MagicMock
        from privacy_core import PrivacyBlocked
        from review import ReviewWindow, demo_fixture
        with tempfile.TemporaryDirectory() as directory:
            root = tk.Tk()
            window = ReviewWindow(root, demo_fixture(Path(directory)), demo=True)
            wait_ui(window)
            dialog = None
            try:
                window.tree.selection_set(window.tree.get_children()[0])
                window.open_full_review()
                dialog = window.review_dialog
                wait_review(dialog)
                player = MagicMock()
                player.poll.return_value = None
                player.close.side_effect = [TimeoutError(), None]
                dialog.player = player
                with patch('threading.Thread.start', side_effect=RuntimeError('test start failure')):
                    self.assertFalse(dialog.stop_playback())
                    self.assertIn('retry Stop playback', dialog.status.get())
                    self.assertIs(dialog.player, player)
                    player.close.assert_not_called()
                self.assertFalse(dialog.close())
                wait_review(dialog)
                self.assertFalse(dialog.closed)
                self.assertTrue(window.busy)
                self.assertIs(dialog.player, player)
                self.assertTrue(dialog.window.winfo_exists())
                self.assertIn('retry Stop playback', dialog.status.get())
                with self.assertRaises(PrivacyBlocked):
                    with fixture(window).worker_lock():
                        self.fail('worker slot released before player stopped')
                self.assertTrue(close_review(dialog))
                self.assertTrue(dialog.closed)
                self.assertFalse(window.busy)
                self.assertTrue(close_review(dialog))
                with fixture(window).worker_lock():
                    pass
            finally:
                if dialog and not dialog.closed:
                    close_review(dialog)
                wait_ui(window)
                window.close()
