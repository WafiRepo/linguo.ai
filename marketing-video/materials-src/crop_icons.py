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
    "icons-bag7": (3, ["dadu", "kartu-kata", "lempar", "ambil", "jawab", "pertanyaan", "angka", "tidak-tahu"]),
    "icons-bag8": (3, ["jelas", "mengerti", "ya", "ada", "tidak-ada"]),
    "icons-bag9": (3, ["kelompok", "bekerja", "tiga", "orang", "setiap", "berbicara", "lima-menit", "siap"]),
    "icons-bag10": (3, ["halo", "nama", "saya", "contoh", "sederhana", "memberikan", "kami"]),
    "icons-bag11": (3, ["guru", "siswa", "coba", "sekali-lagi", "betul", "jawaban", "sangat-bagus", "terima-kasih"]),
    "icons-bag12": (3, ["membaca", "teks", "pendapat", "menarik", "pelajaran", "lebih-keras", "setuju", "teman-teman"]),
    "icons-bag13": (3, ["tulis", "tema", "kosakata", "penting", "selesai"]),
    "icons-bag14": (3, ["topik", "keluarga", "hari-ini", "menjelaskan", "belum-paham", "lagi", "ayah", "ibu"]),
    "icons-bag15": (3, ["pekerjaan-rumah", "minggu-depan", "baca", "hafalkan", "latihan", "nomor", "kumpulkan", "jangan-lupa"]),
    "icons-bag16": (2, ["sampai-di-sini", "sampai-jumpa", "hati-hati", "jalan"]),
    "icons-bag17": (2, ["belajar", "tentang", "menarik-sekali", "persiapkan"]),
    "icons-bag18": (3, ["perasaan", "senang", "banyak", "baru", "paling-suka", "sulit", "pengucapan", "berlatih"]),
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
