"""Own one local player; loss of the parent's pipe stops playback."""
import json
import subprocess
from decoder_environment import decoder_environment
import sys
import threading
import time
from review_media import player_command


def main():
    raw = sys.stdin.buffer.readline(128 * 1024)
    if not raw.endswith(b'\n'):
        return 2
    request = json.loads(raw)
    command = player_command(request['unit'])
    if command[0] != request['player']:
        return 2
    stopped = threading.Event()
    def watch_parent():
        # The parent keeps the pipe open without sending anything else.
        sys.stdin.buffer.read(1)
        stopped.set()
    threading.Thread(target=watch_parent, daemon=True).start()
    if stopped.is_set():
        return 2
    process = subprocess.Popen(command, stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env=decoder_environment())
    try:
        while process.poll() is None:
            if stopped.wait(0.1):
                return 2
        return process.returncode
    finally:
        if process.poll() is None:
            process.terminate()
        try:
            process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=2)


if __name__ == '__main__':
    try:
        code = main()
    except Exception:
        code = 2
    # os._exit avoids waiting for a daemon thread reading an open parent pipe.
    import os
    os._exit(code if isinstance(code, int) and 0 <= code <= 255 else 2)
