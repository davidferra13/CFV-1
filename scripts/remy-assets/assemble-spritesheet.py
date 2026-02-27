#!/usr/bin/env python3
"""
Assemble individual Remy frames into a sprite sheet grid.

Usage:
    python assemble-spritesheet.py <input_dir> <output_file> --cols 4 --cell 420

Takes a directory of transparent PNGs (numbered/sorted by filename) and
assembles them into a single sprite sheet grid for the animation system.

The output matches the format expected by RemySpriteAnimator:
  - Fixed cell size per frame
  - Left-to-right, top-to-bottom order
  - No label text (labelOffset = 0)
"""

import sys
import os
import argparse
import math
from PIL import Image


def assemble(input_dir: str, output_file: str, cols: int, cell_size: int):
    """Assemble individual frames into a sprite sheet."""
    # Find all PNG files, sorted by name
    files = sorted([
        f for f in os.listdir(input_dir)
        if f.lower().endswith('.png')
    ])

    if not files:
        print(f'No PNG files found in {input_dir}')
        sys.exit(1)

    frame_count = len(files)
    rows = math.ceil(frame_count / cols)

    print(f'Assembling {frame_count} frames into {cols}x{rows} grid ({cell_size}px cells)...')

    # Create the sprite sheet canvas
    sheet_width = cols * cell_size
    sheet_height = rows * cell_size
    sheet = Image.new('RGBA', (sheet_width, sheet_height), (0, 0, 0, 0))

    for i, f in enumerate(files):
        col = i % cols
        row = i // cols
        x = col * cell_size
        y = row * cell_size

        frame = Image.open(os.path.join(input_dir, f)).convert('RGBA')

        # Resize to cell size if needed
        if frame.size != (cell_size, cell_size):
            frame.thumbnail((cell_size, cell_size), Image.LANCZOS)
            # Center in cell
            canvas = Image.new('RGBA', (cell_size, cell_size), (0, 0, 0, 0))
            fx = (cell_size - frame.width) // 2
            fy = (cell_size - frame.height) // 2
            canvas.paste(frame, (fx, fy), frame)
            frame = canvas

        sheet.paste(frame, (x, y), frame)
        print(f'  [{row},{col}] {f}')

    sheet.save(output_file, 'PNG', optimize=True)
    file_size_kb = os.path.getsize(output_file) / 1024
    print(f'Saved: {output_file} ({sheet_width}x{sheet_height}, {file_size_kb:.0f} KB)')
    print(f'Manifest values: cols={cols}, rows={rows}, cellWidth={cell_size}, cellHeight={cell_size}, frameCount={frame_count}')


def main():
    parser = argparse.ArgumentParser(description='Assemble Remy frames into a sprite sheet')
    parser.add_argument('input_dir', help='Directory with individual frame PNGs')
    parser.add_argument('output_file', help='Output sprite sheet path (e.g., remy-body-idle.png)')
    parser.add_argument('--cols', type=int, default=4, help='Number of columns in the grid (default: 4)')
    parser.add_argument('--cell', type=int, default=420, help='Cell size in px (default: 420)')
    args = parser.parse_args()

    if not os.path.isdir(args.input_dir):
        print(f'Input directory not found: {args.input_dir}')
        sys.exit(1)

    assemble(args.input_dir, args.output_file, args.cols, args.cell)


if __name__ == '__main__':
    main()
