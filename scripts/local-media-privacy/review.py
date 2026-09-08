"""Native owner-only review window. No HTTP server, telemetry or file relocation."""
import argparse
import json
import os
from pathlib import Path
import queue
import tempfile
import threading
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from privacy_core import Store, PrivacyBlocked, checked_path, bundle
from security import require_isolation
from worker import Detector, scan, walk_sources, IMAGE_EXT


class ReviewWindow:
    def __init__(self, root, directory, demo=False):
        self.root, self.directory, self.demo = root, Path(directory), demo
        self.store = None
        self.events = queue.Queue()
        self.stop = threading.Event()
        self.busy = False
        self.photo = None
        self.page = 0
        self.action_buttons = []
        # Surface mode: reviewing. Evidence, decision controls and queue only.
        root.title('ChefFlow | Local media privacy' + (' | SYNTHETIC DEMO' if demo else ''))
        root.geometry('1120x760')
        root.minsize(900, 620)
        outer = ttk.Frame(root, padding=18)
        outer.pack(fill='both', expand=True)
        ttk.Label(outer, text='Local media privacy', font=('Segoe UI', 20, 'bold')).pack(anchor='w')
        ttk.Label(outer, text='Review locally. Originals stay in place. A model flag never grants approval.').pack(anchor='w', pady=(4, 14))
        self.status = tk.StringVar(value='Checking local protection...')
        ttk.Label(outer, textvariable=self.status, wraplength=1050).pack(anchor='w')
        toolbar = ttk.Frame(outer)
        toolbar.pack(fill='x', pady=12)
        scan_button = ttk.Button(toolbar, text='Choose source and scan', command=self.start_scan)
        scan_button.pack(side='left')
        self.action_buttons.append(scan_button)
        ttk.Button(toolbar, text='Pause after current frame', command=self.stop.set).pack(side='left', padx=6)
        match_button = ttk.Button(toolbar, text='Match local export', command=self.start_match)
        match_button.pack(side='left')
        self.action_buttons.append(match_button)
        ttk.Button(toolbar, text='Refresh', command=self.refresh).pack(side='left', padx=6)
        self.filter = tk.StringVar(value='All')
        filters = ttk.Combobox(toolbar, textvariable=self.filter, state='readonly', width=20,
            values=['All', 'Needs review', 'Suspected sensitive', 'Private', 'Removal review', 'Approved'])
        filters.pack(side='right')
        filters.bind('<<ComboboxSelected>>', lambda _: self.change_page(reset=True))
        panes = ttk.Panedwindow(outer, orient='horizontal')
        panes.pack(fill='both', expand=True)
        left, right = ttk.Frame(panes), ttk.Frame(panes, padding=(18, 0, 0, 0))
        panes.add(left, weight=1)
        panes.add(right, weight=1)
        self.tree = ttk.Treeview(left, columns=('name', 'signal', 'decision'), show='headings', selectmode='browse')
        for field, label, width in [('name', 'File', 220), ('signal', 'Model signal', 150), ('decision', 'Your decision', 180)]:
            self.tree.heading(field, text=label)
            self.tree.column(field, width=width, minwidth=90)
        scrollbar = ttk.Scrollbar(left, command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)
        self.tree.pack(side='left', fill='both', expand=True)
        scrollbar.pack(side='right', fill='y')
        self.tree.bind('<<TreeviewSelect>>', self.select)
        pagination = ttk.Frame(outer)
        pagination.pack(fill='x', pady=4)
        self.page_label = tk.StringVar(value='')
        ttk.Button(pagination, text='Previous page', command=lambda: self.change_page(-1)).pack(side='left')
        ttk.Label(pagination, textvariable=self.page_label).pack(side='left', padx=12)
        ttk.Button(pagination, text='Next page', command=lambda: self.change_page(1)).pack(side='left')
        self.detail = tk.StringVar(value='Select a file. Previews remain hidden until you choose Reveal.')
        ttk.Label(right, textvariable=self.detail, wraplength=430, justify='left').pack(anchor='w')
        self.preview = ttk.Label(right, text='Preview hidden', anchor='center')
        self.preview.pack(fill='both', expand=True, pady=12)
        ttk.Button(right, text='Reveal image locally', command=self.reveal).pack(fill='x')
        ttk.Button(right, text='Hide preview', command=self.hide).pack(fill='x', pady=4)
        self.attest = tk.BooleanVar(value=False)
        ttk.Checkbutton(right, variable=self.attest, text='I reviewed the complete file and all companions.\nIt is appropriate for local archive use.').pack(anchor='w', pady=10)
        for label, decision in [('Keep private', 'private'), ('Exclude / removal review', 'removal_review'),
                                ('Approve local archive use', 'approved_local_archive')]:
            button = ttk.Button(right, text=label, command=lambda d=decision: self.decide(d))
            button.pack(fill='x', pady=2)
            self.action_buttons.append(button)
        more = tk.Menu(root, tearoff=False)
        more.add_command(label='Reset selected file to unreviewed', command=lambda: self.decide('unreviewed'))
        menu = tk.Menu(root)
        menu.add_cascade(label='Review', menu=more)
        root.configure(menu=menu)
        ttk.Label(outer, text='Possible under-18 sexual material: use Exclude / removal review. No age inference, training, copies, or automatic deletion.',
                  wraplength=1050).pack(anchor='w', pady=(12, 0))
        root.protocol('WM_DELETE_WINDOW', self.close)
        root.report_callback_exception = lambda *_: self.status.set('Operation unavailable. Sources are unchanged.')
        self.refresh()
        root.after(250, self.poll)

    def protect(self):
        if not self.demo:
            require_isolation(self.directory)

    def refresh(self):
        if self.busy:
            return
        try:
            self.protect()
            if self.store is None:
                self.store = Store(self.directory)
            for button in self.action_buttons:
                button.state(['!disabled'])
            self.hide()
            self.tree.delete(*self.tree.get_children())
            filters = {'Needs review': ('decision', 'unreviewed'), 'Suspected sensitive': ('signal', 'suspected_sensitive'),
                       'Private': ('decision', 'private'), 'Removal review': ('decision', 'removal_review'),
                       'Approved': ('decision', 'approved_local_archive')}
            criterion = filters.get(self.filter.get())
            where = f' WHERE {criterion[0]}=?' if criterion else ''
            params = [criterion[1]] if criterion else []
            total = self.store.db.execute('SELECT count(*) FROM assets' + where, params).fetchone()[0]
            self.page = min(self.page, max(0, (total - 1) // 200))
            rows = self.store.db.execute("SELECT * FROM assets" + where +
                " ORDER BY CASE signal WHEN 'suspected_sensitive' THEN 0 WHEN 'unknown' THEN 1 ELSE 2 END, updated_at DESC LIMIT 200 OFFSET ?", params + [self.page * 200])
            self.page_label.set(f'Page {self.page + 1} of {max(1, (total + 199) // 200)} | {total} matching files')
            for row in rows:
                criterion = filters.get(self.filter.get())
                if criterion and row[criterion[0]] != criterion[1]:
                    continue
                self.tree.insert('', 'end', iid=row['id'], values=(Path(row['path']).name, row['signal'], row['decision']))
            counts = self.store.counts()
            self.status.set(' | '.join(f'{key.replace("_", " ")}: {value}' for key, value in counts.items() if value)
                            or 'Ready. Choose a source folder. Nothing has been scanned.')
        except Exception:
            for button in self.action_buttons:
                button.state(['disabled'])
            self.status.set('Real-media access is locked: encrypted owner-only storage and outbound isolation must pass. See the setup guide. No media opened.')

    def change_page(self, change=0, reset=False):
        self.page = 0 if reset else max(0, self.page + change)
        self.refresh()

    def selected(self):
        selection = self.tree.selection()
        if not selection or not self.store:
            raise PrivacyBlocked('select_a_file')
        return self.store.row(selection[0])

    def select(self, _event=None):
        self.hide()
        try:
            row = self.selected()
            coverage = json.loads(row['coverage'])
            self.detail.set(f"{row['path']}\n\nSignal: {row['signal']}\nDecision: {row['decision']}\n"
                            f"Coverage: {coverage.get('status', 'not inspected')}\nFrames inspected: {coverage.get('frames', 0)}\n"
                            f"Companions: {len(json.loads(row['components'])) - 1}\nCloud use: disabled")
        except PrivacyBlocked:
            pass

    def hide(self):
        self.photo = None
        self.preview.configure(image='', text='Preview hidden')
        self.attest.set(False)

    def reveal(self):
        try:
            self.protect()
            row = self.selected()
            if row['decision'] == 'removal_review':
                raise PrivacyBlocked('removal_review_preview_excluded')
            path = checked_path(row['path'])
            if path.suffix.lower() not in IMAGE_EXT or path.stat().st_size > 64 * 1024**2:
                raise PrivacyBlocked('image_preview_only')
            if bundle(path)[0] != row['bundle_hash']:
                raise PrivacyBlocked('stale_review')
            from PIL import Image, ImageTk
            with Image.open(path) as source:
                image = source.convert('RGB')
                image.thumbnail((420, 330))
                self.photo = ImageTk.PhotoImage(image)
            self.preview.configure(image=self.photo, text='')
        except PrivacyBlocked as error:
            self.status.set(error.code.replace('_', ' '))
        except Exception:
            self.status.set('Preview unavailable. No external viewer was opened.')

    def decide(self, decision):
        if self.busy:
            self.status.set('Pause and wait for the current scan before reviewing.')
            return
        try:
            self.protect()
            row = self.selected()
            self.store.decide(row['id'], decision, self.attest.get())
            self.refresh()
        except PrivacyBlocked as error:
            self.status.set(error.code.replace('_', ' '))

    def background(self, task):
        if self.busy:
            return
        self.busy = True
        self.stop.clear()
        self.hide()
        self.status.set('Working locally. Pause takes effect after the current request; each request has a timeout.')
        def run():
            store = None
            try:
                self.protect()
                store = Store(self.directory)
                result = task(store)
                self.events.put(('done', result))
            except Exception:
                self.events.put(('error', {}))
            finally:
                if store:
                    store.close()
        threading.Thread(target=run, daemon=False).start()

    def start_scan(self):
        if not self.store or self.busy:
            return
        if self.demo:
            self.status.set('Demo fixtures are already inventoried. Use the separate synthetic model probe to test inference.')
            return
        source = filedialog.askdirectory(title='Choose one local source folder')
        if source:
            namespace = str(Path(source).absolute())
            self.background(lambda store: scan(store, source, namespace, Detector(), self.stop.is_set,
                                              security_check=self.protect))

    def start_match(self):
        if not self.store or self.busy or self.demo:
            return
        source = filedialog.askdirectory(title='Choose an existing local export; no Google sign-in')
        if source:
            self.background(lambda store: {'local_exact_candidates': store.match_exact(walk_sources(source, self.stop.is_set))})

    def poll(self):
        try:
            kind, result = self.events.get_nowait()
            self.busy = False
            self.refresh()
            self.status.set(('Completed batch: ' + json.dumps(result)) if kind == 'done' else 'Operation held. Sources are unchanged.')
        except queue.Empty:
            pass
        if self.root.winfo_exists():
            self.root.after(250, self.poll)

    def close(self):
        self.stop.set()
        if self.busy:
            self.status.set('Pausing. Close again after the current request completes.')
            return
        if self.store:
            self.store.close()
        self.root.destroy()


def demo_fixture(directory):
    from PIL import Image, ImageDraw
    source = directory / 'synthetic-source'
    source.mkdir(parents=True, exist_ok=True)
    image = Image.new('RGB', (640, 400), '#e7f3ec')
    draw = ImageDraw.Draw(image)
    draw.rectangle((160, 80, 480, 260), fill='#47775a')
    draw.text((200, 300), 'HARMLESS GENERATED TEST FIXTURE', fill='#183527')
    path = source / 'synthetic-landscape.png'
    image.save(path)
    store = Store(directory / 'private-runtime')
    asset = store.inventory(path, 'synthetic-demo')
    store.record_signal(asset, 'no_signal', {'status': 'complete', 'frames': 1}, 'synthetic-result-no-inference')
    store.close()
    return directory / 'private-runtime'


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Owner-local media privacy review')
    parser.add_argument('--demo', action='store_true', help='Only generated harmless fixtures; no source picker')
    args = parser.parse_args()
    if args.demo:
        with tempfile.TemporaryDirectory(prefix='cf-media-demo-') as directory:
            runtime = demo_fixture(Path(directory))
            root = tk.Tk()
            ReviewWindow(root, runtime, demo=True)
            root.mainloop()
    else:
        directory = os.environ.get('MEDIA_PRIVACY_HOME', str(Path(os.environ.get('LOCALAPPDATA', Path.home())) / 'ChefFlowMediaPrivacy'))
        root = tk.Tk()
        ReviewWindow(root, directory)
        root.mainloop()
