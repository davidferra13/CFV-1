"""All local video tracks, bounded in-memory frames and cancellable decoding."""
import json
from functools import lru_cache
import os
from pathlib import Path
import queue
import shutil
import subprocess
from decoder_environment import decoder_environment
import threading
import time
from privacy_core import PrivacyBlocked, checked_path

SAFE_CONTAINERS = 'mov,matroska,webm,avi,mpegts,mpeg,flv,ogg,mp3,wav,flac,aac,gif,image2'
FRAME_SIZE = 384
FRAME_BYTES = FRAME_SIZE * FRAME_SIZE * 3


class ScanPaused(Exception):
    pass


@lru_cache(maxsize=1)
def decoder_tools():
    paths = []
    for name in ('ffmpeg', 'ffprobe'):
        located = shutil.which(name)
        if not located:
            raise PrivacyBlocked('decoder_missing')
        # WinGet publishes executable links. Resolve software launchers once,
        # then verify and execute that same concrete binary for this process.
        paths.append(str(checked_path(Path(located).resolve(strict=True))))
    return tuple(paths)


def video_streams(path):
    _, probe = decoder_tools()
    result = subprocess.run([probe, '-v', 'error', '-protocol_whitelist', 'file,pipe',
        '-format_whitelist', SAFE_CONTAINERS, '-show_entries', 'stream=index,codec_type:stream_disposition=attached_pic',
        '-of', 'json', str(checked_path(path))], stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=20, env=decoder_environment(),
        creationflags=0x08000000 if os.name == 'nt' else 0)
    if result.returncode or len(result.stdout) > 1024 * 1024:
        raise PrivacyBlocked('video_probe_failed')
    streams = json.loads(result.stdout).get('streams', [])
    if not streams or len(streams) > 256:
        raise PrivacyBlocked('video_streams_invalid')
    videos, uninspected = [], []
    for stream in streams:
        if stream.get('codec_type') == 'video':
            videos.append(int(stream['index']))
        else:
            uninspected.append(stream.get('codec_type', 'unknown'))
    if not videos or len(videos) != len(set(videos)):
        raise PrivacyBlocked('video_streams_invalid')
    return videos, sorted(set(uninspected))


class VideoFrames:
    """Exact decoded frame indices. Resume redecodes the prefix without inference.

    Two queued frames bound memory even when inference is much slower than decode.
    Only this instance's child process is terminated on pause, timeout or close.
    """
    def __init__(self, path, stream, start, paused=lambda: False, timeout=30):
        executable, _ = decoder_tools()
        self.paused, self.timeout = paused, timeout
        self.queue, self.stop = queue.Queue(maxsize=2), threading.Event()
        self.process = subprocess.Popen([executable, '-nostdin', '-v', 'error', '-xerror',
            '-protocol_whitelist', 'file,pipe', '-format_whitelist', SAFE_CONTAINERS, '-threads', '1', '-i', str(checked_path(path)),
            '-map', f'0:{int(stream)}', '-an', '-sn', '-dn', '-vf',
            f'trim=start_frame={int(start)},scale={FRAME_SIZE}:{FRAME_SIZE}:force_original_aspect_ratio=decrease,pad={FRAME_SIZE}:{FRAME_SIZE}:(ow-iw)/2:(oh-ih)/2',
            '-fps_mode', 'passthrough', '-threads', '1', '-pix_fmt', 'rgb24',
            '-f', 'rawvideo', 'pipe:1'], stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL, bufsize=0, env=decoder_environment(),
            creationflags=0x08000000 if os.name == 'nt' else 0)
        self.reader = threading.Thread(target=self._read, daemon=True)
        self.reader.start()

    def _put(self, value):
        while not self.stop.is_set():
            try:
                self.queue.put(value, timeout=0.1)
                return
            except queue.Full:
                pass

    def _read(self):
        try:
            while not self.stop.is_set():
                data = bytearray()
                while len(data) < FRAME_BYTES:
                    block = self.process.stdout.read(FRAME_BYTES - len(data))
                    if not block:
                        break
                    data.extend(block)
                if len(data) == FRAME_BYTES:
                    self._put(('frame', bytes(data)))
                else:
                    code = self.process.wait(timeout=5)
                    self._put(('end' if not data and code == 0 else 'error', None))
                    return
        except Exception:
            self._put(('error', None))

    def __iter__(self):
        return self

    def __next__(self):
        from PIL import Image
        deadline = time.monotonic() + self.timeout
        while True:
            if self.paused():
                raise ScanPaused()
            if time.monotonic() >= deadline:
                raise PrivacyBlocked('decoder_timeout')
            try:
                kind, data = self.queue.get(timeout=0.2)
                if kind == 'end':
                    raise StopIteration
                if kind == 'error':
                    raise PrivacyBlocked('video_decode_failed')
                return Image.frombytes('RGB', (FRAME_SIZE, FRAME_SIZE), data)
            except queue.Empty:
                continue

    def close(self):
        self.stop.set()
        if self.process.poll() is None:
            self.process.kill()
        self.process.wait(timeout=5)
        self.reader.join(timeout=5)
        self.process.stdout.close()

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.close()
