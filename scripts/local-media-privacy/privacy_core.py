"""Owner-local review authority. No source moves, deletes, uploads or age inference."""
from contextlib import contextmanager
import hashlib
import hmac
import json
import os
from pathlib import Path
import secrets
import sqlite3
import stat
import time
from urllib.parse import urlsplit
import uuid

SIGNALS = {'suspected_sensitive', 'no_signal', 'unknown'}
DECISIONS = {'unreviewed', 'private', 'removal_review', 'approved_local_archive'}
MAX_BUFFER = 64 * 1024 * 1024


class PrivacyBlocked(RuntimeError):
    def __init__(self, code='review_required'):
        self.code = code
        super().__init__(code)


def local_endpoint(value):
    try:
        url = urlsplit(value)
        if (url.scheme != 'http' or url.hostname not in {'127.0.0.1', '::1', 'localhost'}
                or url.username or url.password or url.path not in {'', '/'}
                or url.query or url.fragment or not url.port):
            raise ValueError()
    except ValueError:
        raise PrivacyBlocked('local_endpoint_required') from None
    return value.rstrip('/')


def parse_signal(raw):
    try:
        data = json.loads(raw)
        if not isinstance(data, dict) or set(data) != {'signal'}:
            return 'unknown'
        return data['signal'] if data['signal'] in SIGNALS else 'unknown'
    except (TypeError, ValueError):
        return 'unknown'


def checked_path(value):
    path = Path(os.path.abspath(value))
    # Refuse junctions, symlinks and reparse points in any source component.
    for part in (path, *path.parents):
        info = part.lstat()
        if stat.S_ISLNK(info.st_mode) or getattr(info, 'st_file_attributes', 0) & 1024:
            raise PrivacyBlocked('source_link_blocked')
    if not path.is_file():
        raise PrivacyBlocked('not_regular_file')
    return path


def fingerprint(value):
    path = checked_path(value)
    before = path.stat()
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(block)
        after = os.fstat(handle.fileno())
    current = path.stat()
    # Python 3.12 on Windows reports creation time differently through stat/fstat.
    # It is not a content-change indicator there; identity, size and mtime remain checked.
    stamp = lambda s: (s.st_dev, s.st_ino, s.st_size, s.st_mtime_ns,
                       s.st_ctime_ns if os.name != 'nt' else 0)
    if stamp(before) != stamp(after) or stamp(after) != stamp(current):
        raise PrivacyBlocked('source_changing')
    return digest.hexdigest(), before.st_size


def bundle(value):
    path = checked_path(value)
    # Includes paired movies and same-stem sidecars, including Takeout sidecars.
    prefix = path.stem.casefold()
    members = [p for p in path.parent.iterdir()
               if p.name.casefold() == path.name.casefold()
               or p.stem.casefold() == prefix
               or p.name.casefold().startswith(path.name.casefold() + '.')]
    rows = []
    for member in sorted(members, key=lambda p: p.name.casefold()):
        if not member.is_file():
            raise PrivacyBlocked('unsupported_companion')
        digest, size = fingerprint(member)
        rows.append({'path': str(member), 'sha256': digest, 'size': size})
    encoded = json.dumps(rows, sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(encoded.encode()).hexdigest(), rows


class Store:
    """SQLite and signing key belong only in an encrypted, unsynced local directory.

    The trusted entrypoints enforce OS isolation. This class is also used by
    synthetic tests. Same-user malware or code changes are outside this boundary.
    """
    def __init__(self, directory, readonly=False):
        self.directory = Path(directory).absolute()
        self.readonly = readonly
        database = self.directory / 'review.sqlite3'
        key_path = self.directory / 'authority.key'
        if readonly:
            if not database.is_file() or not key_path.is_file():
                raise PrivacyBlocked('review_store_missing')
        else:
            self.directory.mkdir(parents=True, exist_ok=True, mode=0o700)
            os.chmod(self.directory, 0o700)
            if not key_path.exists():
                fd = os.open(key_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
                with os.fdopen(fd, 'wb') as handle:
                    handle.write(secrets.token_bytes(32))
                    handle.flush()
                    os.fsync(handle.fileno())
        self.key = key_path.read_bytes()
        if len(self.key) != 32:
            raise PrivacyBlocked('review_key_invalid')
        self.db = sqlite3.connect(database.as_uri() + '?mode=ro', uri=True, timeout=10) if readonly else sqlite3.connect(database, timeout=10)
        self.db.row_factory = sqlite3.Row
        if not readonly:
            self.db.executescript('''
                PRAGMA journal_mode=WAL;
                PRAGMA synchronous=FULL;
                CREATE TABLE IF NOT EXISTS assets (
                  id TEXT PRIMARY KEY, path TEXT UNIQUE NOT NULL, namespace TEXT NOT NULL,
                  bundle_hash TEXT NOT NULL, components TEXT NOT NULL,
                  signal TEXT NOT NULL DEFAULT 'unknown', coverage TEXT NOT NULL DEFAULT '{}',
                  model TEXT, decision TEXT NOT NULL DEFAULT 'unreviewed',
                  revision INTEGER NOT NULL DEFAULT 0, signature TEXT, reviewed_at REAL,
                  inspected_at REAL, updated_at REAL NOT NULL);
                CREATE TABLE IF NOT EXISTS decisions (
                  id INTEGER PRIMARY KEY, asset_id TEXT, revision INTEGER, decision TEXT,
                  bundle_hash TEXT, reviewed_at REAL);
                CREATE TABLE IF NOT EXISTS matches (
                  asset_id TEXT, candidate_path TEXT, matched_at REAL,
                  PRIMARY KEY (asset_id, candidate_path));
                CREATE TABLE IF NOT EXISTS scan_state (
                  key TEXT PRIMARY KEY, value TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS checkpoints (
                  asset_id TEXT PRIMARY KEY, bundle_hash TEXT NOT NULL,
                  model TEXT NOT NULL, coverage TEXT NOT NULL, signal TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS match_reviews (
                  asset_id TEXT, candidate_path TEXT, sha256 TEXT NOT NULL,
                  status TEXT NOT NULL, reviewed_at REAL,
                  PRIMARY KEY (asset_id, candidate_path));
            ''')
            os.chmod(database, 0o600)

    def close(self):
        self.db.close()

    def inventory(self, value, namespace):
        path = checked_path(value)
        digest, components = bundle(path)
        row = self.db.execute('SELECT * FROM assets WHERE path=?', (str(path),)).fetchone()
        if row and row['namespace'] != namespace:
            raise PrivacyBlocked('source_namespace_conflict')
        if row and row['bundle_hash'] == digest:
            return row['id']
        asset_id = row['id'] if row else str(uuid.uuid4())
        with self.db:
            self.db.execute('DELETE FROM checkpoints WHERE asset_id=?', (asset_id,))
            self.db.execute('DELETE FROM match_reviews WHERE asset_id=?', (asset_id,))
            self.db.execute('''INSERT INTO assets(id,path,namespace,bundle_hash,components,updated_at)
                VALUES(?,?,?,?,?,?) ON CONFLICT(path) DO UPDATE SET
                bundle_hash=excluded.bundle_hash, components=excluded.components,
                decision='unreviewed',signature=NULL,signal='unknown',coverage='{}',
                inspected_at=NULL,revision=assets.revision+1,updated_at=excluded.updated_at''',
                (asset_id, str(path), namespace, digest, json.dumps(components), time.time()))
        return asset_id

    def setting(self, key, value=None):
        if value is not None:
            with self.db:
                self.db.execute('INSERT OR REPLACE INTO scan_state VALUES(?,?)', (key, json.dumps(value)))
        row = self.db.execute('SELECT value FROM scan_state WHERE key=?', (key,)).fetchone()
        return json.loads(row[0]) if row else None

    def load_checkpoint(self, asset_id, model):
        row = self.row(asset_id)
        saved = self.db.execute('SELECT * FROM checkpoints WHERE asset_id=?', (asset_id,)).fetchone()
        if saved and saved['bundle_hash'] == row['bundle_hash'] and saved['model'] == model:
            return json.loads(saved['coverage'])
        return None

    def save_checkpoint(self, asset_id, expected_bundle, model, signal, coverage):
        # Inventory hashes the bundle on every resume. Per-frame writes do not
        # rehash large videos; the worker checks file identity between frames.
        if self.row(asset_id)['bundle_hash'] != expected_bundle:
            raise PrivacyBlocked('stale_checkpoint')
        with self.db:
            self.db.execute('INSERT OR REPLACE INTO checkpoints VALUES(?,?,?,?,?)',
                (asset_id, expected_bundle, model, json.dumps(coverage), signal))

    def reset_inspection(self, asset_id):
        self.row(asset_id)
        with self.db:
            self.db.execute('DELETE FROM checkpoints WHERE asset_id=?', (asset_id,))
            self.db.execute("UPDATE assets SET inspected_at=NULL,signal='unknown',coverage='{}',model=NULL WHERE id=?", (asset_id,))

    def row(self, asset_id):
        row = self.db.execute('SELECT * FROM assets WHERE id=?', (asset_id,)).fetchone()
        if row is None:
            raise PrivacyBlocked('asset_missing')
        return row

    def _sign(self, row, decision, revision):
        body = json.dumps([row['id'], row['path'], row['namespace'], row['bundle_hash'], decision, revision])
        return hmac.new(self.key, body.encode(), hashlib.sha256).hexdigest()

    def decide(self, asset_id, decision, complete_review=False):
        if decision not in DECISIONS:
            raise PrivacyBlocked('invalid_decision')
        if decision == 'approved_local_archive' and not complete_review:
            raise PrivacyBlocked('complete_human_review_required')
        row = self.row(asset_id)
        digest, _ = bundle(row['path'])
        if digest != row['bundle_hash']:
            raise PrivacyBlocked('stale_review')
        revision = row['revision'] + 1
        signature = self._sign(row, decision, revision)
        now = time.time()
        with self.db:
            self.db.execute('UPDATE assets SET decision=?,revision=?,signature=?,reviewed_at=? WHERE id=?',
                            (decision, revision, signature, now, asset_id))
            self.db.execute('INSERT INTO decisions(asset_id,revision,decision,bundle_hash,reviewed_at) VALUES(?,?,?,?,?)',
                            (asset_id, revision, decision, digest, now))

    def record_signal(self, asset_id, signal, coverage, model):
        if signal not in SIGNALS:
            signal = 'unknown'
        row = self.row(asset_id)
        digest, _ = bundle(row['path'])
        if digest != row['bundle_hash']:
            raise PrivacyBlocked('source_changed_during_inspection')
        with self.db:
            self.db.execute('UPDATE assets SET signal=?,coverage=?,model=?,inspected_at=? WHERE id=?',
                            (signal, json.dumps(coverage), model, time.time(), asset_id))

    def authorize(self, value):
        path = checked_path(value)
        row = self.db.execute('SELECT * FROM assets WHERE path=?', (str(path),)).fetchone()
        if not row or row['decision'] != 'approved_local_archive':
            raise PrivacyBlocked()
        expected = self._sign(row, row['decision'], row['revision'])
        if not hmac.compare_digest(row['signature'] or '', expected):
            raise PrivacyBlocked('invalid_approval')
        digest, _ = bundle(path)
        if digest != row['bundle_hash']:
            if not self.readonly:
                with self.db:
                    self.db.execute("UPDATE assets SET decision='unreviewed', signature=NULL, revision=revision+1 WHERE id=?", (row['id'],))
            raise PrivacyBlocked('stale_approval')
        return dict(row)

    def approved_bytes(self, value):
        row = self.authorize(value)
        path = checked_path(value)
        if path.stat().st_size > MAX_BUFFER:
            raise PrivacyBlocked('consumer_size_limit')
        with path.open('rb') as handle:
            data = handle.read(MAX_BUFFER + 1)
        own = next(c for c in json.loads(row['components']) if c['path'] == str(path))
        if len(data) > MAX_BUFFER or hashlib.sha256(data).hexdigest() != own['sha256']:
            raise PrivacyBlocked('stale_approval')
        after = self.authorize(value)
        if after['revision'] != row['revision']:
            raise PrivacyBlocked('review_changed')
        return data

    def receipt(self, value, text):
        row = self.authorize(value)
        body = json.dumps([row['id'], row['bundle_hash'], row['revision'], text], separators=(',', ':'))
        return hmac.new(self.key, body.encode(), hashlib.sha256).hexdigest()

    def verify_receipt(self, value, text, signature):
        if not isinstance(signature, str) or not hmac.compare_digest(self.receipt(value, text), signature):
            raise PrivacyBlocked('derived_provenance_missing')

    def counts(self):
        result = dict(inventoried=0, inspected=0, complete=0, partial=0, unsupported=0, failed=0,
                      suspected_sensitive=0, no_signal=0, unknown=0, human_approved=0,
                      private=0, removal_review=0, unreviewed=0)
        for row in self.db.execute('SELECT signal,coverage,decision,inspected_at FROM assets'):
            result['inventoried'] += 1
            result[row['signal']] += 1
            result['human_approved' if row['decision'] == 'approved_local_archive' else row['decision']] += 1
            if row['inspected_at'] is not None:
                result['inspected'] += 1
                status = json.loads(row['coverage']).get('status', 'failed')
                result[status if status in {'complete', 'partial', 'unsupported', 'failed'} else 'failed'] += 1
        return result

    def match_exact(self, candidates):
        """Local export candidates only. Never a live Google ID or deletion instruction."""
        hashes = {}
        for row in self.db.execute('SELECT id,path,components FROM assets'):
            own = next(c for c in json.loads(row['components']) if c['path'] == row['path'])
            if fingerprint(row['path'])[0] != own['sha256']:
                continue
            hashes.setdefault(own['sha256'], []).append((row['id'], row['path']))
        count = 0
        for candidate in candidates:
            digest, _ = fingerprint(candidate)
            for asset_id, original in hashes.get(digest, []):
                if checked_path(candidate) == checked_path(original):
                    continue
                with self.db:
                    self.db.execute('INSERT OR REPLACE INTO matches VALUES(?,?,?)', (asset_id, str(candidate), time.time()))
                    self.db.execute('''INSERT INTO match_reviews VALUES(?,?,?,?,NULL)
                        ON CONFLICT(asset_id,candidate_path) DO UPDATE SET sha256=excluded.sha256,
                        status=CASE WHEN match_reviews.sha256=excluded.sha256 THEN match_reviews.status ELSE 'candidate' END''',
                        (asset_id, str(candidate), digest, 'candidate'))
                count += 1
        return count

    def match_candidates(self, asset_id):
        return self.db.execute('SELECT * FROM match_reviews WHERE asset_id=? ORDER BY candidate_path', (asset_id,)).fetchall()

    def confirm_match(self, asset_id, candidate):
        match = self.db.execute('SELECT * FROM match_reviews WHERE asset_id=? AND candidate_path=?', (asset_id, candidate)).fetchone()
        if not match:
            raise PrivacyBlocked('match_missing')
        row = self.row(asset_id)
        try:
            current, _ = bundle(row['path'])
            valid = current == row['bundle_hash'] and fingerprint(row['path'])[0] == match['sha256'] and fingerprint(candidate)[0] == match['sha256']
        except (OSError, PrivacyBlocked):
            valid = False
        with self.db:
            self.db.execute('UPDATE match_reviews SET status=?,reviewed_at=? WHERE asset_id=? AND candidate_path=?',
                ('confirmed' if valid else 'stale', time.time(), asset_id, candidate))
        if not valid:
            raise PrivacyBlocked('match_changed')

    @contextmanager
    def worker_lock(self):
        lock = self.directory / 'worker.lock'
        handle = lock.open('a+b')
        try:
            if os.name == 'nt':
                import msvcrt
                handle.write(b'0')
                handle.flush()
                handle.seek(0)
                msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            handle.close()
            raise PrivacyBlocked('worker_already_running') from None
        try:
            yield
        finally:
            handle.close()
