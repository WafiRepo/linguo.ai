"""Cut the AI icon sheets (raw/icons-*.png) into one icon per word.

Each sheet is an N x N grid on white; every cell is trimmed to its drawing
and saved to public/materials/icons/<name>.png. Scenes are copied as-is to
public/materials/scenes/.

Run from marketing-video/materials-src:
    ../../vision-agent/.venv/Scripts/python.exe crop_icons.py
"""

import shutil
from pathlib import Path

from PIL import Image, ImageChops

HERE = Path(__file__).resolve().parent
ICONS = HERE.parent / "public" / "materials" / "icons"
SCENES = HERE.parent / "public" / "materials" / "scenes"

# Sheet -> grid size and the word for each cell, left to right, top to bottom.
SHEETS = {
    "icons-b1": (3, ["silakan", "duduk", "perhatikan", "lihat", "depan", "keluarkan", "buku", "pensil"]),
    "icons-b2": (3, ["gambar", "melihat", "apa", "kalian", "sekolah", "bagus-sekali", "mari", "video"]),
    "icons-b3": (2, ["buka", "halaman", "sepuluh", "sudah"]),
}


def trim(cell: Image.Image, pad: int = 12) -> Image.Image:
    """Crop to the non-white drawing, with a little padding."""
    rgb = cell.convert("RGB")
    diff = ImageChops.difference(rgb, Image.new("RGB", rgb.size, (255, 255, 255)))
    mask = diff.convert("L").point(lambda v: 255 if v > 24 else 0)
    box = mask.getbbox()
    if box is None:
        raise ValueError("empty cell")
    l, t, r, b = box
    return cell.crop((max(l - pad, 0), max(t - pad, 0), min(r + pad, cell.width), min(b + pad, cell.height)))


def main() -> None:
    ICONS.mkdir(parents=True, exist_ok=True)
    SCENES.mkdir(parents=True, exist_ok=True)
    for sheet, (n, names) in SHEETS.items():
        img = Image.open(HERE / "raw" / f"{sheet}.png").convert("RGB")
        cw, ch = img.width / n, img.height / n
        for i, name in enumerate(names):
            row, col = divmod(i, n)
            # Shrink each cell slightly so a neighbour's edge never sneaks in.
            inset = 0.03
            cell = img.crop((
                int((col + inset) * cw), int((row + inset) * ch),
                int((col + 1 - inset) * cw), int((row + 1 - inset) * ch),
            ))
            trim(cell).save(ICONS / f"{name}.png")
            print("icon", name)
    for scene in sorted((HERE / "raw").glob("s-*.png")):
        shutil.copy(scene, SCENES / scene.name)
        print("scene", scene.stem)


if __name__ == "__main__":
    main()
