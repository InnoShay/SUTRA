"""Seeded raster artwork for SUTRA identities, independent of profile avatars."""

from __future__ import annotations

import hashlib
import io
import random
from typing import Dict, Tuple

from PIL import Image, ImageDraw, ImageFilter


ARTWORK_SIZE = 512
ARTWORK_VERSION = "SUTRA Identity Painting v1"
PALETTES = (
    ("Tidal glass", ("#102A43", "#1C6985", "#66C7C5", "#D6A76C", "#F3E9D2")),
    ("Solar bloom", ("#33234B", "#76518A", "#E2785B", "#F3BF67", "#F5E7C8")),
    ("Jade current", ("#102F2C", "#246B59", "#6CA88A", "#D5B768", "#EAE1C5")),
    ("Blue hour", ("#171D3D", "#344C85", "#6B8FC7", "#D78377", "#F1DCC8")),
    ("Orchid ink", ("#2F1E39", "#744B78", "#B576A1", "#E4A778", "#F0DCC9")),
    ("Ember field", ("#332421", "#784238", "#BF6B4D", "#E5AE65", "#F0DFC1")),
)


def _seed_value(seed: str) -> int:
    return int.from_bytes(hashlib.sha256(seed.encode("utf-8")).digest(), "big")


def artwork_traits(seed: str) -> Dict[str, str]:
    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    palette = PALETTES[digest[0] % len(PALETTES)]
    structures = ("Orbit", "Confluence", "Resonance", "Tessellation", "Current", "Horizon")
    motions = ("Ascending", "Balanced", "Radiant", "Convergent", "Expansive", "Evolving")
    return {
        "Palette": palette[0],
        "Composition": structures[digest[1] % len(structures)],
        "Motion": motions[digest[2] % len(motions)],
        "Generator": ARTWORK_VERSION,
    }


def render_identity_art(seed: str) -> bytes:
    """Render deterministic, anti-aliased abstract painting as a PNG raster."""
    rng = random.Random(_seed_value(seed))
    _, hex_palette = PALETTES[hashlib.sha256(seed.encode("utf-8")).digest()[0] % len(PALETTES)]
    colors = [tuple(bytes.fromhex(value.lstrip("#"))) for value in hex_palette]
    size = ARTWORK_SIZE

    # Build a smooth dusk-to-dawn field using raster interpolation.
    top = colors[0]
    bottom = colors[1]
    image = Image.new("RGB", (size, size))
    pixels = image.load()
    for y in range(size):
        t = y / max(1, size - 1)
        wave = 0.055 * __import__("math").sin(t * 8 + rng.random())
        for x in range(size):
            horizontal = 0.035 * __import__("math").sin(x / size * 7 + t * 3)
            blend = min(1.0, max(0.0, t + wave + horizontal))
            pixels[x, y] = tuple(int(top[i] * (1 - blend) + bottom[i] * blend) for i in range(3))

    # Soft light blooms give the card depth before the painterly strokes are laid in.
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    for index, color in enumerate(colors[2:]):
        cx = rng.randint(70, size - 70)
        cy = rng.randint(70, size - 70)
        radius = rng.randint(70, 150)
        glow_draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=(*color, 105 - index * 12))
    glow = glow.filter(ImageFilter.GaussianBlur(44))
    image = Image.alpha_composite(image.convert("RGBA"), glow)

    # Add concentric, hand-drawn-style arcs with variable weight and slight wobble.
    paint = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(paint)
    cx, cy = rng.randint(180, 332), rng.randint(180, 332)
    for ring in range(rng.randint(16, 25)):
        radius_x = rng.randint(35, 180) + ring * 2
        radius_y = int(radius_x * rng.uniform(0.64, 1.13))
        start = rng.randint(0, 300)
        extent = rng.randint(55, 305)
        color = colors[(ring + 2) % len(colors)]
        alpha = rng.randint(80, 190)
        width = rng.randint(2, 10)
        points = []
        for step in range(48):
            angle = __import__("math").radians(start + extent * step / 47)
            wobble = rng.uniform(-3.2, 3.2)
            points.append((cx + (radius_x + wobble) * __import__("math").cos(angle),
                           cy + (radius_y + wobble) * __import__("math").sin(angle)))
        draw.line(points, fill=(*color, alpha), width=width, joint="curve")

    # A few broad brush ribbons form a distinctive central movement.
    for ribbon in range(7):
        points = []
        phase = rng.uniform(0, 6.28)
        amplitude = rng.randint(34, 115)
        baseline = rng.randint(160, 380)
        for step in range(80):
            x = step * (size - 1) / 79
            y = baseline + amplitude * __import__("math").sin(step / 79 * 6.28 + phase)
            points.append((x, y))
        draw.line(
            points,
            fill=(*colors[(ribbon + 1) % len(colors)], rng.randint(36, 92)),
            width=rng.randint(3, 14),
            joint="curve",
        )

    # Fine flecks and luminous nodes make each seeded composition distinct.
    for _ in range(230):
        x, y = rng.randint(0, size - 1), rng.randint(0, size - 1)
        radius = rng.choices([1, 2, 3, 4], [48, 34, 14, 4])[0]
        color = colors[rng.randrange(1, len(colors))]
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(*color, rng.randint(45, 150)))

    for _ in range(6):
        x, y = rng.randint(45, size - 45), rng.randint(45, size - 45)
        radius = rng.randint(5, 11)
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(*colors[-1], 220))

    image = Image.alpha_composite(image, paint).convert("RGB")
    image = image.filter(ImageFilter.GaussianBlur(0.32))
    image = image.resize((384, 384), Image.Resampling.LANCZOS)
    output = io.BytesIO()
    image.save(output, format="PNG", optimize=True)
    return output.getvalue()
