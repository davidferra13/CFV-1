"""Read-only Windows isolation preflight. Does not change system settings."""
import json
import os
from pathlib import Path
import subprocess
import stat
import sys
from privacy_core import PrivacyBlocked


def require_isolation(directory):
    if os.name != 'nt':
        raise PrivacyBlocked('windows_isolation_required')
    path = Path(directory).absolute()
    try:
        for part in (path, *path.parents):
            info = part.lstat()
            if stat.S_ISLNK(info.st_mode) or getattr(info, 'st_file_attributes', 0) & 1024:
                raise PrivacyBlocked('runtime_link_blocked')
        path = path.resolve(strict=True)
    except OSError:
        raise PrivacyBlocked('runtime_directory_missing') from None
    repo = Path(__file__).resolve().parents[2]
    forbidden = [repo, Path.home() / 'Documents', Path.home() / 'Desktop']
    for key in ('OneDrive', 'OneDriveCommercial', 'OneDriveConsumer'):
        if os.environ.get(key):
            forbidden.append(Path(os.environ[key]).absolute())
    if any(path == p.resolve() or p.resolve() in path.parents for p in forbidden):
        raise PrivacyBlocked('unsynced_runtime_directory_required')
    env = dict(os.environ, CF_PRIVACY_DIRECTORY=str(path), CF_PRIVACY_PYTHON=sys.executable)
    try:
        result = subprocess.run(['powershell.exe', '-NoProfile', '-NonInteractive', '-File',
            str(Path(__file__).with_name('verify-isolation.ps1'))], env=env,
            capture_output=True, text=True, timeout=25, creationflags=0x08000000)
        status = json.loads(result.stdout)
        if result.returncode or status != {'isolated': True, 'encrypted': True, 'owner_only': True}:
            raise ValueError()
    except (OSError, ValueError, subprocess.SubprocessError):
        raise PrivacyBlocked('isolation_or_encryption_unverified') from None
