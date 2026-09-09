"""Test-only IPC driver. Creates its own harmless file; never accepts media paths."""
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts/local-media-privacy'))
from privacy_core import Store

root = Path(sys.argv[1]).resolve(strict=True)
assert root.name.startswith('cf-ipc-fixture-')
source, runtime = root / 'generated.txt', root / 'runtime'
action = sys.argv[2]
if action == 'create':
    source.write_bytes(b'HARMLESS IPC FIXTURE\n')
    store = Store(runtime)
    store.inventory(source, 'synthetic-only')
    store.close()
elif action in {'approve', 'revoke'}:
    assert source.read_bytes() == b'HARMLESS IPC FIXTURE\n'
    store = Store(runtime)
    asset = store.inventory(source, 'synthetic-only')
    if action == 'approve':
        for unit in store.review_plan(asset):
            store.mark_review_unit(asset, unit['id'])
            store.mark_review_unit(asset, unit['id'], confirmed=True)
    store.decide(asset, 'approved_local_archive' if action == 'approve' else 'private', complete_review=True)
    store.close()
elif action == 'bridge':
    # Exercise production pipe handling and authority, isolating only the OS gate.
    # This is explicitly NOT evidence of real-machine isolation.
    assert source.read_bytes() == b'HARMLESS IPC FIXTURE\n'
    import bridge
    def fixture_runtime(directory):
        assert Path(directory).resolve(strict=True) == runtime
    bridge.require_isolation = fixture_runtime
    try:
        bridge.main()
    except Exception:
        print('{"ok":false,"error":"media_review_required"}')
        raise SystemExit(2)
else:
    raise SystemExit(2)
