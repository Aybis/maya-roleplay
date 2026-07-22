from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


SOURCE = Path("public/sprites/maya-cutout-atlas.png")
COLOR_SOURCE = Path("public/sprites/maya-cutout-atlas-source.png")
OUT = Path("public/sprites")
OUTFITS = ("cozy", "academy", "adventurer")
MOUTHS = ("small", "open")


def remove_green_spill(image: Image.Image) -> Image.Image:
    """Neutralize chroma-key green left on semi-transparent hair edges."""
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            red, green, blue, alpha = pixels[x, y]
            neutral = max(red, blue)
            if alpha and green > neutral + 8:
                pixels[x, y] = (red, neutral, blue, alpha)
    return image


def feathered_mouth_patch(tile: Image.Image) -> Image.Image:
    """Keep each alternate frame transparent outside a small mouth-sized oval."""
    left, top, right, bottom = 162, 182, 256, 234
    patch = tile.crop((left, top, right, bottom)).convert("RGBA")
    mask = Image.new("L", patch.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((8, 5, patch.width - 8, patch.height - 5), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(5))
    patch.putalpha(mask)

    overlay = Image.new("RGBA", tile.size, (0, 0, 0, 0))
    overlay.alpha_composite(patch, (left, top))
    return overlay


def main() -> None:
    atlas = remove_green_spill(Image.open(SOURCE).convert("RGBA"))
    color_atlas = Image.open(COLOR_SOURCE).convert("RGB")
    tile_width = atlas.width // 3
    tile_height = atlas.height // 3

    for column, outfit in enumerate(OUTFITS):
        bounds = (column * tile_width, 0, (column + 1) * tile_width, tile_height)
        atlas.crop(bounds).save(OUT / f"maya-{outfit}-base.png", optimize=True)

        for row, mouth in enumerate(MOUTHS, start=1):
            bounds = (
                column * tile_width,
                row * tile_height,
                (column + 1) * tile_width,
                (row + 1) * tile_height,
            )
            tile = color_atlas.crop(bounds)
            feathered_mouth_patch(tile).save(
                OUT / f"maya-{outfit}-mouth-{mouth}.png", optimize=True
            )


if __name__ == "__main__":
    main()
