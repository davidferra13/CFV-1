"""Supported owner review units and a guarded installed player. No automatic approval."""
from functools import lru_cache
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
from decoder_environment import decoder_environment
import sys
from privacy_core import PrivacyBlocked, checked_path, MAX_BUFFER
from video_frames import decoder_tools, SAFE_CONTAINERS
from worker import IMAGE_EXT, VIDEO_EXT

REVIEW_POLICY = 1
TEXT_EXT = {'.txt', '.json', '.xmp', '.csv', '.srt', '.vtt'}
AUDIO_EXT = {'.wav', '.mp3', '.m4a', '.aac', '.flac', '.ogg', '.opus'}
# Playlists and external-reference demuxers are deliberately excluded.
CONTAINERS = SAFE_CONTAINERS
TEXT_LIMIT = 1024 * 1024


@lru_cache(maxsize=1)
def player_path():
    located = shutil.which('ffplay')
    if not located:
        raise PrivacyBlocked('player_missing')
    return str(checked_path(Path(located).resolve(strict=True)))


def probe_tracks(path):
    _, executable = decoder_tools()
    result = subprocess.run([executable, '-v', 'error', '-protocol_whitelist', 'file,pipe',
        '-format_whitelist', CONTAINERS, '-show_entries',
        'stream=index,codec_type,width,height:stream_disposition=attached_pic', '-of', 'json',
        str(checked_path(path))], stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL, timeout=20, env=decoder_environment(), creationflags=0x08000000 if os.name == 'nt' else 0)
    if result.returncode or len(result.stdout) > TEXT_LIMIT:
        raise PrivacyBlocked('review_probe_failed')
    tracks = json.loads(result.stdout).get('streams', [])
    if not tracks or len(tracks) > 256 or len({s['index'] for s in tracks}) != len(tracks):
        raise PrivacyBlocked('review_tracks_invalid')
    return tracks


def read_text(path):
    path = checked_path(path)
    with path.open('rb') as handle:
        raw = handle.read(TEXT_LIMIT + 1)
    if len(raw) > TEXT_LIMIT:
        raise PrivacyBlocked('review_text_too_large')
    try:
        text = raw.decode('utf-8-sig')
        if '\x00' in text:
            raise ValueError()
        return text
    except (UnicodeError, ValueError):
        raise PrivacyBlocked('review_text_encoding_unsupported') from None


def describe_components(components):
    units = []
    def add(component, kind, stream=None, reason=None):
        body = json.dumps([component['path'], component['sha256'], kind, stream, REVIEW_POLICY])
        units.append({'id': hashlib.sha256(body.encode()).hexdigest(), 'path': component['path'],
            'sha256': component['sha256'], 'kind': kind, 'stream': stream, 'reason': reason})
    for component in components:
        path = checked_path(component['path'])
        extension = path.suffix.lower()
        try:
            if extension in IMAGE_EXT:
                from PIL import Image
                if component['size'] > MAX_BUFFER:
                    raise PrivacyBlocked('review_image_too_large')
                with Image.open(path) as image:
                    if image.width * image.height > 32_000_000:
                        raise PrivacyBlocked('review_image_too_large')
                    frames = getattr(image, 'n_frames', 1)
                    if frames > 1:
                        # Each Pillow frame gets an explicit review unit. This also
                        # covers multipage TIFF and formats FFplay cannot animate.
                        if frames > 10000:
                            raise PrivacyBlocked('review_frame_count_limit')
                        for index in range(frames):
                            add(component, 'image_frame', index)
                    else:
                        add(component, 'image')
            elif extension in TEXT_EXT:
                read_text(path)
                add(component, 'text')
            elif extension in VIDEO_EXT | AUDIO_EXT:
                for track in probe_tracks(path):
                    kind = track.get('codec_type', 'unknown')
                    if kind not in {'video', 'audio'}:
                        add(component, 'unsupported', track['index'], 'unreviewed_' + kind)
                    elif kind == 'video' and (not track.get('width') or not track.get('height') or
                            track['width'] * track['height'] > 32_000_000):
                        add(component, 'unsupported', track['index'], 'review_image_too_large')
                    else:
                        add(component, kind, track['index'])
            else:
                add(component, 'unsupported', reason='unsupported_format')
        except Exception:
            add(component, 'unsupported', reason='review_decode_or_size_limit')
    return units


def player_command(unit):
    if unit['kind'] not in {'video', 'audio'}:
        raise PrivacyBlocked('player_unit_unsupported')
    command = [player_path(), '-hide_banner', '-loglevel', 'quiet', '-nostats', '-autoexit',
        '-protocol_whitelist', 'file,pipe', '-format_whitelist', CONTAINERS,
        '-threads', '1', '-filter_threads', '1', '-noinfbuf', '-noframedrop', '-sn',
        '-window_title', 'Local private review', '-x', '960', '-y', '640']
    if unit['kind'] == 'video':
        command += ['-an', '-vst', str(int(unit['stream']))]
    else:
        command += ['-vn', '-ast', str(int(unit['stream'])), '-showmode', 'waves']
    return command + [str(checked_path(unit['path']))]


class LocalPlayer:
    def __init__(self, unit):
        # The caller must pass the same real isolation gate before this constructor.
        environment = decoder_environment()
        pinned_player = player_command(unit)[0]
        self.process = subprocess.Popen([sys.executable, str(Path(__file__).with_name('player_watchdog.py'))],
            stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            env=environment, creationflags=0x08000000 if os.name == 'nt' else 0)
        try:
            self.process.stdin.write((json.dumps({'unit': unit, 'player': pinned_player}) + '\n').encode('utf-8'))
            self.process.stdin.flush()
        except Exception:
            self.close()
            raise PrivacyBlocked('player_start_failed') from None

    def poll(self):
        return self.process.poll()

    def close(self):
        # Preserve the process handle on timeout so the owner can retry. Closing
        # the control pipe asks the watchdog to stop only its own player.
        if self.process.stdin and not self.process.stdin.closed:
            try:
                self.process.stdin.close()
            except BrokenPipeError:
                pass
        try:
            self.process.wait(timeout=6)
        except subprocess.TimeoutExpired:
            raise PrivacyBlocked('player_shutdown_pending') from None
