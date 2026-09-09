"""Owner-operated full-media review. Seeing a player close never grants approval."""
from pathlib import Path
import time
import tkinter as tk
from tkinter import ttk
from privacy_core import PrivacyBlocked, checked_path
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
        self.window = tk.Toplevel(owner.root)
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
        try:
            owner.protect()
            self.lock = self.store.worker_lock()
            self.lock.__enter__()
            self.units = {unit['id']: unit for unit in self.store.review_plan(asset_id)}
            self.refresh()
            self.window.grab_set()
            self.poll_timer = self.window.after(250, self.poll_player)
        except Exception:
            if self.lock is not None:
                self.lock.__exit__(None, None, None)
                self.lock = None
            self.window.destroy()
            raise

    def error(self, error):
        code = error.code if isinstance(error, PrivacyBlocked) else ''
        self.status.set(MESSAGES.get(code, 'Review was held. Check the local protection and source, then retry.'))

    def refresh(self, message=None):
        selected = self.tree.selection()
        states = self.store.review_states(self.asset_id)
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
        return self.store.review_unit(self.asset_id, ids[0])

    def select(self, reset=True):
        if reset:
            self.attest.set(False)
        ids = self.tree.selection()
        available = bool(ids) and self.units[ids[0]]['kind'] != 'unsupported' and not self.player
        self.open_button.state(['!disabled'] if available else ['disabled'])
        state = self.store._review_state(self.asset_id, ids[0]) if ids else 'unreviewed'
        self.mark_button.state(['!disabled'] if available and state in {'opened', 'confirmed'} else ['disabled'])
        self.stop_button.state(['!disabled'] if self.player else ['disabled'])

    def open_selected(self):
        try:
            if self.player:
                raise PrivacyBlocked('open_review_unit_first')
            self.owner.protect()
            reason = resource_stop_reason(self.owner.directory)
            if reason:
                raise PrivacyBlocked(reason)
            unit = self.selected()
            if unit['kind'] in {'video', 'audio'}:
                self.player = LocalPlayer(unit)
                self.playing_unit = unit['id']
                self.status.set('Playing locally. Review the whole track; closing playback does not mark it reviewed.')
            else:
                self.open_document(unit)
                self.store.mark_review_unit(self.asset_id, unit['id'])
                self.refresh('Opened locally. Mark the part reviewed only after examining all of it.')
            self.select()
        except Exception as error:
            self.error(error)

    def open_document(self, unit):
        view = tk.Toplevel(self.window)
        view.title('Local private review | Selected part')
        view.geometry('960x720')
        image = None
        try:
            if unit['kind'] == 'text':
                content = read_text(unit['path'])
                text = tk.Text(view, wrap='word', padx=12, pady=12)
                scroll = ttk.Scrollbar(view, command=text.yview)
                text.configure(yscrollcommand=scroll.set)
                text.insert('1.0', content)
                text.configure(state='disabled')
                scroll.pack(side='right', fill='y')
                text.pack(fill='both', expand=True)
            else:
                from PIL import Image, ImageOps, ImageTk
                with Image.open(checked_path(unit['path'])) as source:
                    source.seek(unit['stream'] or 0)
                    if source.width * source.height > 32_000_000:
                        raise PrivacyBlocked('review_unit_unsupported')
                    image = ImageOps.exif_transpose(source).convert('RGB')
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
                    shown = image.copy()
                    if not actual:
                        shown.thumbnail((900, 600))
                    view.photo = ImageTk.PhotoImage(shown)
                    shown.close()
                    canvas.delete('all')
                    canvas.create_image(0, 0, image=view.photo, anchor='nw')
                    canvas.configure(scrollregion=canvas.bbox('all'))
                ttk.Button(controls, text='Fit', command=render).pack(side='left')
                ttk.Button(controls, text='Actual pixels', command=lambda: render(True)).pack(side='left', padx=8)
                render()
            def close_view():
                if image is not None:
                    image.close()
                view.photo = None
                if view.winfo_exists():
                    view.destroy()
            view.protocol('WM_DELETE_WINDOW', close_view)
            self.viewers.append(close_view)
        except Exception:
            if image is not None:
                image.close()
            view.destroy()
            raise

    def confirm_selected(self):
        try:
            if self.player or not self.attest.get():
                raise PrivacyBlocked('open_review_unit_first')
            self.owner.protect()
            unit = self.selected()
            self.store.mark_review_unit(self.asset_id, unit['id'], confirmed=True)
            self.refresh()
        except Exception as error:
            self.error(error)

    def poll_player(self):
        if self.poll_timer is not None:
            self.window.after_cancel(self.poll_timer)
            self.poll_timer = None
        if self.closed:
            return
        if self.player and self.player.poll() is not None:
            result = self.player.poll()
            try:
                self.player.close()
            except Exception:
                self.error(PrivacyBlocked('player_shutdown_pending'))
                self.poll_timer = self.window.after(250, self.poll_player)
                return
            self.player = None
            try:
                if result == 0:
                    self.owner.protect()
                    self.store.mark_review_unit(self.asset_id, self.playing_unit)
                    self.refresh('Player closed. Confirm only if you reviewed the complete track; otherwise reopen it.')
                else:
                    self.status.set('Playback failed or stopped. Reopen the part to review it; no new review was recorded.')
            except Exception as error:
                self.error(error)
            self.select()
        if self.window.winfo_exists():
            self.poll_timer = self.window.after(250, self.poll_player)

    def stop_playback(self):
        if self.player:
            try:
                self.player.close()
            except Exception:
                self.error(PrivacyBlocked('player_shutdown_pending'))
                return False
            self.player = None
            self.playing_unit = None
            self.status.set('Playback stopped. No new review was recorded. Reopen the part when ready.')
            self.select()
        return True

    def close(self):
        if self.closed:
            return True
        # A failed shutdown retains the player handle, worker slot and a usable
        # window. The next Close/Stop retries instead of abandoning playback.
        if not self.stop_playback():
            return False
        if self.poll_timer is not None:
            self.window.after_cancel(self.poll_timer)
            self.poll_timer = None
        for close_view in self.viewers:
            try:
                close_view()
            except tk.TclError:
                pass
        try:
            self.window.grab_release()
            self.window.destroy()
        finally:
            if self.lock is not None:
                self.lock.__exit__(None, None, None)
                self.lock = None
            self.closed = True
            self.owner.busy = False
        self.owner.refresh()
        if self.owner.tree.exists(self.asset_id):
            self.owner.tree.selection_set(self.asset_id)
            self.owner.select()
        return True
