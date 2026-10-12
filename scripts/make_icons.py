# アイコン画像（○×）を作る。使い方: py scripts/make_icons.py
from PIL import Image, ImageDraw
import pathlib
out = pathlib.Path(__file__).resolve().parent.parent / "icons"
for size in (180, 192, 512):
    img = Image.new("RGB", (size, size), "#0f766e")
    d = ImageDraw.Draw(img)
    w = max(4, size // 14)
    r = size * 0.2
    cx, cy = size * 0.3, size * 0.5
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline="white", width=w)
    x0, x1 = size * 0.53, size * 0.87
    y0, y1 = cy - r, cy + r
    d.line([x0, y0, x1, y1], fill="white", width=w)
    d.line([x0, y1, x1, y0], fill="white", width=w)
    img.save(out / f"icon-{size}.png")
print("ok")
