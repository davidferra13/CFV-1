"""Harmless synthetic probe of the installed local model, with aggregate output only."""
import json
import time
from PIL import Image, ImageDraw
from worker import Detector

image = Image.new('RGB', (384, 256), '#ddeddf')
draw = ImageDraw.Draw(image)
draw.rectangle((80, 40, 300, 160), fill='#52845b')
draw.text((60, 200), 'SYNTHETIC LANDSCAPE TEST', fill='#142619')
start = time.monotonic()
try:
    detector = Detector()
    detector.verify_model()
    signal = detector.signal(image)
    print(json.dumps({'synthetic_only': True, 'model': detector.model, 'frames': 1,
                      'signal': signal, 'seconds': round(time.monotonic() - start, 2)}))
except Exception:
    print('{"synthetic_only":true,"status":"model_probe_failed"}')
    raise SystemExit(2)
