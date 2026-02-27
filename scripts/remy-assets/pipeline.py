#!/usr/bin/env python3
"""
Remy Asset Pipeline — end-to-end: green-screen removal → sprite sheet assembly.

Usage:
    python pipeline.py <animation_name> <input_dir> [--tolerance 30] [--cell 420]

Example:
    python pipeline.py idle C:/Users/david/Videos/RemyFrames/idle
    python pipeline.py wave C:/Users/david/Videos/RemyFrames/wave --cell 420

This will:
  1. Remove green-screen from all images in <input_dir>
  2. Save transparent PNGs to a temp folder
  3. Assemble into a sprite sheet at public/images/remy/sprites/remy-body-<name>.png
  4. Print the manifest entry to paste into remy-sprite-manifests.ts

Known animation names and their expected frame counts:
  idle       - 6 frames  (3x2 grid)
  walk       - 5 frames  (5x1 grid)
  wave       - 6 frames  (3x2 grid)
  think      - 3 frames  (3x1 grid)
  whisk      - 4 frames  (4x1 grid)
  celebrate  - 8 frames  (4x2 grid)
  sleep      - 4 frames  (2x2 grid)
  error      - 3 frames  (3x1 grid)
  lipsync    - 15 frames (4x4 grid) — the mouth shapes for lip-sync
"""

import sys
import os
import math
import argparse
import tempfile

# Add this script's directory to path so we can import siblings
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from remove_greenscreen import process_image
from assemble_spritesheet import assemble as assemble_sheet


# Grid layouts for each animation type
GRID_CONFIGS = {
    'idle':      {'cols': 3, 'expected_frames': 6},
    'walk':      {'cols': 5, 'expected_frames': 5},
    'wave':      {'cols': 3, 'expected_frames': 6},
    'think':     {'cols': 3, 'expected_frames': 3},
    'whisk':     {'cols': 4, 'expected_frames': 4},
    'celebrate': {'cols': 4, 'expected_frames': 8},
    'sleep':     {'cols': 2, 'expected_frames': 4},
    'error':     {'cols': 3, 'expected_frames': 3},
    'lipsync':   {'cols': 4, 'expected_frames': 15},
}


def main():
    parser = argparse.ArgumentParser(description='Remy asset pipeline: greenscreen → sprite sheet')
    parser.add_argument('name', help='Animation name (idle, walk, wave, think, whisk, celebrate, sleep, error, lipsync)')
    parser.add_argument('input_dir', help='Directory with raw generated frames')
    parser.add_argument('--tolerance', type=int, default=30, help='Green-screen tolerance (default: 30)')
    parser.add_argument('--cell', type=int, default=420, help='Cell size in px (default: 420)')
    args = parser.parse_args()

    config = GRID_CONFIGS.get(args.name)
    if not config:
        print(f'Unknown animation: {args.name}')
        print(f'Known names: {", ".join(GRID_CONFIGS.keys())}')
        sys.exit(1)

    # Paths
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    sprite_dir = os.path.join(project_root, 'public', 'images', 'remy', 'sprites')
    if args.name == 'lipsync':
        output_file = os.path.join(project_root, 'public', 'images', 'remy', 'remy-sprite.png')
    else:
        output_file = os.path.join(sprite_dir, f'remy-body-{args.name}.png')

    os.makedirs(sprite_dir, exist_ok=True)

    # Find input files
    extensions = {'.png', '.jpg', '.jpeg', '.webp'}
    files = sorted([
        f for f in os.listdir(args.input_dir)
        if os.path.splitext(f)[1].lower() in extensions
    ])

    if not files:
        print(f'No image files found in {args.input_dir}')
        sys.exit(1)

    expected = config['expected_frames']
    if len(files) != expected:
        print(f'Warning: expected {expected} frames for "{args.name}", found {len(files)}')
        print(f'Proceeding with {len(files)} frames...')

    # Step 1: Remove green-screen
    print(f'\n=== Step 1: Removing green-screen (tolerance={args.tolerance}) ===')
    with tempfile.TemporaryDirectory() as tmp_dir:
        for f in files:
            input_path = os.path.join(args.input_dir, f)
            output_name = os.path.splitext(f)[0] + '.png'
            output_path = os.path.join(tmp_dir, output_name)
            size = process_image(input_path, output_path, args.tolerance, args.cell)
            print(f'  {f} -> {output_name} ({size[0]}x{size[1]})')

        # Step 2: Assemble sprite sheet
        cols = config['cols']
        rows = math.ceil(len(files) / cols)
        print(f'\n=== Step 2: Assembling {len(files)} frames into {cols}x{rows} grid ===')
        assemble_sheet(tmp_dir, output_file, cols, args.cell)

    # Step 3: Print manifest entry
    cols = config['cols']
    rows = math.ceil(len(files) / cols)
    rel_path = os.path.relpath(output_file, project_root).replace('\\', '/')
    sheet_name = f'remy-body-{args.name}' if args.name != 'lipsync' else 'remy-lipsync'
    fps_map = {'idle': 4, 'walk': 12, 'wave': 12, 'think': 6, 'whisk': 10, 'celebrate': 12, 'sleep': 2, 'error': 4, 'lipsync': 12}
    loop_map = {'idle': True, 'walk': False, 'wave': False, 'think': True, 'whisk': True, 'celebrate': False, 'sleep': True, 'error': False, 'lipsync': False}

    print(f'\n=== Manifest entry for remy-sprite-manifests.ts ===')
    print(f"""
  '{sheet_name}': {{
    name: '{sheet_name}',
    path: '/{rel_path}',
    cols: {cols},
    rows: {rows},
    cellWidth: {args.cell},
    cellHeight: {args.cell},
    frameCount: {len(files)},
    fps: {fps_map.get(args.name, 8)},
    loop: {'true' if loop_map.get(args.name, False) else 'false'},
    labelOffset: 0,
    available: true,
  }},
""")

    print('Done! Update remy-sprite-manifests.ts with the entry above.')
    print(f'Then flip available: true to enable the animation.')


if __name__ == '__main__':
    main()
