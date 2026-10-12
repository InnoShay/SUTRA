"""Seeded raster artwork for SUTRA identities, independent of profile avatars.
Implements Vector Flow Fields & Sacred Geometry with deterministic generative titles.
"""

from __future__ import annotations

import hashlib
import io
import math
import random
from typing import Dict, Tuple

from PIL import Image, ImageDraw, ImageFilter


ARTWORK_SIZE = 512
EXPORT_SIZE = 384
ARTWORK_VERSION = "SUTRA Identity Painting v1"

PALETTES: Tuple[Tuple[str, Tuple[str, ...]], ...] = (
    ("Nalanda Gold", ("#0F172A", "#1E293B", "#D97706", "#F59E0B", "#FEF3C7")),
    ("Tidal Glass", ("#0C1E28", "#164E63", "#06B6D4", "#67E8F9", "#ECFEFF")),
    ("Varanasi Twilight", ("#1E1B4B", "#3730A3", "#818CF8", "#F43F5E", "#FFF1F2")),
    ("Jade Current", ("#062419", "#065F46", "#10B981", "#6EE7B7", "#ECFDF5")),
    ("Solar Bloom", ("#2E1065", "#6B21A8", "#C084FC", "#F59E0B", "#FFFBEB")),
    ("Ember Field", ("#29130D", "#7C2D12", "#EA580C", "#FDBA74", "#FFF7ED")),
    ("Kashmir Azure", ("#0B192C", "#1E3E62", "#007EA7", "#93C5FD", "#F0F9FF")),
    ("Orchid Mist", ("#26152B", "#581C87", "#A855F7", "#F472B6", "#FDF2F8")),
)

PREFIXES = (
    "Harmonic", "Luminous", "Transcendental", "Solar", "Astral",
    "Ethereal", "Resonant", "Vibrant", "Celestial", "Prismatic",
    "Serene", "Infinite"
)
MOTIFS = (
    "Confluence", "Resonance", "Orbit", "Symphony", "Cadence",
    "Current", "Meridian", "Solitude", "Genesis", "Horizon",
    "Convergence", "Nexus"
)
PREPOSITIONS = ("in", "over", "of", "across", "through")
CADENCES = ("I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "XII")


def _seed_value(seed: str) -> int:
    return int.from_bytes(hashlib.sha256(seed.encode("utf-8")).digest(), "big")


def artwork_title(seed: str) -> str:
    """
    Deterministically generates a poetic, permanent artwork title from the 256-bit seed.
    Example: 'Solar Current through Tidal Glass · IV'
    """
    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    p_idx = digest[0] % len(PALETTES)
    pal_name = PALETTES[p_idx][0]
    prefix = PREFIXES[digest[1] % len(PREFIXES)]
    motif = MOTIFS[digest[2] % len(MOTIFS)]
    prep = PREPOSITIONS[digest[3] % len(PREPOSITIONS)]
    cadence = CADENCES[digest[4] % len(CADENCES)]
    return f"{prefix} {motif} {prep} {pal_name} · {cadence}"


def artwork_traits(seed: str) -> Dict[str, str]:
    """Generates deterministic ERC-721 token traits and UI metadata."""
    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    palette = PALETTES[digest[0] % len(PALETTES)]
    structures = ("Vector Flow Field", "Sacred Golden Spiral", "Harmonic Lattice", "Confluent Stream", "Orbital Field")
    motions = ("Harmonic Drift", "Centripetal Momentum", "Ascending Cascade", "Radial Emission", "Vortex Flow")
    
    return {
        "Artwork Title": artwork_title(seed),
        "Palette": palette[0],
        "Composition": structures[digest[1] % len(structures)],
        "Motion": motions[digest[2] % len(motions)],
        "Geometry": "Sacred Golden Ratio Arcs",
        "Dynamics": "Euler Fluid Particle Stream",
        "Generator": ARTWORK_VERSION,
    }


def render_identity_art(seed: str) -> bytes:
    """
    Render deterministic abstract painting as a PNG raster.
    Aesthetic: Vector Flow Fields & Sacred Geometry.
    """
    digest = hashlib.sha256(seed.encode("utf-8")).digest()
    p_idx = digest[0] % len(PALETTES)
    _, hex_palette = PALETTES[p_idx]
    colors = [tuple(bytes.fromhex(value.lstrip("#"))) for value in hex_palette]
    rng = random.Random(_seed_value(seed))
    size = ARTWORK_SIZE

    # 1. Base Chiaroscuro Atmospheric Field
    top, bottom = colors[0], colors[1]
    image = Image.new("RGB", (size, size))
    pixels = image.load()
    phase_x = rng.uniform(0, 6.28)
    phase_y = rng.uniform(0, 6.28)
    for y in range(size):
        t = y / max(1, size - 1)
        wave = 0.06 * math.sin(t * 7 + phase_y)
        for x in range(size):
            horiz = 0.04 * math.sin(x / size * 6 + phase_x)
            blend = min(1.0, max(0.0, t + wave + horiz))
            pixels[x, y] = (
                int(top[0] * (1 - blend) + bottom[0] * blend),
                int(top[1] * (1 - blend) + bottom[1] * blend),
                int(top[2] * (1 - blend) + bottom[2] * blend),
            )

    # 2. Soft Ambient Light Blooms
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    for idx, col in enumerate(colors[2:]):
        cx = rng.randint(90, size - 90)
        cy = rng.randint(90, size - 90)
        radius = rng.randint(90, 160)
        glow_draw.ellipse(
            (cx - radius, cy - radius, cx + radius, cy + radius),
            fill=(*col, max(20, 95 - idx * 16)),
        )
    glow = glow.filter(ImageFilter.GaussianBlur(38))
    image = Image.alpha_composite(image.convert("RGBA"), glow)

    # 3. Vector Flow Field Ribbons (Euler Fluid Particle Tracking)
    flow_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    flow_draw = ImageDraw.Draw(flow_layer)
    num_ribbons = rng.randint(14, 22)
    freq1 = rng.uniform(0.003, 0.007)
    freq2 = rng.uniform(0.003, 0.007)
    step_len = 5.2

    for r in range(num_ribbons):
        cur_x = rng.uniform(35, size - 35)
        cur_y = rng.uniform(35, size - 35)
        color = colors[(r % 3) + 2]
        points = [(cur_x, cur_y)]
        alpha = rng.randint(85, 180)
        width = rng.randint(3, 10)

        for _ in range(75):
            angle = math.sin(cur_x * freq1) * math.pi + math.cos(cur_y * freq2) * math.pi
            cur_x += math.cos(angle) * step_len
            cur_y += math.sin(angle) * step_len
            if not (0 <= cur_x < size and 0 <= cur_y < size):
                break
            points.append((cur_x, cur_y))

        if len(points) > 4:
            flow_draw.line(points, fill=(*color, alpha), width=width, joint="curve")

    image = Image.alpha_composite(image, flow_layer)

    # 4. Sacred Geometry & Concentric Golden Ratio Arcs
    geom_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    geom_draw = ImageDraw.Draw(geom_layer)
    center_x = rng.randint(int(size * 0.35), int(size * 0.65))
    center_y = rng.randint(int(size * 0.35), int(size * 0.65))
    ring_count = rng.randint(10, 18)

    for ring in range(ring_count):
        rx = rng.randint(40, 200) + ring * 6
        ry = int(rx * rng.uniform(0.85, 1.15))
        arc_start = rng.randint(0, 320)
        arc_extent = rng.randint(60, 280)
        arc_col = colors[(ring + 2) % len(colors)]
        arc_alpha = rng.randint(70, 180)
        arc_width = rng.choice([2, 3, 4, 6])

        arc_pts = []
        for s in range(40):
            a = math.radians(arc_start + arc_extent * s / 39)
            wobble = rng.uniform(-1.5, 1.5)
            arc_pts.append(
                (center_x + (rx + wobble) * math.cos(a), center_y + (ry + wobble) * math.sin(a))
            )
        geom_draw.line(arc_pts, fill=(*arc_col, arc_alpha), width=arc_width, joint="curve")

    image = Image.alpha_composite(image, geom_layer)

    # 5. Cosmic Stippling & Radiant Micro-Nodes
    stars_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    stars_draw = ImageDraw.Draw(stars_layer)
    for _ in range(160):
        sx, sy = rng.randint(10, size - 10), rng.randint(10, size - 10)
        s_rad = rng.choices([1, 2, 3], [70, 25, 5])[0]
        s_col = colors[rng.randint(2, len(colors) - 1)]
        stars_draw.ellipse(
            (sx - s_rad, sy - s_rad, sx + s_rad, sy + s_rad),
            fill=(*s_col, rng.randint(60, 180)),
        )

    for _ in range(5):
        nx, ny = rng.randint(60, size - 60), rng.randint(60, size - 60)
        n_rad = rng.randint(4, 9)
        stars_draw.ellipse(
            (nx - n_rad, ny - n_rad, nx + n_rad, ny + n_rad),
            fill=(*colors[-1], 230),
        )

    image = Image.alpha_composite(image, stars_layer).convert("RGB")
    image = image.resize((EXPORT_SIZE, EXPORT_SIZE), Image.Resampling.LANCZOS)

    output = io.BytesIO()
    image.save(output, format="PNG", optimize=True)
    return output.getvalue()
