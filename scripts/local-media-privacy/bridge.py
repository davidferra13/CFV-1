"""Private IPC over inherited pipes. Never invoke this on private paths remotely."""
import base64
import json
import os
from pathlib import Path
import sys
from privacy_core import Store, PrivacyBlocked
from security import require_isolation


def main():
    directory = os.environ.get('MEDIA_PRIVACY_HOME')
    if not directory:
        raise PrivacyBlocked('review_store_not_configured')
    require_isolation(directory)
    request = json.loads(sys.stdin.read(2 * 1024 * 1024))
    if not (Path(directory) / 'review.sqlite3').is_file() or not (Path(directory) / 'authority.key').is_file():
        raise PrivacyBlocked('review_store_missing')
    store = Store(directory)
    try:
        path = request.get('path', '')
        operation = request.get('operation')
        if operation == 'runtime':
            result = {'ok': True}
        elif operation == 'read':
            data = store.approved_bytes(path)
            result = {'ok': True, 'data': base64.b64encode(data).decode('ascii')}
        elif operation == 'check':
            store.authorize(path)
            result = {'ok': True}
        elif operation == 'seal':
            result = {'ok': True, 'receipt': store.receipt(path, request['text'])}
        elif operation == 'verify':
            store.verify_receipt(path, request['text'], request.get('receipt'))
            result = {'ok': True}
        else:
            raise PrivacyBlocked('unknown_operation')
        print(json.dumps(result))
    finally:
        store.close()


if __name__ == '__main__':
    try:
        main()
    except Exception:
        # Paths, hashes, database errors and source content must never reach diagnostics.
        print('{"ok":false,"error":"media_review_required"}')
        sys.exit(2)
