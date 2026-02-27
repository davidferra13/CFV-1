#!/usr/bin/env python3
"""
Remove green-screen (#00FF00) backgrounds from Remy sprite frames.

Usage:
    python remove-greenscreen.py <input_dir> <output_dir> [--tolerance 30] [--size 420]

Takes individual frame PNGs/JPGs with green (#00FF00) backgrounds,
removes the green, outputs transparent PNGs at the target size.

Tolerance: how far from pure #00FF00 a pixel can be and still be removed.
  - 0 = only exact #00FF00
  - 30 = default, handles anti-aliasing edges and slight color variation
  - 60 = aggressive, for messy green screens with sparkle artifacts
"""

import sys
import os
import argparse
from PIL import Image
import numpy as np


def remove_green(img: Image.Image, tolerance: int = 30) -> Image.Image:
    """Remove green-screen pixels and return RGBA image with transparency."""
    rgba = img.convert('RGBA')
    data = np.array(rgba, dtype=np.float32)

    # Target: pure green #00FF00 = (0, 255, 0)
    r, g, b, a = data[:, :, 0], data[:, :, 1], data[:, :, 2], data[:, :, 3]

    # Distance from pure green in RGB space
    dist = np.sqrt((r - 0) ** 2 + (g - 255) ** 2 + (b - 0) ** 2)

    # Hard mask: pixels within tolerance are fully transparent
    hard_mask = dist < tolerance

    # Soft edge: pixels in the transition zone get partial transparency
    # This handles anti-aliased edges smoothly
    edge_zone = tolerance * 1.5
    soft_mask = (dist >= tolerance) & (dist < edge_zone)
    edge_alpha = ((dist - tolerance) / (edge_zone - tolerance)).clip(0, 1)

    # Apply masks
    new_alpha = a.copy()
    new_alpha[hard_mask] = 0
    new_alpha[soft_mask] = (edge_alpha[soft_mask] * a[soft_mask])

    # De-spill: reduce green tint on semi-transparent edge pixels
    # This prevents green fringing on character edges
    spill_mask = soft_mask & (g > r) & (g > b)
    if np.any(spill_mask):
        avg_rb = (r[spill_mask] + b[spill_mask]) / 2
        data[:, :, 1][spill_mask] = np.minimum(g[spill_mask], avg_rb * 1.2)

    data[:, :, 3] = new_alpha
    return Image.fromarray(data.astype(np.uint8), 'RGBA')


def process_image(input_path: str, output_path: str, tolerance: int, target_size: int | None):
    """Process a single image: remove green, resize, save as PNG."""
    img = Image.open(input_path)
    result = remove_green(img, tolerance)

    if target_size:
        # Resize to fit within target_size x target_size, preserving aspect ratio
        result.thumbnail((target_size, target_size), Image.LANCZOS)

        # Center on a square canvas
        canvas = Image.new('RGBA', (target_size, target_size), (0, 0, 0, 0))
        x = (target_size - result.width) // 2
        y = (target_size - result.height) // 2
        canvas.paste(result, (x, y), result)
        result = canvas

    result.save(output_path, 'PNG')
    return result.size


def main():
    parser = argparse.ArgumentParser(description='Remove green-screen from Remy sprite frames')
    parser.add_argument('input_dir', help='Directory with green-screen images')
    parser.add_argument('output_dir', help='Directory for transparent PNGs')
    parser.add_argument('--tolerance', type=int, default=30,
                        help='Color distance tolerance (0=exact, 30=default, 60=aggressive)')
    parser.add_argument('--size', type=int, default=None,
                        help='Target square size in px (e.g., 420). Omit to keep original size.')
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)

    # Find all image files
    extensions = {'.png', '.jpg', '.jpeg', '.webp'}
    files = sorted([
        f for f in os.listdir(args.input_dir)
        if os.path.splitext(f)[1].lower() in extensions
    ])

    if not files:
        print(f'No image files found in {args.input_dir}')
        sys.exit(1)

    print(f'Processing {len(files)} images (tolerance={args.tolerance}, size={args.size or "original"})...')

    for f in files:
        input_path = os.path.join(args.input_dir, f)
        output_name = os.path.splitext(f)[0] + '.png'
        output_path = os.path.join(args.output_dir, output_name)

        size = process_image(input_path, output_path, args.tolerance, args.size)
        print(f'  {f} -> {output_name} ({size[0]}x{size[1]})')

    print(f'Done! {len(files)} images saved to {args.output_dir}')


if __name__ == '__main__':
    main()
