"""Label N01 review renders and add true-scale bars to orthographic views.

Reads the blockout report written by build_n01.py and writes WebP review sheets
to clients/nocturne/review/blockout/.
"""

import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
REPORT = os.path.join(ROOT, "clients", "nocturne", "review", "n01-blockout-report.json")
OUT = os.path.join(ROOT, "clients", "nocturne", "review", "blockout")


def font(size):
    for path in ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/dejavu/DejaVuSans.ttf"):
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def main():
    report = json.load(open(REPORT))
    renders = report.get("renders")
    if not renders:
        sys.exit("report has no renders; run build_n01.py --render first")
    dims = report["variants"]["high"]["bodyDimensionsMm"]
    src = os.path.join(ROOT, renders["dir"])
    os.makedirs(OUT, exist_ok=True)
    label_font, small = font(22), font(17)
    for view in renders["views"]:
        img = Image.open(os.path.join(src, view["file"])).convert("RGB")
        d = ImageDraw.Draw(img)
        name = view["file"][3:-4].replace("-", " ")
        d.text((36, 30), f"N01 blockout · {name}", fill=(235, 231, 222), font=label_font)
        d.text((36, 62), "Neutral review materials. Not final surfaces or lighting.", fill=(170, 170, 170), font=small)
        if view["orthoScaleM"]:
            px_per_m = view["resolution"][0] / view["orthoScaleM"]
            bar = 0.1 * px_per_m
            x0, y0 = 36, img.height - 60
            d.rectangle([x0, y0, x0 + bar, y0 + 4], fill=(235, 231, 222))
            d.text((x0, y0 - 28), "100 mm (true scale)", fill=(235, 231, 222), font=small)
            d.text((x0, y0 - 56),
                   f"Body {dims['width']:.0f} × {dims['depth']:.0f} × {dims['height']:.0f} mm · long end +{dims['endExtension']:.0f} mm",
                   fill=(235, 231, 222), font=small)
        img.save(os.path.join(OUT, view["file"].replace(".png", ".webp")), "WEBP", quality=88, method=6)
        print("wrote", view["file"].replace(".png", ".webp"))


if __name__ == "__main__":
    main()
