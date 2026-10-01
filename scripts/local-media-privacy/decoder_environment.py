"""Prevent inherited decoder settings from creating reports or redirecting I/O."""
import os


def decoder_environment():
    return {key: value for key, value in os.environ.items()
            if key.upper() not in {'FFREPORT', 'SDL_AUDIODRIVER', 'SDL_VIDEODRIVER',
                                   'SDL_AUDIO_DEVICE_NAME', 'SDL_RENDER_DRIVER', 'ALL_PROXY'}
            and not key.upper().endswith('_PROXY')}
