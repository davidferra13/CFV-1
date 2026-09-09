"""Owner-operated full-media review. Seeing a player close never grants approval."""
from pathlib import Path
import time
import tkinter as tk
from tkinter import ttk
from privacy_core import Store, PrivacyBlocked, checked_path
from ui_task import UiTask
from review_media import LocalPlayer, read_text
from worker import resource_stop_reason

MESSAGES = {
    'review_unit_unsupported': 'This part cannot be reviewed here. Keep the bundle private or excluded.',
    'stale_review': 'The file or a companion changed. Close this review and resume the source scan.',
    'removal_review_preview_excluded': 'Removal-review material is excluded from viewing and reuse.',
    'open_review_unit_first': 'Open and review this part before marking it reviewed.',
    'low_disk': 'Free at least 2 GiB on the runtime drive before opening media.',
    'low_memory': 'Free at least 1 GiB of available memory before opening media.',
    'player_shutdown_pending': 'Playback has not stopped yet. Keep this window open and retry Stop playback or Return to queue.',
    'player_missing': 'The installed FFplay player is unavailable. Check the local setup.',
}


class ReviewDialog:
    def __init__(self, owner, asset_id):
        self.owner, self.store, self.asset_id = owner, owner.store, asset_id
        self.player, self.playing_unit = None, None
        self.viewers, self.closed = [], False
        self.lock = None
        self.poll_timer = None
        self.units, self.states = {}, {}
        self.window = tk.Toplevel(owner.root)
        self.task = UiTask(self.window)
        self.window.title('Local private review | File and companions')
        self.window.geometry('1000x650')
        self.window.transient(owner.root)
        self.window.protocol('WM_DELETE_WINDOW', self.close)
        outer = ttk.Frame(self.window, padding=16)
        outer.pack(fill='both', expand=True)
        ttk.Label(outer, text='Review every part', font=('Segoe UI', 17, 'bold')).pack(anchor='w')
        ttk.Label(outer, text='Open each part locally, review its complete contents, then mark it reviewed. '
            'Playback does not prove you watched or heard everything. Audio tracks are reviewed separately.',
            wraplength=940).pack(anchor='w', pady=8)
        self.status = tk.StringVar(value='Preparing the local checklist...')
        ttk.Label(outer, textvariable=self.status, wraplength=940).pack(anchor='w', pady=8)
        frame = ttk.Frame(outer)
        frame.pack(fill='both', expand=True)
        self.tree = ttk.Treeview(frame, columns=('file', 'part', 'state'), show='headings', selectmode='browse')
        for key, label, width in [('file', 'File or companion', 420), ('part', 'Part to review', 280), ('state', 'Your review', 150)]:
            self.tree.heading(key, text=label)
            self.tree.column(key, width=width)
        scroll = ttk.Scrollbar(frame, command=self.tree.yview)
        self.tree.configure(yscrollcommand=scroll.set)
        self.tree.pack(side='left', fill='both', expand=True)
        scroll.pack(side='right', fill='y')
        self.tree.bind('<<TreeviewSelect>>', lambda _: self.select())
        self.attest = tk.BooleanVar(value=False)
        ttk.Checkbutton(outer, variable=self.attest,
            text='I reviewed this entire part, including the full duration when it has one.').pack(anchor='w', pady=12)
        controls = ttk.Frame(outer)
        controls.pack(fill='x')
        self.open_button = ttk.Button(controls, text='Open selected part locally', style='Primary.TButton', command=self.open_selected)
        self.open_button.pack(side='left')
        self.stop_button = ttk.Button(controls, text='Stop playback', command=self.stop_playback)
        self.stop_button.pack(side='left', padx=8)
        self.mark_button = ttk.Button(controls, text='Mark selected part reviewed', command=self.confirm_selected)
        self.mark_button.pack(side='left')
        ttk.Button(controls, text='Return to queue', command=self.close).pack(side='right')
        ttk.Label(outer, text='For video: Space pauses, F toggles full screen, S advances one frame while paused, '
                  'arrow keys seek, Q closes the player. Unsupported streams remain excluded.', wraplength=940).pack(anchor='w', pady=10)
        self.window.grab_set()
        self.select()
        self.poll_timer = self.window.after(250, self.poll_player)
        self.run(self.prepare, self.loaded, 'Preparing the local checklist...')

    def prepare(self, store):
        lock = store.worker_lock()
        lock.__enter__()
        self.lock = lock
        try:
            return self.snapshot(store)
        except Exception:
            lock.__exit__(None, None, None)
            self.lock = None
            raise

    def snapshot(self, store):
        units = store.review_plan(self.asset_id)
        return units, {unit['id']: store._review_state(self.asset_id, unit['id']) for unit in units}

    def loaded(self, value, message=None):
        units, self.states = value
        self.units = {unit['id']: unit for unit in units}
        self.refresh(message)

    def run(self, work, done, message):
        if self.task.busy or self.closed:
            return False
        self.status.set(message)
        self.attest.set(False)
        def execute():
            self.owner.protect()
            store = Store(self.owner.directory)
            try:
                return work(store)
            finally:
                store.close()
        def complete(value):
            try:
                done(value)
            except Exception as error:
                self.error(error)
            self.select(reset=False)
        def failed(error):
            self.error(error)
            self.select(reset=False)
        self.task.start(execute, complete, failed)
        self.select(reset=False)
        return True

    def error(self, error):
        code = error.code if isinstance(error, PrivacyBlocked) else ''
        self.status.set(MESSAGES.get(code, 'Review was held. Check the local protection and source, then retry.'))

    def refresh(self, message=None):
        selected = self.tree.selection()
        states = self.states
        self.tree.delete(*self.tree.get_children())
        for unit in self.units.values():
            part = unit['kind'].replace('_', ' ')
            if unit['stream'] is not None:
                part += f" {unit['stream'] + 1}"
            if unit['kind'] == 'unsupported':
                part += ' (held)'
            self.tree.insert('', 'end', iid=unit['id'], values=(Path(unit['path']).name, part,
                'unsupported' if unit['kind'] == 'unsupported' else states[unit['id']]))
        if selected and self.tree.exists(selected[0]):
            self.tree.selection_set(selected)
        confirmed = sum(state == 'confirmed' for state in states.values())
        unsupported = sum(unit['kind'] == 'unsupported' for unit in self.units.values())
        self.status.set(message or f'{confirmed} of {len(self.units)} parts marked reviewed. {unsupported} unsupported parts held.')
        self.attest.set(False)
        self.select(reset=False)

    def selected(self):
        ids = self.tree.selection()
        if not ids:
            raise PrivacyBlocked('open_review_unit_first')
        unit = self.units[ids[0]]
        if unit['kind'] == 'unsupported':
            raise PrivacyBlocked('review_unit_unsupported')
        return unit

    def select(self, reset=True):
        if reset:
            self.attest.set(False)
        ids = self.tree.selection()
        available = bool(ids) and self.units[ids[0]]['kind'] != 'unsupported' and not self.player and not self.task.busy
        self.open_button.state(['!disabled'] if available else ['disabled'])
        state = self.states.get(ids[0], 'unreviewed') if ids else 'unreviewed'
        self.mark_button.state(['!disabled'] if available and state in {'opened', 'confirmed'} else ['disabled'])
        self.stop_button.state(['!disabled'] if self.player and not self.task.busy else ['disabled'])

    def open_selected(self):
        if self.task.busy:
            return
        try:
            if self.player:
                raise PrivacyBlocked('open_review_unit_first')
            unit_id = self.selected()['id']
        except Exception as error:
            self.error(error)
            return
        def prepare(store):
            reason = resource_stop_reason(self.owner.directory)
            if reason:
                raise PrivacyBlocked(reason)
            unit = store.review_unit(self.asset_id, unit_id)
            if unit['kind'] in {'video', 'audio'}:
                return unit, LocalPlayer(unit)
            if unit['kind'] == 'text':
                return unit, read_text(unit['path'])
            from PIL import Image, ImageOps
            with Image.open(checked_path(unit['path'])) as source:
                source.seek(unit['stream'] or 0)
                if source.width * source.height > 32_000_000:
                    raise PrivacyBlocked('review_unit_unsupported')
                image = ImageOps.exif_transpose(source).convert('RGB')
                fitted = image.copy()
                fitted.thumbnail((900, 600))
                return unit, (image, fitted)
        def opened(value):
            unit, content = value
            if unit['kind'] in {'video', 'audio'}:
                self.player, self.playing_unit = content, unit['id']
                self.status.set('Playing locally. Review the whole track; closing playback does not mark it reviewed.')
            else:
                self.open_document(unit, content)
                def mark(store):
                    store.mark_review_unit(self.asset_id, unit['id'])
                    return self.snapshot(store)
                self.run(mark, lambda value: self.loaded(value,
                    'Opened locally. Mark the part reviewed only after examining all of it.'), 'Verifying the opened part...')
        self.run(prepare, opened, 'Checking and opening the selected part locally...')

    def open_document(self, unit, content):
        view = tk.Toplevel(self.window)
        view.title('Local private review | Selected part')
        view.geometry('960x720')
        image, fitted = content if unit['kind'] != 'text' else (None, None)
        try:
            if unit['kind'] == 'text':
                text = tk.Text(view, wrap='word', padx=12, pady=12)
                scroll = ttk.Scrollbar(view, command=text.yview)
                text.configure(yscrollcommand=scroll.set)
                text.insert('1.0', content)
                text.configure(state='disabled')
                scroll.pack(side='right', fill='y')
                text.pack(fill='both', expand=True)
            else:
                from PIL import ImageTk
                controls = ttk.Frame(view, padding=8)
                controls.pack(fill='x')
                frame = ttk.Frame(view)
                frame.pack(fill='both', expand=True)
                canvas = tk.Canvas(frame, background='#242424')
                vertical = ttk.Scrollbar(frame, orient='vertical', command=canvas.yview)
                horizontal = ttk.Scrollbar(frame, orient='horizontal', command=canvas.xview)
                canvas.configure(xscrollcommand=horizontal.set, yscrollcommand=vertical.set)
                vertical.pack(side='right', fill='y')
                horizontal.pack(side='bottom', fill='x')
                canvas.pack(fill='both', expand=True)
                def render(actual=False):
                    view.photo = ImageTk.PhotoImage(image if actual else fitted)
                    canvas.delete('all')
                    canvas.create_image(0, 0, image=view.photo, anchor='nw')
                    canvas.configure(scrollregion=canvas.bbox('all'))
                ttk.Button(controls, text='Fit', command=render).pack(side='left')
                ttk.Button(controls, text='Actual pixels', command=lambda: render(True)).pack(side='left', padx=8)
                render()
            def close_view():
                if image is not None:
                    image.close()
                    fitted.close()
                view.photo = None
                if view.winfo_exists():
                    view.destroy()
            view.protocol('WM_DELETE_WINDOW', close_view)
            self.viewers.append(close_view)
        except Exception:
            if image is not None:
                image.close()
                fitted.close()
            view.destroy()
            raise

    def confirm_selected(self):
        if self.task.busy:
            return
        try:
            if self.player or not self.attest.get():
                raise PrivacyBlocked('open_review_unit_first')
            unit_id = self.selected()['id']
        except Exception as error:
            self.error(error)
            return
        def confirm(store):
            store.mark_review_unit(self.asset_id, unit_id, confirmed=True)
            return self.snapshot(store)
        self.run(confirm, self.loaded, 'Verifying this complete-part confirmation...')

    def poll_player(self):
        if self.poll_timer is not None:
            self.window.after_cancel(self.poll_timer)
            self.poll_timer = None
        if self.closed:
            return
        if self.player and not self.task.busy and self.player.poll() is not None:
            result = self.player.poll()
            self.finish_player(result)
        if self.window.winfo_exists():
            self.poll_timer = self.window.after(250, self.poll_player)

    def finish_player(self, result=None):
        if self.task.busy or not self.player:
            return False
        player, unit_id = self.player, self.playing_unit
        def finished(_):
            self.player = None
            self.playing_unit = None
            if result == 0:
                def mark(store):
                    store.mark_review_unit(self.asset_id, unit_id)
                    return self.snapshot(store)
                self.run(mark, lambda value: self.loaded(value,
                    'Player closed. Confirm only if you reviewed the complete track; otherwise reopen it.'),
                    'Verifying the played part...')
            else:
                self.status.set('Playback stopped. No new review was recorded. Reopen the part when ready.')
            self.select(reset=False)
        def failed(_):
            # Keep the handle, window and worker slot for another stop attempt.
            self.error(PrivacyBlocked('player_shutdown_pending'))
            self.select(reset=False)
        self.status.set('Stopping the owned local player...')
        self.task.start(player.close, finished, failed)
        self.select(reset=False)
        return False

    def stop_playback(self):
        if self.task.busy:
            self.status.set('Wait for the current local check or player shutdown, then retry.')
            return False
        if self.player:
            return self.finish_player()
        return True

    def close(self):
        if self.closed:
            return True
        if self.task.busy:
            self.status.set('A local check is finishing. Keep this window open, then retry Return to queue.')
            return False
        # A failed shutdown retains the player handle, worker slot and a usable
        # window. The next Close/Stop retries instead of abandoning playback.
        if not self.stop_playback():
            return False
        self.task.close()
        if self.poll_timer is not None:
            self.window.after_cancel(self.poll_timer)
            self.poll_timer = None
        for close_view in self.viewers:
            try:
                close_view()
            except tk.TclError:
                pass
        self.viewers.clear()
        try:
            self.window.grab_release()
            self.window.destroy()
        finally:
            if self.lock is not None:
                self.lock.__exit__(None, None, None)
                self.lock = None
            self.closed = True
            self.owner.busy = False
            self.owner.review_dialog = None
        self.owner.refresh()
        if self.owner.tree.exists(self.asset_id):
            self.owner.tree.selection_set(self.asset_id)
            self.owner.select()
        return True
