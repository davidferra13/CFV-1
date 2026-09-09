"""One owned worker; results and all widget access stay on the Tk thread."""
import gc
import queue
import threading
from privacy_core import PrivacyBlocked


class TkGarbageCollection:
    """Cyclic Tk objects must be finalized by their interpreter's thread.

    This affects only this native UI process. Reference counting continues;
    cyclic collection runs on Tk once a second and the prior setting is restored
    after the last window closes with all of its workers drained.
    """
    owners = 0
    previously_enabled = True

    def __init__(self, root):
        if threading.current_thread() is not threading.main_thread():
            raise RuntimeError('tk_owner_thread_required')
        self.root, self.closed = root, False
        if not type(self).owners:
            type(self).previously_enabled = gc.isenabled()
            gc.disable()
        type(self).owners += 1
        gc.collect()
        self.timer = root.after(1000, self.collect)

    def collect(self):
        gc.collect()
        self.timer = self.root.after(1000, self.collect)

    def close(self):
        if self.closed:
            return
        self.closed = True
        self.root.after_cancel(self.timer)
        self.root = None
        gc.collect()
        type(self).owners -= 1
        if not type(self).owners and type(self).previously_enabled:
            gc.enable()


def _run(work, results):
    try:
        value = work()
    except Exception as error:
        # Tracebacks can retain widgets/closures and later be collected on a
        # worker thread. Transfer a neutral code, never the traceback or text.
        results.put((False, error.code if isinstance(error, PrivacyBlocked) else None))
    else:
        results.put((True, value))


class UiTask:
    def __init__(self, root):
        self.root = root
        self.busy = False
        self.timer = None
        self.thread = self.results = self.done = self.failed = None

    def start(self, work, done, failed):
        if self.busy:
            return False
        self.busy = True
        self.results = queue.Queue(maxsize=1)
        self.done, self.failed = done, failed
        self.thread = threading.Thread(target=_run, args=(work, self.results), daemon=False)
        try:
            self.thread.start()
        except Exception:
            self.busy = False
            self.thread = self.results = self.done = self.failed = None
            failed(RuntimeError('local_worker_unavailable'))
            return False
        self.timer = self.root.after(20, self.poll)
        return True

    def poll(self):
        self.timer = None
        # A result is not completion until the worker drops its references.
        if self.thread.is_alive():
            self.timer = self.root.after(20, self.poll)
            return
        self.thread.join(timeout=0)
        try:
            ok, value = self.results.get_nowait()
        except queue.Empty:
            ok, value = False, None
        done, failed = self.done, self.failed
        self.thread = self.results = self.done = self.failed = None
        self.busy = False
        if ok:
            done(value)
        else:
            failed(PrivacyBlocked(value) if value else RuntimeError('local_operation_failed'))

    def close(self):
        if self.busy:
            return False
        if self.timer is not None:
            self.root.after_cancel(self.timer)
            self.timer = None
        self.root = None
        return True
